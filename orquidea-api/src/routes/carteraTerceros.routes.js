/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Cartera de terceros (convenios y familias)           ║
 * ║  Archivo         : carteraTerceros.routes.js                            ║
 * ║  Fecha           : 2026-08-14                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listar, detalle, registrarAbono } from '../controllers/carteraTerceros.controller.js'

const puedeCobrar = [verifyToken, requireRole('superadmin', 'administrador', 'operador')]

export default async function carteraTercerosRoutes(fastify) {
  fastify.get ('/',            { preHandler: [verifyToken] }, listar)
  fastify.get ('/:id',         { preHandler: [verifyToken] }, detalle)
  fastify.post('/:id/abonos',  { preHandler: puedeCobrar    }, registrarAbono)
}
