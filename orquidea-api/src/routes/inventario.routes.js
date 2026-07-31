/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Inventario                                          ║
 * ║  Archivo         : inventario.routes.js                                ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken }  from '../middlewares/auth.middleware.js'
import { requireRole }  from '../middlewares/role.middleware.js'
import * as ctrl        from '../controllers/inventario.controller.js'

export default async function inventarioRoutes(fastify) {
  const auth   = [verifyToken]
  const admins = [verifyToken, requireRole('superadmin', 'administrador')]

  // Stats
  fastify.get('/stats',                          { preHandler: auth },   ctrl.stats)

  // Categorías
  fastify.get('/categorias',                     { preHandler: auth },   ctrl.listarCategorias)
  fastify.post('/categorias',                    { preHandler: admins }, ctrl.crearCategoria)
  fastify.put('/categorias/:id',                 { preHandler: admins }, ctrl.actualizarCategoria)
  fastify.delete('/categorias/:id',               { preHandler: admins }, ctrl.desactivarCategoria)

  // Productos
  fastify.get('/productos',                      { preHandler: auth },   ctrl.listarProductos)
  fastify.post('/productos',                     { preHandler: admins }, ctrl.crearProducto)
  fastify.put('/productos/:id',                  { preHandler: admins }, ctrl.actualizarProducto)
  fastify.get('/productos/:id',                  { preHandler: auth },   ctrl.detalleProducto)

  // Bodegas
  fastify.get('/bodegas',                        { preHandler: auth },   ctrl.listarBodegas)
  fastify.post('/bodegas',                       { preHandler: admins }, ctrl.crearBodega)
  fastify.get('/bodegas/:id/ubicaciones',        { preHandler: auth },   ctrl.listarUbicaciones)
  fastify.post('/bodegas/:id/ubicaciones',       { preHandler: admins }, ctrl.crearUbicacion)

  // Movimientos
  fastify.get('/movimientos',                    { preHandler: auth },   ctrl.listarMovimientos)
  fastify.post('/movimientos',                   { preHandler: auth },   ctrl.registrarMovimiento)

  // Órdenes de compra
  fastify.get('/ordenes-compra',                 { preHandler: auth },   ctrl.listarOC)
  fastify.post('/ordenes-compra',                { preHandler: auth },   ctrl.crearOC)
  fastify.get('/ordenes-compra/:id',             { preHandler: auth },   ctrl.detalleOC)
  fastify.patch('/ordenes-compra/:id/aprobar',   { preHandler: admins }, ctrl.aprobarOC)
  fastify.post('/ordenes-compra/:id/recibir',    { preHandler: auth },   ctrl.recibirOC)
}
