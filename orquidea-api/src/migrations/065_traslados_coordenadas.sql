-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Traslados — coordenadas exactas (Mapbox Geocoding)   ║
-- ║  Archivo         : 065_traslados_coordenadas.sql                        ║
-- ║  Fecha           : 2026-08-11                                          ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE traslados
  ADD COLUMN IF NOT EXISTS origen_lat  NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS origen_lon  NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS destino_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS destino_lon NUMERIC(10,7);
