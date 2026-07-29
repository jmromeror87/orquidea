/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 030                                           ║
 * ║  Asesores comerciales — comisiones por venta                            ║
 * ║  Fecha: 2026-07-24                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ── 1. % de comisión por asesor (override opcional del valor global) ──────

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS porcentaje_comision NUMERIC(5,2);

-- ── 2. Configuración global de comisiones ──────────────────────────────────

CREATE TABLE IF NOT EXISTS comision_config (
  id                 SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  porcentaje_default NUMERIC(5,2) NOT NULL DEFAULT 3.00,
  actualizado        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO comision_config (id, porcentaje_default) VALUES (1, 3.00)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Comisiones generadas por venta (póliza o contrato) ─────────────────

CREATE TABLE IF NOT EXISTS comisiones (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id     UUID          NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  origen_tipo    VARCHAR(20)   NOT NULL CHECK (origen_tipo IN ('POLIZA','CONTRATO')),
  origen_id      UUID          NOT NULL,
  valor_base     NUMERIC(12,2) NOT NULL,
  porcentaje     NUMERIC(5,2)  NOT NULL,
  valor_comision NUMERIC(12,2) NOT NULL,
  estado         VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','PAGADA','ANULADA')),
  fecha_pago     DATE,
  observaciones  TEXT,
  creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_comision_origen UNIQUE (origen_tipo, origen_id)
);

CREATE INDEX IF NOT EXISTS idx_comisiones_usuario ON comisiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_estado  ON comisiones(estado);

-- ── 4. Permisos del módulo ─────────────────────────────────────────────────

INSERT INTO permisos_roles (rol, modulo, accion, permitido)
VALUES
  ('superadmin',       'asesores', 'ver',     true),
  ('superadmin',       'asesores', 'crear',   true),
  ('superadmin',       'asesores', 'editar',  true),
  ('superadmin',       'asesores', 'eliminar',true),
  ('administrador',    'asesores', 'ver',     true),
  ('administrador',    'asesores', 'crear',   true),
  ('administrador',    'asesores', 'editar',  true),
  ('asesor_comercial', 'asesores', 'ver',     true),
  ('contador',         'asesores', 'ver',     true),
  ('consultor',        'asesores', 'ver',     true)
ON CONFLICT (rol, modulo, accion) DO NOTHING;

-- ── 5. Grants ───────────────────────────────────────────────────────────────

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE comisiones, comision_config TO orquidea_user;
