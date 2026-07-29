/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Permisos por Rol                                        ║
 * ║  Archivo : permisos.controller.js  |  Fecha: 2026-06-30                 ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

export async function obtenerMatriz(req, reply) {
  const { rows } = await pool.query(
    `SELECT rol, modulo, accion, permitido
     FROM permisos_roles
     ORDER BY rol, modulo, accion`
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

export async function actualizarPermiso(req, reply) {
  const { rol, modulo, accion, permitido } = req.body
  if (!rol || !modulo || !accion || permitido === undefined)
    return reply.code(400).send({ data:null, meta:null, error:'rol, modulo, accion y permitido son requeridos' })

  const { rows } = await pool.query(
    `INSERT INTO permisos_roles (rol, modulo, accion, permitido)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (rol, modulo, accion)
     DO UPDATE SET permitido = EXCLUDED.permitido
     RETURNING *`,
    [rol, modulo, accion, permitido]
  )
  return reply.send({ data: rows[0], meta: null, error: null })
}

// GET /api/permisos/mis-permisos — devuelve solo los permisos del usuario autenticado
export async function misPermisos(req, reply) {
  const rol = req.user?.rol
  if (!rol) return reply.code(401).send({ error: 'Sin sesión' })
  const { rows } = await pool.query(
    `SELECT modulo, accion, permitido FROM permisos_roles WHERE rol=$1 ORDER BY modulo, accion`,
    [rol]
  )
  return reply.send({ data: rows, error: null })
}

export async function resetearRol(req, reply) {
  const { rol } = req.params
  await pool.query(`DELETE FROM permisos_roles WHERE rol=$1`, [rol])
  return reply.send({ data: { mensaje:`Permisos de ${rol} reseteados` }, meta:null, error:null })
}
