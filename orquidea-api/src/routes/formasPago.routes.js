/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración — Formas de Pago                      ║
 * ║  Archivo         : formasPago.routes.js                                ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listar, crear, actualizar, toggleActivo } from '../controllers/formasPago.controller.js'

const auth   = [verifyToken]
const admins = [verifyToken, requireRole('superadmin','administrador')]

export default async function formasPagoRoutes(fastify) {
  fastify.get('/',        { preHandler: auth },   listar)
  fastify.post('/',       { preHandler: admins },  crear)
  fastify.put('/:id',     { preHandler: admins },  actualizar)
  fastify.patch('/:id',   { preHandler: admins },  toggleActivo)
}
