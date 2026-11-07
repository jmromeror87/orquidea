/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes — rentabilidad de pólizas y de servicios    ║
 * ║  Archivo         : services/rentabilidadPolizas.service.js              ║
 * ║  Versión         : v2.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Póliza y servicio son negocios distintos y se analizan por separado.
 *
 * PÓLIZAS (por recaudo):
 *  · Recaudo: todo lo pagado (incluye el historial de Pisco), lo de los
 *    últimos 12 meses frente a lo esperado (cuota × 12) y meses al día.
 *  · Costo del plan (suma del costo de los servicios del plan en el catálogo)
 *    como referencia: cuántas veces el recaudo ha cubierto el plan y cuántos
 *    meses de cuota cuesta un plan.
 *  · Riesgo del grupo: Σ (probabilidad de fallecer en un año según la edad de
 *    cada miembro vivo) × costo del plan = costo esperado al año.
 *    Cuota de equilibrio = costo esperado / 12; cuota sugerida = la que deja
 *    la utilidad deseada (redondeada a la centena).
 *  Las probabilidades son referenciales (no es un cálculo actuarial).
 *
 * SERVICIOS (por servicio): venta (contrato, convenio, valor de Pisco o
 * ítems cobrados) frente al costo de sus ítems; en los de póliza, el costo
 * real frente al costo del plan.
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
const mesesEntre = (a, b) => {
  if (!a || !b) return 0
  const x = new Date(a), y = new Date(b)
  return Math.max(0, (y.getFullYear() - x.getFullYear()) * 12 + (y.getMonth() - x.getMonth()))
}

// ── PÓLIZAS ──────────────────────────────────────────────────────────────────
const SQL_POLIZAS = `
  WITH costo_plan AS (
    SELECT ps.plan_id, SUM(sc.costo) AS costo
      FROM plan_servicios ps JOIN servicios_catalogo sc ON sc.id = ps.servicio_id AND sc.activo
     GROUP BY 1
  ), ing AS (
    SELECT poliza_id, SUM(monto) AS total, COUNT(*) AS n, MIN(fecha_pago) AS primero, MAX(fecha_pago) AS ultimo,
           SUM(monto) FILTER (WHERE fecha_pago > CURRENT_DATE - INTERVAL '12 months') AS ult12
      FROM pagos_poliza WHERE NOT anulado GROUP BY 1
  ), primera AS (
    SELECT DISTINCT ON (poliza_id) poliza_id,
           monto / GREATEST(1, ROUND(GREATEST(COALESCE(periodo_hasta, mes_correspondiente) - mes_correspondiente, 0) / 30.4)) AS cuota_inicial
      FROM pagos_poliza WHERE NOT anulado AND tipo = 'CUOTA' AND NOT parcial AND monto > 0
     ORDER BY poliza_id, mes_correspondiente
  ), ejec AS (
    SELECT poliza_id, COUNT(*) AS n FROM poliza_beneficiarios WHERE ejecutado GROUP BY 1
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
         pl.nombre AS plan, COALESCE(cp.costo, 0) AS costo_plan,
         COALESCE(t.nombres || ' ' || t.apellidos, t.razon_social) AS titular, t.numero_documento AS titular_doc,
         COALESCE(ing.total, 0) AS recaudo, COALESCE(ing.ult12, 0) AS recaudo_12m, COALESCE(ing.n, 0) AS pagos,
         ing.primero AS primer_pago, ing.ultimo AS ultimo_pago, primera.cuota_inicial,
         COALESCE(ejec.n, 0) + CASE WHEN p.titular_fallecido_en IS NOT NULL THEN 1 ELSE 0 END AS fallecidos,
         COALESCE(viv.edades, '{}') AS edades_vivos
    FROM polizas p
    JOIN planes_poliza pl ON pl.id = p.plan_id
    JOIN terceros t ON t.id = p.titular_id
    LEFT JOIN costo_plan cp ON cp.plan_id = p.plan_id
    LEFT JOIN ing ON ing.poliza_id = p.id
    LEFT JOIN primera ON primera.poliza_id = p.id
    LEFT JOIN ejec ON ejec.poliza_id = p.id
    LEFT JOIN viv ON viv.poliza_id = p.id`

export function analizarPoliza(r, margenObjetivo = 0.30) {
  const hoy = new Date()
  const recaudo = +r.recaudo, costoPlan = +r.costo_plan, cuota = +r.valor_cuota
  const anios = Math.max(0, (hoy - new Date(r.fecha_inicio)) / (365.25 * 864e5))
  const activa = !['CANCELADA', 'EJECUTADA'].includes(r.estado)

  // Recaudo de los últimos 12 meses frente a lo esperado (o los meses que lleve si es nueva)
  const mesesVida = mesesEntre(r.fecha_inicio, hoy)
  const esperado12 = cuota * Math.min(12, Math.max(1, mesesVida))
  const cumplimiento = esperado12 > 0 ? +r.recaudo_12m / esperado12 : null
  // Meses al día en toda la historia (pagada hasta vs. meses transcurridos)
  const mesesPagados = r.pago_hasta ? mesesEntre(r.fecha_inicio, r.pago_hasta) + 1 : 0
  const alDiaHist = mesesVida > 0 ? Math.min(1, mesesPagados / mesesVida) : null

  const edades = (r.edades_vivos || []).map(e => (e == null ? null : +e))
  const conEdad = edades.filter(e => e != null)
  const costoAnualEsperado = edades.reduce((s, e) => s + probFallecer(e) * costoPlan, 0)
  const cuotaEquilibrio = costoAnualEsperado / 12
  const cuotaRecomendada = centena(cuotaEquilibrio / (1 - margenObjetivo))
  const margenCuota = cuota > 0 ? (cuota - cuotaEquilibrio) / cuota : null
  const cuotaInicial = r.cuota_inicial != null ? +r.cuota_inicial : null

  const recaudoNivel = !activa ? 'NINGUNO' : cumplimiento == null ? 'NINGUNO'
    : cumplimiento >= 0.9 ? 'AL_DIA' : cumplimiento >= 0.5 ? 'IRREGULAR' : 'MALO'
  const cuotaNivel = !activa ? 'NINGUNO' : cuota >= cuotaRecomendada ? 'CUBRE'
    : cuota >= cuotaEquilibrio ? 'AJUSTADA' : 'NO_CUBRE'
  const veredicto = !activa ? (r.estado === 'EJECUTADA' ? 'EJECUTADA' : 'CANCELADA')
    : cuotaNivel === 'NO_CUBRE' || recaudoNivel === 'MALO' ? 'NO_CONVIENE'
    : cuotaNivel === 'CUBRE' && recaudoNivel === 'AL_DIA' ? 'CONVIENE' : 'REVISAR'

  return {
    id: r.id, numero: r.numero, numero_legado: r.numero_legado, estado: r.estado, plan: r.plan,
    titular: r.titular, titular_doc: r.titular_doc, fecha_inicio: r.fecha_inicio, anios: +anios.toFixed(1),
    valor_cuota: cuota, cuota_inicial: cuotaInicial,
    incremento: cuotaInicial && cuotaInicial > 0 ? (cuota - cuotaInicial) / cuotaInicial : null,
    recaudo, recaudo_12m: +r.recaudo_12m, esperado_12m: activa ? esperado12 : 0, cumplimiento: activa ? cumplimiento : null,
    al_dia_historico: alDiaHist, pagos: +r.pagos, ultimo_pago: r.ultimo_pago, pago_hasta: r.pago_hasta,
    meses_mora: +r.meses_mora || 0, recaudo_promedio_anual: anios >= 1 ? recaudo / anios : recaudo,
    costo_plan: costoPlan,
    veces_plan: costoPlan > 0 ? recaudo / costoPlan : null,
    meses_por_plan: cuota > 0 && costoPlan > 0 ? costoPlan / cuota : null,
    fallecidos: +r.fallecidos,
    vivos: edades.length, edad_promedio: conEdad.length ? Math.round(conEdad.reduce((a, b) => a + b, 0) / conEdad.length) : null,
    mayores_65: conEdad.filter(e => e > 65).length,
    costo_anual_esperado: Math.round(costoAnualEsperado), ingreso_anual: cuota * 12,
    cuota_equilibrio: Math.round(cuotaEquilibrio), cuota_recomendada: cuotaRecomendada, margen_cuota: margenCuota,
    ajuste_sugerido: activa && cuota > 0 && cuotaRecomendada > cuota ? cuotaRecomendada - cuota : 0,
    recaudo_nivel: recaudoNivel, cuota_nivel: cuotaNivel, veredicto,
  }
}

export async function listarRentabilidad({ sedeIds, margen = 0.30 }) {
  const { rows } = await pool.query(`${SQL_POLIZAS}
    WHERE ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))
    ORDER BY p.numero`, [sedeIds])
  return rows.map(r => analizarPoliza(r, margen))
}

export async function detalleRentabilidad({ id, margen = 0.30 }) {
  const { rows } = await pool.query(`${SQL_POLIZAS} WHERE p.id = $1`, [id])
  if (!rows.length) return null
  const a = analizarPoliza(rows[0], margen)
  const [porAnio, miembros] = await Promise.all([
    pool.query(`
      SELECT EXTRACT(YEAR FROM fecha_pago)::int AS anio, SUM(monto) AS recaudo, COUNT(*) AS pagos
        FROM pagos_poliza WHERE poliza_id = $1 AND NOT anulado GROUP BY 1 ORDER BY 1`, [id]),
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
  let acum = 0
  const historia = porAnio.rows.map(r => ({ anio: r.anio, recaudo: +r.recaudo, pagos: +r.pagos, acumulado: (acum += +r.recaudo) }))
  return {
    ...a, historia,
    miembros: miembros.rows.map(m => ({ ...m, probabilidad: probFallecer(m.edad), costo_esperado: Math.round(probFallecer(m.edad) * a.costo_plan) })),
  }
}

// ── SERVICIOS ────────────────────────────────────────────────────────────────
const SQL_SERVICIOS = `
  WITH costo_plan AS (
    SELECT ps.plan_id, SUM(sc.costo) AS costo
      FROM plan_servicios ps JOIN servicios_catalogo sc ON sc.id = ps.servicio_id AND sc.activo
     GROUP BY 1
  ), it AS (
    SELECT servicio_id,
           SUM(costo_unitario * cantidad) FILTER (WHERE costo_unitario > 0) AS costo,
           SUM(precio_unit * cantidad) FILTER (WHERE NOT COALESCE(es_cobertura, false) AND precio_unit > 0) AS cobrado_items,
           COUNT(*) AS items
      FROM items_servicio GROUP BY 1
  )
  SELECT s.id, s.codigo, s.numero, s.estado, s.creado_en AS fecha, s.migrado_pisco, s.tipo_disposicion,
         concat_ws(' ', d.nombres, d.apellidos) AS fallecido,
         CASE WHEN s.poliza_id IS NOT NULL THEN 'POLIZA' WHEN s.contrato_id IS NOT NULL THEN 'CONTRATO'
              WHEN s.convenio_id IS NOT NULL THEN 'CONVENIO'
              WHEN s.datos_pisco->>'tipo' IN ('AfiliadoCD', 'AfiliadoSD') THEN 'POLIZA'
              WHEN s.datos_pisco->>'tipo' = 'Convenio' THEN 'CONVENIO' ELSE 'PARTICULAR' END AS origen,
         COALESCE(pl.nombre, s.datos_pisco->>'plan') AS plan, cp.costo AS costo_plan,
         COALESCE(p.numero_legado, p.numero::text) AS poliza, cv.nombre AS convenio,
         COALESCE(NULLIF(c.valor_total, 0), NULLIF(s.convenio_valor_servicio, 0),
                  NULLIF((s.datos_pisco->'valores'->>'total')::numeric, 0), NULLIF(it.cobrado_items, 0)) AS venta,
         it.costo
    FROM servicios_funerarios s
    LEFT JOIN terceros d ON d.id = s.difunto_id
    LEFT JOIN polizas p ON p.id = s.poliza_id
    LEFT JOIN planes_poliza pl ON pl.id = p.plan_id
    LEFT JOIN costo_plan cp ON cp.plan_id = p.plan_id
    LEFT JOIN contratos c ON c.id = s.contrato_id
    LEFT JOIN convenios cv ON cv.id = s.convenio_id
    LEFT JOIN it ON it.servicio_id = s.id
   WHERE s.estado <> 'CANCELADO'
     AND s.creado_en >= $1::date AND s.creado_en < $2::date + 1
     AND ($3::uuid[] IS NULL OR s.sede_id = ANY($3::uuid[]))
   ORDER BY s.creado_en DESC`

export async function listarRentabilidadServicios({ sedeIds, desde, hasta }) {
  const { rows } = await pool.query(SQL_SERVICIOS, [desde, hasta, sedeIds])
  return rows.map(r => {
    const venta = r.venta != null ? +r.venta : null
    const costo = r.costo != null ? +r.costo : null
    const costoPlan = r.costo_plan != null ? +r.costo_plan : null
    const utilidad = venta != null && costo != null ? venta - costo : null
    return {
      ...r, venta, costo, costo_plan: costoPlan, utilidad,
      margen: utilidad != null && venta > 0 ? utilidad / venta : null,
      // En los de póliza: ¿costó más o menos de lo que vale el plan?
      dif_plan: r.origen === 'POLIZA' && costo != null && costoPlan ? costo - costoPlan : null,
      datos: venta != null && costo != null ? 'COMPLETO' : venta == null && costo == null ? 'SIN_DATOS' : venta == null ? 'SIN_VENTA' : 'SIN_COSTO',
    }
  })
}
