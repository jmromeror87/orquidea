-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Landing Pública — Leads                             ║
-- ║  Archivo         : 049_leads_web.sql                                   ║
-- ║  Versión         : v1.0.0                                              ║
-- ║  Fecha           : 2026-07-28                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS leads_web (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(150) NOT NULL,
  correo      varchar(150),
  telefono    varchar(20) NOT NULL,
  mensaje     text,
  origen      varchar(40) NOT NULL DEFAULT 'landing',
  atendido    boolean NOT NULL DEFAULT false,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_web_atendido ON leads_web(atendido);
CREATE INDEX IF NOT EXISTS idx_leads_web_creado ON leads_web(creado_en);
