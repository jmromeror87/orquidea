/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 028                                           ║
 * ║  Personal asignado a servicios funerarios                               ║
 * ║  Fecha: 2026-07-23                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

CREATE TABLE IF NOT EXISTS servicio_personal (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id  UUID NOT NULL REFERENCES servicios_funerarios(id) ON DELETE CASCADE,
  usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_servicio VARCHAR(80) NOT NULL,
  notas        TEXT,
  asignado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (servicio_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_servicio ON servicio_personal(servicio_id);
CREATE INDEX IF NOT EXISTS idx_sp_usuario  ON servicio_personal(usuario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON servicio_personal TO orquidea_user;
