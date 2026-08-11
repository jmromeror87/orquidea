/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Roles de personal en servicios                   ║
 * ║  Archivo : rolesPersonal.routes.js  |  Fecha: 2026-08-11                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listar, select, crear, actualizar, toggleActivo } from '../controllers/rolesPersonal.controller.js'

const admins = [verifyToken, requireRole('superadmin', 'administrador')]

export default async function rolesPersonalRoutes(fastify) {
  fastify.get('/select', { preHandler: [verifyToken] }, select)
  fastify.get('/',       { preHandler: [verifyToken] }, listar)
  fastify.post('/',      { preHandler: [verifyToken] }, crear)
  fastify.put('/:id',    { preHandler: admins         }, actualizar)
  fastify.patch('/:id/toggle', { preHandler: admins   }, toggleActivo)
}
