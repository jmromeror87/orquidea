-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Planes de Póliza — alineación con contrato real       ║
-- ║  Archivo         : 059_plan_afiliacion_edad.sql                         ║
-- ║  Fecha           : 2026-07-31                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Agrega al plan: valor de afiliación propio (antes fijo en $20.000 para ║
-- ║  cualquier plan), valor por beneficiario adicional, y rango de edad de  ║
-- ║  beneficiarios — tal como aparecen en el contrato físico de previsión.  ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE planes_poliza
  ADD COLUMN IF NOT EXISTS valor_afiliacion            NUMERIC(12,2) NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS valor_beneficiario_adicional NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edad_min_beneficiario        SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edad_max_beneficiario        SMALLINT NOT NULL DEFAULT 65;
