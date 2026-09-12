/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contabilidad — Catálogo de cuentas (PUC)             ║
 * ║  Archivo         : contabilidad.controller.js                           ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

const NIVELES = [1, 2, 3, 4, 5]
const NATURALEZAS = ['D', 'C']
const TIPOS = [
  'ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO',
  'COSTO_VENTAS', 'COSTO_PRODUCCION', 'ORDEN_DEUDORA', 'ORDEN_ACREEDORA'
]
const ORIGENES = ['PUC_ESTANDAR', 'TNS_VERIFICADA', 'PUC_COMPLEMENTARIO', 'ORQUIDEA']

// Árbol completo (o filtrado por búsqueda), listo para pintar un acordeón
export async function arbol(req, reply) {
  const { q, activa, origen } = req.query
  const conds = []
  const vals = []
  if (activa !== undefined) { conds.push(`activa = $${vals.length + 1}`); vals.push(activa !== 'false') }
  if (origen)               { conds.push(`origen = $${vals.length + 1}`); vals.push(origen) }

  let where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

  // Si hay búsqueda, traemos las cuentas que matchean + toda su cadena de padres,
  // para que el árbol se pueda pintar completo (no solo la hoja encontrada).
  if (q?.trim()) {
    const like = `%${q.trim()}%`
    const { rows } = await pool.query(
      `WITH RECURSIVE coincidencias AS (
         SELECT codigo, padre_codigo FROM contabilidad_puc
         WHERE (codigo ILIKE $1 OR nombre ILIKE $1) ${activa !== undefined ? 'AND activa = $2' : ''}
       ),
       ancestros AS (
         SELECT codigo, padre_codigo FROM coincidencias
         UNION
         SELECT p.codigo, p.padre_codigo
         FROM contabilidad_puc p
         JOIN ancestros a ON p.codigo = a.padre_codigo
       )
       SELECT p.* FROM contabilidad_puc p
       JOIN ancestros a ON p.codigo = a.codigo
       ORDER BY p.codigo`,
      activa !== undefined ? [like, activa !== 'false'] : [like]
    )
    return reply.send({ data: rows, meta: { total: rows.length }, error: null })
  }

  const { rows } = await pool.query(
    `SELECT * FROM contabilidad_puc ${where} ORDER BY codigo`, vals
  )
  return reply.send({ data: rows, meta: { total: rows.length }, error: null })
}

// Lista liviana para selects (solo cuentas de movimiento, activas)
export async function select(req, reply) {
  const { q } = req.query
  const conds = [`acepta_movimiento = TRUE`, `activa = TRUE`]
  const vals = []
  if (q?.trim()) { conds.push(`(codigo ILIKE $${vals.length + 1} OR nombre ILIKE $${vals.length + 1})`); vals.push(`%${q.trim()}%`) }
  const { rows } = await pool.query(
    `SELECT codigo, nombre, naturaleza, tipo, requiere_tercero, requiere_centro_costo
     FROM contabilidad_puc WHERE ${conds.join(' AND ')} ORDER BY codigo LIMIT 100`,
    vals
  )
  return reply.send({ data: rows, error: null })
}

export async function obtener(req, reply) {
  const { codigo } = req.params
  const { rows } = await pool.query(`SELECT * FROM contabilidad_puc WHERE codigo = $1`, [codigo])
  if (!rows.length) return reply.code(404).send({ data: null, error: 'Cuenta no encontrada' })
  return reply.send({ data: rows[0], error: null })
}

export async function crear(req, reply) {
  const {
    codigo, nombre, nivel, padre_codigo, naturaleza, tipo,
    requiere_tercero, requiere_centro_costo
  } = req.body

  if (!codigo?.trim())   return reply.code(400).send({ data: null, error: 'El código es requerido' })
  if (!nombre?.trim())   return reply.code(400).send({ data: null, error: 'El nombre es requerido' })
  if (!NIVELES.includes(Number(nivel)))
    return reply.code(400).send({ data: null, error: `nivel debe ser uno de: ${NIVELES.join(', ')}` })
  if (!NATURALEZAS.includes(naturaleza))
    return reply.code(400).send({ data: null, error: `naturaleza debe ser D o C` })
  if (!TIPOS.includes(tipo))
    return reply.code(400).send({ data: null, error: `tipo debe ser uno de: ${TIPOS.join(', ')}` })
  if (Number(nivel) > 1 && !padre_codigo?.trim())
    return reply.code(400).send({ data: null, error: 'padre_codigo es requerido salvo para cuentas de nivel 1 (clase)' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (padre_codigo) {
      const padre = await client.query(`SELECT codigo, clase_codigo FROM contabilidad_puc WHERE codigo = $1`, [padre_codigo])
      if (!padre.rows.length) throw Object.assign(new Error('La cuenta padre no existe'), { httpCode: 400 })
      // Una cuenta padre deja de aceptar movimiento en cuanto tiene un hijo
      await client.query(`UPDATE contabilidad_puc SET acepta_movimiento = FALSE WHERE codigo = $1`, [padre_codigo])
    }

    const claseCodigo = padre_codigo
      ? (await client.query(`SELECT clase_codigo FROM contabilidad_puc WHERE codigo = $1`, [padre_codigo])).rows[0].clase_codigo
      : codigo.trim()

    const { rows } = await client.query(
      `INSERT INTO contabilidad_puc
         (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo,
          acepta_movimiento, requiere_tercero, requiere_centro_costo, origen, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9,'ORQUIDEA',$10)
       RETURNING *`,
      [
        codigo.trim(), nombre.trim(), Number(nivel), padre_codigo || null, claseCodigo,
        naturaleza, tipo, !!requiere_tercero, !!requiere_centro_costo, req.user?.id || null
      ]
    )

    await client.query('COMMIT')
    return reply.code(201).send({ data: rows[0], error: null })
  } catch (e) {
    await client.query('ROLLBACK')
    if (e.code === '23505') return reply.code(409).send({ data: null, error: `Ya existe una cuenta con el código ${codigo}` })
    if (e.httpCode) return reply.code(e.httpCode).send({ data: null, error: e.message })
    throw e
  } finally {
    client.release()
  }
}

export async function actualizar(req, reply) {
  const { codigo } = req.params
  const { nombre, requiere_tercero, requiere_centro_costo } = req.body
  // Deliberadamente NO se permite cambiar nivel, padre, naturaleza ni tipo desde
  // este endpoint: alterar la jerarquía de una cuenta con movimientos históricos
  // rompería la trazabilidad contable. Para eso hay que anular e inactivar.
  const { rows } = await pool.query(
    `UPDATE contabilidad_puc SET
       nombre = COALESCE($2, nombre),
       requiere_tercero = COALESCE($3, requiere_tercero),
       requiere_centro_costo = COALESCE($4, requiere_centro_costo),
       actualizado = NOW()
     WHERE codigo = $1 RETURNING *`,
    [codigo, nombre?.trim() || null, requiere_tercero ?? null, requiere_centro_costo ?? null]
  )
  if (!rows.length) return reply.code(404).send({ data: null, error: 'Cuenta no encontrada' })
  return reply.send({ data: rows[0], error: null })
}

export async function toggleActiva(req, reply) {
  const { codigo } = req.params
  const { rows } = await pool.query(
    `UPDATE contabilidad_puc SET activa = NOT activa, actualizado = NOW() WHERE codigo = $1 RETURNING *`,
    [codigo]
  )
  if (!rows.length) return reply.code(404).send({ data: null, error: 'Cuenta no encontrada' })
  return reply.send({ data: rows[0], error: null })
}

export async function verificarOrigen(req, reply) {
  const { codigo } = req.params
  const { origen } = req.body
  if (!ORIGENES.includes(origen))
    return reply.code(400).send({ data: null, error: `origen debe ser uno de: ${ORIGENES.join(', ')}` })
  const { rows } = await pool.query(
    `UPDATE contabilidad_puc SET origen = $2, actualizado = NOW() WHERE codigo = $1 RETURNING *`,
    [codigo, origen]
  )
  if (!rows.length) return reply.code(404).send({ data: null, error: 'Cuenta no encontrada' })
  return reply.send({ data: rows[0], error: null })
}

// ── Libro diario: todos los comprobantes contabilizados, en orden cronológico,
// con sus líneas de asiento. Es la vista base desde la que se puede
// reconstruir cualquier otro reporte (mayor, balance de comprobación).
export async function libroDiario(req, reply) {
  const { desde, hasta, cuenta, tercero_id, evento_codigo, estado, q, page = 1, limit = 30 } = req.query
  const conds = []
  const vals = []
  if (desde)          { conds.push(`c.fecha_contable >= $${vals.length + 1}`); vals.push(desde) }
  if (hasta)           { conds.push(`c.fecha_contable <= $${vals.length + 1}`); vals.push(hasta) }
  if (tercero_id)      { conds.push(`c.tercero_id = $${vals.length + 1}`); vals.push(tercero_id) }
  if (evento_codigo)   { conds.push(`c.evento_codigo = $${vals.length + 1}`); vals.push(evento_codigo) }
  if (estado)          { conds.push(`c.estado = $${vals.length + 1}`); vals.push(estado) }
  if (cuenta)          { conds.push(`EXISTS (SELECT 1 FROM asientos_contables ax WHERE ax.comprobante_id = c.id AND ax.cuenta_codigo = $${vals.length + 1})`); vals.push(cuenta) }
  if (q?.trim())       { conds.push(`(c.numero ILIKE $${vals.length + 1} OR c.concepto ILIKE $${vals.length + 1})`); vals.push(`%${q.trim()}%`) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limitNum = Math.min(100, Math.max(1, +limit))
  const offset = (Math.max(1, +page) - 1) * limitNum

  const { rows: comprobantes } = await pool.query(
    `SELECT c.*,
       COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')),' ',TRIM(COALESCE(t.apellidos,'')))) AS tercero_nombre,
       s.nombre AS sede_nombre, u.nombre AS usuario_nombre
     FROM comprobantes_contables c
     LEFT JOIN terceros t ON t.id = c.tercero_id
     LEFT JOIN sedes s    ON s.id = c.sede_id
     LEFT JOIN usuarios u ON u.id = c.usuario_creador
     ${where}
     ORDER BY c.fecha_contable DESC, c.numero DESC
     LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
    [...vals, limitNum, offset]
  )

  const { rows: totalRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM comprobantes_contables c ${where}`, vals
  )

  if (!comprobantes.length) {
    return reply.send({ data: [], meta: { total: totalRows[0].total, page: +page, limit: limitNum } })
  }

  const ids = comprobantes.map(c => c.id)
  const { rows: asientos } = await pool.query(
    `SELECT a.*, p.nombre AS cuenta_nombre, p.naturaleza AS cuenta_naturaleza,
       COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')),' ',TRIM(COALESCE(t.apellidos,'')))) AS tercero_linea_nombre
     FROM asientos_contables a
     JOIN contabilidad_puc p ON p.codigo = a.cuenta_codigo
     LEFT JOIN terceros t ON t.id = a.tercero_id
     WHERE a.comprobante_id = ANY($1::uuid[])
     ORDER BY a.comprobante_id, a.orden`,
    [ids]
  )

  const porComprobante = new Map()
  for (const a of asientos) {
    if (!porComprobante.has(a.comprobante_id)) porComprobante.set(a.comprobante_id, [])
    porComprobante.get(a.comprobante_id).push(a)
  }

  const data = comprobantes.map(c => ({ ...c, lineas: porComprobante.get(c.id) || [] }))

  return reply.send({ data, meta: { total: totalRows[0].total, page: +page, limit: limitNum } })
}

// ── Libro Auxiliar: movimiento de UNA cuenta puntual, en orden cronológico,
// con saldo inicial (todo lo anterior a "desde") y saldo corrido después de
// cada asiento — el detalle que sustenta el saldo que el Balance de
// Comprobación solo muestra totalizado por cuenta.
export async function libroAuxiliar(req, reply) {
  const { cuenta, desde, hasta, tercero_id } = req.query
  if (!cuenta) return reply.code(400).send({ data: null, error: 'cuenta es requerida' })
  if (!desde || !hasta) return reply.code(400).send({ data: null, error: 'desde y hasta son requeridos' })

  const { rows: cuentaRows } = await pool.query(
    `SELECT codigo, nombre, naturaleza, tipo, nivel FROM contabilidad_puc WHERE codigo = $1`,
    [cuenta]
  )
  if (!cuentaRows.length) return reply.code(404).send({ data: null, error: 'Cuenta no encontrada' })
  const cuentaInfo = cuentaRows[0]

  // El auxiliar solo tiene sentido a nivel de cuentas hoja (las que reciben
  // movimiento directo) — a nivel de clase/grupo el saldo se arma sumando
  // varias cuentas, que es lo que ya hace el Balance de Comprobación.
  const condsTercero = tercero_id ? ` AND a.tercero_id = $4` : ''
  const valsTercero = tercero_id ? [tercero_id] : []

  const { rows: inicialRows } = await pool.query(`
    SELECT COALESCE(SUM(a.debe),0) AS debe, COALESCE(SUM(a.haber),0) AS haber
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    WHERE c.estado = 'CONTABILIZADO' AND a.cuenta_codigo = $1 AND c.fecha_contable < $2${tercero_id ? ` AND a.tercero_id = $3` : ''}
  `, tercero_id ? [cuenta, desde, tercero_id] : [cuenta, desde])

  const saldoInicial = saldoNeto(cuentaInfo, +inicialRows[0].debe, +inicialRows[0].haber)

  const { rows: movimientos } = await pool.query(`
    SELECT a.id AS asiento_id, a.debe, a.haber, a.descripcion,
      c.id AS comprobante_id, c.numero, c.tipo, c.fecha_contable, c.concepto, c.evento_codigo,
      COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')),' ',TRIM(COALESCE(t.apellidos,'')))) AS tercero_nombre
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    LEFT JOIN terceros t ON t.id = a.tercero_id
    WHERE c.estado = 'CONTABILIZADO' AND a.cuenta_codigo = $1
      AND c.fecha_contable BETWEEN $2 AND $3 ${condsTercero}
    ORDER BY c.fecha_contable, c.numero, a.orden
  `, [cuenta, desde, hasta, ...valsTercero])

  let saldo = saldoInicial
  let totalDebe = 0, totalHaber = 0
  const filas = movimientos.map(m => {
    const debe = +m.debe, haber = +m.haber
    totalDebe += debe; totalHaber += haber
    saldo += cuentaInfo.naturaleza === 'D' ? (debe - haber) : (haber - debe)
    return {
      comprobante_id: m.comprobante_id, numero: m.numero, tipo: m.tipo,
      fecha_contable: m.fecha_contable, concepto: m.concepto, descripcion: m.descripcion,
      evento_codigo: m.evento_codigo, tercero_nombre: m.tercero_nombre,
      debe, haber, saldo,
    }
  })

  return reply.send({
    data: filas,
    meta: {
      cuenta: cuentaInfo, desde, hasta,
      saldo_inicial: saldoInicial,
      total_debe: totalDebe, total_haber: totalHaber,
      saldo_final: saldo,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTES FINANCIEROS — Balance de Comprobación, Estado de Resultados,
// Estado de Situación Financiera.
//
// Estrategia común: se trae el movimiento agregado por cuenta HOJA (nivel
// donde realmente se contabiliza) desde asientos_contables, y luego se
// "sube" ese movimiento por la jerarquía del PUC (auxiliar → subcuenta →
// cuenta → grupo → clase) en memoria, igual que hacen TNS/Siigo al totalizar
// cada nivel. Solo se muestran ramas con movimiento — como en los PDF de
// TNS que revisamos — para no listar cientos de cuentas en cero.
// ═══════════════════════════════════════════════════════════════════════

async function cargarPucIndexado() {
  const { rows } = await pool.query(`SELECT * FROM contabilidad_puc ORDER BY codigo`)
  const porCodigo = new Map(rows.map(c => [c.codigo, c]))
  return { rows, porCodigo }
}

// Sube saldos de cuentas hoja a todos sus ancestros. `movimientos` es
// Map<codigo, {debe, haber}> ya calculado a nivel hoja.
function acumularJerarquia(porCodigo, movimientos) {
  const acumulado = new Map()
  const sumar = (codigo, debe, haber) => {
    let actual = codigo
    while (actual) {
      const prev = acumulado.get(actual) || { debe: 0, haber: 0 }
      acumulado.set(actual, { debe: prev.debe + debe, haber: prev.haber + haber })
      actual = porCodigo.get(actual)?.padre_codigo
    }
  }
  for (const [codigo, mov] of movimientos) sumar(codigo, mov.debe, mov.haber)
  return acumulado
}

// Saldo "neto" de una cuenta según su naturaleza: positivo cuando el saldo
// va en el sentido normal de la cuenta (D para activo/gasto/costo, C para
// pasivo/patrimonio/ingreso).
const saldoNeto = (cuenta, debe, haber) => cuenta.naturaleza === 'D' ? debe - haber : haber - debe

function construirFilas(porCodigo, mapaSaldos, { soloConMovimiento = true } = {}) {
  const filas = []
  for (const cuenta of porCodigo.values()) {
    const s = mapaSaldos.get(cuenta.codigo)
    if (!s && soloConMovimiento) continue
    filas.push({
      codigo: cuenta.codigo, nombre: cuenta.nombre, nivel: cuenta.nivel,
      padre_codigo: cuenta.padre_codigo, naturaleza: cuenta.naturaleza, tipo: cuenta.tipo,
      ...s,
    })
  }
  filas.sort((a, b) => a.codigo.localeCompare(b.codigo))
  return filas
}

// ── Balance de Comprobación ───────────────────────────────────────────────
export async function balanceComprobacion(req, reply) {
  const { desde, hasta } = req.query
  if (!desde || !hasta) return reply.code(400).send({ data: null, error: 'desde y hasta son requeridos' })

  const { porCodigo } = await cargarPucIndexado()

  const { rows: mov } = await pool.query(`
    SELECT a.cuenta_codigo,
      COALESCE(SUM(a.debe)  FILTER (WHERE c.fecha_contable <  $1), 0) AS debe_anterior,
      COALESCE(SUM(a.haber) FILTER (WHERE c.fecha_contable <  $1), 0) AS haber_anterior,
      COALESCE(SUM(a.debe)  FILTER (WHERE c.fecha_contable BETWEEN $1 AND $2), 0) AS debe_periodo,
      COALESCE(SUM(a.haber) FILTER (WHERE c.fecha_contable BETWEEN $1 AND $2), 0) AS haber_periodo
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    WHERE c.estado = 'CONTABILIZADO' AND c.fecha_contable <= $2
    GROUP BY a.cuenta_codigo
  `, [desde, hasta])

  const anteriores = new Map(mov.map(m => [m.cuenta_codigo, { debe: +m.debe_anterior, haber: +m.haber_anterior }]))
  const periodo     = new Map(mov.map(m => [m.cuenta_codigo, { debe: +m.debe_periodo,  haber: +m.haber_periodo }]))

  const acumAnterior = acumularJerarquia(porCodigo, anteriores)
  const acumPeriodo  = acumularJerarquia(porCodigo, periodo)

  const mapaSaldos = new Map()
  for (const codigo of new Set([...acumAnterior.keys(), ...acumPeriodo.keys()])) {
    const cuenta = porCodigo.get(codigo)
    if (!cuenta) continue
    const ant = acumAnterior.get(codigo) || { debe: 0, haber: 0 }
    const per = acumPeriodo.get(codigo)  || { debe: 0, haber: 0 }
    const debeFinal  = ant.debe  + per.debe
    const haberFinal = ant.haber + per.haber
    mapaSaldos.set(codigo, {
      saldo_anterior: saldoNeto(cuenta, ant.debe, ant.haber),
      debito_periodo: per.debe,
      credito_periodo: per.haber,
      saldo_final: saldoNeto(cuenta, debeFinal, haberFinal),
    })
  }

  const filas = construirFilas(porCodigo, mapaSaldos)
  const totalDebito  = filas.filter(f => f.nivel === 1).reduce((a, f) => a + f.debito_periodo, 0)
  const totalCredito = filas.filter(f => f.nivel === 1).reduce((a, f) => a + f.credito_periodo, 0)

  return reply.send({ data: filas, meta: { desde, hasta, total_debito: totalDebito, total_credito: totalCredito } })
}

// ── Estado de Resultados (P&G) ────────────────────────────────────────────
export async function estadoResultados(req, reply) {
  const { desde, hasta } = req.query
  if (!desde || !hasta) return reply.code(400).send({ data: null, error: 'desde y hasta son requeridos' })

  const { porCodigo } = await cargarPucIndexado()

  const { rows: mov } = await pool.query(`
    SELECT a.cuenta_codigo,
      COALESCE(SUM(a.debe), 0)  AS debe,
      COALESCE(SUM(a.haber), 0) AS haber
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    JOIN contabilidad_puc p ON p.codigo = a.cuenta_codigo
    WHERE c.estado = 'CONTABILIZADO' AND c.fecha_contable BETWEEN $1 AND $2
      AND p.clase_codigo IN ('4','5','6','7')
    GROUP BY a.cuenta_codigo
  `, [desde, hasta])

  const movimientos = new Map(mov.map(m => [m.cuenta_codigo, { debe: +m.debe, haber: +m.haber }]))
  const acum = acumularJerarquia(porCodigo, movimientos)

  const mapaSaldos = new Map()
  for (const [codigo, m] of acum) {
    const cuenta = porCodigo.get(codigo)
    if (!cuenta) continue
    mapaSaldos.set(codigo, { valor: saldoNeto(cuenta, m.debe, m.haber) })
  }

  const filas = construirFilas(porCodigo, mapaSaldos)

  const porClase = (clase) => filas.filter(f => f.nivel === 1 && f.codigo === clase)[0]?.valor || 0
  const porGrupo  = (grupo) => filas.filter(f => f.nivel === 2 && f.codigo === grupo)[0]?.valor || 0

  // Cascada estándar de un Estado de Resultados (la misma que arman
  // Siigo/World Office/TNS): ingresos operacionales netos de su costo dan
  // la utilidad bruta; se le restan los gastos operacionales separados por
  // área (administración/ventas, PUC 51/52) para llegar a la utilidad
  // operacional; por último se suman/restan las partidas no operacionales
  // (PUC 42 ingresos, 53 gastos financieros y otros) para la utilidad neta.
  const ingresosOperacionales   = porGrupo('41')
  const ingresosNoOperacionales = porGrupo('42')
  const costoVentas             = porClase('6')
  const costoProduccion         = porClase('7')
  const gastosAdmon             = porGrupo('51')
  const gastosVentas            = porGrupo('52')
  const gastosNoOperacionales   = porGrupo('53')
  const totalGastos             = porClase('5')

  const utilidadBruta = ingresosOperacionales - costoVentas - costoProduccion
  const gastosOperacionales = gastosAdmon + gastosVentas
  const utilidadOperacional = utilidadBruta - gastosOperacionales
  const utilidadNeta = utilidadOperacional + ingresosNoOperacionales - gastosNoOperacionales

  // Márgenes sobre el ingreso operacional — el indicador que de verdad se
  // lee en un P&G (no tiene sentido calcularlos si no hubo ventas todavía).
  const margen = (valor) => ingresosOperacionales > 0 ? (valor / ingresosOperacionales) * 100 : null

  return reply.send({
    data: filas,
    meta: {
      desde, hasta,
      ingresos_operacionales: ingresosOperacionales,
      ingresos_no_operacionales: ingresosNoOperacionales,
      total_ingresos: ingresosOperacionales + ingresosNoOperacionales,
      costo_ventas: costoVentas,
      costo_produccion: costoProduccion,
      utilidad_bruta: utilidadBruta,
      gastos_admon: gastosAdmon,
      gastos_ventas: gastosVentas,
      gastos_operacionales: gastosOperacionales,
      utilidad_operacional: utilidadOperacional,
      gastos_no_operacionales: gastosNoOperacionales,
      total_gastos: totalGastos,
      utilidad_neta: utilidadNeta,
      margen_bruto: margen(utilidadBruta),
      margen_operacional: margen(utilidadOperacional),
      margen_neto: margen(utilidadNeta),
    },
  })
}

// ── Estado de Situación Financiera (Balance General) ──────────────────────
export async function estadoSituacion(req, reply) {
  const { hasta } = req.query
  if (!hasta) return reply.code(400).send({ data: null, error: 'hasta es requerido' })
  const anioInicio = `${new Date(hasta).getFullYear()}-01-01`

  const { porCodigo } = await cargarPucIndexado()

  const { rows: mov } = await pool.query(`
    SELECT a.cuenta_codigo,
      COALESCE(SUM(a.debe), 0)  AS debe,
      COALESCE(SUM(a.haber), 0) AS haber
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    JOIN contabilidad_puc p ON p.codigo = a.cuenta_codigo
    WHERE c.estado = 'CONTABILIZADO' AND c.fecha_contable <= $1
      AND p.clase_codigo IN ('1','2','3')
    GROUP BY a.cuenta_codigo
  `, [hasta])

  const movimientos = new Map(mov.map(m => [m.cuenta_codigo, { debe: +m.debe, haber: +m.haber }]))
  const acum = acumularJerarquia(porCodigo, movimientos)

  const mapaSaldos = new Map()
  for (const [codigo, m] of acum) {
    const cuenta = porCodigo.get(codigo)
    if (!cuenta) continue
    mapaSaldos.set(codigo, { valor: saldoNeto(cuenta, m.debe, m.haber) })
  }

  const filas = construirFilas(porCodigo, mapaSaldos)
  const totalActivo     = filas.find(f => f.nivel === 1 && f.codigo === '1')?.valor || 0
  const totalPasivo     = filas.find(f => f.nivel === 1 && f.codigo === '2')?.valor || 0
  const subtotalPatrimonio = filas.find(f => f.nivel === 1 && f.codigo === '3')?.valor || 0

  // Utilidad/pérdida del ejercicio corrido (desde el 1 de enero del año de
  // "hasta"), igual que TNS: se suma aparte al patrimonio porque aún no
  // existe un cierre contable formal que la traslade a resultados acumulados.
  const resultadosReq = await estadoResultadosInterno(anioInicio, hasta)
  const utilidadEjercicio = resultadosReq.utilidad_neta

  const totalPatrimonio = subtotalPatrimonio + utilidadEjercicio

  return reply.send({
    data: filas,
    meta: {
      hasta,
      total_activo: totalActivo,
      total_pasivo: totalPasivo,
      subtotal_patrimonio: subtotalPatrimonio,
      utilidad_ejercicio: utilidadEjercicio,
      total_patrimonio: totalPatrimonio,
      total_pasivo_patrimonio: totalPasivo + totalPatrimonio,
      cuadra: Math.abs(totalActivo - (totalPasivo + totalPatrimonio)) < 1,
    },
  })
}

// ── Flujo de Caja ──────────────────────────────────────────────────────────
// Movimiento de las cuentas de DISPONIBLE (grupo 11: caja, bancos,
// cooperativas) en el tiempo — no es el flujo de efectivo NIIF completo
// (que reclasifica por actividad operativa/inversión/financiación, algo que
// este sistema aún no tipifica por evento), sino el más útil en el día a
// día: cuánto entró, cuánto salió y el saldo acumulado, con el desglose de
// qué operación generó cada movimiento.
const GRANULARIDADES = { dia: 'day', semana: 'week', mes: 'month' }

export async function flujoCaja(req, reply) {
  const { desde, hasta, granularidad = 'dia' } = req.query
  if (!desde || !hasta) return reply.code(400).send({ data: null, error: 'desde y hasta son requeridos' })
  const trunc = GRANULARIDADES[granularidad] || 'day'

  const { rows: cuentasDisponible } = await pool.query(
    `SELECT codigo FROM contabilidad_puc WHERE clase_codigo = '1' AND acepta_movimiento = TRUE
     AND (padre_codigo = '11' OR padre_codigo IN (
       SELECT codigo FROM contabilidad_puc WHERE padre_codigo = '11'
     ) OR padre_codigo IN (
       SELECT codigo FROM contabilidad_puc WHERE padre_codigo IN (
         SELECT codigo FROM contabilidad_puc WHERE padre_codigo = '11'
       )
     ))`
  )
  const codigosDisponible = cuentasDisponible.map(c => c.codigo)
  if (!codigosDisponible.length) {
    return reply.send({ data: { serie: [], entradas: [], salidas: [] }, meta: { saldo_inicial: 0, total_entradas: 0, total_salidas: 0, saldo_final: 0 } })
  }

  const { rows: inicialRows } = await pool.query(`
    SELECT COALESCE(SUM(a.debe),0) - COALESCE(SUM(a.haber),0) AS saldo
    FROM asientos_contables a JOIN comprobantes_contables c ON c.id = a.comprobante_id
    WHERE c.estado = 'CONTABILIZADO' AND c.fecha_contable < $1 AND a.cuenta_codigo = ANY($2::text[])
  `, [desde, codigosDisponible])
  const saldoInicial = +inicialRows[0].saldo

  const { rows: serie } = await pool.query(`
    SELECT date_trunc($3, c.fecha_contable)::date AS periodo,
      COALESCE(SUM(a.debe),0) AS entradas, COALESCE(SUM(a.haber),0) AS salidas
    FROM asientos_contables a JOIN comprobantes_contables c ON c.id = a.comprobante_id
    WHERE c.estado = 'CONTABILIZADO' AND c.fecha_contable BETWEEN $1 AND $2 AND a.cuenta_codigo = ANY($4::text[])
    GROUP BY periodo ORDER BY periodo
  `, [desde, hasta, trunc, codigosDisponible])

  let acumulado = saldoInicial
  const serieConAcumulado = serie.map(r => {
    acumulado += (+r.entradas - +r.salidas)
    return { periodo: r.periodo, entradas: +r.entradas, salidas: +r.salidas, saldo_acumulado: acumulado }
  })

  const { rows: entradasPorEvento } = await pool.query(`
    SELECT COALESCE(rc.nombre, c.tipo) AS concepto, SUM(a.debe) AS total
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    LEFT JOIN reglas_contables rc ON rc.evento_codigo = c.evento_codigo
    WHERE c.estado='CONTABILIZADO' AND c.fecha_contable BETWEEN $1 AND $2
      AND a.cuenta_codigo = ANY($3::text[]) AND a.debe > 0
    GROUP BY COALESCE(rc.nombre, c.tipo) ORDER BY total DESC LIMIT 8
  `, [desde, hasta, codigosDisponible])

  const { rows: salidasPorEvento } = await pool.query(`
    SELECT COALESCE(rc.nombre, c.tipo) AS concepto, SUM(a.haber) AS total
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    LEFT JOIN reglas_contables rc ON rc.evento_codigo = c.evento_codigo
    WHERE c.estado='CONTABILIZADO' AND c.fecha_contable BETWEEN $1 AND $2
      AND a.cuenta_codigo = ANY($3::text[]) AND a.haber > 0
    GROUP BY COALESCE(rc.nombre, c.tipo) ORDER BY total DESC LIMIT 8
  `, [desde, hasta, codigosDisponible])

  const totalEntradas = serieConAcumulado.reduce((a, s) => a + s.entradas, 0)
  const totalSalidas  = serieConAcumulado.reduce((a, s) => a + s.salidas, 0)

  return reply.send({
    data: {
      serie: serieConAcumulado,
      entradas: entradasPorEvento.map(r => ({ concepto: r.concepto, total: +r.total })),
      salidas: salidasPorEvento.map(r => ({ concepto: r.concepto, total: +r.total })),
    },
    meta: {
      desde, hasta, granularidad,
      saldo_inicial: saldoInicial,
      total_entradas: totalEntradas,
      total_salidas: totalSalidas,
      saldo_final: saldoInicial + totalEntradas - totalSalidas,
    },
  })
}

// Versión interna (sin req/reply) reutilizada por estadoSituacion para
// calcular la utilidad del ejercicio corrido sin duplicar la consulta SQL.
async function estadoResultadosInterno(desde, hasta) {
  const { porCodigo } = await cargarPucIndexado()
  const { rows: mov } = await pool.query(`
    SELECT a.cuenta_codigo, COALESCE(SUM(a.debe),0) AS debe, COALESCE(SUM(a.haber),0) AS haber
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    JOIN contabilidad_puc p ON p.codigo = a.cuenta_codigo
    WHERE c.estado = 'CONTABILIZADO' AND c.fecha_contable BETWEEN $1 AND $2
      AND p.clase_codigo IN ('4','5','6','7')
    GROUP BY a.cuenta_codigo
  `, [desde, hasta])
  const movimientos = new Map(mov.map(m => [m.cuenta_codigo, { debe: +m.debe, haber: +m.haber }]))
  const acum = acumularJerarquia(porCodigo, movimientos)
  const valor = (codigo) => {
    const m = acum.get(codigo)
    const cuenta = porCodigo.get(codigo)
    if (!m || !cuenta) return 0
    return saldoNeto(cuenta, m.debe, m.haber)
  }
  const ingresosOperacionales   = valor('41')
  const ingresosNoOperacionales = valor('42')
  const costoVentas             = valor('6')
  const costoProduccion         = valor('7')
  const totalGastos             = valor('5')
  const utilidadBruta = ingresosOperacionales - costoVentas - costoProduccion
  const utilidadNeta = utilidadBruta + ingresosNoOperacionales - totalGastos
  return { utilidad_neta: utilidadNeta }
}

// Resumen rápido para KPIs del libro diario (total debe/haber del rango, cantidad).
export async function libroDiarioResumen(req, reply) {
  const { desde, hasta } = req.query
  const conds = []
  const vals = []
  if (desde) { conds.push(`fecha_contable >= $${vals.length + 1}`); vals.push(desde) }
  if (hasta) { conds.push(`fecha_contable <= $${vals.length + 1}`); vals.push(hasta) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total_comprobantes,
       COALESCE(SUM(total_debe) FILTER (WHERE estado = 'CONTABILIZADO'), 0) AS total_debe,
       COALESCE(SUM(total_haber) FILTER (WHERE estado = 'CONTABILIZADO'), 0) AS total_haber,
       COUNT(*) FILTER (WHERE estado = 'ANULADO')::int AS anulados
     FROM comprobantes_contables c ${where}`,
    vals
  )
  return reply.send({ data: rows[0] })
}

export async function resumen(req, reply) {
  const { rows } = await pool.query(
    `SELECT origen, nivel, COUNT(*)::int AS total
     FROM contabilidad_puc GROUP BY origen, nivel ORDER BY nivel, origen`
  )
  const pendientesValidar = await pool.query(
    `SELECT COUNT(*)::int AS total FROM contabilidad_puc WHERE origen = 'PUC_COMPLEMENTARIO'`
  )
  return reply.send({
    data: { porNivelYOrigen: rows, pendientesValidar: pendientesValidar.rows[0].total },
    error: null
  })
}
