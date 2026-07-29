/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios                                       ║
 * ║  Archivo         : servicios.routes.js                             ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  listar, obtener, crear, actualizar, cambiarEstado,
  agregarTraslado, completarTraslado, stats, previewPlan, buscarCatalogo,
  salas, crearSala, actualizarSala, toggleSala,
  guardarTanatopraxia, agregarMaterialTanatopraxia, eliminarMaterialTanatopraxia,
  duracionEstimadaTanatopraxia, sugerenciaTanatopraxiaIA,
  actualizarChecklist, ordenImpresion,
  actualizarFallecido, actualizarContratante, recalcularConvenioCobertura,
  agregarItem, actualizarItem, eliminarItem,
  listarPersonal, asignarPersonal, quitarPersonal, listarOperadores, historialServicio,
  subirSoporteDocumento,
} from '../controllers/servicios.controller.js'

const auth     = [verifyToken]
const editores = [verifyToken, requireRole('superadmin','administrador','operador','asesor_comercial')]
const admins   = [verifyToken, requireRole('superadmin','administrador')]

export default async function serviciosRoutes(fastify) {
  fastify.get('/stats',                          { preHandler: auth },     stats)
  fastify.get('/operadores',                     { preHandler: auth },     listarOperadores)
  fastify.get('/catalogo',                       { preHandler: auth },     buscarCatalogo)
  fastify.get('/poliza/:poliza_id/preview-plan', { preHandler: auth },     previewPlan)
  // Salas CRUD
  fastify.get('/salas',                          { preHandler: auth },     salas)
  fastify.post('/salas',                         { preHandler: admins },   crearSala)
  fastify.put('/salas/:id',                      { preHandler: admins },   actualizarSala)
  fastify.patch('/salas/:id',                    { preHandler: admins },   toggleSala)
  // Servicios
  fastify.get('/',                               { preHandler: auth },     listar)
  fastify.get('/:id',                            { preHandler: auth },     obtener)
  fastify.get('/:id/orden-impresion',            { preHandler: auth },     ordenImpresion)
  fastify.post('/',                              { preHandler: editores }, crear)
  fastify.put('/:id',                            { preHandler: editores }, actualizar)
  fastify.patch('/:id/estado',                   { preHandler: editores }, cambiarEstado)
  fastify.post('/:id/traslados',                 { preHandler: editores }, agregarTraslado)
  fastify.patch('/:id/traslados/:trasladoId',    { preHandler: editores }, completarTraslado)
  fastify.put('/:id/tanatopraxia',               { preHandler: editores }, guardarTanatopraxia)
  fastify.post('/:id/tanatopraxia/materiales',   { preHandler: editores }, agregarMaterialTanatopraxia)
  fastify.delete('/:id/tanatopraxia/materiales/:materialId', { preHandler: editores }, eliminarMaterialTanatopraxia)
  fastify.get('/tanatopraxia/duracion-estimada',  { preHandler: auth },     duracionEstimadaTanatopraxia)
  fastify.post('/:id/tanatopraxia/sugerencia-ia', { preHandler: editores }, sugerenciaTanatopraxiaIA)
  fastify.patch('/:id/checklist',                { preHandler: editores }, actualizarChecklist)
  fastify.put('/:id/fallecido',                  { preHandler: editores }, actualizarFallecido)
  fastify.post('/:id/documentos/soporte',        { preHandler: editores }, subirSoporteDocumento)
  fastify.put('/:id/contratante',                { preHandler: editores }, actualizarContratante)
  fastify.patch('/:id/convenio/recalcular',      { preHandler: editores }, recalcularConvenioCobertura)
  fastify.post('/:id/items',                     { preHandler: editores }, agregarItem)
  fastify.put('/:id/items/:itemId',              { preHandler: editores }, actualizarItem)
  fastify.delete('/:id/items/:itemId',           { preHandler: editores }, eliminarItem)
  // Personal
  fastify.get('/:id/historial',                  { preHandler: auth },     historialServicio)
  fastify.get('/:id/personal',                   { preHandler: auth },     listarPersonal)
  fastify.post('/:id/personal',                  { preHandler: editores }, asignarPersonal)
  fastify.delete('/:id/personal/:personalId',    { preHandler: editores }, quitarPersonal)
}
