/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Cron — recordatorios de pago y mora (WhatsApp/SMS)   ║
 * ║  Archivo         : cron/recordatoriosPago.js                            ║
 * ║  Fecha           : 2026-08-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { enviarWhatsApp } from '../utils/whatsapp.js'
import { enviarSMS } from '../utils/sms.js'

const fmtCOP = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v || 0)
const fmtF   = f => new Date(f).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })

async function notificar(telefono, mensaje) {
  const wa = await enviarWhatsApp({ telefono, mensaje })
  if (!wa.enviado) await enviarSMS({ numero: telefono, mensaje })
}

// ── Recordatorio: cuota vence en 3 días ─────────────────────────────────────
async function recordarProximoVencimiento() {
  const { rows } = await pool.query(`
    SELECT p.id, p.numero, p.valor_cuota, p.pago_hasta,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre, t.telefono
    FROM polizas p
    JOIN terceros t ON t.id = p.titular_id
    WHERE p.estado = 'VIGENTE'
      AND p.pago_hasta = CURRENT_DATE + INTERVAL '3 days'
      AND t.telefono IS NOT NULL AND t.telefono != ''
  `)

  let enviados = 0
  for (const p of rows) {
    const mensaje =
      `Hola ${p.titular_nombre}, tu cuota de la póliza N° ${p.numero} por ${fmtCOP(p.valor_cuota)} ` +
      `vence el ${fmtF(p.pago_hasta)}. Realiza tu pago a tiempo para evitar mora. ` +
      `— Funeraria San José de Ábrego`
    await notificar(p.telefono, mensaje)
    enviados++
  }
  return enviados
}

// ── Recordatorio: póliza en mora (1 vez por mes, no diario) ────────────────
async function recordarMora() {
  const { rows } = await pool.query(`
    SELECT p.id, p.numero, p.meses_mora, p.saldo_mora,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre, t.telefono
    FROM polizas p
    JOIN terceros t ON t.id = p.titular_id
    WHERE p.estado = 'VIGENTE'
      AND p.meses_mora >= 1
      AND t.telefono IS NOT NULL AND t.telefono != ''
      AND NOT EXISTS (
        SELECT 1 FROM notificaciones_log nl
        WHERE nl.referencia = 'MORA-' || p.id
          AND nl.creado_en >= date_trunc('month', CURRENT_DATE)
      )
  `)

  let enviados = 0
  for (const p of rows) {
    const mensaje =
      `Hola ${p.titular_nombre}, tu póliza N° ${p.numero} presenta ${p.meses_mora} mes(es) en mora ` +
      `(saldo pendiente ${fmtCOP(p.saldo_mora)}). Ponte al día para evitar la cancelación de tu cobertura. ` +
      `— Funeraria San José de Ábrego`
    await notificar(p.telefono, mensaje)
    // Marca de deduplicación mensual (independiente del resultado real de envío arriba)
    await pool.query(
      `INSERT INTO notificaciones_log (canal, destinatario, mensaje, estado, proveedor, referencia)
       VALUES ('WHATSAPP',$1,$2,'ENVIADO','recordatorio_mora','MORA-'||$3::text)`,
      [p.telefono, mensaje, p.id]
    ).catch(() => {})
    enviados++
  }
  return enviados
}

export async function ejecutarRecordatoriosPago() {
  try {
    const n1 = await recordarProximoVencimiento()
    const n2 = await recordarMora()
    console.log(`[CRON] Recordatorios de pago: ${n1} próximos a vencer, ${n2} en mora — ${new Date().toISOString()}`)
  } catch (e) {
    console.error('[CRON] Error en recordatorios de pago:', e.message)
  }
}
