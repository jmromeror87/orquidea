-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Paquetes de servicio — a qué contexto pertenecen     ║
-- ║                    (Convenio y/o Contrato / Servicio inmediato)         ║
-- ║  Archivo         : 072_paquetes_tipos.sql                               ║
-- ║  Fecha           : 2026-08-13                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE paquetes_servicio
  ADD COLUMN IF NOT EXISTS tipos TEXT[] NOT NULL DEFAULT ARRAY['CONTRATO','CONVENIO'];
