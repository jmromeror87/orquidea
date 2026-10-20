/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Seguridad — permiso por módulo y acción              ║
 * ║  Archivo         : middlewares/permiso.middleware.js                    ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-20                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * requirePermiso('territorio', 'editar'): valida contra la matriz de Roles y
 * Permisos (permisos_roles), la misma que arma el menú. Superadmin y
 * administrador pasan siempre. Va DESPUÉS de verifyToken.
 */
import pool from '../config/database.js'

const TOTALES = ['superadmin', 'administrador']
const ACCION_TXT = { ver: 'ver', crear: 'crear', editar: 'editar', eliminar: 'eliminar', exportar: 'exportar' }

export function requirePermiso(modulo, accion = 'ver') {
  return async function (request, reply) {
    const rol = request.user?.rol
    if (TOTALES.includes(rol)) return
    const { rows } = await pool.query(
      'SELECT permitido FROM permisos_roles WHERE rol = $1 AND modulo = $2 AND accion = $3',
      [rol, modulo, accion])
    if (!rows[0]?.permitido) {
      return reply.code(403).send({
        data: null, meta: null,
        error: `Su rol no tiene permiso para ${ACCION_TXT[accion] || accion} en ${modulo}. Pídalo en Usuarios → Roles y Permisos.`,
      })
    }
  }
}
