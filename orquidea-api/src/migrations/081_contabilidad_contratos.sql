-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Contabilidad — Reglas de Contratos de Servicio       ║
-- ║  Archivo         : 081_contabilidad_contratos.sql                       ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-10                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Confirmado con el cliente: un "Contrato de Servicio" (a diferencia de la
-- póliza) es un servicio funerario que YA se prestó, financiado de contado
-- o en cuotas. El ingreso se reconoce COMPLETO al firmar el contrato (ahí
-- nace la cuenta por cobrar); pagar de contado o en cuotas es solo la
-- velocidad a la que se cancela esa cartera — mecánicamente es el mismo
-- evento de pago en ambos casos.
--
--   CONTRATO_VENTA      (al crear el contrato)
--     Debe  1305.01 Clientes varios (nace la cartera)  — monto: valor_total
--     Haber 417060.01 Servicios funerarios (ingreso)   — monto: valor_total
--
--   CONTRATO_PAGO_CUOTA (cada vez que se abona, sea de contado en un solo
--                        pago o en varias cuotas)
--     Debe  banco/caja según forma de pago              — monto: pagado
--     Haber 1305.01 Clientes varios (reduce la cartera)  — monto: pagado
--
-- No incluye costo de venta / inventario: la creación del contrato aún no
-- calcula el costo de los ítems del paquete asignado — si se agrega ese
-- cálculo más adelante, esta regla debe ampliarse con las líneas de costo
-- e inventario, igual que se hizo con VENTA_POS.

INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'CONTRATO_VENTA',
  'Venta de contrato de servicio funerario',
  'El servicio funerario ya se prestó (o se está prestando) al firmarse el contrato — se reconoce el ingreso completo de inmediato, financiado como cartera. A diferencia de la póliza (que es previsión, servicio futuro), aquí no hay nada por diferir.',
  'VENTA', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FIJA', '130505.01', 'total', 'Cartera del contrato' FROM reglas_contables WHERE evento_codigo = 'CONTRATO_VENTA'
UNION ALL
SELECT id, 2, 'H', 'FIJA', '417060.01', 'total', 'Ingreso por servicio funerario' FROM reglas_contables WHERE evento_codigo = 'CONTRATO_VENTA'
ON CONFLICT DO NOTHING;

INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'CONTRATO_PAGO_CUOTA',
  'Abono a contrato de servicio (contado o cuota)',
  'Reduce la cartera nacida en CONTRATO_VENTA por el monto efectivamente recibido — igual mecánica si el contrato se paga de contado en un solo abono o en varias cuotas.',
  'RECAUDO', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FORMA_PAGO', NULL,        'total', 'Recaudo según forma de pago' FROM reglas_contables WHERE evento_codigo = 'CONTRATO_PAGO_CUOTA'
UNION ALL
SELECT id, 2, 'H', 'FIJA',       '130505.01', 'total', 'Abono a la cartera del contrato' FROM reglas_contables WHERE evento_codigo = 'CONTRATO_PAGO_CUOTA'
ON CONFLICT DO NOTHING;
