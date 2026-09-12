-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Inventario / POS — Presentaciones de venta           ║
-- ║  Archivo         : 083_inv_presentaciones.sql                           ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-10                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Un mismo producto puede venderse en distintas presentaciones (ej. una caja
-- de estampitas: por caja, por docena o individual). El inventario siempre
-- se controla en la unidad BASE del producto (inv_productos.unidad_medida);
-- factor_conversion dice cuántas unidades base contiene una unidad de esa
-- presentación (Caja x50 => factor 50). El precio es el de TODA la
-- presentación (el precio de la caja completa, no por unidad).

CREATE TABLE IF NOT EXISTS inv_producto_presentaciones (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id        UUID NOT NULL REFERENCES inv_productos(id) ON DELETE CASCADE,
  nombre             VARCHAR(60) NOT NULL,
  factor_conversion  NUMERIC(10,2) NOT NULL CHECK (factor_conversion > 0),
  precio             NUMERIC(14,2) NOT NULL CHECK (precio >= 0),
  es_default         BOOLEAN NOT NULL DEFAULT FALSE,
  es_unidad_compra   BOOLEAN NOT NULL DEFAULT FALSE,
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_presentaciones_producto ON inv_producto_presentaciones(producto_id);

-- Trazabilidad: qué presentación exacta se vendió en cada línea del POS, y
-- cuántas unidades de esa presentación (no confundir con pos_venta_items.
-- cantidad, que sigue siendo la cantidad en unidades BASE consumidas del
-- inventario — así el kardex nunca cambia de unidad de medida).
ALTER TABLE pos_venta_items
  ADD COLUMN IF NOT EXISTS presentacion_id UUID REFERENCES inv_producto_presentaciones(id),
  ADD COLUMN IF NOT EXISTS cantidad_presentacion NUMERIC(10,2);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inv_producto_presentaciones TO orquidea_user;
