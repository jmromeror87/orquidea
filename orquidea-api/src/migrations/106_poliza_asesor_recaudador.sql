-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — asesor (vendedor) y recaudador             ║
-- ║  Archivo         : 106_poliza_asesor_recaudador.sql                     ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-17                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Hasta ahora el "asesor" de la póliza era quien la registró en el sistema
-- (usuario_id). La funeraria maneja tres personas distintas:
--   · registrada por  → usuario_id   (quien la digitó, no cambia)
--   · asesor          → asesor_id    (quien la vendió; a él va la comisión)
--   · recaudador      → cobrador_id  (quien cobra las cuotas; ya existía sin uso)
-- El asesor arranca igual al que la registró cuando ese usuario es asesor
-- comercial (así venía funcionando la comisión).
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS asesor_id UUID REFERENCES usuarios(id);

UPDATE polizas p SET asesor_id = p.usuario_id
  FROM usuarios u
 WHERE u.id = p.usuario_id AND u.rol = 'asesor_comercial' AND p.asesor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_polizas_asesor   ON polizas(asesor_id);
CREATE INDEX IF NOT EXISTS idx_polizas_cobrador ON polizas(cobrador_id);
