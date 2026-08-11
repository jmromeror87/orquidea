/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tipos de traslado — vínculo a ítem vendible          ║
 * ║  Archivo         : tiposTraslado.controller.js                          ║
 * ║  Fecha           : 2026-08-12                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

export async function listar(req, reply) {
  const { rows } = await pool.query(`
    SELECT t.tipo, t.catalogo_id, t.costo_interno, c.nombre AS catalogo_nombre, c.precio_base AS catalogo_precio
    FROM tipos_traslado_config t
    LEFT JOIN servicios_catalogo c ON c.id = t.catalogo_id
    ORDER BY t.tipo`)
  return reply.send({ data: rows, error: null })
}

// Lista liviana para el formulario de traslados — siempre trae los 5 tipos,
// con costo interno (si se configuró) y el ítem de venta vinculado (si aplica)
export async function select(req, reply) {
  const { rows } = await pool.query(`
    SELECT t.tipo, t.catalogo_id, t.costo_interno, c.nombre AS catalogo_nombre, c.precio_base AS catalogo_precio
    FROM tipos_traslado_config t
    LEFT JOIN servicios_catalogo c ON c.id = t.catalogo_id`)
  return reply.send({ data: rows, error: null })
}

export async function actualizar(req, reply) {
  const { tipo } = req.params
  const { catalogo_id, costo_interno } = req.body
  const { rows } = await pool.query(
    `UPDATE tipos_traslado_config SET
       catalogo_id = $2, costo_interno = COALESCE($3, costo_interno), actualizado = NOW()
     WHERE tipo = $1 RETURNING *`,
    [tipo, catalogo_id || null, costo_interno ?? null]
  )
  if (!rows.length) return reply.code(404).send({ data:null, error:'Tipo de traslado no encontrado' })
  return reply.send({ data: rows[0], error: null })
}
