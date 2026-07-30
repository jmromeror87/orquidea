/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pagos en línea (Wompi) — pólizas y contratos         ║
 * ║  Archivo         : controllers/pagosOnline.controller.js                ║
 * ║  Fecha           : 2026-07-30                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { wompiConfigurado, construirUrlCheckout, verificarFirmaEvento } from '../utils/wompi.js'

const SYSTEM_EMAIL = 'pagos.online@sistema.local'
let systemUserId = null
async function idUsuarioSistema() {
  if (systemUserId) return systemUserId
  const { rows } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [SYSTEM_EMAIL])
  systemUserId = rows[0]?.id || null
  return systemUserId
}

// ── Rate limit simple (mismo patrón que consultar-estado) ──────────────────
const intentos = new Map()
const LIMITE = 10
const VENTANA_MS = 10 * 60 * 1000
function limitado(ip) {
  const ahora = Date.now()
  const reg = intentos.get(ip)
  if (!reg || ahora > reg.resetAt) { intentos.set(ip, { count: 1, resetAt: ahora + VENTANA_MS }); return false }
  reg.count++
  return reg.count > LIMITE
}

// ── 1. Iniciar pago: valida titular + saldo, crea referencia y URL de checkout ─
export async function iniciarPago(req, reply) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
  if (limitado(ip)) return reply.code(429).send({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' })

  if (!wompiConfigurado()) {
    return reply.code(503).send({ error: 'Los pagos en línea aún no están habilitados. Intenta más tarde o contáctanos.' })
  }

  const { numero_documento, numero, tipo = 'POLIZA' } = req.body || {}
  if (!numero_documento || !numero) {
    return reply.code(400).send({ error: 'Documento y número son requeridos' })
  }

  const esPoliza = tipo === 'POLIZA'
  const tabla = esPoliza ? 'polizas' : 'contratos'
  const fkTitular = esPoliza ? 'titular_id' : 'contratante_id'

  const { rows } = await pool.query(`
    SELECT e.id, e.saldo_mora, e.estado, t.nombres, t.apellidos, t.razon_social, t.email
    FROM ${tabla} e
    JOIN terceros t ON t.id = e.${fkTitular}
    WHERE t.numero_documento = $1 AND e.numero::TEXT = $2
    LIMIT 1
  `, [numero_documento, String(numero)])

  if (!rows.length) return reply.code(404).send({ error: `No encontramos ${esPoliza ? 'una póliza' : 'un contrato'} con esos datos` })
  const entidad = rows[0]

  const saldo = Number(entidad.saldo_mora || 0)
  if (saldo <= 0) return reply.code(400).send({ error: 'No tienes saldo pendiente por pagar.' })
  if (['CANCELADA', 'EJECUTADA'].includes(entidad.estado)) {
    return reply.code(400).send({ error: 'Este registro no admite pagos en su estado actual.' })
  }

  const referencia = `ORQ-${entidad.id.slice(0, 8)}-${Date.now()}`
  const montoEnCentavos = Math.round(saldo * 100)
  const nombreCliente = entidad.razon_social || `${entidad.nombres || ''} ${entidad.apellidos || ''}`.trim()

  await pool.query(`
    INSERT INTO pagos_online (tipo, entidad_id, referencia, monto, numero_documento)
    VALUES ($1,$2,$3,$4,$5)
  `, [esPoliza ? 'poliza' : 'contrato', entidad.id, referencia, saldo, numero_documento])

  const redirectUrl = `${req.headers.origin || ''}/consultar?ref=${referencia}` || undefined

  const checkoutUrl = construirUrlCheckout({
    referencia,
    montoEnCentavos,
    redirectUrl: redirectUrl || 'https://funerariasanjoseabrego.com/consultar',
    nombreCliente,
    emailCliente: entidad.email || undefined,
  })

  return reply.send({ data: { referencia, monto: saldo, checkoutUrl } })
}

// ── 2. Consultar estado de una referencia (para la landing tras el redirect) ─
export async function estadoPago(req, reply) {
  const { referencia } = req.params
  const { rows } = await pool.query(
    `SELECT referencia, estado, monto, tipo FROM pagos_online WHERE referencia = $1`,
    [referencia]
  )
  if (!rows.length) return reply.code(404).send({ error: 'Referencia no encontrada' })
  return reply.send({ data: rows[0] })
}

// ── 3. Webhook de Wompi — aplica el pago cuando la transacción es APPROVED ──
export async function webhookWompi(req, reply) {
  // Siempre responder 200 rápido salvo firma inválida — Wompi reintenta si no.
  if (!verificarFirmaEvento(req.body)) {
    req.log.warn('Webhook Wompi con firma inválida')
    return reply.code(400).send({ error: 'Firma inválida' })
  }

  const tx = req.body?.data?.transaction
  if (!tx?.reference) return reply.send({ ok: true })

  const { rows } = await pool.query('SELECT * FROM pagos_online WHERE referencia = $1', [tx.reference])
  const registro = rows[0]
  if (!registro) return reply.send({ ok: true }) // referencia desconocida, nada que hacer
  if (registro.estado !== 'pendiente') return reply.send({ ok: true }) // ya procesado (idempotencia)

  if (tx.status === 'APPROVED') {
    try {
      await aplicarPagoOnline(registro, tx)
      await pool.query(
        `UPDATE pagos_online SET estado='aprobado', wompi_transaccion_id=$1, wompi_metodo=$2, procesado_en=NOW() WHERE id=$3`,
        [tx.id, tx.payment_method_type || null, registro.id]
      )
    } catch (err) {
      req.log.error({ err }, 'Error aplicando pago online aprobado')
    }
  } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(tx.status)) {
    await pool.query(
      `UPDATE pagos_online SET estado='rechazado', wompi_transaccion_id=$1, procesado_en=NOW() WHERE id=$2`,
      [tx.id, registro.id]
    )
  }

  return reply.send({ ok: true })
}

// ── Aplica el pago a la póliza o contrato — cubre exactamente los meses en mora ─
async function aplicarPagoOnline(registro, tx) {
  const usuario_id = await idUsuarioSistema()
  const referencia = `WOMPI-${tx.id}`
  const notas = 'Pago en línea (Wompi) desde la página web'

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (registro.tipo === 'poliza') {
      const { rows } = await client.query('SELECT * FROM polizas WHERE id = $1 FOR UPDATE', [registro.entidad_id])
      const pol = rows[0]
      if (!pol) throw new Error('Póliza no encontrada al aplicar pago online')
      const valorCuota = Number(pol.valor_cuota)
      const mesesAPagar = Math.max(1, Math.round(Number(registro.monto) / valorCuota))

      const yaPagados = await client.query(
        `SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-01') AS mes FROM pagos_poliza WHERE poliza_id=$1`,
        [registro.entidad_id]
      )
      const setPagados = new Set(yaPagados.rows.map(r => r.mes))

      const cursor = new Date(pol.pago_hasta || pol.fecha_inicio); cursor.setDate(1)
      const hoyMes = new Date(); hoyMes.setDate(1)
      if (cursor <= hoyMes) cursor.setFullYear(hoyMes.getFullYear(), hoyMes.getMonth(), 1)

      const meses = []
      while (meses.length < mesesAPagar) {
        const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`
        if (!setPagados.has(iso)) meses.push(iso)
        cursor.setMonth(cursor.getMonth() + 1)
      }

      for (const mes of meses) {
        await client.query(`
          INSERT INTO pagos_poliza (poliza_id, mes_correspondiente, periodo_hasta, monto, metodo_pago, referencia, fecha_pago, usuario_id, notas)
          VALUES ($1,$2,$2,$3,'pse_online',$4,CURRENT_DATE,$5,$6)
        `, [registro.entidad_id, mes, valorCuota, referencia, usuario_id, notas])
      }

      const nuevaMora = Math.max(0, Number(pol.meses_mora) - meses.length)
      const nuevoPagoHasta = new Date(meses[meses.length - 1])
      nuevoPagoHasta.setMonth(nuevoPagoHasta.getMonth() + 1)
      nuevoPagoHasta.setDate(0)

      await client.query(`
        UPDATE polizas SET
          pago_hasta = GREATEST(COALESCE(pago_hasta, $1::date), $1::date),
          ultimo_pago = CURRENT_DATE,
          meses_mora = $2,
          saldo_mora = $2 * valor_cuota,
          estado = CASE WHEN estado IN ('CANCELADA','EJECUTADA') THEN estado ELSE fn_estado_poliza($2::INT) END,
          actualizado = NOW()
        WHERE id = $3
      `, [
        `${nuevoPagoHasta.getFullYear()}-${String(nuevoPagoHasta.getMonth() + 1).padStart(2, '0')}-${String(nuevoPagoHasta.getDate()).padStart(2, '0')}`,
        nuevaMora,
        registro.entidad_id,
      ])
    } else {
      const { rows } = await client.query('SELECT * FROM contratos WHERE id = $1 FOR UPDATE', [registro.entidad_id])
      const cont = rows[0]
      if (!cont) throw new Error('Contrato no encontrado al aplicar pago online')
      const valorCuota = Number(cont.valor_cuota)
      const mesesAPagar = Math.max(1, Math.round(Number(registro.monto) / valorCuota))

      const yaPagados = await client.query(
        `SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-01') AS mes FROM pagos_contrato WHERE contrato_id=$1`,
        [registro.entidad_id]
      )
      const setPagados = new Set(yaPagados.rows.map(r => r.mes))

      const cursor = new Date(cont.pago_hasta || cont.fecha_inicio); cursor.setDate(1)
      const hoyMes = new Date(); hoyMes.setDate(1)
      if (cursor <= hoyMes) cursor.setFullYear(hoyMes.getFullYear(), hoyMes.getMonth(), 1)

      const meses = []
      while (meses.length < mesesAPagar) {
        const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`
        if (!setPagados.has(iso)) meses.push(iso)
        cursor.setMonth(cursor.getMonth() + 1)
      }

      for (const mes of meses) {
        await client.query(`
          INSERT INTO pagos_contrato (contrato_id, mes_correspondiente, periodo_hasta, monto, metodo_pago, referencia, fecha_pago, usuario_id, notas)
          VALUES ($1,$2,$2,$3,'pse_online',$4,CURRENT_DATE,$5,$6)
        `, [registro.entidad_id, mes, valorCuota, referencia, usuario_id, notas])
      }

      const nuevaMora = Math.max(0, Number(cont.meses_mora) - meses.length)
      const nuevoPagoHasta = new Date(meses[meses.length - 1])
      nuevoPagoHasta.setMonth(nuevoPagoHasta.getMonth() + 1)
      nuevoPagoHasta.setDate(0)
      const nuevoValorPagado = Number(cont.valor_pagado) + valorCuota * meses.length

      await client.query(`
        UPDATE contratos SET
          pago_hasta   = $1,
          valor_pagado = $2,
          meses_mora   = $3,
          saldo_mora   = $3 * valor_cuota,
          actualizado  = NOW()
        WHERE id = $4
      `, [
        `${nuevoPagoHasta.getFullYear()}-${String(nuevoPagoHasta.getMonth() + 1).padStart(2, '0')}-${String(nuevoPagoHasta.getDate()).padStart(2, '0')}`,
        nuevoValorPagado,
        nuevaMora,
        registro.entidad_id,
      ])
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
