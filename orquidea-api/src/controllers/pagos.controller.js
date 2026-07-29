/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Cartera y Pagos                                     ║
 * ║  Archivo         : pagos.controller.js                                 ║
 * ║  Fecha           : 2026-07-01                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolverSede, polizaPermitida, contratoPermitido } from '../utils/sede.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOPORTES_DIR = path.join(__dirname, '..', 'uploads', 'soportes')

const EXT_PERMITIDAS = new Set(['.pdf','.jpg','.jpeg','.png','.webp','.gif','.bmp','.tiff'])

// ── Subir soporte de pago ───────────────────────────────────────────────────
export async function subirSoporte(req, reply) {
  const { id } = req.params      // UUID del pago
  const { tabla = 'poliza' } = req.query  // 'poliza' | 'contrato'

  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No se recibió ningún archivo' })

  const ext = path.extname(data.filename).toLowerCase()
  if (!EXT_PERMITIDAS.has(ext))
    return reply.code(400).send({ error: `Formato no permitido. Use: ${[...EXT_PERMITIDAS].join(', ')}` })

  const nombreArchivo = `pago_${id}_${Date.now()}${ext}`
  const rutaLocal     = path.join(SOPORTES_DIR, nombreArchivo)
  const urlPublica    = `/uploads/soportes/${nombreArchivo}`

  const writeStream = fs.createWriteStream(rutaLocal)
  await pipeline(data.file, writeStream)

  // Si el archivo fue truncado por el límite de tamaño → borrar y rechazar
  if (data.file.truncated) {
    fs.unlink(rutaLocal, () => {})
    return reply.code(413).send({ error: 'El archivo supera el límite de 25 MB. Comprime la imagen o usa PDF.' })
  }

  const tablaNombre = tabla === 'contrato' ? 'pagos_contrato' : 'pagos_poliza'
  const res = await pool.query(
    `UPDATE ${tablaNombre} SET soporte_url=$1 WHERE id=$2 RETURNING id, soporte_url`,
    [urlPublica, id]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Pago no encontrado' })

  return reply.send({ ok: true, soporte_url: urlPublica })
}

// ── Stats de cartera ────────────────────────────────────────────────────────
export async function stats(req, reply) {
  const hoy = new Date().toISOString().slice(0, 10)
  const mesInicio = hoy.slice(0, 7) + '-01'
  const { sedeIds } = resolverSede(req)

  const [
    recaudadoHoy,
    recaudadoMes,
    polizasMora,
    contratosMora,
    proxVencer,
    totalCartera,
  ] = await Promise.all([
    // Recaudado hoy (pólizas)
    pool.query(`
      SELECT COALESCE(SUM(pp.monto - pp.descuento + pp.recargo_mora), 0) AS total
      FROM pagos_poliza pp JOIN polizas p ON p.id = pp.poliza_id
      WHERE pp.fecha_pago = $1 AND NOT pp.anulado ${sedeIds ? 'AND p.sede_id = ANY($2::uuid[])' : ''}`,
      sedeIds ? [hoy, sedeIds] : [hoy]),

    // Recaudado este mes (pólizas)
    pool.query(`
      SELECT COALESCE(SUM(pp.monto - pp.descuento + pp.recargo_mora), 0) AS total
      FROM pagos_poliza pp JOIN polizas p ON p.id = pp.poliza_id
      WHERE pp.fecha_pago >= $1 AND NOT pp.anulado ${sedeIds ? 'AND p.sede_id = ANY($2::uuid[])' : ''}`,
      sedeIds ? [mesInicio, sedeIds] : [mesInicio]),

    // Pólizas en mora
    pool.query(`
      SELECT COUNT(*) AS total, COALESCE(SUM(saldo_mora),0) AS valor
      FROM polizas WHERE meses_mora > 0 AND estado NOT IN ('CANCELADA','EJECUTADA')
      ${sedeIds ? 'AND sede_id = ANY($1::uuid[])' : ''}`,
      sedeIds ? [sedeIds] : []),

    // Contratos en mora
    pool.query(`
      SELECT COUNT(*) AS total
      FROM contratos WHERE saldo_mora > 0 AND estado = 'activo'
      ${sedeIds ? 'AND sede_id = ANY($1::uuid[])' : ''}`,
      sedeIds ? [sedeIds] : []),

    // Próximas a vencer en 30 días (pago_hasta <= hoy + 30 días)
    pool.query(`
      SELECT COUNT(*) AS total
      FROM polizas
      WHERE estado = 'VIGENTE'
        AND pago_hasta BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ${sedeIds ? 'AND sede_id = ANY($1::uuid[])' : ''}`,
      sedeIds ? [sedeIds] : []),

    // Total cartera pólizas vigentes por cobrar este mes
    pool.query(`
      SELECT COALESCE(SUM(valor_cuota), 0) AS total
      FROM polizas WHERE estado IN ('VIGENTE','SUSPENDIDA')
      ${sedeIds ? 'AND sede_id = ANY($1::uuid[])' : ''}`,
      sedeIds ? [sedeIds] : []),
  ])

  return reply.send({
    recaudado_hoy:     Number(recaudadoHoy.rows[0].total),
    recaudado_mes:     Number(recaudadoMes.rows[0].total),
    polizas_mora:      Number(polizasMora.rows[0].total),
    valor_mora:        Number(polizasMora.rows[0].valor),
    contratos_mora:    Number(contratosMora.rows[0].total),
    prox_vencer:       Number(proxVencer.rows[0].total),
    total_cartera_mes: Number(totalCartera.rows[0].total),
  })
}

// ── Listar recibos (pagos registrados) ─────────────────────────────────────
export async function listar(req, reply) {
  const {
    tipo = 'POLIZA', busca = '', desde = '', hasta = '',
    page = 1, limit = 50, anulados = 'false',
  } = req.query

  const offset = (Number(page) - 1) * Number(limit)
  const incAnulados = anulados === 'true'
  const { sedeIds } = resolverSede(req)

  if (tipo === 'POLIZA') {
    const res = await pool.query(`
      SELECT
        pp.id,
        pp.numero_recibo,
        pp.fecha_pago,
        pp.mes_correspondiente,
        pp.periodo_hasta,
        pp.monto,
        pp.descuento,
        pp.recargo_mora,
        pp.monto - pp.descuento + pp.recargo_mora AS total,
        pp.metodo_pago,
        pp.referencia,
        pp.anulado,
        pp.motivo_anulacion,
        pp.soporte_url,
        p.numero       AS poliza_numero,
        p.id           AS poliza_id,
        t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
        t.telefono,
        pl.nombre      AS plan,
        u.nombre       AS cajero,
        uc.nombre      AS cobrador
      FROM pagos_poliza pp
      JOIN polizas p ON p.id = pp.poliza_id
      JOIN terceros t ON t.id = p.titular_id
      JOIN planes_poliza pl ON pl.id = p.plan_id
      JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN usuarios uc ON uc.id = pp.cobrador_id
      WHERE ($1 = '' OR t.nombres ILIKE '%'||$1||'%'
                     OR t.apellidos ILIKE '%'||$1||'%'
                     OR p.numero::TEXT = $1)
        AND (NULLIF($2,'') IS NULL OR pp.fecha_pago >= NULLIF($2,'')::date)
        AND (NULLIF($3,'') IS NULL OR pp.fecha_pago <= NULLIF($3,'')::date)
        AND ($4 OR NOT pp.anulado)
        AND ($7::uuid[] IS NULL OR p.sede_id = ANY($7::uuid[]))
      ORDER BY pp.fecha_pago DESC, pp.numero_recibo DESC
      LIMIT $5 OFFSET $6
    `, [busca, desde, hasta, incAnulados, limit, offset, sedeIds])

    const cnt = await pool.query(`
      SELECT COUNT(*) FROM pagos_poliza pp
      JOIN polizas p ON p.id = pp.poliza_id
      JOIN terceros t ON t.id = p.titular_id
      WHERE ($1 = '' OR t.nombres ILIKE '%'||$1||'%'
                     OR t.apellidos ILIKE '%'||$1||'%'
                     OR p.numero::TEXT = $1)
        AND (NULLIF($2,'') IS NULL OR pp.fecha_pago >= NULLIF($2,'')::date)
        AND (NULLIF($3,'') IS NULL OR pp.fecha_pago <= NULLIF($3,'')::date)
        AND ($4 OR NOT pp.anulado)
        AND ($5::uuid[] IS NULL OR p.sede_id = ANY($5::uuid[]))
    `, [busca, desde, hasta, incAnulados, sedeIds])

    return reply.send({ data: res.rows, total: Number(cnt.rows[0].count) })
  }

  // tipo = CONTRATO
  const res = await pool.query(`
    SELECT
      pc.id,
      pc.numero_recibo,
      pc.fecha_pago,
      pc.mes_correspondiente,
      pc.periodo_hasta,
      pc.monto,
      pc.descuento,
      pc.recargo_mora,
      pc.monto - pc.descuento + pc.recargo_mora AS total,
      pc.metodo_pago,
      pc.referencia,
      pc.anulado,
      pc.motivo_anulacion,
      pc.notas,
      pc.soporte_url,
      c.numero       AS contrato_numero,
      c.id           AS contrato_id,
      t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
      t.telefono,
      c.tipo_contrato AS plan,
      u.nombre       AS cajero
    FROM pagos_contrato pc
    JOIN contratos c ON c.id = pc.contrato_id
    JOIN terceros t ON t.id = c.contratante_id
    JOIN usuarios u ON u.id = pc.usuario_id
    WHERE ($1 = '' OR t.nombres ILIKE '%'||$1||'%'
                   OR t.apellidos ILIKE '%'||$1||'%'
                   OR c.numero::TEXT = $1)
      AND (NULLIF($2,'') IS NULL OR pc.fecha_pago >= NULLIF($2,'')::date)
      AND (NULLIF($3,'') IS NULL OR pc.fecha_pago <= NULLIF($3,'')::date)
      AND ($4 OR NOT pc.anulado)
      AND ($7::uuid[] IS NULL OR c.sede_id = ANY($7::uuid[]))
    ORDER BY pc.fecha_pago DESC, pc.numero_recibo DESC
    LIMIT $5 OFFSET $6
  `, [busca, desde, hasta, incAnulados, limit, offset, sedeIds])

  return reply.send({ data: res.rows, total: res.rows.length })
}

// ── Registrar pago de póliza ────────────────────────────────────────────────
export async function registrarPagoPoliza(req, reply) {
  const { poliza_id, meses, monto_total, meses_seleccionados, mes_abono,
          metodo_pago = 'efectivo', referencia = '',
          descuento = 0, recargo_mora = 0, notas = '' } = req.body
  const usuario_id = req.user.id
  const { sedeIds } = resolverSede(req)
  if (!(await polizaPermitida(pool, poliza_id, sedeIds)))
    return reply.status(403).send({ error: 'La póliza no pertenece a tu sede' })

  const poliza = await pool.query(`
    SELECT p.*, pl.nombre AS nombre_plan, pl.valor_mensual
    FROM polizas p JOIN planes_poliza pl ON pl.id = p.plan_id
    WHERE p.id = $1`, [poliza_id])

  if (!poliza.rows.length) return reply.status(404).send({ error: 'Póliza no encontrada' })
  const pol = poliza.rows[0]
  if (pol.estado === 'CANCELADA') return reply.status(400).send({ error: 'La póliza está cancelada' })
  if (pol.estado === 'EJECUTADA') return reply.status(400).send({ error: 'La póliza fue ejecutada (servicio prestado)' })

  const valorCuota = Number(pol.valor_cuota)

  // Meses que ya tienen un pago registrado — para nunca duplicar ni chocar
  // con la restricción única (poliza_id, mes_correspondiente).
  const yaPagados = await pool.query(
    `SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-01') AS mes FROM pagos_poliza WHERE poliza_id=$1`,
    [poliza_id]
  )
  const setPagados = new Set(yaPagados.rows.map(r => r.mes))

  // ── Modo "meses_seleccionados": el usuario activó/desactivó meses puntuales
  // desde el frontend (checkboxes) — el servidor solo valida que ninguno de
  // los elegidos esté ya pagado y calcula el sobrante contra monto_total.
  let mesesAPagar = []
  let sobrante = 0

  if (Array.isArray(meses_seleccionados) && meses_seleccionados.length) {
    const normalizados = meses_seleccionados.map(m => m.slice(0, 7) + '-01')
    const chocan = normalizados.filter(m => setPagados.has(m))
    if (chocan.length) {
      return reply.status(409).send({ error: `Ya existe un pago para: ${chocan.join(', ')}. Actualiza la lista e inténtalo de nuevo.` })
    }
    mesesAPagar = [...new Set(normalizados)].sort()
    const total = monto_total != null ? Number(monto_total) : mesesAPagar.length * valorCuota
    sobrante = Math.round((total - mesesAPagar.length * valorCuota) * 100) / 100
    if (sobrante < 0.5) sobrante = 0
  } else if (monto_total != null) {
    // ── Modo automático: sin selección manual, se calculan los siguientes
    // meses libres a partir de pago_hasta, saltando cualquiera ya pagado.
    const total = Number(monto_total)
    if (!(total > 0)) return reply.status(400).send({ error: 'monto_total debe ser mayor a 0' })
    const mesesCompletos = Math.floor((total + 0.005) / valorCuota)
    sobrante = Math.round((total - mesesCompletos * valorCuota) * 100) / 100
    if (sobrante < 0.5) sobrante = 0

    const pagoHastaActual = pol.pago_hasta || pol.fecha_inicio
    const cursor = new Date(pagoHastaActual)
    cursor.setDate(1)
    const hoyMes = new Date(); hoyMes.setDate(1)
    if (cursor <= hoyMes) cursor.setFullYear(hoyMes.getFullYear(), hoyMes.getMonth(), 1)

    while (mesesAPagar.length < mesesCompletos) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-01`
      if (!setPagados.has(iso)) mesesAPagar.push(iso)
      cursor.setMonth(cursor.getMonth() + 1)
    }
    if (mesesCompletos < 1 && sobrante === 0) {
      return reply.status(400).send({ error: `El monto no alcanza para cubrir ni un abono parcial (cuota: $${valorCuota.toLocaleString('es-CO')})` })
    }
  } else {
    // ── Modo legado: N meses contiguos desde pago_hasta (compatibilidad)
    const pagoHastaActual = pol.pago_hasta || pol.fecha_inicio
    const cursor = new Date(pagoHastaActual)
    cursor.setDate(1)
    const hoyMes = new Date(); hoyMes.setDate(1)
    if (cursor <= hoyMes) cursor.setFullYear(hoyMes.getFullYear(), hoyMes.getMonth(), 1)
    const n = Number(meses || 1)
    for (let i = 0; i < n; i++) {
      mesesAPagar.push(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-01`)
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let primerRecibo = null
    for (let i = 0; i < mesesAPagar.length; i++) {
      const mes = mesesAPagar[i]
      // El descuento/recargo de mora se aplica UNA sola vez (última cuota del
      // lote) — repetirlo en cada mes multiplicaría el descuento real pagado
      // por la cantidad de meses cubiertos en este mismo recibo.
      const esUltimo = i === mesesAPagar.length - 1
      const ins = await client.query(`
        INSERT INTO pagos_poliza (
          poliza_id, mes_correspondiente, periodo_hasta, monto,
          descuento, recargo_mora, metodo_pago, referencia,
          fecha_pago, cobrador_id, usuario_id, notas
        ) VALUES ($1,$2,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$8,$9)
        RETURNING *, numero_recibo
      `, [
        poliza_id, mes, valorCuota,
        esUltimo ? descuento : 0, esUltimo ? recargo_mora : 0,
        metodo_pago, referencia || null, usuario_id, notas || null,
      ])
      if (!primerRecibo) primerRecibo = ins.rows[0]
    }

    const mesesCompletos = mesesAPagar.length
    const nuevaMora = Math.max(0, pol.meses_mora - mesesCompletos)

    let nuevoPagoHasta = null
    if (mesesCompletos >= 1) {
      const ultimoMes = mesesAPagar[mesesAPagar.length - 1]
      nuevoPagoHasta = new Date(ultimoMes)
      nuevoPagoHasta.setMonth(nuevoPagoHasta.getMonth() + 1)
      nuevoPagoHasta.setDate(0) // último día del mes cubierto más reciente

      // Actualizar póliza — regla PREPAGO (fn_estado_poliza): 0=VIGENTE, 1+=SUSPENDIDA, 6+=VENCIDA
      await client.query(`
        UPDATE polizas SET
          pago_hasta  = GREATEST(COALESCE(pago_hasta, $1::date), $1::date),
          ultimo_pago = CURRENT_DATE,
          meses_mora  = $2::INT,
          saldo_mora  = ($2::INT * valor_cuota),
          estado      = CASE
            WHEN estado IN ('CANCELADA','EJECUTADA') THEN estado
            ELSE fn_estado_poliza($4::INT)
          END,
          actualizado = NOW()
        WHERE id = $3
      `, [
        `${nuevoPagoHasta.getFullYear()}-${String(nuevoPagoHasta.getMonth()+1).padStart(2,'0')}-${String(nuevoPagoHasta.getDate()).padStart(2,'0')}`,
        nuevaMora,
        poliza_id,
        nuevaMora,
      ])
    }

    // Abono parcial: lo que sobra no alcanza una cuota completa, se registra
    // como anticipo del mes siguiente disponible (no avanza pago_hasta ni
    // descuenta meses_mora, porque esa cuota sigue incompleta).
    let abonoParcial = null
    if (sobrante > 0) {
      let mesAbonoIso = mes_abono ? mes_abono.slice(0,7) + '-01' : null
      if (!mesAbonoIso) {
        const cursor = mesesAPagar.length
          ? new Date(mesesAPagar[mesesAPagar.length - 1])
          : (() => { const d = new Date(pol.pago_hasta || pol.fecha_inicio); d.setDate(1); return d })()
        if (mesesAPagar.length) cursor.setMonth(cursor.getMonth() + 1)
        while (setPagados.has(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-01`)) {
          cursor.setMonth(cursor.getMonth() + 1)
        }
        mesAbonoIso = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-01`
      }
      if (setPagados.has(mesAbonoIso) || mesesAPagar.includes(mesAbonoIso)) {
        await client.query('ROLLBACK')
        return reply.status(409).send({ error: `El mes de abono parcial (${mesAbonoIso}) ya tiene un pago registrado.` })
      }

      const abonoIns = await client.query(`
        INSERT INTO pagos_poliza (
          poliza_id, mes_correspondiente, periodo_hasta, monto,
          metodo_pago, referencia, fecha_pago, cobrador_id, usuario_id, notas
        ) VALUES ($1,$2,$2,$3,$4,$5,CURRENT_DATE,$6,$6,$7)
        RETURNING *, numero_recibo
      `, [
        poliza_id, mesAbonoIso, sobrante, metodo_pago, referencia || null, usuario_id,
        `Abono parcial a cuenta de la cuota (faltan $${(valorCuota - sobrante).toLocaleString('es-CO')} de $${valorCuota.toLocaleString('es-CO')})${notas ? ' — ' + notas : ''}`,
      ])
      abonoParcial = { ...abonoIns.rows[0], mes: mesAbonoIso, falta: valorCuota - sobrante }
    }

    await client.query('COMMIT')

    const montoMeses = valorCuota * mesesCompletos
    return reply.status(201).send({
      recibo: primerRecibo,
      numero_recibo: primerRecibo?.numero_recibo || null,
      meses_pagados: mesesCompletos,
      meses_pagados_lista: mesesAPagar,
      monto: montoMeses,
      abono_parcial: abonoParcial,
      descuento, recargo_mora,
      total: montoMeses + sobrante - Number(descuento) + Number(recargo_mora),
      pago_hasta_nuevo: nuevoPagoHasta,
      titular: pol.titular_id,
      plan: pol.nombre_plan,
      poliza_numero: pol.numero,
    })
  } catch (e) {
    await client.query('ROLLBACK')
    if (e.code === '23505') return reply.status(409).send({ error: 'Ya existe un pago para ese período' })
    throw e
  } finally {
    client.release()
  }
}

// ── Registrar pago de contrato ──────────────────────────────────────────────
export async function registrarPagoContrato(req, reply) {
  const { contrato_id, meses = 1, metodo_pago = 'efectivo', referencia = '',
          descuento = 0, recargo_mora = 0, notas = '' } = req.body
  const usuario_id = req.user.id
  const { sedeIds } = resolverSede(req)
  if (!(await contratoPermitido(pool, contrato_id, sedeIds)))
    return reply.status(403).send({ error: 'El contrato no pertenece a tu sede' })

  const contrato = await pool.query(`
    SELECT c.*, t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular_nombre
    FROM contratos c JOIN terceros t ON t.id = c.contratante_id
    WHERE c.id = $1`, [contrato_id])

  if (!contrato.rows.length) return reply.status(404).send({ error: 'Contrato no encontrado' })
  const cont = contrato.rows[0]
  if (cont.estado !== 'activo') return reply.status(400).send({ error: `El contrato está ${cont.estado}` })
  if (cont.modalidad !== 'CUOTAS') return reply.status(400).send({ error: 'Solo contratos en cuotas pueden registrar pagos aquí' })

  const valorCuota = Number(cont.valor_cuota)
  const n = Math.max(1, Number(meses) || 1)

  // Meses que ya tienen un pago registrado — igual que en pólizas, para no
  // duplicar ni chocar con el índice único (contrato_id, mes_correspondiente).
  const yaPagados = await pool.query(
    `SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-01') AS mes FROM pagos_contrato WHERE contrato_id=$1`,
    [contrato_id]
  )
  const setPagados = new Set(yaPagados.rows.map(r => r.mes))

  const pagoHastaActual = cont.pago_hasta || cont.fecha_inicio
  const cursor = new Date(pagoHastaActual); cursor.setDate(1)
  const hoyMes = new Date(); hoyMes.setDate(1)
  if (cursor <= hoyMes) cursor.setFullYear(hoyMes.getFullYear(), hoyMes.getMonth(), 1)

  // Una fila por cada mes pagado (nunca un solo rango) — así el índice único
  // atrapa cualquier solape si dos pagos llegan a cruzarse en el mismo mes.
  const mesesAPagar = []
  while (mesesAPagar.length < n) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-01`
    if (!setPagados.has(iso)) mesesAPagar.push(iso)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const monto = valorCuota * mesesAPagar.length

  const nuevoPagoHasta = new Date(mesesAPagar[mesesAPagar.length - 1])
  nuevoPagoHasta.setMonth(nuevoPagoHasta.getMonth() + 1)
  nuevoPagoHasta.setDate(0)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let primerRecibo = null
    for (let i = 0; i < mesesAPagar.length; i++) {
      const mes = mesesAPagar[i]
      // El descuento/recargo de mora se aplica UNA sola vez (última cuota
      // del lote), nunca repetido por cada mes — de lo contrario un pago de
      // varios meses multiplicaría el descuento real por la cantidad de meses.
      const esUltimo = i === mesesAPagar.length - 1
      const ins = await client.query(`
        INSERT INTO pagos_contrato (
          contrato_id, mes_correspondiente, periodo_hasta, monto,
          descuento, recargo_mora, metodo_pago, referencia,
          fecha_pago, usuario_id, notas
        ) VALUES ($1,$2,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$9)
        RETURNING *, numero_recibo
      `, [
        contrato_id, mes, valorCuota,
        esUltimo ? descuento : 0, esUltimo ? recargo_mora : 0,
        metodo_pago, referencia || null, usuario_id, notas || null,
      ])
      if (!primerRecibo) primerRecibo = ins.rows[0]
    }

    const mesesCompletos = mesesAPagar.length
    const nuevaMora = Math.max(0, Number(cont.meses_mora) - mesesCompletos)
    const nuevoValorPagado = Number(cont.valor_pagado) + monto - Number(descuento)

    await client.query(`
      UPDATE contratos SET
        pago_hasta    = $1,
        valor_pagado  = $2,
        meses_mora    = $3,
        saldo_mora    = $3 * valor_cuota,
        actualizado   = NOW()
      WHERE id = $4
    `, [
      `${nuevoPagoHasta.getFullYear()}-${String(nuevoPagoHasta.getMonth()+1).padStart(2,'0')}-${String(nuevoPagoHasta.getDate()).padStart(2,'0')}`,
      nuevoValorPagado,
      nuevaMora,
      contrato_id,
    ])

    await client.query('COMMIT')

    return reply.status(201).send({
      recibo: primerRecibo,
      numero_recibo: primerRecibo?.numero_recibo || null,
      meses_pagados: mesesCompletos,
      meses_pagados_lista: mesesAPagar,
      monto,
      contrato_numero: cont.numero,
      titular: cont.titular_nombre,
    })
  } catch (e) {
    await client.query('ROLLBACK')
    if (e.code === '23505') return reply.status(409).send({ error: 'Ya existe un pago para ese período' })
    throw e
  } finally {
    client.release()
  }
}

// ── Anular pago de póliza ───────────────────────────────────────────────────
export async function anularPagoPoliza(req, reply) {
  const { id } = req.params
  const { motivo = '' } = req.body
  const { sedeIds } = resolverSede(req)

  const pago = await pool.query(`
    SELECT pp.*, p.valor_cuota, p.meses_mora, p.sede_id
    FROM pagos_poliza pp JOIN polizas p ON p.id = pp.poliza_id
    WHERE pp.id = $1`, [id])

  if (!pago.rows.length) return reply.status(404).send({ error: 'Pago no encontrado' })
  if (sedeIds !== null && !sedeIds.includes(pago.rows[0].sede_id))
    return reply.status(403).send({ error: 'Ese pago no pertenece a tu sede' })
  if (pago.rows[0].anulado) return reply.status(400).send({ error: 'El pago ya está anulado' })

  const pg = pago.rows[0]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      UPDATE pagos_poliza SET anulado=TRUE, fecha_anulacion=CURRENT_DATE, motivo_anulacion=$1
      WHERE id = $2`, [motivo, id])

    // Revertir pago_hasta a la póliza (restar los meses)
    await client.query(`
      UPDATE polizas SET
        pago_hasta  = COALESCE(pago_hasta, fecha_inicio) - INTERVAL '1 month',
        meses_mora  = meses_mora + 1,
        saldo_mora  = (meses_mora + 1) * valor_cuota,
        actualizado = NOW()
      WHERE id = $1`, [pg.poliza_id])

    await client.query('COMMIT')
    return reply.send({ ok: true })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ── Morosos ─────────────────────────────────────────────────────────────────
export async function morosos(req, reply) {
  const { tipo = 'POLIZA', min_mora = 1, busca = '' } = req.query
  const { sedeIds } = resolverSede(req)

  if (tipo === 'POLIZA') {
    const res = await pool.query(`
      SELECT
        p.id,
        p.numero,
        t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
        t.numero_documento AS cedula,
        t.telefono,
        t.direccion,
        pl.nombre      AS plan,
        p.valor_cuota,
        p.pago_hasta,
        p.meses_mora,
        p.saldo_mora,
        p.estado,
        p.dia_cobro,
        p.fecha_inicio,
        u.nombre       AS cobrador
      FROM polizas p
      JOIN terceros t    ON t.id = p.titular_id
      JOIN planes_poliza pl ON pl.id = p.plan_id
      LEFT JOIN usuarios u ON u.id = p.cobrador_id
      WHERE p.meses_mora >= $1
        AND p.estado NOT IN ('CANCELADA','EJECUTADA')
        AND ($2 = '' OR t.nombres ILIKE '%'||$2||'%'
                     OR t.apellidos ILIKE '%'||$2||'%'
                     OR t.numero_documento = $2
                     OR p.numero::TEXT = $2)
        AND ($3::uuid[] IS NULL OR p.sede_id = ANY($3::uuid[]))
      ORDER BY p.meses_mora DESC, p.saldo_mora DESC
    `, [min_mora, busca, sedeIds])

    return reply.send({ data: res.rows, total: res.rows.length })
  }

  // Contratos
  const res = await pool.query(`
    SELECT
      c.id,
      c.numero,
      t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
      t.numero_documento AS cedula,
      t.telefono,
      c.tipo_contrato AS plan,
      c.valor_cuota,
      c.pago_hasta,
      c.saldo_mora,
      c.estado
    FROM contratos c
    JOIN terceros t ON t.id = c.contratante_id
    WHERE c.saldo_mora > 0 AND c.estado = 'activo'
      AND ($1 = '' OR t.nombres ILIKE '%'||$1||'%'
                   OR t.apellidos ILIKE '%'||$1||'%'
                   OR c.numero::TEXT = $1)
      AND ($2::uuid[] IS NULL OR c.sede_id = ANY($2::uuid[]))
    ORDER BY c.saldo_mora DESC
  `, [busca, sedeIds])

  return reply.send({ data: res.rows, total: res.rows.length })
}

// ── Buscar póliza/contrato para pagar ───────────────────────────────────────
export async function buscarParaPagar(req, reply) {
  const { q = '', tipo = 'POLIZA' } = req.query
  if (q.length < 2) return reply.send({ data: [] })
  const { sedeIds } = resolverSede(req)

  if (tipo === 'POLIZA') {
    const res = await pool.query(`
      SELECT
        p.id,
        p.numero,
        p.estado,
        p.valor_cuota,
        p.pago_hasta,
        p.meses_mora,
        p.saldo_mora,
        p.dia_cobro,
        p.fecha_inicio,
        pl.nombre AS plan,
        pl.tipo   AS tipo_plan,
        t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
        t.numero_documento AS cedula,
        t.telefono
      FROM polizas p
      JOIN terceros t ON t.id = p.titular_id
      JOIN planes_poliza pl ON pl.id = p.plan_id
      WHERE p.estado NOT IN ('CANCELADA')
        AND (t.nombres ILIKE '%'||$1||'%'
          OR t.apellidos ILIKE '%'||$1||'%'
          OR t.numero_documento = $1
          OR p.numero::TEXT = $1)
        AND ($2::uuid[] IS NULL OR p.sede_id = ANY($2::uuid[]))
      ORDER BY p.estado ASC, p.meses_mora DESC
      LIMIT 10
    `, [q, sedeIds])
    return reply.send({ data: res.rows })
  }

  const res = await pool.query(`
    SELECT
      c.id,
      c.numero,
      c.estado,
      c.valor_cuota,
      c.pago_hasta,
      c.saldo_mora,
      c.dia_cobro,
      c.tipo_contrato AS plan,
      t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
      t.numero_documento AS cedula,
      t.telefono
    FROM contratos c
    JOIN terceros t ON t.id = c.contratante_id
    WHERE c.modalidad = 'CUOTAS'
      AND (t.nombres ILIKE '%'||$1||'%'
        OR t.apellidos ILIKE '%'||$1||'%'
        OR t.numero_documento = $1
        OR c.numero::TEXT = $1)
      AND ($2::uuid[] IS NULL OR c.sede_id = ANY($2::uuid[]))
    ORDER BY c.saldo_mora DESC
    LIMIT 10
  `, [q, sedeIds])
  return reply.send({ data: res.rows })
}

// ── Detalle de un recibo ─────────────────────────────────────────────────────
export async function detalleRecibo(req, reply) {
  const { numero } = req.params
  const { sedeIds } = resolverSede(req)

  const res = await pool.query(`
    SELECT
      pp.id, pp.numero_recibo, pp.fecha_pago,
      pp.mes_correspondiente, pp.periodo_hasta,
      pp.monto, pp.descuento, pp.recargo_mora,
      pp.monto - pp.descuento + pp.recargo_mora AS total,
      pp.metodo_pago, pp.referencia,
      pp.anulado, pp.motivo_anulacion,
      p.numero AS poliza_numero, p.sede_id,
      pl.nombre AS plan,
      t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
      t.numero_documento AS cedula, t.telefono, t.direccion,
      u.nombre AS cajero,
      e.nombre_empresa, e.nit, e.direccion AS empresa_direccion, e.telefono AS empresa_telefono
    FROM pagos_poliza pp
    JOIN polizas p       ON p.id = pp.poliza_id
    JOIN planes_poliza pl ON pl.id = p.plan_id
    JOIN terceros t      ON t.id = p.titular_id
    JOIN usuarios u      ON u.id = pp.usuario_id
    CROSS JOIN (SELECT nombre_empresa, nit, direccion, telefono FROM empresa_configuracion LIMIT 1) e
    WHERE pp.numero_recibo = $1
  `, [numero])

  if (!res.rows.length) return reply.status(404).send({ error: 'Recibo no encontrado' })
  if (sedeIds !== null && !sedeIds.includes(res.rows[0].sede_id))
    return reply.status(403).send({ error: 'Ese recibo no pertenece a tu sede' })
  return reply.send(res.rows[0])
}

// ── Recalcular mora (cron / manual) ─────────────────────────────────────────
export async function recalcularMora(req, reply) {
  await pool.query('SELECT fn_recalcular_mora_polizas()')
  return reply.send({ ok: true, mensaje: 'Mora recalculada correctamente' })
}
