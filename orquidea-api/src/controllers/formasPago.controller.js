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
  const where = todas === '1' ? '' : 'WHERE activo'
  const res = await pool.query(`SELECT * FROM formas_pago ${where} ORDER BY orden, nombre`)
  return reply.send({ data: res.rows })
}

export async function crear(req, reply) {
  const { codigo, nombre, icono = '💳', requiere_referencia = false,
          requiere_soporte = false, orden = 99 } = req.body

  if (!codigo || !nombre)
    return reply.code(400).send({ error: 'codigo y nombre son obligatorios' })

  const res = await pool.query(`
    INSERT INTO formas_pago (codigo, nombre, icono, requiere_referencia, requiere_soporte, orden)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [codigo.toLowerCase().replace(/\s+/g,'_'), nombre, icono,
     requiere_referencia, requiere_soporte, orden]
  )
  return reply.code(201).send({ data: res.rows[0] })
}

export async function actualizar(req, reply) {
  const { id } = req.params
  const { nombre, icono, requiere_referencia, requiere_soporte, orden } = req.body

  const res = await pool.query(`
    UPDATE formas_pago SET
      nombre               = COALESCE($1, nombre),
      icono                = COALESCE($2, icono),
      requiere_referencia  = COALESCE($3, requiere_referencia),
      requiere_soporte     = COALESCE($4, requiere_soporte),
      orden                = COALESCE($5, orden)
    WHERE id = $6 RETURNING *`,
    [nombre, icono, requiere_referencia, requiere_soporte, orden, id]
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
