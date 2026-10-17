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
import { contabilizarEvento, reversarComprobante } from '../services/contabilidad.service.js'
import { diaAncla, normalizarInicio, primerPeriodoAPagar, listarPeriodos, siguientePeriodo } from '../utils/periodosPoliza.js'

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
        pp.tipo, pp.beneficiario_id, p.fecha_inicio AS poliza_fecha_inicio,
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

    // Periodo de cada pago contado desde la afiliación ("Jun–Jul 2026")
    const data = res.rows.map(r => ({
      ...r,
      periodo: r.tipo === 'AFILIACION' ? 'Afiliación'
        : normalizarInicio(r.mes_correspondiente, diaAncla({ fecha_inicio: r.poliza_fecha_inicio })).etiqueta,
    }))
    return reply.send({ data, total: Number(cnt.rows[0].count) })
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
      pc.tipo,
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
  const dia = diaAncla(pol)

  // Periodos que ya tienen una cuota vigente — para nunca duplicar ni chocar
  // con el índice único (poliza_id, mes_correspondiente) de cuotas.
  const yaPagados = await pool.query(
    `SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-DD') AS ini FROM pagos_poliza
     WHERE poliza_id=$1 AND tipo='CUOTA' AND NOT anulado`,
    [poliza_id]
  )
  const setPagados = new Set(yaPagados.rows.map(r => r.ini))

  // Los pagos cubren PERIODOS contados desde el día de afiliación (ver
  // utils/periodosPoliza.js), no meses de calendario.
  let periodosAPagar = []
  let sobrante = 0

  if (Array.isArray(meses_seleccionados) && meses_seleccionados.length) {
    // ── Selección manual desde el frontend (lista de periodos marcados)
    const elegidos = new Map()
    for (const m of meses_seleccionados) { const p = normalizarInicio(m, dia); elegidos.set(p.iso, p) }
    const chocan = [...elegidos.values()].filter(p => setPagados.has(p.iso))
    if (chocan.length) {
      return reply.status(409).send({ error: `Ya existe un pago para: ${chocan.map(p => p.etiqueta).join(', ')}. Actualiza la lista e inténtalo de nuevo.` })
    }
    periodosAPagar = [...elegidos.values()].sort((a, b) => a.iso.localeCompare(b.iso))
    const total = monto_total != null ? Number(monto_total) : periodosAPagar.length * valorCuota
    sobrante = Math.round((total - periodosAPagar.length * valorCuota) * 100) / 100
    if (sobrante < 0.5) sobrante = 0
  } else if (monto_total != null) {
    // ── Por monto: los siguientes periodos libres desde el primero a pagar
    const total = Number(monto_total)
    if (!(total > 0)) return reply.status(400).send({ error: 'monto_total debe ser mayor a 0' })
    const completos = Math.floor((total + 0.005) / valorCuota)
    sobrante = Math.round((total - completos * valorCuota) * 100) / 100
    if (sobrante < 0.5) sobrante = 0
    periodosAPagar = listarPeriodos(primerPeriodoAPagar(pol), completos, dia, setPagados)
    if (completos < 1 && sobrante === 0) {
      return reply.status(400).send({ error: `El monto no alcanza para cubrir ni un abono parcial (cuota: $${valorCuota.toLocaleString('es-CO')})` })
    }
  } else {
    // ── N periodos seguidos (Cartera)
    periodosAPagar = listarPeriodos(primerPeriodoAPagar(pol), Number(meses || 1), dia, setPagados)
  }
  const mesesAPagar = periodosAPagar.map(p => p.iso)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let primerRecibo = null
    for (let i = 0; i < periodosAPagar.length; i++) {
      const periodo = periodosAPagar[i]
      const mes = periodo.iso
      // El descuento/recargo de mora se aplica UNA sola vez (última cuota del
      // lote) — repetirlo en cada mes multiplicaría el descuento real pagado
      // por la cantidad de meses cubiertos en este mismo recibo.
      const esUltimo = i === mesesAPagar.length - 1
      const ins = await client.query(`
        INSERT INTO pagos_poliza (
          poliza_id, mes_correspondiente, periodo_hasta, monto,
          descuento, recargo_mora, metodo_pago, referencia,
          fecha_pago, cobrador_id, usuario_id, notas
        ) VALUES ($1,$2,$10,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$8,$9)
        RETURNING *, numero_recibo
      `, [
        poliza_id, mes, valorCuota,
        esUltimo ? descuento : 0, esUltimo ? recargo_mora : 0,
        metodo_pago, referencia || null, usuario_id, notas || null, periodo.fin_iso,
      ])
      if (!primerRecibo) primerRecibo = ins.rows[0]
    }

    const mesesCompletos = mesesAPagar.length
    const nuevaMora = Math.max(0, pol.meses_mora - mesesCompletos)

    let nuevoPagoHasta = null
    if (mesesCompletos >= 1) {
      nuevoPagoHasta = periodosAPagar[periodosAPagar.length - 1].fin_iso   // fin del último periodo pagado

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
        nuevoPagoHasta,
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
      // A cuenta del siguiente periodo libre (o el que eligió el cajero)
      const pAbono = mes_abono
        ? normalizarInicio(mes_abono, dia)
        : listarPeriodos(
            periodosAPagar.length ? siguientePeriodo(periodosAPagar[periodosAPagar.length - 1], dia) : primerPeriodoAPagar(pol),
            1, dia, setPagados)[0]
      const mesAbonoIso = pAbono.iso
      if (setPagados.has(mesAbonoIso) || mesesAPagar.includes(mesAbonoIso)) {
        await client.query('ROLLBACK')
        return reply.status(409).send({ error: `El periodo de abono parcial (${pAbono.etiqueta}) ya tiene un pago registrado.` })
      }

      const abonoIns = await client.query(`
        INSERT INTO pagos_poliza (
          poliza_id, mes_correspondiente, periodo_hasta, monto,
          metodo_pago, referencia, fecha_pago, cobrador_id, usuario_id, notas
        ) VALUES ($1,$2,$8,$3,$4,$5,CURRENT_DATE,$6,$6,$7)
        RETURNING *, numero_recibo
      `, [
        poliza_id, mesAbonoIso, sobrante, metodo_pago, referencia || null, usuario_id,
        `Abono parcial a cuenta de la cuota (faltan $${(valorCuota - sobrante).toLocaleString('es-CO')} de $${valorCuota.toLocaleString('es-CO')})${notas ? ' — ' + notas : ''}`,
        pAbono.fin_iso,
      ])
      abonoParcial = { ...abonoIns.rows[0], mes: mesAbonoIso, periodo: pAbono.etiqueta, falta: valorCuota - sobrante }
    }

    const montoMeses = valorCuota * mesesCompletos
    const totalRecibido = montoMeses + sobrante - Number(descuento) + Number(recargo_mora)

    // Antes solo se contabilizaba si hubo al menos una cuota completa: un
    // abono parcial solo entraba a caja sin asiento.
    const reciboContable = primerRecibo || abonoParcial
    if (totalRecibido > 0 && reciboContable) {
      await contabilizarEvento(client, {
        evento_codigo: 'PAGO_CUOTA_POLIZA',
        montos: { total: totalRecibido },
        forma_pago_codigo: metodo_pago,
        concepto: `Pago póliza ${pol.numero} — ${periodosAPagar.length ? periodosAPagar.map(p => p.etiqueta).join(', ') : 'abono parcial ' + abonoParcial.periodo}`,
        tercero_id: pol.titular_id,
        sede_id: pol.sede_id,
        documento_origen_tipo: 'pagos_poliza',
        documento_origen_id: reciboContable.id,
        usuario_id,
      })
    }

    await client.query('COMMIT')

    return reply.status(201).send({
      recibo: primerRecibo,
      numero_recibo: primerRecibo?.numero_recibo || null,
      meses_pagados: mesesCompletos,
      meses_pagados_lista: mesesAPagar,
      periodos_pagados: periodosAPagar.map(p => ({ inicio: p.iso, fin: p.fin_iso, etiqueta: p.etiqueta })),
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
  if (cont.estado === 'cancelado') return reply.status(400).send({ error: 'El contrato está cancelado' })
  const saldo = Number(cont.valor_total) - Number(cont.valor_pagado)
  if (saldo <= 0) return reply.status(400).send({ error: 'El contrato no tiene saldo pendiente' })

  // Abono libre: contratos de CONTADO (todos los de servicio directo) o cuando
  // el cajero escribe un monto en vez de pagar cuotas completas. Antes Cartera
  // rechazaba cualquier contrato que no fuera EN CUOTAS y 'activo', así que un
  // servicio directo nunca podía recibir un pago.
  if (req.body.monto_abono != null || cont.modalidad !== 'CUOTAS') {
    return registrarAbonoContrato(req, reply, { cont, saldo, usuario_id, metodo_pago, referencia, notas })
  }

  const valorCuota = Number(cont.valor_cuota)
  const n = Math.max(1, Number(meses) || 1)

  // Meses que ya tienen un pago registrado — igual que en pólizas, para no
  // duplicar ni chocar con el índice único (contrato_id, mes_correspondiente).
  const yaPagados = await pool.query(
    `SELECT TO_CHAR(mes_correspondiente,'YYYY-MM-01') AS mes FROM pagos_contrato WHERE contrato_id=$1 AND tipo='CUOTA' AND NOT anulado`,
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
        meses_mora    = $3::INT,
        saldo_mora    = $3::INT * valor_cuota,
        actualizado   = NOW()
      WHERE id = $4
    `, [
      `${nuevoPagoHasta.getFullYear()}-${String(nuevoPagoHasta.getMonth()+1).padStart(2,'0')}-${String(nuevoPagoHasta.getDate()).padStart(2,'0')}`,
      nuevoValorPagado,
      nuevaMora,
      contrato_id,
    ])

    const totalRecibidoContrato = monto - Number(descuento) + Number(recargo_mora)
    if (totalRecibidoContrato > 0 && primerRecibo) {
      await contabilizarEvento(client, {
        evento_codigo: 'CONTRATO_PAGO_CUOTA',
        montos: { total: totalRecibidoContrato },
        forma_pago_codigo: metodo_pago,
        concepto: `Abono contrato ${cont.numero} — ${mesesAPagar.join(', ')}`,
        tercero_id: cont.contratante_id,
        sede_id: cont.sede_id,
        documento_origen_tipo: 'pagos_contrato',
        documento_origen_id: primerRecibo.id,
        usuario_id,
      })
    }

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

// ── Abono libre a un contrato (contado o cuotas) ─────────────────────────────
// Reduce el saldo (valor_total − valor_pagado) por el monto recibido y se
// contabiliza con CONTRATO_PAGO_CUOTA: Debe caja/banco · Haber 130505.01.
async function registrarAbonoContrato(req, reply, { cont, saldo, usuario_id, metodo_pago, referencia, notas }) {
  const monto = Math.round(Number(req.body.monto_abono ?? saldo) * 100) / 100
  if (!(monto > 0)) return reply.status(400).send({ error: 'El valor del abono debe ser mayor a 0' })
  if (monto > saldo + 0.5) {
    return reply.status(400).send({ error: `El abono (${monto.toLocaleString('es-CO')}) supera el saldo pendiente (${saldo.toLocaleString('es-CO')})` })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ins = await client.query(`
      INSERT INTO pagos_contrato (
        contrato_id, tipo, mes_correspondiente, periodo_hasta, monto,
        descuento, recargo_mora, metodo_pago, referencia, fecha_pago, usuario_id, notas
      ) VALUES ($1,'ABONO',date_trunc('month', CURRENT_DATE)::date,NULL,$2,0,0,$3,$4,CURRENT_DATE,$5,$6)
      RETURNING *, numero_recibo`,
      [cont.id, monto, metodo_pago, referencia || null, usuario_id, notas || null]
    )
    const recibo = ins.rows[0]

    await client.query(
      `UPDATE contratos SET valor_pagado = valor_pagado + $1, actualizado = NOW() WHERE id = $2`,
      [monto, cont.id]
    )

    await contabilizarEvento(client, {
      evento_codigo: 'CONTRATO_PAGO_CUOTA',
      montos: { total: monto },
      forma_pago_codigo: metodo_pago,
      concepto: `Abono contrato ${cont.numero} — recibo ${String(recibo.numero_recibo).padStart(6, '0')}`,
      tercero_id: cont.contratante_id,
      sede_id: cont.sede_id,
      documento_origen_tipo: 'pagos_contrato',
      documento_origen_id: recibo.id,
      usuario_id,
    })

    await client.query('COMMIT')
    return reply.status(201).send({
      tipo: 'ABONO',
      recibo,
      numero_recibo: recibo.numero_recibo,
      monto,
      saldo_anterior: saldo,
      saldo_restante: Math.max(0, Math.round((saldo - monto) * 100) / 100),
      contrato_numero: cont.numero,
      titular: cont.titular_nombre,
    })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ── Anular pago de póliza ───────────────────────────────────────────────────
export async function anularPagoPoliza(req, reply) {
  const { id } = req.params
  const motivo = (req.body?.motivo || '').trim()
  const { sedeIds } = resolverSede(req)
  if (motivo.length < 5) return reply.status(400).send({ error: 'Escribe el motivo de la anulación (mínimo 5 caracteres)' })

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
      UPDATE pagos_poliza SET anulado=TRUE, fecha_anulacion=CURRENT_DATE, motivo_anulacion=$1,
             anulado_por=$3, anulado_en=NOW()
      WHERE id = $2`, [motivo, id, req.user.id])

    const comprobante = await client.query(
      `SELECT id FROM comprobantes_contables
       WHERE documento_origen_tipo='pagos_poliza' AND documento_origen_id=$1 AND estado != 'ANULADO'`,
      [id]
    )
    if (comprobante.rows.length) {
      await reversarComprobante(client, comprobante.rows[0].id, { motivo: motivo || 'Anulación de pago', usuario_id: req.user.id })
    }

    // Afiliación anulada: vuelve a quedar pendiente; no mueve periodos ni mora
    if (pg.tipo === 'AFILIACION') {
      if (pg.beneficiario_id) {
        await client.query(`UPDATE poliza_beneficiarios SET afiliacion_pagada = FALSE WHERE id = $1`, [pg.beneficiario_id])
      } else {
        await client.query(`UPDATE polizas SET afiliacion_pagada = FALSE, afiliacion_fecha_pago = NULL, actualizado = NOW() WHERE id = $1`, [pg.poliza_id])
      }
      await client.query('COMMIT')
      return reply.send({ ok: true })
    }

    // Revertir pago_hasta al día anterior al mes de la cuota anulada (nunca lo
    // adelanta, solo lo regresa) y recalcular la mora con la MISMA regla del
    // proceso nocturno (fn_recalcular_mora_polizas): meses vencidos entre
    // pago_hasta y hoy. Antes sumaba +1 mes fijo, así que anular un pago
    // ADELANTADO (mes aún no vencido) dejaba en mora/suspendida una póliza al día.
    // ultimo_pago: la fecha del último pago que SIGUE vigente (sin él, el listado
    // seguía mostrando como "último pago" la fecha del pago recién anulado)
    await client.query(`
      UPDATE polizas SET
        pago_hasta  = LEAST(COALESCE(pago_hasta, fecha_inicio), ($2::date - INTERVAL '1 day')::date),
        ultimo_pago = (SELECT MAX(fecha_pago) FROM pagos_poliza WHERE poliza_id = $1 AND NOT anulado)
      WHERE id = $1`, [pg.poliza_id, pg.mes_correspondiente])
    await client.query(`
      WITH m AS (
        SELECT id, GREATEST(0,
          EXTRACT(YEAR  FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int * 12 +
          EXTRACT(MONTH FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int
        ) AS mora
        FROM polizas WHERE id = $1
      )
      UPDATE polizas p SET
        meses_mora  = m.mora,
        saldo_mora  = m.mora * p.valor_cuota,
        estado      = CASE WHEN p.estado IN ('CANCELADA','EJECUTADA') THEN p.estado ELSE fn_estado_poliza(m.mora) END,
        actualizado = NOW()
      FROM m WHERE p.id = m.id`, [pg.poliza_id])

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
  // Un número (de póliza/contrato) se busca aunque sea de 1 dígito — el contrato N° 1 nunca aparecía
  if (q.length < 2 && !/^\d+$/.test(q)) return reply.send({ data: [] })
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
      c.modalidad, c.meses_mora,
      c.valor_total, c.valor_pagado, c.saldo_pendiente,
      t.nombres || ' ' || COALESCE(t.apellidos,'') AS titular,
      t.numero_documento AS cedula,
      t.telefono
    FROM contratos c
    JOIN terceros t ON t.id = c.contratante_id
    -- Todo contrato con saldo (contado o cuotas, también los de servicio directo
    -- ya "completados"); antes solo aparecían los EN CUOTAS.
    WHERE c.estado <> 'cancelado' AND c.saldo_pendiente > 0
      AND (t.nombres ILIKE '%'||$1||'%'
        OR t.apellidos ILIKE '%'||$1||'%'
        OR t.numero_documento = $1
        OR c.numero::TEXT = $1
        OR c.numero_legado = $1)
      AND ($2::uuid[] IS NULL OR c.sede_id = ANY($2::uuid[]))
    ORDER BY c.saldo_mora DESC, c.saldo_pendiente DESC
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
      e.razon_social AS nombre_empresa, e.nit, e.direccion AS empresa_direccion,
      e.telefono_1 AS empresa_telefono, e.logo_url AS empresa_logo_url
    FROM pagos_poliza pp
    JOIN polizas p       ON p.id = pp.poliza_id
    JOIN planes_poliza pl ON pl.id = p.plan_id
    JOIN terceros t      ON t.id = p.titular_id
    JOIN usuarios u      ON u.id = pp.usuario_id
    CROSS JOIN (SELECT razon_social, nit, direccion, telefono_1, logo_url FROM empresa LIMIT 1) e
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
