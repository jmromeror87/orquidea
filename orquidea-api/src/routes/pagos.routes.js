/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Cartera y Pagos                                     ║
 * ║  Archivo         : pagos.routes.js                                     ║
 * ║  Fecha           : 2026-07-01                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken }  from '../middlewares/auth.middleware.js'
import { requireRole }  from '../middlewares/role.middleware.js'
import * as ctrl        from '../controllers/pagos.controller.js'

export default async function pagosRoutes(fastify) {
  const auth    = [verifyToken]
  const cajeros = [verifyToken, requireRole('superadmin','administrador','operador','asesor_comercial')]
  const admins  = [verifyToken, requireRole('superadmin','administrador')]

  fastify.get('/stats',              { preHandler: auth },    ctrl.stats)
  fastify.get('/',                   { preHandler: auth },    ctrl.listar)
  fastify.get('/buscar',             { preHandler: auth },    ctrl.buscarParaPagar)
  fastify.get('/morosos',            { preHandler: auth },    ctrl.morosos)
  fastify.get('/recibo/:numero',     { preHandler: auth },    ctrl.detalleRecibo)

  fastify.post('/poliza',            { preHandler: cajeros }, ctrl.registrarPagoPoliza)
  fastify.post('/contrato',          { preHandler: cajeros }, ctrl.registrarPagoContrato)

  fastify.patch('/:id/anular',       { preHandler: admins },  ctrl.anularPagoPoliza)
  fastify.post('/recalcular-mora',   { preHandler: admins },  ctrl.recalcularMora)
  fastify.post('/:id/soporte',       { preHandler: cajeros }, ctrl.subirSoporte)
}
