/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : POS — Punto de Venta (material litúrgico)           ║
 * ║  Archivo         : pos.controller.js                                   ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, sedeParaCrear, bodegaPermitida } from '../utils/sede.js'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOPORTES_DIR = path.join(__dirname, '..', 'uploads', 'soportes')
const EXT_PERMITIDAS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'])

// ── Subir soporte de un pago (foto/PDF del comprobante) ────────────────────
// Se sube ANTES de crear la venta (el cajero adjunta el comprobante mientras
// arma el pago) — devuelve la URL para incluirla en el pago al registrar la
// venta. Acepta PDF e imágenes, igual que el resto del sistema.
export async function subirSoportePago(req, reply) {
  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No se recibió ningún archivo' })

  const ext = path.extname(data.filename).toLowerCase()
  if (!EXT_PERMITIDAS.has(ext))
    return reply.code(400).send({ error: `Formato no permitido. Use: ${[...EXT_PERMITIDAS].join(', ')}` })

  const nombreArchivo = `pos_pago_${req.user.id}_${Date.now()}${ext}`
  const rutaLocal = path.join(SOPORTES_DIR, nombreArchivo)
  const urlPublica = `/uploads/soportes/${nombreArchivo}`

  const writeStream = fs.createWriteStream(rutaLocal)
  await pipeline(data.file, writeStream)

  if (data.file.truncated) {
    fs.unlink(rutaLocal, () => {})
    return reply.code(413).send({ error: 'El archivo supera el límite permitido. Comprime la imagen o usa PDF.' })
  }

  return reply.send({ ok: true, url: urlPublica })
}

// El efectivo real en caja se calcula sumando las LÍNEAS de pago en efectivo
// (pos_venta_pagos), no el total de la venta — una venta puede pagarse
// dividida entre varios medios (ej. $4.000 en Nequi + el resto en efectivo).
const SQL_TOTAL_EFECTIVO_CAJA = `
  (SELECT COALESCE(SUM(vp.monto),0) FROM pos_venta_pagos vp
   JOIN pos_ventas v2 ON v2.id = vp.venta_id
   WHERE v2.caja_id = c.id AND NOT v2.anulada AND vp.metodo_pago = 'efectivo')
`

// ── Caja actualmente abierta del usuario ───────────────────────────────────
export async function cajaActual(req, reply) {
  const { rows } = await pool.query(`
    SELECT c.*, b.nombre AS bodega_nombre, s.nombre AS sede_nombre,
      (SELECT COALESCE(SUM(v.total),0) FROM pos_ventas v WHERE v.caja_id = c.id AND NOT v.anulada) AS total_vendido,
      ${SQL_TOTAL_EFECTIVO_CAJA} AS total_efectivo,
      (SELECT COUNT(*) FROM pos_ventas v WHERE v.caja_id = c.id AND NOT v.anulada) AS total_ventas
    FROM pos_cajas c
    LEFT JOIN inv_bodegas b ON b.id = c.bodega_id
    LEFT JOIN sedes s ON s.id = c.sede_id
    WHERE c.usuario_id = $1 AND c.estado = 'ABIERTA'
  `, [req.user.id])
  return reply.send({ data: rows[0] || null })
}

// ── Bodegas disponibles para abrir caja (de la(s) sede(s) del usuario) ────
export async function bodegasDisponibles(req, reply) {
  const { sedeIds } = resolverSede(req)
  const { rows } = await pool.query(`
    SELECT b.id, b.nombre, b.codigo, s.nombre AS sede_nombre
    FROM inv_bodegas b
    LEFT JOIN sedes s ON s.id = b.sede_id
    WHERE b.activo = TRUE AND ($1::uuid[] IS NULL OR b.sede_id = ANY($1::uuid[]))
    ORDER BY s.nombre, b.nombre
  `, [sedeIds])
  return reply.send({ data: rows })
}

// ── Abrir caja ──────────────────────────────────────────────────────────────
export async function abrirCaja(req, reply) {
  const { bodega_id, monto_apertura = 0, observaciones } = req.body
  if (!bodega_id) return reply.code(400).send({ error: 'bodega_id es obligatorio' })
  if (+monto_apertura < 0) return reply.code(400).send({ error: 'monto_apertura no puede ser negativo' })

  const { sedeIds } = resolverSede(req)
  if (!(await bodegaPermitida(pool, bodega_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esa bodega' })
  }

  const existente = await pool.query(
    `SELECT id FROM pos_cajas WHERE usuario_id=$1 AND estado='ABIERTA'`, [req.user.id]
  )
  if (existente.rows.length) {
    return reply.code(409).send({ error: 'Ya tiene una caja abierta. Ciérrela antes de abrir una nueva.' })
  }

  const bod = await pool.query(`SELECT sede_id FROM inv_bodegas WHERE id=$1`, [bodega_id])
  if (!bod.rows.length) return reply.code(404).send({ error: 'Bodega no encontrada' })

  const { rows } = await pool.query(`
    INSERT INTO pos_cajas (sede_id, bodega_id, usuario_id, monto_apertura, observaciones_apertura)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [bod.rows[0].sede_id, bodega_id, req.user.id, monto_apertura, observaciones || null])

  return reply.code(201).send({ data: rows[0] })
}

// ── Cerrar caja ─────────────────────────────────────────────────────────────
export async function cerrarCaja(req, reply) {
  const { id } = req.params
  const { monto_cierre_real, observaciones } = req.body
  if (monto_cierre_real == null || +monto_cierre_real < 0)
    return reply.code(400).send({ error: 'monto_cierre_real es obligatorio y no puede ser negativo' })

  const caja = await pool.query(`SELECT * FROM pos_cajas WHERE id=$1`, [id])
  if (!caja.rows.length) return reply.code(404).send({ error: 'Caja no encontrada' })
  if (caja.rows[0].usuario_id !== req.user.id && !['superadmin','administrador'].includes(req.user.rol)) {
    return reply.code(403).send({ error: 'Solo el cajero que abrió esta caja (o un administrador) puede cerrarla' })
  }
  if (caja.rows[0].estado === 'CERRADA') return reply.code(400).send({ error: 'Esta caja ya está cerrada' })

  const efectivo = await pool.query(`
    SELECT COALESCE(SUM(vp.monto),0) AS total
    FROM pos_venta_pagos vp
    JOIN pos_ventas v ON v.id = vp.venta_id
    WHERE v.caja_id=$1 AND NOT v.anulada AND vp.metodo_pago='efectivo'
  `, [id])

  const esperado = parseFloat(caja.rows[0].monto_apertura) + parseFloat(efectivo.rows[0].total)
  const diferencia = parseFloat(monto_cierre_real) - esperado

  const { rows } = await pool.query(`
    UPDATE pos_cajas SET
      estado = 'CERRADA',
      monto_cierre_esperado = $1,
      monto_cierre_real = $2,
      diferencia = $3,
      observaciones_cierre = $4,
      cerrada_en = NOW()
    WHERE id = $5
    RETURNING *
  `, [esperado, monto_cierre_real, diferencia, observaciones || null, id])

  return reply.send({ data: rows[0] })
}

// ── Historial de cajas ──────────────────────────────────────────────────────
// Un admin ve todas las cajas de sus sedes; un cajero normal solo ve las
// suyas propias (su propio historial de turnos, no el de sus compañeros).
export async function historialCajas(req, reply) {
  const { sedeIds } = resolverSede(req)
  const esAdmin = ['superadmin', 'administrador'].includes(req.user.rol)
  const params = [sedeIds, esAdmin ? null : req.user.id]

  const { rows } = await pool.query(`
    SELECT c.*, u.nombre AS cajero_nombre, b.nombre AS bodega_nombre, s.nombre AS sede_nombre,
      (SELECT COUNT(*) FROM pos_ventas v WHERE v.caja_id = c.id AND NOT v.anulada) AS total_ventas,
      (SELECT COALESCE(SUM(v.total),0) FROM pos_ventas v WHERE v.caja_id = c.id AND NOT v.anulada) AS total_vendido,
      (SELECT COUNT(*) FROM pos_ventas v WHERE v.caja_id = c.id AND v.anulada) AS ventas_anuladas
    FROM pos_cajas c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    LEFT JOIN inv_bodegas b ON b.id = c.bodega_id
    LEFT JOIN sedes s ON s.id = c.sede_id
    WHERE ($1::uuid[] IS NULL OR c.sede_id = ANY($1::uuid[]))
      AND ($2::uuid IS NULL OR c.usuario_id = $2)
    ORDER BY c.abierta_en DESC
    LIMIT 100
  `, params)
  return reply.send({ data: rows })
}

// ── Auditoría completa de una caja: apertura → ventas → cierre ────────────
// Reporte "nivel dios": desglose por forma de pago, cada venta con su
// detalle, ventas anuladas por separado (nunca se ocultan), top productos y
// el arqueo final. Pensado para poder blindar cualquier reclamo de caja.
export async function auditoriaCaja(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)

  const cajaRes = await pool.query(`
    SELECT c.*, u.nombre AS cajero_nombre, u.email AS cajero_email,
      b.nombre AS bodega_nombre, b.codigo AS bodega_codigo, s.nombre AS sede_nombre
    FROM pos_cajas c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    LEFT JOIN inv_bodegas b ON b.id = c.bodega_id
    LEFT JOIN sedes s ON s.id = c.sede_id
    WHERE c.id = $1
  `, [id])
  if (!cajaRes.rows.length) return reply.code(404).send({ error: 'Caja no encontrada' })
  const caja = cajaRes.rows[0]

  const esAdmin = ['superadmin', 'administrador'].includes(req.user.rol)
  if (!esAdmin && caja.usuario_id !== req.user.id) {
    return reply.code(403).send({ error: 'No tiene acceso a esta caja' })
  }
  if (sedeIds !== null && !sedeIds.includes(caja.sede_id)) {
    return reply.code(403).send({ error: 'No tiene acceso a esta caja' })
  }

  const [resumen, porMetodo, ventas, topProductos] = await Promise.all([
    // Resumen general: ventas válidas vs. anuladas, nunca se mezclan
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE NOT anulada) AS total_ventas,
        COALESCE(SUM(total) FILTER (WHERE NOT anulada), 0) AS total_vendido,
        COUNT(*) FILTER (WHERE anulada) AS ventas_anuladas,
        COALESCE(SUM(total) FILTER (WHERE anulada), 0) AS valor_anulado
      FROM pos_ventas WHERE caja_id = $1
    `, [id]),

    // Desglose por forma de pago (a partir de las LÍNEAS de pago, respeta
    // pagos divididos — una venta mixta aporta a cada método por separado)
    pool.query(`
      SELECT vp.metodo_pago, COUNT(*) AS cantidad_pagos, COALESCE(SUM(vp.monto),0) AS total
      FROM pos_venta_pagos vp
      JOIN pos_ventas v ON v.id = vp.venta_id
      WHERE v.caja_id = $1 AND NOT v.anulada
      GROUP BY vp.metodo_pago
      ORDER BY total DESC
    `, [id]),

    // Cada venta de la caja, válida o anulada, con su detalle de pagos e items
    pool.query(`
      SELECT v.id, v.numero, v.creado_en, v.total, v.anulada, v.motivo_anulacion, v.metodo_pago,
        v.cliente_nombre, COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS cliente_registrado_nombre,
        (SELECT COUNT(*) FROM pos_venta_items vi WHERE vi.venta_id = v.id) AS total_items,
        (SELECT json_agg(json_build_object('metodo_pago', vp.metodo_pago, 'monto', vp.monto, 'referencia', vp.referencia, 'soporte_url', vp.soporte_url))
         FROM pos_venta_pagos vp WHERE vp.venta_id = v.id) AS pagos
      FROM pos_ventas v
      LEFT JOIN terceros t ON t.id = v.cliente_id
      WHERE v.caja_id = $1
      ORDER BY v.creado_en ASC
    `, [id]),

    // Top productos vendidos en esta caja (solo ventas válidas)
    pool.query(`
      SELECT p.nombre, p.codigo_sku, SUM(vi.cantidad) AS cantidad_vendida, SUM(vi.subtotal) AS total_vendido
      FROM pos_venta_items vi
      JOIN pos_ventas v ON v.id = vi.venta_id
      JOIN inv_productos p ON p.id = vi.producto_id
      WHERE v.caja_id = $1 AND NOT v.anulada
      GROUP BY p.id, p.nombre, p.codigo_sku
      ORDER BY total_vendido DESC
    `, [id]),
  ])

  const r = resumen.rows[0]
  const totalEfectivo = porMetodo.rows.find(m => m.metodo_pago === 'efectivo')?.total || 0
  const esperado = caja.estado === 'CERRADA'
    ? +caja.monto_cierre_esperado
    : +caja.monto_apertura + +totalEfectivo

  return reply.send({
    data: {
      caja,
      resumen: {
        total_ventas: +r.total_ventas,
        total_vendido: +r.total_vendido,
        ventas_anuladas: +r.ventas_anuladas,
        valor_anulado: +r.valor_anulado,
      },
      por_metodo_pago: porMetodo.rows.map(m => ({ metodo_pago: m.metodo_pago, cantidad_pagos: +m.cantidad_pagos, total: +m.total })),
      ventas: ventas.rows,
      top_productos: topProductos.rows.map(p => ({ ...p, cantidad_vendida: +p.cantidad_vendida, total_vendido: +p.total_vendido })),
      arqueo: {
        monto_apertura: +caja.monto_apertura,
        total_efectivo_ventas: +totalEfectivo,
        esperado,
        monto_cierre_real: caja.monto_cierre_real != null ? +caja.monto_cierre_real : null,
        diferencia: caja.diferencia != null ? +caja.diferencia : null,
        estado: caja.estado,
      },
    },
  })
}

// ── Catálogo de productos disponibles para vender (con stock de la bodega) ─
export async function catalogo(req, reply) {
  const { bodega_id, q } = req.query
  if (!bodega_id) return reply.code(400).send({ error: 'bodega_id es obligatorio' })

  const { sedeIds } = resolverSede(req)
  if (!(await bodegaPermitida(pool, bodega_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esa bodega' })
  }

  const params = [bodega_id]
  let where = ''
  if (q) { params.push(`%${q}%`); where = `AND (p.nombre ILIKE $2 OR p.codigo_sku ILIKE $2)` }

  const { rows } = await pool.query(`
    SELECT p.id, p.codigo_sku, p.nombre, p.precio_venta, p.imagen_url,
      c.nombre AS categoria_nombre, c.icono AS categoria_icono,
      COALESCE(SUM(st.cantidad), 0) AS stock_disponible
    FROM inv_productos p
    LEFT JOIN inv_categorias c ON c.id = p.categoria_id
    JOIN inv_ubicaciones ub ON ub.bodega_id = $1 AND ub.activo = TRUE
    LEFT JOIN inv_stock st ON st.producto_id = p.id AND st.ubicacion_id = ub.id
    WHERE p.activo = TRUE ${where}
    GROUP BY p.id, c.nombre, c.icono
    HAVING COALESCE(SUM(st.cantidad), 0) > 0
    ORDER BY p.nombre
  `, params)

  return reply.send({ data: rows })
}

// ── Registrar venta ─────────────────────────────────────────────────────────
// Pago dividido (multi-tender), como cualquier POS real: el total puede
// cubrirse con varios medios de pago a la vez (ej. $4.000 en Nequi + el
// resto en efectivo). No existe descuento — el precio siempre es el del
// catálogo.
export async function registrarVenta(req, reply) {
  const { caja_id, items = [], cliente_id, cliente_nombre, pagos = [] } = req.body

  if (!caja_id) return reply.code(400).send({ error: 'caja_id es obligatorio' })
  if (!items.length) return reply.code(400).send({ error: 'Debe incluir al menos un ítem' })
  for (const it of items) {
    if (!it.producto_id || !(+it.cantidad > 0)) return reply.code(400).send({ error: 'Cada ítem requiere producto_id y cantidad mayor a 0' })
  }
  if (!pagos.length) return reply.code(400).send({ error: 'Debe incluir al menos un medio de pago' })
  for (const p of pagos) {
    if (!p.metodo_pago || !(+p.monto > 0)) return reply.code(400).send({ error: 'Cada pago requiere metodo_pago y monto mayor a 0' })
    // Un pago que no sea en efectivo debe quedar soportado: referencia (número
    // de aprobación/consignación) o el comprobante adjunto — cualquiera de
    // los dos, igual que se validó en el navegador antes de llegar aquí.
    if (p.metodo_pago !== 'efectivo' && !p.referencia?.trim() && !p.soporte_url) {
      return reply.code(400).send({ error: `El pago por "${p.metodo_pago}" necesita una referencia o un comprobante adjunto` })
    }
  }

  const caja = await pool.query(`SELECT * FROM pos_cajas WHERE id=$1 AND estado='ABIERTA'`, [caja_id])
  if (!caja.rows.length) return reply.code(400).send({ error: 'La caja no existe o no está abierta' })
  if (caja.rows[0].usuario_id !== req.user.id && !['superadmin','administrador'].includes(req.user.rol)) {
    return reply.code(403).send({ error: 'Solo el cajero dueño de esta caja puede registrar ventas en ella' })
  }
  const bodegaId = caja.rows[0].bodega_id
  const sedeId = caja.rows[0].sede_id

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let subtotal = 0
    const itemsConCosto = []
    for (const it of items) {
      const prod = await client.query(
        `SELECT precio_venta, costo_promedio FROM inv_productos WHERE id=$1 AND activo=TRUE`, [it.producto_id]
      )
      if (!prod.rows.length) { await client.query('ROLLBACK'); return reply.code(400).send({ error: 'Producto no encontrado o inactivo' }) }

      // Precio SIEMPRE tomado del servidor — nunca del cliente, evita manipulación.
      // Única excepción: un producto que todavía no tiene precio fijado (ej.
      // recién cargado en un inventario inicial sin lista de precios). Ahí,
      // y solo ahí, un admin/superadmin puede fijarlo en el momento de la
      // venta — y ese precio queda guardado para que cualquier cajero lo
      // use de ahí en adelante sin volver a pedirlo.
      let precioUnit = parseFloat(prod.rows[0].precio_venta)
      const costoUnit = parseFloat(prod.rows[0].costo_promedio || 0)
      if (!(precioUnit > 0)) {
        const override = Number(it.precio_unit_nuevo)
        const puedeFijarPrecio = ['superadmin', 'administrador'].includes(req.user.rol)
        if (!override || override <= 0) {
          await client.query('ROLLBACK')
          return reply.code(400).send({ error: 'Este producto no tiene precio de venta configurado. Actualízalo desde Inventario antes de venderlo.' })
        }
        if (!puedeFijarPrecio) {
          await client.query('ROLLBACK')
          return reply.code(403).send({ error: 'Este producto no tiene precio — solo un administrador puede fijarlo.' })
        }
        precioUnit = override
        await client.query(`UPDATE inv_productos SET precio_venta=$1, actualizado_en=NOW() WHERE id=$2`, [override, it.producto_id])
      }

      // El stock de un producto puede repartirse entre varias ubicaciones de
      // la misma bodega — se suma el disponible en TODAS y se descuenta en
      // cascada (no se asume que existe una sola ubicación por bodega).
      const stockPorUbic = await client.query(`
        SELECT st.ubicacion_id, st.cantidad
        FROM inv_stock st
        JOIN inv_ubicaciones ub ON ub.id = st.ubicacion_id
        WHERE st.producto_id = $1 AND ub.bodega_id = $2 AND ub.activo = TRUE AND st.cantidad > 0
        ORDER BY st.cantidad DESC
        FOR UPDATE OF st
      `, [it.producto_id, bodegaId])

      const disponibleTotal = stockPorUbic.rows.reduce((acc, r) => acc + parseFloat(r.cantidad), 0)
      if (disponibleTotal < +it.cantidad) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: `Stock insuficiente para el producto seleccionado (disponible: ${disponibleTotal})` })
      }

      subtotal += precioUnit * +it.cantidad
      itemsConCosto.push({ ...it, precioUnit, costoUnit, stockPorUbic: stockPorUbic.rows })
    }

    const total = subtotal

    // La suma de los pagos debe cuadrar exactamente con el total (tolerancia
    // de redondeo de 1 peso) — nunca se confía en que el cliente mande el
    // reparto correcto sin validarlo contra lo que realmente cuesta la venta.
    const totalPagado = pagos.reduce((acc, p) => acc + parseFloat(p.monto), 0)
    if (Math.abs(totalPagado - total) > 1) {
      await client.query('ROLLBACK')
      return reply.code(400).send({
        error: `Los pagos (${totalPagado.toLocaleString('es-CO')}) no cuadran con el total de la venta (${total.toLocaleString('es-CO')})`,
      })
    }

    const metodoResumen = pagos.length > 1 ? 'MIXTO' : pagos[0].metodo_pago
    const referenciaResumen = pagos.length === 1 ? (pagos[0].referencia || null) : null

    const ventaRes = await client.query(`
      INSERT INTO pos_ventas (caja_id, sede_id, bodega_id, cliente_id, cliente_nombre, subtotal, descuento, total, metodo_pago, referencia, usuario_id)
      VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10)
      RETURNING *, numero
    `, [caja_id, sedeId, bodegaId, cliente_id || null, cliente_nombre || null, subtotal, total, metodoResumen, referenciaResumen, req.user.id])

    const venta = ventaRes.rows[0]

    for (const p of pagos) {
      await client.query(`
        INSERT INTO pos_venta_pagos (venta_id, metodo_pago, monto, referencia, soporte_url)
        VALUES ($1,$2,$3,$4,$5)
      `, [venta.id, p.metodo_pago, p.monto, p.referencia || null, p.soporte_url || null])
    }

    for (const it of itemsConCosto) {
      let restante = +it.cantidad
      let ultimoMovId = null
      for (const ubic of it.stockPorUbic) {
        if (restante <= 0) break
        const tomar = Math.min(restante, parseFloat(ubic.cantidad))
        if (tomar <= 0) continue

        await client.query(`
          UPDATE inv_stock SET cantidad = cantidad - $1, ultima_actualizacion = NOW()
          WHERE producto_id=$2 AND ubicacion_id=$3
        `, [tomar, it.producto_id, ubic.ubicacion_id])

        const mov = await client.query(`
          INSERT INTO inv_movimientos (tipo, producto_id, ubicacion_origen_id, cantidad, costo_unitario, referencia, usuario_id, motivo)
          VALUES ('SALIDA',$1,$2,$3,$4,$5,$6,'Venta de mostrador (POS)')
          RETURNING id
        `, [it.producto_id, ubic.ubicacion_id, tomar, it.costoUnit, `POS-${venta.numero}`, req.user.id])

        ultimoMovId = mov.rows[0].id
        restante -= tomar
      }

      await client.query(`
        INSERT INTO pos_venta_items (venta_id, producto_id, cantidad, precio_unitario, costo_unitario, movimiento_id)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [venta.id, it.producto_id, it.cantidad, it.precioUnit, it.costoUnit, ultimoMovId])
    }

    await client.query('COMMIT')
    return reply.code(201).send({ data: venta })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ── Recibo de una venta (para imprimir) ────────────────────────────────────
export async function obtenerRecibo(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  const venta = await pool.query(`
    SELECT v.*, u.nombre AS cajero_nombre, b.nombre AS bodega_nombre, s.nombre AS sede_nombre,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS cliente_registrado_nombre,
      e.razon_social AS empresa_razon_social, e.nit AS empresa_nit, e.direccion AS empresa_direccion,
      e.telefono_1 AS empresa_telefono
    FROM pos_ventas v
    LEFT JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN inv_bodegas b ON b.id = v.bodega_id
    LEFT JOIN sedes s ON s.id = v.sede_id
    LEFT JOIN terceros t ON t.id = v.cliente_id
    LEFT JOIN empresa e ON TRUE
    WHERE v.id = $1
    LIMIT 1
  `, [id])
  if (!venta.rows.length) return reply.code(404).send({ error: 'Venta no encontrada' })
  if (sedeIds !== null && !sedeIds.includes(venta.rows[0].sede_id))
    return reply.code(403).send({ error: 'Esa venta no pertenece a tu sede' })

  const items = await pool.query(`
    SELECT vi.*, p.nombre AS producto_nombre, p.codigo_sku
    FROM pos_venta_items vi JOIN inv_productos p ON p.id = vi.producto_id
    WHERE vi.venta_id = $1
  `, [id])

  const pagos = await pool.query(`
    SELECT metodo_pago, monto, referencia, soporte_url FROM pos_venta_pagos WHERE venta_id = $1 ORDER BY creado_en
  `, [id])

  return reply.send({ data: { ...venta.rows[0], items: items.rows, pagos: pagos.rows } })
}

// ── Listar ventas ────────────────────────────────────────────────────────────
export async function listarVentas(req, reply) {
  const { caja_id, desde, hasta, page = 1, limit = 30 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const { sedeIds } = resolverSede(req)
  const params = []
  const wheres = []

  if (caja_id) { params.push(caja_id); wheres.push(`v.caja_id = $${params.length}`) }
  if (desde)   { params.push(desde);   wheres.push(`v.creado_en >= $${params.length}`) }
  if (hasta)   { params.push(hasta + ' 23:59:59'); wheres.push(`v.creado_en <= $${params.length}`) }
  params.push(sedeIds); wheres.push(`($${params.length}::uuid[] IS NULL OR v.sede_id = ANY($${params.length}::uuid[]))`)

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''
  params.push(parseInt(limit)); params.push(offset)

  const { rows } = await pool.query(`
    SELECT v.id, v.numero, v.total, v.metodo_pago, v.creado_en, v.anulada,
      v.cliente_nombre, u.nombre AS cajero_nombre,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS cliente_registrado_nombre,
      (SELECT COUNT(*) FROM pos_venta_items WHERE venta_id = v.id) AS total_items
    FROM pos_ventas v
    LEFT JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN terceros t ON t.id = v.cliente_id
    ${where}
    ORDER BY v.creado_en DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params)

  const countParams = params.slice(0, params.length - 2)
  const { rows: cnt } = await pool.query(`SELECT COUNT(*) AS total FROM pos_ventas v ${where}`, countParams)

  return reply.send({ data: rows, total: parseInt(cnt[0].total), page: parseInt(page), limit: parseInt(limit) })
}

// ── Anular venta (repone stock) ────────────────────────────────────────────
export async function anularVenta(req, reply) {
  const { id } = req.params
  const { motivo } = req.body
  if (!['superadmin','administrador'].includes(req.user.rol))
    return reply.code(403).send({ error: 'Solo un administrador puede anular una venta' })
  const { sedeIds } = resolverSede(req)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const venta = await client.query(`SELECT * FROM pos_ventas WHERE id=$1 AND NOT anulada FOR UPDATE`, [id])
    if (!venta.rows.length) { await client.query('ROLLBACK'); return reply.code(400).send({ error: 'Venta no encontrada o ya anulada' }) }
    if (sedeIds !== null && !sedeIds.includes(venta.rows[0].sede_id)) {
      await client.query('ROLLBACK')
      return reply.code(403).send({ error: 'Esa venta no pertenece a tu sede' })
    }

    const items = await client.query(`SELECT * FROM pos_venta_items WHERE venta_id=$1`, [id])
    for (const it of items.rows) {
      const ubic = await client.query(`SELECT ubicacion_origen_id FROM inv_movimientos WHERE id=$1`, [it.movimiento_id])
      const ubicacionId = ubic.rows[0]?.ubicacion_origen_id
      if (ubicacionId) {
        await client.query(`
          UPDATE inv_stock SET cantidad = cantidad + $1, ultima_actualizacion = NOW()
          WHERE producto_id=$2 AND ubicacion_id=$3
        `, [it.cantidad, it.producto_id, ubicacionId])

        await client.query(`
          INSERT INTO inv_movimientos (tipo, producto_id, ubicacion_destino_id, cantidad, costo_unitario, referencia, usuario_id, motivo)
          VALUES ('ENTRADA',$1,$2,$3,$4,$5,$6,'Anulación de venta de mostrador (POS)')
        `, [it.producto_id, ubicacionId, it.cantidad, it.costo_unitario, `POS-ANULA-${venta.rows[0].numero}`, req.user.id])
      }
    }

    await client.query(`
      UPDATE pos_ventas SET anulada=TRUE, motivo_anulacion=$1, fecha_anulacion=NOW() WHERE id=$2
    `, [motivo || null, id])

    await client.query('COMMIT')
    return reply.send({ ok: true })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ── Stats rápidos (para el dashboard del POS) ──────────────────────────────
export async function stats(req, reply) {
  const { sedeIds } = resolverSede(req)
  const hoy = new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE NOT anulada) AS ventas_hoy,
      COALESCE(SUM(total) FILTER (WHERE NOT anulada), 0) AS total_hoy
    FROM pos_ventas
    WHERE creado_en::date = $1 AND ($2::uuid[] IS NULL OR sede_id = ANY($2::uuid[]))
  `, [hoy, sedeIds])
  return reply.send({ data: rows[0] })
}
