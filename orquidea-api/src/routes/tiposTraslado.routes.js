/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Tipos de traslado                                ║
 * ║  Archivo : tiposTraslado.routes.js  |  Fecha: 2026-08-12                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listar, select, actualizar } from '../controllers/tiposTraslado.controller.js'

const admins = [verifyToken, requireRole('superadmin', 'administrador')]

export default async function tiposTrasladoRoutes(fastify) {
  fastify.get('/select', { preHandler: [verifyToken] }, select)
  fastify.get('/',       { preHandler: [verifyToken] }, listar)
  fastify.put('/:tipo',  { preHandler: admins         }, actualizar)
}
