/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — periodos de cobro y cobertura             ║
 * ║  Archivo         : periodosPoliza.js                                   ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-16                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Los periodos de una póliza se cuentan desde el DÍA DE AFILIACIÓN, como un
 * arriendo — no por mes de calendario. Afiliado el 15 de junio:
 *     "Jun–Jul 2026" = 15 jun → 14 jul,   "Jul–Ago 2026" = 15 jul → 14 ago, …
 * Si el día ancla no existe en el mes (31, 30, 29), el periodo arranca el
 * último día de ese mes.
 *
 * En pagos_poliza: mes_correspondiente = inicio del periodo,
 *                  periodo_hasta       = fin del periodo (inclusive).
 * polizas.pago_hasta = fin del último periodo pagado.
 *
 * ¡Mantener idéntico a orquidea-api/src/utils/periodosPoliza.js!
 */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const pad = n => String(n).padStart(2, '0')

// Date (columna DATE de pg, medianoche local) o 'YYYY-MM-DD…' → { y, m (0-11), d }
export function ymd(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const [y, m, d] = v.slice(0, 10).split('-').map(Number)
    return { y, m: m - 1, d }
  }
  const dt = new Date(v)
  return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() }
}

export const iso = f => `${f.y}-${pad(f.m + 1)}-${pad(f.d)}`
const diasDelMes = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
export const cmp = (a, b) => (a.y - b.y) || (a.m - b.m) || (a.d - b.d)
export function addDias(f, n) {
  const t = new Date(Date.UTC(f.y, f.m, f.d + n))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }
}

// Inicio de periodo dentro de un mes (m puede salirse de 0-11)
export function inicioEnMes(y, m, dia) {
  const yy = y + Math.floor(m / 12)
  const mm = ((m % 12) + 12) % 12
  return { y: yy, m: mm, d: Math.min(dia, diasDelMes(yy, mm)) }
}

export function etiquetaPeriodo(inicio, fin) {
  return inicio.y === fin.y
    ? `${MESES[inicio.m]}–${MESES[fin.m]} ${fin.y}`
    : `${MESES[inicio.m]} ${inicio.y}–${MESES[fin.m]} ${fin.y}`
}

// Día ancla = día de afiliación (fecha_inicio) de la póliza
export const diaAncla = pol => ymd(pol?.fecha_inicio)?.d || 1

export function periodoQueInicia(inicio, dia) {
  const fin = addDias(inicioEnMes(inicio.y, inicio.m + 1, dia), -1)
  return { inicio, fin, iso: iso(inicio), fin_iso: iso(fin), etiqueta: etiquetaPeriodo(inicio, fin) }
}

export function periodoQueContiene(fecha, dia) {
  let ini = inicioEnMes(fecha.y, fecha.m, dia)
  if (cmp(ini, fecha) > 0) ini = inicioEnMes(fecha.y, fecha.m - 1, dia)
  return periodoQueInicia(ini, dia)
}

export const siguientePeriodo = (p, dia) => periodoQueInicia(inicioEnMes(p.inicio.y, p.inicio.m + 1, dia), dia)

const hoyYmd = () => { const h = new Date(); return { y: h.getFullYear(), m: h.getMonth(), d: h.getDate() } }

/**
 * Primer periodo que se ofrece para pagar: el siguiente al último pagado; si
 * ese ya quedó atrás, el periodo vigente HOY (regla de la funeraria: la póliza
 * no se causa — los periodos sin pagar no son deuda, simplemente no tuvieron
 * cobertura).
 */
export function primerPeriodoAPagar(pol, hoy = hoyYmd()) {
  const dia = diaAncla(pol)
  const base = pol.pago_hasta ? addDias(ymd(pol.pago_hasta), 1) : ymd(pol.fecha_inicio)
  let p = periodoQueContiene(base, dia)
  const actual = periodoQueContiene(hoy, dia)
  if (cmp(p.inicio, actual.inicio) < 0) p = actual
  return p
}

// n periodos a partir de `desde`, saltando los ya pagados (Set de iso de inicio)
export function listarPeriodos(desde, n, dia, pagados = new Set()) {
  const out = []
  let p = desde
  for (let guard = 0; out.length < n && guard < n + 240; guard++) {
    if (!pagados.has(p.iso)) out.push(p)
    p = siguientePeriodo(p, dia)
  }
  return out
}

// Periodo al que pertenece una fecha cualquiera (p. ej. mes_correspondiente que manda un cliente viejo)
export const normalizarInicio = (fecha, dia) => periodoQueContiene(ymd(fecha), dia)


// ── Abonos por días ─────────────────────────────────────────────────────────
// Un abono que no completa la cuota da días de cobertura proporcionales:
// tarifa diaria = cuota ÷ días del periodo (un periodo de 31 días cuesta lo
// mismo que uno de 28: cambia la tarifa diaria, no la cuota).
export const diasDelPeriodo = p =>
  Math.round((Date.UTC(p.fin.y, p.fin.m, p.fin.d) - Date.UTC(p.inicio.y, p.inicio.m, p.inicio.d)) / 86400000) + 1
export const tarifaDiaria = (cuota, p) => cuota / diasDelPeriodo(p)
export const diasQueCubre = (monto, cuota, p) =>
  Math.max(0, Math.min(diasDelPeriodo(p), Math.floor((monto + 0.005) / tarifaDiaria(cuota, p))))

// Hasta qué día queda cubierto un periodo con `abonado` pagado (fin del periodo si está completo)
export function finCobertura(p, abonado, cuota) {
  if (abonado >= cuota - 0.5) return p.fin
  const d = diasQueCubre(abonado, cuota, p)
  return addDias(p.inicio, d - 1)   // d = 0 → el día anterior al periodo (sin cobertura)
}

/**
 * Reparte un pago entre periodos. Orden: completa lo que FALTE del primer
 * periodo pendiente (si tenía un abono), luego periodos completos y lo que
 * sobra queda como abono del siguiente, con sus días de cobertura.
 *   estado: { completos: Set(iso inicio), abonado: Map(iso inicio → abonos parciales) }
 *   modo:   { monto } | { periodos: n } | { elegidos: [iso…], monto }
 * Devuelve { items: [{ periodo, monto, completa, parcial, abonado_antes }], total, cubre_hasta }
 */
export function planDePago(pol, cuota, estado, modo, hoy) {
  const dia = diaAncla(pol)
  const falta = p => estado.completos.has(p.iso) ? 0 : Math.max(0, Math.round((cuota - (estado.abonado.get(p.iso) || 0)) * 100) / 100)
  const item = (p, monto) => {
    const antes = estado.abonado.get(p.iso) || 0
    const completa = antes + monto >= cuota - 0.5
    return { periodo: p, monto: Math.round(monto * 100) / 100, completa, parcial: !(completa && antes === 0), abonado_antes: antes }
  }
  const items = []
  let p = primerPeriodoAPagar(pol, hoy)
  const siguientesPendientes = function* (excluir = new Set()) {
    for (let g = 0; g < 600; g++, p = siguientePeriodo(p, dia)) if (falta(p) > 0 && !excluir.has(p.iso)) yield p
  }

  if (modo.elegidos?.length) {
    const elegidos = [...new Map(modo.elegidos.map(x => { const q = normalizarInicio(x, dia); return [q.iso, q] })).values()]
      .sort((a, b) => a.iso.localeCompare(b.iso))
    let resto = modo.monto != null ? Number(modo.monto) : Infinity
    for (const q of elegidos) {
      const f = falta(q)
      if (f > 0 && resto > 0.004) { const m = Math.min(f, resto); items.push(item(q, m)); resto -= m }
    }
    if (resto > 0.004 && resto !== Infinity) {
      const q = siguientesPendientes(new Set(elegidos.map(e => e.iso))).next().value
      if (q) items.push(item(q, Math.min(resto, falta(q))))
    }
  } else {
    let resto = modo.periodos != null ? Infinity : Number(modo.monto || 0)
    let n = modo.periodos != null ? Number(modo.periodos) : Infinity
    for (const q of siguientesPendientes()) {
      if (n <= 0 || resto <= 0.004) break
      const f = falta(q)
      const m = Math.min(f, resto)
      items.push(item(q, m)); resto -= m
      if (m >= f - 0.004) n--
    }
  }

  const ult = items[items.length - 1]
  const cubre_hasta = ult ? finCobertura(ult.periodo, ult.abonado_antes + ult.monto, cuota) : null
  return { items, total: Math.round(items.reduce((s, i) => s + i.monto, 0) * 100) / 100, cubre_hasta }
}
