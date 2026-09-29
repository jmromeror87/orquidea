-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Servicios — coordinador                             ║
-- ║  Archivo         : 096_coordinador_servicios.sql                        ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-29                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- El coordinador es un CARGO dentro del servicio (no un rol de permisos):
--  1. Se agrega "Coordinador" al catálogo de roles de personal, para poder
--     asignarlo en la pestaña Personal de cada servicio.
--  2. parametros_sistema.coordinador_usuario_id guarda el coordinador
--     predeterminado de la funeraria: lo usan los formatos (asistencia a
--     novenarios, …) cuando el servicio no tiene uno asignado.
INSERT INTO roles_personal_servicio (codigo, etiqueta, orden)
VALUES ('Coordinador', 'Coordinador', 0)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE parametros_sistema
  ADD COLUMN IF NOT EXISTS coordinador_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
