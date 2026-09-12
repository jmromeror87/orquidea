-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Contabilidad — Motor de reglas multilínea            ║
-- ║  Archivo         : 079_contabilidad_motor_multilinea.sql                ║
-- ║  Versión         : v2.0.0                                               ║
-- ║  Fecha           : 2026-09-10                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- El motor v1 (076) solo soportaba una línea débito + una línea crédito por
-- evento. La venta del POS necesita más: ingreso, costo de venta y salida de
-- inventario, en un solo comprobante balanceado. Se generaliza reglas_contables
-- a N líneas (reglas_contables_lineas), donde cada línea indica:
--   lado         'D' o 'H'
--   origen       'FIJA' (cuenta fija) | 'FORMA_PAGO' (según medio de pago)
--   monto_campo  qué monto del evento usa esta línea (ej. 'total', 'costo') —
--                así un mismo evento puede mover varios montos independientes
--                (lo que se cobró vs. lo que costó el producto vendido).

CREATE TABLE IF NOT EXISTS reglas_contables_lineas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  regla_id      UUID NOT NULL REFERENCES reglas_contables(id) ON DELETE CASCADE,
  orden         SMALLINT NOT NULL DEFAULT 1,
  lado          CHAR(1) NOT NULL CHECK (lado IN ('D','H')),
  origen        VARCHAR(15) NOT NULL CHECK (origen IN ('FIJA','FORMA_PAGO')),
  cuenta_codigo VARCHAR(20) REFERENCES contabilidad_puc(codigo),
  monto_campo   VARCHAR(20) NOT NULL DEFAULT 'total',
  descripcion   VARCHAR(150),
  CONSTRAINT ck_regla_linea_fija CHECK (origen <> 'FIJA' OR cuenta_codigo IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_reglas_lineas_regla ON reglas_contables_lineas(regla_id);

-- Migra la regla piloto (2 cuentas sueltas) a su forma de 2 líneas.
INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', cuenta_debe_origen,  cuenta_debe_codigo,  'total', 'Recaudo según forma de pago'
FROM reglas_contables WHERE evento_codigo = 'PAGO_CUOTA_POLIZA'
ON CONFLICT DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 2, 'H', cuenta_haber_origen, cuenta_haber_codigo, 'total', 'Anticipo de póliza (pasivo)'
FROM reglas_contables WHERE evento_codigo = 'PAGO_CUOTA_POLIZA'
ON CONFLICT DO NOTHING;

ALTER TABLE reglas_contables
  DROP COLUMN IF EXISTS cuenta_debe_origen,
  DROP COLUMN IF EXISTS cuenta_debe_codigo,
  DROP COLUMN IF EXISTS cuenta_haber_origen,
  DROP COLUMN IF EXISTS cuenta_haber_codigo;

-- ═══════════════════════════════════════════════════════════════════════
-- Cuentas complementarias para la venta de mercancía por POS.
-- La cuenta de ingreso (417060.02) y la de inventario (143505) ya estaban
-- verificadas en el balance de TNS. Sus contrapartes de costo/inventario
-- general de POS no existían con ese nivel de detalle — se agregan como
-- propuesta de Orquídea, a validar con el contador antes de producción.
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, acepta_movimiento, origen) VALUES
('617060.02', 'Costo de venta de mercancía (Punto de Venta)', 5, '617060', '6', 'D', 'COSTO_VENTAS', TRUE, 'ORQUIDEA'),
('143505.09', 'Mercancía para venta en Punto de Venta (general)', 5, '143505', '1', 'D', 'ACTIVO', TRUE, 'ORQUIDEA')
ON CONFLICT (codigo) DO NOTHING;

-- ── Regla: venta de mercancía por el Punto de Venta ──────────────────────
-- 1) Debe  cuenta de la forma de pago (banco/caja)         — monto: total cobrado
-- 2) Haber 417060.02 Venta de artículos religiosos (ingreso) — monto: total cobrado
-- 3) Debe  617060.02 Costo de venta de mercancía (POS)     — monto: costo
-- 4) Haber 143505.09 Mercancía para venta en POS (inventario) — monto: costo
-- A diferencia de la póliza, aquí SÍ se reconoce ingreso inmediato: el
-- producto ya se entregó al cliente en el mostrador.
INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'VENTA_POS',
  'Venta de mercancía por el Punto de Venta',
  'Venta de mostrador con entrega inmediata del producto: se reconoce el ingreso, el costo de lo vendido y la salida del inventario, en un mismo comprobante. La cuenta de ingreso (417060.02) es la verificada en el balance de TNS; las de costo e inventario detallado por POS (617060.02, 143505.09) son propuesta de Orquídea — confirmar con el contador antes de usarlas en producción, especialmente si el POS empieza a vender categorías distintas a artículos religiosos.',
  'VENTA', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FORMA_PAGO', NULL,        'total', 'Recaudo según forma de pago' FROM reglas_contables WHERE evento_codigo = 'VENTA_POS'
UNION ALL
SELECT id, 2, 'H', 'FIJA',       '417060.02', 'total', 'Ingreso por venta de mostrador' FROM reglas_contables WHERE evento_codigo = 'VENTA_POS'
UNION ALL
SELECT id, 3, 'D', 'FIJA',       '617060.02', 'costo', 'Costo de la mercancía vendida' FROM reglas_contables WHERE evento_codigo = 'VENTA_POS'
UNION ALL
SELECT id, 4, 'H', 'FIJA',       '143505.09', 'costo', 'Salida de inventario' FROM reglas_contables WHERE evento_codigo = 'VENTA_POS'
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reglas_contables_lineas TO orquidea_user;
