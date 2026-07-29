/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Solicitudes (CRM de leads de la landing)            ║
 * ║  Archivo         : leads.controller.js                                 ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

// ── Listar solicitudes (panel interno, estilo CRM) ─────────────────────────
export async function listar(req, reply) {
  const { estado = '' } = req.query
  const { rows } = await pool.query(`
    SELECT l.*, u.nombre AS asesor_nombre
    FROM leads_web l
    LEFT JOIN usuarios u ON u.id = l.asesor_id
    WHERE ($1 = '' OR l.estado = $1)
    ORDER BY l.creado_en DESC
  `, [estado])
  return reply.send({ data: rows })
}

// ── Conteo de nuevas (para la campanita de notificaciones) ─────────────────
export async function contarNuevas(req, reply) {
  const { rows } = await pool.query(`SELECT COUNT(*) AS total FROM leads_web WHERE estado = 'NUEVO'`)
  return reply.send({ total: Number(rows[0].total) })
}

// ── Actualizar estado / asesor / notas ──────────────────────────────────────
export async function actualizar(req, reply) {
  const { id } = req.params
  const { estado, asesor_id, notas } = req.body

  const { rows } = await pool.query(`
    UPDATE leads_web SET
      estado = COALESCE($1, estado),
      asesor_id = COALESCE($2, asesor_id),
      notas = COALESCE($3, notas),
      atendido = CASE WHEN COALESCE($1, estado) IN ('CONTACTADO','EN_NEGOCIACION','CONVERTIDO') THEN true ELSE atendido END,
      actualizado_en = NOW()
    WHERE id = $4
    RETURNING *
  `, [estado || null, asesor_id || null, notas ?? null, id])

  if (!rows.length) return reply.code(404).send({ error: 'Solicitud no encontrada' })
  return reply.send({ data: rows[0] })
}

// ── Eliminar (descartes definitivos / spam) ─────────────────────────────────
export async function eliminar(req, reply) {
  const { id } = req.params
  await pool.query('DELETE FROM leads_web WHERE id = $1', [id])
  return reply.send({ ok: true })
}
