/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Roles de personal en servicios (catálogo con costo)  ║
 * ║  Archivo         : rolesPersonal.controller.js                          ║
 * ║  Fecha           : 2026-08-11                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

export async function listar(req, reply) {
  const { activo } = req.query
  const conds = []; const vals = []
  if (activo !== undefined) { conds.push(`r.activo = $${vals.length+1}`); vals.push(activo !== 'false') }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT r.*, c.nombre AS catalogo_nombre, c.precio_base AS catalogo_precio
     FROM roles_personal_servicio r
     LEFT JOIN servicios_catalogo c ON c.id = r.catalogo_id
     ${where} ORDER BY r.orden, r.etiqueta`, vals
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

// Lista liviana para el selector de rol al asignar personal
export async function select(req, reply) {
  const { rows } = await pool.query(
    `SELECT r.id, r.codigo, r.etiqueta, r.costo_interno, r.catalogo_id,
            c.nombre AS catalogo_nombre, c.precio_base AS catalogo_precio
     FROM roles_personal_servicio r
     LEFT JOIN servicios_catalogo c ON c.id = r.catalogo_id
     WHERE r.activo=TRUE ORDER BY r.orden, r.etiqueta`
  )
  return reply.send({ data: rows, error: null })
}

export async function crear(req, reply) {
  const { etiqueta, costo_interno, catalogo_id, orden } = req.body
  if (!etiqueta?.trim())
    return reply.code(400).send({ data:null, error:'etiqueta es requerida' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO roles_personal_servicio (codigo, etiqueta, costo_interno, catalogo_id, orden)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [etiqueta.trim(), etiqueta.trim(), costo_interno || 0, catalogo_id || null, orden || 0]
    )
    return reply.code(201).send({ data: rows[0], error: null })
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ data:null, error:`Ya existe el rol "${etiqueta}"` })
    throw e
  }
}

export async function actualizar(req, reply) {
  const { id } = req.params
  const { etiqueta, costo_interno, catalogo_id, orden, activo } = req.body
  const { rows } = await pool.query(
    `UPDATE roles_personal_servicio SET
       etiqueta      = COALESCE($2, etiqueta),
       costo_interno = COALESCE($3, costo_interno),
       catalogo_id   = $4,
       orden         = COALESCE($5, orden),
       activo        = COALESCE($6, activo)
     WHERE id = $1 RETURNING *`,
    [id, etiqueta?.trim() || null, costo_interno ?? null, catalogo_id || null, orden ?? null, activo ?? null]
  )
  if (!rows.length) return reply.code(404).send({ data:null, error:'No encontrado' })
  return reply.send({ data: rows[0], error: null })
}

export async function toggleActivo(req, reply) {
  const { id } = req.params
  const { rows } = await pool.query(
    `UPDATE roles_personal_servicio SET activo = NOT activo WHERE id=$1 RETURNING *`, [id]
  )
  if (!rows.length) return reply.code(404).send({ data:null, error:'No encontrado' })
  return reply.send({ data: rows[0], error: null })
}
