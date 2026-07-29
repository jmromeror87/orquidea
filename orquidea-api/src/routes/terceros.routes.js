/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Terceros                                         ║
 * ║  Archivo : terceros.routes.js  |  Fecha: 2026-06-30                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  listar, obtener, crear, actualizar,
  agregarRol, quitarRol,
  registrarDefuncion, obtenerDefuncion, subirSoporteDefuncion,
  agregarFamiliar, quitarFamiliar,
  select,
} from '../controllers/terceros.controller.js'

const auth      = [verifyToken]
const editores  = [verifyToken, requireRole('superadmin', 'administrador', 'operador', 'asesor_comercial')]
const admins    = [verifyToken, requireRole('superadmin', 'administrador')]

export default async function tercerosRoutes(fastify) {
  // Select rápido (dropdowns)
  fastify.get('/select',                       { preHandler: auth },    select)

  // CRUD principal
  fastify.get('/',                             { preHandler: auth },    listar)
  fastify.get('/:id',                          { preHandler: auth },    obtener)
  fastify.post('/',                            { preHandler: editores }, crear)
  fastify.put('/:id',                          { preHandler: editores }, actualizar)

  // Roles
  fastify.post('/:id/roles',                   { preHandler: editores }, agregarRol)
  fastify.delete('/:id/roles/:rol',            { preHandler: admins },   quitarRol)

  // Defunción
  fastify.get('/:id/defuncion',                { preHandler: auth },     obtenerDefuncion)
  fastify.post('/:id/defuncion',               { preHandler: editores }, registrarDefuncion)
  fastify.post('/:id/defuncion/soporte',       { preHandler: editores }, subirSoporteDefuncion)

  // Núcleo familiar
  fastify.post('/:id/familiares',              { preHandler: editores }, agregarFamiliar)
  fastify.delete('/:id/familiares/:familiarId',{ preHandler: editores }, quitarFamiliar)
}
