/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Notificaciones — WhatsApp / SMS (estado + historial) ║
 * ║  Archivo         : notificaciones.controller.js                         ║
 * ║  Fecha           : 2026-08-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { estadoWhatsApp, reiniciarWhatsApp, enviarWhatsApp } from '../utils/whatsapp.js'
import { consultarSaldoSMS, enviarSMS } from '../utils/sms.js'

export async function whatsappEstado(req, reply) {
  try {
    const data = await estadoWhatsApp()
    return reply.send({ data })
  } catch (e) {
    return reply.send({ data: { ready: false, estado: 'error_conexion', error: e.message } })
  }
}

export async function whatsappReiniciar(req, reply) {
  try {
    const data = await reiniciarWhatsApp()
    return reply.send({ data })
  } catch (e) {
    return reply.code(500).send({ error: e.message })
  }
}

export async function smsSaldo(req, reply) {
  try {
    const saldo = await consultarSaldoSMS()
    return reply.send({ data: { saldo } })
  } catch (e) {
    return reply.send({ data: { saldo: null, error: e.message } })
  }
}

export async function enviarManual(req, reply) {
  const { telefono, mensaje, canal = 'WHATSAPP' } = req.body
  if (!telefono || !mensaje?.trim())
    return reply.code(400).send({ error: 'telefono y mensaje son obligatorios' })

  const usuarioId = req.user.id

  if (canal === 'SMS') {
    const r = await enviarSMS({ numero: telefono, mensaje, usuarioId })
    if (!r.enviado) return reply.code(502).send({ error: r.motivo || 'No se pudo enviar el SMS' })
    return reply.send({ data: { enviado: true, canal: 'SMS' } })
  }

  const wa = await enviarWhatsApp({ telefono, mensaje, usuarioId })
  if (wa.enviado) return reply.send({ data: { enviado: true, canal: 'WHATSAPP' } })

  if (canal === 'AMBOS' || canal === 'WHATSAPP_O_SMS') {
    const sms = await enviarSMS({ numero: telefono, mensaje, usuarioId })
    if (sms.enviado) return reply.send({ data: { enviado: true, canal: 'SMS', motivoWhatsapp: wa.motivo } })
  }

  return reply.code(502).send({ error: wa.motivo || 'No se pudo enviar el mensaje' })
}

export async function listarLog(req, reply) {
  const { canal = '', page = 1, limit = 20 } = req.query
  const offset = (Math.max(1, +page) - 1) * +limit
  const cond = canal ? 'WHERE canal = $1' : ''
  const vals = canal ? [canal] : []

  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT nl.*, u.nombre AS usuario_nombre
       FROM notificaciones_log nl
       LEFT JOIN usuarios u ON u.id = nl.usuario_id
       ${cond}
       ORDER BY nl.creado_en DESC
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, +limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM notificaciones_log ${cond}`, vals),
  ])

  return reply.send({
    data: dataRes.rows,
    meta: { total: +countRes.rows[0].count, page: +page, limit: +limit },
  })
}
