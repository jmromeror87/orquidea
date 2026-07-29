/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios Funerarios — Migración 011                 ║
 * ║  Archivo         : 011_servicios.sql                                    ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ── 1. Salas de velación ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salas_velacion (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(60)  NOT NULL,
  capacidad   SMALLINT     NOT NULL DEFAULT 50,
  activa      BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO salas_velacion (nombre, capacidad) VALUES
  ('Sala A', 80),
  ('Sala B', 60),
  ('Sala C', 40),
  ('Sala Pequeña', 20)
ON CONFLICT DO NOTHING;

-- ── 2. Servicios funerarios ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS servicios_funerarios (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero               SERIAL UNIQUE,
  contrato_id          UUID NOT NULL REFERENCES contratos(id) ON DELETE RESTRICT,
  difunto_id           UUID NOT NULL REFERENCES terceros(id)  ON DELETE RESTRICT,

  -- Disposición final
  tipo_disposicion     VARCHAR(20) NOT NULL DEFAULT 'INHUMACION'
    CHECK (tipo_disposicion IN ('INHUMACION','CREMACION','OSARIO')),

  -- Velación
  sala_id              UUID REFERENCES salas_velacion(id),
  fecha_velacion_ini   TIMESTAMPTZ,
  fecha_velacion_fin   TIMESTAMPTZ,

  -- Lugar de fallecimiento / recogida
  lugar_recogida       VARCHAR(200),
  fecha_recogida       TIMESTAMPTZ,

  -- Inhumación / cremación
  lugar_disposicion    VARCHAR(200),   -- cementerio, crematorio
  fecha_disposicion    TIMESTAMPTZ,

  -- Trámites
  acta_defuncion       VARCHAR(60),    -- número de acta
  permiso_inhumacion   VARCHAR(60),
  tramites_completos   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Estado del servicio
  estado               VARCHAR(20) NOT NULL DEFAULT 'RECIBIDO'
    CHECK (estado IN ('RECIBIDO','EN_CURSO','COMPLETADO','CANCELADO')),

  observaciones        TEXT,
  usuario_id           UUID NOT NULL REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Traslados ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS traslados (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id   UUID NOT NULL REFERENCES servicios_funerarios(id) ON DELETE CASCADE,
  tipo          VARCHAR(30) NOT NULL
    CHECK (tipo IN ('RECOGIDA','SALA_VELACION','CEMENTERIO','CREMATORIO','OTRO')),
  origen        VARCHAR(200),
  destino       VARCHAR(200),
  fecha_hora    TIMESTAMPTZ,
  vehiculo      VARCHAR(80),
  conductor     VARCHAR(100),
  completado    BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Servicios adicionales del servicio (flores, coronas, etc.) ─────────

CREATE TABLE IF NOT EXISTS items_servicio (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id   UUID NOT NULL REFERENCES servicios_funerarios(id) ON DELETE CASCADE,
  descripcion   VARCHAR(200) NOT NULL,
  cantidad      INTEGER      NOT NULL DEFAULT 1,
  precio_unit   NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal      NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 5. Permisos ───────────────────────────────────────────────────────────

INSERT INTO permisos_roles (rol, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
VALUES
  ('superadmin',       'servicios', true, true,  true,  true),
  ('administrador',    'servicios', true, true,  true,  true),
  ('operador',         'servicios', true, true,  true,  false),
  ('asesor_comercial', 'servicios', true, true,  false, false),
  ('contador',         'servicios', true, false, false, false),
  ('consultor',        'servicios', true, false, false, false)
ON CONFLICT (rol, modulo) DO NOTHING;

-- ── 6. Grants ─────────────────────────────────────────────────────────────

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE
  salas_velacion, servicios_funerarios, traslados, items_servicio
TO orquidea_user;
