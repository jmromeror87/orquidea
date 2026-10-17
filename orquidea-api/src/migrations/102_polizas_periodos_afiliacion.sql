-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — periodos, afiliación y carencia por benef. ║
-- ║  Archivo         : 102_polizas_periodos_afiliacion.sql                  ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-16                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- 1. Periodos desde el día de afiliación (ver utils/periodosPoliza.js). La
--    conversión de los pagos existentes la hace scripts/migrar_periodos_poliza.js
--    (con vista previa), no esta migración.
-- 2. La AFILIACIÓN se registra como un pago más (pagos_poliza.tipo =
--    'AFILIACION'): tiene número de recibo, sale en el historial, se
--    contabiliza y se puede anular igual que una cuota. Antes solo marcaba
--    la póliza como "afiliación pagada" — sin recibo ni contabilidad.
-- 3. Cada beneficiario tiene su propia fecha de afiliación y carencia. Un
--    beneficiario que entra después paga su afiliación y su carencia corre
--    desde ese día. Los existentes heredan la fecha/carencia de su póliza.

-- ── 1/2. Tipo de pago y beneficiario al que corresponde la afiliación ─────
ALTER TABLE pagos_poliza
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(12) NOT NULL DEFAULT 'CUOTA'
    CHECK (tipo IN ('CUOTA','AFILIACION')),
  ADD COLUMN IF NOT EXISTS beneficiario_id UUID REFERENCES poliza_beneficiarios(id) ON DELETE SET NULL;

-- La regla "un pago por periodo" es solo para cuotas vigentes
DROP INDEX IF EXISTS uq_pago_poliza_mes_vigente;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_poliza_periodo_vigente
  ON pagos_poliza (poliza_id, mes_correspondiente)
  WHERE tipo = 'CUOTA' AND NOT anulado;

-- ── 3. Afiliación y carencia por beneficiario ─────────────────────────────
ALTER TABLE poliza_beneficiarios
  ADD COLUMN IF NOT EXISTS fecha_afiliacion   DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin_carencia DATE,
  ADD COLUMN IF NOT EXISTS costo_afiliacion   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS afiliacion_pagada  BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE poliza_beneficiarios b
   SET fecha_afiliacion   = COALESCE(b.fecha_afiliacion, p.fecha_inicio),
       fecha_fin_carencia = COALESCE(b.fecha_fin_carencia, p.fecha_fin_carencia)
  FROM polizas p
 WHERE p.id = b.poliza_id
   AND (b.fecha_afiliacion IS NULL OR b.fecha_fin_carencia IS NULL);

-- ── Contabilidad de la afiliación: ingreso de la funeraria ─────────────────
INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo,
                              acepta_movimiento, requiere_tercero, requiere_centro_costo, origen, activa)
VALUES ('417060.31', 'Ingresos por afiliaciones a planes exequiales', 5, '417060', '4', 'C', 'INGRESO',
        TRUE, FALSE, FALSE, 'ORQUIDEA', TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'AFILIACION_POLIZA',
  'Cobro de afiliación a póliza exequial',
  'Afiliación del titular o de un beneficiario que entra después. Es un cobro ganado al afiliar (no se devuelve), por eso va a ingreso — a diferencia de las cuotas, que son anticipo (280505.01).',
  'RECAUDO', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FORMA_PAGO', NULL, 'total', 'Recaudo según forma de pago' FROM reglas_contables
 WHERE evento_codigo = 'AFILIACION_POLIZA'
   AND NOT EXISTS (SELECT 1 FROM reglas_contables_lineas l JOIN reglas_contables r ON r.id = l.regla_id WHERE r.evento_codigo = 'AFILIACION_POLIZA')
UNION ALL
SELECT id, 2, 'H', 'FIJA', '417060.31', 'total', 'Ingreso por afiliación' FROM reglas_contables
 WHERE evento_codigo = 'AFILIACION_POLIZA'
   AND NOT EXISTS (SELECT 1 FROM reglas_contables_lineas l JOIN reglas_contables r ON r.id = l.regla_id WHERE r.evento_codigo = 'AFILIACION_POLIZA');
