/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Listas de valores paramétricas (Sexo, Estado civil,  ║
 * ║                    Ocupación, Parentesco)                               ║
 * ║  Archivo         : listasValores.controller.js                          ║
 * ║  Fecha           : 2026-08-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

export const TIPOS_VALIDOS = ['SEXO', 'ESTADO_CIVIL', 'OCUPACION', 'PARENTESCO']

export async function listar(req, reply) {
  const { tipo, activo } = req.query
  const conds = []
  const vals  = []
  if (tipo)              { conds.push(`tipo = $${vals.length+1}`); vals.push(tipo.toUpperCase()) }
  if (activo !== undefined) { conds.push(`activo = $${vals.length+1}`); vals.push(activo !== 'false') }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT * FROM listas_valores ${where} ORDER BY tipo, orden, etiqueta`, vals
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

// Lista liviana para selects (solo valores activos de un tipo)
export async function select(req, reply) {
  const { tipo } = req.query
  if (!tipo || !TIPOS_VALIDOS.includes(tipo.toUpperCase()))
    return reply.code(400).send({ data:null, error:`tipo es requerido y debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` })
  const { rows } = await pool.query(
    `SELECT id, codigo, etiqueta FROM listas_valores WHERE tipo=$1 AND activo=TRUE ORDER BY orden, etiqueta`,
    [tipo.toUpperCase()]
  )
  return reply.send({ data: rows, error: null })
}

export async function crear(req, reply) {
  const { tipo, codigo, etiqueta, orden } = req.body
  if (!tipo || !TIPOS_VALIDOS.includes(tipo.toUpperCase()))
    return reply.code(400).send({ data:null, error:`tipo es requerido y debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` })
  if (!etiqueta?.trim())
    return reply.code(400).send({ data:null, error:'etiqueta es requerida' })

  const cod = (codigo?.trim() || etiqueta.trim())
  try {
    const { rows } = await pool.query(
      `INSERT INTO listas_valores (tipo, codigo, etiqueta, orden)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [tipo.toUpperCase(), cod, etiqueta.trim(), orden || 0]
    )
    return reply.code(201).send({ data: rows[0], error: null })
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ data:null, error:`Ya existe "${etiqueta}" en esta lista` })
    throw e
  }
}

export async function actualizar(req, reply) {
  const { id } = req.params
  const { etiqueta, orden, activo } = req.body
  const { rows } = await pool.query(
    `UPDATE listas_valores SET
       etiqueta = COALESCE($2, etiqueta),
       orden    = COALESCE($3, orden),
       activo   = COALESCE($4, activo)
     WHERE id = $1 RETURNING *`,
    [id, etiqueta?.trim() || null, orden ?? null, activo ?? null]
  )
  if (!rows.length) return reply.code(404).send({ data:null, error:'No encontrado' })
  return reply.send({ data: rows[0], error: null })
}

export async function toggleActivo(req, reply) {
  const { id } = req.params
  const { rows } = await pool.query(
    `UPDATE listas_valores SET activo = NOT activo WHERE id=$1 RETURNING *`, [id]
  )
  if (!rows.length) return reply.code(404).send({ data:null, error:'No encontrado' })
  return reply.send({ data: rows[0], error: null })
}
