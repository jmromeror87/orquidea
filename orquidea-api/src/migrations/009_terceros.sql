-- ═══════════════════════════════════════════════════════════════════════════
-- ORQUÍDEA ERP — Migración 009: Modelo unificado de Terceros
-- Reemplaza las tablas separadas clientes/difuntos por un maestro único
-- de personas (terceros) con roles múltiples (Cliente, Titular de póliza,
-- Beneficiario/Núcleo familiar, Difunto, Contratante, Acudiente).
-- Patrón estándar en ERP/contable colombiano (SIIGO, World Office).
-- Fecha : 2026-06-30
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabla maestra: terceros ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terceros (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_documento_id  UUID REFERENCES tipos_documento(id),
  numero_documento   VARCHAR(20),
  dv                 VARCHAR(1),                    -- dígito verificación (NIT)
  tipo_persona       VARCHAR(10)  NOT NULL DEFAULT 'NATURAL', -- NATURAL | JURIDICA
  nombres            VARCHAR(120),
  apellidos          VARCHAR(120),
  razon_social       VARCHAR(200),                  -- solo si tipo_persona = JURIDICA
  fecha_nacimiento   DATE,
  sexo               VARCHAR(1),                    -- M | F
  rh                 VARCHAR(5),                    -- grupo sanguíneo (uso funerario)
  telefono           VARCHAR(20),
  telefono_alt       VARCHAR(20),
  email              VARCHAR(180),
  direccion          TEXT,
  departamento_id    CHAR(2)  REFERENCES geo_departamentos(id),
  municipio_id       CHAR(5)  REFERENCES geo_municipios(id),
  zona_id            UUID     REFERENCES geo_zonas(id),
  observaciones      TEXT,
  activo             BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_terceros_documento UNIQUE (tipo_documento_id, numero_documento)
);

CREATE INDEX IF NOT EXISTS idx_terceros_numero_documento ON terceros(numero_documento);
CREATE INDEX IF NOT EXISTS idx_terceros_nombres          ON terceros(nombres, apellidos);
CREATE INDEX IF NOT EXISTS idx_terceros_activo            ON terceros(activo);

-- ── Roles que puede tener un tercero (uno o varios a la vez) ──────────────
CREATE TABLE IF NOT EXISTS tercero_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tercero_id  UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  rol         VARCHAR(20) NOT NULL CHECK (rol IN (
                'CLIENTE','TITULAR_POLIZA','BENEFICIARIO',
                'DIFUNTO','CONTRATANTE','ACUDIENTE','EMPLEADO','PROVEEDOR')),
  activo      BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tercero_rol UNIQUE (tercero_id, rol)
);

CREATE INDEX IF NOT EXISTS idx_tercero_roles_tercero ON tercero_roles(tercero_id);
CREATE INDEX IF NOT EXISTS idx_tercero_roles_rol      ON tercero_roles(rol);

-- ── Núcleo familiar: vincula beneficiarios a un titular de póliza ─────────
CREATE TABLE IF NOT EXISTS nucleo_familiar (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titular_id    UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  beneficiario_id UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  parentesco    VARCHAR(40) NOT NULL,  -- conyuge | hijo | padre | madre | hermano | otro
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_nucleo_familiar UNIQUE (titular_id, beneficiario_id),
  CONSTRAINT chk_no_autorelacion CHECK (titular_id <> beneficiario_id)
);

CREATE INDEX IF NOT EXISTS idx_nucleo_titular     ON nucleo_familiar(titular_id);
CREATE INDEX IF NOT EXISTS idx_nucleo_beneficiario ON nucleo_familiar(beneficiario_id);

-- ── Defunciones: datos del fallecimiento cuando un tercero pasa a DIFUNTO ─
CREATE TABLE IF NOT EXISTS defunciones (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tercero_id           UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  fecha_fallecimiento  DATE NOT NULL,
  hora_fallecimiento   TIME,
  lugar_fallecimiento  VARCHAR(200),
  causa_fallecimiento  VARCHAR(200),
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_defuncion_tercero UNIQUE (tercero_id)
);

-- ── Migrar contratos a referenciar terceros en vez de clientes/difuntos ───
ALTER TABLE contratos
  DROP CONSTRAINT IF EXISTS contratos_cliente_id_fkey,
  DROP CONSTRAINT IF EXISTS contratos_difunto_id_fkey;

ALTER TABLE contratos RENAME COLUMN cliente_id TO contratante_id;

ALTER TABLE contratos
  ADD CONSTRAINT contratos_contratante_id_fkey FOREIGN KEY (contratante_id) REFERENCES terceros(id),
  ADD CONSTRAINT contratos_difunto_id_fkey     FOREIGN KEY (difunto_id)     REFERENCES terceros(id);

-- ── Retirar las tablas reemplazadas (vacías, sin controlador implementado) ─
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS difuntos;

-- ── Renombrar el módulo de permisos "clientes" -> "terceros" ──────────────
UPDATE permisos_roles SET modulo = 'terceros' WHERE modulo = 'clientes';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE terceros, tercero_roles, nucleo_familiar, defunciones TO orquidea_user;
