-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Catálogo de servicios — permitir fijar el precio de  ║
-- ║                    venta manualmente en vez de solo costo+margen        ║
-- ║  Archivo         : 070_servicios_catalogo_precio_manual.sql             ║
-- ║  Fecha           : 2026-08-13                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE servicios_catalogo DROP CONSTRAINT IF EXISTS servicios_catalogo_margen_tipo_check;
ALTER TABLE servicios_catalogo ADD CONSTRAINT servicios_catalogo_margen_tipo_check
  CHECK (margen_tipo IN ('PORCENTAJE','FIJO','MANUAL'));
