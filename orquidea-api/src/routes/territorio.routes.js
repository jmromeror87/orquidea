/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Territorio                                       ║
 * ║  Archivo : territorio.routes.js  |  Fecha: 2026-06-30                   ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken }  from '../middlewares/auth.middleware.js'
import { requirePermiso } from '../middlewares/permiso.middleware.js'
import {
  listarDepartamentos, actualizarDepartamento,
  listarMunicipios, crearMunicipio, actualizarMunicipio, eliminarMunicipio,
  listarZonas, crearZona, actualizarZona, eliminarZona,
  selectDepartamentos, selectMunicipios, selectZonas,
} from '../controllers/territorio.controller.js'

// Escrituras según la matriz de Roles y Permisos (módulo Territorio)
const puede = accion => [verifyToken, requirePermiso('territorio', accion)]

export default async function territorioRoutes(fastify) {

  // ── Selectores (todos los usuarios autenticados) ──
  fastify.get('/select/departamentos', { preHandler:[verifyToken] }, selectDepartamentos)
  fastify.get('/select/municipios',    { preHandler:[verifyToken] }, selectMunicipios)
  fastify.get('/select/zonas',         { preHandler:[verifyToken] }, selectZonas)

  // ── Departamentos ──
  fastify.get('/',             { preHandler:[verifyToken] }, listarDepartamentos)
  fastify.put('/:id',          { preHandler: puede('editar') }, actualizarDepartamento)

  // ── Municipios ──
  fastify.get('/municipios',         { preHandler:[verifyToken] }, listarMunicipios)
  fastify.post('/municipios',        { preHandler: puede('crear') }, crearMunicipio)
  fastify.put('/municipios/:id',     { preHandler: puede('editar') }, actualizarMunicipio)
  fastify.delete('/municipios/:id',  { preHandler: puede('eliminar') }, eliminarMunicipio)

  // ── Zonas / barrios / veredas ──
  fastify.get('/zonas',         { preHandler:[verifyToken] }, listarZonas)
  fastify.post('/zonas',        { preHandler:[verifyToken] }, crearZona)
  fastify.put('/zonas/:id',     { preHandler: puede('editar') }, actualizarZona)
  fastify.delete('/zonas/:id',  { preHandler: puede('eliminar') }, eliminarZona)
}
