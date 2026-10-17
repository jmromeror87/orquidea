/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — registrar pagos por periodo / días         ║
 * ║  Archivo         : pagosPoliza.service.js                               ║
 * ║  Versión         : v1.1.0                                               ║
 * ║  Fecha           : 2026-10-16                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Único lugar donde se registra dinero en cuotas de póliza (Cartera, Recaudo,
 * pago en línea). El reparto lo hace planDePago (utils/periodosPoliza.js, el
 * mismo que usa la vista previa de la pantalla):
 *   1. completa lo que falte del periodo pendiente que tenía un abono,
 *   2. periodos completos,
 *   3. el sobrante queda como abono con días de cobertura proporcionales.
 * pago_hasta = hasta qué día queda cubierta la póliza (incluye esos días).
 */
import { contabilizarEvento } from './contabilidad.service.js'
import { iso, planDePago, diasQueCubre } from '../utils/periodosPoliza.js'

// Qué periodos están completos y cuánto llevan abonado los incompletos
export async function estadoPagos(client, pol) {
  const { rows } = await client.query(`
    SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-DD') AS ini,
           BOOL_OR(NOT parcial) AS tiene_completa,
           COALESCE(SUM(monto) FILTER (WHERE parcial), 0) AS abonado
    FROM pagos_poliza
    WHERE poliza_id = $1 AND tipo = 'CUOTA' AND NOT anulado
    GROUP BY 1`, [pol.id])
  const cuota = Number(pol.valor_cuota)
  const completos = new Set(), abonado = new Map()
  for (const r of rows) {
    if (r.tiene_completa || Number(r.abonado) >= cuota - 0.5) completos.add(r.ini)
    else abonado.set(r.ini, Number(r.abonado))
  }
  return { completos, abonado }
}

export async function calcularPlan(client, pol, modo) {
  return planDePago(pol, Number(pol.valor_cuota), await estadoPagos(client, pol), modo)
}

/**
 * Inserta las filas del plan, avanza pago_hasta, recalcula mora/estado y
 * contabiliza. `formaContable` permite contabilizar con una forma distinta a
 * la guardada (pago en línea: se guarda 'pse_online', se contabiliza 'pse').
 */
export async function registrarPlan(client, pol, plan, {
  metodo_pago = 'efectivo', referencia = null, usuario_id, cobrador_id = null, notas = null,
  descuento = 0, recargo_mora = 0, formaContable = null, concepto = null,
}) {
  if (!plan.items.length) throw Object.assign(new Error('No hay periodos pendientes para aplicar este pago'), { httpCode: 400 })
  const cuota = Number(pol.valor_cuota)
  const filas = []
  for (let i = 0; i < plan.items.length; i++) {
    const it = plan.items[i]
    const esUltimo = i === plan.items.length - 1
    const nota = it.completa
      ? (it.abonado_antes > 0 ? `Completa el periodo ${it.periodo.etiqueta} (ya tenía abonado $${it.abonado_antes.toLocaleString('es-CO')})` : notas)
      : `Abono parcial a cuenta de la cuota (faltan $${(cuota - it.abonado_antes - it.monto).toLocaleString('es-CO')} de $${cuota.toLocaleString('es-CO')})`
    const ins = await client.query(`
      INSERT INTO pagos_poliza (poliza_id, mes_correspondiente, periodo_hasta, monto, parcial,
        descuento, recargo_mora, metodo_pago, referencia, fecha_pago, usuario_id, cobrador_id, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_DATE,$10,$11,$12)
      RETURNING *, numero_recibo`,
      [pol.id, it.periodo.iso, it.periodo.fin_iso, it.monto, it.parcial,
       esUltimo ? descuento : 0, esUltimo ? recargo_mora : 0,
       metodo_pago, referencia || null, usuario_id, cobrador_id, [nota, notas && nota !== notas ? notas : null].filter(Boolean).join(' — ') || null])
    filas.push(ins.rows[0])
  }

  // Cobertura hasta el día que alcanza el pago; mora con la regla del proceso nocturno
  await client.query(`UPDATE polizas SET pago_hasta = GREATEST(COALESCE(pago_hasta, $2::date), $2::date),
                        ultimo_pago = CURRENT_DATE, actualizado = NOW() WHERE id = $1`, [pol.id, iso(plan.cubre_hasta)])
  await recalcularMora(client, pol.id)

  const totalRecibido = plan.total - Number(descuento) + Number(recargo_mora)
  if (totalRecibido > 0) {
    await contabilizarEvento(client, {
      evento_codigo: 'PAGO_CUOTA_POLIZA',
      montos: { total: totalRecibido },
      forma_pago_codigo: formaContable || String(metodo_pago).toLowerCase(),
      concepto: concepto || `Pago póliza N.° ${pol.numero} — ${plan.items.map(i => i.periodo.etiqueta + (i.completa ? '' : ' (abono)')).join(', ')}`,
      tercero_id: pol.titular_id,
      sede_id: pol.sede_id,
      documento_origen_tipo: 'pagos_poliza',
      documento_origen_id: filas[0].id,
      usuario_id,
    })
  }
  return filas
}

// Mora y estado = meses completos sin cobertura (misma regla de fn_recalcular_mora_polizas)
export async function recalcularMora(client, polizaId) {
  await client.query(`
    WITH m AS (SELECT id, GREATEST(0,
        EXTRACT(YEAR  FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int) AS mora
      FROM polizas WHERE id = $1)
    UPDATE polizas p SET meses_mora = m.mora, saldo_mora = m.mora * p.valor_cuota,
      estado = CASE WHEN p.estado IN ('CANCELADA','EJECUTADA') THEN p.estado ELSE fn_estado_poliza(m.mora) END,
      actualizado = NOW()
    FROM m WHERE p.id = m.id`, [polizaId])
}

// Respuesta común para la pantalla (recibo / toasts)
export function resumenPlan(plan, filas, cuota) {
  const completas = plan.items.filter(i => i.completa)
  const ult = plan.items[plan.items.length - 1]
  const abono = ult && !ult.completa ? ult : null
  return {
    recibo: filas[0],
    numero_recibo: filas[0]?.numero_recibo || null,
    meses_pagados: completas.length,
    meses_pagados_lista: completas.map(i => i.periodo.iso),
    periodos_pagados: completas.map(i => ({ inicio: i.periodo.iso, fin: i.periodo.fin_iso, etiqueta: i.periodo.etiqueta, monto: i.monto })),
    abono_parcial: abono ? {
      id: filas[filas.length - 1].id, monto: abono.monto, mes: abono.periodo.iso, periodo: abono.periodo.etiqueta,
      falta: Math.round((Number(cuota) - abono.abonado_antes - abono.monto) * 100) / 100,
      dias: diasQueCubre(abono.abonado_antes + abono.monto, Number(cuota), abono.periodo),
      cubre_hasta: iso(plan.cubre_hasta),
    } : null,
    total: plan.total,
    cubre_hasta: plan.cubre_hasta ? iso(plan.cubre_hasta) : null,
    pago_hasta_nuevo: plan.cubre_hasta ? iso(plan.cubre_hasta) : null,
  }
}

/**
 * Aplica un monto recibido (Recaudo). Antes usaba la función SQL
 * fn_aplicar_pago_poliza, que metía todo en una fila del mes actual, no movía
 * pago_hasta ni contabilizaba.
 */
export async function aplicarPagoPolizaPorMonto(client, { poliza_id, monto, metodo_pago = 'efectivo', usuario_id, cobrador_id = null, notas = null }) {
  const { rows } = await client.query('SELECT * FROM polizas WHERE id = $1 FOR UPDATE', [poliza_id])
  const pol = rows[0]
  if (!pol) throw Object.assign(new Error('Póliza no encontrada'), { httpCode: 404 })
  if (['CANCELADA', 'EJECUTADA'].includes(pol.estado))
    throw Object.assign(new Error(`La póliza está ${pol.estado} y no puede recibir pagos`), { httpCode: 400 })
  const plan = await calcularPlan(client, pol, { monto: Number(monto) })
  await registrarPlan(client, pol, plan, {
    metodo_pago: String(metodo_pago || 'efectivo').toLowerCase(), usuario_id, cobrador_id, notas,
  })
  return {
    periodos: plan.items.filter(i => i.completa).map(i => i.periodo),
    abono: plan.items.find(i => !i.completa) ? { periodo: plan.items.find(i => !i.completa).periodo.etiqueta, monto: plan.items.find(i => !i.completa).monto } : null,
    pago_hasta: plan.cubre_hasta ? iso(plan.cubre_hasta) : null,
  }
}
