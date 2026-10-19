/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — cuentas, movimientos, traslados,         ║
 * ║                    conciliación bancaria                                ║
 * ║  Archivo         : tesoreriaCuentas.controller.js                       ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Cada cuenta de tesorería = una subcuenta del PUC (tesoreria_cuentas). El
 * saldo y los movimientos se leen de asientos_contables con la MISMA regla
 * del libro mayor (estados CONTABILIZADO y ANULADO: el anulado y su reverso
 * se compensan). Nada se digita dos veces.
 */
import pool from '../config/database.js'
import { crearComprobanteTraslado, reversarComprobante } from '../services/contabilidad.service.js'

const EN_LIBROS = `c.estado IN ('CONTABILIZADO','ANULADO')`
const TIPOS = ['CAJA_GENERAL', 'CAJA_MENOR', 'CORRIENTE', 'AHORROS', 'COOPERATIVA', 'BILLETERA', 'OTRO']
// Cuenta padre del PUC donde se crea la subcuenta nueva según el tipo
const PADRE_PUC = { CAJA_GENERAL: '110505', CAJA_MENOR: '110510', CORRIENTE: '111005', AHORROS: '111005', BILLETERA: '111005', COOPERATIVA: '112015', OTRO: '111005' }
const err = (msg, code = 400) => Object.assign(new Error(msg), { httpCode: code })

// ── Cuentas ────────────────────────────────────────────────────────────────
export async function listarCuentas(req, reply) {
  const { rows } = await pool.query(`
    SELECT tc.*, p.nombre AS puc_nombre, s.nombre AS sede_nombre,
      COALESCE(m.saldo, 0)::float AS saldo,
      COALESCE(m.entradas_mes, 0)::float AS entradas_mes, COALESCE(m.salidas_mes, 0)::float AS salidas_mes,
      m.ultimo_movimiento,
      COALESCE(m.sin_conciliar, 0)::int AS sin_conciliar,
      (SELECT COALESCE(json_agg(json_build_object('codigo', f.codigo, 'nombre', f.nombre, 'icono', f.icono) ORDER BY f.orden), '[]')
         FROM formas_pago f WHERE f.activo AND f.cuenta_contable_codigo = tc.cuenta_contable_codigo) AS formas_pago
    FROM tesoreria_cuentas tc
    JOIN contabilidad_puc p ON p.codigo = tc.cuenta_contable_codigo
    LEFT JOIN sedes s ON s.id = tc.sede_id
    LEFT JOIN LATERAL (
      SELECT SUM(a.debe - a.haber) AS saldo,
        SUM(a.debe) FILTER (WHERE date_trunc('month', c.fecha_contable) = date_trunc('month', CURRENT_DATE)) AS entradas_mes,
        SUM(a.haber) FILTER (WHERE date_trunc('month', c.fecha_contable) = date_trunc('month', CURRENT_DATE)) AS salidas_mes,
        MAX(c.fecha_contable) AS ultimo_movimiento,
        COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM tesoreria_conciliados tq WHERE tq.asiento_id = a.id)) AS sin_conciliar
      FROM asientos_contables a JOIN comprobantes_contables c ON c.id = a.comprobante_id
      WHERE a.cuenta_codigo = tc.cuenta_contable_codigo AND ${EN_LIBROS}
    ) m ON TRUE
    ORDER BY tc.activa DESC, CASE tc.tipo WHEN 'CAJA_GENERAL' THEN 0 WHEN 'CAJA_MENOR' THEN 1 ELSE 2 END, tc.nombre`)

  const activas = rows.filter(r => r.activa)
  const suma = f => activas.filter(f).reduce((t, r) => t + r.saldo, 0)
  const esCaja = r => ['CAJA_GENERAL', 'CAJA_MENOR'].includes(r.tipo)
  return reply.send({
    data: rows,
    kpis: {
      saldo_total: suma(() => true), cuentas: activas.length,
      bancos: suma(r => !esCaja(r)), caja: suma(esCaja),
      sin_conciliar: activas.reduce((t, r) => t + r.sin_conciliar, 0),
    },
  })
}

// Subcuentas de caja/bancos del PUC que todavía no tienen cuenta de tesorería
export async function pucDisponibles(req, reply) {
  const { rows } = await pool.query(`
    SELECT p.codigo, p.nombre FROM contabilidad_puc p
    WHERE p.acepta_movimiento AND p.activa AND (p.codigo LIKE '1105%' OR p.codigo LIKE '1110%' OR p.codigo LIKE '1120%')
      AND NOT EXISTS (SELECT 1 FROM tesoreria_cuentas tc WHERE tc.cuenta_contable_codigo = p.codigo)
    ORDER BY p.codigo`)
  const formas = await pool.query(`SELECT codigo, nombre, icono, cuenta_contable_codigo FROM formas_pago WHERE activo ORDER BY orden`)
  return reply.send({ data: rows, formas_pago: formas.rows })
}

async function crearAuxiliarPuc(client, tipo, nombre, usuario_id) {
  const padre = PADRE_PUC[tipo] || '111005'
  const { rows } = await client.query(`SELECT codigo FROM contabilidad_puc WHERE padre_codigo = $1 ORDER BY codigo`, [padre])
  const usados = rows.map(r => +String(r.codigo).split('.')[1] || 0)
  const sig = String((usados.length ? Math.max(...usados) : 0) + 1).padStart(2, '0')
  const codigo = `${padre}.${sig}`
  const p = (await client.query(`SELECT * FROM contabilidad_puc WHERE codigo = $1`, [padre])).rows[0]
  if (!p) throw err(`No existe la cuenta ${padre} en el PUC`)
  await client.query(`
    INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, acepta_movimiento, requiere_tercero, origen, activa, creado_por)
    VALUES ($1,$2,5,$3,$4,$5,$6,TRUE,FALSE,'ORQUIDEA',TRUE,$7)`,
    [codigo, nombre, padre, p.clase_codigo, p.naturaleza, p.tipo, usuario_id])
  return codigo
}

async function vincularFormas(client, codigoCuenta, formas) {
  if (!Array.isArray(formas)) return
  // Las formas elegidas pasan a entrar a esta cuenta (no se desvinculan otras)
  if (formas.length) await client.query(`UPDATE formas_pago SET cuenta_contable_codigo = $1 WHERE codigo = ANY($2)`, [codigoCuenta, formas])
}

function validar(b) {
  if (!b.nombre?.trim()) throw err('El nombre de la cuenta es obligatorio')
  if (!TIPOS.includes(b.tipo)) throw err('Tipo de cuenta no válido')
}

export async function crearCuenta(req, reply) {
  const b = req.body || {}
  const client = await pool.connect()
  try {
    validar(b)
    await client.query('BEGIN')
    let codigo = b.cuenta_contable_codigo
    if (!codigo) codigo = await crearAuxiliarPuc(client, b.tipo, b.nombre.trim(), req.user.id)
    const ok = await client.query(`SELECT 1 FROM contabilidad_puc WHERE codigo = $1 AND acepta_movimiento AND activa`, [codigo])
    if (!ok.rows.length) throw err('La cuenta contable elegida no existe o no acepta movimiento')
    const { rows } = await client.query(`
      INSERT INTO tesoreria_cuentas (nombre, banco, tipo, numero_cuenta, titular, cuenta_contable_codigo, sede_id, color, creado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.nombre.trim(), b.banco || null, b.tipo, b.numero_cuenta || null, b.titular || null, codigo, b.sede_id || null, b.color || null, req.user.id])
    await vincularFormas(client, codigo, b.formas_pago)
    await client.query('COMMIT')
    return reply.code(201).send({ data: rows[0] })
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    if (e.code === '23505') return reply.code(409).send({ error: 'Esa cuenta contable ya está asignada a otra cuenta de tesorería' })
    return reply.code(e.httpCode || 500).send({ error: e.message })
  } finally { client.release() }
}

export async function actualizarCuenta(req, reply) {
  const b = req.body || {}
  const client = await pool.connect()
  try {
    validar(b)
    await client.query('BEGIN')
    const { rows } = await client.query(`
      UPDATE tesoreria_cuentas SET nombre=$2, banco=$3, tipo=$4, numero_cuenta=$5, titular=$6, sede_id=$7, color=$8,
        activa = COALESCE($9, activa), actualizado = NOW()
      WHERE id = $1 RETURNING *`,
      [req.params.id, b.nombre.trim(), b.banco || null, b.tipo, b.numero_cuenta || null, b.titular || null, b.sede_id || null, b.color || null,
       typeof b.activa === 'boolean' ? b.activa : null])
    if (!rows.length) throw err('Cuenta no encontrada', 404)
    await vincularFormas(client, rows[0].cuenta_contable_codigo, b.formas_pago)
    await client.query('COMMIT')
    return reply.send({ data: rows[0] })
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    return reply.code(e.httpCode || 500).send({ error: e.message })
  } finally { client.release() }
}

// ── Movimientos (desde la contabilidad) ────────────────────────────────────
export async function movimientos(req, reply) {
  const { cuenta_id, desde, hasta, q = '', tipo = '', conciliado = '' } = req.query
  const cuentas = (await pool.query(`SELECT id, nombre, cuenta_contable_codigo FROM tesoreria_cuentas ${cuenta_id ? 'WHERE id = $1' : 'WHERE activa'}`,
    cuenta_id ? [cuenta_id] : [])).rows
  if (!cuentas.length) return reply.send({ data: [], saldo_inicial: 0, totales: { entradas: 0, salidas: 0 } })
  const codigos = cuentas.map(c => c.cuenta_contable_codigo)
  const d = desde || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const h = hasta || new Date().toISOString().slice(0, 10)

  const ini = await pool.query(`
    SELECT COALESCE(SUM(a.debe - a.haber), 0)::float AS s FROM asientos_contables a JOIN comprobantes_contables c ON c.id = a.comprobante_id
    WHERE a.cuenta_codigo = ANY($1) AND ${EN_LIBROS} AND c.fecha_contable < $2`, [codigos, d])

  const vals = [codigos, d, h]
  const conds = []
  if (q.trim()) { vals.push(`%${q.trim()}%`); conds.push(`busca(concat_ws(' ', c.numero, c.concepto, a.descripcion, c.referencia, COALESCE(t.nombres||' '||t.apellidos, t.razon_social)), $${vals.length})`) }
  if (tipo === 'entrada') conds.push('a.debe > 0')
  if (tipo === 'salida') conds.push('a.haber > 0')
  if (conciliado === 'si') conds.push('tq.asiento_id IS NOT NULL')
  if (conciliado === 'no') conds.push('tq.asiento_id IS NULL')

  const { rows } = await pool.query(`
    SELECT a.id, a.cuenta_codigo, a.debe::float AS entrada, a.haber::float AS salida, a.descripcion,
      c.id AS comprobante_id, c.numero, c.tipo AS comprobante_tipo, c.fecha_contable::text AS fecha, c.concepto, c.estado,
      c.referencia, c.evento_codigo, c.documento_origen_tipo, c.creado_en,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS tercero,
      u.nombre AS usuario, tc.nombre AS cuenta_nombre, tc.id AS cuenta_id,
      (tq.asiento_id IS NOT NULL) AS conciliado
    FROM asientos_contables a
    JOIN comprobantes_contables c ON c.id = a.comprobante_id
    JOIN tesoreria_cuentas tc ON tc.cuenta_contable_codigo = a.cuenta_codigo
    LEFT JOIN terceros t ON t.id = COALESCE(a.tercero_id, c.tercero_id)
    LEFT JOIN usuarios u ON u.id = c.usuario_creador
    LEFT JOIN tesoreria_conciliados tq ON tq.asiento_id = a.id
    WHERE a.cuenta_codigo = ANY($1) AND ${EN_LIBROS} AND c.fecha_contable BETWEEN $2 AND $3
      ${conds.length ? 'AND ' + conds.join(' AND ') : ''}
    ORDER BY c.fecha_contable, c.creado_en, a.orden`, vals)

  // Saldo corrido (solo tiene sentido sin filtros que oculten filas)
  let saldo = ini.rows[0].s
  const filtrado = !!(q.trim() || tipo || conciliado)
  for (const r of rows) { saldo += r.entrada - r.salida; r.saldo = filtrado ? null : Math.round(saldo * 100) / 100 }
  const totales = { entradas: rows.reduce((t, r) => t + r.entrada, 0), salidas: rows.reduce((t, r) => t + r.salida, 0) }
  return reply.send({ data: rows.reverse(), saldo_inicial: ini.rows[0].s, saldo_final: filtrado ? null : saldo, totales, desde: d, hasta: h })
}

// ── Traslados ──────────────────────────────────────────────────────────────
export async function listarTraslados(req, reply) {
  const { rows } = await pool.query(`
    SELECT tr.*, o.nombre AS origen_nombre, de.nombre AS destino_nombre, c.numero AS comprobante_numero,
      u.nombre AS usuario_nombre, ua.nombre AS anulado_por_nombre
    FROM tesoreria_traslados tr
    JOIN tesoreria_cuentas o ON o.id = tr.cuenta_origen_id
    JOIN tesoreria_cuentas de ON de.id = tr.cuenta_destino_id
    LEFT JOIN comprobantes_contables c ON c.id = tr.comprobante_id
    LEFT JOIN usuarios u ON u.id = tr.usuario_id
    LEFT JOIN usuarios ua ON ua.id = tr.anulado_por
    ORDER BY tr.fecha DESC, tr.creado_en DESC LIMIT 300`)
  return reply.send({ data: rows })
}

export async function crearTraslado(req, reply) {
  const { cuenta_origen_id, cuenta_destino_id, monto, fecha, descripcion, referencia } = req.body || {}
  const client = await pool.connect()
  try {
    if (!descripcion?.trim()) throw err('Escriba el motivo del traslado')
    await client.query('BEGIN')
    const cs = (await client.query(`SELECT id, nombre, cuenta_contable_codigo, activa FROM tesoreria_cuentas WHERE id = ANY($1)`,
      [[cuenta_origen_id, cuenta_destino_id]])).rows
    const o = cs.find(c => c.id === cuenta_origen_id), de = cs.find(c => c.id === cuenta_destino_id)
    if (!o || !de) throw err('Seleccione la cuenta de origen y la de destino')
    if (!o.activa || !de.activa) throw err('Una de las cuentas está inactiva')
    const comp = await crearComprobanteTraslado(client, {
      cuenta_origen_codigo: o.cuenta_contable_codigo, cuenta_destino_codigo: de.cuenta_contable_codigo, monto,
      concepto: `Traslado ${o.nombre} → ${de.nombre}: ${descripcion.trim()}`, referencia: referencia || null,
      sede_id: req.user.sede_id || null, usuario_id: req.user.id, fecha: fecha || null,
    })
    const { rows } = await client.query(`
      INSERT INTO tesoreria_traslados (cuenta_origen_id, cuenta_destino_id, monto, fecha, descripcion, referencia, comprobante_id, usuario_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [o.id, de.id, monto, comp.fecha, descripcion.trim(), referencia || null, comp.id, req.user.id])
    await client.query('COMMIT')
    return reply.code(201).send({ data: { ...rows[0], comprobante_numero: comp.numero } })
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    return reply.code(e.httpCode || 500).send({ error: e.message })
  } finally { client.release() }
}

export async function anularTraslado(req, reply) {
  const motivo = String(req.body?.motivo || '').trim()
  if (motivo.length < 5) return reply.code(400).send({ error: 'Indique el motivo de la anulación (mínimo 5 caracteres)' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const t = (await client.query(`SELECT * FROM tesoreria_traslados WHERE id = $1 FOR UPDATE`, [req.params.id])).rows[0]
    if (!t) throw err('Traslado no encontrado', 404)
    if (t.estado === 'ANULADO') throw err('El traslado ya está anulado')
    if (t.comprobante_id) await reversarComprobante(client, t.comprobante_id, { motivo, usuario_id: req.user.id })
    await client.query(`UPDATE tesoreria_traslados SET estado='ANULADO', anulado_por=$2, anulado_en=NOW(), motivo_anulacion=$3 WHERE id=$1`,
      [t.id, req.user.id, motivo])
    await client.query('COMMIT')
    return reply.send({ ok: true })
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    return reply.code(e.httpCode || 500).send({ error: e.message })
  } finally { client.release() }
}

// ── Conciliación bancaria ──────────────────────────────────────────────────
async function saldoLibros(client, codigo, hasta) {
  const r = await client.query(`
    SELECT COALESCE(SUM(a.debe - a.haber), 0)::float AS s FROM asientos_contables a JOIN comprobantes_contables c ON c.id = a.comprobante_id
    WHERE a.cuenta_codigo = $1 AND ${EN_LIBROS} AND c.fecha_contable <= $2`, [codigo, hasta])
  return r.rows[0].s
}

export async function listarConciliaciones(req, reply) {
  const { rows } = await pool.query(`
    SELECT cq.*, tc.nombre AS cuenta_nombre, tc.cuenta_contable_codigo, u.nombre AS usuario_nombre, uc.nombre AS cerrada_por_nombre,
      (SELECT COUNT(*)::int FROM tesoreria_conciliados x WHERE x.conciliacion_id = cq.id) AS marcados
    FROM tesoreria_conciliaciones cq JOIN tesoreria_cuentas tc ON tc.id = cq.cuenta_id
    LEFT JOIN usuarios u ON u.id = cq.usuario_id LEFT JOIN usuarios uc ON uc.id = cq.cerrada_por
    ${req.query.cuenta_id ? 'WHERE cq.cuenta_id = $1' : ''}
    ORDER BY cq.periodo DESC, tc.nombre`, req.query.cuenta_id ? [req.query.cuenta_id] : [])
  return reply.send({ data: rows })
}

export async function crearConciliacion(req, reply) {
  const { cuenta_id, periodo, saldo_extracto = 0, observaciones } = req.body || {}
  if (!/^\d{4}-\d{2}$/.test(periodo || '')) return reply.code(400).send({ error: 'Periodo no válido (AAAA-MM)' })
  const [y, m] = periodo.split('-').map(Number)
  const corte = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  try {
    const { rows } = await pool.query(`
      INSERT INTO tesoreria_conciliaciones (cuenta_id, periodo, fecha_corte, saldo_extracto, observaciones, usuario_id)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [cuenta_id, periodo, corte, Number(saldo_extracto) || 0, observaciones || null, req.user.id])
    return reply.code(201).send({ data: rows[0] })
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ error: 'Ya existe una conciliación de esa cuenta para ese mes' })
    throw e
  }
}

export async function obtenerConciliacion(req, reply) {
  const cq = (await pool.query(`
    SELECT cq.*, tc.nombre AS cuenta_nombre, tc.cuenta_contable_codigo, tc.banco, tc.numero_cuenta
    FROM tesoreria_conciliaciones cq JOIN tesoreria_cuentas tc ON tc.id = cq.cuenta_id WHERE cq.id = $1`, [req.params.id])).rows[0]
  if (!cq) return reply.code(404).send({ error: 'Conciliación no encontrada' })
  // Movimientos hasta el corte que no estén conciliados en OTRA conciliación
  const { rows } = await pool.query(`
    SELECT a.id, a.debe::float AS entrada, a.haber::float AS salida, c.numero, c.fecha_contable::text AS fecha, c.concepto, c.referencia, c.estado,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS tercero,
      (tq.conciliacion_id = $2) AS marcado
    FROM asientos_contables a JOIN comprobantes_contables c ON c.id = a.comprobante_id
    LEFT JOIN terceros t ON t.id = COALESCE(a.tercero_id, c.tercero_id)
    LEFT JOIN tesoreria_conciliados tq ON tq.asiento_id = a.id
    WHERE a.cuenta_codigo = $1 AND ${EN_LIBROS} AND c.fecha_contable <= $3
      AND (tq.asiento_id IS NULL OR tq.conciliacion_id = $2)
    ORDER BY c.fecha_contable, c.creado_en, a.orden`, [cq.cuenta_contable_codigo, cq.id, cq.fecha_corte])
  const libros = cq.estado === 'CERRADA' ? Number(cq.saldo_libros) : await saldoLibros(pool, cq.cuenta_contable_codigo, cq.fecha_corte)
  const pendientes = rows.filter(r => !r.marcado)
  // Partidas en tránsito: lo que está en libros pero aún no aparece en el extracto
  const transitoEntradas = pendientes.reduce((t, r) => t + r.entrada, 0)
  const transitoSalidas = pendientes.reduce((t, r) => t + r.salida, 0)
  const ajustado = Math.round((libros - transitoEntradas + transitoSalidas) * 100) / 100
  return reply.send({ data: {
    ...cq, movimientos: rows, saldo_libros_calc: libros,
    transito_entradas: transitoEntradas, transito_salidas: transitoSalidas,
    saldo_libros_ajustado: ajustado, diferencia: Math.round((ajustado - Number(cq.saldo_extracto)) * 100) / 100,
  } })
}

export async function actualizarConciliacion(req, reply) {
  const { saldo_extracto, observaciones } = req.body || {}
  const { rows } = await pool.query(`
    UPDATE tesoreria_conciliaciones SET saldo_extracto = COALESCE($2, saldo_extracto), observaciones = COALESCE($3, observaciones)
    WHERE id = $1 AND estado = 'ABIERTA' RETURNING *`, [req.params.id, saldo_extracto != null ? Number(saldo_extracto) : null, observaciones ?? null])
  if (!rows.length) return reply.code(409).send({ error: 'La conciliación no existe o ya está cerrada' })
  return reply.send({ data: rows[0] })
}

export async function marcarConciliados(req, reply) {
  const { asiento_ids = [], conciliado = true } = req.body || {}
  const cq = (await pool.query(`SELECT estado FROM tesoreria_conciliaciones WHERE id = $1`, [req.params.id])).rows[0]
  if (!cq) return reply.code(404).send({ error: 'Conciliación no encontrada' })
  if (cq.estado === 'CERRADA') return reply.code(409).send({ error: 'La conciliación está cerrada' })
  if (!asiento_ids.length) return reply.send({ ok: true })
  if (conciliado) {
    await pool.query(`
      INSERT INTO tesoreria_conciliados (asiento_id, conciliacion_id, usuario_id)
      SELECT unnest($1::uuid[]), $2, $3 ON CONFLICT (asiento_id) DO NOTHING`, [asiento_ids, req.params.id, req.user.id])
  } else {
    await pool.query(`DELETE FROM tesoreria_conciliados WHERE conciliacion_id = $1 AND asiento_id = ANY($2::uuid[])`, [req.params.id, asiento_ids])
  }
  return reply.send({ ok: true })
}

export async function cerrarConciliacion(req, reply) {
  const cq = (await pool.query(`
    SELECT cq.*, tc.cuenta_contable_codigo FROM tesoreria_conciliaciones cq JOIN tesoreria_cuentas tc ON tc.id = cq.cuenta_id WHERE cq.id = $1`, [req.params.id])).rows[0]
  if (!cq) return reply.code(404).send({ error: 'Conciliación no encontrada' })
  if (cq.estado === 'CERRADA') return reply.code(409).send({ error: 'Ya está cerrada' })
  const libros = await saldoLibros(pool, cq.cuenta_contable_codigo, cq.fecha_corte)
  await pool.query(`UPDATE tesoreria_conciliaciones SET estado='CERRADA', saldo_libros=$2, cerrada_por=$3, cerrada_en=NOW() WHERE id=$1`,
    [cq.id, libros, req.user.id])
  return reply.send({ ok: true })
}
