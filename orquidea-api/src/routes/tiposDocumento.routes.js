/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Tipos de Documento                               ║
 * ║  Archivo : tiposDocumento.routes.js  |  Fecha: 2026-06-30               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listar, crear, actualizar, toggleActivo, selectTipos } from '../controllers/tiposDocumento.controller.js'

const admins = [verifyToken, requireRole('superadmin', 'administrador')]

export default async function tiposDocumentoRoutes(fastify) {
  fastify.get('/select', { preHandler: [verifyToken] }, selectTipos)
  fastify.get('/',       { preHandler: [verifyToken] }, listar)
  fastify.post('/',      { preHandler: admins         }, crear)
  fastify.put('/:id',    { preHandler: admins         }, actualizar)
  fastify.patch('/:id/toggle', { preHandler: admins   }, toggleActivo)
}
