/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Memoriales — conmemoraciones publicadas en el sitio ║
 * ║  Archivo         : memoriales.routes.js                                ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import * as ctrl from '../controllers/memoriales.controller.js'

export default async function memorialesRoutes(fastify) {
  const auth = [verifyToken, requireRole('superadmin', 'administrador', 'operador')]

  fastify.get('/',           { preHandler: auth }, ctrl.listar)
  fastify.post('/foto',      { preHandler: auth }, ctrl.subirFoto)
  fastify.post('/',          { preHandler: auth }, ctrl.crear)
  fastify.patch('/:id',      { preHandler: auth }, ctrl.actualizar)
  fastify.delete('/:id',     { preHandler: auth }, ctrl.eliminar)
}
