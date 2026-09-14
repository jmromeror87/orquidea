-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Gestión documental por servicio funerario           ║
-- ║  Archivo         : 093_documentos_servicio.sql                          ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-12                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Fichero de documentos por servicio: acta de defunción, certificados,
-- autorizaciones, encuestas, recibos de terceros, etc. El TIPO de documento
-- es configurable desde Configuración > Listas de Valores (mismo mecanismo
-- ya usado para Sexo/Estado civil/Ocupación/Parentesco) — trae predeterminados
-- pero se puede ampliar sin tocar código. El nombre del archivo lo pone el
-- usuario libremente (no depende del tipo elegido).

ALTER TABLE listas_valores DROP CONSTRAINT IF EXISTS listas_valores_tipo_check;
ALTER TABLE listas_valores ADD CONSTRAINT listas_valores_tipo_check
  CHECK (tipo IN ('SEXO','ESTADO_CIVIL','OCUPACION','PARENTESCO','DOCUMENTO_SERVICIO'));

INSERT INTO listas_valores (tipo, codigo, etiqueta, orden) VALUES
  ('DOCUMENTO_SERVICIO', 'ACTA_DEFUNCION',          'Acta de defunción', 1),
  ('DOCUMENTO_SERVICIO', 'CERTIFICADO_DEFUNCION',   'Certificado médico de defunción', 2),
  ('DOCUMENTO_SERVICIO', 'REGISTRO_CIVIL_DEFUNCION','Registro civil de defunción', 3),
  ('DOCUMENTO_SERVICIO', 'AUTORIZACION_DATOS',      'Autorización de uso de datos e imágenes', 4),
  ('DOCUMENTO_SERVICIO', 'HOMENAJE_VIRTUAL',        'Autorización homenaje virtual', 5),
  ('DOCUMENTO_SERVICIO', 'ENCUESTA_SERVICIO',       'Encuesta de satisfacción del servicio', 6),
  ('DOCUMENTO_SERVICIO', 'CONTRATO_PARROQUIA',      'Contrato / recibo de parroquia', 7),
  ('DOCUMENTO_SERVICIO', 'RECIBO_TERCERO',          'Recibo o factura de servicio externo', 8),
  ('DOCUMENTO_SERVICIO', 'PERMISO_INHUMACION',      'Permiso de inhumación', 9),
  ('DOCUMENTO_SERVICIO', 'OTRO',                    'Otro documento', 99)
ON CONFLICT (tipo, codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS documentos_servicio (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id   UUID NOT NULL REFERENCES servicios_funerarios(id) ON DELETE CASCADE,
  tipo_codigo   VARCHAR(40),
  nombre        VARCHAR(150) NOT NULL,
  url           TEXT NOT NULL,
  mime_type     VARCHAR(100),
  tamano_bytes  INTEGER,
  usuario_id    UUID REFERENCES usuarios(id),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_servicio_servicio ON documentos_servicio(servicio_id);
