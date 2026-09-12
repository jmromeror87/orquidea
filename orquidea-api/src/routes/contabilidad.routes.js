/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Rutas: Contabilidad (catálogo de cuentas / PUC)         ║
 * ║  Archivo : contabilidad.routes.js  |  Fecha: 2026-09-10                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  arbol, select, obtener, crear, actualizar, toggleActiva, verificarOrigen, resumen,
  libroDiario, libroDiarioResumen, libroAuxiliar,
  balanceComprobacion, estadoResultados, estadoSituacion, flujoCaja,
} from '../controllers/contabilidad.controller.js'

const contadores = [verifyToken, requireRole('superadmin', 'administrador', 'contador')]

export default async function contabilidadRoutes(fastify) {
  fastify.get('/puc/resumen',    { preHandler: [verifyToken] }, resumen)
  fastify.get('/puc/select',     { preHandler: [verifyToken] }, select)
  fastify.get('/puc',            { preHandler: [verifyToken] }, arbol)
  fastify.get('/puc/:codigo',    { preHandler: [verifyToken] }, obtener)
  fastify.post('/puc',           { preHandler: contadores    }, crear)
  fastify.put('/puc/:codigo',    { preHandler: contadores    }, actualizar)
  fastify.patch('/puc/:codigo/toggle',   { preHandler: contadores }, toggleActiva)
  fastify.patch('/puc/:codigo/origen',   { preHandler: contadores }, verificarOrigen)

  fastify.get('/libro-diario',         { preHandler: contadores }, libroDiario)
  fastify.get('/libro-diario/resumen', { preHandler: contadores }, libroDiarioResumen)
  fastify.get('/libro-auxiliar',       { preHandler: contadores }, libroAuxiliar)

  fastify.get('/reportes/balance-comprobacion', { preHandler: contadores }, balanceComprobacion)
  fastify.get('/reportes/estado-resultados',    { preHandler: contadores }, estadoResultados)
  fastify.get('/reportes/estado-situacion',     { preHandler: contadores }, estadoSituacion)
  fastify.get('/reportes/flujo-caja',           { preHandler: contadores }, flujoCaja)
}
