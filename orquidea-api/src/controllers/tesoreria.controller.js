/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — Comprobantes de Ingreso y Egreso         ║
 * ║  Archivo         : tesoreria.controller.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Vista de Tesorería sobre el mismo libro contable (comprobantes_contables /
 * asientos_contables) que ya alimentan POS, pólizas y contratos — no es un
 * módulo paralelo. "Comprobante de Ingreso" es tipo RECAUDO y "Comprobante
 * de Egreso" es tipo EGRESO; el listado muestra TODOS (automáticos del
 * sistema + manuales del asistente), y solo los manuales se pueden anular
 * desde aquí (los automáticos se anulan reversando la operación de origen).
 */
import pool from '../config/database.js'
import { crearComprobanteManual, reversarComprobante } from '../services/contabilidad.service.js'

const TIPOS = { INGRESO: 'RECAUDO', EGRESO: 'EGRESO' }

export async function listar(req, reply) {
  const { tipo, estado, desde, hasta, q, page = 1, limit = 20 } = req.query
  const conds = [`c.tipo = ANY($1::text[])`]
  const vals = [tipo && TIPOS[tipo] ? [TIPOS[tipo]] : ['RECAUDO', 'EGRESO']]

  if (estado)        { conds.push(`c.estado = $${vals.length + 1}`); vals.push(estado) }
  if (desde)         { conds.push(`c.fecha_contable >= $${vals.length + 1}`); vals.push(desde) }
  if (hasta)         { conds.push(`c.fecha_contable <= $${vals.length + 1}`); vals.push(hasta) }
  if (q?.trim())     { conds.push(`(c.numero ILIKE $${vals.length + 1} OR c.concepto ILIKE $${vals.length + 1})`); vals.push(`%${q.trim()}%`) }

  const where = `WHERE ${conds.join(' AND ')}`
  const limitNum = Math.min(100, Math.max(1, +limit))
  const offset = (Math.max(1, +page) - 1) * limitNum

  const { rows } = await pool.query(`
    SELECT c.*,
      COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')),' ',TRIM(COALESCE(t.apellidos,'')))) AS tercero_nombre,
      u.nombre AS usuario_nombre,
      (c.documento_origen_tipo = 'tesoreria_comprobantes') AS es_manual
    FROM comprobantes_contables c
    LEFT JOIN terceros t ON t.id = c.tercero_id
    LEFT JOIN usuarios u ON u.id = c.usuario_creador
    ${where}
    ORDER BY c.fecha_contable DESC, c.numero DESC
    LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}
  `, [...vals, limitNum, offset])

  const { rows: totalRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM comprobantes_contables c ${where}`, vals)
  const { rows: resumenRows } = await pool.query(`
    SELECT c.tipo, COALESCE(SUM(c.total_debe),0) AS total
    FROM comprobantes_contables c ${where} AND c.estado = 'CONTABILIZADO'
    GROUP BY c.tipo
  `, vals)

  return reply.send({
    data: rows,
    meta: {
      total: totalRows[0].total, page: +page, limit: limitNum,
      total_ingresos: +(resumenRows.find(r => r.tipo === 'RECAUDO')?.total || 0),
      total_egresos: +(resumenRows.find(r => r.tipo === 'EGRESO')?.total || 0),
    },
  })
}

export async function obtener(req, reply) {
  const { id } = req.params
  const { rows } = await pool.query(`
    SELECT c.*,
      COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')),' ',TRIM(COALESCE(t.apellidos,'')))) AS tercero_nombre,
      u.nombre AS usuario_nombre
    FROM comprobantes_contables c
    LEFT JOIN terceros t ON t.id = c.tercero_id
    LEFT JOIN usuarios u ON u.id = c.usuario_creador
    WHERE c.id = $1
  `, [id])
  if (!rows.length) return reply.code(404).send({ error: 'Comprobante no encontrado' })

  const { rows: lineas } = await pool.query(`
    SELECT a.*, p.nombre AS cuenta_nombre,
      COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')),' ',TRIM(COALESCE(t.apellidos,'')))) AS tercero_linea_nombre
    FROM asientos_contables a
    JOIN contabilidad_puc p ON p.codigo = a.cuenta_codigo
    LEFT JOIN terceros t ON t.id = a.tercero_id
    WHERE a.comprobante_id = $1 ORDER BY a.orden
  `, [id])

  return reply.send({ data: { ...rows[0], lineas } })
}

export async function crear(req, reply) {
  const { tipo, cuenta_principal_codigo, partidas, concepto, referencia, tercero_id, sede_id, fecha_contable } = req.body
  const tipoComprobante = TIPOS[tipo]
  if (!tipoComprobante) return reply.code(400).send({ error: 'tipo debe ser INGRESO o EGRESO' })
  if (!concepto?.trim()) return reply.code(400).send({ error: 'concepto es requerido' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const comprobante = await crearComprobanteManual(client, {
      tipo: tipoComprobante, cuenta_principal_codigo, partidas, concepto: concepto.trim(),
      referencia: referencia?.trim() || null,
      tercero_id: tercero_id || null, sede_id: sede_id || req.user.sede_id || null,
      usuario_id: req.user.id, fecha_contable: fecha_contable || null,
    })
    await client.query('COMMIT')
    return reply.code(201).send({ data: comprobante })
  } catch (e) {
    await client.query('ROLLBACK')
    return reply.code(e.httpCode || 500).send({ error: e.message })
  } finally {
    client.release()
  }
}

export async function anular(req, reply) {
  const { id } = req.params
  const { motivo } = req.body
  if (!motivo?.trim()) return reply.code(400).send({ error: 'El motivo de anulación es requerido' })

  const { rows } = await pool.query(`SELECT documento_origen_tipo FROM comprobantes_contables WHERE id = $1`, [id])
  if (!rows.length) return reply.code(404).send({ error: 'Comprobante no encontrado' })
  if (rows[0].documento_origen_tipo !== 'tesoreria_comprobantes') {
    return reply.code(409).send({ error: 'Este comprobante lo generó otro módulo automáticamente — anúlalo desde la operación de origen (venta, pago de póliza, etc.), no desde Tesorería.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const reversa = await reversarComprobante(client, id, { motivo: motivo.trim(), usuario_id: req.user.id })
    await client.query('COMMIT')
    return reply.send({ data: reversa })
  } catch (e) {
    await client.query('ROLLBACK')
    return reply.code(e.httpCode || 500).send({ error: e.message })
  } finally {
    client.release()
  }
}
