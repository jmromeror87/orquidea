-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Orquídea ERP · Migración 025 — Datos completos del fallecido          ║
-- ║  Extiende terceros (persona) y defunciones (evento de muerte)          ║
-- ║  Fecha: 2026-07-14                                                      ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIÓN DE TERCEROS — datos personales del fallecido
--    (son datos de la persona, reutilizables en cualquier módulo)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE terceros
  ADD COLUMN IF NOT EXISTS lugar_exp_documento   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS municipio_nac_id      CHAR(5)      REFERENCES geo_municipios(id),
  ADD COLUMN IF NOT EXISTS estado_civil          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tipo_matrimonio       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS num_hijos             SMALLINT,
  ADD COLUMN IF NOT EXISTS nacionalidad          VARCHAR(60)  DEFAULT 'COLOMBIANA',
  ADD COLUMN IF NOT EXISTS religion              VARCHAR(80),
  ADD COLUMN IF NOT EXISTS nivel_estudios        VARCHAR(40),
  ADD COLUMN IF NOT EXISTS ocupacion             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS seguridad_social      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nombre_conyuge        VARCHAR(150),
  ADD COLUMN IF NOT EXISTS nombre_padre          VARCHAR(150),
  ADD COLUMN IF NOT EXISTS nombre_madre          VARCHAR(150);

-- Constraints de dominio
ALTER TABLE terceros
  DROP CONSTRAINT IF EXISTS chk_estado_civil,
  ADD CONSTRAINT chk_estado_civil CHECK (
    estado_civil IS NULL OR estado_civil IN
    ('SOLTERO','CASADO','DIVORCIADO','VIUDO','UNION_LIBRE')
  );

ALTER TABLE terceros
  DROP CONSTRAINT IF EXISTS chk_tipo_matrimonio,
  ADD CONSTRAINT chk_tipo_matrimonio CHECK (
    tipo_matrimonio IS NULL OR tipo_matrimonio IN ('CIVIL','RELIGIOSO','UNION_LIBRE')
  );

ALTER TABLE terceros
  DROP CONSTRAINT IF EXISTS chk_nivel_estudios,
  ADD CONSTRAINT chk_nivel_estudios CHECK (
    nivel_estudios IS NULL OR nivel_estudios IN
    ('NINGUNO','PRIMARIA','SECUNDARIA','TECNICO','UNIVERSITARIO','POSGRADO')
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. EXTENSIÓN DE DEFUNCIONES — evento de muerte completo
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE defunciones
  -- Tipo de lugar y detalle
  ADD COLUMN IF NOT EXISTS tipo_lugar            VARCHAR(30),
  ADD COLUMN IF NOT EXISTS direccion_fallecimiento VARCHAR(200),
  ADD COLUMN IF NOT EXISTS departamento_id       CHAR(2)      REFERENCES geo_departamentos(id),
  ADD COLUMN IF NOT EXISTS municipio_id          CHAR(5)      REFERENCES geo_municipios(id),
  -- Tipo de muerte
  ADD COLUMN IF NOT EXISTS tipo_muerte           VARCHAR(20),
  -- Certificación médica
  ADD COLUMN IF NOT EXISTS medico_certifica      VARCHAR(150),
  ADD COLUMN IF NOT EXISTS registro_medico       VARCHAR(80),
  ADD COLUMN IF NOT EXISTS cert_defuncion_num    VARCHAR(100),
  -- Documentos legales
  ADD COLUMN IF NOT EXISTS licencia_inhumacion   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ciudad_registro       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notaria               VARCHAR(150),
  ADD COLUMN IF NOT EXISTS serial_registro       VARCHAR(80),
  ADD COLUMN IF NOT EXISTS fecha_registro        DATE,
  ADD COLUMN IF NOT EXISTS fecha_llegada         TIMESTAMPTZ;

ALTER TABLE defunciones
  DROP CONSTRAINT IF EXISTS chk_tipo_lugar,
  ADD CONSTRAINT chk_tipo_lugar CHECK (
    tipo_lugar IS NULL OR tipo_lugar IN
    ('DOMICILIO','VIA_PUBLICA','HOGAR_GERIATRICO','HOSPITAL','CLINICA','OTRO')
  );

ALTER TABLE defunciones
  DROP CONSTRAINT IF EXISTS chk_tipo_muerte,
  ADD CONSTRAINT chk_tipo_muerte CHECK (
    tipo_muerte IS NULL OR tipo_muerte IN ('NATURAL','EN_ESTUDIO','VIOLENTA')
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. PERMISOS
-- ══════════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON terceros   TO orquidea_user;
GRANT SELECT, INSERT, UPDATE ON defunciones TO orquidea_user;

COMMIT;
