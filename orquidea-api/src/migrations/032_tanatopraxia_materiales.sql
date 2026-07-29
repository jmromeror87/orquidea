/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 032                                           ║
 * ║  Tanatopraxia: responsable de la lista de colaboradores +                ║
 * ║  materiales estructurados con descargue automático de inventario         ║
 * ║  Fecha: 2026-07-24                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

ALTER TABLE ordenes_tanatopraxia
  ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS tanatopraxia_materiales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanatopraxia_id UUID          NOT NULL REFERENCES ordenes_tanatopraxia(id) ON DELETE CASCADE,
  producto_id     UUID          NOT NULL REFERENCES inv_productos(id),
  cantidad        NUMERIC(10,2) NOT NULL,
  costo_unitario  NUMERIC(14,2) NOT NULL DEFAULT 0,
  movimiento_id   UUID          REFERENCES inv_movimientos(id) ON DELETE SET NULL,
  usuario_id      UUID          REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tanamat_orden    ON tanatopraxia_materiales(tanatopraxia_id);
CREATE INDEX IF NOT EXISTS idx_tanamat_producto ON tanatopraxia_materiales(producto_id);

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE tanatopraxia_materiales TO orquidea_user;
