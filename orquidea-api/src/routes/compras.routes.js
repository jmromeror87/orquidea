/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Compras                                             ║
 * ║  Archivo         : compras.routes.js                                   ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import * as ctrl       from '../controllers/compras.controller.js'

export default async function comprasRoutes(fastify) {
  const auth   = [verifyToken]
  const admins = [verifyToken, requireRole('superadmin', 'administrador')]

  // Stats
  fastify.get('/stats', { preHandler: auth }, ctrl.stats)

  // Solicitudes
  fastify.get('/solicitudes',                      { preHandler: auth   }, ctrl.listarSolicitudes)
  fastify.post('/solicitudes',                     { preHandler: auth   }, ctrl.crearSolicitud)
  fastify.get('/solicitudes/:id',                  { preHandler: auth   }, ctrl.detalleSolicitud)
  fastify.patch('/solicitudes/:id/aprobar',        { preHandler: admins }, ctrl.aprobarSolicitud)
  fastify.patch('/solicitudes/:id/rechazar',       { preHandler: admins }, ctrl.rechazarSolicitud)
  fastify.post('/solicitudes/:id/convertir',       { preHandler: admins }, ctrl.convertirAOrden)

  // Proveedores
  fastify.get('/proveedores',                      { preHandler: auth   }, ctrl.listarProveedores)
  fastify.post('/proveedores',                     { preHandler: admins }, ctrl.crearProveedor)
  fastify.put('/proveedores/:id',                  { preHandler: admins }, ctrl.actualizarProveedor)
  fastify.get('/proveedores/:id',                  { preHandler: auth   }, ctrl.detalleProveedor)
  fastify.post('/proveedores/:id/calificar',       { preHandler: auth   }, ctrl.calificarProveedor)

  // Órdenes de compra
  fastify.get('/ordenes',                          { preHandler: auth   }, ctrl.listarOC)
  fastify.post('/ordenes',                         { preHandler: admins }, ctrl.crearOC)
  fastify.get('/ordenes/:id',                      { preHandler: auth   }, ctrl.detalleOC)
  fastify.patch('/ordenes/:id/enviar',             { preHandler: admins }, ctrl.enviarOC)
  fastify.patch('/ordenes/:id/aprobar',            { preHandler: admins }, ctrl.aprobarOC)
  fastify.patch('/ordenes/:id/cancelar',           { preHandler: admins }, ctrl.cancelarOC)

  // Recepciones
  fastify.get('/recepciones',                      { preHandler: auth   }, ctrl.listarRecepciones)
  fastify.post('/recepciones',                     { preHandler: auth   }, ctrl.crearRecepcion)
  fastify.get('/recepciones/:id',                  { preHandler: auth   }, ctrl.detalleRecepcion)

  // Cuentas por pagar
  fastify.get('/cuentas-pagar',                    { preHandler: auth   }, ctrl.listarCuentasPagar)
  fastify.post('/cuentas-pagar/:id/pagar',         { preHandler: auth   }, ctrl.registrarPago)
  fastify.get('/cuentas-pagar/:id/historial',      { preHandler: auth   }, ctrl.historialCuentaPagar)
}
