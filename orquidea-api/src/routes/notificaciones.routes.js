/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Notificaciones — Rutas                               ║
 * ║  Archivo         : notificaciones.routes.js                             ║
 * ║  Fecha           : 2026-08-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  whatsappEstado, whatsappReiniciar, smsSaldo, listarLog, enviarManual,
} from '../controllers/notificaciones.controller.js'

export default async function notificacionesRoutes(fastify) {
  const admins   = [verifyToken, requireRole('superadmin', 'administrador')]
  const editores = [verifyToken, requireRole('superadmin', 'administrador', 'operador', 'asesor_comercial')]

  fastify.get('/whatsapp/estado',      { preHandler: admins },   whatsappEstado)
  fastify.post('/whatsapp/reiniciar',  { preHandler: admins },   whatsappReiniciar)
  fastify.get('/sms/saldo',            { preHandler: admins },   smsSaldo)
  fastify.get('/log',                  { preHandler: admins },   listarLog)
  fastify.post('/enviar',              { preHandler: editores }, enviarManual)
}
