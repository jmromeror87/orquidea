/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Tesorería (comprobantes de ingreso/egreso)       ║
 * ║  Archivo : tesoreria.routes.js  |  Fecha: 2026-09-11                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { listar, obtener, crear, anular } from '../controllers/tesoreria.controller.js'
import * as tc from '../controllers/tesoreriaCuentas.controller.js'

const contadores = [verifyToken, requireRole('superadmin', 'administrador', 'contador')]

export default async function tesoreriaRoutes(fastify) {
  fastify.get('/comprobantes',           { preHandler: contadores }, listar)
  fastify.get('/comprobantes/:id',       { preHandler: contadores }, obtener)
  fastify.post('/comprobantes',          { preHandler: contadores }, crear)
  fastify.post('/comprobantes/:id/anular', { preHandler: contadores }, anular)

  // Cuentas de caja/bancos, movimientos (desde la contabilidad), traslados y conciliación
  fastify.get('/cuentas',                    { preHandler: contadores }, tc.listarCuentas)
  fastify.get('/cuentas/puc-disponibles',    { preHandler: contadores }, tc.pucDisponibles)
  fastify.post('/cuentas',                   { preHandler: contadores }, tc.crearCuenta)
  fastify.put('/cuentas/:id',                { preHandler: contadores }, tc.actualizarCuenta)
  fastify.get('/movimientos',                { preHandler: contadores }, tc.movimientos)
  fastify.get('/traslados',                  { preHandler: contadores }, tc.listarTraslados)
  fastify.post('/traslados',                 { preHandler: contadores }, tc.crearTraslado)
  fastify.post('/traslados/:id/anular',      { preHandler: contadores }, tc.anularTraslado)
  fastify.get('/conciliaciones',             { preHandler: contadores }, tc.listarConciliaciones)
  fastify.post('/conciliaciones',            { preHandler: contadores }, tc.crearConciliacion)
  fastify.get('/conciliaciones/:id',         { preHandler: contadores }, tc.obtenerConciliacion)
  fastify.put('/conciliaciones/:id',         { preHandler: contadores }, tc.actualizarConciliacion)
  fastify.post('/conciliaciones/:id/marcar', { preHandler: contadores }, tc.marcarConciliados)
  fastify.post('/conciliaciones/:id/cerrar', { preHandler: contadores }, tc.cerrarConciliacion)
}
