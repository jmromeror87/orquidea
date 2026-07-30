-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Usuarios — Cuentas de sistema ocultas del listado    ║
-- ║  Archivo         : 054_usuarios_oculto.sql                              ║
-- ║  Fecha           : 2026-07-30                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS oculto BOOLEAN NOT NULL DEFAULT FALSE;

-- La cuenta maestra sembrada por la migración 001 no debe aparecer en el listado
UPDATE usuarios SET oculto = TRUE WHERE email = 'admin@orquidea.com' OR email = 'orquiadmin@orquidea.com';
