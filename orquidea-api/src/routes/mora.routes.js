/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Mora e Intereses                                    ║
 * ║  Archivo         : mora.routes.js                                      ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import {
  obtenerParametros,
  actualizarParametros,
  aplicarMoraAhora,
  historialIntereses,
  historialInteresesContrato,
  registrarPromesaContrato,
  resumenMora,
} from '../controllers/parametrosMora.controller.js'

const auth    = [verifyToken]
const authAdm = [verifyToken] // agregar isAdmin si existe

export default async function moraRoutes(fastify) {
  fastify.get ('/parametros',                    { preHandler: authAdm }, obtenerParametros)
  fastify.put ('/parametros',                    { preHandler: authAdm }, actualizarParametros)
  fastify.post('/aplicar-ahora',                 { preHandler: authAdm }, aplicarMoraAhora)
  fastify.get ('/intereses/:polizaId',           { preHandler: auth    }, historialIntereses)
  fastify.get ('/intereses-contrato/:contratoId', { preHandler: auth    }, historialInteresesContrato)
  fastify.post('/contratos/:contratoId/promesa', { preHandler: auth    }, registrarPromesaContrato)
  fastify.get ('/resumen',                       { preHandler: auth    }, resumenMora)
}
