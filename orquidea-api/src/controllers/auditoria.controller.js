/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Auditoría — bitácora de actividad y presencia        ║
 * ║  Archivo         : auditoria.controller.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { listarEnLinea } from '../services/presencia.service.js'
import { parsearNavegador } from '../services/auditoria.service.js'

export async function listarLog(req, reply) {
  const { usuario_id, modulo, accion, ip, desde, hasta, q, page = 1, limit = 30 } = req.query
  const conds = []
  const vals = []
  if (usuario_id)  { conds.push(`usuario_id = $${vals.length + 1}`); vals.push(usuario_id) }
  if (modulo)      { conds.push(`modulo = $${vals.length + 1}`); vals.push(modulo) }
  if (accion)      { conds.push(`accion = $${vals.length + 1}`); vals.push(accion) }
  if (ip?.trim())  { conds.push(`ip = $${vals.length + 1}`); vals.push(ip.trim()) }
  if (desde)       { conds.push(`creado_en >= $${vals.length + 1}`); vals.push(desde) }
  if (hasta)       { conds.push(`creado_en < ($${vals.length + 1}::date + INTERVAL '1 day')`); vals.push(hasta) }
  if (q?.trim())   { conds.push(`(usuario_nombre ILIKE $${vals.length + 1} OR descripcion ILIKE $${vals.length + 1} OR ruta ILIKE $${vals.length + 1})`); vals.push(`%${q.trim()}%`) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limitNum = Math.min(200, Math.max(1, +limit))
  const offset = (Math.max(1, +page) - 1) * limitNum

  const { rows } = await pool.query(
    `SELECT a.*, s.nombre AS sede_nombre
     FROM auditoria_log a
     LEFT JOIN sedes s ON s.id = a.sede_id
     ${where}
     ORDER BY a.creado_en DESC
     LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
    [...vals, limitNum, offset]
  )
  const { rows: totalRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM auditoria_log ${where}`, vals)

  return reply.send({
    data: rows.map(r => ({ ...r, navegador_legible: parsearNavegador(r.navegador) })),
    meta: { total: totalRows[0].total, page: +page, limit: limitNum },
  })
}

export async function enLinea(req, reply) {
  const conectados = listarEnLinea(5).map(p => ({ ...p, navegador_legible: parsearNavegador(p.navegador) }))
  return reply.send({ data: conectados })
}

export async function opcionesFiltro(req, reply) {
  const [{ rows: usuarios }, { rows: modulos }] = await Promise.all([
    pool.query(`SELECT DISTINCT usuario_id, usuario_nombre FROM auditoria_log WHERE usuario_id IS NOT NULL ORDER BY usuario_nombre`),
    pool.query(`SELECT DISTINCT modulo FROM auditoria_log WHERE modulo IS NOT NULL ORDER BY modulo`),
  ])
  return reply.send({ data: { usuarios, modulos: modulos.map(m => m.modulo) } })
}
