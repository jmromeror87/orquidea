-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 045_defuncion_soporte_unico.sql                      ║
-- ║  Propósito       : El acta de defunción y el permiso de inhumación      ║
-- ║                    pertenecen a la PERSONA (defunciones), no a un       ║
-- ║                    servicio en particular — se mueve el soporte ahí     ║
-- ║                    para que Servicios y Terceros vean el mismo archivo. ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE defunciones ADD COLUMN IF NOT EXISTS acta_defuncion_soporte_url TEXT;
ALTER TABLE defunciones ADD COLUMN IF NOT EXISTS permiso_inhumacion_soporte_url TEXT;

-- Las columnas equivalentes en servicios_funerarios (migración 044) quedaron
-- obsoletas apenas un día después de creadas: nunca llegaron a usarse en
-- producción, así que se eliminan sin necesidad de migrar datos.
ALTER TABLE servicios_funerarios DROP COLUMN IF EXISTS acta_defuncion_soporte_url;
ALTER TABLE servicios_funerarios DROP COLUMN IF EXISTS permiso_inhumacion_soporte_url;
