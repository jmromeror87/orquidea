/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes — rentabilidad de pólizas                   ║
 * ║  Archivo         : services/rentabilidadPolizas.service.js              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ¿Me conviene esta póliza? Para cada póliza:
 *  · Ingresos: todos sus pagos no anulados (incluye el historial de Pisco).
 *  · Costo de servicios: por cada fallecido de la póliza (titular o
 *    beneficiario), el costo REAL de su servicio si se conoce (ítems con
 *    costo); si no, el costo ESTIMADO = costo actual de los servicios del plan.
 *  · Resultado = ingresos − costos, y su margen.
 *  · Riesgo futuro: costo esperado al año = Σ (probabilidad de fallecer en un
 *    año según la edad de cada miembro vivo) × costo del plan.
 *  · Cuota de equilibrio = costo esperado / 12; cuota recomendada = la que deja
 *    el margen objetivo (redondeada a la centena).
 * Las probabilidades son referenciales (tabla de mortalidad aproximada por
 * edad, Colombia); sirven para comparar pólizas, no son un cálculo actuarial.
 */
import pool from '../config/database.js'

// Probabilidad anual de fallecer por edad (referencial)
const TABLA_MORTALIDAD = [
  [5, 0.0030], [15, 0.0004], [25, 0.0012], [35, 0.0016], [45, 0.0022],
  [55, 0.0040], [65, 0.0085], [75, 0.0190], [85, 0.0480], [Infinity, 0.1400],
]
const EDAD_SIN_DATO = 45 // si no hay fecha de nacimiento
export const probFallecer = edad => {
  const e = edad == null ? EDAD_SIN_DATO : +edad
  return TABLA_MORTALIDAD.find(([hasta]) => e < hasta)[1]
}
const centena = v => Math.ceil(v / 100) * 100

const SQL_BASE = `
  WITH costo_plan AS (
    SELECT ps.plan_id, SUM(sc.costo) AS costo
      FROM plan_servicios ps JOIN servicios_catalogo sc ON sc.id = ps.servicio_id AND sc.activo
     GROUP BY 1
  ), ing AS (
    SELECT poliza_id, SUM(monto) AS total, COUNT(*) AS n, MIN(fecha_pago) AS primero, MAX(fecha_pago) AS ultimo
      FROM pagos_poliza WHERE NOT anulado GROUP BY 1
  ), primera AS (
    SELECT DISTINCT ON (poliza_id) poliza_id,
           monto / GREATEST(1, ROUND(GREATEST(COALESCE(periodo_hasta, mes_correspondiente) - mes_correspondiente, 0) / 30.4)) AS cuota_inicial
      FROM pagos_poliza WHERE NOT anulado AND tipo = 'CUOTA' AND NOT parcial AND monto > 0
     ORDER BY poliza_id, mes_correspondiente
  ), fall AS (
    SELECT pb.poliza_id, pb.tercero_id,
           COALESCE(pb.servicio_id, (SELECT sf.id FROM servicios_funerarios sf WHERE sf.poliza_id = pb.poliza_id AND sf.difunto_id = pb.tercero_id LIMIT 1)) AS sid,
           pb.fecha_ejecucion AS fecha
      FROM poliza_beneficiarios pb WHERE pb.ejecutado
    UNION ALL
    SELECT p.id, p.titular_id,
           (SELECT sf.id FROM servicios_funerarios sf WHERE sf.poliza_id = p.id AND sf.difunto_id = p.titular_id LIMIT 1),
           COALESCE(p.titular_fallecido_en, (SELECT d.fecha_fallecimiento FROM defunciones d WHERE d.tercero_id = p.titular_id LIMIT 1))
      FROM polizas p
     WHERE p.titular_fallecido_en IS NOT NULL
        OR EXISTS (SELECT 1 FROM servicios_funerarios sf WHERE sf.poliza_id = p.id AND sf.difunto_id = p.titular_id)
  ), costo_real AS (
    SELECT servicio_id, SUM(costo_unitario * cantidad) AS c FROM items_servicio GROUP BY 1
  ), fc AS (
    SELECT f.poliza_id, COUNT(*) AS n, COUNT(*) FILTER (WHERE cr.c > 0) AS n_real,
           SUM(CASE WHEN cr.c > 0 THEN cr.c ELSE COALESCE(cp.costo, 0) END) AS costo
      FROM fall f JOIN polizas p ON p.id = f.poliza_id
      LEFT JOIN costo_real cr ON cr.servicio_id = f.sid
      LEFT JOIN costo_plan cp ON cp.plan_id = p.plan_id
     GROUP BY 1
  ), viv AS (
    SELECT x.poliza_id, array_agg(x.edad) AS edades
      FROM (
        SELECT pb.poliza_id, DATE_PART('year', AGE(CURRENT_DATE, t.fecha_nacimiento))::int AS edad
          FROM poliza_beneficiarios pb JOIN terceros t ON t.id = pb.tercero_id
         WHERE pb.activo AND NOT pb.ejecutado AND NOT EXISTS (SELECT 1 FROM defunciones d WHERE d.tercero_id = t.id)
        UNION ALL
        SELECT p.id, DATE_PART('year', AGE(CURRENT_DATE, t.fecha_nacimiento))::int
          FROM polizas p JOIN terceros t ON t.id = p.titular_id
         WHERE p.titular_fallecido_en IS NULL AND NOT EXISTS (SELECT 1 FROM defunciones d WHERE d.tercero_id = t.id)
      ) x GROUP BY 1
  )
  SELECT p.id, p.numero, p.numero_legado, p.estado, p.fecha_inicio, p.valor_cuota, p.meses_mora, p.pago_hasta,
         pl.nombre AS plan, pl.id AS plan_id, COALESCE(cp.costo, 0) AS costo_plan,
         COALESCE(t.nombres || ' ' || t.apellidos, t.razon_social) AS titular, t.numero_documento AS titular_doc,
         COALESCE(ing.total, 0) AS ingresos, COALESCE(ing.n, 0) AS pagos, ing.primero AS primer_pago, ing.ultimo AS ultimo_pago,
         primera.cuota_inicial,
         COALESCE(fc.n, 0) AS fallecidos, COALESCE(fc.n_real, 0) AS fallecidos_costo_real, COALESCE(fc.costo, 0) AS costo_servicios,
         COALESCE(viv.edades, '{}') AS edades_vivos
    FROM polizas p
    JOIN planes_poliza pl ON pl.id = p.plan_id
    JOIN terceros t ON t.id = p.titular_id
    LEFT JOIN costo_plan cp ON cp.plan_id = p.plan_id
    LEFT JOIN ing ON ing.poliza_id = p.id
    LEFT JOIN primera ON primera.poliza_id = p.id
    LEFT JOIN fc ON fc.poliza_id = p.id
    LEFT JOIN viv ON viv.poliza_id = p.id`

// Indicadores y veredicto de una póliza (fila de SQL_BASE)
export function analizar(r, margenObjetivo = 0.30) {
  const ingresos = +r.ingresos, costo = +r.costo_servicios, costoPlan = +r.costo_plan
  const resultado = ingresos - costo
  const margen = ingresos > 0 ? resultado / ingresos : (costo > 0 ? -1 : 0)
  const anios = Math.max(0, (Date.now() - new Date(r.fecha_inicio)) / (365.25 * 864e5))
  const edades = (r.edades_vivos || []).map(e => (e == null ? null : +e))
  const costoAnualEsperado = edades.reduce((s, e) => s + probFallecer(e) * costoPlan, 0)
  const cuota = +r.valor_cuota
  const ingresoAnual = cuota * 12
  const cuotaEquilibrio = costoAnualEsperado / 12
  const cuotaRecomendada = margenObjetivo < 1 ? centena(cuotaEquilibrio / (1 - margenObjetivo)) : null
  const ratioRiesgo = ingresoAnual > 0 ? costoAnualEsperado / ingresoAnual : (costoAnualEsperado > 0 ? 9 : 0)
  const cuotaInicial = r.cuota_inicial != null ? +r.cuota_inicial : null
  const veredicto = r.estado === 'CANCELADA' && ingresos === 0 ? 'SIN_DATOS'
    : margen >= 0.30 ? 'RENTABLE' : margen >= 0 ? 'AJUSTADA' : 'PERDIDA'
  const riesgo = r.estado === 'CANCELADA' ? 'NINGUNO' : ratioRiesgo >= 1 ? 'ALTO' : ratioRiesgo >= 0.6 ? 'MEDIO' : 'BAJO'
  return {
    id: r.id, numero: r.numero, numero_legado: r.numero_legado, estado: r.estado, plan: r.plan,
    titular: r.titular, titular_doc: r.titular_doc, fecha_inicio: r.fecha_inicio, anios: +anios.toFixed(1),
    valor_cuota: cuota, cuota_inicial: cuotaInicial,
    incremento: cuotaInicial && cuotaInicial > 0 ? (cuota - cuotaInicial) / cuotaInicial : null,
    ingresos, pagos: +r.pagos, ultimo_pago: r.ultimo_pago, meses_mora: +r.meses_mora || 0,
    fallecidos: +r.fallecidos, fallecidos_costo_real: +r.fallecidos_costo_real, costo_servicios: costo, costo_plan: costoPlan,
    resultado, margen,
    vivos: edades.length, edad_promedio: edades.filter(e => e != null).length
      ? Math.round(edades.filter(e => e != null).reduce((a, b) => a + b, 0) / edades.filter(e => e != null).length) : null,
    mayores_65: edades.filter(e => e != null && e > 65).length,
    costo_anual_esperado: Math.round(costoAnualEsperado), ingreso_anual: ingresoAnual,
    cuota_equilibrio: Math.round(cuotaEquilibrio), cuota_recomendada: cuotaRecomendada,
    ajuste_sugerido: cuotaRecomendada && cuota > 0 && r.estado !== 'CANCELADA' && cuotaRecomendada > cuota ? cuotaRecomendada - cuota : 0,
    veredicto, riesgo,
  }
}

export async function listarRentabilidad({ sedeIds, margen = 0.30 }) {
  const { rows } = await pool.query(`${SQL_BASE}
    WHERE ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))
    ORDER BY p.numero`, [sedeIds])
  return rows.map(r => analizar(r, margen))
}

export async function detalleRentabilidad({ id, margen = 0.30 }) {
  const { rows } = await pool.query(`${SQL_BASE} WHERE p.id = $1`, [id])
  if (!rows.length) return null
  const a = analizar(rows[0], margen)
  const [porAnio, fallecidos, miembros] = await Promise.all([
    pool.query(`
      SELECT EXTRACT(YEAR FROM fecha_pago)::int AS anio, SUM(monto) AS ingresos, COUNT(*) AS pagos
        FROM pagos_poliza WHERE poliza_id = $1 AND NOT anulado GROUP BY 1 ORDER BY 1`, [id]),
    pool.query(`
      WITH f AS (
        SELECT pb.tercero_id, pb.parentesco,
               COALESCE(pb.servicio_id, (SELECT sf.id FROM servicios_funerarios sf WHERE sf.poliza_id = pb.poliza_id AND sf.difunto_id = pb.tercero_id LIMIT 1)) AS sid,
               pb.fecha_ejecucion AS fecha
          FROM poliza_beneficiarios pb WHERE pb.poliza_id = $1 AND pb.ejecutado
        UNION ALL
        SELECT p.titular_id, 'titular',
               (SELECT sf.id FROM servicios_funerarios sf WHERE sf.poliza_id = p.id AND sf.difunto_id = p.titular_id LIMIT 1),
               COALESCE(p.titular_fallecido_en, (SELECT d.fecha_fallecimiento FROM defunciones d WHERE d.tercero_id = p.titular_id LIMIT 1))
          FROM polizas p WHERE p.id = $1
           AND (p.titular_fallecido_en IS NOT NULL OR EXISTS (SELECT 1 FROM servicios_funerarios sf WHERE sf.poliza_id = p.id AND sf.difunto_id = p.titular_id))
      )
      SELECT f.tercero_id, f.parentesco, f.fecha, concat_ws(' ', t.nombres, t.apellidos) AS nombre,
             s.codigo, (SELECT SUM(i.costo_unitario * i.cantidad) FROM items_servicio i WHERE i.servicio_id = f.sid) AS costo_real
        FROM f JOIN terceros t ON t.id = f.tercero_id
        LEFT JOIN servicios_funerarios s ON s.id = f.sid
       ORDER BY f.fecha NULLS LAST`, [id]),
    pool.query(`
      SELECT t.id, concat_ws(' ', t.nombres, t.apellidos) AS nombre, pb.parentesco, t.fecha_nacimiento,
             DATE_PART('year', AGE(CURRENT_DATE, t.fecha_nacimiento))::int AS edad
        FROM poliza_beneficiarios pb JOIN terceros t ON t.id = pb.tercero_id
       WHERE pb.poliza_id = $1 AND pb.activo AND NOT pb.ejecutado AND NOT EXISTS (SELECT 1 FROM defunciones d WHERE d.tercero_id = t.id)
      UNION ALL
      SELECT t.id, concat_ws(' ', t.nombres, t.apellidos), 'titular', t.fecha_nacimiento, DATE_PART('year', AGE(CURRENT_DATE, t.fecha_nacimiento))::int
        FROM polizas p JOIN terceros t ON t.id = p.titular_id
       WHERE p.id = $1 AND p.titular_fallecido_en IS NULL AND NOT EXISTS (SELECT 1 FROM defunciones d WHERE d.tercero_id = t.id)`, [id]),
  ])
  const costoPlan = a.costo_plan
  const servicios = fallecidos.rows.map(f => ({
    nombre: f.nombre, parentesco: f.parentesco, fecha: f.fecha, codigo: f.codigo,
    costo: +f.costo_real > 0 ? +f.costo_real : costoPlan, tipo_costo: +f.costo_real > 0 ? 'REAL' : 'ESTIMADO',
    anio: f.fecha ? new Date(f.fecha).getFullYear() : null,
  }))
  // Historia año a año: ingresos vs. costo de servicios y acumulado
  const anios = new Map()
  for (const r of porAnio.rows) anios.set(r.anio, { anio: r.anio, ingresos: +r.ingresos, costos: 0 })
  for (const s of servicios) if (s.anio) { const x = anios.get(s.anio) || { anio: s.anio, ingresos: 0, costos: 0 }; x.costos += s.costo; anios.set(s.anio, x) }
  let acum = 0
  const historia = [...anios.values()].sort((x, y) => x.anio - y.anio).map(x => ({ ...x, acumulado: (acum += x.ingresos - x.costos) }))
  return {
    ...a, historia, servicios,
    miembros: miembros.rows.map(m => ({ ...m, probabilidad: probFallecer(m.edad), costo_esperado: Math.round(probFallecer(m.edad) * costoPlan) })),
  }
}
