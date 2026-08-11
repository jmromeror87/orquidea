/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Geocodificación / ruteo de traslados             ║
 * ║  Archivo : geo.routes.js  |  Fecha: 2026-08-11                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { ruta } from '../controllers/geo.controller.js'

export default async function geoRoutes(fastify) {
  fastify.get('/ruta', { preHandler: [verifyToken] }, ruta)
}
