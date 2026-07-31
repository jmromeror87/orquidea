/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas de Previsión                                 ║
 * ║  Archivo         : polizas.controller.js                                ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { generarComision } from '../utils/comisiones.js'
import { resolverSede, sedeParaCrear } from '../utils/sede.js'

// ── Helpers ───────────────────────────────────────────────────────────────

const JOINS = `
  FROM polizas p
  JOIN terceros t   ON t.id  = p.titular_id
  JOIN planes_poliza pl ON pl.id = p.plan_id
  LEFT JOIN usuarios u ON u.id = p.usuario_id
  LEFT JOIN sedes se ON se.id = p.sede_id
`

const SELECT_LIST = `
  SELECT
    p.id, p.numero, p.estado, p.valor_cuota, p.dia_cobro,
    p.meses_mora, p.ultimo_pago, p.fecha_inicio, p.fecha_fin_carencia,
    p.fecha_cancelacion, p.motivo_cancelacion, p.observaciones, p.creado_en,
    p.pago_hasta,
    p.costo_afiliacion, p.afiliacion_pagada, p.afiliacion_fecha_pago, p.afiliacion_metodo_pago,
    -- Titular
    t.id   AS titular_id,
    COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre,
    t.numero_documento AS titular_doc,
    t.telefono AS titular_tel,
    t.email    AS titular_email,
    -- Plan (nombre/tipo se muestran en vivo; la COBERTURA se lee congelada
    -- desde la propia póliza — ver migración 034 — para que editar el plan
    -- después de la venta nunca cambie lo que esta póliza ya cubre)
    pl.id AS plan_id, pl.nombre AS plan_nombre, pl.tipo AS plan_tipo,
    p.max_beneficiarios, pl.meses_carencia,
    p.cubre_ataud, p.cubre_velacion_h,
    p.cubre_traslado_local, p.cubre_traslado_nacional,
    p.cubre_flores, p.cubre_cremacion, p.cubre_tramites, p.cubre_lapida,
    p.coberturas_extra,
    -- Asesor
    u.nombre AS asesor_nombre,
    -- Sede
    p.sede_id, se.nombre AS sede_nombre,
    -- Beneficiarios count
    (SELECT COUNT(*) FROM poliza_beneficiarios pb WHERE pb.poliza_id = p.id AND pb.activo) AS total_beneficiarios,
    -- Pagos al día
    (SELECT COUNT(*) FROM pagos_poliza pp WHERE pp.poliza_id = p.id) AS total_pagos
`

// ── Buscar póliza por titular (autocomplete para servicios) ──────────────

export async function buscar(req, reply) {
  const { q = '' } = req.query
  if (q.length < 2) return reply.send({ data: [] })

  const res = await pool.query(`
    SELECT
      p.id, p.numero, p.estado, p.valor_cuota, p.meses_mora,
      p.fecha_fin_carencia, p.pago_hasta,
      t.id AS titular_id,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre,
      t.numero_documento AS titular_doc,
      t.telefono AS titular_tel,
      pl.nombre AS plan_nombre, pl.tipo AS plan_tipo,
      (SELECT COUNT(*) FROM poliza_beneficiarios pb
        WHERE pb.poliza_id=p.id AND pb.activo AND NOT pb.ejecutado) AS beneficiarios_disponibles
    FROM polizas p
    JOIN terceros t   ON t.id  = p.titular_id
    JOIN planes_poliza pl ON pl.id = p.plan_id
    WHERE (
      COALESCE(t.nombres||' '||t.apellidos,'') ILIKE $1
      OR t.numero_documento ILIKE $1
      OR CAST(p.numero AS TEXT) ILIKE $1
    )
    ORDER BY p.estado = 'VIGENTE' DESC, p.creado_en DESC
    LIMIT 10`, [`%${q}%`]
  )
  return reply.send({ data: res.rows })
}

// ── Obtener beneficiarios disponibles de una póliza ───────────────────────

export async function beneficiarios(req, reply) {
  const { id } = req.params
  const res = await pool.query(`
    SELECT
      pb.id AS beneficiario_id, pb.parentesco, pb.ejecutado,
      t.id AS tercero_id,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS nombre,
      t.numero_documento, t.direccion,
      td.sigla AS tipo_doc_sigla,
      t.fecha_nacimiento,
      DATE_PART('year', AGE(CURRENT_DATE, t.fecha_nacimiento))::INT AS edad
    FROM poliza_beneficiarios pb
    JOIN terceros t ON t.id = pb.tercero_id
    LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
    WHERE pb.poliza_id = $1 AND pb.activo
    ORDER BY pb.ejecutado ASC, t.nombres ASC`, [id]
  )
  return reply.send({ data: res.rows })
}

// ── Stats / KPIs ──────────────────────────────────────────────────────────

export async function stats(req, reply) {
  await pool.query('SELECT calcular_mora_polizas()')
  const { sedeIds } = resolverSede(req)
  const where = sedeIds ? 'WHERE sede_id = ANY($1::uuid[])' : ''
  const res = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE estado = 'VIGENTE')    AS vigentes,
      COUNT(*) FILTER (WHERE estado = 'SUSPENDIDA') AS suspendidas,
      COUNT(*) FILTER (WHERE estado = 'VENCIDA')    AS vencidas,
      COUNT(*) FILTER (WHERE estado = 'EJECUTADA')  AS ejecutadas,
      COUNT(*) FILTER (WHERE estado = 'CANCELADA')  AS canceladas,
      COUNT(*) FILTER (WHERE meses_mora > 0 AND estado = 'VIGENTE') AS en_mora,
      COALESCE(SUM(valor_cuota) FILTER (WHERE estado = 'VIGENTE'), 0) AS recaudo_mensual_esperado
    FROM polizas ${where}
  `, sedeIds ? [sedeIds] : [])
  return reply.send({ data: res.rows[0] })
}

// ── Listar ────────────────────────────────────────────────────────────────

export async function listar(req, reply) {
  await pool.query('SELECT calcular_mora_polizas()')
  const { q = '', estado = '', plan = '', page = 1, limit = 20 } = req.query
  const offset = (Math.max(1, +page) - 1) * +limit

  const conds = ['1=1']
  const vals  = []
  let i = 1

  if (q) {
    conds.push(`(
      CAST(p.numero AS TEXT) ILIKE $${i}
      OR COALESCE(t.nombres||' '||t.apellidos,'') ILIKE $${i}
      OR t.numero_documento ILIKE $${i}
      OR t.telefono ILIKE $${i}
    )`)
    vals.push(`%${q}%`); i++
  }
  if (estado) { conds.push(`p.estado = $${i}`); vals.push(estado); i++ }
  if (plan)   { conds.push(`p.plan_id = $${i}`); vals.push(plan); i++ }

  const { sedeIds } = resolverSede(req)
  if (sedeIds) { conds.push(`p.sede_id = ANY($${i}::uuid[])`); vals.push(sedeIds); i++ }

  const where = `WHERE ${conds.join(' AND ')}`

  const [data, count] = await Promise.all([
    pool.query(`${SELECT_LIST} ${JOINS} ${where} ORDER BY p.creado_en DESC LIMIT $${i} OFFSET $${i+1}`,
      [...vals, +limit, offset]),
    pool.query(`SELECT COUNT(*) FROM polizas p JOIN terceros t ON t.id=p.titular_id JOIN planes_poliza pl ON pl.id=p.plan_id ${where}`, vals),
  ])

  return reply.send({
    data: data.rows,
    meta: { total: +count.rows[0].count, page: +page, pages: Math.ceil(+count.rows[0].count / +limit) },
  })
}

// ── Obtener detalle ───────────────────────────────────────────────────────

export async function obtener(req, reply) {
  const { id } = req.params

  const [pRes, benRes, pagosRes] = await Promise.all([
    pool.query(`${SELECT_LIST} ${JOINS} WHERE p.id = $1`, [id]),
    pool.query(`
      SELECT pb.*,
        COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS nombre,
        t.numero_documento AS documento, t.telefono,
        td.sigla AS tipo_doc_sigla,
        t.fecha_nacimiento, t.rh
      FROM poliza_beneficiarios pb
      JOIN terceros t ON t.id = pb.tercero_id
      LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
      WHERE pb.poliza_id = $1
      ORDER BY pb.creado_en`, [id]),
    pool.query(`
      SELECT pp.*, u.nombre AS cajero
      FROM pagos_poliza pp
      LEFT JOIN usuarios u ON u.id = pp.usuario_id
      WHERE pp.poliza_id = $1
      ORDER BY pp.mes_correspondiente DESC`, [id]),
  ])

  if (!pRes.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })

  return reply.send({
    data: { ...pRes.rows[0], beneficiarios: benRes.rows, pagos: pagosRes.rows },
  })
}

// ── Datos para generar el contrato de previsión exequial en PDF ─────────────

export async function contratoImpresion(req, reply) {
  const { id } = req.params

  const [pRes, benRes, empRes] = await Promise.all([
    pool.query(`
      SELECT p.*,
        pl.nombre AS plan_nombre, pl.horas_velacion, pl.meses_carencia,
        pl.valor_afiliacion, pl.valor_beneficiario_adicional,
        pl.edad_min_beneficiario, pl.edad_max_beneficiario,
        t.nombres, t.apellidos, t.razon_social, t.tipo_persona,
        COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre,
        t.numero_documento AS titular_doc, td.sigla AS titular_tipo_doc,
        t.fecha_nacimiento AS titular_fecha_nacimiento, t.telefono AS titular_tel,
        t.email AS titular_email, t.direccion AS titular_direccion,
        t.barrio AS titular_barrio, t.vereda AS titular_vereda,
        m.nombre AS titular_municipio, d.nombre AS titular_departamento
      FROM polizas p
      JOIN terceros t ON t.id = p.titular_id
      JOIN planes_poliza pl ON pl.id = p.plan_id
      LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
      LEFT JOIN geo_municipios m ON m.id = t.municipio_id
      LEFT JOIN geo_departamentos d ON d.id = t.departamento_id
      WHERE p.id = $1`, [id]),
    pool.query(`
      SELECT COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS nombre,
        t.numero_documento AS documento, td.sigla AS tipo_doc,
        t.fecha_nacimiento, pb.parentesco
      FROM poliza_beneficiarios pb
      JOIN terceros t ON t.id = pb.tercero_id
      LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
      WHERE pb.poliza_id = $1 AND pb.activo
      ORDER BY pb.creado_en`, [id]),
    pool.query(`
      SELECT razon_social AS nombre_empresa, COALESCE(nombre_comercial, razon_social) AS nombre_comercial,
        nit, direccion, telefono_1 AS telefono, email, municipio, representante_legal
      FROM empresa LIMIT 1`),
  ])

  if (!pRes.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })

  return reply.send({
    data: {
      poliza: pRes.rows[0],
      beneficiarios: benRes.rows,
      empresa: empRes.rows[0] || {},
    },
  })
}

// ── Crear ─────────────────────────────────────────────────────────────────

export async function crear(req, reply) {
  const {
    titular_id, plan_id, valor_cuota, dia_cobro = 1,
    fecha_inicio, observaciones, beneficiarios = [],
  } = req.body

  if (!titular_id) return reply.code(400).send({ error: 'titular_id es obligatorio' })
  if (!plan_id)    return reply.code(400).send({ error: 'plan_id es obligatorio' })
  if (!valor_cuota || +valor_cuota <= 0) return reply.code(400).send({ error: 'valor_cuota debe ser mayor a 0' })

  const planRes = await pool.query('SELECT * FROM planes_poliza WHERE id=$1 AND activo', [plan_id])
  if (!planRes.rows.length) return reply.code(400).send({ error: 'Plan no encontrado o inactivo' })

  const plan = planRes.rows[0]
  if (beneficiarios.length > plan.max_beneficiarios)
    return reply.code(400).send({ error: `El plan permite máximo ${plan.max_beneficiarios} beneficiarios` })

  // Costo de afiliación: solo se cobra si este titular nunca ha tenido
  // ninguna póliza antes (activa, cancelada o vencida — cualquier estado).
  // El monto es propio de cada plan (valor_afiliacion), no un fijo global.
  const previasRes = await pool.query('SELECT 1 FROM polizas WHERE titular_id = $1 LIMIT 1', [titular_id])
  const costoAfiliacion = previasRes.rows.length === 0 ? Number(plan.valor_afiliacion) : 0

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    // Crear póliza
    const ins = await db.query(`
      INSERT INTO polizas (
        titular_id, plan_id, valor_cuota, dia_cobro,
        fecha_inicio, observaciones, usuario_id, sede_id, costo_afiliacion
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, numero, costo_afiliacion`,
      [
        titular_id, plan_id, valor_cuota, dia_cobro,
        fecha_inicio || new Date().toISOString().split('T')[0],
        observaciones || null, req.user.id, sedeParaCrear(req), costoAfiliacion,
      ]
    )

    const polizaId = ins.rows[0].id

    // Asignar rol TITULAR_POLIZA
    await db.query(`
      INSERT INTO tercero_roles (tercero_id, rol)
      VALUES ($1, 'TITULAR_POLIZA')
      ON CONFLICT (tercero_id, rol) DO UPDATE SET activo = TRUE`,
      [titular_id]
    )

    // Insertar beneficiarios
    for (const ben of beneficiarios) {
      await db.query(`
        INSERT INTO poliza_beneficiarios (poliza_id, tercero_id, parentesco)
        VALUES ($1,$2,$3)
        ON CONFLICT (poliza_id, tercero_id) DO NOTHING`,
        [polizaId, ben.tercero_id, ben.parentesco]
      )
      // Asignar rol BENEFICIARIO
      await db.query(`
        INSERT INTO tercero_roles (tercero_id, rol)
        VALUES ($1, 'BENEFICIARIO')
        ON CONFLICT (tercero_id, rol) DO UPDATE SET activo = TRUE`,
        [ben.tercero_id]
      )
    }

    await generarComision(db, {
      usuarioId: req.user.id,
      origenTipo: 'POLIZA',
      origenId: polizaId,
      valorBase: valor_cuota,
    })

    await db.query('COMMIT')
    return reply.code(201).send({ data: ins.rows[0] })
  } catch (e) {
    await db.query('ROLLBACK'); throw e
  } finally { db.release() }
}

// ── Cobrar costo de afiliación (primera vez) ────────────────────────────────

export async function cobrarAfiliacion(req, reply) {
  const { id } = req.params
  const { metodo_pago = 'efectivo' } = req.body
  const { sedeIds } = resolverSede(req)

  const res = await pool.query('SELECT * FROM polizas WHERE id = $1', [id])
  if (!res.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })
  const pol = res.rows[0]

  if (sedeIds !== null && !sedeIds.includes(pol.sede_id))
    return reply.code(403).send({ error: 'La póliza no pertenece a tu sede' })
  if (Number(pol.costo_afiliacion) <= 0)
    return reply.code(400).send({ error: 'Esta póliza no tiene costo de afiliación pendiente' })
  if (pol.afiliacion_pagada)
    return reply.code(400).send({ error: 'El costo de afiliación ya fue pagado' })

  const upd = await pool.query(`
    UPDATE polizas SET
      afiliacion_pagada = TRUE,
      afiliacion_fecha_pago = CURRENT_DATE,
      afiliacion_metodo_pago = $1,
      afiliacion_usuario_id = $2,
      actualizado = NOW()
    WHERE id = $3
    RETURNING id, costo_afiliacion, afiliacion_pagada, afiliacion_fecha_pago, afiliacion_metodo_pago
  `, [metodo_pago, req.user.id, id])

  return reply.send({ data: upd.rows[0] })
}

// ── Actualizar ────────────────────────────────────────────────────────────

export async function actualizar(req, reply) {
  const { id } = req.params
  const { plan_id, valor_cuota, dia_cobro, observaciones } = req.body

  const actual = await pool.query(
    `SELECT plan_id, fecha_fin_carencia FROM polizas WHERE id=$1 AND estado NOT IN ('CANCELADA','EJECUTADA')`, [id]
  )
  if (!actual.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada o no editable' })

  // ── Cambio de plan (upgrade/downgrade): recalcular cobertura y carencia ──
  let camposPlan = null
  let nuevaCarencia = null
  if (plan_id && plan_id !== actual.rows[0].plan_id) {
    const planRes = await pool.query('SELECT * FROM planes_poliza WHERE id=$1 AND activo', [plan_id])
    if (!planRes.rows.length) return reply.code(400).send({ error: 'Plan no encontrado o inactivo' })
    const plan = planRes.rows[0]

    const activos = await pool.query(
      `SELECT COUNT(*) FROM poliza_beneficiarios WHERE poliza_id=$1 AND activo`, [id]
    )
    if (+activos.rows[0].count > plan.max_beneficiarios) {
      return reply.code(400).send({
        error: `No se puede cambiar a este plan: tiene ${activos.rows[0].count} beneficiario(s) activo(s) y el plan solo permite ${plan.max_beneficiarios}.`
      })
    }

    // La cobertura NUEVA/adicional que trae el plan queda con su propio período
    // de carencia contado desde HOY (nunca se reduce la carencia ya cumplida).
    nuevaCarencia = `GREATEST(fecha_fin_carencia, CURRENT_DATE + INTERVAL '${+plan.meses_carencia} months')`
    camposPlan = plan
  }

  const res = await pool.query(`
    UPDATE polizas SET
      plan_id                 = COALESCE($1, plan_id),
      valor_cuota             = COALESCE($2, valor_cuota),
      dia_cobro               = COALESCE($3, dia_cobro),
      observaciones           = COALESCE($4, observaciones),
      max_beneficiarios       = COALESCE($6, max_beneficiarios),
      cubre_ataud             = COALESCE($7, cubre_ataud),
      cubre_velacion_h        = COALESCE($8, cubre_velacion_h),
      cubre_traslado_local    = COALESCE($9, cubre_traslado_local),
      cubre_traslado_nacional = COALESCE($10, cubre_traslado_nacional),
      cubre_flores            = COALESCE($11, cubre_flores),
      cubre_cremacion         = COALESCE($12, cubre_cremacion),
      cubre_tramites          = COALESCE($13, cubre_tramites),
      cubre_lapida            = COALESCE($14, cubre_lapida),
      valor_excedente         = COALESCE($15, valor_excedente),
      coberturas_extra        = COALESCE($16::jsonb, coberturas_extra),
      fecha_fin_carencia      = ${nuevaCarencia || 'fecha_fin_carencia'},
      actualizado             = NOW()
    WHERE id = $5 AND estado NOT IN ('CANCELADA','EJECUTADA')
    RETURNING id, plan_id, fecha_fin_carencia`,
    [
      plan_id||null, valor_cuota||null, dia_cobro||null, observaciones||null, id,
      camposPlan?.max_beneficiarios ?? null,
      camposPlan?.cubre_ataud ?? null,
      camposPlan?.cubre_velacion_h ?? null,
      camposPlan?.cubre_traslado_local ?? null,
      camposPlan?.cubre_traslado_nacional ?? null,
      camposPlan?.cubre_flores ?? null,
      camposPlan?.cubre_cremacion ?? null,
      camposPlan?.cubre_tramites ?? null,
      camposPlan?.cubre_lapida ?? null,
      camposPlan?.valor_excedente ?? null,
      camposPlan ? JSON.stringify(camposPlan.coberturas_extra || []) : null,
    ]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada o no editable' })
  return reply.send({ data: res.rows[0] })
}

// ── Transferir titular ────────────────────────────────────────────────────
// Cambia quién es el titular/pagador de la póliza sin perder antigüedad,
// carencia ya cumplida, ni historial de pagos/beneficiarios.

export async function transferirTitular(req, reply) {
  const { id } = req.params
  const { nuevo_titular_id, motivo } = req.body

  if (!nuevo_titular_id) return reply.code(400).send({ error: 'nuevo_titular_id es obligatorio' })

  const pol = await pool.query(
    `SELECT id, titular_id, estado FROM polizas WHERE id=$1`, [id]
  )
  if (!pol.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })
  const poliza = pol.rows[0]

  if (['CANCELADA','EJECUTADA'].includes(poliza.estado))
    return reply.code(400).send({ error: `No se puede transferir una póliza ${poliza.estado.toLowerCase()}` })

  if (nuevo_titular_id === poliza.titular_id)
    return reply.code(400).send({ error: 'El nuevo titular es la misma persona que ya figura como titular' })

  const nuevoTercero = await pool.query(`SELECT id FROM terceros WHERE id=$1`, [nuevo_titular_id])
  if (!nuevoTercero.rows.length) return reply.code(404).send({ error: 'El tercero indicado no existe' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    await db.query(
      `UPDATE polizas SET titular_id=$1, actualizado=NOW() WHERE id=$2`,
      [nuevo_titular_id, id]
    )

    // Rol TITULAR_POLIZA para el nuevo titular
    await db.query(`
      INSERT INTO tercero_roles (tercero_id, rol) VALUES ($1, 'TITULAR_POLIZA')
      ON CONFLICT (tercero_id, rol) DO UPDATE SET activo = TRUE`,
      [nuevo_titular_id]
    )

    // Si el titular anterior no queda como titular de ninguna otra póliza activa, se retira el rol
    const otras = await db.query(`
      SELECT COUNT(*) FROM polizas
      WHERE titular_id=$1 AND id!=$2 AND estado NOT IN ('CANCELADA','EJECUTADA')`,
      [poliza.titular_id, id]
    )
    if (+otras.rows[0].count === 0) {
      await db.query(
        `UPDATE tercero_roles SET activo=FALSE WHERE tercero_id=$1 AND rol='TITULAR_POLIZA'`,
        [poliza.titular_id]
      )
    }

    // Auditoría de la transferencia
    await db.query(`
      INSERT INTO poliza_transferencias (poliza_id, titular_anterior_id, titular_nuevo_id, motivo, usuario_id)
      VALUES ($1,$2,$3,$4,$5)`,
      [id, poliza.titular_id, nuevo_titular_id, motivo || null, req.user.id]
    )

    await db.query('COMMIT')
    return reply.send({ ok: true })
  } catch (e) {
    await db.query('ROLLBACK'); throw e
  } finally { db.release() }
}

// GET /api/polizas/:id/transferencias — historial de transferencias de titular
export async function historialTransferencias(req, reply) {
  const { id } = req.params
  const r = await pool.query(`
    SELECT pt.id, pt.motivo, pt.creado_en,
      COALESCE(ta.nombres||' '||ta.apellidos, ta.razon_social) AS titular_anterior_nombre,
      ta.numero_documento AS titular_anterior_doc,
      COALESCE(tn.nombres||' '||tn.apellidos, tn.razon_social) AS titular_nuevo_nombre,
      tn.numero_documento AS titular_nuevo_doc,
      u.nombre AS usuario_nombre
    FROM poliza_transferencias pt
    JOIN terceros ta ON ta.id = pt.titular_anterior_id
    JOIN terceros tn ON tn.id = pt.titular_nuevo_id
    LEFT JOIN usuarios u ON u.id = pt.usuario_id
    WHERE pt.poliza_id = $1
    ORDER BY pt.creado_en DESC`, [id]
  )
  return reply.send({ data: r.rows })
}

// ── Cancelar ──────────────────────────────────────────────────────────────

export async function cancelar(req, reply) {
  const { id } = req.params
  const { motivo } = req.body || {}

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const res = await client.query(`
      UPDATE polizas SET estado='CANCELADA', fecha_cancelacion=CURRENT_DATE,
        motivo_cancelacion=$2, actualizado=NOW()
      WHERE id=$1 AND estado NOT IN ('CANCELADA','EJECUTADA')
      RETURNING id`, [id, motivo || null]
    )
    if (!res.rows.length) {
      await client.query('ROLLBACK')
      return reply.code(404).send({ error: 'No encontrada o ya finalizada' })
    }

    await client.query(`
      INSERT INTO poliza_reactivaciones (poliza_id, cancelado_en, motivo_cancelacion, cancelado_por)
      VALUES ($1, CURRENT_DATE, $2, $3)
    `, [id, motivo || null, req.user.id])

    await client.query('COMMIT')
    return reply.send({ data: res.rows[0] })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ── Reactivar una póliza cancelada (misma póliza, no una nueva) ──────────
// Conserva número, historial de pagos, mora y transferencias — solo cambia
// el estado y reinicia el conteo de mora desde la fecha de reactivación.
export async function reactivar(req, reply) {
  const { id } = req.params
  const { motivo } = req.body || {}

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const actual = await client.query(
      `SELECT estado FROM polizas WHERE id=$1 FOR UPDATE`, [id]
    )
    if (!actual.rows.length) {
      await client.query('ROLLBACK')
      return reply.code(404).send({ error: 'Póliza no encontrada' })
    }
    if (actual.rows[0].estado !== 'CANCELADA') {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'Solo se puede reactivar una póliza que esté CANCELADA' })
    }

    const res = await client.query(`
      UPDATE polizas SET
        estado = 'VIGENTE',
        fecha_cancelacion = NULL,
        pago_hasta = CURRENT_DATE,
        meses_mora = 0,
        saldo_mora = 0,
        actualizado = NOW()
      WHERE id = $1
      RETURNING *
    `, [id])

    await client.query(`
      UPDATE poliza_reactivaciones SET
        reactivado_en = CURRENT_DATE,
        motivo_reactivacion = $2,
        reactivado_por = $3
      WHERE poliza_id = $1 AND reactivado_en IS NULL
    `, [id, motivo || null, req.user.id])

    await client.query('COMMIT')
    return reply.send({ data: res.rows[0] })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ── Historial de cancelaciones/reactivaciones de una póliza ──────────────
export async function historialCancelaciones(req, reply) {
  const { id } = req.params
  const r = await pool.query(`
    SELECT pr.*, uc.nombre AS cancelado_por_nombre, ur.nombre AS reactivado_por_nombre
    FROM poliza_reactivaciones pr
    LEFT JOIN usuarios uc ON uc.id = pr.cancelado_por
    LEFT JOIN usuarios ur ON ur.id = pr.reactivado_por
    WHERE pr.poliza_id = $1
    ORDER BY pr.creado_en DESC
  `, [id])
  return reply.send({ data: r.rows })
}

// ── Registrar pago de cuota ───────────────────────────────────────────────

export async function registrarPago(req, reply) {
  const { id } = req.params
  const { mes_correspondiente, monto, metodo_pago = 'efectivo', referencia, fecha_pago } = req.body

  if (!mes_correspondiente) return reply.code(400).send({ error: 'mes_correspondiente es obligatorio (YYYY-MM-DD)' })
  if (!monto || +monto <= 0) return reply.code(400).send({ error: 'monto debe ser mayor a 0' })

  const pol = await pool.query('SELECT id, estado FROM polizas WHERE id=$1', [id])
  if (!pol.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })
  if (pol.rows[0].estado === 'CANCELADA') return reply.code(400).send({ error: 'La póliza está cancelada' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const pagoRes = await db.query(`
      INSERT INTO pagos_poliza (poliza_id, mes_correspondiente, monto, metodo_pago, referencia, fecha_pago, usuario_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (poliza_id, mes_correspondiente) DO UPDATE SET
        monto = EXCLUDED.monto, metodo_pago = EXCLUDED.metodo_pago,
        referencia = EXCLUDED.referencia, fecha_pago = EXCLUDED.fecha_pago
      RETURNING id, numero_recibo`,
      [id, mes_correspondiente, monto, metodo_pago, referencia||null,
       fecha_pago || new Date().toISOString().split('T')[0], req.user.id]
    )

    // Actualizar último pago: solo avanzar, nunca retroceder (pago retroactivo no mueve ultimo_pago)
    const fechaPagoDate = fecha_pago || new Date().toISOString().split('T')[0]
    await db.query(`
      UPDATE polizas SET
        ultimo_pago = GREATEST(COALESCE(ultimo_pago, '1970-01-01'::date), $2::date),
        meses_mora  = GREATEST(0, meses_mora - 1),
        estado      = CASE WHEN estado IN ('SUSPENDIDA','VENCIDA') THEN 'VIGENTE' ELSE estado END,
        actualizado = NOW()
      WHERE id = $1`, [id, fechaPagoDate]
    )

    await db.query('COMMIT')
    return reply.code(201).send({ ok: true, pago: pagoRes.rows[0] })
  } catch (e) {
    await db.query('ROLLBACK')
    if (e.code === '23505') return reply.code(409).send({ error: 'Ya existe un pago para ese mes' })
    throw e
  } finally { db.release() }
}

// ── Agregar beneficiario ──────────────────────────────────────────────────

export async function agregarBeneficiario(req, reply) {
  const { id } = req.params
  const { tercero_id, parentesco } = req.body
  if (!tercero_id || !parentesco) return reply.code(400).send({ error: 'tercero_id y parentesco son obligatorios' })

  // Verificar límite del plan (congelado en la póliza al momento de la venta)
  const pol = await pool.query(`
    SELECT p.max_beneficiarios,
      (SELECT COUNT(*) FROM poliza_beneficiarios pb WHERE pb.poliza_id=$1 AND pb.activo) AS current_count
    FROM polizas p WHERE p.id=$1`, [id]
  )
  if (!pol.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })
  if (+pol.rows[0].current_count >= +pol.rows[0].max_beneficiarios)
    return reply.code(400).send({ error: `El plan solo permite ${pol.rows[0].max_beneficiarios} beneficiarios` })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    await db.query(`
      INSERT INTO poliza_beneficiarios (poliza_id, tercero_id, parentesco)
      VALUES ($1,$2,$3)
      ON CONFLICT (poliza_id, tercero_id) DO UPDATE SET activo=TRUE, parentesco=$3`,
      [id, tercero_id, parentesco]
    )
    await db.query(`
      INSERT INTO tercero_roles (tercero_id, rol) VALUES ($1,'BENEFICIARIO')
      ON CONFLICT (tercero_id, rol) DO UPDATE SET activo=TRUE`, [tercero_id]
    )
    await db.query('COMMIT')
    return reply.code(201).send({ ok: true })
  } catch (e) {
    await db.query('ROLLBACK'); throw e
  } finally { db.release() }
}

export async function quitarBeneficiario(req, reply) {
  const { benId } = req.params
  await pool.query(`UPDATE poliza_beneficiarios SET activo=FALSE WHERE id=$1`, [benId])
  return reply.send({ ok: true })
}

// ── Verificar elegibilidad (antes de ejecutar) ────────────────────────────

export async function verificarElegibilidad(req, reply) {
  const { id } = req.params
  const { tercero_id } = req.query

  const pol = await pool.query(`
    SELECT p.*, pl.nombre AS plan_nombre, pl.meses_carencia,
      EXISTS(
        SELECT 1 FROM poliza_beneficiarios pb
        WHERE pb.poliza_id=p.id AND pb.tercero_id=$2 AND pb.activo AND NOT pb.ejecutado
      ) AS es_beneficiario
    FROM polizas p JOIN planes_poliza pl ON pl.id=p.plan_id
    WHERE p.id=$1`, [id, tercero_id]
  )

  if (!pol.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })
  const p = pol.rows[0]

  // Comparación de carencia 100% en servidor (sin timezone JS)
  const { rows: fechaRows } = await pool.query(
    `SELECT (CURRENT_DATE < $1::date) AS en_carencia`, [p.fecha_fin_carencia]
  )
  const enCarencia = fechaRows[0]?.en_carencia ?? true

  const checks = {
    poliza_vigente:   p.estado === 'VIGENTE',
    fuera_carencia:   !enCarencia,
    es_beneficiario:  p.es_beneficiario === true,
    sin_mora:         +p.meses_mora === 0,
  }

  const elegible = Object.values(checks).every(Boolean)

  return reply.send({
    data: {
      elegible,
      checks,
      poliza: {
        numero: p.numero, estado: p.estado, meses_mora: p.meses_mora,
        fecha_fin_carencia: p.fecha_fin_carencia, plan_nombre: p.plan_nombre,
      },
      cobertura: {
        ataud:              p.cubre_ataud,
        velacion_horas:     p.cubre_velacion_h,
        traslado_local:     p.cubre_traslado_local,
        traslado_nacional:  p.cubre_traslado_nacional,
        flores:             p.cubre_flores,
        cremacion:          p.cubre_cremacion,
        tramites:           p.cubre_tramites,
        lapida:             p.cubre_lapida,
      },
    },
  })
}

// ── Ejecutar póliza (cuando fallece un beneficiario) ──────────────────────

export async function ejecutar(req, reply) {
  const { id } = req.params
  const { tercero_id, servicio_id } = req.body

  if (!tercero_id) return reply.code(400).send({ error: 'tercero_id es obligatorio' })

  // Verificar elegibilidad ANTES de ejecutar
  const eligRes = await pool.query(`
    SELECT p.estado, p.meses_mora, p.fecha_fin_carencia,
      (CURRENT_DATE < p.fecha_fin_carencia) AS en_carencia,
      EXISTS(
        SELECT 1 FROM poliza_beneficiarios pb
        WHERE pb.poliza_id=p.id AND pb.tercero_id=$2 AND pb.activo AND NOT pb.ejecutado
      ) AS es_beneficiario
    FROM polizas p WHERE p.id=$1`, [id, tercero_id]
  )
  if (!eligRes.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })
  const elig = eligRes.rows[0]
  if (elig.estado !== 'VIGENTE')
    return reply.code(400).send({ error: `La póliza está en estado ${elig.estado}. Solo se pueden ejecutar pólizas VIGENTES.` })
  if (elig.en_carencia)
    return reply.code(400).send({ error: `La póliza está en período de carencia hasta ${elig.fecha_fin_carencia}. No cubre fallecimientos durante este período.` })
  if (+elig.meses_mora > 0)
    return reply.code(400).send({ error: `La póliza tiene ${elig.meses_mora} mes(es) de mora. Debe estar al día para ejecutarse.` })
  if (!elig.es_beneficiario)
    return reply.code(400).send({ error: 'El tercero no es beneficiario activo de esta póliza o ya fue ejecutado.' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    // Marcar beneficiario como ejecutado
    const benRes = await db.query(`
      UPDATE poliza_beneficiarios SET
        ejecutado=TRUE, fecha_ejecucion=CURRENT_DATE, servicio_id=$1
      WHERE poliza_id=$2 AND tercero_id=$3 AND activo AND NOT ejecutado
      RETURNING id`, [servicio_id||null, id, tercero_id]
    )
    if (!benRes.rows.length) {
      await db.query('ROLLBACK')
      return reply.code(400).send({ error: 'El beneficiario no está activo en esta póliza o ya fue ejecutado' })
    }

    // Verificar si quedan beneficiarios activos sin ejecutar
    const restantes = await db.query(`
      SELECT COUNT(*) FROM poliza_beneficiarios
      WHERE poliza_id=$1 AND activo AND NOT ejecutado`, [id]
    )

    // Si no quedan → marcar póliza como EJECUTADA
    if (+restantes.rows[0].count === 0) {
      await db.query(`UPDATE polizas SET estado='EJECUTADA', actualizado=NOW() WHERE id=$1`, [id])
    }

    await db.query('COMMIT')
    return reply.send({ ok: true, beneficiarios_restantes: +restantes.rows[0].count })
  } catch (e) {
    await db.query('ROLLBACK'); throw e
  } finally { db.release() }
}

// ── Planes (para select) ──────────────────────────────────────────────────

export async function planes(req, reply) {
  const { todos = '' } = req.query
  const where = todos === '1' ? '' : 'WHERE activo'
  const res = await pool.query(`
    SELECT p.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', sc.id, 'nombre', sc.nombre, 'categoria', sc.categoria, 'precio_base', sc.precio_base
        ) ORDER BY sc.nombre)
        FROM plan_servicios ps JOIN servicios_catalogo sc ON sc.id = ps.servicio_id
        WHERE ps.plan_id = p.id
      ), '[]') AS servicios
    FROM planes_poliza p
    ${where}
    ORDER BY valor_mensual
  `)
  return reply.send({ data: res.rows })
}

// ── CRUD Planes ───────────────────────────────────────────────────────────

export async function crearPlan(req, reply) {
  const {
    nombre, descripcion, tipo = 'FAMILIAR',
    max_beneficiarios = 1, valor_mensual, meses_carencia = 3,
    cubre_ataud = 'BASICO', cubre_velacion_h = 4,
    cubre_traslado_local = true, cubre_traslado_nacional = false,
    cubre_flores = false, cubre_cremacion = false,
    cubre_tramites = true, cubre_lapida = false,
    valor_excedente = 0,
    coberturas_extra = [],
    servicios_ids = [],
    valor_afiliacion = 20000,
    valor_beneficiario_adicional = 0,
    edad_min_beneficiario = 0,
    edad_max_beneficiario = 65,
  } = req.body

  if (!nombre) return reply.code(400).send({ error: 'nombre es obligatorio' })
  if (!valor_mensual || +valor_mensual <= 0) return reply.code(400).send({ error: 'valor_mensual debe ser mayor a 0' })

  const extras = Array.isArray(coberturas_extra)
    ? coberturas_extra.filter(c => c?.nombre?.trim())
    : []

  // Código público (slug) para la URL de la landing — estable aunque luego
  // se edite el nombre del plan.
  const baseSlug = nombre.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  let codigo = baseSlug
  let sufijo = 1
  while ((await pool.query('SELECT 1 FROM planes_poliza WHERE codigo=$1', [codigo])).rows.length) {
    sufijo++
    codigo = `${baseSlug}-${sufijo}`
  }

  const res = await pool.query(`
    INSERT INTO planes_poliza (
      nombre, codigo, descripcion, tipo, max_beneficiarios, valor_mensual, meses_carencia,
      cubre_ataud, cubre_velacion_h, cubre_traslado_local, cubre_traslado_nacional,
      cubre_flores, cubre_cremacion, cubre_tramites, cubre_lapida, valor_excedente,
      coberturas_extra, valor_afiliacion, valor_beneficiario_adicional,
      edad_min_beneficiario, edad_max_beneficiario
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING *`,
    [
      nombre, codigo, descripcion||null, tipo, +max_beneficiarios, +valor_mensual, +meses_carencia,
      cubre_ataud, +cubre_velacion_h,
      Boolean(cubre_traslado_local), Boolean(cubre_traslado_nacional),
      Boolean(cubre_flores), Boolean(cubre_cremacion),
      Boolean(cubre_tramites), Boolean(cubre_lapida), +valor_excedente,
      JSON.stringify(extras),
      +valor_afiliacion, +valor_beneficiario_adicional,
      +edad_min_beneficiario, +edad_max_beneficiario,
    ]
  )

  const planId = res.rows[0].id
  const idsServicios = Array.isArray(servicios_ids) ? [...new Set(servicios_ids.filter(Boolean))] : []
  for (const servicioId of idsServicios) {
    await pool.query(
      `INSERT INTO plan_servicios (plan_id, servicio_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [planId, servicioId]
    )
  }

  return reply.code(201).send({ data: res.rows[0] })
}

export async function actualizarPlan(req, reply) {
  const { id } = req.params
  const {
    nombre, descripcion, tipo, max_beneficiarios, valor_mensual, meses_carencia,
    cubre_ataud, cubre_velacion_h,
    cubre_traslado_local, cubre_traslado_nacional,
    cubre_flores, cubre_cremacion, cubre_tramites, cubre_lapida,
    valor_excedente, activo, coberturas_extra, servicios_ids,
    valor_afiliacion, valor_beneficiario_adicional,
    edad_min_beneficiario, edad_max_beneficiario,
  } = req.body

  const extrasParam = coberturas_extra != null
    ? JSON.stringify(Array.isArray(coberturas_extra)
        ? coberturas_extra.filter(c => c?.nombre?.trim())
        : [])
    : null

  const res = await pool.query(`
    UPDATE planes_poliza SET
      nombre                = COALESCE($1,  nombre),
      descripcion           = COALESCE($2,  descripcion),
      tipo                  = COALESCE($3,  tipo),
      max_beneficiarios     = COALESCE($4,  max_beneficiarios),
      valor_mensual         = COALESCE($5,  valor_mensual),
      meses_carencia        = COALESCE($6,  meses_carencia),
      cubre_ataud           = COALESCE($7,  cubre_ataud),
      cubre_velacion_h      = COALESCE($8,  cubre_velacion_h),
      cubre_traslado_local  = COALESCE($9,  cubre_traslado_local),
      cubre_traslado_nacional = COALESCE($10, cubre_traslado_nacional),
      cubre_flores          = COALESCE($11, cubre_flores),
      cubre_cremacion       = COALESCE($12, cubre_cremacion),
      cubre_tramites        = COALESCE($13, cubre_tramites),
      cubre_lapida          = COALESCE($14, cubre_lapida),
      valor_excedente       = COALESCE($15, valor_excedente),
      activo                = COALESCE($16, activo),
      coberturas_extra      = COALESCE($17::jsonb, coberturas_extra),
      valor_afiliacion             = COALESCE($19, valor_afiliacion),
      valor_beneficiario_adicional = COALESCE($20, valor_beneficiario_adicional),
      edad_min_beneficiario        = COALESCE($21, edad_min_beneficiario),
      edad_max_beneficiario        = COALESCE($22, edad_max_beneficiario)
    WHERE id = $18
    RETURNING *`,
    [
      nombre||null, descripcion||null, tipo||null,
      max_beneficiarios != null ? +max_beneficiarios : null,
      valor_mensual     != null ? +valor_mensual     : null,
      meses_carencia    != null ? +meses_carencia    : null,
      cubre_ataud||null,
      cubre_velacion_h  != null ? +cubre_velacion_h  : null,
      cubre_traslado_local  != null ? Boolean(cubre_traslado_local)  : null,
      cubre_traslado_nacional != null ? Boolean(cubre_traslado_nacional) : null,
      cubre_flores   != null ? Boolean(cubre_flores)   : null,
      cubre_cremacion != null ? Boolean(cubre_cremacion) : null,
      cubre_tramites != null ? Boolean(cubre_tramites) : null,
      cubre_lapida   != null ? Boolean(cubre_lapida)   : null,
      valor_excedente != null ? +valor_excedente : null,
      activo != null ? Boolean(activo) : null,
      extrasParam,
      id,
      valor_afiliacion != null ? +valor_afiliacion : null,
      valor_beneficiario_adicional != null ? +valor_beneficiario_adicional : null,
      edad_min_beneficiario != null ? +edad_min_beneficiario : null,
      edad_max_beneficiario != null ? +edad_max_beneficiario : null,
    ]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Plan no encontrado' })

  // Si mandan la lista de servicios, reemplaza las asignaciones existentes
  if (Array.isArray(servicios_ids)) {
    await pool.query('DELETE FROM plan_servicios WHERE plan_id = $1', [id])
    const idsServicios = [...new Set(servicios_ids.filter(Boolean))]
    for (const servicioId of idsServicios) {
      await pool.query(
        `INSERT INTO plan_servicios (plan_id, servicio_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, servicioId]
      )
    }
  }

  return reply.send({ data: res.rows[0] })
}

export async function desactivarPlan(req, reply) {
  const { id } = req.params
  const usos = await pool.query(
    `SELECT COUNT(*) FROM polizas WHERE plan_id=$1 AND estado NOT IN ('CANCELADA','EJECUTADA')`, [id]
  )
  if (+usos.rows[0].count > 0)
    return reply.code(400).send({ error: `No se puede eliminar: hay ${usos.rows[0].count} póliza(s) activa(s) con este plan` })

  const res = await pool.query(
    `UPDATE planes_poliza SET activo=FALSE WHERE id=$1 RETURNING id, nombre`, [id]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Plan no encontrado' })
  return reply.send({ data: res.rows[0] })
}