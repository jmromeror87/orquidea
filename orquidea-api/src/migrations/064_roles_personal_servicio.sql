-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Roles de personal en servicios (Director, Conductor, ║
-- ║                    Tanatopraxia, etc.) — catálogo parametrizable con    ║
-- ║                    costo interno y vínculo opcional a ítem vendible     ║
-- ║  Archivo         : 064_roles_personal_servicio.sql                      ║
-- ║  Fecha           : 2026-08-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS roles_personal_servicio (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo        VARCHAR(80)  NOT NULL UNIQUE,
  etiqueta      VARCHAR(80)  NOT NULL,
  costo_interno NUMERIC(12,2) NOT NULL DEFAULT 0,
  catalogo_id   UUID REFERENCES servicios_catalogo(id) ON DELETE SET NULL,
  orden         SMALLINT     NOT NULL DEFAULT 0,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO roles_personal_servicio (codigo, etiqueta, orden) VALUES
  ('Director de Servicios',   'Director de Servicios',   1),
  ('Conductor / Traslado',    'Conductor / Traslado',    2),
  ('Tanatopraxia',            'Tanatopraxia',             3),
  ('Recepción de Restos',     'Recepción de Restos',     4),
  ('Asesor Comercial',        'Asesor Comercial',        5),
  ('Operador de Sala',        'Operador de Sala',        6),
  ('Auxiliar Funerario',      'Auxiliar Funerario',      7),
  ('Apoyo Logístico',         'Apoyo Logístico',         8),
  ('Coordinador de Trámites', 'Coordinador de Trámites', 9)
ON CONFLICT (codigo) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE roles_personal_servicio TO orquidea_user;
