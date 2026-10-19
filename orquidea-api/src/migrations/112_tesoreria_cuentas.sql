-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Tesorería — cuentas, traslados y conciliación        ║
-- ║  Archivo         : 112_tesoreria_cuentas.sql                            ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-19                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Cada cuenta de tesorería (caja, banco, cooperativa, billetera) está atada a
-- UNA subcuenta del PUC. Saldo y movimientos salen de la contabilidad
-- (asientos_contables): todo lo que ya contabiliza el sistema (pólizas,
-- contratos, POS, compras, comprobantes) aparece solo, sin digitar dos veces.
CREATE TABLE IF NOT EXISTS tesoreria_cuentas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                 VARCHAR(120) NOT NULL,
  banco                  VARCHAR(100),
  tipo                   VARCHAR(20) NOT NULL DEFAULT 'AHORROS'
                           CHECK (tipo IN ('CAJA_GENERAL','CAJA_MENOR','CORRIENTE','AHORROS','COOPERATIVA','BILLETERA','OTRO')),
  numero_cuenta          VARCHAR(50),
  titular                VARCHAR(150),
  cuenta_contable_codigo VARCHAR(20) NOT NULL UNIQUE REFERENCES contabilidad_puc(codigo),
  sede_id                UUID REFERENCES sedes(id),
  color                  VARCHAR(9),
  activa                 BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por             UUID REFERENCES usuarios(id),
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traslados entre cuentas (consignar la caja en el banco, etc.)
CREATE TABLE IF NOT EXISTS tesoreria_traslados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_origen_id  UUID NOT NULL REFERENCES tesoreria_cuentas(id),
  cuenta_destino_id UUID NOT NULL REFERENCES tesoreria_cuentas(id),
  monto             NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion       TEXT NOT NULL,
  referencia        VARCHAR(100),
  comprobante_id    UUID REFERENCES comprobantes_contables(id),
  estado            VARCHAR(10) NOT NULL DEFAULT 'APLICADO' CHECK (estado IN ('APLICADO','ANULADO')),
  usuario_id        UUID REFERENCES usuarios(id),
  anulado_por       UUID REFERENCES usuarios(id),
  anulado_en        TIMESTAMPTZ,
  motivo_anulacion  TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (cuenta_origen_id <> cuenta_destino_id)
);

-- Conciliación bancaria: corte por cuenta y mes contra el extracto
CREATE TABLE IF NOT EXISTS tesoreria_conciliaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id       UUID NOT NULL REFERENCES tesoreria_cuentas(id),
  periodo         CHAR(7) NOT NULL,                 -- '2026-10'
  fecha_corte     DATE NOT NULL,
  saldo_extracto  NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_libros    NUMERIC(15,2),                    -- se congela al cerrar
  estado          VARCHAR(10) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','CERRADA')),
  observaciones   TEXT,
  usuario_id      UUID REFERENCES usuarios(id),
  cerrada_por     UUID REFERENCES usuarios(id),
  cerrada_en      TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cuenta_id, periodo)
);

-- Movimientos (líneas contables) marcados como conciliados con el extracto
CREATE TABLE IF NOT EXISTS tesoreria_conciliados (
  asiento_id      UUID PRIMARY KEY REFERENCES asientos_contables(id) ON DELETE CASCADE,
  conciliacion_id UUID NOT NULL REFERENCES tesoreria_conciliaciones(id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tes_conciliados_conc ON tesoreria_conciliados(conciliacion_id);
CREATE INDEX IF NOT EXISTS idx_asientos_cuenta_fecha ON asientos_contables(cuenta_codigo);

-- Traslado: nuevo tipo de comprobante contable (prefijo TR)
ALTER TABLE comprobantes_contables DROP CONSTRAINT IF EXISTS comprobantes_contables_tipo_check;
ALTER TABLE comprobantes_contables ADD CONSTRAINT comprobantes_contables_tipo_check
  CHECK (tipo IN ('RECAUDO','VENTA','COMPRA','EGRESO','AJUSTE','APERTURA','NOMINA','REVERSION','TRASLADO'));

-- Cuentas iniciales: las que ya usan las formas de pago activas
INSERT INTO tesoreria_cuentas (nombre, banco, tipo, cuenta_contable_codigo)
SELECT p.nombre,
  CASE WHEN p.codigo LIKE '1105%' THEN 'Caja' WHEN p.codigo LIKE '1120%' THEN 'Cooperativa' ELSE 'Banco' END,
  CASE WHEN p.codigo LIKE '110505%' THEN 'CAJA_GENERAL' WHEN p.codigo LIKE '110510%' THEN 'CAJA_MENOR'
       WHEN p.codigo LIKE '1120%' THEN 'COOPERATIVA' ELSE 'AHORROS' END,
  p.codigo
FROM contabilidad_puc p
WHERE p.codigo IN (SELECT DISTINCT cuenta_contable_codigo FROM formas_pago WHERE activo AND cuenta_contable_codigo IS NOT NULL)
ON CONFLICT (cuenta_contable_codigo) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tesoreria_cuentas, tesoreria_traslados, tesoreria_conciliaciones, tesoreria_conciliados TO orquidea_user;

-- Banco y número de cuenta a partir del nombre del PUC ("Bancolombia Ahorros 70900001025")
UPDATE tesoreria_cuentas SET
  banco = CASE WHEN nombre ILIKE '%bancolombia%' OR nombre ILIKE '%banco colombia%' THEN 'Bancolombia'
               WHEN nombre ILIKE '%crediservir%' THEN 'Crediservir'
               WHEN nombre ILIKE '%davivienda%' THEN 'Davivienda'
               WHEN nombre ILIKE '%nequi%' THEN 'Nequi'
               WHEN tipo IN ('CAJA_GENERAL','CAJA_MENOR') THEN 'Efectivo'
               ELSE banco END,
  numero_cuenta = COALESCE(numero_cuenta, NULLIF(substring(nombre from '([0-9][0-9 -]{5,}[0-9])'), ''))
WHERE creado_por IS NULL;
