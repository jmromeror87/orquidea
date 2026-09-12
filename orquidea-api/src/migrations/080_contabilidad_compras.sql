-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Contabilidad — Reglas de Compras a proveedores       ║
-- ║  Archivo         : 080_contabilidad_compras.sql                         ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-10                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Dos eventos, reflejo uno del otro:
--   COMPRA_RECIBIDA : al completar la recepción de una orden de compra
--                      (inv_ordenes_compra.estado -> 'RECIBIDA'), entra la
--                      mercancía al inventario y nace la cuenta por pagar.
--   PAGO_PROVEEDOR   : al abonar/pagar una cmp_cuentas_pagar, se cancela
--                      (total o parcialmente) la cuenta por pagar contra el
--                      banco/caja usado.
-- El módulo de Compras YA controla el saldo pendiente en cmp_cuentas_pagar
-- (tabla de negocio); estos comprobantes son el reflejo contable en el PUC,
-- no reemplazan esa tabla.

INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, acepta_movimiento, origen) VALUES
('143505.08', 'Mercancía general (compras a proveedores)', 5, '143505', '1', 'D', 'ACTIVO', TRUE, 'ORQUIDEA')
ON CONFLICT (codigo) DO NOTHING;

-- ── Regla: recepción completa de una orden de compra ─────────────────────
INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'COMPRA_RECIBIDA',
  'Recepción de mercancía comprada a proveedor',
  'Al completarse la recepción de una orden de compra, la mercancía entra al inventario (activo) y nace la obligación con el proveedor (pasivo) por el valor total de la orden. No incluye IVA descontable porque el modelo de datos de Compras aún no captura IVA por separado — si se agrega, esta regla debe ampliarse con una tercera línea (240805 IVA descontable). Cuenta de inventario (143505.08) es propuesta de Orquídea, a validar con el contador.',
  'COMPRA', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FIJA', '143505.08', 'total', 'Entrada de mercancía al inventario' FROM reglas_contables WHERE evento_codigo = 'COMPRA_RECIBIDA'
UNION ALL
SELECT id, 2, 'H', 'FIJA', '220505.01', 'total', 'Cuenta por pagar al proveedor' FROM reglas_contables WHERE evento_codigo = 'COMPRA_RECIBIDA'
ON CONFLICT DO NOTHING;

-- ── Regla: pago a proveedor (abono o cancelación de la CxP) ──────────────
INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'PAGO_PROVEEDOR',
  'Pago a proveedor (abono a cuenta por pagar)',
  'Reverso de COMPRA_RECIBIDA por el monto efectivamente pagado: se reduce la cuenta por pagar y sale dinero del banco/caja según el medio usado.',
  'EGRESO', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FIJA',       '220505.01', 'total', 'Abono a cuenta por pagar' FROM reglas_contables WHERE evento_codigo = 'PAGO_PROVEEDOR'
UNION ALL
SELECT id, 2, 'H', 'FORMA_PAGO', NULL,        'total', 'Salida de banco/caja' FROM reglas_contables WHERE evento_codigo = 'PAGO_PROVEEDOR'
ON CONFLICT DO NOTHING;
