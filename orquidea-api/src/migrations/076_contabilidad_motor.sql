-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Contabilidad — Motor de comprobantes y asientos      ║
-- ║  Archivo         : 076_contabilidad_motor.sql                           ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-10                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Núcleo del módulo contable: OPERACIÓN → REGLA CONTABLE → COMPROBANTE →
-- ASIENTOS (partida doble) → PERIODO. Diseñado para que CUALQUIER módulo
-- del ERP (pólizas, contratos, POS, compras, nómina...) pueda generar
-- comprobantes llamando al motor (contabilidad.service.js), sin que la
-- lógica contable quede repetida ni incrustada en cada controlador.

-- ═══════════════════════════════════════════════════════════════════════
-- 1) FORMAS DE PAGO → CUENTA CONTABLE
--    Cada forma de pago (efectivo, transferencia, Nequi...) se resuelve a
--    la cuenta de bancos/caja correspondiente. Reutiliza la tabla existente
--    formas_pago en vez de crear un catálogo paralelo.
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE formas_pago
  ADD COLUMN IF NOT EXISTS cuenta_contable_codigo VARCHAR(20) REFERENCES contabilidad_puc(codigo);

-- Mapeo inicial con las cuentas verificadas en el balance de TNS.
-- Efectivo -> Caja general. El resto de medios electrónicos -> banco
-- principal (Bancolombia Ahorros) hasta que el contador indique cuentas
-- específicas por medio (ej. una subcuenta por pasarela).
UPDATE formas_pago SET cuenta_contable_codigo = '110505.01' WHERE codigo = 'efectivo';
UPDATE formas_pago SET cuenta_contable_codigo = '111005.01' WHERE codigo IN
  ('nequi','daviplata','transferencia','tarjeta','pse','cheque');

-- ═══════════════════════════════════════════════════════════════════════
-- 2) PERIODOS CONTABLES
--    Un periodo cerrado no admite comprobantes con fecha_contable dentro
--    de él. Toda corrección posterior al cierre se hace en el periodo
--    ABIERTO actual, mediante una nota de ajuste que referencia el
--    comprobante original (nunca reescribiendo historia).
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS periodos_contables (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anio          SMALLINT NOT NULL,
  mes           SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  estado        VARCHAR(15) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO','CERRADO')),
  cerrado_por   UUID REFERENCES usuarios(id),
  cerrado_en    TIMESTAMPTZ,
  reabierto_por UUID REFERENCES usuarios(id),
  reabierto_en  TIMESTAMPTZ,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_periodo_anio_mes UNIQUE (anio, mes)
);

CREATE INDEX IF NOT EXISTS idx_periodos_contables_estado ON periodos_contables(estado);

-- ═══════════════════════════════════════════════════════════════════════
-- 3) COMPROBANTES CONTABLES (encabezado)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS comprobantes_contables (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero                 VARCHAR(30) NOT NULL UNIQUE,
  tipo                   VARCHAR(20) NOT NULL CHECK (tipo IN (
                            'RECAUDO','VENTA','COMPRA','EGRESO','AJUSTE','APERTURA','NOMINA','REVERSION'
                          )),
  fecha                  DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_contable         DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto               VARCHAR(250) NOT NULL,
  estado                 VARCHAR(20) NOT NULL DEFAULT 'CONTABILIZADO' CHECK (estado IN (
                            'BORRADOR','CONTABILIZADO','ANULADO'
                          )),
  evento_codigo          VARCHAR(60),              -- evento del motor de reglas que lo originó (si aplica)
  documento_origen_tipo  VARCHAR(60),              -- ej. 'pagos_poliza', 'servicios_funerarios'
  documento_origen_id    UUID,                     -- id del registro origen en su propio módulo
  tercero_id             UUID REFERENCES terceros(id),
  sede_id                UUID REFERENCES sedes(id),
  total_debe             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_haber            NUMERIC(14,2) NOT NULL DEFAULT 0,
  usuario_creador        UUID REFERENCES usuarios(id),
  usuario_contabiliza    UUID REFERENCES usuarios(id),
  anulado_por            UUID REFERENCES usuarios(id),
  anulado_en             TIMESTAMPTZ,
  motivo_anulacion       TEXT,
  comprobante_reversa_id UUID REFERENCES comprobantes_contables(id), -- si este comprobante es la reversión de otro
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Partida doble a nivel de comprobante: nunca puede quedar descuadrado.
  CONSTRAINT ck_comprobante_cuadrado CHECK (total_debe = total_haber)
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha_contable ON comprobantes_contables(fecha_contable);
CREATE INDEX IF NOT EXISTS idx_comprobantes_origen ON comprobantes_contables(documento_origen_tipo, documento_origen_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_tercero ON comprobantes_contables(tercero_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_estado ON comprobantes_contables(estado);
CREATE INDEX IF NOT EXISTS idx_comprobantes_evento ON comprobantes_contables(evento_codigo);

-- Numeración consecutiva por tipo de comprobante (CI-2026-000001, CE-2026-000001...)
CREATE SEQUENCE IF NOT EXISTS seq_comprobantes_contables;

-- ═══════════════════════════════════════════════════════════════════════
-- 4) ASIENTOS CONTABLES (detalle — líneas de débito/crédito)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS asientos_contables (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comprobante_id    UUID NOT NULL REFERENCES comprobantes_contables(id) ON DELETE CASCADE,
  orden             SMALLINT NOT NULL DEFAULT 1,
  cuenta_codigo     VARCHAR(20) NOT NULL REFERENCES contabilidad_puc(codigo),
  tercero_id        UUID REFERENCES terceros(id),
  sede_id           UUID REFERENCES sedes(id),
  debe              NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debe >= 0),
  haber             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (haber >= 0),
  descripcion       VARCHAR(250),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Una línea es débito O crédito, nunca ambas ni ninguna.
  CONSTRAINT ck_asiento_debe_o_haber CHECK (
    (debe > 0 AND haber = 0) OR (haber > 0 AND debe = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_asientos_comprobante ON asientos_contables(comprobante_id);
CREATE INDEX IF NOT EXISTS idx_asientos_cuenta       ON asientos_contables(cuenta_codigo);
CREATE INDEX IF NOT EXISTS idx_asientos_tercero      ON asientos_contables(tercero_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 5) MOTOR DE REGLAS CONTABLES
--    Mapea un evento de negocio (ej. 'PAGO_CUOTA_POLIZA') a las cuentas
--    débito/crédito que debe usar el comprobante. Cada lado puede ser:
--      'FIJA'          -> siempre la misma cuenta (cuenta_codigo)
--      'FORMA_PAGO'    -> se resuelve según formas_pago.cuenta_contable_codigo
--    Así, cambiar una cuenta contable es una actualización de datos, no
--    un despliegue de código.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reglas_contables (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_codigo         VARCHAR(60) NOT NULL UNIQUE,
  nombre                VARCHAR(150) NOT NULL,
  descripcion           TEXT,
  tipo_comprobante      VARCHAR(20) NOT NULL,
  cuenta_debe_origen    VARCHAR(15) NOT NULL CHECK (cuenta_debe_origen IN ('FIJA','FORMA_PAGO')),
  cuenta_debe_codigo    VARCHAR(20) REFERENCES contabilidad_puc(codigo),
  cuenta_haber_origen   VARCHAR(15) NOT NULL CHECK (cuenta_haber_origen IN ('FIJA','FORMA_PAGO')),
  cuenta_haber_codigo   VARCHAR(20) REFERENCES contabilidad_puc(codigo),
  activa                BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Si el origen es FIJA, la cuenta específica es obligatoria.
  CONSTRAINT ck_regla_debe_fija  CHECK (cuenta_debe_origen  <> 'FIJA' OR cuenta_debe_codigo  IS NOT NULL),
  CONSTRAINT ck_regla_haber_fija CHECK (cuenta_haber_origen <> 'FIJA' OR cuenta_haber_codigo IS NOT NULL)
);

-- ── Regla piloto: pago de cuota de plan de previsión exequial (póliza) ──
-- Debe  : cuenta de la forma de pago (banco/caja según cómo pagó el cliente)
-- Haber : 280505.01 — Anticipos por clientes de pólizas exequiales (PASIVO)
-- No se reconoce como ingreso todavía: el servicio aún no se ha prestado.
INSERT INTO reglas_contables (
  evento_codigo, nombre, descripcion, tipo_comprobante,
  cuenta_debe_origen, cuenta_debe_codigo,
  cuenta_haber_origen, cuenta_haber_codigo
) VALUES (
  'PAGO_CUOTA_POLIZA',
  'Pago de cuota de póliza de previsión exequial',
  'El recaudo de una cuota de plan de previsión no es ingreso inmediato: se reconoce como pasivo (anticipo) hasta que el servicio funerario se preste. Confirmado con el cliente en la reunión de diseño del módulo contable.',
  'RECAUDO',
  'FORMA_PAGO', NULL,
  'FIJA', '280505.01'
)
ON CONFLICT (evento_codigo) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  periodos_contables, comprobantes_contables, asientos_contables, reglas_contables
  TO orquidea_user;
GRANT USAGE, SELECT ON SEQUENCE seq_comprobantes_contables TO orquidea_user;
