/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Tipos de Documento (DIAN Colombia)                      ║
 * ║  Archivo : tiposDocumento.controller.js  |  Fecha: 2026-06-30           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

export async function listar(req, reply) {
  const { activo, aplica_para } = req.query
  const conds = []
  const vals  = []

  if (activo !== undefined) { conds.push(`activo = $${vals.length+1}`); vals.push(activo !== 'false') }
  if (aplica_para)          { conds.push(`(aplica_para = $${vals.length+1} OR aplica_para = 'AMBOS')`); vals.push(aplica_para) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT * FROM tipos_documento ${where} ORDER BY orden, sigla`, vals
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

export async function crear(req, reply) {
  const { codigo_dian, sigla, nombre, aplica_para, requiere_dv, es_extranjero, orden } = req.body
  if (!codigo_dian || !sigla || !nombre)
    return reply.code(400).send({ data:null, error:'codigo_dian, sigla y nombre son requeridos' })

  try {
    const { rows } = await pool.query(
      `INSERT INTO tipos_documento (codigo_dian, sigla, nombre, aplica_para, requiere_dv, es_extranjero, orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [codigo_dian, sigla.toUpperCase(), nombre, aplica_para||'AMBOS',
       requiere_dv||false, es_extranjero||false, orden||0]
    )
    return reply.code(201).send({ data: rows[0], error: null })
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ data:null, error:`El código DIAN '${codigo_dian}' ya existe` })
    throw e
  }
}

export async function actualizar(req, reply) {
  const { id } = req.params
  const { sigla, nombre, aplica_para, requiere_dv, es_extranjero, orden, activo } = req.body

  const { rows } = await pool.query(
    `UPDATE tipos_documento SET
       sigla         = COALESCE($2, sigla),
       nombre        = COALESCE($3, nombre),
       aplica_para   = COALESCE($4, aplica_para),
       requiere_dv   = COALESCE($5, requiere_dv),
       es_extranjero = COALESCE($6, es_extranjero),
       orden         = COALESCE($7, orden),
       activo        = COALESCE($8, activo)
     WHERE id = $1 RETURNING *`,
    [id, sigla?.toUpperCase()||null, nombre||null, aplica_para||null,
     requiere_dv??null, es_extranjero??null, orden??null, activo??null]
  )
  if (!rows.length) return reply.code(404).send({ data:null, error:'Tipo de documento no encontrado' })
  return reply.send({ data: rows[0], error: null })
}

export async function toggleActivo(req, reply) {
  const { id } = req.params
  const { rows } = await pool.query(
    `UPDATE tipos_documento SET activo = NOT activo WHERE id=$1 RETURNING *`, [id]
  )
  if (!rows.length) return reply.code(404).send({ data:null, error:'No encontrado' })
  return reply.send({ data: rows[0], error: null })
}

export async function selectTipos(req, reply) {
  const { aplica_para } = req.query
  const cond = aplica_para
    ? `WHERE activo=TRUE AND (aplica_para=$1 OR aplica_para='AMBOS')`
    : `WHERE activo=TRUE`
  const { rows } = await pool.query(
    `SELECT id, codigo_dian, sigla, nombre, requiere_dv, aplica_para
     FROM tipos_documento ${cond} ORDER BY orden, sigla`,
    aplica_para ? [aplica_para] : []
  )
  return reply.send({ data: rows, error: null })
}
