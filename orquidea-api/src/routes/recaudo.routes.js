/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Recaudo                                             ║
 * ║  Archivo         : recaudo.routes.js                                   ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-03                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import {
  rutasDelDia,
  ordenDelDia,
  registrarVisita,
  historial,
  visitasDeOrden,
  indicadores,
  cambiarEstadoOrden,
  misRutas,
  registrarVisitaDetalle,
  obtenerRecibo,
  calendarioRecaudo,
} from '../controllers/recaudo.controller.js'

const auth = [verifyToken]

export default async function recaudoRoutes(fastify) {
  fastify.get('/rutas-del-dia',              { preHandler: auth }, rutasDelDia)
  fastify.get('/orden-del-dia',              { preHandler: auth }, ordenDelDia)
  fastify.get('/historial',                  { preHandler: auth }, historial)
  fastify.get('/historial/:ordenId/visitas', { preHandler: auth }, visitasDeOrden)
  fastify.get('/indicadores',                { preHandler: auth }, indicadores)
  fastify.post('/visitas',                   { preHandler: auth }, registrarVisita)
  fastify.patch('/ordenes/:id/estado',       { preHandler: auth }, cambiarEstadoOrden)
  fastify.get('/mis-rutas',                 { preHandler: auth }, misRutas)
  fastify.post('/visitas/detalle',          { preHandler: auth }, registrarVisitaDetalle)
  fastify.get('/recibos/:id',               { preHandler: auth }, obtenerRecibo)
  fastify.get('/calendario',                { preHandler: auth }, calendarioRecaudo)
}
