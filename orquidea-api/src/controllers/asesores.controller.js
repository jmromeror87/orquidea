/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Asesores Comerciales                             ║
 * ║  Archivo         : asesores.controller.js                          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede } from '../utils/sede.js'

// ── Listar asesores con totales de comisión ────────────────────────────────
// Las comisiones no tienen sede propia: pertenecen a un asesor (usuario_id),
// así que el alcance se resuelve por las sedes asignadas al asesor mismo
// (usuario_sedes), no por la operación que generó la comisión.

export async function listar(req, reply) {
  const { sedeIds } = resolverSede(req)
  const { rows } = await pool.query(`
    SELECT
      u.id, u.nombre, u.email, u.activo, u.porcentaje_comision,
      COUNT(c.id)                                                      AS ventas_totales,
      COALESCE(SUM(c.valor_comision), 0)                               AS comision_total,
      COALESCE(SUM(c.valor_comision) FILTER (WHERE c.estado = 'PENDIENTE'), 0) AS comision_pendiente,
      COALESCE(SUM(c.valor_comision) FILTER (WHERE c.estado = 'PAGADA'), 0)    AS comision_pagada
    FROM usuarios u
    LEFT JOIN comisiones c ON c.usuario_id = u.id AND c.estado != 'ANULADA'
    WHERE u.rol = 'asesor_comercial'
      AND ($1::uuid[] IS NULL OR EXISTS (
        SELECT 1 FROM usuario_sedes us WHERE us.usuario_id = u.id AND us.sede_id = ANY($1::uuid[])
      ))
    GROUP BY u.id
    ORDER BY u.nombre`,
    [sedeIds]
  )
  return reply.send({ data: rows })
}

// ── KPIs generales del módulo ───────────────────────────────────────────────

export async function kpis(req, reply) {
  const { sedeIds } = resolverSede(req)
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM usuarios u WHERE u.rol = 'asesor_comercial' AND u.activo
        AND ($1::uuid[] IS NULL OR EXISTS (
          SELECT 1 FROM usuario_sedes us WHERE us.usuario_id = u.id AND us.sede_id = ANY($1::uuid[])
        ))) AS asesores_activos,
      COALESCE(SUM(c.valor_comision) FILTER (WHERE c.estado = 'PENDIENTE'), 0)      AS comision_pendiente,
      COALESCE(SUM(c.valor_comision) FILTER (WHERE c.estado = 'PAGADA'), 0)         AS comision_pagada,
      COUNT(*) FILTER (WHERE c.estado != 'ANULADA')                              AS ventas_totales
    FROM comisiones c
    JOIN usuarios u ON u.id = c.usuario_id
    WHERE ($1::uuid[] IS NULL OR EXISTS (
      SELECT 1 FROM usuario_sedes us WHERE us.usuario_id = u.id AND us.sede_id = ANY($1::uuid[])
    ))`,
    [sedeIds]
  )
  return reply.send({ data: rows[0] })
}

// ── Comisiones de un asesor (detalle) ──────────────────────────────────────

export async function comisionesDeAsesor(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)

  if (sedeIds !== null) {
    const acceso = await pool.query(
      `SELECT 1 FROM usuario_sedes WHERE usuario_id = $1 AND sede_id = ANY($2::uuid[])`,
      [id, sedeIds]
    )
    if (!acceso.rows.length) return reply.code(403).send({ error: 'No tiene acceso a este asesor' })
  }

  const { rows } = await pool.query(`
    SELECT
      c.id, c.origen_tipo, c.origen_id, c.valor_base, c.porcentaje,
      c.valor_comision, c.estado, c.fecha_pago, c.creado_en,
      CASE WHEN c.origen_tipo = 'POLIZA'
           THEN (SELECT numero FROM polizas WHERE id = c.origen_id)
           ELSE (SELECT numero FROM contratos WHERE id = c.origen_id)
      END AS numero_origen
    FROM comisiones c
    WHERE c.usuario_id = $1
    ORDER BY c.creado_en DESC`,
    [id]
  )
  return reply.send({ data: rows })
}

// ── Configurar % de comisión de un asesor ──────────────────────────────────

export async function actualizarPorcentaje(req, reply) {
  const { id } = req.params
  const { porcentaje_comision } = req.body

  if (porcentaje_comision !== null && (isNaN(+porcentaje_comision) || +porcentaje_comision < 0 || +porcentaje_comision > 100)) {
    return reply.code(400).send({ error: 'El porcentaje debe estar entre 0 y 100' })
  }

  const { rows } = await pool.query(
    `UPDATE usuarios SET porcentaje_comision = $1, actualizado = NOW()
     WHERE id = $2 AND rol = 'asesor_comercial'
     RETURNING id, nombre, porcentaje_comision`,
    [porcentaje_comision === null || porcentaje_comision === '' ? null : +porcentaje_comision, id]
  )
  if (!rows[0]) return reply.code(404).send({ error: 'Asesor no encontrado' })
  return reply.send({ data: rows[0] })
}

// ── Configuración global de comisiones ─────────────────────────────────────

export async function obtenerConfig(req, reply) {
  const { rows } = await pool.query('SELECT * FROM comision_config WHERE id = 1')
  return reply.send({ data: rows[0] })
}

export async function actualizarConfig(req, reply) {
  const { porcentaje_default } = req.body
  if (porcentaje_default === undefined || isNaN(+porcentaje_default) || +porcentaje_default < 0 || +porcentaje_default > 100) {
    return reply.code(400).send({ error: 'El porcentaje debe estar entre 0 y 100' })
  }
  const { rows } = await pool.query(
    `UPDATE comision_config SET porcentaje_default = $1, actualizado = NOW() WHERE id = 1 RETURNING *`,
    [+porcentaje_default]
  )
  return reply.send({ data: rows[0] })
}

// ── Marcar comisión como pagada / anulada ──────────────────────────────────

export async function pagarComision(req, reply) {
  const { id } = req.params
  const { rows } = await pool.query(
    `UPDATE comisiones SET estado = 'PAGADA', fecha_pago = CURRENT_DATE
     WHERE id = $1 AND estado = 'PENDIENTE' RETURNING *`,
    [id]
  )
  if (!rows[0]) return reply.code(400).send({ error: 'La comisión no existe o ya fue procesada' })
  return reply.send({ data: rows[0] })
}

export async function anularComision(req, reply) {
  const { id } = req.params
  const { rows } = await pool.query(
    `UPDATE comisiones SET estado = 'ANULADA' WHERE id = $1 AND estado = 'PENDIENTE' RETURNING *`,
    [id]
  )
  if (!rows[0]) return reply.code(400).send({ error: 'La comisión no existe o ya fue procesada' })
  return reply.send({ data: rows[0] })
}
