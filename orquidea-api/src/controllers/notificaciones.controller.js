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
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pipeline } from 'stream/promises'
import { estadoWhatsApp, reiniciarWhatsApp, enviarWhatsApp, enviarWhatsAppDocumento } from '../utils/whatsapp.js'
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

// POST /api/notificaciones/whatsapp-documento (multipart: archivo PDF + telefono + mensaje)
// Envía un PDF (ej. el recibo de un cobro) al WhatsApp del cliente. Si el
// WhatsApp del sistema no está conectado responde 503 y la pantalla ofrece
// compartirlo desde el equipo.
const UUID = /^[0-9a-f-]{36}$/i
async function anotarEnvioRecibo({ poliza_id, pago_id, lote_id, telefono, canal, usuario_id }) {
  if (!UUID.test(poliza_id || '')) return null
  const r = await pool.query(`
    INSERT INTO recibos_envios (poliza_id, pago_id, lote_id, telefono, canal, usuario_id)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [poliza_id, UUID.test(pago_id || '') ? pago_id : null, UUID.test(lote_id || '') ? lote_id : null,
     String(telefono).replace(/\D/g, '').slice(0, 20), canal, usuario_id])
  return r.rows[0]
}

// POST /notificaciones/recibo-envio — el recibo se abrió en WhatsApp desde el
// equipo (WhatsApp Web o Compartir): se anota, aunque sin confirmación de entrega.
export async function registrarEnvioRecibo(req, reply) {
  const { poliza_id, pago_id, lote_id, telefono, canal } = req.body || {}
  if (!['WHATSAPP_WEB', 'COMPARTIR'].includes(canal)) return reply.code(400).send({ error: 'Canal no válido' })
  if (String(telefono || '').replace(/\D/g, '').length < 10) return reply.code(400).send({ error: 'Número de WhatsApp no válido' })
  const row = await anotarEnvioRecibo({ poliza_id, pago_id, lote_id, telefono, canal, usuario_id: req.user.id })
  if (!row) return reply.code(400).send({ error: 'Póliza no válida' })
  return reply.send({ data: row })
}

export async function enviarDocumentoWhatsApp(req, reply) {
  const partes = { }
  let ruta = null, nombre = 'documento.pdf'
  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'file') {
        nombre = String(parte.filename || nombre).replace(/[^\w.\- ]+/g, '_')
        if (!/\.pdf$/i.test(nombre)) return reply.code(400).send({ error: 'Solo se pueden enviar archivos PDF' })
        ruta = path.join(os.tmpdir(), `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`)
        await pipeline(parte.file, fs.createWriteStream(ruta))
      } else partes[parte.fieldname] = parte.value
    }
    const telefono = String(partes.telefono || '').replace(/\D/g, '')
    if (telefono.length < 10) return reply.code(400).send({ error: 'Número de WhatsApp no válido' })
    if (!ruta) return reply.code(400).send({ error: 'No se recibió el PDF' })
    const r = await enviarWhatsAppDocumento({ telefono, mensaje: partes.mensaje || '', archivo_path: ruta, nombre_archivo: nombre, usuarioId: req.user.id })
    if (!r.enviado) return reply.code(503).send({ error: 'El WhatsApp del sistema no está conectado', motivo: r.motivo })
    // Si es un recibo de póliza, queda anotado que se le entregó al cliente
    if (partes.poliza_id) await anotarEnvioRecibo({ ...partes, telefono, canal: 'SISTEMA', usuario_id: req.user.id })
    return reply.send({ ok: true })
  } finally {
    // El servicio ya leyó el archivo al responder; se borra para no acumular
    if (ruta) setTimeout(() => fs.unlink(ruta, () => {}), 60_000)
  }
}
