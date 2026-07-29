-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Base de Datos                                   ║
-- ║  Archivo         : 002_sedes_y_usuarios.sql                        ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-06-28                                      ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- ═══════════════════════════════════════════════════════════════
--  Orquídea — Migración 002: Sedes y modelo completo de usuarios
-- ═══════════════════════════════════════════════════════════════

-- ── Tabla: sedes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sedes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(120) NOT NULL,
  direccion   TEXT,
  ciudad      VARCHAR(80),
  telefono    VARCHAR(20),
  activo      BOOLEAN      NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sede principal por defecto
INSERT INTO sedes (nombre, ciudad)
VALUES ('Sede Principal', 'Ábrego')
ON CONFLICT DO NOTHING;

-- ── Ampliar tabla usuarios ────────────────────────────────────────
-- Roles: superadmin | administrador | contador | operador | asesor_comercial | consultor
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS sede_id          UUID REFERENCES sedes(id),
  ADD COLUMN IF NOT EXISTS creado_por       UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS login_intentos   SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultimo_acceso    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS debe_cambiar_pwd BOOLEAN     NOT NULL DEFAULT false;

-- Actualizar el admin creado en 001 con la sede principal
UPDATE usuarios
SET sede_id = (SELECT id FROM sedes LIMIT 1),
    rol = 'superadmin'
WHERE email = 'admin@orquidea.com';

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email  ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol    ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_sede   ON usuarios(sede_id);
CREATE INDEX IF NOT EXISTS idx_sedes_activo    ON sedes(activo);
