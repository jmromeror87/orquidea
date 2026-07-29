-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 044_servicios_acta_defuncion_soporte.sql             ║
-- ║  Propósito       : Permite adjuntar el documento escaneado (PDF/imagen) ║
-- ║                    del acta de defunción y del permiso de inhumación,   ║
-- ║                    no solo su número, en la ficha del servicio.         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE servicios_funerarios ADD COLUMN IF NOT EXISTS acta_defuncion_soporte_url TEXT;
ALTER TABLE servicios_funerarios ADD COLUMN IF NOT EXISTS permiso_inhumacion_soporte_url TEXT;
