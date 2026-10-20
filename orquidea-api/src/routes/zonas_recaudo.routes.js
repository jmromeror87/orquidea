/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Territorio — Recaudo                                ║
 * ║  Archivo         : zonas_recaudo.routes.js                             ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-03                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { requirePermiso } from '../middlewares/permiso.middleware.js'
import { verifyToken } from '../middlewares/auth.middleware.js'
import {
  listarZonas, crearZona, actualizarZona, eliminarZona,
  listarRutas, crearRuta, actualizarRuta, eliminarRuta,
  polizasDeRuta, asignarPoliza, quitarPoliza,
  listarRecaudadores,
  polizasSugeridas, asignarTodasSugeridas,
} from '../controllers/zonas_recaudo.controller.js'

const auth = [verifyToken]
// Configurar zonas y rutas = módulo Territorio de la matriz de Roles y Permisos
// (antes cualquier usuario con sesión podía crear, cambiar o borrar)
const puede = accion => [verifyToken, requirePermiso('territorio', accion)]

export default async function zonasRecaudoRoutes(fastify) {
  fastify.get('/recaudadores',                    { preHandler: auth }, listarRecaudadores)
  fastify.get('/',                                { preHandler: auth }, listarZonas)
  fastify.post('/',                               { preHandler: puede('crear') }, crearZona)
  fastify.put('/:id',                             { preHandler: puede('editar') }, actualizarZona)
  fastify.delete('/:id',                          { preHandler: puede('eliminar') }, eliminarZona)
  fastify.get('/:zona_id/rutas',                  { preHandler: auth }, listarRutas)
  fastify.post('/:zona_id/rutas',                 { preHandler: puede('crear') }, crearRuta)
  fastify.put('/rutas/:id',                       { preHandler: puede('editar') }, actualizarRuta)
  fastify.delete('/rutas/:id',                    { preHandler: puede('eliminar') }, eliminarRuta)
  fastify.get('/rutas/:id/polizas',                      { preHandler: auth }, polizasDeRuta)
  fastify.post('/rutas/:id/polizas',                     { preHandler: puede('editar') }, asignarPoliza)
  fastify.delete('/rutas/:id/polizas/:poliza_id',        { preHandler: puede('editar') }, quitarPoliza)
  fastify.get('/rutas/:id/sugeridas',                    { preHandler: auth }, polizasSugeridas)
  fastify.post('/rutas/:id/sugeridas/asignar-todas',     { preHandler: puede('editar') }, asignarTodasSugeridas)
}
