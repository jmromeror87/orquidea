/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : POS — Punto de Venta                                ║
 * ║  Archivo         : pos.routes.js                                       ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import * as ctrl from '../controllers/pos.controller.js'

export default async function posRoutes(fastify) {
  const auth   = [verifyToken]
  const admins = [verifyToken, requireRole('superadmin', 'administrador')]

  fastify.get('/caja-actual',        { preHandler: auth },   ctrl.cajaActual)
  fastify.get('/bodegas',            { preHandler: auth },   ctrl.bodegasDisponibles)
  fastify.post('/caja/abrir',        { preHandler: auth },   ctrl.abrirCaja)
  fastify.patch('/caja/:id/cerrar',  { preHandler: auth },   ctrl.cerrarCaja)
  fastify.get('/cajas',              { preHandler: auth },   ctrl.historialCajas)
  fastify.get('/cajas/:id/auditoria',{ preHandler: auth },   ctrl.auditoriaCaja)

  fastify.post('/soporte-pago',      { preHandler: auth },   ctrl.subirSoportePago)

  fastify.get('/catalogo',           { preHandler: auth },   ctrl.catalogo)
  fastify.post('/ventas',            { preHandler: auth },   ctrl.registrarVenta)
  fastify.get('/ventas',             { preHandler: auth },   ctrl.listarVentas)
  fastify.get('/ventas/:id/recibo',  { preHandler: auth },   ctrl.obtenerRecibo)
  fastify.patch('/ventas/:id/anular',{ preHandler: admins }, ctrl.anularVenta)

  fastify.get('/stats',              { preHandler: auth },   ctrl.stats)
}
