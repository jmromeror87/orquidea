/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Flota — Rutas                                    ║
 * ║  Archivo         : flota.routes.js                                 ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import * as ctrl from '../controllers/flota.controller.js'

const auth   = [verifyToken]
const editor = [verifyToken, requireRole('superadmin', 'administrador', 'operador')]

export default async function flotaRoutes(fastify) {
  fastify.get('/vehiculos',           { preHandler: auth },   ctrl.listarVehiculos)
  fastify.post('/vehiculos',          { preHandler: editor }, ctrl.crearVehiculo)
  fastify.put('/vehiculos/:id',       { preHandler: editor }, ctrl.actualizarVehiculo)

  fastify.get('/conductores',         { preHandler: auth },   ctrl.listarConductores)
  fastify.post('/conductores',        { preHandler: editor }, ctrl.crearConductor)
  fastify.put('/conductores/:id',     { preHandler: editor }, ctrl.actualizarConductor)
}
