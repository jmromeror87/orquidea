-- ═══════════════════════════════════════════════════════════════════════════
-- ORQUÍDEA ERP — Migración 006: FK de territorio en sedes y empresa
-- Fecha : 2026-06-30
-- Añade referencias a geo_departamentos, geo_municipios y geo_zonas
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Sedes: columnas geo ───────────────────────────────────────────────────
ALTER TABLE sedes
  ADD COLUMN IF NOT EXISTS departamento_id CHAR(2)  REFERENCES geo_departamentos(id),
  ADD COLUMN IF NOT EXISTS municipio_id    CHAR(5)  REFERENCES geo_municipios(id),
  ADD COLUMN IF NOT EXISTS zona_id         UUID     REFERENCES geo_zonas(id);

-- ── Empresa: columnas geo ─────────────────────────────────────────────────
ALTER TABLE empresa
  ADD COLUMN IF NOT EXISTS departamento_id CHAR(2)  REFERENCES geo_departamentos(id),
  ADD COLUMN IF NOT EXISTS municipio_id    CHAR(5)  REFERENCES geo_municipios(id);

-- ── Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sedes_departamento_id ON sedes(departamento_id);
CREATE INDEX IF NOT EXISTS idx_sedes_municipio_id    ON sedes(municipio_id);
CREATE INDEX IF NOT EXISTS idx_empresa_municipio_id  ON empresa(municipio_id);
