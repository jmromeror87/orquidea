/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración de Empresa                             ║
 * ║  Archivo         : empresa.routes.js                                    ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken }     from '../middlewares/auth.middleware.js'
import { requireRole }     from '../middlewares/role.middleware.js'
import {
  obtenerEmpresa, actualizarEmpresa, actualizarParametros,
  subirLogoEmpresa, eliminarLogoEmpresa,
  listarSedes, crearSede, actualizarSede,
  listarServicios, crearServicio, actualizarServicio, eliminarServicio,
} from '../controllers/empresa.controller.js'

const soloAdmins = [verifyToken, requireRole('superadmin', 'administrador')]

export default async function empresaRoutes(fastify) {
  // ── Empresa ──────────────────────────────────────────
  fastify.get ('/',            { preHandler: [verifyToken] }, obtenerEmpresa)
  fastify.put ('/',            { preHandler: soloAdmins    }, actualizarEmpresa)
  fastify.put ('/parametros',  { preHandler: soloAdmins    }, actualizarParametros)
  fastify.post('/logo',        { preHandler: soloAdmins    }, subirLogoEmpresa)
  fastify.delete('/logo',      { preHandler: soloAdmins    }, eliminarLogoEmpresa)

  // ── Sedes ─────────────────────────────────────────────
  fastify.get ('/sedes',       { preHandler: [verifyToken] }, listarSedes)
  fastify.post('/sedes',       { preHandler: soloAdmins    }, crearSede)
  fastify.put ('/sedes/:id',   { preHandler: soloAdmins    }, actualizarSede)

  // ── Servicios catálogo ────────────────────────────────
  fastify.get ('/servicios',   { preHandler: [verifyToken] }, listarServicios)
  fastify.post('/servicios',   { preHandler: soloAdmins    }, crearServicio)
  fastify.put ('/servicios/:id',{ preHandler: soloAdmins   }, actualizarServicio)
  fastify.delete('/servicios/:id',{ preHandler: soloAdmins }, eliminarServicio)
}
