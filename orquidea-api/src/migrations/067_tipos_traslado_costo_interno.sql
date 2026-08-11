-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Tipos de traslado — costo interno (cuánto le cuesta  ║
-- ║                    a la funeraria) además del precio de venta           ║
-- ║  Archivo         : 067_tipos_traslado_costo_interno.sql                 ║
-- ║  Fecha           : 2026-08-12                                          ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE tipos_traslado_config
  ADD COLUMN IF NOT EXISTS costo_interno NUMERIC(12,2) NOT NULL DEFAULT 0;
