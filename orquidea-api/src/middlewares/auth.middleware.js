/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Autenticación                                   ║
 * ║  Archivo         : auth.middleware.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Middleware de autenticación JWT para Fastify
 * Uso: fastify.addHook('preHandler', verifyToken)
 */
import { marcarActividad } from '../services/presencia.service.js'

export async function verifyToken(request, reply) {
  try {
    await request.jwtVerify()
    // Marca de presencia "en línea" — barata (solo memoria), se aprovecha
    // cada petición autenticada en vez de escribir a la base de datos.
    marcarActividad(request.user, {
      ip: request.ip,
      navegador: request.headers['user-agent'] || null,
    })
  } catch (err) {
    reply.status(401).send({ error: 'Token inválido o expirado' })
  }
}

/**
 * Verifica que el usuario tenga el rol requerido
 * @param {string[]} roles - Roles permitidos
 */
export function requireRole(...roles) {
  return async (request, reply) => {
    await verifyToken(request, reply)
    if (!roles.includes(request.user.rol)) {
      reply.status(403).send({ error: 'No tienes permiso para esta acción' })
    }
  }
}
