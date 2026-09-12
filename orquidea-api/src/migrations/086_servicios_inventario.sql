-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Servicios — descarga de inventario por ítem          ║
-- ║  Archivo         : 086_servicios_inventario.sql                         ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- PARTE 1 — Corrige un bug real: servicios.controller.js inserta en
-- items_servicio.catalogo_id y .es_cobertura desde que se escribió el
-- módulo de "Servicios incluidos" (item 4 del plan), pero ninguna
-- migración llegó a crear esas columnas — cualquier alta de ítem desde
-- una póliza o un paquete fallaba en silencio contra la base de datos.
ALTER TABLE items_servicio
  ADD COLUMN IF NOT EXISTS catalogo_id  UUID REFERENCES servicios_catalogo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS es_cobertura BOOLEAN NOT NULL DEFAULT FALSE;

-- PARTE 2 — Enlaza el catálogo de precios con el inventario físico. NO todas
-- las entradas del catálogo son bienes físicos (traslados, documentos,
-- servicios religiosos no bajan de una bodega) — por eso es opcional.
-- Cuando SÍ tiene producto_id, agregar ese ítem a un servicio descuenta
-- stock real, igual que una venta de mostrador.
ALTER TABLE servicios_catalogo
  ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES inv_productos(id) ON DELETE SET NULL;

-- Trazabilidad de inventario por ítem de servicio — mismo patrón que
-- pos_venta_items (producto, bodega, costo al momento de tomarlo,
-- movimiento de salida) más el comprobante contable para poder reversar
-- limpio si el ítem se edita o se elimina.
ALTER TABLE items_servicio
  ADD COLUMN IF NOT EXISTS producto_id     UUID REFERENCES inv_productos(id),
  ADD COLUMN IF NOT EXISTS bodega_id       UUID REFERENCES inv_bodegas(id),
  ADD COLUMN IF NOT EXISTS costo_unitario  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS movimiento_id   UUID REFERENCES inv_movimientos(id),
  ADD COLUMN IF NOT EXISTS comprobante_id  UUID REFERENCES comprobantes_contables(id);

-- PARTE 3 — Regla contable del consumo. El ingreso del servicio YA se
-- reconoce completo por otro evento (CONTRATO_VENTA, o el cobro de la
-- póliza) — esta regla es SOLO la mitad de costo/inventario, igual que la
-- de VENTA_POS. Cuentas 617060.01 (costo genérico de servicios funerarios,
-- verificada en TNS) y 143505.08 (mercancía general) son la propuesta de
-- Orquídea: CONFIRMAR CON EL CONTADOR antes de operar en producción,
-- sobre todo si conviene diferenciar por categoría (cofres vs flores ya
-- tienen subcuentas propias en el PUC: 143505.01, 143505.03...).
INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'CONSUMO_ITEM_SERVICIO',
  'Consumo de inventario en un servicio funerario',
  'Se agregó al servicio un ítem del catálogo que está enlazado a un producto físico de Inventario (ataúd, flores, material de tanatopraxia...) — se reconoce el costo de esa mercancía y se refleja su salida del inventario. El ingreso del servicio se contabiliza aparte (CONTRATO_VENTA o el recaudo de la póliza); esta regla es solo la mitad de costo/inventario, igual que VENTA_POS. PROPUESTA — confirmar cuentas con el contador antes de producción.',
  'AJUSTE', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FIJA', '617060.01', 'costo', 'Costo de mercancía consumida en el servicio' FROM reglas_contables WHERE evento_codigo = 'CONSUMO_ITEM_SERVICIO'
UNION ALL
SELECT id, 2, 'H', 'FIJA', '143505.08', 'costo', 'Salida de inventario' FROM reglas_contables WHERE evento_codigo = 'CONSUMO_ITEM_SERVICIO'
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE items_servicio TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE servicios_catalogo TO orquidea_user;
