/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : SMS — envío transaccional (LabsMobile)               ║
 * ║  Archivo         : utils/sms.js                                         ║
 * ║  Fecha           : 2026-08-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { env } from '../config/env.js'

const API_BASE = 'https://api.labsmobile.com'

function auth() {
  return 'Basic ' + Buffer.from(`${env.labsmobile.user}:${env.labsmobile.token}`).toString('base64')
}

// Normaliza a formato E.164 sin '+' (ej: 573001234567), asumiendo Colombia si no trae indicativo.
function normalizarMsisdn(numero) {
  const limpio = String(numero || '').replace(/\D/g, '')
  if (!limpio) return null
  if (limpio.startsWith('57') && limpio.length === 12) return limpio
  if (limpio.length === 10) return `57${limpio}`
  return limpio
}

export async function consultarSaldoSMS() {
  const r = await fetch(`${API_BASE}/json/balance`, { headers: { Authorization: auth() } })
  const data = await r.json()
  return Number(data.credits ?? 0)
}

// mensaje: máx ~160 caracteres para 1 crédito (LabsMobile cobra por segmento GSM-7).
export async function enviarSMS({ numero, mensaje }) {
  if (!env.labsmobile.user || !env.labsmobile.token) {
    console.warn(`[sms] LabsMobile no configurado. Mensaje para ${numero}: ${mensaje}`)
    return { enviado: false, motivo: 'no_configurado' }
  }

  const msisdn = normalizarMsisdn(numero)
  if (!msisdn) return { enviado: false, motivo: 'numero_invalido' }

  const r = await fetch(`${API_BASE}/json/send`, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: mensaje,
      tpoa: env.labsmobile.remitente,
      recipient: [{ msisdn: Number(msisdn) }],
    }),
  })
  const data = await r.json()

  if (data.code !== 0) {
    console.error(`[sms] Error LabsMobile enviando a ${msisdn}:`, data)
    return { enviado: false, motivo: data.message || 'error_api', data }
  }
  return { enviado: true, subid: data.subid }
}
