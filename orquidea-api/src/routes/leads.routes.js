/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Solicitudes (CRM de leads de la landing)            ║
 * ║  Archivo         : leads.routes.js                                     ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import * as ctrl from '../controllers/leads.controller.js'

export default async function leadsRoutes(fastify) {
  const auth = [verifyToken, requireRole('superadmin', 'administrador', 'operador', 'asesor_comercial')]

  fastify.get('/',               { preHandler: auth }, ctrl.listar)
  fastify.get('/nuevas/conteo',  { preHandler: auth }, ctrl.contarNuevas)
  fastify.patch('/:id',          { preHandler: auth }, ctrl.actualizar)
  fastify.delete('/:id',         { preHandler: auth }, ctrl.eliminar)
}
