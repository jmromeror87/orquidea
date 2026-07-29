-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Solicitudes (CRM de leads de la landing)            ║
-- ║  Archivo         : 051_leads_web_estado.sql                            ║
-- ║  Versión         : v1.0.0                                              ║
-- ║  Fecha           : 2026-07-29                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE leads_web ADD COLUMN IF NOT EXISTS estado varchar(20) NOT NULL DEFAULT 'NUEVO';
ALTER TABLE leads_web ADD COLUMN IF NOT EXISTS asesor_id uuid REFERENCES usuarios(id);
ALTER TABLE leads_web ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE leads_web ADD COLUMN IF NOT EXISTS actualizado_en timestamptz NOT NULL DEFAULT now();

ALTER TABLE leads_web DROP CONSTRAINT IF EXISTS chk_lead_estado;
ALTER TABLE leads_web ADD CONSTRAINT chk_lead_estado
  CHECK (estado IN ('NUEVO','CONTACTADO','EN_NEGOCIACION','CONVERTIDO','DESCARTADO'));

-- Los leads ya existentes con atendido=true quedan como CONTACTADO para no perder ese estado.
UPDATE leads_web SET estado = 'CONTACTADO' WHERE atendido = true AND estado = 'NUEVO';

CREATE INDEX IF NOT EXISTS idx_leads_web_estado ON leads_web(estado);
