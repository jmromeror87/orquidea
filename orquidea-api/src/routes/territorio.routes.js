/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Territorio                                       ║
 * ║  Archivo : territorio.routes.js  |  Fecha: 2026-06-30                   ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken }  from '../middlewares/auth.middleware.js'
import { requireRole }  from '../middlewares/role.middleware.js'
import {
  listarDepartamentos, actualizarDepartamento,
  listarMunicipios, crearMunicipio, actualizarMunicipio, eliminarMunicipio,
  listarZonas, crearZona, actualizarZona, eliminarZona,
  selectDepartamentos, selectMunicipios, selectZonas,
} from '../controllers/territorio.controller.js'

const ADMIN = ['superadmin', 'administrador']

export default async function territorioRoutes(fastify) {

  // ── Selectores (todos los usuarios autenticados) ──
  fastify.get('/select/departamentos', { preHandler:[verifyToken] }, selectDepartamentos)
  fastify.get('/select/municipios',    { preHandler:[verifyToken] }, selectMunicipios)
  fastify.get('/select/zonas',         { preHandler:[verifyToken] }, selectZonas)

  // ── Departamentos ──
  fastify.get('/',             { preHandler:[verifyToken] }, listarDepartamentos)
  fastify.put('/:id',          { preHandler:[verifyToken, requireRole(...ADMIN)] }, actualizarDepartamento)

  // ── Municipios ──
  fastify.get('/municipios',         { preHandler:[verifyToken] }, listarMunicipios)
  fastify.post('/municipios',        { preHandler:[verifyToken, requireRole(...ADMIN)] }, crearMunicipio)
  fastify.put('/municipios/:id',     { preHandler:[verifyToken, requireRole(...ADMIN)] }, actualizarMunicipio)
  fastify.delete('/municipios/:id',  { preHandler:[verifyToken, requireRole(...ADMIN)] }, eliminarMunicipio)

  // ── Zonas / barrios / veredas ──
  fastify.get('/zonas',         { preHandler:[verifyToken] }, listarZonas)
  fastify.post('/zonas',        { preHandler:[verifyToken, requireRole(...ADMIN)] }, crearZona)
  fastify.put('/zonas/:id',     { preHandler:[verifyToken, requireRole(...ADMIN)] }, actualizarZona)
  fastify.delete('/zonas/:id',  { preHandler:[verifyToken, requireRole(...ADMIN)] }, eliminarZona)
}
