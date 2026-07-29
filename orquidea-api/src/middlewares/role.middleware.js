/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Control de Acceso por Rol (RBAC)                     ║
 * ║  Archivo         : role.middleware.js                                   ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Genera un preHandler que valida que el usuario autenticado tenga uno de los roles permitidos.
 * Debe ejecutarse DESPUÉS de verifyToken (que agrega request.user).
 *
 * @param {...string} roles  Roles permitidos: superadmin, administrador, contador, operador, asesor_comercial, consultor
 */
export function requireRole(...roles) {
  return async function (request, reply) {
    const rol = request.user?.rol
    if (!rol || !roles.includes(rol)) {
      return reply.code(403).send({
        data:  null,
        meta:  null,
        error: `Acceso denegado. Se requiere uno de los roles: ${roles.join(', ')}`,
      })
    }
  }
}
