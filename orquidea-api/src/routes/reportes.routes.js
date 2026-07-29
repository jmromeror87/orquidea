/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes y Analytics                            ║
 * ║  Archivo         : reportes.routes.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import * as ctrl from '../controllers/reportes.controller.js'

const auth = [verifyToken, requireRole('superadmin', 'administrador', 'contador')]

/**
 * Rutas: /api/reportes
 */
export default async function routes(fastify) {
  fastify.get('/financiero',        { preHandler: auth }, ctrl.financiero)
  fastify.get('/ventas',            { preHandler: auth }, ctrl.ventas)
  fastify.get('/cartera',           { preHandler: auth }, ctrl.cartera)
  fastify.get('/operativo',         { preHandler: auth }, ctrl.operativo)
  fastify.get('/export/:tipo',      { preHandler: auth }, ctrl.exportarExcel)
  fastify.get('/tanatopraxia-analisis', { preHandler: auth }, ctrl.analisisTanatopraxia)
}
