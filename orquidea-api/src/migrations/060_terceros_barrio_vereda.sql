-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Terceros — Barrio y Vereda (alineación con contrato) ║
-- ║  Archivo         : 060_terceros_barrio_vereda.sql                       ║
-- ║  Fecha           : 2026-07-31                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE terceros
  ADD COLUMN IF NOT EXISTS barrio VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vereda VARCHAR(100);
