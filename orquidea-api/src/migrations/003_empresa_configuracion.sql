-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Configuración de Empresa                             ║
-- ║  Archivo         : 003_empresa_configuracion.sql                        ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-06-30                                           ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ══════════════════════════════════════════════════════
-- 1. EMPRESA — datos maestros de la funeraria
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS empresa (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos generales
  razon_social          VARCHAR(200) NOT NULL,
  nombre_comercial      VARCHAR(200),
  nit                   VARCHAR(20)  NOT NULL UNIQUE,
  digito_verificador    SMALLINT,
  tipo_persona          VARCHAR(20)  NOT NULL DEFAULT 'JURIDICA'
                          CHECK (tipo_persona IN ('NATURAL','JURIDICA')),
  regimen_tributario    VARCHAR(50)  NOT NULL DEFAULT 'NO_RESPONSABLE_IVA'
                          CHECK (regimen_tributario IN (
                            'RESPONSABLE_IVA','NO_RESPONSABLE_IVA'
                          )),
  ciiu                  VARCHAR(10),
  representante_legal   VARCHAR(150),
  cedula_representante  VARCHAR(20),

  -- Contacto
  email                 VARCHAR(150),
  telefono_1            VARCHAR(20),
  telefono_2            VARCHAR(20),
  sitio_web             VARCHAR(200),

  -- Ubicación principal
  pais                  VARCHAR(60)  NOT NULL DEFAULT 'Colombia',
  departamento          VARCHAR(80),
  municipio             VARCHAR(80),
  direccion             VARCHAR(200),
  codigo_postal         VARCHAR(10),

  -- Logo
  logo_url              TEXT,

  -- Pie de página en documentos
  pie_pagina            TEXT,
  terminos_condiciones  TEXT,

  -- Control
  activo                BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
-- 2. SEDES — sucursales de la funeraria
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sedes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,

  nombre           VARCHAR(150) NOT NULL,
  codigo           VARCHAR(20)  UNIQUE,

  -- Ubicación
  departamento     VARCHAR(80),
  municipio        VARCHAR(80),
  direccion        VARCHAR(200),
  codigo_postal    VARCHAR(10),
  barrio           VARCHAR(100),

  -- Contacto
  telefono_1       VARCHAR(20),
  telefono_2       VARCHAR(20),
  email            VARCHAR(150),

  -- Responsable
  responsable_nombre VARCHAR(150),

  -- Horario de atención
  horario          JSONB DEFAULT '{"lunes_viernes":"08:00-18:00","sabado":"08:00-14:00","domingo":"cerrado","emergencias":"24/7"}',

  -- Salas de velación disponibles
  num_salas        SMALLINT DEFAULT 1,

  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  es_principal     BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
-- 3. PARÁMETROS DEL SISTEMA
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS parametros_sistema (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,

  -- DIAN / Facturación electrónica
  dataico_api_key       TEXT,
  dataico_ambiente      VARCHAR(20) DEFAULT 'habilitacion'
                          CHECK (dataico_ambiente IN ('habilitacion','produccion')),
  fe_prefijo            VARCHAR(10) DEFAULT 'FE',
  fe_resolucion_numero  VARCHAR(30),
  fe_resolucion_fecha   DATE,
  fe_consecutivo_desde  INTEGER DEFAULT 1,
  fe_consecutivo_hasta  INTEGER DEFAULT 100000,
  fe_consecutivo_actual INTEGER DEFAULT 1,
  fe_correo_habilitado  VARCHAR(150),

  -- Numeración de documentos
  prefijo_contrato      VARCHAR(10) DEFAULT 'CONT',
  prefijo_servicio      VARCHAR(10) DEFAULT 'SRV',
  prefijo_prevision     VARCHAR(10) DEFAULT 'PREV',
  consecutivo_contrato  INTEGER DEFAULT 1,
  consecutivo_servicio  INTEGER DEFAULT 1,
  consecutivo_prevision INTEGER DEFAULT 1,

  -- Parámetros de cartera
  dias_gracia_mora      SMALLINT DEFAULT 5,
  porcentaje_mora       NUMERIC(5,2) DEFAULT 0.00,
  enviar_alerta_mora_dias SMALLINT DEFAULT 3,  -- días antes del vencimiento

  -- WhatsApp / Notificaciones
  wa_token              TEXT,
  wa_phone_id           VARCHAR(50),
  wa_business_id        VARCHAR(50),
  smtp_host             VARCHAR(150),
  smtp_puerto           INTEGER DEFAULT 587,
  smtp_usuario          VARCHAR(150),
  smtp_password         TEXT,
  smtp_de_nombre        VARCHAR(100),

  -- Personalización
  color_primario        VARCHAR(7)  DEFAULT '#2E3192',
  color_acento          VARCHAR(7)  DEFAULT '#C9A020',

  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (empresa_id)
);

-- ══════════════════════════════════════════════════════
-- 4. CATÁLOGO DE PLANES EXEQUIALES
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS planes_catalogo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,

  nombre            VARCHAR(150) NOT NULL,
  codigo            VARCHAR(20)  UNIQUE,
  descripcion       TEXT,
  tipo              VARCHAR(30)  NOT NULL DEFAULT 'INDIVIDUAL'
                      CHECK (tipo IN ('INDIVIDUAL','FAMILIAR','EMPRESARIAL','CONVENIO')),

  -- Cobertura
  num_beneficiarios SMALLINT    DEFAULT 1,
  edad_max_titular  SMALLINT,
  edad_max_beneficiario SMALLINT,

  -- Valores
  valor_plan        NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_cuota_mensual NUMERIC(14,2),
  valor_seguro      NUMERIC(14,2) DEFAULT 0,
  valor_traslado    NUMERIC(14,2) DEFAULT 0,
  valor_adicionales NUMERIC(14,2) DEFAULT 0,

  -- Periodicidad permitida
  periodicidades    JSONB DEFAULT '["mensual","trimestral","semestral","anual"]',

  -- Servicios incluidos (lista de ítems)
  servicios_incluidos JSONB DEFAULT '[]',
  -- Ejemplo: [{"nombre":"Ataúd línea básica","incluido":true},{"nombre":"Traslado local","incluido":true}]

  -- Vigencia
  meses_vigencia    SMALLINT    DEFAULT 12,
  renueva_automatico BOOLEAN    DEFAULT TRUE,

  activo            BOOLEAN     NOT NULL DEFAULT TRUE,
  orden_display     SMALLINT    DEFAULT 0,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
-- 5. CATÁLOGO DE SERVICIOS FUNERARIOS (ítems)
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS servicios_catalogo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,

  nombre        VARCHAR(200) NOT NULL,
  codigo        VARCHAR(30)  UNIQUE,
  descripcion   TEXT,
  categoria     VARCHAR(60)  NOT NULL DEFAULT 'GENERAL'
                  CHECK (categoria IN (
                    'ATAUD','URNA','TRASLADO','SALA_VELACION',
                    'DOCUMENTOS','CREMACION','INHUMACION',
                    'PREPARACION','FLORES','ADICIONAL','GENERAL'
                  )),

  -- Precio
  precio_base   NUMERIC(14,2) NOT NULL DEFAULT 0,
  precio_iva    NUMERIC(14,2) DEFAULT 0,
  aplica_iva    BOOLEAN DEFAULT FALSE,
  porcentaje_iva NUMERIC(5,2) DEFAULT 0,

  -- DIAN
  codigo_producto_dian VARCHAR(10) DEFAULT '99',
  unidad_medida        VARCHAR(20) DEFAULT 'UNIDAD',

  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  orden_display SMALLINT DEFAULT 0,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
-- 6. ÍNDICES
-- ══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sedes_empresa        ON sedes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planes_empresa       ON planes_catalogo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicios_empresa    ON servicios_catalogo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planes_tipo          ON planes_catalogo(tipo);
CREATE INDEX IF NOT EXISTS idx_servicios_categoria  ON servicios_catalogo(categoria);

-- ══════════════════════════════════════════════════════
-- 7. TRIGGER — actualizado_en automático
-- ══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_empresa_ts') THEN
    CREATE TRIGGER trg_empresa_ts
      BEFORE UPDATE ON empresa
      FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sedes_ts') THEN
    CREATE TRIGGER trg_sedes_ts
      BEFORE UPDATE ON sedes
      FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_parametros_ts') THEN
    CREATE TRIGGER trg_parametros_ts
      BEFORE UPDATE ON parametros_sistema
      FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_planes_ts') THEN
    CREATE TRIGGER trg_planes_ts
      BEFORE UPDATE ON planes_catalogo
      FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_servicios_ts') THEN
    CREATE TRIGGER trg_servicios_ts
      BEFORE UPDATE ON servicios_catalogo
      FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
  END IF;
END $$;

-- ══════════════════════════════════════════════════════
-- 8. DATOS INICIALES — Funeraria San José de Ábrego
-- ══════════════════════════════════════════════════════
INSERT INTO empresa (
  razon_social, nombre_comercial, nit, digito_verificador,
  tipo_persona, regimen_tributario,
  representante_legal, cedula_representante,
  email, telefono_1, telefono_2,
  departamento, municipio, direccion,
  pie_pagina
) VALUES (
  'Funeraria San José De Ábrego S.A.S',
  'Funeraria San José',
  '900799674', 8,
  'JURIDICA', 'NO_RESPONSABLE_IVA',
  'Jairo Aarón Soto Peñaranda', '5406544',
  'info@funerariasanjose.com', '3158786701', '3147991685',
  'Norte de Santander', 'Ábrego', 'Carrera 6 No 13-56',
  'Funeraria San José De Ábrego S.A.S | NIT 900.799.674-8 | Tel: 315 878 6701 | Ábrego, N. de S.'
) ON CONFLICT DO NOTHING;

-- Sedes reales
INSERT INTO sedes (empresa_id, nombre, codigo, es_principal, departamento, municipio, direccion, telefono_1)
SELECT id, 'Ábrego', 'SEDE-001', TRUE, 'Norte de Santander', 'Ábrego', 'Carrera 6 No 13-56', '3158786701'
FROM empresa WHERE nit = '900799674'
ON CONFLICT DO NOTHING;

INSERT INTO sedes (empresa_id, nombre, codigo, es_principal, departamento, municipio, direccion, telefono_1)
SELECT id, 'Trasladados', 'SEDE-002', FALSE, 'Norte de Santander', 'Ábrego', 'Ábrego', '3147991685'
FROM empresa WHERE nit = '900799674'
ON CONFLICT DO NOTHING;

-- Parámetros iniciales
INSERT INTO parametros_sistema (empresa_id, dataico_ambiente, fe_prefijo, prefijo_contrato, prefijo_servicio, prefijo_prevision)
SELECT id, 'habilitacion', 'FE', 'CONT', 'SRV', 'PREV'
FROM empresa WHERE nit = '900000000'
ON CONFLICT DO NOTHING;

-- Planes de ejemplo
INSERT INTO planes_catalogo (empresa_id, nombre, codigo, tipo, num_beneficiarios, valor_plan, valor_cuota_mensual, descripcion, servicios_incluidos)
SELECT
  e.id,
  p.nombre, p.codigo, p.tipo::VARCHAR, p.beneficiarios,
  p.valor_plan, p.cuota_mensual, p.descripcion,
  p.servicios::JSONB
FROM empresa e,
(VALUES
  ('Plan Individual Básico',  'PLAN-001', 'INDIVIDUAL',   1, 1200000,  100000, 'Cobertura individual con servicios básicos.',
   '[{"nombre":"Ataúd línea básica","incluido":true},{"nombre":"Traslado local","incluido":true},{"nombre":"Sala de velación 24h","incluido":true},{"nombre":"Documentos legales","incluido":true}]'),
  ('Plan Familiar',           'PLAN-002', 'FAMILIAR',     5, 2400000,  200000, 'Cobertura para grupo familiar hasta 5 personas.',
   '[{"nombre":"Ataúd línea familiar","incluido":true},{"nombre":"Traslado local","incluido":true},{"nombre":"Sala de velación 48h","incluido":true},{"nombre":"Documentos legales","incluido":true},{"nombre":"Flores básicas","incluido":true}]'),
  ('Plan Premium',            'PLAN-003', 'INDIVIDUAL',   1, 3600000,  300000, 'Servicio completo de alta gama.',
   '[{"nombre":"Ataúd línea premium","incluido":true},{"nombre":"Traslado nacional","incluido":true},{"nombre":"Sala VIP 48h","incluido":true},{"nombre":"Documentos legales","incluido":true},{"nombre":"Arreglo floral premium","incluido":true},{"nombre":"Transmisión en vivo","incluido":true}]'),
  ('Plan Convenio Empresarial','PLAN-004', 'EMPRESARIAL', 1, 0,         150000, 'Plan para empresas y colectivos.',
   '[{"nombre":"Ataúd línea estándar","incluido":true},{"nombre":"Traslado local","incluido":true},{"nombre":"Sala de velación 24h","incluido":true},{"nombre":"Documentos legales","incluido":true}]')
) AS p(nombre, codigo, tipo, beneficiarios, valor_plan, cuota_mensual, descripcion, servicios)
WHERE e.nit = '900000000'
ON CONFLICT DO NOTHING;

-- Catálogo de servicios
INSERT INTO servicios_catalogo (empresa_id, nombre, codigo, categoria, precio_base, descripcion)
SELECT
  e.id, s.nombre, s.codigo, s.categoria::VARCHAR, s.precio, s.descripcion
FROM empresa e,
(VALUES
  ('Ataúd Línea Básica',         'ATD-001', 'ATAUD',         800000,  'Ataúd en madera aglomerada, color caoba'),
  ('Ataúd Línea Estándar',       'ATD-002', 'ATAUD',        1500000, 'Ataúd en madera sólida, interior acolchado'),
  ('Ataúd Línea Premium',        'ATD-003', 'ATAUD',        3000000, 'Ataúd en cedro, manijas doradas, interior seda'),
  ('Urna Cremación Básica',      'URN-001', 'URNA',          200000, 'Urna en cerámica básica'),
  ('Urna Cremación Premium',     'URN-002', 'URNA',          600000, 'Urna en mármol grabada'),
  ('Traslado Local',             'TRS-001', 'TRASLADO',      250000, 'Traslado dentro del municipio'),
  ('Traslado Departamental',     'TRS-002', 'TRASLADO',      600000, 'Traslado dentro del departamento'),
  ('Traslado Nacional',          'TRS-003', 'TRASLADO',     1500000, 'Traslado a cualquier ciudad del país'),
  ('Sala de Velación 24h',       'SLA-001', 'SALA_VELACION', 400000, 'Sala estándar por 24 horas'),
  ('Sala de Velación 48h',       'SLA-002', 'SALA_VELACION', 700000, 'Sala estándar por 48 horas'),
  ('Sala VIP 48h',               'SLA-003', 'SALA_VELACION',1200000, 'Sala premium con aire acondicionado y TV'),
  ('Preparación y Tanatopraxia', 'PRE-001', 'PREPARACION',   350000, 'Higienización y preparación del cuerpo'),
  ('Cremación',                  'CRE-001', 'CREMACION',     900000, 'Servicio completo de cremación'),
  ('Inhumación',                 'INH-001', 'INHUMACION',    300000, 'Servicio de inhumación en cementerio'),
  ('Acta de Defunción',          'DOC-001', 'DOCUMENTOS',    80000,  'Gestión del acta de defunción'),
  ('Permiso de Inhumación',      'DOC-002', 'DOCUMENTOS',    50000,  'Trámite del permiso de inhumación'),
  ('Arreglo Floral Básico',      'FLR-001', 'FLORES',        150000, 'Corona de flores naturales básica'),
  ('Arreglo Floral Premium',     'FLR-002', 'FLORES',        400000, 'Arreglo floral de alta gama'),
  ('Aviso de Prensa',            'ADC-001', 'ADICIONAL',     120000, 'Publicación en medio local'),
  ('Transmisión en Vivo',        'ADC-002', 'ADICIONAL',     200000, 'Transmisión de la velación por WhatsApp/YouTube')
) AS s(nombre, codigo, categoria, precio, descripcion)
WHERE e.nit = '900000000'
ON CONFLICT DO NOTHING;
