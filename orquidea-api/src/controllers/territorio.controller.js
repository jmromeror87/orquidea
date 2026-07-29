/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo  : Territorio (Departamentos / Municipios / Zonas)              ║
 * ║  Archivo : territorio.controller.js                                     ║
 * ║  Fecha   : 2026-06-30                                                   ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

/* ─── DEPARTAMENTOS ─────────────────────────────────────────────────────── */

export async function listarDepartamentos(req, reply) {
  const { activo, q } = req.query
  const conds = ['1=1']
  const vals  = []
  if (activo !== undefined) { conds.push(`d.activo = $${vals.length+1}`); vals.push(activo === 'true') }
  if (q)                    { conds.push(`d.nombre ILIKE $${vals.length+1}`); vals.push(`%${q}%`) }

  const { rows } = await pool.query(
    `SELECT d.id, d.nombre, d.activo,
            COUNT(m.id)::int AS total_municipios
     FROM geo_departamentos d
     LEFT JOIN geo_municipios m ON m.departamento_id = d.id
     WHERE ${conds.join(' AND ')}
     GROUP BY d.id
     ORDER BY d.nombre`,
    vals
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

export async function actualizarDepartamento(req, reply) {
  const { id } = req.params
  const { nombre, activo } = req.body
  const sets = []; const vals = [id]
  if (nombre  !== undefined) { sets.push(`nombre = $${vals.length+1}`); vals.push(nombre) }
  if (activo  !== undefined) { sets.push(`activo = $${vals.length+1}`); vals.push(activo) }
  if (!sets.length) return reply.code(400).send({ data:null, meta:null, error:'Nada que actualizar' })
  const { rows } = await pool.query(
    `UPDATE geo_departamentos SET ${sets.join(',')} WHERE id=$1 RETURNING *`, vals
  )
  if (!rows.length) return reply.code(404).send({ data:null, meta:null, error:'Departamento no encontrado' })
  return reply.send({ data: rows[0], meta: null, error: null })
}

/* ─── MUNICIPIOS ─────────────────────────────────────────────────────────── */

export async function listarMunicipios(req, reply) {
  const { departamento_id, activo, q } = req.query
  const conds = ['1=1']; const vals = []
  if (departamento_id) { conds.push(`m.departamento_id = $${vals.length+1}`); vals.push(departamento_id) }
  if (activo !== undefined) { conds.push(`m.activo = $${vals.length+1}`); vals.push(activo === 'true') }
  if (q)               { conds.push(`m.nombre ILIKE $${vals.length+1}`); vals.push(`%${q}%`) }

  const { rows } = await pool.query(
    `SELECT m.id, m.departamento_id, m.nombre, m.activo,
            d.nombre AS departamento_nombre,
            COUNT(z.id)::int AS total_zonas
     FROM geo_municipios m
     JOIN geo_departamentos d ON d.id = m.departamento_id
     LEFT JOIN geo_zonas z ON z.municipio_id = m.id
     WHERE ${conds.join(' AND ')}
     GROUP BY m.id, d.nombre
     ORDER BY m.nombre`,
    vals
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

export async function crearMunicipio(req, reply) {
  const { id, departamento_id, nombre } = req.body
  if (!id || !departamento_id || !nombre)
    return reply.code(400).send({ data:null, meta:null, error:'id, departamento_id y nombre son requeridos' })
  if (!/^\d{5}$/.test(id))
    return reply.code(400).send({ data:null, meta:null, error:'El código DANE debe tener 5 dígitos' })
  const { rows } = await pool.query(
    `INSERT INTO geo_municipios (id, departamento_id, nombre)
     VALUES ($1, $2, $3) RETURNING *`,
    [id, departamento_id, nombre.trim()]
  )
  return reply.code(201).send({ data: rows[0], meta: null, error: null })
}

export async function actualizarMunicipio(req, reply) {
  const { id } = req.params
  const { nombre, activo } = req.body
  const sets = []; const vals = [id]
  if (nombre !== undefined) { sets.push(`nombre = $${vals.length+1}`); vals.push(nombre.trim()) }
  if (activo !== undefined) { sets.push(`activo = $${vals.length+1}`); vals.push(activo) }
  if (!sets.length) return reply.code(400).send({ data:null, meta:null, error:'Nada que actualizar' })
  const { rows } = await pool.query(
    `UPDATE geo_municipios SET ${sets.join(',')} WHERE id=$1 RETURNING *`, vals
  )
  if (!rows.length) return reply.code(404).send({ data:null, meta:null, error:'Municipio no encontrado' })
  return reply.send({ data: rows[0], meta: null, error: null })
}

export async function eliminarMunicipio(req, reply) {
  const { id } = req.params
  const { rowCount } = await pool.query(`DELETE FROM geo_municipios WHERE id=$1`, [id])
  if (!rowCount) return reply.code(404).send({ data:null, meta:null, error:'Municipio no encontrado' })
  return reply.send({ data: { eliminado: true }, meta: null, error: null })
}

/* ─── ZONAS (barrios / veredas / corregimientos) ─────────────────────────── */

export const TIPOS_ZONA = ['BARRIO','VEREDA','CORREGIMIENTO','SECTOR','COMUNA','INSPECCIÓN','URBANIZACIÓN']

export async function listarZonas(req, reply) {
  const { municipio_id, tipo, activo, q } = req.query
  const conds = ['1=1']; const vals = []
  if (municipio_id)         { conds.push(`z.municipio_id = $${vals.length+1}`); vals.push(municipio_id) }
  if (tipo)                 { conds.push(`z.tipo = $${vals.length+1}`); vals.push(tipo.toUpperCase()) }
  if (activo !== undefined) { conds.push(`z.activo = $${vals.length+1}`); vals.push(activo === 'true') }
  if (q)                    { conds.push(`z.nombre ILIKE $${vals.length+1}`); vals.push(`%${q}%`) }

  const { rows } = await pool.query(
    `SELECT z.*, m.nombre AS municipio_nombre, d.nombre AS departamento_nombre
     FROM geo_zonas z
     JOIN geo_municipios m ON m.id = z.municipio_id
     JOIN geo_departamentos d ON d.id = m.departamento_id
     WHERE ${conds.join(' AND ')}
     ORDER BY z.tipo, z.nombre`,
    vals
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

export async function crearZona(req, reply) {
  const { municipio_id, nombre, tipo = 'BARRIO' } = req.body
  if (!municipio_id || !nombre)
    return reply.code(400).send({ data:null, meta:null, error:'municipio_id y nombre son requeridos' })
  const tipoUp = tipo.toUpperCase()
  if (!TIPOS_ZONA.includes(tipoUp))
    return reply.code(400).send({ data:null, meta:null, error:`Tipo inválido. Válidos: ${TIPOS_ZONA.join(', ')}` })
  const { rows } = await pool.query(
    `INSERT INTO geo_zonas (municipio_id, nombre, tipo)
     VALUES ($1, $2, $3)
     ON CONFLICT (municipio_id, nombre, tipo) DO NOTHING
     RETURNING *`,
    [municipio_id, nombre.trim(), tipoUp]
  )
  if (!rows.length)
    return reply.code(409).send({ data:null, meta:null, error:'Ya existe una zona con ese nombre y tipo en este municipio' })
  return reply.code(201).send({ data: rows[0], meta: null, error: null })
}

export async function actualizarZona(req, reply) {
  const { id } = req.params
  const { nombre, tipo, activo } = req.body
  const sets = []; const vals = [id]
  if (nombre !== undefined) { sets.push(`nombre = $${vals.length+1}`); vals.push(nombre.trim()) }
  if (tipo   !== undefined) {
    const tipoUp = tipo.toUpperCase()
    if (!TIPOS_ZONA.includes(tipoUp))
      return reply.code(400).send({ data:null, meta:null, error:`Tipo inválido` })
    sets.push(`tipo = $${vals.length+1}`); vals.push(tipoUp)
  }
  if (activo !== undefined) { sets.push(`activo = $${vals.length+1}`); vals.push(activo) }
  if (!sets.length) return reply.code(400).send({ data:null, meta:null, error:'Nada que actualizar' })
  const { rows } = await pool.query(
    `UPDATE geo_zonas SET ${sets.join(',')} WHERE id=$1 RETURNING *`, vals
  )
  if (!rows.length) return reply.code(404).send({ data:null, meta:null, error:'Zona no encontrada' })
  return reply.send({ data: rows[0], meta: null, error: null })
}

export async function eliminarZona(req, reply) {
  const { id } = req.params
  const { rowCount } = await pool.query(`DELETE FROM geo_zonas WHERE id=$1`, [id])
  if (!rowCount) return reply.code(404).send({ data:null, meta:null, error:'Zona no encontrada' })
  return reply.send({ data: { eliminado: true }, meta: null, error: null })
}

/* ─── Listas ligeras para selectores en formularios ─────────────────────── */
export async function selectDepartamentos(req, reply) {
  const { rows } = await pool.query(
    `SELECT id, nombre FROM geo_departamentos WHERE activo=true ORDER BY nombre`
  )
  return reply.send({ data: rows, error: null })
}

export async function selectMunicipios(req, reply) {
  const { departamento_id } = req.query
  const cond = departamento_id ? `WHERE m.activo=true AND m.departamento_id=$1` : `WHERE m.activo=true`
  const vals = departamento_id ? [departamento_id] : []
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre, m.departamento_id, m.codigo_postal, d.nombre AS departamento_nombre
     FROM geo_municipios m JOIN geo_departamentos d ON d.id=m.departamento_id
     ${cond} ORDER BY m.nombre`,
    vals
  )
  return reply.send({ data: rows, error: null })
}

export async function selectZonas(req, reply) {
  const { municipio_id } = req.query
  const cond = municipio_id ? `WHERE activo=true AND municipio_id=$1` : `WHERE activo=true`
  const vals = municipio_id ? [municipio_id] : []
  const { rows } = await pool.query(
    `SELECT id, nombre, tipo FROM geo_zonas ${cond} ORDER BY tipo, nombre`, vals
  )
  return reply.send({ data: rows, error: null })
}
