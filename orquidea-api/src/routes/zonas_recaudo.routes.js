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
import { verifyToken } from '../middlewares/auth.middleware.js'
import {
  listarZonas, crearZona, actualizarZona, eliminarZona,
  listarRutas, crearRuta, actualizarRuta,
  polizasDeRuta, asignarPoliza, quitarPoliza,
  listarRecaudadores,
  polizasSugeridas, asignarTodasSugeridas,
} from '../controllers/zonas_recaudo.controller.js'

const auth = [verifyToken]

export default async function zonasRecaudoRoutes(fastify) {
  fastify.get('/recaudadores',                    { preHandler: auth }, listarRecaudadores)
  fastify.get('/',                                { preHandler: auth }, listarZonas)
  fastify.post('/',                               { preHandler: auth }, crearZona)
  fastify.put('/:id',                             { preHandler: auth }, actualizarZona)
  fastify.delete('/:id',                          { preHandler: auth }, eliminarZona)
  fastify.get('/:zona_id/rutas',                  { preHandler: auth }, listarRutas)
  fastify.post('/:zona_id/rutas',                 { preHandler: auth }, crearRuta)
  fastify.put('/rutas/:id',                       { preHandler: auth }, actualizarRuta)
  fastify.get('/rutas/:id/polizas',                      { preHandler: auth }, polizasDeRuta)
  fastify.post('/rutas/:id/polizas',                     { preHandler: auth }, asignarPoliza)
  fastify.delete('/rutas/:id/polizas/:poliza_id',        { preHandler: auth }, quitarPoliza)
  fastify.get('/rutas/:id/sugeridas',                    { preHandler: auth }, polizasSugeridas)
  fastify.post('/rutas/:id/sugeridas/asignar-todas',     { preHandler: auth }, asignarTodasSugeridas)
}
