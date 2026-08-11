-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Listas de valores paramétricas (Sexo, Estado civil,  ║
-- ║                    Ocupación, Parentesco)                               ║
-- ║  Archivo         : 063_listas_valores.sql                               ║
-- ║  Fecha           : 2026-08-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS listas_valores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        VARCHAR(30)  NOT NULL CHECK (tipo IN ('SEXO','ESTADO_CIVIL','OCUPACION','PARENTESCO')),
  codigo      VARCHAR(40)  NOT NULL,
  etiqueta    VARCHAR(100) NOT NULL,
  orden       SMALLINT     NOT NULL DEFAULT 0,
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_listas_valores_tipo_codigo UNIQUE (tipo, codigo)
);

CREATE INDEX IF NOT EXISTS idx_listas_valores_tipo ON listas_valores(tipo, activo);

INSERT INTO listas_valores (tipo, codigo, etiqueta, orden) VALUES
  ('SEXO', 'M', 'Masculino', 1),
  ('SEXO', 'F', 'Femenino', 2),
  ('ESTADO_CIVIL', 'SOLTERO', 'Soltero/a', 1),
  ('ESTADO_CIVIL', 'CASADO', 'Casado/a', 2),
  ('ESTADO_CIVIL', 'DIVORCIADO', 'Divorciado/a', 3),
  ('ESTADO_CIVIL', 'VIUDO', 'Viudo/a', 4),
  ('ESTADO_CIVIL', 'UNION_LIBRE', 'Unión libre', 5),
  ('OCUPACION', 'Ama de casa',     'Ama de casa', 1),
  ('OCUPACION', 'Agricultor/a',    'Agricultor/a', 2),
  ('OCUPACION', 'Comerciante',     'Comerciante', 3),
  ('OCUPACION', 'Empleado/a',      'Empleado/a', 4),
  ('OCUPACION', 'Independiente',   'Independiente', 5),
  ('OCUPACION', 'Pensionado/a',    'Pensionado/a', 6),
  ('OCUPACION', 'Estudiante',      'Estudiante', 7),
  ('OCUPACION', 'Desempleado/a',   'Desempleado/a', 8),
  ('PARENTESCO', 'Hijo/a',       'Hijo/a', 1),
  ('PARENTESCO', 'Esposo/a',     'Esposo/a', 2),
  ('PARENTESCO', 'Padre/Madre',  'Padre/Madre', 3),
  ('PARENTESCO', 'Hermano/a',    'Hermano/a', 4),
  ('PARENTESCO', 'Nieto/a',      'Nieto/a', 5),
  ('PARENTESCO', 'Sobrino/a',    'Sobrino/a', 6),
  ('PARENTESCO', 'Tío/a',        'Tío/a', 7),
  ('PARENTESCO', 'Primo/a',      'Primo/a', 8),
  ('PARENTESCO', 'Yerno/Nuera',  'Yerno/Nuera', 9),
  ('PARENTESCO', 'Cuñado/a',     'Cuñado/a', 10),
  ('PARENTESCO', 'Amigo/a',      'Amigo/a', 11),
  ('PARENTESCO', 'Otro',         'Otro', 12)
ON CONFLICT (tipo, codigo) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE listas_valores TO orquidea_user;
