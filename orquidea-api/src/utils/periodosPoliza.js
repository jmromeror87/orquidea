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
 * ¡Mantener idéntico a orquidea-web/src/utils/periodosPoliza.js!
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
