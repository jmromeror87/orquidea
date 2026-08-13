/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Convenios                                       ║
 * ║  Archivo         : convenios.routes.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  listar, obtener, crear, actualizar, toggleActivo,
  agregarAutorizacion, actualizarAutorizacion, eliminarAutorizacion,
  calcularCobertura, listarItemsPermitidos, agregarItemPermitido, eliminarItemPermitido,
  listarPaquetesVinculados, agregarPaqueteVinculado, eliminarPaqueteVinculado,
} from '../controllers/convenios.controller.js'

const auth   = [verifyToken]
const admins = [verifyToken, requireRole('superadmin','administrador')]

export default async function conveniosRoutes(fastify) {
  fastify.get   ('/',                       { preHandler: auth },   listar)
  fastify.get   ('/:id',                    { preHandler: auth },   obtener)
  fastify.get   ('/:id/calcular',           { preHandler: auth },   calcularCobertura)
  fastify.post  ('/',                       { preHandler: admins }, crear)
  fastify.put   ('/:id',                    { preHandler: admins }, actualizar)
  fastify.patch ('/:id/toggle',             { preHandler: admins }, toggleActivo)
  fastify.post  ('/:id/autorizaciones',            { preHandler: admins }, agregarAutorizacion)
  fastify.put   ('/autorizaciones/:autId',         { preHandler: admins }, actualizarAutorizacion)
  fastify.delete('/autorizaciones/:autId',         { preHandler: admins }, eliminarAutorizacion)
  fastify.get   ('/:id/items',                     { preHandler: auth },   listarItemsPermitidos)
  fastify.post  ('/:id/items',                      { preHandler: admins }, agregarItemPermitido)
  fastify.delete('/items/:itemId',                  { preHandler: admins }, eliminarItemPermitido)
  fastify.get   ('/:id/paquetes',                  { preHandler: auth },   listarPaquetesVinculados)
  fastify.post  ('/:id/paquetes',                  { preHandler: admins }, agregarPaqueteVinculado)
  fastify.delete('/paquetes/:vinculoId',            { preHandler: admins }, eliminarPaqueteVinculado)
}
