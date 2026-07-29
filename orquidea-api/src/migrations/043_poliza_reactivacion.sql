-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 043_poliza_reactivacion.sql                          ║
-- ║  Propósito       : Al cancelar una póliza, la misma póliza (no una      ║
-- ║                    nueva) puede reactivarse más adelante, conservando   ║
-- ║                    todo su historial de pagos, mora y transferencias.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE polizas ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

CREATE TABLE IF NOT EXISTS poliza_reactivaciones (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id           UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  cancelado_en        DATE NOT NULL,
  motivo_cancelacion  TEXT,
  cancelado_por       UUID REFERENCES usuarios(id),
  reactivado_en       DATE,
  motivo_reactivacion TEXT,
  reactivado_por      UUID REFERENCES usuarios(id),
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poliza_reactivaciones_poliza ON poliza_reactivaciones(poliza_id);
