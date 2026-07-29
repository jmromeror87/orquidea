-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 040 — Multisede transversal                          ║
-- ║  Fecha           : 2026-07-25                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  contratos.sede_id ya existía pero no se usaba. Esta migración lo        ║
-- ║  extiende a Servicios, Pólizas, Salas de velación y Flota, para que      ║
-- ║  cada usuario opere de forma transparente dentro de su propia sede,     ║
-- ║  y superadmin/administrador puedan ver todo o filtrar por una sede.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);

ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);

ALTER TABLE salas_velacion
  ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);

ALTER TABLE flota_vehiculos
  ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);

ALTER TABLE flota_conductores
  ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);

-- Backfill: todo lo existente pertenece a la sede principal (única con datos reales hoy)
UPDATE servicios_funerarios SET sede_id = (SELECT id FROM sedes WHERE es_principal LIMIT 1) WHERE sede_id IS NULL;
UPDATE polizas              SET sede_id = (SELECT id FROM sedes WHERE es_principal LIMIT 1) WHERE sede_id IS NULL;
UPDATE salas_velacion       SET sede_id = (SELECT id FROM sedes WHERE es_principal LIMIT 1) WHERE sede_id IS NULL;
UPDATE flota_vehiculos      SET sede_id = (SELECT id FROM sedes WHERE es_principal LIMIT 1) WHERE sede_id IS NULL;
UPDATE flota_conductores    SET sede_id = (SELECT id FROM sedes WHERE es_principal LIMIT 1) WHERE sede_id IS NULL;
UPDATE contratos            SET sede_id = (SELECT id FROM sedes WHERE es_principal LIMIT 1) WHERE sede_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_servicios_sede ON servicios_funerarios(sede_id);
CREATE INDEX IF NOT EXISTS idx_polizas_sede   ON polizas(sede_id);
CREATE INDEX IF NOT EXISTS idx_salas_sede     ON salas_velacion(sede_id);
CREATE INDEX IF NOT EXISTS idx_flota_veh_sede ON flota_vehiculos(sede_id);
CREATE INDEX IF NOT EXISTS idx_flota_con_sede ON flota_conductores(sede_id);
CREATE INDEX IF NOT EXISTS idx_contratos_sede ON contratos(sede_id);

COMMIT;
