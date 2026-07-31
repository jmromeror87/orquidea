/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — Rutas                                      ║
 * ║  Archivo         : polizas.routes.js                                    ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  stats, listar, obtener, crear, actualizar, cancelar, reactivar, historialCancelaciones,
  registrarPago, agregarBeneficiario, quitarBeneficiario, cobrarAfiliacion,
  verificarElegibilidad, ejecutar, planes, crearPlan, actualizarPlan, desactivarPlan,
  buscar, beneficiarios, transferirTitular, historialTransferencias,
} from '../controllers/polizas.controller.js'

const auth     = [verifyToken]
const editores = [verifyToken, requireRole('superadmin','administrador','operador','asesor_comercial')]
const admins   = [verifyToken, requireRole('superadmin','administrador')]

export default async function polizasRoutes(fastify) {
  // Planes (catálogo dinámico)
  fastify.get('/planes',                       { preHandler: auth },     planes)
  fastify.post('/planes',                      { preHandler: admins },   crearPlan)
  fastify.put('/planes/:id',                   { preHandler: admins },   actualizarPlan)
  fastify.delete('/planes/:id',                { preHandler: admins },   desactivarPlan)

  // Pólizas
  fastify.get('/stats',                        { preHandler: auth },     stats)
  fastify.get('/buscar',                       { preHandler: auth },     buscar)
  fastify.get('/',                             { preHandler: auth },     listar)
  fastify.get('/:id',                          { preHandler: auth },     obtener)
  fastify.get('/:id/elegibilidad',             { preHandler: auth },     verificarElegibilidad)
  fastify.post('/',                            { preHandler: editores }, crear)
  fastify.put('/:id',                          { preHandler: editores }, actualizar)
  fastify.delete('/:id',                       { preHandler: admins },   cancelar)
  fastify.patch('/:id/reactivar',              { preHandler: admins },   reactivar)
  fastify.get('/:id/cancelaciones',            { preHandler: auth },     historialCancelaciones)
  fastify.post('/:id/pagos',                   { preHandler: editores }, registrarPago)
  fastify.post('/:id/cobrar-afiliacion',       { preHandler: editores }, cobrarAfiliacion)
  fastify.get('/:id/beneficiarios',            { preHandler: auth },     beneficiarios)
  fastify.post('/:id/beneficiarios',           { preHandler: editores }, agregarBeneficiario)
  fastify.delete('/:id/beneficiarios/:benId',  { preHandler: editores }, quitarBeneficiario)
  fastify.post('/:id/ejecutar',                { preHandler: editores }, ejecutar)
  fastify.patch('/:id/titular',                { preHandler: admins },   transferirTitular)
  fastify.get('/:id/transferencias',           { preHandler: auth },     historialTransferencias)
}
