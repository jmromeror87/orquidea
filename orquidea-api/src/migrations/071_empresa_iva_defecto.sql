-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Empresa — % de IVA por defecto (Parámetros)          ║
-- ║  Archivo         : 071_empresa_iva_defecto.sql                          ║
-- ║  Fecha           : 2026-08-13                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE empresa
  ADD COLUMN IF NOT EXISTS porcentaje_iva_defecto NUMERIC(5,2) NOT NULL DEFAULT 19.00;
