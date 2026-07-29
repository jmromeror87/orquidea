-- ═══════════════════════════════════════════════════════════════════════════
-- ORQUÍDEA ERP — Migración 008: Tipos de documento de terceros
-- Fuente: DIAN Resolución 000042/2020 y actualizaciones — Colombia
-- Fecha : 2026-06-30
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tipos_documento (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_dian   VARCHAR(10) NOT NULL UNIQUE,   -- código oficial DIAN (11,13,31…)
  sigla         VARCHAR(10) NOT NULL,           -- CC, NIT, TI…
  nombre        VARCHAR(120) NOT NULL,
  aplica_para   VARCHAR(20) NOT NULL DEFAULT 'AMBOS', -- NATURAL | JURIDICA | AMBOS
  requiere_dv   BOOLEAN     NOT NULL DEFAULT FALSE,   -- dígito verificador (NIT)
  es_extranjero BOOLEAN     NOT NULL DEFAULT FALSE,
  orden         SMALLINT    NOT NULL DEFAULT 0,
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tipos_doc_activo ON tipos_documento(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_doc_sigla  ON tipos_documento(sigla);

-- ── Seed: códigos oficiales habilitados por la DIAN (Colombia) ────────────
-- Resolución 000042 de 2020 + Concepto 1255 de 2022
INSERT INTO tipos_documento (codigo_dian, sigla, nombre, aplica_para, requiere_dv, es_extranjero, orden) VALUES
  ('11',  'RC',   'Registro Civil de Nacimiento',                        'NATURAL',  FALSE, FALSE,  1),
  ('12',  'TI',   'Tarjeta de Identidad',                                'NATURAL',  FALSE, FALSE,  2),
  ('13',  'CC',   'Cédula de Ciudadanía',                                'NATURAL',  FALSE, FALSE,  3),
  ('21',  'TE',   'Tarjeta de Extranjería',                              'NATURAL',  FALSE, TRUE,   4),
  ('22',  'CE',   'Cédula de Extranjería',                               'NATURAL',  FALSE, TRUE,   5),
  ('31',  'NIT',  'NIT - Número de Identificación Tributaria',           'JURIDICA', TRUE,  FALSE,  6),
  ('41',  'PA',   'Pasaporte',                                           'AMBOS',    FALSE, TRUE,   7),
  ('42',  'DIE',  'Documento de Identificación Extranjero',              'NATURAL',  FALSE, TRUE,   8),
  ('43',  'SIE',  'Sin identificación del exterior / uso DIAN',         'AMBOS',    FALSE, TRUE,   9),
  ('44',  'DIEJ', 'Doc. de Identificación Extranjero Persona Jurídica',  'JURIDICA', FALSE, TRUE,  10),
  ('50',  'NITP', 'NIT de otro país',                                    'JURIDICA', FALSE, TRUE,  11),
  ('91',  'NUIP', 'Número Único de Identificación Personal',             'NATURAL',  FALSE, FALSE, 12),
  ('PEP', 'PEP',  'Permiso Especial de Permanencia',                     'NATURAL',  FALSE, TRUE,  13),
  ('PPT', 'PPT',  'Permiso por Protección Temporal (Venezolanos)',       'NATURAL',  FALSE, TRUE,  14)
ON CONFLICT (codigo_dian) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tipos_documento TO orquidea_user;
