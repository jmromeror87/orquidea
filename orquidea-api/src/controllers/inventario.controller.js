/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Inventario                                          ║
 * ║  Archivo         : inventario.controller.js                            ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, sedeParaCrear, bodegaPermitida } from '../utils/sede.js'

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

export async function stats(req, reply) {
  const hoy = new Date().toISOString().slice(0, 10)
  const { sedeIds } = resolverSede(req)
  const s = [sedeIds]

  const [totProd, totBod, valorInv, bajosMin, movHoy, ultMov] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM inv_productos WHERE activo = TRUE`),
    pool.query(`
      SELECT COUNT(*) AS total FROM inv_bodegas
      WHERE activo = TRUE AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT COALESCE(SUM(s.cantidad * s.costo_unitario_promedio), 0) AS valor
      FROM inv_stock s
      JOIN inv_productos p ON p.id = s.producto_id
      JOIN inv_ubicaciones ub ON ub.id = s.ubicacion_id
      JOIN inv_bodegas b ON b.id = ub.bodega_id
      WHERE p.activo = TRUE AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT COUNT(DISTINCT p.id) AS total
      FROM inv_productos p
      LEFT JOIN (
        SELECT st.producto_id, SUM(st.cantidad) AS total_stock
        FROM inv_stock st
        JOIN inv_ubicaciones ub ON ub.id = st.ubicacion_id
        JOIN inv_bodegas b ON b.id = ub.bodega_id
        WHERE ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
        GROUP BY st.producto_id
      ) st ON st.producto_id = p.id
      WHERE p.activo = TRUE
        AND COALESCE(st.total_stock, 0) < p.stock_minimo
    `, s),
    pool.query(`
      SELECT COUNT(*) AS total FROM inv_movimientos m
      LEFT JOIN inv_ubicaciones uo ON uo.id = m.ubicacion_origen_id
      LEFT JOIN inv_ubicaciones ud ON ud.id = m.ubicacion_destino_id
      LEFT JOIN inv_bodegas bo ON bo.id = uo.bodega_id
      LEFT JOIN inv_bodegas bd ON bd.id = ud.bodega_id
      WHERE DATE(m.fecha) = $2
        AND ($1::uuid[] IS NULL OR bo.sede_id = ANY($1::uuid[]) OR bd.sede_id = ANY($1::uuid[]))
    `, [sedeIds, hoy]),
    pool.query(`
      SELECT m.id, m.tipo, m.cantidad, m.fecha,
             p.nombre AS producto, p.codigo_sku,
             u.nombre AS usuario_nombre
      FROM inv_movimientos m
      JOIN inv_productos p ON p.id = m.producto_id
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN inv_ubicaciones uo ON uo.id = m.ubicacion_origen_id
      LEFT JOIN inv_ubicaciones ud ON ud.id = m.ubicacion_destino_id
      LEFT JOIN inv_bodegas bo ON bo.id = uo.bodega_id
      LEFT JOIN inv_bodegas bd ON bd.id = ud.bodega_id
      WHERE ($1::uuid[] IS NULL OR bo.sede_id = ANY($1::uuid[]) OR bd.sede_id = ANY($1::uuid[]))
      ORDER BY m.fecha DESC LIMIT 5
    `, s),
  ])

  return reply.send({
    total_productos:       parseInt(totProd.rows[0].total),
    total_bodegas:         parseInt(totBod.rows[0].total),
    valor_inventario:      parseFloat(valorInv.rows[0].valor),
    productos_bajo_minimo: parseInt(bajosMin.rows[0].total),
    movimientos_hoy:       parseInt(movHoy.rows[0].total),
    ultimos_movimientos:   ultMov.rows,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍAS
// ═══════════════════════════════════════════════════════════════════════════

export async function listarCategorias(req, reply) {
  const { todas = '' } = req.query
  const where = todas === '1' ? '' : 'WHERE c.activo = TRUE'
  const { rows } = await pool.query(`
    SELECT c.*, COUNT(p.id) AS total_productos
    FROM inv_categorias c
    LEFT JOIN inv_productos p ON p.categoria_id = c.id AND p.activo = TRUE
    ${where}
    GROUP BY c.id
    ORDER BY c.nombre
  `)
  return reply.send(rows)
}

export async function crearCategoria(req, reply) {
  const { nombre, descripcion, icono = '📦', color = '#6B7280' } = req.body
  if (!nombre?.trim()) return reply.code(400).send({ error: 'nombre es obligatorio' })

  try {
    const { rows } = await pool.query(`
      INSERT INTO inv_categorias (nombre, descripcion, icono, color)
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [nombre.trim(), descripcion || null, icono, color]
    )
    return reply.code(201).send(rows[0])
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ error: 'Ya existe una categoría con ese nombre' })
    throw e
  }
}

export async function actualizarCategoria(req, reply) {
  const { id } = req.params
  const { nombre, descripcion, icono, color, activo } = req.body

  try {
    const { rows } = await pool.query(`
      UPDATE inv_categorias SET
        nombre      = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        icono       = COALESCE($3, icono),
        color       = COALESCE($4, color),
        activo      = COALESCE($5, activo)
      WHERE id = $6
      RETURNING *`,
      [nombre?.trim() || null, descripcion, icono, color, activo != null ? Boolean(activo) : null, id]
    )
    if (!rows.length) return reply.code(404).send({ error: 'Categoría no encontrada' })
    return reply.send(rows[0])
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ error: 'Ya existe una categoría con ese nombre' })
    throw e
  }
}

export async function desactivarCategoria(req, reply) {
  const { id } = req.params
  const enUso = await pool.query(
    `SELECT COUNT(*) FROM inv_productos WHERE categoria_id = $1 AND activo = TRUE`, [id]
  )
  if (+enUso.rows[0].count > 0) {
    return reply.code(400).send({ error: `No se puede desactivar: hay ${enUso.rows[0].count} producto(s) activo(s) en esta categoría` })
  }
  const { rows } = await pool.query(
    `UPDATE inv_categorias SET activo = FALSE WHERE id = $1 RETURNING id`, [id]
  )
  if (!rows.length) return reply.code(404).send({ error: 'Categoría no encontrada' })
  return reply.send({ ok: true })
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════

export async function listarProductos(req, reply) {
  const { q, categoria_id, stock_bajo, page = 1, limit = 50 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const params = []
  const wheres = ['p.activo = TRUE']

  if (q) {
    params.push(`%${q}%`)
    wheres.push(`(p.nombre ILIKE $${params.length} OR p.codigo_sku ILIKE $${params.length})`)
  }
  if (categoria_id) {
    params.push(categoria_id)
    wheres.push(`p.categoria_id = $${params.length}`)
  }

  const where = wheres.join(' AND ')

  let havingClause = ''
  if (stock_bajo === 'true' || stock_bajo === true) {
    havingClause = 'HAVING COALESCE(SUM(s.cantidad), 0) < p.stock_minimo'
  }

  params.push(parseInt(limit))
  params.push(offset)

  const { rows } = await pool.query(`
    SELECT p.id, p.codigo_sku, p.nombre, p.descripcion,
           p.unidad_medida, p.costo_promedio, p.precio_venta,
           p.stock_minimo, p.stock_maximo, p.es_perecedero,
           p.imagen_url, p.creado_en,
           c.nombre AS categoria_nombre, c.icono AS categoria_icono, c.color AS categoria_color,
           COALESCE(SUM(s.cantidad), 0) AS total_stock,
           CASE
             WHEN COALESCE(SUM(s.cantidad), 0) = 0 THEN 'CRITICO'
             WHEN COALESCE(SUM(s.cantidad), 0) < p.stock_minimo THEN 'BAJO'
             ELSE 'NORMAL'
           END AS estado_stock
    FROM inv_productos p
    LEFT JOIN inv_categorias c ON c.id = p.categoria_id
    LEFT JOIN inv_stock s ON s.producto_id = p.id
    WHERE ${where}
    GROUP BY p.id, c.nombre, c.icono, c.color
    ${havingClause}
    ORDER BY p.nombre
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params)

  const countParams = params.slice(0, params.length - 2)
  const { rows: countRows } = await pool.query(`
    SELECT COUNT(DISTINCT p.id) AS total
    FROM inv_productos p
    LEFT JOIN inv_categorias c ON c.id = p.categoria_id
    LEFT JOIN inv_stock s ON s.producto_id = p.id
    WHERE ${where}
  `, countParams)

  return reply.send({
    data: rows,
    total: parseInt(countRows[0].total),
    page: parseInt(page),
    limit: parseInt(limit),
  })
}

export async function crearProducto(req, reply) {
  const {
    categoria_id, nombre, descripcion, unidad_medida = 'UNIDAD',
    costo_promedio = 0, precio_venta = 0,
    stock_minimo = 0, stock_maximo = 9999,
    es_perecedero = false, imagen_url,
  } = req.body

  let { codigo_sku } = req.body

  if (!codigo_sku) {
    const fecha = new Date().toISOString().replace(/-/g, '').slice(0, 8)
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    // Get 3-letter prefix from category
    let prefix = 'PRD'
    if (categoria_id) {
      const cat = await pool.query('SELECT nombre FROM inv_categorias WHERE id=$1', [categoria_id])
      if (cat.rows[0]) prefix = cat.rows[0].nombre.substring(0, 3).toUpperCase()
    }
    codigo_sku = `${prefix}-${fecha}-${rand}`
  }

  const { rows } = await pool.query(`
    INSERT INTO inv_productos
      (categoria_id, codigo_sku, nombre, descripcion, unidad_medida,
       costo_promedio, precio_venta, stock_minimo, stock_maximo, es_perecedero, imagen_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [categoria_id, codigo_sku, nombre, descripcion, unidad_medida,
      costo_promedio, precio_venta, stock_minimo, stock_maximo, es_perecedero, imagen_url])

  return reply.code(201).send(rows[0])
}

export async function actualizarProducto(req, reply) {
  const { id } = req.params
  const {
    categoria_id, codigo_sku, nombre, descripcion, unidad_medida,
    costo_promedio, precio_venta, stock_minimo, stock_maximo,
    es_perecedero, imagen_url, activo,
  } = req.body

  // "" ("— Sin categoría —") no es un UUID válido para Postgres, y COALESCE
  // nunca permitiría limpiar la categoría (un $1 nulo simplemente conserva
  // la anterior) — se distingue "no enviado" de "enviado vacío para limpiar".
  const categoriaProvista = Object.prototype.hasOwnProperty.call(req.body, 'categoria_id')
  const categoriaIdNorm = categoria_id === '' ? null : categoria_id

  const { rows } = await pool.query(`
    UPDATE inv_productos SET
      categoria_id   = CASE WHEN $14 THEN $1 ELSE categoria_id END,
      codigo_sku     = COALESCE($2, codigo_sku),
      nombre         = COALESCE($3, nombre),
      descripcion    = COALESCE($4, descripcion),
      unidad_medida  = COALESCE($5, unidad_medida),
      costo_promedio = COALESCE($6, costo_promedio),
      precio_venta   = COALESCE($7, precio_venta),
      stock_minimo   = COALESCE($8, stock_minimo),
      stock_maximo   = COALESCE($9, stock_maximo),
      es_perecedero  = COALESCE($10, es_perecedero),
      imagen_url     = COALESCE($11, imagen_url),
      activo         = COALESCE($12, activo),
      actualizado_en = NOW()
    WHERE id = $13
    RETURNING *
  `, [categoriaIdNorm, codigo_sku, nombre, descripcion, unidad_medida,
      costo_promedio, precio_venta, stock_minimo, stock_maximo,
      es_perecedero, imagen_url, activo, id, categoriaProvista])

  if (!rows.length) return reply.code(404).send({ error: 'Producto no encontrado' })
  return reply.send(rows[0])
}

export async function detalleProducto(req, reply) {
  const { id } = req.params

  const prod = await pool.query(`
    SELECT p.*, c.nombre AS categoria_nombre, c.icono AS categoria_icono, c.color AS categoria_color
    FROM inv_productos p
    LEFT JOIN inv_categorias c ON c.id = p.categoria_id
    WHERE p.id = $1
  `, [id])

  if (!prod.rows.length) return reply.code(404).send({ error: 'Producto no encontrado' })

  const stockDetalle = await pool.query(`
    SELECT s.cantidad, s.costo_unitario_promedio,
           s.cantidad * s.costo_unitario_promedio AS valor,
           u.codigo AS ubicacion_codigo, u.nombre AS ubicacion_nombre, u.tipo AS ubicacion_tipo,
           b.nombre AS bodega_nombre, b.codigo AS bodega_codigo
    FROM inv_stock s
    JOIN inv_ubicaciones u ON u.id = s.ubicacion_id
    JOIN inv_bodegas b ON b.id = u.bodega_id
    WHERE s.producto_id = $1
    ORDER BY b.nombre, u.codigo
  `, [id])

  const movimientos = await pool.query(`
    SELECT m.id, m.tipo, m.cantidad, m.costo_unitario, m.valor_total,
           m.referencia, m.motivo, m.fecha, m.notas,
           uo.codigo AS origen_codigo, ub.codigo AS destino_codigo,
           bo.nombre AS origen_bodega, bd.nombre AS destino_bodega,
           u.nombre AS usuario_nombre
    FROM inv_movimientos m
    LEFT JOIN inv_ubicaciones uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN inv_ubicaciones ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN inv_bodegas bo ON bo.id = uo.bodega_id
    LEFT JOIN inv_bodegas bd ON bd.id = ud.bodega_id
    LEFT JOIN inv_ubicaciones ub ON ub.id = m.ubicacion_destino_id
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.producto_id = $1
    ORDER BY m.fecha DESC LIMIT 10
  `, [id])

  return reply.send({
    ...prod.rows[0],
    stock_detalle: stockDetalle.rows,
    movimientos_recientes: movimientos.rows,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// BODEGAS
// ═══════════════════════════════════════════════════════════════════════════

export async function listarBodegas(req, reply) {
  const { sedeIds } = resolverSede(req)
  const { rows } = await pool.query(`
    SELECT b.*,
           s.nombre AS sede_nombre,
           u.nombre AS responsable_nombre,
           COUNT(DISTINCT ub.id) AS total_ubicaciones,
           COUNT(DISTINCT st.producto_id) AS total_productos,
           COALESCE(SUM(st.cantidad * st.costo_unitario_promedio), 0) AS valor_total
    FROM inv_bodegas b
    LEFT JOIN sedes s ON s.id = b.sede_id
    LEFT JOIN usuarios u ON u.id = b.responsable_id
    LEFT JOIN inv_ubicaciones ub ON ub.bodega_id = b.id AND ub.activo = TRUE
    LEFT JOIN inv_stock st ON st.ubicacion_id = ub.id
    WHERE b.activo = TRUE AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    GROUP BY b.id, s.nombre, u.nombre
    ORDER BY b.nombre
  `, [sedeIds])
  return reply.send(rows)
}

export async function crearBodega(req, reply) {
  const { codigo, nombre, descripcion, responsable_id } = req.body
  const sede_id = sedeParaCrear(req)

  const { rows } = await pool.query(`
    INSERT INTO inv_bodegas (sede_id, codigo, nombre, descripcion, responsable_id)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `, [sede_id, codigo, nombre, descripcion, responsable_id])

  return reply.code(201).send(rows[0])
}

export async function listarUbicaciones(req, reply) {
  const { id: bodega_id } = req.params

  const { rows } = await pool.query(`
    SELECT u.*,
           COUNT(s.id) AS productos_count,
           COALESCE(SUM(s.cantidad), 0) AS stock_total
    FROM inv_ubicaciones u
    LEFT JOIN inv_stock s ON s.ubicacion_id = u.id
    WHERE u.bodega_id = $1 AND u.activo = TRUE
    GROUP BY u.id
    ORDER BY u.codigo
  `, [bodega_id])

  return reply.send(rows)
}

export async function crearUbicacion(req, reply) {
  const { id: bodega_id } = req.params
  const { codigo, nombre, tipo = 'ESTANTE', capacidad_max = 9999 } = req.body

  const { rows } = await pool.query(`
    INSERT INTO inv_ubicaciones (bodega_id, codigo, nombre, tipo, capacidad_max)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `, [bodega_id, codigo, nombre, tipo, capacidad_max])

  return reply.code(201).send(rows[0])
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════

export async function listarMovimientos(req, reply) {
  const { tipo, producto_id, bodega_id, desde, hasta, page = 1, limit = 50 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const { sedeIds } = resolverSede(req)
  const params = []
  const wheres = []

  if (tipo) { params.push(tipo); wheres.push(`m.tipo = $${params.length}`) }
  if (producto_id) { params.push(producto_id); wheres.push(`m.producto_id = $${params.length}`) }
  if (bodega_id) {
    params.push(bodega_id)
    wheres.push(`(bo.id = $${params.length} OR bd.id = $${params.length})`)
  }
  if (desde) { params.push(desde); wheres.push(`m.fecha >= $${params.length}`) }
  if (hasta) { params.push(hasta + ' 23:59:59'); wheres.push(`m.fecha <= $${params.length}`) }
  params.push(sedeIds)
  wheres.push(`($${params.length}::uuid[] IS NULL OR bo.sede_id = ANY($${params.length}::uuid[]) OR bd.sede_id = ANY($${params.length}::uuid[]))`)

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  params.push(parseInt(limit))
  params.push(offset)

  const { rows } = await pool.query(`
    SELECT m.id, m.tipo, m.cantidad, m.costo_unitario, m.valor_total,
           m.referencia, m.motivo, m.fecha, m.notas,
           p.nombre AS producto_nombre, p.codigo_sku,
           uo.codigo AS origen_codigo, bo.nombre AS origen_bodega,
           ud.codigo AS destino_codigo, bd.nombre AS destino_bodega,
           usr.nombre AS usuario_nombre
    FROM inv_movimientos m
    JOIN inv_productos p ON p.id = m.producto_id
    LEFT JOIN inv_ubicaciones uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN inv_ubicaciones ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN inv_bodegas bo ON bo.id = uo.bodega_id
    LEFT JOIN inv_bodegas bd ON bd.id = ud.bodega_id
    LEFT JOIN usuarios usr ON usr.id = m.usuario_id
    ${where}
    ORDER BY m.fecha DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params)

  const countParams = params.slice(0, params.length - 2)
  const { rows: cnt } = await pool.query(`
    SELECT COUNT(*) AS total
    FROM inv_movimientos m
    JOIN inv_productos p ON p.id = m.producto_id
    LEFT JOIN inv_ubicaciones uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN inv_ubicaciones ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN inv_bodegas bo ON bo.id = uo.bodega_id
    LEFT JOIN inv_bodegas bd ON bd.id = ud.bodega_id
    ${where}
  `, countParams)

  return reply.send({ data: rows, total: parseInt(cnt[0].total), page: parseInt(page), limit: parseInt(limit) })
}

export async function registrarMovimiento(req, reply) {
  const {
    tipo, producto_id,
    ubicacion_origen_id, ubicacion_destino_id,
    cantidad, costo_unitario = 0,
    referencia, motivo, servicio_id, orden_compra_id, notas,
  } = req.body

  const usuario_id = req.user.id
  const { sedeIds } = resolverSede(req)

  for (const ubicId of [ubicacion_origen_id, ubicacion_destino_id]) {
    if (!ubicId) continue
    const ub = await pool.query('SELECT bodega_id FROM inv_ubicaciones WHERE id=$1', [ubicId])
    if (!ub.rows.length || !(await bodegaPermitida(pool, ub.rows[0].bodega_id, sedeIds))) {
      return reply.code(403).send({ error: 'No tiene acceso a la bodega de la ubicación seleccionada' })
    }
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    if (tipo === 'ENTRADA') {
      // Weighted average cost upsert
      const existing = await client.query(
        `SELECT cantidad, costo_unitario_promedio FROM inv_stock
         WHERE producto_id=$1 AND ubicacion_id=$2`,
        [producto_id, ubicacion_destino_id]
      )

      let nuevoCosto = parseFloat(costo_unitario)
      if (existing.rows.length) {
        const q0 = parseFloat(existing.rows[0].cantidad)
        const c0 = parseFloat(existing.rows[0].costo_unitario_promedio)
        const q1 = parseFloat(cantidad)
        nuevoCosto = (q0 * c0 + q1 * nuevoCosto) / (q0 + q1)
      }

      await client.query(`
        INSERT INTO inv_stock (producto_id, ubicacion_id, cantidad, costo_unitario_promedio, ultima_actualizacion)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET
          cantidad = inv_stock.cantidad + EXCLUDED.cantidad,
          costo_unitario_promedio = $4,
          ultima_actualizacion = NOW()
      `, [producto_id, ubicacion_destino_id, cantidad, nuevoCosto])

      // Update product average cost
      await client.query(
        `UPDATE inv_productos SET costo_promedio = $1, actualizado_en = NOW() WHERE id = $2`,
        [nuevoCosto, producto_id]
      )

    } else if (tipo === 'SALIDA' || tipo === 'CONSUMO') {
      const stock = await client.query(
        `SELECT cantidad FROM inv_stock WHERE producto_id=$1 AND ubicacion_id=$2 FOR UPDATE`,
        [producto_id, ubicacion_origen_id]
      )
      if (!stock.rows.length || parseFloat(stock.rows[0].cantidad) < parseFloat(cantidad)) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: 'Stock insuficiente en la ubicación seleccionada' })
      }
      await client.query(`
        UPDATE inv_stock SET
          cantidad = cantidad - $1,
          ultima_actualizacion = NOW()
        WHERE producto_id=$2 AND ubicacion_id=$3
      `, [cantidad, producto_id, ubicacion_origen_id])

    } else if (tipo === 'TRASLADO') {
      // Subtract from origin
      const stock = await client.query(
        `SELECT cantidad, costo_unitario_promedio FROM inv_stock
         WHERE producto_id=$1 AND ubicacion_id=$2 FOR UPDATE`,
        [producto_id, ubicacion_origen_id]
      )
      if (!stock.rows.length || parseFloat(stock.rows[0].cantidad) < parseFloat(cantidad)) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: 'Stock insuficiente en la ubicación origen' })
      }
      const costoUnit = parseFloat(stock.rows[0].costo_unitario_promedio)

      await client.query(`
        UPDATE inv_stock SET cantidad = cantidad - $1, ultima_actualizacion = NOW()
        WHERE producto_id=$2 AND ubicacion_id=$3
      `, [cantidad, producto_id, ubicacion_origen_id])

      // Add to destination
      await client.query(`
        INSERT INTO inv_stock (producto_id, ubicacion_id, cantidad, costo_unitario_promedio, ultima_actualizacion)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET
          cantidad = inv_stock.cantidad + EXCLUDED.cantidad,
          costo_unitario_promedio = $4,
          ultima_actualizacion = NOW()
      `, [producto_id, ubicacion_destino_id, cantidad, costoUnit])

    } else if (tipo === 'AJUSTE') {
      // Set absolute value
      await client.query(`
        INSERT INTO inv_stock (producto_id, ubicacion_id, cantidad, costo_unitario_promedio, ultima_actualizacion)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET
          cantidad = $3,
          ultima_actualizacion = NOW()
      `, [producto_id, ubicacion_destino_id || ubicacion_origen_id, cantidad, costo_unitario])
    }

    // Record movement
    const { rows } = await client.query(`
      INSERT INTO inv_movimientos
        (tipo, producto_id, ubicacion_origen_id, ubicacion_destino_id,
         cantidad, costo_unitario, referencia, motivo, servicio_id, orden_compra_id, usuario_id, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [tipo, producto_id, ubicacion_origen_id, ubicacion_destino_id,
        cantidad, costo_unitario, referencia, motivo, servicio_id, orden_compra_id, usuario_id, notas])

    await client.query('COMMIT')
    return reply.code(201).send(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════

export async function listarOC(req, reply) {
  const { estado } = req.query
  const { sedeIds } = resolverSede(req)
  const params = []
  const wheres = []

  if (estado) { params.push(estado); wheres.push(`o.estado = $${params.length}`) }
  params.push(sedeIds); wheres.push(`($${params.length}::uuid[] IS NULL OR b.sede_id = ANY($${params.length}::uuid[]))`)

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  const { rows } = await pool.query(`
    SELECT o.*,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS proveedor_nombre,
           t.numero_documento AS proveedor_nit,
           b.nombre AS bodega_nombre,
           u.nombre AS usuario_nombre,
           ap.nombre AS aprobado_por_nombre,
           COUNT(d.id) AS total_items
    FROM inv_ordenes_compra o
    LEFT JOIN terceros t ON t.id = o.proveedor_id
    LEFT JOIN inv_bodegas b ON b.id = o.bodega_destino_id
    LEFT JOIN usuarios u ON u.id = o.usuario_id
    LEFT JOIN usuarios ap ON ap.id = o.aprobado_por
    LEFT JOIN inv_oc_detalle d ON d.orden_id = o.id
    ${where}
    GROUP BY o.id, t.razon_social, t.nombres, t.apellidos, t.numero_documento, b.nombre, u.nombre, ap.nombre
    ORDER BY o.creado_en DESC
  `, params)

  return reply.send(rows)
}

export async function crearOC(req, reply) {
  const { proveedor_id, bodega_destino_id, fecha_esperada, notas, detalle = [] } = req.body
  const usuario_id = req.user.id

  if (!detalle.length) return reply.code(400).send({ error: 'Debe incluir al menos un producto en el detalle' })

  const { sedeIds } = resolverSede(req)
  if (!(await bodegaPermitida(pool, bodega_destino_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a la bodega destino seleccionada' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const subtotal = detalle.reduce((acc, d) => acc + (parseFloat(d.cantidad_solicitada) * parseFloat(d.costo_unitario)), 0)
    const total = subtotal // impuestos = 0 by default

    const { rows } = await client.query(`
      INSERT INTO inv_ordenes_compra
        (proveedor_id, bodega_destino_id, fecha_esperada, notas, subtotal, total, usuario_id)
      VALUES ($1,$2,$3,$4,$5,$5,$6)
      RETURNING *
    `, [proveedor_id, bodega_destino_id, fecha_esperada, notas, subtotal, usuario_id])

    const orden_id = rows[0].id

    for (const item of detalle) {
      await client.query(`
        INSERT INTO inv_oc_detalle (orden_id, producto_id, cantidad_solicitada, costo_unitario, notas)
        VALUES ($1,$2,$3,$4,$5)
      `, [orden_id, item.producto_id, item.cantidad_solicitada, item.costo_unitario, item.notas])
    }

    await client.query('COMMIT')
    return reply.code(201).send(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function detalleOC(req, reply) {
  const { id } = req.params

  const oc = await pool.query(`
    SELECT o.*,
           COALESCE(t.razon_social, CONCAT(TRIM(COALESCE(t.nombres,'')), ' ', TRIM(COALESCE(t.apellidos,'')))) AS proveedor_nombre,
           t.numero_documento AS proveedor_nit,
           b.nombre AS bodega_nombre,
           u.nombre AS usuario_nombre,
           ap.nombre AS aprobado_por_nombre
    FROM inv_ordenes_compra o
    LEFT JOIN terceros t ON t.id = o.proveedor_id
    LEFT JOIN inv_bodegas b ON b.id = o.bodega_destino_id
    LEFT JOIN usuarios u ON u.id = o.usuario_id
    LEFT JOIN usuarios ap ON ap.id = o.aprobado_por
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

  return reply.send({ ...oc.rows[0], detalle: detalle.rows })
}

export async function aprobarOC(req, reply) {
  const { id } = req.params
  const usuario_id = req.user.id

  const { rows } = await pool.query(`
    UPDATE inv_ordenes_compra SET
      estado = 'APROBADA',
      aprobado_por = $1,
      fecha_aprobacion = NOW()
    WHERE id = $2 AND estado = 'PENDIENTE'
    RETURNING *
  `, [usuario_id, id])

  if (!rows.length) return reply.code(400).send({ error: 'La orden no existe o no está en estado PENDIENTE' })
  return reply.send(rows[0])
}

export async function recibirOC(req, reply) {
  const { id } = req.params
  const usuario_id = req.user.id
  const { recepciones = [] } = req.body  // [{ detalle_id, cantidad_recibida }]
  const { sedeIds } = resolverSede(req)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const oc = await client.query(
      `SELECT * FROM inv_ordenes_compra WHERE id=$1 FOR UPDATE`,
      [id]
    )
    if (!oc.rows.length) { await client.query('ROLLBACK'); return reply.code(404).send({ error: 'OC no encontrada' }) }
    if (oc.rows[0].estado !== 'APROBADA') { await client.query('ROLLBACK'); return reply.code(400).send({ error: 'La OC debe estar APROBADA para recibir mercancía' }) }
    if (!(await bodegaPermitida(client, oc.rows[0].bodega_destino_id, sedeIds))) {
      await client.query('ROLLBACK')
      return reply.code(403).send({ error: 'No tiene acceso a la bodega de esta orden de compra' })
    }

    const bodega_id = oc.rows[0].bodega_destino_id

    // Get default ubicacion for this bodega (first one)
    const ubicDefault = await client.query(
      `SELECT id FROM inv_ubicaciones WHERE bodega_id=$1 AND activo=TRUE ORDER BY codigo LIMIT 1`,
      [bodega_id]
    )
    const ubicacion_id = ubicDefault.rows[0]?.id

    if (!ubicacion_id) { await client.query('ROLLBACK'); return reply.code(400).send({ error: 'La bodega destino no tiene ubicaciones configuradas' }) }

    for (const rec of recepciones) {
      const det = await client.query(
        `SELECT * FROM inv_oc_detalle WHERE id=$1 AND orden_id=$2 FOR UPDATE`,
        [rec.detalle_id, id]
      )
      if (!det.rows.length) continue

      const item = det.rows[0]
      const cantRecibida = parseFloat(rec.cantidad_recibida)

      // Update detalle
      await client.query(`
        UPDATE inv_oc_detalle SET cantidad_recibida = cantidad_recibida + $1 WHERE id=$2
      `, [cantRecibida, item.id])

      // Stock ENTRADA
      const existing = await client.query(
        `SELECT cantidad, costo_unitario_promedio FROM inv_stock
         WHERE producto_id=$1 AND ubicacion_id=$2`,
        [item.producto_id, ubicacion_id]
      )
      let nuevoCosto = parseFloat(item.costo_unitario)
      if (existing.rows.length) {
        const q0 = parseFloat(existing.rows[0].cantidad)
        const c0 = parseFloat(existing.rows[0].costo_unitario_promedio)
        nuevoCosto = (q0 * c0 + cantRecibida * nuevoCosto) / (q0 + cantRecibida)
      }

      await client.query(`
        INSERT INTO inv_stock (producto_id, ubicacion_id, cantidad, costo_unitario_promedio, ultima_actualizacion)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET
          cantidad = inv_stock.cantidad + EXCLUDED.cantidad,
          costo_unitario_promedio = $4,
          ultima_actualizacion = NOW()
      `, [item.producto_id, ubicacion_id, cantRecibida, nuevoCosto])

      // Movement
      await client.query(`
        INSERT INTO inv_movimientos
          (tipo, producto_id, ubicacion_destino_id, cantidad, costo_unitario, referencia, orden_compra_id, usuario_id)
        VALUES ('ENTRADA', $1, $2, $3, $4, $5, $6, $7)
      `, [item.producto_id, ubicacion_id, cantRecibida, item.costo_unitario, `OC-${oc.rows[0].numero}`, id, usuario_id])
    }

    // Check if all received
    const pending = await client.query(`
      SELECT COUNT(*) AS cnt FROM inv_oc_detalle
      WHERE orden_id=$1 AND cantidad_recibida < cantidad_solicitada
    `, [id])

    let nuevoEstado = oc.rows[0].estado
    if (parseInt(pending.rows[0].cnt) === 0) {
      nuevoEstado = 'RECIBIDA'
      await client.query(`
        UPDATE inv_ordenes_compra SET estado='RECIBIDA', fecha_recepcion=CURRENT_DATE WHERE id=$1
      `, [id])
    }

    await client.query('COMMIT')
    return reply.send({ ok: true, estado: nuevoEstado })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
