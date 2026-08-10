/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : WhatsApp — proxy hacia whatsapp-service (whatsapp-web.js)║
 * ║  Archivo         : utils/whatsapp.js                                    ║
 * ║  Fecha           : 2026-08-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { env } from '../config/env.js'
import pool from '../config/database.js'

function headers() {
  const h = { 'Content-Type': 'application/json' }
  if (env.whatsapp.internalToken) h['x-internal-token'] = env.whatsapp.internalToken
  return h
}

export async function estadoWhatsApp() {
  if (!env.whatsapp.serviceUrl) return { ready: false, estado: 'no_configurado' }
  const r = await fetch(`${env.whatsapp.serviceUrl}/status`, { headers: headers() })
  return r.json()
}

export async function reiniciarWhatsApp() {
  if (!env.whatsapp.serviceUrl) return { ok: false, error: 'Servicio no configurado' }
  const r = await fetch(`${env.whatsapp.serviceUrl}/reiniciar`, { method: 'POST', headers: headers() })
  return r.json()
}

export async function enviarWhatsApp({ telefono, mensaje, usuarioId = null }) {
  const registrar = (estado, extra = {}) => pool.query(
    `INSERT INTO notificaciones_log (canal, destinatario, mensaje, estado, proveedor, referencia, error, usuario_id)
     VALUES ('WHATSAPP',$1,$2,$3,'whatsapp-web.js',$4,$5,$6)`,
    [telefono, mensaje, estado, extra.referencia || null, extra.error || null, usuarioId]
  ).catch(e => console.error('[whatsapp] no se pudo registrar en log:', e.message))

  if (!env.whatsapp.serviceUrl) {
    console.warn(`[whatsapp] Servicio no configurado. Mensaje para ${telefono}: ${mensaje}`)
    await registrar('ERROR', { error: 'Servicio no configurado' })
    return { enviado: false, motivo: 'no_configurado' }
  }

  try {
    const r = await fetch(`${env.whatsapp.serviceUrl}/send`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ telefono, mensaje }),
    })
    const data = await r.json()
    if (!data.ok) {
      await registrar('ERROR', { error: data.error || 'error_desconocido' })
      return { enviado: false, motivo: data.error }
    }
    await registrar('ENVIADO', { referencia: data.numero })
    return { enviado: true }
  } catch (e) {
    await registrar('ERROR', { error: e.message })
    return { enviado: false, motivo: e.message }
  }
}
