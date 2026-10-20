-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 115 — Permisos alineados con los módulos del menú    ║
-- ║  Fecha           : 2026-10-20                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- La matriz de Roles y Permisos tenía una lista de módulos distinta del menú:
--  · mostraba "clientes", pero el menú lee "terceros";
--  · no mostraba Pólizas, Convenios, Inventario, Compras, Tesorería… → esos
--    permisos (encendidos desde la instalación) no se podían quitar.

-- 1. Operador: solo conserva lo que se le asignó en la matriz. Los módulos que
--    la matriz NO mostraba (y por eso nunca se pudieron quitar) quedan apagados;
--    desde ahora se encienden en Usuarios → Roles y Permisos.
UPDATE permisos_roles SET permitido = FALSE
WHERE rol = 'operador'
  AND modulo NOT IN ('dashboard','cartera','contratos','servicios','reportes','usuarios',
                     'configuracion','territorio','recaudo','pos','memoriales','solicitudes');

-- 2. Lo que se configuró como "Clientes" es Terceros (va después del paso 1
--    para respetar lo que sí se marcó en la pantalla)
INSERT INTO permisos_roles (rol, modulo, accion, permitido)
SELECT rol, 'terceros', accion, permitido FROM permisos_roles WHERE modulo = 'clientes'
ON CONFLICT (rol, modulo, accion) DO UPDATE SET permitido = EXCLUDED.permitido;
DELETE FROM permisos_roles WHERE modulo = 'clientes';
