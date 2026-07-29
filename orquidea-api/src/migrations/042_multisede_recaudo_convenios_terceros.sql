-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 042_multisede_recaudo_convenios_terceros.sql        ║
-- ║  Propósito       : Cierra el rollout multisede en TODOS los módulos     ║
-- ║                    restantes: rutas de recaudo, convenios y terceros.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE zonas_recaudo ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);
ALTER TABLE convenios     ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);
ALTER TABLE terceros      ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);

-- Backfill: todo lo existente queda en la sede marcada como principal.
UPDATE zonas_recaudo SET sede_id = (SELECT id FROM sedes WHERE es_principal = TRUE LIMIT 1) WHERE sede_id IS NULL;
UPDATE convenios     SET sede_id = (SELECT id FROM sedes WHERE es_principal = TRUE LIMIT 1) WHERE sede_id IS NULL;
UPDATE terceros      SET sede_id = (SELECT id FROM sedes WHERE es_principal = TRUE LIMIT 1) WHERE sede_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_zonas_recaudo_sede ON zonas_recaudo(sede_id);
CREATE INDEX IF NOT EXISTS idx_convenios_sede     ON convenios(sede_id);
CREATE INDEX IF NOT EXISTS idx_terceros_sede       ON terceros(sede_id);
