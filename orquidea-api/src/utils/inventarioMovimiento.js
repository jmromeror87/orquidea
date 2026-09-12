/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Inventario — descarga/reversión en cascada           ║
 * ║  Archivo         : inventarioMovimiento.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Misma lógica de descuento en cascada que ya usaba pos.controller.js
 * (un producto puede tener stock repartido en varias ubicaciones de una
 * bodega), extraída aquí para que Servicios la reutilice sin duplicar el
 * kardex. `client` debe ser una conexión pg con una transacción abierta.
 */
export async function descargarStock(client, { producto_id, bodega_id, cantidad, referencia, usuario_id, motivo, servicio_id = null }) {
  const prod = await client.query(`SELECT costo_promedio FROM inv_productos WHERE id = $1`, [producto_id])
  if (!prod.rows.length) throw Object.assign(new Error('Producto no encontrado'), { httpCode: 404 })
  const costoUnitario = +prod.rows[0].costo_promedio || 0

  const stockPorUbic = await client.query(`
    SELECT st.ubicacion_id, st.cantidad
    FROM inv_stock st
    JOIN inv_ubicaciones ub ON ub.id = st.ubicacion_id
    WHERE st.producto_id = $1 AND ub.bodega_id = $2 AND ub.activo = TRUE AND st.cantidad > 0
    ORDER BY st.cantidad DESC
    FOR UPDATE OF st
  `, [producto_id, bodega_id])

  const disponible = stockPorUbic.rows.reduce((a, r) => a + parseFloat(r.cantidad), 0)
  if (disponible < cantidad)
    throw Object.assign(new Error(`Stock insuficiente en esta bodega (disponible: ${disponible})`), { httpCode: 400, code: 'STOCK_INSUFICIENTE' })

  let restante = cantidad
  let ultimoMovimientoId = null
  for (const ubic of stockPorUbic.rows) {
    if (restante <= 0) break
    const tomar = Math.min(restante, parseFloat(ubic.cantidad))
    if (tomar <= 0) continue

    await client.query(
      `UPDATE inv_stock SET cantidad = cantidad - $1, ultima_actualizacion = NOW() WHERE producto_id=$2 AND ubicacion_id=$3`,
      [tomar, producto_id, ubic.ubicacion_id]
    )
    const mov = await client.query(
      `INSERT INTO inv_movimientos (tipo, producto_id, ubicacion_origen_id, cantidad, costo_unitario, referencia, usuario_id, motivo, servicio_id)
       VALUES ('SALIDA',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [producto_id, ubic.ubicacion_id, tomar, costoUnitario, referencia, usuario_id, motivo, servicio_id]
    )
    ultimoMovimientoId = mov.rows[0].id
    restante -= tomar
  }

  return { costoUnitario, movimientoId: ultimoMovimientoId }
}

// Reversa una salida: no busca deshacer las ubicaciones exactas de origen
// (la cascada pudo haber tomado de varias) — simplemente devuelve la
// cantidad a la primera ubicación activa de la bodega, con su propio
// movimiento de ENTRADA trazable. Correcto para el saldo total del kardex.
export async function reintegrarStock(client, { producto_id, bodega_id, cantidad, costo_unitario, referencia, usuario_id, motivo, servicio_id = null }) {
  const ubic = await client.query(
    `SELECT id FROM inv_ubicaciones WHERE bodega_id = $1 AND activo = TRUE ORDER BY codigo LIMIT 1`,
    [bodega_id]
  )
  if (!ubic.rows.length) throw Object.assign(new Error('La bodega no tiene ubicaciones activas para recibir la reversión'), { httpCode: 409 })
  const ubicacionId = ubic.rows[0].id

  await client.query(
    `INSERT INTO inv_stock (producto_id, ubicacion_id, cantidad, ultima_actualizacion)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad = inv_stock.cantidad + $3, ultima_actualizacion = NOW()`,
    [producto_id, ubicacionId, cantidad]
  )
  const mov = await client.query(
    `INSERT INTO inv_movimientos (tipo, producto_id, ubicacion_destino_id, cantidad, costo_unitario, referencia, usuario_id, motivo, servicio_id)
     VALUES ('ENTRADA',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [producto_id, ubicacionId, cantidad, costo_unitario, referencia, usuario_id, motivo, servicio_id]
  )
  return { movimientoId: mov.rows[0].id }
}
