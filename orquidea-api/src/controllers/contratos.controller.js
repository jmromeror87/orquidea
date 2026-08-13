/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contratos                                            ║
 * ║  Archivo         : contratos.controller.js                              ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { generarComision } from '../utils/comisiones.js'
import { resolverSede, sedeParaCrear } from '../utils/sede.js'

// ── Helpers ───────────────────────────────────────────────────────────────

const JOINS = `
  FROM contratos c
  LEFT JOIN terceros cont ON cont.id = c.contratante_id
  LEFT JOIN terceros dif  ON dif.id  = c.difunto_id
  LEFT JOIN paquetes_servicio ps ON ps.id = c.paquete_id
  LEFT JOIN usuarios u ON u.id = c.usuario_id
  LEFT JOIN sedes se ON se.id = c.sede_id
`

const SELECT_LIST = `
  SELECT
    c.id, c.numero, c.tipo_contrato, c.modalidad, c.estado,
    c.valor_total, c.valor_pagado, c.saldo_pendiente,
    c.num_cuotas, c.valor_cuota, c.dia_cobro,
    c.fecha_inicio, c.fecha_vencimiento, c.fecha_servicio,
    c.observaciones, c.creado_en,
    -- Contratante
    cont.id AS contratante_id,
    COALESCE(cont.nombres||' '||cont.apellidos, cont.razon_social) AS contratante_nombre,
    cont.numero_documento AS contratante_doc,
    cont.telefono AS contratante_tel,
    -- Difunto
    dif.id AS difunto_id,
    COALESCE(dif.nombres||' '||dif.apellidos, dif.razon_social) AS difunto_nombre,
    -- Paquete
    ps.id AS paquete_id, ps.nombre AS paquete_nombre, ps.precio_base,
    -- Asesor
    u.nombre AS asesor_nombre,
    -- Sede
    c.sede_id, se.nombre AS sede_nombre
`

// ── Listar (paginado + filtros) ───────────────────────────────────────────

export async function listar(req, reply) {
  const {
    q = '', estado = '', tipo = '', page = 1, limit = 20,
  } = req.query
  const offset = (Math.max(1, +page) - 1) * +limit

  const conditions = ['1=1']
  const vals = []
  let i = 1

  if (q) {
    conditions.push(`(
      CAST(c.numero AS TEXT) ILIKE $${i}
      OR COALESCE(cont.nombres||' '||cont.apellidos, cont.razon_social) ILIKE $${i}
      OR cont.numero_documento ILIKE $${i}
      OR COALESCE(dif.nombres||' '||dif.apellidos,'') ILIKE $${i}
    )`)
    vals.push(`%${q}%`); i++
  }
  if (estado) { conditions.push(`c.estado = $${i}`); vals.push(estado); i++ }
  if (tipo)   { conditions.push(`c.tipo_contrato = $${i}`); vals.push(tipo); i++ }

  const { sedeIds } = resolverSede(req)
  if (sedeIds) { conditions.push(`c.sede_id = ANY($${i}::uuid[])`); vals.push(sedeIds); i++ }

  const where = `WHERE ${conditions.join(' AND ')}`

  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `${SELECT_LIST} ${JOINS} ${where}
       ORDER BY c.creado_en DESC LIMIT $${i} OFFSET $${i+1}`,
      [...vals, +limit, offset]
    ),
    pool.query(`SELECT COUNT(*) ${JOINS} ${where}`, vals),
  ])

  return reply.send({
    data: dataRes.rows,
    meta: {
      total: +countRes.rows[0].count,
      page:  +page,
      pages: Math.ceil(+countRes.rows[0].count / +limit),
    },
  })
}

// ── Obtener detalle ───────────────────────────────────────────────────────

export async function obtener(req, reply) {
  const { id } = req.params

  const [cRes, pagosRes, adicsRes] = await Promise.all([
    pool.query(
      `${SELECT_LIST} ${JOINS} WHERE c.id = $1`, [id]
    ),
    pool.query(
      `SELECT p.*, u.nombre AS cajero
       FROM pagos p
       LEFT JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.contrato_id = $1
       ORDER BY p.fecha_pago DESC, p.creado_en DESC`,
      [id]
    ),
    pool.query(
      `SELECT * FROM servicios_adicionales WHERE contrato_id = $1 ORDER BY creado_en`,
      [id]
    ),
  ])

  if (!cRes.rows.length) return reply.code(404).send({ error: 'Contrato no encontrado' })

  return reply.send({
    data: {
      ...cRes.rows[0],
      pagos:                pagosRes.rows,
      servicios_adicionales: adicsRes.rows,
    },
  })
}

// ── Crear ─────────────────────────────────────────────────────────────────

export async function crear(req, reply) {
  const {
    contratante_id, difunto_id, paquete_id,
    tipo_contrato = 'INMEDIATO', modalidad = 'CONTADO',
    valor_total, num_cuotas = 1, valor_cuota = 0, dia_cobro,
    fecha_inicio, fecha_vencimiento, fecha_servicio,
    observaciones,
  } = req.body

  if (!contratante_id) return reply.code(400).send({ error: 'contratante_id es obligatorio' })
  if (!valor_total || +valor_total <= 0) return reply.code(400).send({ error: 'valor_total debe ser mayor a 0' })

  const cli = await pool.query('SELECT id FROM terceros WHERE id = $1 AND activo', [contratante_id])
  if (!cli.rows.length) return reply.code(400).send({ error: 'El contratante no existe o está inactivo' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const ins = await db.query(`
      INSERT INTO contratos (
        contratante_id, difunto_id, paquete_id,
        tipo_contrato, modalidad, valor_total,
        num_cuotas, valor_cuota, dia_cobro,
        fecha_inicio, fecha_vencimiento, fecha_servicio,
        observaciones, usuario_id, sede_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id, numero`,
      [
        contratante_id, difunto_id || null, paquete_id || null,
        tipo_contrato, modalidad, +valor_total,
        +num_cuotas, valor_cuota ? +valor_cuota : Math.ceil(+valor_total / +num_cuotas), dia_cobro || null,
        fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_vencimiento || null,
        fecha_servicio || null,
        observaciones || null,
        req.user.id,
        sedeParaCrear(req),
      ]
    )

    await generarComision(db, {
      usuarioId: req.user.id,
      origenTipo: 'CONTRATO',
      origenId: ins.rows[0].id,
      valorBase: +valor_total,
    })

    await db.query('COMMIT')
    return reply.code(201).send({ data: ins.rows[0] })
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  } finally {
    db.release()
  }
}

// ── Actualizar ────────────────────────────────────────────────────────────

export async function actualizar(req, reply) {
  const { id } = req.params
  const {
    difunto_id, paquete_id, tipo_contrato, modalidad,
    valor_total, num_cuotas, valor_cuota, dia_cobro,
    fecha_inicio, fecha_vencimiento, fecha_servicio, observaciones,
  } = req.body

  const res = await pool.query(`
    UPDATE contratos SET
      difunto_id        = COALESCE($1, difunto_id),
      paquete_id        = COALESCE($2, paquete_id),
      tipo_contrato     = COALESCE($3, tipo_contrato),
      modalidad         = COALESCE($4, modalidad),
      valor_total       = COALESCE($5, valor_total),
      num_cuotas        = COALESCE($6, num_cuotas),
      valor_cuota       = COALESCE($7, valor_cuota),
      dia_cobro         = COALESCE($8, dia_cobro),
      fecha_inicio      = COALESCE($9,  fecha_inicio),
      fecha_vencimiento = COALESCE($10, fecha_vencimiento),
      fecha_servicio    = COALESCE($11, fecha_servicio),
      observaciones     = COALESCE($12, observaciones),
      actualizado       = NOW()
    WHERE id = $13 AND estado <> 'cancelado'
    RETURNING id`,
    [
      difunto_id || null, paquete_id || null, tipo_contrato || null,
      modalidad || null, valor_total || null, num_cuotas || null,
      valor_cuota || null, dia_cobro || null,
      fecha_inicio || null, fecha_vencimiento || null, fecha_servicio || null,
      observaciones || null, id,
    ]
  )

  if (!res.rows.length) return reply.code(404).send({ error: 'Contrato no encontrado o cancelado' })
  return reply.send({ data: res.rows[0] })
}

// ── Cambiar estado ────────────────────────────────────────────────────────

export async function cambiarEstado(req, reply) {
  const { id } = req.params
  const { estado } = req.body

  const validos = ['activo', 'completado', 'cancelado', 'en_mora']
  if (!validos.includes(estado?.toLowerCase()))
    return reply.code(400).send({ error: `Estado inválido. Permitidos: ${validos.join(', ')}` })
  const estadoNorm = estado.toLowerCase()

  const res = await pool.query(
    `UPDATE contratos SET estado = $1, actualizado = NOW() WHERE id = $2 RETURNING id, estado`,
    [estadoNorm, id]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Contrato no encontrado' })
  return reply.send({ data: res.rows[0] })
}

// ── KPIs / Stats ──────────────────────────────────────────────────────────

export async function stats(req, reply) {
  const { sedeIds } = resolverSede(req)
  const where = sedeIds ? 'WHERE sede_id = ANY($1::uuid[])' : ''
  const res = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE estado = 'activo')     AS activos,
      COUNT(*) FILTER (WHERE estado = 'completado') AS completados,
      COUNT(*) FILTER (WHERE estado = 'cancelado')  AS cancelados,
      COUNT(*) FILTER (WHERE tipo_contrato = 'PREVISION' AND estado = 'activo') AS prevision,
      COUNT(*) FILTER (WHERE tipo_contrato = 'INMEDIATO' AND estado = 'activo') AS inmediato,
      COALESCE(SUM(valor_total)  FILTER (WHERE estado = 'activo'), 0) AS cartera_total,
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE estado = 'activo' AND saldo_pendiente > 0), 0) AS cartera_mora
    FROM contratos ${where}
  `, sedeIds ? [sedeIds] : [])
  return reply.send({ data: res.rows[0] })
}

// ── Paquetes ─────────────────────────────────────────────────────────────

export async function paquetes(req, reply) {
  const soloActivos = req.query.todos !== '1'
  const { tipo } = req.query
  const conds = []; const vals = []
  if (soloActivos) conds.push('ps.activo')
  if (tipo) { vals.push(tipo); conds.push(`$${vals.length} = ANY(ps.tipos)`) }
  const res = await pool.query(`
    SELECT
      ps.id, ps.nombre, ps.descripcion, ps.precio_base, ps.activo, ps.tipos,
      COALESCE(
        json_agg(
          json_build_object(
            'id',              pi.id,
            'nombre',          pi.nombre,
            'categoria',       pi.categoria,
            'precio_unitario', pi.precio_unitario,
            'orden',           pi.orden,
            'catalogo_id',     pi.catalogo_id,
            'catalogo_codigo', sc.codigo
          ) ORDER BY pi.orden
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM paquetes_servicio ps
    LEFT JOIN paquete_items pi ON pi.paquete_id = ps.id
    LEFT JOIN servicios_catalogo sc ON sc.id = pi.catalogo_id
    ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}
    GROUP BY ps.id
    ORDER BY ps.precio_base
  `, vals)
  return reply.send({ data: res.rows })
}

const TIPOS_PAQUETE_VALIDOS = ['CONVENIO', 'CONTRATO']

export async function crearPaquete(req, reply) {
  const { nombre, descripcion = '', activo = true, tipos } = req.body
  if (!nombre) return reply.status(400).send({ error: 'El nombre es obligatorio' })
  const tiposLimpios = (Array.isArray(tipos) ? tipos : TIPOS_PAQUETE_VALIDOS).filter(t => TIPOS_PAQUETE_VALIDOS.includes(t))
  const r = await pool.query(
    `INSERT INTO paquetes_servicio (nombre, descripcion, precio_base, activo, tipos)
     VALUES ($1,$2,0,$3,$4) RETURNING *`,
    [nombre, descripcion, activo, tiposLimpios.length ? tiposLimpios : TIPOS_PAQUETE_VALIDOS]
  )
  return reply.status(201).send({ data: r.rows[0] })
}

export async function actualizarPaquete(req, reply) {
  const { id } = req.params
  const { nombre, descripcion, activo, tipos } = req.body
  const tiposLimpios = Array.isArray(tipos) ? tipos.filter(t => TIPOS_PAQUETE_VALIDOS.includes(t)) : null
  const r = await pool.query(
    `UPDATE paquetes_servicio
     SET nombre=$1, descripcion=$2, activo=$3, tipos=COALESCE($5, tipos)
     WHERE id=$4 RETURNING *`,
    [nombre, descripcion ?? '', activo, id, tiposLimpios]
  )
  if (!r.rows.length) return reply.status(404).send({ error: 'Paquete no encontrado' })
  return reply.send({ data: r.rows[0] })
}

export async function eliminarPaquete(req, reply) {
  const { id } = req.params
  await pool.query('DELETE FROM paquetes_servicio WHERE id=$1', [id])
  return reply.send({ ok: true })
}

// ── Paquete Items ─────────────────────────────────────────────────────────

export async function listarItems(req, reply) {
  const r = await pool.query(
    `SELECT pi.*, sc.codigo AS catalogo_codigo, sc.precio_base AS catalogo_precio
     FROM paquete_items pi
     LEFT JOIN servicios_catalogo sc ON sc.id = pi.catalogo_id
     WHERE pi.paquete_id=$1 ORDER BY pi.orden, pi.id`,
    [req.params.paqId]
  )
  return reply.send({ data: r.rows })
}

async function recalcularPrecioBase(paqId) {
  await pool.query(
    `UPDATE paquetes_servicio SET precio_base = COALESCE(
       (SELECT SUM(precio_unitario) FROM paquete_items WHERE paquete_id=$1), 0)
     WHERE id=$1`,
    [paqId]
  )
}

export async function crearItem(req, reply) {
  const { paqId } = req.params
  const { catalogo_id, orden = 0 } = req.body
  if (!catalogo_id) return reply.status(400).send({ error: 'Debe seleccionar un ítem del catálogo' })

  // Leer nombre, categoria y precio del catálogo
  const sc = await pool.query('SELECT nombre, categoria, precio_base FROM servicios_catalogo WHERE id=$1 AND activo', [catalogo_id])
  if (!sc.rows.length) return reply.status(404).send({ error: 'Ítem de catálogo no encontrado o inactivo' })

  // Evitar duplicados en el mismo paquete
  const dup = await pool.query('SELECT id FROM paquete_items WHERE paquete_id=$1 AND catalogo_id=$2', [paqId, catalogo_id])
  if (dup.rows.length) return reply.status(409).send({ error: 'Este servicio ya está incluido en el paquete' })

  const { nombre, categoria, precio_base } = sc.rows[0]
  const r = await pool.query(
    `INSERT INTO paquete_items (paquete_id, catalogo_id, nombre, categoria, precio_unitario, orden)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [paqId, catalogo_id, nombre, categoria, precio_base, orden]
  )
  await recalcularPrecioBase(paqId)
  return reply.status(201).send({ data: r.rows[0] })
}

export async function eliminarItem(req, reply) {
  const { paqId, itemId } = req.params
  await pool.query('DELETE FROM paquete_items WHERE id=$1 AND paquete_id=$2', [itemId, paqId])
  await recalcularPrecioBase(paqId)
  return reply.send({ ok: true })
}
