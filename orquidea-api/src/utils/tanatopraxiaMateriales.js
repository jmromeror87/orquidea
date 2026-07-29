/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tanatopraxia — Materiales                        ║
 * ║  Archivo         : tanatopraxiaMateriales.js                       ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Agrega un material de preparación y descarga automáticamente del inventario
 * (movimiento CONSUMO en la ubicación con stock suficiente). Lanza error si
 * no hay stock disponible en ninguna ubicación.
 */
export async function agregarMaterial(db, { tanatopraxiaId, servicioId, productoId, cantidad, usuarioId }) {
  const { rows: stockRows } = await db.query(
    `SELECT ubicacion_id, cantidad, costo_unitario_promedio
     FROM inv_stock WHERE producto_id = $1 AND cantidad >= $2
     ORDER BY cantidad DESC LIMIT 1`,
    [productoId, cantidad]
  )
  if (!stockRows.length) {
    const err = new Error('Sin stock suficiente de este material en ninguna bodega')
    err.statusCode = 400
    throw err
  }
  const { ubicacion_id: ubicacionId, costo_unitario_promedio: costoUnitario } = stockRows[0]

  await db.query(
    `UPDATE inv_stock SET cantidad = cantidad - $1, ultima_actualizacion = NOW()
     WHERE producto_id = $2 AND ubicacion_id = $3`,
    [cantidad, productoId, ubicacionId]
  )

  const { rows: movRows } = await db.query(
    `INSERT INTO inv_movimientos
       (tipo, producto_id, ubicacion_origen_id, cantidad, costo_unitario, motivo, servicio_id, usuario_id)
     VALUES ('CONSUMO',$1,$2,$3,$4,'Material de tanatopraxia',$5,$6)
     RETURNING id`,
    [productoId, ubicacionId, cantidad, costoUnitario, servicioId, usuarioId]
  )

  const { rows } = await db.query(
    `INSERT INTO tanatopraxia_materiales
       (tanatopraxia_id, producto_id, cantidad, costo_unitario, movimiento_id, usuario_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [tanatopraxiaId, productoId, cantidad, costoUnitario, movRows[0].id, usuarioId]
  )
  return rows[0]
}

/**
 * Elimina un material registrado y repone la cantidad al inventario
 * (en la ubicación desde donde se descargó originalmente).
 */
export async function eliminarMaterial(db, { materialId }) {
  const { rows } = await db.query(
    `SELECT tm.*, m.ubicacion_origen_id
     FROM tanatopraxia_materiales tm
     LEFT JOIN inv_movimientos m ON m.id = tm.movimiento_id
     WHERE tm.id = $1`,
    [materialId]
  )
  const material = rows[0]
  if (!material) {
    const err = new Error('Material no encontrado')
    err.statusCode = 404
    throw err
  }

  if (material.ubicacion_origen_id) {
    await db.query(
      `UPDATE inv_stock SET cantidad = cantidad + $1, ultima_actualizacion = NOW()
       WHERE producto_id = $2 AND ubicacion_id = $3`,
      [material.cantidad, material.producto_id, material.ubicacion_origen_id]
    )
  }

  await db.query('DELETE FROM tanatopraxia_materiales WHERE id = $1', [materialId])
  return material
}
