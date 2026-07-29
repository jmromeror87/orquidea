/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 026                                           ║
 * ║  Vincula paquete_items con servicios_catalogo                           ║
 * ║  Fecha: 2026-07-14                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- 1. Agregar columna catalogo_id
ALTER TABLE paquete_items
  ADD COLUMN IF NOT EXISTS catalogo_id UUID REFERENCES servicios_catalogo(id) ON DELETE SET NULL;

-- 2. Agregar precio_unitario (copia del precio al momento de asociar)
ALTER TABLE paquete_items
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(14,2) DEFAULT 0;

-- 3. Intentar vincular ítems existentes al catálogo por nombre (ILIKE)
UPDATE paquete_items pi
SET
  catalogo_id     = sc.id,
  precio_unitario = sc.precio_base,
  categoria       = sc.categoria
FROM servicios_catalogo sc
WHERE pi.catalogo_id IS NULL
  AND LOWER(TRIM(pi.nombre)) = LOWER(TRIM(sc.nombre));

-- 4. Índice
CREATE INDEX IF NOT EXISTS idx_paquete_items_catalogo ON paquete_items(catalogo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON paquete_items TO orquidea_user;
