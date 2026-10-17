/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Bitácora (pólizas y servicios)                       ║
 * ║  Archivo         : bitacora.routes.js                                   ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import * as ctrl from '../controllers/bitacora.controller.js'

export default async function bitacoraRoutes(fastify) {
  const auth     = [verifyToken]
  const editores = [verifyToken, requireRole('superadmin', 'administrador', 'operador', 'asesor_comercial')]

  fastify.post('/imagen',                     { preHandler: editores }, ctrl.subirImagen)
  fastify.get('/nota/:notaId/versiones',      { preHandler: auth },     ctrl.versiones)
  fastify.put('/nota/:notaId',                { preHandler: editores }, ctrl.actualizar)
  fastify.patch('/nota/:notaId/fijar',        { preHandler: editores }, ctrl.fijar)
  fastify.delete('/nota/:notaId',             { preHandler: editores }, ctrl.eliminar)
  fastify.get('/:tipo/:id',                   { preHandler: auth },     ctrl.listar)
  fastify.post('/:tipo/:id',                  { preHandler: editores }, ctrl.crear)
}
