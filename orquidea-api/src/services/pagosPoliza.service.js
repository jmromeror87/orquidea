/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — aplicar un pago por monto                  ║
 * ║  Archivo         : pagosPoliza.service.js                               ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-16                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Aplica un monto recibido a una póliza (p. ej. cobro en campo de Recaudo):
 * periodos completos desde el primero a pagar + abono parcial con lo que sobre,
 * avanza pago_hasta, recalcula mora/estado y contabiliza (PAGO_CUOTA_POLIZA).
 * Reemplaza a la función SQL fn_aplicar_pago_poliza, que metía todo el monto
 * en una sola fila del mes actual, no movía pago_hasta ni contabilizaba.
 */
import { contabilizarEvento } from './contabilidad.service.js'
import { diaAncla, primerPeriodoAPagar, listarPeriodos, siguientePeriodo } from '../utils/periodosPoliza.js'

export async function aplicarPagoPolizaPorMonto(client, { poliza_id, monto, metodo_pago = 'efectivo', usuario_id, cobrador_id = null, notas = null }) {
  const { rows } = await client.query('SELECT * FROM polizas WHERE id = $1 FOR UPDATE', [poliza_id])
  const pol = rows[0]
  if (!pol) throw Object.assign(new Error('Póliza no encontrada'), { httpCode: 404 })
  if (['CANCELADA', 'EJECUTADA'].includes(pol.estado))
    throw Object.assign(new Error(`La póliza está ${pol.estado} y no puede recibir pagos`), { httpCode: 400 })

  const metodo = String(metodo_pago || 'efectivo').toLowerCase()
  const valorCuota = Number(pol.valor_cuota)
  const total = Math.round(Number(monto) * 100) / 100
  const dia = diaAncla(pol)

  const pag = await client.query(
    `SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-DD') AS ini FROM pagos_poliza
     WHERE poliza_id=$1 AND tipo='CUOTA' AND NOT anulado`, [poliza_id])
  const pagados = new Set(pag.rows.map(r => r.ini))

  const completos = Math.floor((total + 0.005) / valorCuota)
  let sobrante = Math.round((total - completos * valorCuota) * 100) / 100
  if (sobrante < 0.5) sobrante = 0

  const periodos = listarPeriodos(primerPeriodoAPagar(pol), completos, dia, pagados)
  let primerPagoId = null
  for (const p of periodos) {
    const ins = await client.query(`
      INSERT INTO pagos_poliza (poliza_id, mes_correspondiente, periodo_hasta, monto, metodo_pago,
                                fecha_pago, usuario_id, cobrador_id, notas)
      VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7,$8) RETURNING id`,
      [poliza_id, p.iso, p.fin_iso, valorCuota, metodo, usuario_id, cobrador_id, notas])
    primerPagoId = primerPagoId || ins.rows[0].id
  }

  let abono = null
  if (sobrante > 0) {
    const desde = periodos.length ? siguientePeriodo(periodos[periodos.length - 1], dia) : primerPeriodoAPagar(pol)
    const pAbono = listarPeriodos(desde, 1, dia, pagados)[0]
    const ins = await client.query(`
      INSERT INTO pagos_poliza (poliza_id, mes_correspondiente, periodo_hasta, monto, metodo_pago,
                                fecha_pago, usuario_id, cobrador_id, notas)
      VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7,$8) RETURNING id`,
      [poliza_id, pAbono.iso, pAbono.fin_iso, sobrante, metodo, usuario_id, cobrador_id,
       `Abono parcial a cuenta de la cuota (faltan $${(valorCuota - sobrante).toLocaleString('es-CO')})${notas ? ' — ' + notas : ''}`])
    primerPagoId = primerPagoId || ins.rows[0].id
    abono = { periodo: pAbono.etiqueta, monto: sobrante }
  }

  const nuevaMora = Math.max(0, Number(pol.meses_mora) - periodos.length)
  await client.query(`
    UPDATE polizas SET
      pago_hasta  = CASE WHEN $2::date IS NULL THEN pago_hasta ELSE GREATEST(COALESCE(pago_hasta, $2::date), $2::date) END,
      ultimo_pago = CURRENT_DATE,
      meses_mora  = $3::int,
      saldo_mora  = $3::int * valor_cuota,
      estado      = CASE WHEN estado IN ('CANCELADA','EJECUTADA') THEN estado ELSE fn_estado_poliza($3::int) END,
      actualizado = NOW()
    WHERE id = $1`,
    [poliza_id, periodos.length ? periodos[periodos.length - 1].fin_iso : null, nuevaMora])

  if (total > 0 && primerPagoId) {
    await contabilizarEvento(client, {
      evento_codigo: 'PAGO_CUOTA_POLIZA',
      montos: { total },
      forma_pago_codigo: metodo,
      concepto: `Pago póliza N.° ${pol.numero} — ${[...periodos.map(p => p.etiqueta), abono && 'abono ' + abono.periodo].filter(Boolean).join(', ')}`,
      tercero_id: pol.titular_id,
      sede_id: pol.sede_id,
      documento_origen_tipo: 'pagos_poliza',
      documento_origen_id: primerPagoId,
      usuario_id,
    })
  }
  return { periodos, abono, pago_hasta: periodos.length ? periodos[periodos.length - 1].fin_iso : null }
}
