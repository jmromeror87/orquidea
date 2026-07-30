/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Usuarios y Permisos                             ║
 * ║  Archivo         : usuarios.routes.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import {
  listar, obtener, crear, actualizar,
  cambiarPassword, listarSedes, listarSedesUsuario, subirFoto,
} from '../controllers/usuarios.controller.js'

const soloAdmins = requireRole('superadmin', 'administrador')

export default async function routes(fastify) {
  fastify.get('/',          { preHandler: [verifyToken, soloAdmins] }, listar)
  fastify.post('/',         { preHandler: [verifyToken, soloAdmins] }, crear)
  fastify.get('/sedes',     { preHandler: verifyToken },               listarSedes)
  fastify.get('/:id',       { preHandler: verifyToken },               obtener)
  fastify.get('/:id/sedes-multiples', { preHandler: [verifyToken, soloAdmins] }, listarSedesUsuario)
  fastify.put('/:id',       { preHandler: [verifyToken, soloAdmins] }, actualizar)
  fastify.put('/:id/password', { preHandler: verifyToken },            cambiarPassword)
  fastify.post('/:id/foto',    { preHandler: verifyToken },            subirFoto)
}
