/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : API Pública (landing page)                          ║
 * ║  Archivo         : publico.routes.js                                   ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import * as ctrl from '../controllers/publico.controller.js'
import * as pagos from '../controllers/pagosOnline.controller.js'

// Sin verifyToken en ningún handler — este módulo es intencionalmente público.
export default async function publicoRoutes(fastify) {
  fastify.get('/planes',            ctrl.listarPlanesPublico)
  fastify.get('/servicios',         ctrl.listarServiciosPublico)
  fastify.get('/sedes',             ctrl.listarSedesPublico)
  fastify.post('/consultar-estado', ctrl.consultarEstado)
  fastify.post('/leads',            ctrl.crearLead)
  fastify.get('/memoriales',        ctrl.listarMemorialesPublico)

  fastify.post('/pagos/iniciar',            pagos.iniciarPago)
  fastify.get('/pagos/:referencia/estado',  pagos.estadoPago)
  fastify.post('/pagos/webhook',            pagos.webhookWompi)
}
