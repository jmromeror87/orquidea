-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 041 — Usuarios con acceso a varias sedes             ║
-- ║  Fecha           : 2026-07-25                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  usuarios.sede_id sigue existiendo como "sede principal" (para valores  ║
-- ║  por defecto). Esta tabla nueva permite que un usuario tenga acceso a   ║
-- ║  varias sedes a la vez (ej. un supervisor que rota entre 2 sedes).      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

CREATE TABLE IF NOT EXISTS usuario_sedes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sede_id    UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_sede UNIQUE (usuario_id, sede_id)
);
CREATE INDEX IF NOT EXISTS idx_usuario_sedes_usuario ON usuario_sedes(usuario_id);

-- Migrar la sede principal actual de cada usuario como su primera sede asignada
INSERT INTO usuario_sedes (usuario_id, sede_id)
SELECT id, sede_id FROM usuarios WHERE sede_id IS NOT NULL
ON CONFLICT (usuario_id, sede_id) DO NOTHING;

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE usuario_sedes TO orquidea_user;

COMMIT;
