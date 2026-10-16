-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Cartera de contratos — abonos y ajustes por ítems    ║
-- ║  Archivo         : 100_cartera_contratos_abonos.sql                     ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-16                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Cartera no estaba alineada con los contratos de servicio directo:
--  1. Solo aceptaba pagos de contratos EN CUOTAS y en estado 'activo' → un
--     contrato de CONTADO (todos los de servicio directo) nunca podía recibir
--     un pago, aunque la regla CONTRATO_PAGO_CUOTA (081) dice explícitamente
--     "sea de contado en un solo abono o en varias cuotas".
--  2. Un abono libre chocaba con la regla "un pago por mes" de las cuotas.
--  3. Los ítems agregados/quitados al servicio después de crearlo no movían
--     el valor del contrato ni la cartera (130505.01).
--
-- pagos_contrato.tipo: CUOTA (mensualidad de un contrato en cuotas) o ABONO
-- (monto libre contra el saldo). La regla de un pago por mes aplica solo a
-- cuotas vigentes (no anuladas).
ALTER TABLE pagos_contrato
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'CUOTA'
    CHECK (tipo IN ('CUOTA','ABONO'));

ALTER TABLE pagos_contrato DROP CONSTRAINT IF EXISTS uq_pago_contrato_mes;
DROP INDEX IF EXISTS uq_pago_contrato_mes;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_contrato_mes_cuota
  ON pagos_contrato (contrato_id, mes_correspondiente)
  WHERE tipo = 'CUOTA' AND NOT anulado;

-- Ajuste a la baja del contrato (se quitó un ítem o bajó su valor): espejo
-- de CONTRATO_VENTA — reduce el ingreso y la cartera del cliente.
INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'CONTRATO_AJUSTE_MENOS',
  'Disminución del valor de un contrato',
  'Se quitó un ítem del servicio o se bajó su valor después de creado el contrato: se reversa la parte del ingreso y de la cartera correspondiente (espejo de CONTRATO_VENTA).',
  'AJUSTE', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FIJA', '417060.01', 'total', 'Menor ingreso por servicio funerario' FROM reglas_contables
 WHERE evento_codigo = 'CONTRATO_AJUSTE_MENOS'
   AND NOT EXISTS (SELECT 1 FROM reglas_contables_lineas l JOIN reglas_contables r ON r.id = l.regla_id WHERE r.evento_codigo = 'CONTRATO_AJUSTE_MENOS')
UNION ALL
SELECT id, 2, 'H', 'FIJA', '130505.01', 'total', 'Menor cartera del contrato' FROM reglas_contables
 WHERE evento_codigo = 'CONTRATO_AJUSTE_MENOS'
   AND NOT EXISTS (SELECT 1 FROM reglas_contables_lineas l JOIN reglas_contables r ON r.id = l.regla_id WHERE r.evento_codigo = 'CONTRATO_AJUSTE_MENOS');
