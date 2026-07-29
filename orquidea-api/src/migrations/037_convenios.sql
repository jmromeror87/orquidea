-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 037 — Módulo de Convenios                            ║
-- ║  Fecha           : 2026-07-24                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Tercer origen de servicio (junto a Contrato y Póliza): un servicio      ║
-- ║  funerario autorizado/pagado total o parcialmente por una entidad       ║
-- ║  externa (EPS, aseguradora, alcaldía, empresa, caja de compensación,    ║
-- ║  etc.), con distintos "tipos de autorización" configurables por cada    ║
-- ║  convenio (ej: Completa, Inicial, Final — nombres libres, no fijos).    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ── 1. Entidades de convenio ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convenios (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre            VARCHAR(150) NOT NULL,
  tipo_entidad      VARCHAR(30)  NOT NULL DEFAULT 'OTRO'
    CHECK (tipo_entidad IN ('EPS','ASEGURADORA','ALCALDIA','EMPRESA','CAJA_COMPENSACION','OTRO')),
  nit               VARCHAR(30),
  contacto_nombre   VARCHAR(120),
  contacto_telefono VARCHAR(20),
  contacto_email    VARCHAR(120),
  cobertura_tipo    VARCHAR(20)  NOT NULL DEFAULT 'PORCENTAJE'
    CHECK (cobertura_tipo IN ('PORCENTAJE','MONTO_FIJO')),
  cobertura_valor   NUMERIC(12,2) NOT NULL DEFAULT 100,  -- % (0-100) o $ según cobertura_tipo; valor por defecto del convenio
  activo            BOOLEAN      NOT NULL DEFAULT TRUE,
  observaciones     TEXT,
  usuario_id        UUID REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 2. Tipos de autorización configurables por convenio ────────────────────
CREATE TABLE IF NOT EXISTS convenio_autorizaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id     UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  nombre          VARCHAR(80) NOT NULL,          -- ej: "Completa", "Inicial", "Final" (libre)
  cobertura_tipo  VARCHAR(20) NOT NULL DEFAULT 'PORCENTAJE'
    CHECK (cobertura_tipo IN ('PORCENTAJE','MONTO_FIJO')),
  cobertura_valor NUMERIC(12,2) NOT NULL DEFAULT 100,
  orden           SMALLINT    NOT NULL DEFAULT 0,
  activo          BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_convenio_autorizaciones_convenio ON convenio_autorizaciones(convenio_id);

-- ── 3. Vincular servicios a un convenio (tercer origen posible) ────────────
ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS convenio_id               UUID REFERENCES convenios(id),
  ADD COLUMN IF NOT EXISTS convenio_autorizacion_id   UUID REFERENCES convenio_autorizaciones(id),
  ADD COLUMN IF NOT EXISTS convenio_numero_autorizacion VARCHAR(60),   -- radicado/número que da la entidad externa
  ADD COLUMN IF NOT EXISTS convenio_valor_cubierto   NUMERIC(12,2),    -- monto que efectivamente cubre el convenio
  ADD COLUMN IF NOT EXISTS convenio_observaciones    TEXT;

CREATE INDEX IF NOT EXISTS idx_servicios_convenio ON servicios_funerarios(convenio_id);

-- ── 4. Datos semilla: convenios de ejemplo (alcaldía + una EPS genérica) ───
INSERT INTO convenios (nombre, tipo_entidad, cobertura_tipo, cobertura_valor, observaciones)
VALUES
  ('Alcaldía de Ábrego',       'ALCALDIA',     'MONTO_FIJO',  0, 'Ayuda variable según disponibilidad presupuestal — definir monto en cada autorización'),
  ('Convenio genérico EPS/Aseguradora', 'EPS', 'PORCENTAJE', 100, 'Plantilla de ejemplo — editar/duplicar según cada entidad real')
ON CONFLICT DO NOTHING;

-- ── 5. Permisos ─────────────────────────────────────────────────────────────
INSERT INTO permisos_roles (rol, modulo, accion, permitido)
VALUES
  ('superadmin',       'convenios', 'ver',     true),
  ('superadmin',       'convenios', 'crear',   true),
  ('superadmin',       'convenios', 'editar',  true),
  ('superadmin',       'convenios', 'eliminar',true),
  ('administrador',    'convenios', 'ver',     true),
  ('administrador',    'convenios', 'crear',   true),
  ('administrador',    'convenios', 'editar',  true),
  ('operador',         'convenios', 'ver',     true),
  ('asesor_comercial', 'convenios', 'ver',     true),
  ('contador',         'convenios', 'ver',     true),
  ('consultor',        'convenios', 'ver',     true)
ON CONFLICT (rol, modulo, accion) DO NOTHING;

-- ── 6. Grants ────────────────────────────────────────────────────────────────
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE convenios, convenio_autorizaciones TO orquidea_user;

COMMIT;
