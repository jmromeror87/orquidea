/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Asesores Comerciales — Rutas                     ║
 * ║  Archivo         : asesores.routes.js                               ║
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
import {
  listar, kpis, comisionesDeAsesor, actualizarPorcentaje,
  obtenerConfig, actualizarConfig, pagarComision, anularComision,
} from '../controllers/asesores.controller.js'

const auth   = [verifyToken]
const admins = [verifyToken, requireRole('superadmin', 'administrador')]

export default async function asesoresRoutes(fastify) {
  fastify.get('/',                 { preHandler: auth },   listar)
  fastify.get('/kpis',             { preHandler: auth },   kpis)
  fastify.get('/config',           { preHandler: auth },   obtenerConfig)
  fastify.put('/config',           { preHandler: admins }, actualizarConfig)
  fastify.get('/:id/comisiones',   { preHandler: auth },   comisionesDeAsesor)
  fastify.put('/:id/comision',     { preHandler: admins }, actualizarPorcentaje)
  fastify.patch('/comisiones/:id/pagar',  { preHandler: admins }, pagarComision)
  fastify.patch('/comisiones/:id/anular', { preHandler: admins }, anularComision)
}
