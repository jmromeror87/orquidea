/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración — Formas de Pago                      ║
 * ║  Archivo         : formasPago.controller.js                            ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

export async function listar(req, reply) {
  const { todas = '' } = req.query
  const where = todas === '1' ? '' : 'WHERE fp.activo'
  const res = await pool.query(`
    SELECT fp.*, cp.nombre AS cuenta_contable_nombre
    FROM formas_pago fp
    LEFT JOIN contabilidad_puc cp ON cp.codigo = fp.cuenta_contable_codigo
    ${where} ORDER BY fp.orden, fp.nombre`)
  return reply.send({ data: res.rows })
}

export async function crear(req, reply) {
  const { codigo, nombre, icono = '💳', icono_url = null, requiere_referencia = false,
          requiere_soporte = false, orden = 99, cuenta_contable_codigo = null } = req.body

  if (!codigo || !nombre)
    return reply.code(400).send({ error: 'codigo y nombre son obligatorios' })

  const res = await pool.query(`
    INSERT INTO formas_pago (codigo, nombre, icono, icono_url, requiere_referencia, requiere_soporte, orden, cuenta_contable_codigo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [codigo.toLowerCase().replace(/\s+/g,'_'), nombre, icono, icono_url,
     requiere_referencia, requiere_soporte, orden, cuenta_contable_codigo || null]
  )
  return reply.code(201).send({ data: res.rows[0] })
}

export async function actualizar(req, reply) {
  const { id } = req.params
  const { nombre, icono, icono_url, requiere_referencia, requiere_soporte, orden, cuenta_contable_codigo } = req.body

  // icono_url y cuenta_contable_codigo se tratan aparte de COALESCE: el
  // frontend necesita poder "Quitar logo" o desvincular la cuenta mandando
  // '' explícitamente, y con COALESCE normal ese '' se descartaría y el
  // valor anterior nunca se borraría. Si el campo no viene en el body
  // (undefined), se conserva el actual.
  const res = await pool.query(`
    UPDATE formas_pago SET
      nombre                 = COALESCE($1, nombre),
      icono                  = COALESCE($2, icono),
      icono_url              = CASE WHEN $3::boolean THEN $4 ELSE icono_url END,
      requiere_referencia    = COALESCE($5, requiere_referencia),
      requiere_soporte       = COALESCE($6, requiere_soporte),
      orden                  = COALESCE($7, orden),
      cuenta_contable_codigo = CASE WHEN $8::boolean THEN $9 ELSE cuenta_contable_codigo END
    WHERE id = $10 RETURNING *`,
    [nombre, icono, icono_url !== undefined, icono_url || null, requiere_referencia, requiere_soporte, orden,
     cuenta_contable_codigo !== undefined, cuenta_contable_codigo || null, id]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Forma de pago no encontrada' })
  return reply.send({ data: res.rows[0] })
}

export async function toggleActivo(req, reply) {
  const { id } = req.params
  const res = await pool.query(
    `UPDATE formas_pago SET activo = NOT activo WHERE id=$1 RETURNING *`, [id]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Forma de pago no encontrada' })
  return reply.send({ data: res.rows[0] })
}
