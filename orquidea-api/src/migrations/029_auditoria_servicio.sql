/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 029                                           ║
 * ║  Historial de modificaciones de servicios funerarios                    ║
 * ║  Fecha: 2026-07-23                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

CREATE TABLE IF NOT EXISTS servicio_auditoria (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id UUID        NOT NULL REFERENCES servicios_funerarios(id) ON DELETE CASCADE,
  usuario_id  UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  modulo      VARCHAR(40) NOT NULL,  -- 'estado','info','fallecido','contratante','items','traslados','personal','tanatopraxia','tramites'
  accion      TEXT        NOT NULL,
  metadatos   JSONB,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_servicio ON servicio_auditoria(servicio_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_sa_usuario  ON servicio_auditoria(usuario_id);

GRANT SELECT, INSERT ON servicio_auditoria TO orquidea_user;
