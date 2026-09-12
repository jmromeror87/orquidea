/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Tesorería (comprobantes de ingreso/egreso)       ║
 * ║  Archivo : tesoreria.routes.js  |  Fecha: 2026-09-11                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listar, obtener, crear, anular } from '../controllers/tesoreria.controller.js'

const contadores = [verifyToken, requireRole('superadmin', 'administrador', 'contador')]

export default async function tesoreriaRoutes(fastify) {
  fastify.get('/comprobantes',           { preHandler: contadores }, listar)
  fastify.get('/comprobantes/:id',       { preHandler: contadores }, obtener)
  fastify.post('/comprobantes',          { preHandler: contadores }, crear)
  fastify.post('/comprobantes/:id/anular', { preHandler: contadores }, anular)
}
