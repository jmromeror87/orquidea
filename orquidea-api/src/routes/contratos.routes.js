/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contratos                                       ║
 * ║  Archivo         : contratos.routes.js                             ║
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
import {
  listar, obtener, crear, actualizar, cambiarEstado, stats,
  paquetes, crearPaquete, actualizarPaquete, eliminarPaquete,
  listarItems, crearItem, eliminarItem,
} from '../controllers/contratos.controller.js'

const auth     = [verifyToken]
const editores = [verifyToken, requireRole('superadmin','administrador','operador','asesor_comercial')]
const admins   = [verifyToken, requireRole('superadmin','administrador')]

export default async function contratosRoutes(fastify) {
  fastify.get('/stats',        { preHandler: auth },     stats)
  // Paquetes de servicio CRUD
  fastify.get('/paquetes',                         { preHandler: auth },    paquetes)
  fastify.post('/paquetes',                        { preHandler: admins },  crearPaquete)
  fastify.put('/paquetes/:id',                     { preHandler: admins },  actualizarPaquete)
  fastify.delete('/paquetes/:id',                  { preHandler: admins },  eliminarPaquete)
  // Ítems de paquete
  fastify.get('/paquetes/:paqId/items',            { preHandler: auth },    listarItems)
  fastify.post('/paquetes/:paqId/items',           { preHandler: admins },  crearItem)
  fastify.delete('/paquetes/:paqId/items/:itemId', { preHandler: admins },  eliminarItem)
  fastify.get('/',             { preHandler: auth },     listar)
  fastify.get('/:id',          { preHandler: auth },     obtener)
  fastify.post('/',            { preHandler: editores }, crear)
  fastify.put('/:id',          { preHandler: editores }, actualizar)
  fastify.patch('/:id/estado', { preHandler: admins },   cambiarEstado)
}
