/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes y Analytics                            ║
 * ║  Archivo         : reportes.controller.js                          ║
 * ║  Versión         : v1.1.0 — filtro de sede obligatorio (multisede)  ║
 * ║  Fecha           : 2026-07-27                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import ExcelJS from 'exceljs'
import pool from '../config/database.js'
import { anthropic } from '../utils/anthropicClient.js'
import { resolverSede } from '../utils/sede.js'

// ── Helpers de filtro ───────────────────────────────────────────────────────
// El rango de fechas es libre; la sede NUNCA se confía en lo que mande el
// cliente sin pasar por resolverSede() — un usuario no-admin siempre queda
// forzado a sus propias sedes, mande o no ?sede_id=.

function rangoFechas(query) {
  const hoy = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  return {
    desde: query.fecha_inicio || inicioMes,
    hasta: query.fecha_fin || hoy,
  }
}

// ── 1. Financiero: ingresos por pagos de contratos y pólizas ──────────────

export async function financiero(req, reply) {
  const { desde, hasta } = rangoFechas(req.query)
  const { sedeIds } = resolverSede(req)
  const r = await financieroData({ desde, hasta, sedeIds })
  return reply.send({ data: { rango: { desde, hasta }, ...r } })
}

async function financieroData({ desde, hasta, sedeIds }) {
  const params = [desde, hasta, sedeIds]
  const [contratosIngresos, polizasIngresos, serieDiaria] = await Promise.all([
    pool.query(`
      SELECT COALESCE(SUM(p.monto),0) AS total, COUNT(*) AS cantidad
      FROM pagos_contrato p
      JOIN contratos c ON c.id = p.contrato_id
      WHERE p.anulado = FALSE AND p.fecha_pago BETWEEN $1 AND $2
        AND ($3::uuid[] IS NULL OR c.sede_id = ANY($3::uuid[]))`,
      params
    ),
    pool.query(`
      SELECT COALESCE(SUM(pp.monto),0) AS total, COUNT(*) AS cantidad
      FROM pagos_poliza pp
      JOIN polizas pl ON pl.id = pp.poliza_id
      WHERE pp.anulado = FALSE AND pp.fecha_pago BETWEEN $1 AND $2
        AND ($3::uuid[] IS NULL OR pl.sede_id = ANY($3::uuid[]))`,
      params
    ),
    pool.query(`
      SELECT fecha, SUM(monto) AS total FROM (
        SELECT p.fecha_pago AS fecha, p.monto FROM pagos_contrato p
          JOIN contratos c ON c.id = p.contrato_id
          WHERE p.anulado = FALSE AND p.fecha_pago BETWEEN $1 AND $2
            AND ($3::uuid[] IS NULL OR c.sede_id = ANY($3::uuid[]))
        UNION ALL
        SELECT pp.fecha_pago AS fecha, pp.monto FROM pagos_poliza pp
          JOIN polizas pl ON pl.id = pp.poliza_id
          WHERE pp.anulado = FALSE AND pp.fecha_pago BETWEEN $1 AND $2
            AND ($3::uuid[] IS NULL OR pl.sede_id = ANY($3::uuid[]))
      ) t
      GROUP BY fecha ORDER BY fecha`,
      params
    ),
  ])

  return {
    ingresos_contratos: contratosIngresos.rows[0],
    ingresos_polizas: polizasIngresos.rows[0],
    total_ingresos: +contratosIngresos.rows[0].total + +polizasIngresos.rows[0].total,
    serie_diaria: serieDiaria.rows,
  }
}

// ── 2. Ventas por asesor ────────────────────────────────────────────────────
// Las comisiones no tienen sede propia (pertenecen al asesor) — se filtran
// por las sedes asignadas al asesor mismo (usuario_sedes), igual que en
// asesores.controller.js.

export async function ventas(req, reply) {
  const { desde, hasta } = rangoFechas(req.query)
  const { sedeIds } = resolverSede(req)
  const r = await ventasData({ desde, hasta, sedeIds })
  return reply.send({ data: { rango: { desde, hasta }, ...r } })
}

async function ventasData({ desde, hasta, sedeIds }) {
  const { rows } = await pool.query(`
    SELECT
      u.id, u.nombre, u.rol,
      COUNT(c.id) FILTER (WHERE c.creado_en::date BETWEEN $1 AND $2)  AS ventas,
      COALESCE(SUM(c.valor_base) FILTER (WHERE c.creado_en::date BETWEEN $1 AND $2), 0)     AS valor_vendido,
      COALESCE(SUM(c.valor_comision) FILTER (WHERE c.creado_en::date BETWEEN $1 AND $2), 0) AS comision_generada
    FROM usuarios u
    LEFT JOIN comisiones c ON c.usuario_id = u.id AND c.estado != 'ANULADA'
    WHERE u.rol IN ('asesor_comercial','operador','administrador','superadmin')
      AND ($3::uuid[] IS NULL OR EXISTS (
        SELECT 1 FROM usuario_sedes us WHERE us.usuario_id = u.id AND us.sede_id = ANY($3::uuid[])
      ))
    GROUP BY u.id
    HAVING COUNT(c.id) FILTER (WHERE c.creado_en::date BETWEEN $1 AND $2) > 0
    ORDER BY valor_vendido DESC`,
    [desde, hasta, sedeIds]
  )
  return { asesores: rows }
}

// ── 3. Cartera: pólizas y contratos ─────────────────────────────────────────

export async function cartera(req, reply) {
  const { sedeIds } = resolverSede(req)
  const r = await carteraData({ sedeIds })
  return reply.send({ data: r })
}

async function carteraData({ sedeIds }) {
  const params = [sedeIds]
  const [porEstado, mora, contratosCartera] = await Promise.all([
    pool.query(`
      SELECT p.estado, COUNT(*) AS cantidad, COALESCE(SUM(p.valor_cuota),0) AS valor_cuotas
      FROM polizas p
      WHERE ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))
      GROUP BY p.estado ORDER BY p.estado`,
      params
    ),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.meses_mora = 0)                    AS al_dia,
        COUNT(*) FILTER (WHERE p.meses_mora BETWEEN 1 AND 2)        AS mora_leve,
        COUNT(*) FILTER (WHERE p.meses_mora > 2)                    AS mora_alta,
        COALESCE(SUM(p.valor_cuota) FILTER (WHERE p.meses_mora > 0), 0) AS valor_en_mora
      FROM polizas p
      WHERE p.estado NOT IN ('CANCELADA','EJECUTADA')
        AND ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))`,
      params
    ),
    pool.query(`
      SELECT
        COUNT(*) AS cantidad,
        COALESCE(SUM(c.valor_total),0)  AS valor_total,
        COALESCE(SUM(c.valor_pagado),0) AS valor_pagado,
        COALESCE(SUM(c.saldo_pendiente),0) AS saldo_pendiente
      FROM contratos c
      WHERE c.estado = 'activo'
        AND ($1::uuid[] IS NULL OR c.sede_id = ANY($1::uuid[]))`,
      params
    ),
  ])

  return { por_estado: porEstado.rows, mora: mora.rows[0], contratos: contratosCartera.rows[0] }
}

// ── 4. Operativo: servicios, inventario, recaudo ───────────────────────────

export async function operativo(req, reply) {
  const { desde, hasta } = rangoFechas(req.query)
  const { sedeIds } = resolverSede(req)
  const r = await operativoData({ desde, hasta, sedeIds })
  return reply.send({ data: { rango: { desde, hasta }, ...r } })
}

async function operativoData({ desde, hasta, sedeIds }) {
  const [servicios, inventarioBajo, recaudo] = await Promise.all([
    pool.query(`
      SELECT s.estado, COUNT(*) AS cantidad
      FROM servicios_funerarios s
      WHERE s.creado_en::date BETWEEN $1 AND $2
        AND ($3::uuid[] IS NULL OR s.sede_id = ANY($3::uuid[]))
      GROUP BY s.estado ORDER BY s.estado`,
      [desde, hasta, sedeIds]
    ),
    pool.query(`
      SELECT p.id, p.codigo_sku, p.nombre, p.stock_minimo,
        COALESCE(SUM(st.cantidad), 0) AS stock_actual
      FROM inv_productos p
      LEFT JOIN inv_stock st ON st.producto_id = p.id
      LEFT JOIN inv_ubicaciones ub ON ub.id = st.ubicacion_id
      LEFT JOIN inv_bodegas b ON b.id = ub.bodega_id
      WHERE p.activo = true
        AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]) OR b.sede_id IS NULL)
      GROUP BY p.id
      HAVING COALESCE(SUM(st.cantidad), 0) <= p.stock_minimo
      ORDER BY stock_actual ASC
      LIMIT 30`,
      [sedeIds]
    ),
    pool.query(`
      SELECT
        COUNT(*)                                              AS ordenes_totales,
        COUNT(*) FILTER (WHERE o.estado = 'COMPLETADA')        AS ordenes_completadas,
        COALESCE(SUM(o.total_esperado), 0)                     AS total_esperado,
        COALESCE(SUM(o.total_recaudado), 0)                    AS total_recaudado
      FROM ordenes_recaudo o
      JOIN rutas_recaudo r ON r.id = o.ruta_id
      JOIN zonas_recaudo z ON z.id = r.zona_id
      WHERE o.fecha BETWEEN $1 AND $2
        AND ($3::uuid[] IS NULL OR z.sede_id = ANY($3::uuid[]))`,
      [desde, hasta, sedeIds]
    ),
  ])

  return {
    servicios_por_estado: servicios.rows,
    inventario_bajo_stock: inventarioBajo.rows,
    recaudo: recaudo.rows[0],
  }
}

// ── Exportar a Excel ────────────────────────────────────────────────────────

export async function exportarExcel(req, reply) {
  const { tipo } = req.params
  const { desde, hasta } = rangoFechas(req.query)
  const { sedeIds } = resolverSede(req)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Orquídea ERP'

  const estiloHeader = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E3192' } } }

  if (tipo === 'financiero') {
    const r = await financieroData({ desde, hasta, sedeIds })
    const ws = wb.addWorksheet('Financiero')
    ws.columns = [{ header: 'Concepto', key: 'c', width: 30 }, { header: 'Valor', key: 'v', width: 20 }]
    ws.addRow({ c: 'Ingresos por contratos', v: +r.ingresos_contratos.total })
    ws.addRow({ c: 'Ingresos por pólizas', v: +r.ingresos_polizas.total })
    ws.addRow({ c: 'Total ingresos', v: r.total_ingresos })
    ws.getRow(1).eachCell(c => Object.assign(c, estiloHeader))
  } else if (tipo === 'ventas') {
    const r = await ventasData({ desde, hasta, sedeIds })
    const ws = wb.addWorksheet('Ventas por asesor')
    ws.columns = [
      { header: 'Asesor', key: 'nombre', width: 28 },
      { header: 'Ventas', key: 'ventas', width: 12 },
      { header: 'Valor vendido', key: 'valor_vendido', width: 18 },
      { header: 'Comisión generada', key: 'comision_generada', width: 18 },
    ]
    r.asesores.forEach(a => ws.addRow(a))
    ws.getRow(1).eachCell(c => Object.assign(c, estiloHeader))
  } else if (tipo === 'cartera') {
    const r = await carteraData({ sedeIds })
    const ws = wb.addWorksheet('Cartera')
    ws.columns = [{ header: 'Estado', key: 'estado', width: 20 }, { header: 'Cantidad', key: 'cantidad', width: 14 }, { header: 'Valor cuotas', key: 'valor_cuotas', width: 18 }]
    r.por_estado.forEach(e => ws.addRow(e))
    ws.getRow(1).eachCell(c => Object.assign(c, estiloHeader))
  } else if (tipo === 'operativo') {
    const r = await operativoData({ desde, hasta, sedeIds })
    const ws = wb.addWorksheet('Servicios')
    ws.columns = [{ header: 'Estado', key: 'estado', width: 20 }, { header: 'Cantidad', key: 'cantidad', width: 14 }]
    r.servicios_por_estado.forEach(s => ws.addRow(s))
    ws.getRow(1).eachCell(c => Object.assign(c, estiloHeader))
    const ws2 = wb.addWorksheet('Inventario bajo stock')
    ws2.columns = [
      { header: 'SKU', key: 'codigo_sku', width: 16 }, { header: 'Producto', key: 'nombre', width: 30 },
      { header: 'Stock actual', key: 'stock_actual', width: 14 }, { header: 'Stock mínimo', key: 'stock_minimo', width: 14 },
    ]
    r.inventario_bajo_stock.forEach(p => ws2.addRow(p))
    ws2.getRow(1).eachCell(c => Object.assign(c, estiloHeader))
  } else {
    return reply.code(400).send({ error: 'Tipo de reporte inválido' })
  }

  const buffer = await wb.xlsx.writeBuffer()
  reply
    .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .header('Content-Disposition', `attachment; filename="reporte-${tipo}.xlsx"`)
    .send(buffer)
}

// ── 5. Análisis de consumo de materiales de tanatopraxia (con IA) ─────────
// tanatopraxia_materiales no tiene sede propia — hereda vía el servicio
// funerario al que pertenece (tanatopraxia_id → servicios_funerarios).

export async function analisisTanatopraxia(req, reply) {
  const { desde, hasta } = rangoFechas(req.query)
  const { sedeIds } = resolverSede(req)
  const params = [desde, hasta, sedeIds]

  const [porMes, porProducto, costoPorCuerpo] = await Promise.all([
    pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', tm.creado_en), 'YYYY-MM') AS mes,
        SUM(tm.cantidad * tm.costo_unitario) AS costo_total,
        COUNT(DISTINCT tm.tanatopraxia_id) AS cuerpos_preparados
      FROM tanatopraxia_materiales tm
      JOIN ordenes_tanatopraxia t ON t.id = tm.tanatopraxia_id
      JOIN servicios_funerarios sf ON sf.id = t.servicio_id
      WHERE tm.creado_en::date BETWEEN $1 AND $2
        AND ($3::uuid[] IS NULL OR sf.sede_id = ANY($3::uuid[]))
      GROUP BY 1 ORDER BY 1`,
      params
    ),
    pool.query(`
      SELECT p.nombre, p.codigo_sku,
        SUM(tm.cantidad) AS cantidad_total,
        SUM(tm.cantidad * tm.costo_unitario) AS costo_total,
        COUNT(DISTINCT tm.tanatopraxia_id) AS veces_usado
      FROM tanatopraxia_materiales tm
      JOIN inv_productos p ON p.id = tm.producto_id
      JOIN ordenes_tanatopraxia t ON t.id = tm.tanatopraxia_id
      JOIN servicios_funerarios sf ON sf.id = t.servicio_id
      WHERE tm.creado_en::date BETWEEN $1 AND $2
        AND ($3::uuid[] IS NULL OR sf.sede_id = ANY($3::uuid[]))
      GROUP BY p.id ORDER BY costo_total DESC`,
      params
    ),
    pool.query(`
      SELECT
        COUNT(DISTINCT tm.tanatopraxia_id) AS cuerpos_preparados,
        COALESCE(SUM(tm.cantidad * tm.costo_unitario), 0) AS costo_total
      FROM tanatopraxia_materiales tm
      JOIN ordenes_tanatopraxia t ON t.id = tm.tanatopraxia_id
      JOIN servicios_funerarios sf ON sf.id = t.servicio_id
      WHERE tm.creado_en::date BETWEEN $1 AND $2
        AND ($3::uuid[] IS NULL OR sf.sede_id = ANY($3::uuid[]))`,
      params
    ),
  ])

  const resumen = costoPorCuerpo.rows[0]
  const costoPromedio = resumen.cuerpos_preparados > 0
    ? resumen.costo_total / resumen.cuerpos_preparados : 0

  const data = {
    rango: { desde, hasta },
    por_mes: porMes.rows,
    por_producto: porProducto.rows,
    cuerpos_preparados: +resumen.cuerpos_preparados,
    costo_total: +resumen.costo_total,
    costo_promedio_por_cuerpo: +costoPromedio.toFixed(2),
  }

  if (!anthropic || porProducto.rows.length === 0) {
    return reply.send({
      data: { ...data, narrativa: null,
        narrativa_nota: !anthropic
          ? 'Configura ANTHROPIC_API_KEY en el servidor para generar el resumen narrativo.'
          : 'Sin datos suficientes en el rango seleccionado para generar un análisis.' },
    })
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `Eres un analista financiero de una funeraria. Con estos datos de consumo de materiales de preparación de cuerpos (tanatopraxia) entre ${desde} y ${hasta}, escribe un resumen ejecutivo breve en español (máximo 5-6 frases, sin encabezados ni markdown) que destaque: tendencia de gasto mes a mes, el producto más costoso o más usado, el costo promedio por cuerpo preparado, y cualquier variación relevante. Sé concreto y usa las cifras dadas.\n\nDatos JSON:\n${JSON.stringify(data)}`,
      }],
    })
    const narrativa = msg.content.find(b => b.type === 'text')?.text || null
    return reply.send({ data: { ...data, narrativa } })
  } catch (e) {
    return reply.send({ data: { ...data, narrativa: null, narrativa_nota: 'Error al generar el resumen con IA: ' + e.message } })
  }
}
