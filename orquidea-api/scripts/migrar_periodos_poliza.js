/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — conversión a periodos desde la afiliación  ║
 * ║  Archivo         : scripts/migrar_periodos_poliza.js                    ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-16                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Convierte los pagos de póliza de "mes de calendario" a "periodo desde el
 * día de afiliación" (utils/periodosPoliza.js). No cambia montos ni recibos.
 *
 *   node scripts/migrar_periodos_poliza.js            → SOLO vista previa
 *   node scripts/migrar_periodos_poliza.js --aplicar  → aplica (una transacción)
 *
 * Regla de equivalencia: el pago del mes de calendario M pasa a ser el periodo
 * que EMPIEZA en M (afiliado el 24: "Septiembre" → 24 sep – 23 oct). Una fila
 * que ya traía un día distinto de 1 (cargas del sistema anterior) se ubica en
 * el periodo que contiene esa fecha. pago_hasta sigue la misma equivalencia.
 */
import pool from '../src/config/database.js'
import {
  ymd, iso, addDias, inicioEnMes, periodoQueInicia, periodoQueContiene, cmp,
} from '../src/utils/periodosPoliza.js'

const APLICAR = process.argv.includes('--aplicar')
const esFinDeMes = f => addDias(f, 1).d === 1

function periodoDeFila(fila, dia) {
  const mes = ymd(fila.mes_correspondiente)
  const inicioP = (mes.d === 1 && dia !== 1)
    ? periodoQueInicia(inicioEnMes(mes.y, mes.m, dia), dia)   // fila de calendario → periodo que empieza en ese mes
    : periodoQueContiene(mes, dia)                              // fila con día propio → periodo que la contiene
  let fin = inicioP.fin
  const hasta = ymd(fila.periodo_hasta)
  // Filas viejas que cubrían varios meses de una vez ("02 oct → 02 dic")
  if (hasta && (Date.UTC(hasta.y, hasta.m, hasta.d) - Date.UTC(mes.y, mes.m, mes.d)) > 45 * 86400000) {
    const finRango = convertirPagoHasta(hasta, dia)
    if (cmp(finRango, fin) > 0) fin = finRango
  }
  return { inicio: inicioP.inicio, fin, etiqueta: inicioP.etiqueta }
}

function convertirPagoHasta(ph, dia) {
  if (esFinDeMes(ph)) return periodoQueInicia(inicioEnMes(ph.y, ph.m, dia), dia).fin  // "pagado todo el mes M"
  return periodoQueContiene(addDias(ph, -1), dia).fin
}

// La vista previa también corre en una base que aún no tiene la migración 102
const tieneTipo = (await pool.query(
  `SELECT 1 FROM information_schema.columns WHERE table_name='pagos_poliza' AND column_name='tipo'`)).rows.length > 0
const filtroCuota = tieneTipo ? `AND tipo = 'CUOTA'` : ''
if (APLICAR && !tieneTipo) { console.error('Primero corre las migraciones (falta la 102).'); process.exit(1) }

const pol = await pool.query(`SELECT id, numero, numero_legado, fecha_inicio, pago_hasta, dia_cobro, estado
                                FROM polizas ORDER BY numero`)
const cambios = []
let conflictos = 0

for (const p of pol.rows) {
  const dia = ymd(p.fecha_inicio).d
  const filas = await pool.query(`SELECT id, numero_recibo, mes_correspondiente, periodo_hasta, anulado
                                    FROM pagos_poliza WHERE poliza_id = $1 ${filtroCuota}
                                    ORDER BY mes_correspondiente`, [p.id])
  const nuevas = filas.rows.map(f => ({ ...f, nuevo: periodoDeFila(f, dia) }))
  const vistos = new Map(); const choques = []
  for (const f of nuevas.filter(f => !f.anulado)) {
    const k = iso(f.nuevo.inicio)
    if (vistos.has(k)) choques.push(`recibos ${vistos.get(k)} y ${f.numero_recibo} quedan en el mismo periodo ${f.nuevo.etiqueta}`)
    else vistos.set(k, f.numero_recibo)
  }
  const finMax = nuevas.filter(f => !f.anulado).reduce((m, f) => (!m || cmp(f.nuevo.fin, m) > 0) ? f.nuevo.fin : m, null)
  const phConv = p.pago_hasta ? convertirPagoHasta(ymd(p.pago_hasta), dia) : null
  const nuevoPH = [phConv, finMax].filter(Boolean).reduce((m, f) => (!m || cmp(f, m) > 0) ? f : m, null)
  if (choques.length) conflictos++
  cambios.push({ p, dia, nuevas, choques, nuevoPH })
}

// ── Vista previa ───────────────────────────────────────────────────────────
for (const { p, dia, nuevas, choques, nuevoPH } of cambios) {
  const viejoPH = p.pago_hasta ? iso(ymd(p.pago_hasta)) : '—'
  console.log(`\nPóliza ${p.numero_legado || p.numero} (interno #${p.numero}) · afiliada ${iso(ymd(p.fecha_inicio))} · día de cobro ${p.dia_cobro} → ${dia}`)
  console.log(`  pagado hasta: ${viejoPH} → ${nuevoPH ? iso(nuevoPH) : '—'}`)
  for (const f of nuevas) {
    console.log(`  recibo ${String(f.numero_recibo).padStart(6, '0')}${f.anulado ? ' (anulado)' : ''}: ${iso(ymd(f.mes_correspondiente))} → ${f.nuevo.etiqueta} (${iso(f.nuevo.inicio)} a ${iso(f.nuevo.fin)})`)
  }
  for (const c of choques) console.log(`  ⚠️  ${c} — esta póliza NO se convierte, revisar a mano`)
}
console.log(`\n${cambios.length} pólizas · ${cambios.reduce((n, c) => n + c.nuevas.length, 0)} pagos de cuota · ${conflictos} con conflicto`)

if (!APLICAR) {
  console.log('\nVista previa: no se cambió nada. Para aplicar: node scripts/migrar_periodos_poliza.js --aplicar')
  await pool.end(); process.exit(0)
}

// ── Aplicar ────────────────────────────────────────────────────────────────
const db = await pool.connect()
try {
  await db.query('BEGIN')
  // Sin el índice único mientras se mueven las filas (evita choques transitorios)
  await db.query('DROP INDEX IF EXISTS uq_pago_poliza_periodo_vigente')
  for (const { p, dia, nuevas, choques, nuevoPH } of cambios) {
    if (choques.length) continue
    for (const f of nuevas) {
      await db.query(`UPDATE pagos_poliza SET mes_correspondiente = $1, periodo_hasta = $2 WHERE id = $3`,
        [iso(f.nuevo.inicio), iso(f.nuevo.fin), f.id])
    }
    await db.query(`UPDATE polizas SET dia_cobro = $1, pago_hasta = $2, actualizado = NOW() WHERE id = $3`,
      [dia, nuevoPH ? iso(nuevoPH) : null, p.id])
    // Mora y estado con la misma regla del proceso nocturno, sobre el nuevo pago_hasta
    await db.query(`
      WITH m AS (SELECT id, GREATEST(0,
          EXTRACT(YEAR  FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int * 12 +
          EXTRACT(MONTH FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int) AS mora
        FROM polizas WHERE id = $1)
      UPDATE polizas x SET meses_mora = m.mora, saldo_mora = m.mora * x.valor_cuota,
        estado = CASE WHEN x.estado IN ('CANCELADA','EJECUTADA') THEN x.estado ELSE fn_estado_poliza(m.mora) END
      FROM m WHERE x.id = m.id`, [p.id])
  }
  await db.query(`CREATE UNIQUE INDEX uq_pago_poliza_periodo_vigente ON pagos_poliza (poliza_id, mes_correspondiente)
                  WHERE tipo = 'CUOTA' AND NOT anulado`)
  await db.query('COMMIT')
  console.log('\n✅ Conversión aplicada.')
} catch (e) {
  await db.query('ROLLBACK')
  console.error('\n❌ No se aplicó nada:', e.message)
  process.exitCode = 1
} finally {
  db.release(); await pool.end()
}
