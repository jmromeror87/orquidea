-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 038 — Convenios: tope máximo, catálogo permitido,     ║
-- ║                    contratante opcional y valor base auditable          ║
-- ║  Fecha           : 2026-07-24                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ── 1. Tope máximo (independiente del % o monto fijo de cobertura) ────────
ALTER TABLE convenios
  ADD COLUMN IF NOT EXISTS tope_maximo NUMERIC(12,2);  -- NULL = sin tope
ALTER TABLE convenio_autorizaciones
  ADD COLUMN IF NOT EXISTS tope_maximo NUMERIC(12,2);  -- NULL = hereda el del convenio

-- ── 2. Catálogo de ítems permitidos por convenio (vacío = sin restricción) ─
CREATE TABLE IF NOT EXISTS convenio_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id  UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  catalogo_id  UUID NOT NULL REFERENCES servicios_catalogo(id) ON DELETE CASCADE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_convenio_item UNIQUE (convenio_id, catalogo_id)
);
CREATE INDEX IF NOT EXISTS idx_convenio_items_convenio ON convenio_items(convenio_id);

-- ── 3. Servicio: valor base usado para el cálculo + contratante opcional ──
-- El "contratante" en un servicio por convenio es opcional: puede ser un
-- familiar responsable, o puede no existir si el acuerdo es institución a
-- institución (ej. alcaldía cubre 50% y la funeraria u otra entidad asume
-- el resto, sin que haya un familiar contratante de por medio).
ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS convenio_valor_servicio  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS contratante_convenio_id  UUID REFERENCES terceros(id);

COMMIT;
