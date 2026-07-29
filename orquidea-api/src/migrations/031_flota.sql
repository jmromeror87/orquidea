/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 031                                           ║
 * ║  Flota: vehículos y conductores (parametrización + disponibilidad)      ║
 * ║  Fecha: 2026-07-24                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ── 1. Vehículos ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flota_vehiculos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placa         VARCHAR(15)  NOT NULL UNIQUE,
  marca         VARCHAR(60),
  modelo        VARCHAR(60),
  anio          SMALLINT,
  tipo          VARCHAR(20)  NOT NULL DEFAULT 'CARROZA'
    CHECK (tipo IN ('CARROZA','VAN','CAMIONETA','BUSETA','MOTO','OTRO')),
  capacidad     SMALLINT     NOT NULL DEFAULT 1,
  color         VARCHAR(30),
  observaciones TEXT,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 2. Conductores ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flota_conductores (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                    VARCHAR(120) NOT NULL,
  documento                 VARCHAR(30),
  telefono                  VARCHAR(20),
  licencia_numero           VARCHAR(30),
  licencia_categoria        VARCHAR(10),
  licencia_vencimiento      DATE,
  vehiculo_predeterminado_id UUID REFERENCES flota_vehiculos(id) ON DELETE SET NULL,
  observaciones             TEXT,
  activo                    BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 3. Vincular traslados al catálogo (sin romper registros existentes) ─────

ALTER TABLE traslados
  ADD COLUMN IF NOT EXISTS vehiculo_id  UUID REFERENCES flota_vehiculos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conductor_id UUID REFERENCES flota_conductores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_traslados_vehiculo  ON traslados(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_traslados_conductor ON traslados(conductor_id);

-- ── 4. Permisos del módulo ──────────────────────────────────────────────────

INSERT INTO permisos_roles (rol, modulo, accion, permitido)
VALUES
  ('superadmin',       'flota', 'ver',     true),
  ('superadmin',       'flota', 'crear',   true),
  ('superadmin',       'flota', 'editar',  true),
  ('superadmin',       'flota', 'eliminar',true),
  ('administrador',    'flota', 'ver',     true),
  ('administrador',    'flota', 'crear',   true),
  ('administrador',    'flota', 'editar',  true),
  ('operador',         'flota', 'ver',     true),
  ('operador',         'flota', 'crear',   true),
  ('asesor_comercial', 'flota', 'ver',     true),
  ('contador',         'flota', 'ver',     true),
  ('consultor',        'flota', 'ver',     true)
ON CONFLICT (rol, modulo, accion) DO NOTHING;

-- ── 5. Grants ────────────────────────────────────────────────────────────────

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE flota_vehiculos, flota_conductores TO orquidea_user;
