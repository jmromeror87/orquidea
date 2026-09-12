/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Auditoría (bitácora + presencia en línea)        ║
 * ║  Archivo : auditoria.routes.js  |  Fecha: 2026-09-11                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listarLog, enLinea, opcionesFiltro } from '../controllers/auditoria.controller.js'

const soloAdmin = [verifyToken, requireRole('superadmin', 'administrador')]

export default async function auditoriaRoutes(fastify) {
  fastify.get('/log',       { preHandler: soloAdmin }, listarLog)
  fastify.get('/en-linea',  { preHandler: soloAdmin }, enLinea)
  fastify.get('/opciones',  { preHandler: soloAdmin }, opcionesFiltro)
}
