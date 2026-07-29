/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Permisos por Rol                                 ║
 * ║  Archivo : permisos.routes.js  |  Fecha: 2026-06-30                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { obtenerMatriz, actualizarPermiso, resetearRol, misPermisos } from '../controllers/permisos.controller.js'

export default async function permisosRoutes(fastify) {
  fastify.get('/mis-permisos', { preHandler:[verifyToken] }, misPermisos)
  fastify.get('/',             { preHandler:[verifyToken, requireRole('superadmin','administrador')] }, obtenerMatriz)
  fastify.put('/',             { preHandler:[verifyToken, requireRole('superadmin')] }, actualizarPermiso)
  fastify.delete('/:rol',      { preHandler:[verifyToken, requireRole('superadmin')] }, resetearRol)
}
