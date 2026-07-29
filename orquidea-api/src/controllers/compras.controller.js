/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Compras                                             ║
 * ║  Archivo         : compras.controller.js                               ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { auditarCompra, obtenerAuditoria } from '../utils/comprasAuditoria.js'
import { resolverSede, bodegaPermitida } from '../utils/sede.js'

// Helper: expression for tercero display name
const TNOM = `COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,''))))`

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

export async function stats(req, reply) {
  const { sedeIds } = resolverSede(req)
  const s = [sedeIds]

  const [solPend, ocPend, recPend, cxpAgg, cxpVenc, comprasMes, topProv] = await Promise.all([
    pool.query(`
      SELECT COUNT(*) AS total FROM cmp_solicitudes s
      LEFT JOIN inv_bodegas b ON b.id = s.bodega_id
      WHERE s.estado='PENDIENTE' AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT COUNT(*) AS total FROM inv_ordenes_compra o
      LEFT JOIN inv_bodegas b ON b.id = o.bodega_destino_id
      WHERE o.estado='PENDIENTE' AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT COUNT(*) AS total FROM cmp_recepciones r
      LEFT JOIN inv_bodegas b ON b.id = r.bodega_id
      WHERE r.estado IN ('PENDIENTE','PARCIAL') AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT COALESCE(SUM(cp.monto_pendiente),0) AS total FROM cmp_cuentas_pagar cp
      LEFT JOIN inv_ordenes_compra o ON o.id = cp.orden_compra_id
      LEFT JOIN inv_bodegas b ON b.id = o.bodega_destino_id
      WHERE cp.estado IN ('PENDIENTE','PARCIAL','VENCIDA') AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT COUNT(*) AS total FROM cmp_cuentas_pagar cp
      LEFT JOIN inv_ordenes_compra o ON o.id = cp.orden_compra_id
      LEFT JOIN inv_bodegas b ON b.id = o.bodega_destino_id
      WHERE (cp.estado='VENCIDA' OR (cp.estado IN ('PENDIENTE','PARCIAL') AND cp.fecha_vencimiento < CURRENT_DATE))
        AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT COALESCE(SUM(o.total),0) AS total FROM inv_ordenes_compra o
      LEFT JOIN inv_bodegas b ON b.id = o.bodega_destino_id
      WHERE o.estado='RECIBIDA'
        AND date_trunc('month', o.creado_en) = date_trunc('month', NOW())
        AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT cp.id,
             COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS nombre,
             COALESCE(SUM(oc.total),0) AS total_compras
      FROM cmp_proveedores cp
      JOIN terceros t ON t.id = cp.tercero_id
      JOIN inv_ordenes_compra oc ON oc.proveedor_cmp_id = cp.id
      LEFT JOIN inv_bodegas b ON b.id = oc.bodega_destino_id
      WHERE oc.estado = 'RECIBIDA'
        AND date_trunc('month', oc.creado_en) = date_trunc('month', NOW())
        AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
      GROUP BY cp.id, t.razon_social, t.nombres, t.apellidos
      ORDER BY total_compras DESC
      LIMIT 5
    `, s),
  ])

  return reply.send({
    solicitudes_pendientes:          parseInt(solPend.rows[0].total),
    ordenes_pendientes_aprobacion:   parseInt(ocPend.rows[0].total),
    recepciones_pendientes:          parseInt(recPend.rows[0].total),
    cuentas_por_pagar:               parseFloat(cxpAgg.rows[0].total),
    cuentas_vencidas:                parseInt(cxpVenc.rows[0].total),
    compras_mes:                     parseFloat(comprasMes.rows[0].total),
    top_proveedores:                 topProv.rows,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLICITUDES
// ═══════════════════════════════════════════════════════════════════════════

export async function listarSolicitudes(req, reply) {
  const { estado, prioridad, page = 1, limit = 20 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const { sedeIds } = resolverSede(req)
  const params = []
  const wheres = []

  if (estado)    { params.push(estado);    wheres.push(`s.estado = $${params.length}`) }
  if (prioridad) { params.push(prioridad); wheres.push(`s.prioridad = $${params.length}`) }
  params.push(sedeIds); wheres.push(`($${params.length}::uuid[] IS NULL OR b.sede_id = ANY($${params.length}::uuid[]))`)

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  params.push(parseInt(limit))
  params.push(offset)

  const { rows } = await pool.query(`
    SELECT s.id, s.numero, s.estado, s.prioridad, s.motivo,
           s.fecha_requerida, s.creado_en,
           u.nombre  AS solicitante_nombre,
           b.nombre   AS bodega_nombre,
           ap.nombre AS aprobado_por_nombre,
           s.fecha_aprobacion,
           COUNT(d.id) AS total_items
    FROM cmp_solicitudes s
    LEFT JOIN usuarios u    ON u.id  = s.solicitante_id
    LEFT JOIN inv_bodegas b ON b.id  = s.bodega_id
    LEFT JOIN usuarios ap   ON ap.id = s.aprobado_por
    LEFT JOIN cmp_solicitudes_detalle d ON d.solicitud_id = s.id
    ${where}
    GROUP BY s.id, u.nombre, b.nombre, ap.nombre
    ORDER BY s.creado_en DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params)

  const countParams = params.slice(0, params.length - 2)
  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) AS total FROM cmp_solicitudes s LEFT JOIN inv_bodegas b ON b.id = s.bodega_id ${where}`, countParams
  )

  return reply.send({ data: rows, total: parseInt(cnt[0].total), page: parseInt(page), limit: parseInt(limit) })
}

export async function crearSolicitud(req, reply) {
  const { bodega_id, motivo, prioridad = 'NORMAL', fecha_requerida, items = [] } = req.body
  const solicitante_id = req.user.id

  const { sedeIds } = resolverSede(req)
  if (!(await bodegaPermitida(pool, bodega_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a la bodega seleccionada' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(`
      INSERT INTO cmp_solicitudes (solicitante_id, bodega_id, motivo, prioridad, fecha_requerida)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [solicitante_id, bodega_id, motivo, prioridad, fecha_requerida])

    const solicitud_id = rows[0].id

    for (const item of items) {
      await client.query(`
        INSERT INTO cmp_solicitudes_detalle
          (solicitud_id, producto_id, cantidad_solicitada, costo_estimado, notas)
        VALUES ($1,$2,$3,$4,$5)
      `, [solicitud_id, item.producto_id, item.cantidad_solicitada, item.costo_estimado || 0, item.notas])
    }

    await auditarCompra(client, {
      modulo: 'solicitud', entidadId: rows[0].id, usuarioId: solicitante_id,
      accion: 'Creó la solicitud', metadatos: { motivo, prioridad, items: items.length },
    })

    await client.query('COMMIT')
    return reply.code(201).send(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function detalleSolicitud(req, reply) {
  const { id } = req.params

  const sol = await pool.query(`
    SELECT s.*,
           u.nombre  AS solicitante_nombre,
           b.nombre   AS bodega_nombre,
           ap.nombre AS aprobado_por_nombre
    FROM cmp_solicitudes s
    LEFT JOIN usuarios u    ON u.id  = s.solicitante_id
    LEFT JOIN inv_bodegas b ON b.id  = s.bodega_id
    LEFT JOIN usuarios ap   ON ap.id = s.aprobado_por
    WHERE s.id = $1
  `, [id])

  if (!sol.rows.length) return reply.code(404).send({ error: 'Solicitud no encontrada' })

  const items = await pool.query(`
    SELECT d.*, p.nombre AS producto_nombre, p.codigo_sku, p.unidad_medida,
           COALESCE(SUM(st.cantidad),0) AS stock_actual
    FROM cmp_solicitudes_detalle d
    JOIN inv_productos p ON p.id = d.producto_id
    LEFT JOIN inv_stock st ON st.producto_id = p.id
    WHERE d.solicitud_id = $1
    GROUP BY d.id, p.nombre, p.codigo_sku, p.unidad_medida
    ORDER BY p.nombre
  `, [id])

  const historial = await obtenerAuditoria(pool, { modulo: 'solicitud', entidadId: id })

  return reply.send({ ...sol.rows[0], items: items.rows, historial })
}

export async function aprobarSolicitud(req, reply) {
  const { id } = req.params
  const { items = [] } = req.body
  const aprobado_por = req.user.id

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const actual = await client.query(`SELECT solicitante_id FROM cmp_solicitudes WHERE id=$1`, [id])
    if (actual.rows.length && actual.rows[0].solicitante_id === aprobado_por && req.user.rol !== 'superadmin') {
      await client.query('ROLLBACK')
      return reply.code(403).send({ error: 'No puedes aprobar tu propia solicitud. Debe aprobarla otro administrador.' })
    }

    const { rows } = await client.query(`
      UPDATE cmp_solicitudes SET
        estado           = 'APROBADA',
        aprobado_por     = $1,
        fecha_aprobacion = NOW()
      WHERE id = $2 AND estado = 'PENDIENTE'
      RETURNING *
    `, [aprobado_por, id])

    if (!rows.length) {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'Solicitud no encontrada o no está en estado PENDIENTE' })
    }

    for (const item of items) {
      await client.query(`
        UPDATE cmp_solicitudes_detalle SET cantidad_aprobada = $1
        WHERE id = $2 AND solicitud_id = $3
      `, [item.cantidad_aprobada, item.id, id])
    }

    await auditarCompra(client, {
      modulo: 'solicitud', entidadId: id, usuarioId: aprobado_por, accion: 'Aprobó la solicitud',
    })

    await client.query('COMMIT')
    return reply.send(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function rechazarSolicitud(req, reply) {
  const { id } = req.params
  const { notas_rechazo } = req.body

  const { rows } = await pool.query(`
    UPDATE cmp_solicitudes SET
      estado           = 'RECHAZADA',
      notas_rechazo    = $1,
      aprobado_por     = $2,
      fecha_aprobacion = NOW()
    WHERE id = $3 AND estado = 'PENDIENTE'
    RETURNING *
  `, [notas_rechazo, req.user.id, id])

  if (!rows.length) return reply.code(400).send({ error: 'Solicitud no encontrada o ya fue procesada' })

  await auditarCompra(pool, {
    modulo: 'solicitud', entidadId: id, usuarioId: req.user.id,
    accion: 'Rechazó la solicitud', metadatos: { notas_rechazo },
  })

  return reply.send(rows[0])
}

export async function convertirAOrden(req, reply) {
  const { id } = req.params
  const { proveedor_id, bodega_destino_id, fecha_esperada } = req.body
  const usuario_id = req.user.id

  const { sedeIds } = resolverSede(req)
  if (!(await bodegaPermitida(pool, bodega_destino_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a la bodega destino seleccionada' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const solRes = await client.query(
      `SELECT * FROM cmp_solicitudes WHERE id=$1 AND estado='APROBADA' FOR UPDATE`, [id]
    )
    if (!solRes.rows.length) {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'Solicitud no encontrada o no está APROBADA' })
    }

    const items = await client.query(
      `SELECT * FROM cmp_solicitudes_detalle WHERE solicitud_id=$1`, [id]
    )

    if (!items.rows.length) {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'La solicitud no tiene ítems' })
    }

    const subtotal = items.rows.reduce((acc, d) =>
      acc + parseFloat(d.cantidad_aprobada || d.cantidad_solicitada) * parseFloat(d.costo_estimado || 0), 0
    )

    const ocRes = await client.query(`
      INSERT INTO inv_ordenes_compra
        (proveedor_cmp_id, bodega_destino_id, fecha_esperada, notas, subtotal, total, usuario_id, solicitud_id)
      VALUES ($1,$2,$3,$4,$5,$5,$6,$7)
      RETURNING *
    `, [proveedor_id, bodega_destino_id, fecha_esperada,
        `Convertida de solicitud #${solRes.rows[0].numero}`, subtotal, usuario_id, id])

    const orden_id = ocRes.rows[0].id

    for (const item of items.rows) {
      const qty = parseFloat(item.cantidad_aprobada || item.cantidad_solicitada)
      await client.query(`
        INSERT INTO inv_oc_detalle (orden_id, producto_id, cantidad_solicitada, costo_unitario, notas)
        VALUES ($1,$2,$3,$4,$5)
      `, [orden_id, item.producto_id, qty, item.costo_estimado || 0, item.notas])
    }

    await client.query(`
      UPDATE cmp_solicitudes SET estado='CONVERTIDA', orden_compra_id=$1 WHERE id=$2
    `, [orden_id, id])

    await auditarCompra(client, {
      modulo: 'solicitud', entidadId: id, usuarioId, accion: 'Convirtió la solicitud en orden de compra',
      metadatos: { orden_compra_id: orden_id },
    })
    await auditarCompra(client, {
      modulo: 'orden_compra', entidadId: orden_id, usuarioId,
      accion: `Creada desde solicitud #${solRes.rows[0].numero}`, metadatos: { subtotal, items: items.rows.length },
    })

    await client.query('COMMIT')
    return reply.code(201).send(ocRes.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════

export async function listarProveedores(req, reply) {
  const { q, tipo_proveedor, activo } = req.query
  const params = []
  const wheres = []

  if (q) {
    params.push(`%${q}%`)
    wheres.push(`(COALESCE(t.razon_social, CONCAT(t.nombres,' ',t.apellidos)) ILIKE $${params.length} OR t.numero_documento ILIKE $${params.length} OR cp.codigo ILIKE $${params.length})`)
  }
  if (tipo_proveedor) { params.push(tipo_proveedor); wheres.push(`cp.tipo_proveedor = $${params.length}`) }
  if (activo !== undefined) { params.push(activo === 'true' || activo === true); wheres.push(`cp.activo = $${params.length}`) }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  const { rows } = await pool.query(`
    SELECT cp.id, cp.tercero_id, cp.codigo, cp.tipo_proveedor, cp.condicion_pago,
           cp.dias_entrega, cp.calificacion, cp.activo, cp.creado_en,
           cp.contacto_nombre, cp.contacto_cargo, cp.banco, cp.numero_cuenta, cp.tipo_cuenta,
           cp.descuento_habitual,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS nombre,
           t.telefono, t.email, t.numero_documento AS nit,
           COALESCE((
             SELECT SUM(oc.total) FROM inv_ordenes_compra oc
             WHERE oc.proveedor_cmp_id = cp.id AND oc.estado = 'RECIBIDA'
           ),0) AS total_compras
    FROM cmp_proveedores cp
    JOIN terceros t ON t.id = cp.tercero_id
    ${where}
    ORDER BY COALESCE(t.razon_social, CONCAT(t.nombres,' ',t.apellidos))
  `, params)

  return reply.send(rows)
}

export async function crearProveedor(req, reply) {
  const {
    tercero_id, tipo_proveedor = 'GENERAL', condicion_pago = 'CONTADO',
    dias_entrega = 1, descuento_habitual = 0,
    banco, numero_cuenta, tipo_cuenta,
    contacto_nombre, contacto_cargo,
  } = req.body

  const fecha = new Date().toISOString().replace(/-/g,'').slice(0,8)
  const rand  = Math.random().toString(36).substring(2,6).toUpperCase()
  const codigo = `PRV-${fecha}-${rand}`

  const { rows } = await pool.query(`
    INSERT INTO cmp_proveedores
      (tercero_id, codigo, tipo_proveedor, condicion_pago, dias_entrega,
       descuento_habitual, banco, numero_cuenta, tipo_cuenta, contacto_nombre, contacto_cargo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [tercero_id, codigo, tipo_proveedor, condicion_pago, dias_entrega,
      descuento_habitual, banco, numero_cuenta, tipo_cuenta, contacto_nombre, contacto_cargo])

  await auditarCompra(pool, {
    modulo: 'proveedor', entidadId: rows[0].id, usuarioId: req.user.id, accion: 'Creó el proveedor',
  })

  return reply.code(201).send(rows[0])
}

export async function actualizarProveedor(req, reply) {
  const { id } = req.params
  const {
    tipo_proveedor, condicion_pago, dias_entrega, descuento_habitual,
    banco, numero_cuenta, tipo_cuenta, contacto_nombre, contacto_cargo, activo,
  } = req.body

  const { rows } = await pool.query(`
    UPDATE cmp_proveedores SET
      tipo_proveedor     = COALESCE($1, tipo_proveedor),
      condicion_pago     = COALESCE($2, condicion_pago),
      dias_entrega       = COALESCE($3, dias_entrega),
      descuento_habitual = COALESCE($4, descuento_habitual),
      banco              = COALESCE($5, banco),
      numero_cuenta      = COALESCE($6, numero_cuenta),
      tipo_cuenta        = COALESCE($7, tipo_cuenta),
      contacto_nombre    = COALESCE($8, contacto_nombre),
      contacto_cargo     = COALESCE($9, contacto_cargo),
      activo             = COALESCE($10, activo)
    WHERE id = $11
    RETURNING *
  `, [tipo_proveedor, condicion_pago, dias_entrega, descuento_habitual,
      banco, numero_cuenta, tipo_cuenta, contacto_nombre, contacto_cargo, activo, id])

  if (!rows.length) return reply.code(404).send({ error: 'Proveedor no encontrado' })

  await auditarCompra(pool, {
    modulo: 'proveedor', entidadId: id, usuarioId: req.user.id, accion: 'Actualizó datos del proveedor',
    metadatos: req.body,
  })

  return reply.send(rows[0])
}

export async function detalleProveedor(req, reply) {
  const { id } = req.params

  const prov = await pool.query(`
    SELECT cp.*,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS nombre,
           t.telefono, t.email, t.numero_documento AS nit, t.direccion
    FROM cmp_proveedores cp
    JOIN terceros t ON t.id = cp.tercero_id
    WHERE cp.id = $1
  `, [id])

  if (!prov.rows.length) return reply.code(404).send({ error: 'Proveedor no encontrado' })

  const histOC = await pool.query(`
    SELECT oc.id, oc.numero, oc.estado, oc.total, oc.creado_en, oc.fecha_esperada
    FROM inv_ordenes_compra oc
    WHERE oc.proveedor_cmp_id = $1
    ORDER BY oc.creado_en DESC LIMIT 10
  `, [id])

  const histPagos = await pool.query(`
    SELECT cp.id, cp.numero, cp.concepto, cp.monto_total, cp.monto_pagado,
           cp.monto_pendiente, cp.estado, cp.fecha_vencimiento, cp.fecha_pago
    FROM cmp_cuentas_pagar cp
    WHERE cp.proveedor_id = $1
    ORDER BY cp.creado_en DESC LIMIT 10
  `, [id])

  const historial = await obtenerAuditoria(pool, { modulo: 'proveedor', entidadId: id })

  return reply.send({
    ...prov.rows[0],
    historial_oc:    histOC.rows,
    historial_pagos: histPagos.rows,
    historial,
  })
}

export async function calificarProveedor(req, reply) {
  const { id } = req.params
  const { calificacion } = req.body

  if (calificacion < 1 || calificacion > 5) {
    return reply.code(400).send({ error: 'Calificación debe ser entre 1 y 5' })
  }

  const { rows } = await pool.query(`
    UPDATE cmp_proveedores SET
      calificacion = ROUND(((calificacion * 9 + $1) / 10)::numeric, 1)
    WHERE id = $2
    RETURNING *
  `, [parseFloat(calificacion), id])

  if (!rows.length) return reply.code(404).send({ error: 'Proveedor no encontrado' })

  await auditarCompra(pool, {
    modulo: 'proveedor', entidadId: id, usuarioId: req.user.id, accion: 'Calificó el proveedor',
    metadatos: { calificacion: parseFloat(calificacion), calificacion_resultante: rows[0].calificacion },
  })

  return reply.send(rows[0])
}

// ═══════════════════════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════

export async function listarOC(req, reply) {
  const { estado, proveedor_id, desde, hasta, page = 1, limit = 20 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const { sedeIds } = resolverSede(req)
  const params = []
  const wheres = []

  if (estado)       { params.push(estado);      wheres.push(`o.estado = $${params.length}`) }
  if (proveedor_id) { params.push(proveedor_id); wheres.push(`o.proveedor_cmp_id = $${params.length}`) }
  if (desde)        { params.push(desde);        wheres.push(`o.creado_en >= $${params.length}`) }
  if (hasta)        { params.push(hasta + ' 23:59:59'); wheres.push(`o.creado_en <= $${params.length}`) }
  params.push(sedeIds); wheres.push(`($${params.length}::uuid[] IS NULL OR b.sede_id = ANY($${params.length}::uuid[]))`)

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  params.push(parseInt(limit))
  params.push(offset)

  const { rows } = await pool.query(`
    SELECT o.id, o.numero, o.estado, o.total, o.subtotal, o.creado_en,
           o.fecha_esperada, o.fecha_aprobacion,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS proveedor_nombre,
           b.nombre  AS bodega_nombre,
           u.nombre AS usuario_nombre,
           ap.nombre AS aprobado_por_nombre,
           COUNT(d.id) AS total_items
    FROM inv_ordenes_compra o
    LEFT JOIN cmp_proveedores cp ON cp.id = o.proveedor_cmp_id
    LEFT JOIN terceros t         ON t.id  = cp.tercero_id
    LEFT JOIN inv_bodegas b      ON b.id  = o.bodega_destino_id
    LEFT JOIN usuarios u         ON u.id  = o.usuario_id
    LEFT JOIN usuarios ap        ON ap.id = o.aprobado_por
    LEFT JOIN inv_oc_detalle d   ON d.orden_id = o.id
    ${where}
    GROUP BY o.id, t.razon_social, t.nombres, t.apellidos, b.nombre, u.nombre, ap.nombre
    ORDER BY o.creado_en DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params)

  const countParams = params.slice(0, params.length - 2)
  const { rows: cnt } = await pool.query(`
    SELECT COUNT(DISTINCT o.id) AS total
    FROM inv_ordenes_compra o
    LEFT JOIN cmp_proveedores cp ON cp.id = o.proveedor_cmp_id
    LEFT JOIN terceros t ON t.id = cp.tercero_id
    LEFT JOIN inv_bodegas b ON b.id = o.bodega_destino_id
    ${where}
  `, countParams)

  return reply.send({ data: rows, total: parseInt(cnt[0].total), page: parseInt(page), limit: parseInt(limit) })
}

export async function crearOC(req, reply) {
  const { proveedor_id, bodega_destino_id, fecha_esperada, notas, items = [] } = req.body
  const usuario_id = req.user.id

  if (!items.length) return reply.code(400).send({ error: 'Debe incluir al menos un producto' })
  if (!proveedor_id) return reply.code(400).send({ error: 'proveedor_id es obligatorio' })
  if (!bodega_destino_id) return reply.code(400).send({ error: 'bodega_destino_id es obligatorio' })

  const { sedeIds } = resolverSede(req)
  if (!(await bodegaPermitida(pool, bodega_destino_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a la bodega destino seleccionada' })
  }

  for (const item of items) {
    if (!item.producto_id || !(+item.cantidad_solicitada > 0))
      return reply.code(400).send({ error: 'Cada ítem requiere producto y cantidad mayor a 0' })
    if (+item.costo_unitario < 0)
      return reply.code(400).send({ error: 'El costo unitario no puede ser negativo' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const prov = await client.query(`SELECT activo FROM cmp_proveedores WHERE id=$1 FOR UPDATE`, [proveedor_id])
    if (!prov.rows.length || !prov.rows[0].activo) {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'El proveedor no existe o está inactivo' })
    }

    const subtotal = items.reduce((acc, d) =>
      acc + parseFloat(d.cantidad_solicitada) * parseFloat(d.costo_unitario), 0)

    const { rows } = await client.query(`
      INSERT INTO inv_ordenes_compra
        (proveedor_cmp_id, bodega_destino_id, fecha_esperada, notas, subtotal, total, usuario_id)
      VALUES ($1,$2,$3,$4,$5,$5,$6)
      RETURNING *
    `, [proveedor_id, bodega_destino_id, fecha_esperada, notas, subtotal, usuario_id])

    const orden_id = rows[0].id

    for (const item of items) {
      await client.query(`
        INSERT INTO inv_oc_detalle (orden_id, producto_id, cantidad_solicitada, costo_unitario, notas)
        VALUES ($1,$2,$3,$4,$5)
      `, [orden_id, item.producto_id, item.cantidad_solicitada, item.costo_unitario, item.notas])
    }

    await auditarCompra(client, {
      modulo: 'orden_compra', entidadId: orden_id, usuarioId: usuario_id,
      accion: 'Creó la orden de compra (BORRADOR)', metadatos: { proveedor_id, subtotal, items: items.length },
    })

    await client.query('COMMIT')
    return reply.code(201).send(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function enviarOC(req, reply) {
  const { id } = req.params

  const { rows } = await pool.query(`
    UPDATE inv_ordenes_compra SET estado='PENDIENTE'
    WHERE id=$1 AND estado='BORRADOR'
    RETURNING *
  `, [id])

  if (!rows.length) return reply.code(400).send({ error: 'La orden no existe o no está en BORRADOR' })

  await auditarCompra(pool, {
    modulo: 'orden_compra', entidadId: id, usuarioId: req.user.id,
    accion: 'Envió la orden a aprobación',
  })

  return reply.send(rows[0])
}

export async function detalleOC(req, reply) {
  const { id } = req.params

  const oc = await pool.query(`
    SELECT o.*,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS proveedor_nombre,
           t.numero_documento AS proveedor_nit,
           t.telefono AS proveedor_telefono, t.email AS proveedor_email,
           b.nombre   AS bodega_nombre,
           u.nombre   AS usuario_nombre,
           ap.nombre AS aprobado_por_nombre
    FROM inv_ordenes_compra o
    LEFT JOIN cmp_proveedores cp ON cp.id = o.proveedor_cmp_id
    LEFT JOIN terceros t         ON t.id  = cp.tercero_id
    LEFT JOIN inv_bodegas b      ON b.id  = o.bodega_destino_id
    LEFT JOIN usuarios u         ON u.id  = o.usuario_id
    LEFT JOIN usuarios ap        ON ap.id = o.aprobado_por
    WHERE o.id = $1
  `, [id])

  if (!oc.rows.length) return reply.code(404).send({ error: 'Orden de compra no encontrada' })

  const detalle = await pool.query(`
    SELECT d.*, p.nombre AS producto_nombre, p.codigo_sku, p.unidad_medida
    FROM inv_oc_detalle d
    JOIN inv_productos p ON p.id = d.producto_id
    WHERE d.orden_id = $1
    ORDER BY p.nombre
  `, [id])

  const recepciones = await pool.query(`
    SELECT r.id, r.numero, r.estado, r.fecha_recepcion, r.numero_remision,
           u.nombre AS recibido_por_nombre
    FROM cmp_recepciones r
    LEFT JOIN usuarios u ON u.id = r.recibido_por
    WHERE r.orden_compra_id = $1
    ORDER BY r.fecha_recepcion DESC
  `, [id])

  const historial = await obtenerAuditoria(pool, { modulo: 'orden_compra', entidadId: id })

  return reply.send({ ...oc.rows[0], detalle: detalle.rows, recepciones: recepciones.rows, historial })
}

export async function aprobarOC(req, reply) {
  const { id } = req.params

  const actual = await pool.query(`SELECT usuario_id FROM inv_ordenes_compra WHERE id=$1`, [id])
  if (actual.rows.length && actual.rows[0].usuario_id === req.user.id && req.user.rol !== 'superadmin') {
    return reply.code(403).send({ error: 'No puedes aprobar tu propia orden de compra. Debe aprobarla otro administrador.' })
  }

  const { rows } = await pool.query(`
    UPDATE inv_ordenes_compra SET
      estado           = 'APROBADA',
      aprobado_por     = $1,
      fecha_aprobacion = NOW()
    WHERE id = $2 AND estado = 'PENDIENTE'
    RETURNING *
  `, [req.user.id, id])

  if (!rows.length) return reply.code(400).send({ error: 'La orden no existe o no está PENDIENTE' })

  await auditarCompra(pool, {
    modulo: 'orden_compra', entidadId: id, usuarioId: req.user.id, accion: 'Aprobó la orden de compra',
  })

  return reply.send(rows[0])
}

export async function cancelarOC(req, reply) {
  const { id } = req.params
  const { motivo } = req.body

  const { rows } = await pool.query(`
    UPDATE inv_ordenes_compra SET estado='CANCELADA'
    WHERE id = $1 AND estado IN ('BORRADOR','PENDIENTE')
    RETURNING *
  `, [id])

  if (!rows.length) return reply.code(400).send({ error: 'La orden no puede cancelarse en su estado actual' })

  await auditarCompra(pool, {
    modulo: 'orden_compra', entidadId: id, usuarioId: req.user.id,
    accion: 'Canceló la orden de compra', metadatos: { motivo: motivo || null },
  })

  return reply.send(rows[0])
}

// ═══════════════════════════════════════════════════════════════════════════
// RECEPCIONES
// ═══════════════════════════════════════════════════════════════════════════

export async function listarRecepciones(req, reply) {
  const { estado, desde, hasta, page = 1, limit = 20 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const { sedeIds } = resolverSede(req)
  const params = []
  const wheres = []

  if (estado) { params.push(estado); wheres.push(`r.estado = $${params.length}`) }
  if (desde)  { params.push(desde); wheres.push(`r.fecha_recepcion >= $${params.length}`) }
  if (hasta)  { params.push(hasta + ' 23:59:59'); wheres.push(`r.fecha_recepcion <= $${params.length}`) }
  params.push(sedeIds); wheres.push(`($${params.length}::uuid[] IS NULL OR b.sede_id = ANY($${params.length}::uuid[]))`)

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  params.push(parseInt(limit))
  params.push(offset)

  const { rows } = await pool.query(`
    SELECT r.id, r.numero, r.estado, r.fecha_recepcion, r.numero_remision, r.creado_en,
           oc.numero AS oc_numero,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS proveedor_nombre,
           b.nombre  AS bodega_nombre,
           u.nombre AS recibido_por_nombre,
           COUNT(rd.id) AS total_items
    FROM cmp_recepciones r
    LEFT JOIN inv_ordenes_compra oc ON oc.id = r.orden_compra_id
    LEFT JOIN cmp_proveedores cp    ON cp.id = r.proveedor_id
    LEFT JOIN terceros t            ON t.id  = cp.tercero_id
    LEFT JOIN inv_bodegas b         ON b.id  = r.bodega_id
    LEFT JOIN usuarios u            ON u.id  = r.recibido_por
    LEFT JOIN cmp_recepciones_detalle rd ON rd.recepcion_id = r.id
    ${where}
    GROUP BY r.id, oc.numero, t.razon_social, t.nombres, t.apellidos, b.nombre, u.nombre
    ORDER BY r.fecha_recepcion DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params)

  const countParams = params.slice(0, params.length - 2)
  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) AS total FROM cmp_recepciones r LEFT JOIN inv_bodegas b ON b.id = r.bodega_id ${where}`, countParams
  )

  return reply.send({ data: rows, total: parseInt(cnt[0].total), page: parseInt(page), limit: parseInt(limit) })
}

export async function crearRecepcion(req, reply) {
  const { orden_compra_id, numero_remision, observaciones, items = [] } = req.body
  const recibido_por = req.user.id

  const { sedeIds } = resolverSede(req)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const ocRes = await client.query(
      `SELECT * FROM inv_ordenes_compra WHERE id=$1 AND estado='APROBADA' FOR UPDATE`,
      [orden_compra_id]
    )
    if (!ocRes.rows.length) {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'OC no encontrada o no está APROBADA' })
    }
    const oc = ocRes.rows[0]
    const proveedor_id = oc.proveedor_cmp_id

    if (!(await bodegaPermitida(client, oc.bodega_destino_id, sedeIds))) {
      await client.query('ROLLBACK')
      return reply.code(403).send({ error: 'No tiene acceso a la bodega de esta orden de compra' })
    }

    const recRes = await client.query(`
      INSERT INTO cmp_recepciones
        (orden_compra_id, proveedor_id, bodega_id, numero_remision, observaciones, recibido_por)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [orden_compra_id, proveedor_id, oc.bodega_destino_id, numero_remision, observaciones, recibido_por])

    const recepcion_id = recRes.rows[0].id
    let totalEsperado = 0
    let totalRecibido = 0

    for (const item of items) {
      const cantRec  = parseFloat(item.cantidad_recibida  || 0)
      const cantRech = parseFloat(item.cantidad_rechazada || 0)
      const cantEsp  = parseFloat(item.cantidad_esperada)
      totalEsperado += cantEsp
      totalRecibido += cantRec

      if (cantRec < 0 || cantRech < 0) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: 'Las cantidades recibidas no pueden ser negativas' })
      }

      // Control anti-fraude: no se puede recibir más de lo pedido en la OC
      // (acumulado entre todas las recepciones parciales de esa orden).
      const ocDet = await client.query(
        `SELECT id, cantidad_solicitada, cantidad_recibida FROM inv_oc_detalle
         WHERE orden_id = $1 AND producto_id = $2 FOR UPDATE`,
        [orden_compra_id, item.producto_id]
      )
      if (!ocDet.rows.length) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: 'El producto recibido no pertenece a esta orden de compra' })
      }
      const yaRecibido = parseFloat(ocDet.rows[0].cantidad_recibida || 0)
      const solicitado  = parseFloat(ocDet.rows[0].cantidad_solicitada)
      if (yaRecibido + cantRec > solicitado) {
        await client.query('ROLLBACK')
        return reply.code(400).send({
          error: `La cantidad recibida (${yaRecibido + cantRec}) excede lo solicitado (${solicitado}) para ese producto`,
        })
      }

      let movimiento_id = null

      if (cantRec > 0) {
        let ubicacion_id = item.ubicacion_id
        if (!ubicacion_id) {
          const ubicDefault = await client.query(
            `SELECT id FROM inv_ubicaciones WHERE bodega_id=$1 AND activo=TRUE ORDER BY codigo LIMIT 1`,
            [oc.bodega_destino_id]
          )
          ubicacion_id = ubicDefault.rows[0]?.id
        }

        if (ubicacion_id) {
          const existing = await client.query(
            `SELECT cantidad, costo_unitario_promedio FROM inv_stock WHERE producto_id=$1 AND ubicacion_id=$2`,
            [item.producto_id, ubicacion_id]
          )
          let nuevoCosto = parseFloat(item.costo_unitario)
          if (existing.rows.length) {
            const q0 = parseFloat(existing.rows[0].cantidad)
            const c0 = parseFloat(existing.rows[0].costo_unitario_promedio)
            nuevoCosto = (q0 * c0 + cantRec * nuevoCosto) / (q0 + cantRec)
          }

          await client.query(`
            INSERT INTO inv_stock (producto_id, ubicacion_id, cantidad, costo_unitario_promedio, ultima_actualizacion)
            VALUES ($1,$2,$3,$4,NOW())
            ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET
              cantidad = inv_stock.cantidad + EXCLUDED.cantidad,
              costo_unitario_promedio = $4,
              ultima_actualizacion = NOW()
          `, [item.producto_id, ubicacion_id, cantRec, nuevoCosto])

          await client.query(`
            UPDATE inv_productos SET costo_promedio=$1, actualizado_en=NOW() WHERE id=$2
          `, [nuevoCosto, item.producto_id])

          const movRes = await client.query(`
            INSERT INTO inv_movimientos
              (tipo, producto_id, ubicacion_destino_id, cantidad, costo_unitario, referencia, orden_compra_id, usuario_id)
            VALUES ('ENTRADA',$1,$2,$3,$4,$5,$6,$7)
            RETURNING id
          `, [item.producto_id, ubicacion_id, cantRec, item.costo_unitario,
              `REC-${recRes.rows[0].numero}`, orden_compra_id, recibido_por])

          movimiento_id = movRes.rows[0].id
        }
      }

      await client.query(`
        INSERT INTO cmp_recepciones_detalle
          (recepcion_id, producto_id, ubicacion_id, cantidad_esperada, cantidad_recibida, cantidad_rechazada,
           costo_unitario, motivo_rechazo, movimiento_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [recepcion_id, item.producto_id, item.ubicacion_id || null, cantEsp, cantRec, cantRech,
          item.costo_unitario, item.motivo_rechazo, movimiento_id])

      await client.query(
        `UPDATE inv_oc_detalle SET cantidad_recibida = cantidad_recibida + $1 WHERE id = $2`,
        [cantRec, ocDet.rows[0].id]
      )
    }

    const hasDiscrepancy = items.some(i => parseFloat(i.cantidad_rechazada || 0) > 0)
    const pct = totalEsperado > 0 ? totalRecibido / totalEsperado : 0

    let recEstado = 'PARCIAL'
    if (hasDiscrepancy) recEstado = 'CON_DISCREPANCIA'
    else if (pct >= 1)  recEstado = 'COMPLETA'

    await client.query(`UPDATE cmp_recepciones SET estado=$1 WHERE id=$2`, [recEstado, recepcion_id])

    // Estado real de la OC: se calcula sobre el acumulado de TODAS las
    // recepciones parciales, no solo la de este request (evita marcar
    // como completa una orden que aún tiene saldo por recibir).
    const acumulado = await client.query(
      `SELECT COALESCE(SUM(cantidad_solicitada),0) AS solicitado, COALESCE(SUM(cantidad_recibida),0) AS recibido
       FROM inv_oc_detalle WHERE orden_id = $1`,
      [orden_compra_id]
    )
    const totalSolicitado = parseFloat(acumulado.rows[0].solicitado)
    const totalRecibidoAcum = parseFloat(acumulado.rows[0].recibido)
    const ocCompleta = totalSolicitado > 0 && totalRecibidoAcum >= totalSolicitado

    if (ocCompleta) {
      await client.query(`UPDATE inv_ordenes_compra SET estado='RECIBIDA' WHERE id=$1`, [orden_compra_id])
      await client.query(`
        INSERT INTO cmp_cuentas_pagar
          (proveedor_id, orden_compra_id, recepcion_id, concepto, monto_total, fecha_vencimiento)
        VALUES ($1,$2,$3,$4,$5, CURRENT_DATE)
      `, [proveedor_id, orden_compra_id, recepcion_id, `OC #${oc.numero}`, oc.total])
    }

    await auditarCompra(client, {
      modulo: 'recepcion', entidadId: recepcion_id, usuarioId: recibido_por,
      accion: `Registró recepción de mercancía (${recEstado})`,
      metadatos: { orden_compra_id, items: items.length, total_recibido: totalRecibido },
    })
    await auditarCompra(client, {
      modulo: 'orden_compra', entidadId: orden_compra_id, usuarioId: recibido_por,
      accion: ocCompleta ? 'Orden recibida completamente' : 'Recepción parcial registrada',
    })

    await client.query('COMMIT')
    return reply.code(201).send(recRes.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function detalleRecepcion(req, reply) {
  const { id } = req.params

  const rec = await pool.query(`
    SELECT r.*,
           oc.numero AS oc_numero,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS proveedor_nombre,
           b.nombre  AS bodega_nombre,
           u.nombre AS recibido_por_nombre
    FROM cmp_recepciones r
    LEFT JOIN inv_ordenes_compra oc ON oc.id = r.orden_compra_id
    LEFT JOIN cmp_proveedores cp    ON cp.id = r.proveedor_id
    LEFT JOIN terceros t            ON t.id  = cp.tercero_id
    LEFT JOIN inv_bodegas b         ON b.id  = r.bodega_id
    LEFT JOIN usuarios u            ON u.id  = r.recibido_por
    WHERE r.id = $1
  `, [id])

  if (!rec.rows.length) return reply.code(404).send({ error: 'Recepción no encontrada' })

  const detalle = await pool.query(`
    SELECT rd.*, p.nombre AS producto_nombre, p.codigo_sku, p.unidad_medida,
           ub.codigo AS ubicacion_codigo
    FROM cmp_recepciones_detalle rd
    JOIN inv_productos p ON p.id = rd.producto_id
    LEFT JOIN inv_ubicaciones ub ON ub.id = rd.ubicacion_id
    WHERE rd.recepcion_id = $1
    ORDER BY p.nombre
  `, [id])

  const historial = await obtenerAuditoria(pool, { modulo: 'recepcion', entidadId: id })

  return reply.send({ ...rec.rows[0], detalle: detalle.rows, historial })
}

// ═══════════════════════════════════════════════════════════════════════════
// CUENTAS POR PAGAR
// ═══════════════════════════════════════════════════════════════════════════

export async function listarCuentasPagar(req, reply) {
  const { estado, proveedor_id, vencidas } = req.query
  const params = []
  const wheres = []

  if (estado)       { params.push(estado);      wheres.push(`cp.estado = $${params.length}`) }
  if (proveedor_id) { params.push(proveedor_id); wheres.push(`cp.proveedor_id = $${params.length}`) }
  if (vencidas === 'true') {
    wheres.push(`(cp.estado = 'VENCIDA' OR (cp.estado IN ('PENDIENTE','PARCIAL') AND cp.fecha_vencimiento < CURRENT_DATE))`)
  }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  const { rows } = await pool.query(`
    SELECT cp.*,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS proveedor_nombre,
           t.telefono AS proveedor_telefono,
           oc.numero  AS oc_numero
    FROM cmp_cuentas_pagar cp
    JOIN cmp_proveedores pv ON pv.id = cp.proveedor_id
    JOIN terceros t         ON t.id  = pv.tercero_id
    LEFT JOIN inv_ordenes_compra oc ON oc.id = cp.orden_compra_id
    ${where}
    ORDER BY cp.fecha_vencimiento ASC
  `, params)

  return reply.send(rows)
}

export async function registrarPago(req, reply) {
  const { id } = req.params
  const { monto, metodo_pago, referencia_pago, fecha_pago, notas } = req.body

  const montoNum = parseFloat(monto)
  if (!(montoNum > 0)) {
    return reply.code(400).send({ error: 'El monto del pago debe ser mayor a 0' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query(
      `SELECT * FROM cmp_cuentas_pagar WHERE id=$1 AND estado NOT IN ('PAGADA','ANULADA') FOR UPDATE`, [id]
    )
    if (!existing.rows.length) {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'Cuenta no encontrada o ya pagada' })
    }

    const cuenta = existing.rows[0]
    const pendiente = parseFloat(cuenta.monto_total) - parseFloat(cuenta.monto_pagado)

    // Control anti-fraude: nunca se puede registrar un pago mayor al saldo pendiente
    if (montoNum > pendiente + 0.01) {
      await client.query('ROLLBACK')
      return reply.code(400).send({
        error: `El monto ($${montoNum.toLocaleString('es-CO')}) supera el saldo pendiente ($${pendiente.toLocaleString('es-CO')})`,
      })
    }

    const nuevoPagado = parseFloat(cuenta.monto_pagado) + montoNum
    const nuevoEstado = nuevoPagado >= parseFloat(cuenta.monto_total) ? 'PAGADA' : 'PARCIAL'

    const { rows } = await client.query(`
      UPDATE cmp_cuentas_pagar SET
        monto_pagado    = $1,
        estado          = $2,
        metodo_pago     = COALESCE($3, metodo_pago),
        referencia_pago = COALESCE($4, referencia_pago),
        fecha_pago      = COALESCE($5, fecha_pago),
        notas           = COALESCE($6, notas)
      WHERE id = $7
      RETURNING *
    `, [nuevoPagado, nuevoEstado, metodo_pago, referencia_pago, fecha_pago, notas, id])

    await auditarCompra(client, {
      modulo: 'cuenta_pagar', entidadId: id, usuarioId: req.user.id,
      accion: `Registró pago de $${montoNum.toLocaleString('es-CO')} (${metodo_pago || 'sin método'})`,
      metadatos: { monto: montoNum, referencia_pago, nuevo_estado: nuevoEstado },
    })

    await client.query('COMMIT')
    return reply.send(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function historialCuentaPagar(req, reply) {
  const { id } = req.params
  const historial = await obtenerAuditoria(pool, { modulo: 'cuenta_pagar', entidadId: id })
  return reply.send(historial)
}
