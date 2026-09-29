-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Servicios — datos de exequias                       ║
-- ║  Archivo         : 097_servicio_exequias.sql                            ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-29                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Los formatos que se entregan a la familia (Atención y acompañamientos) se
-- llenan solos con los datos del servicio. Faltaban:
--  - iglesia y coro de las exequias (los ítems del catálogo solo dicen si
--    hay misa/coro, no cuál);
--  - el cargo "Jefe de Protocolo" para asignarlo en la pestaña Personal.
ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS iglesia VARCHAR(150),
  ADD COLUMN IF NOT EXISTS coro    VARCHAR(150);

INSERT INTO roles_personal_servicio (codigo, etiqueta, orden)
VALUES ('Jefe de Protocolo', 'Jefe de Protocolo', 0)
ON CONFLICT (codigo) DO NOTHING;
