/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Compras — Auditoría                              ║
 * ║  Archivo         : comprasAuditoria.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import poolPorDefecto from '../config/database.js'

/**
 * Registra un evento de trazabilidad del módulo de Compras.
 * Acepta el pool global o un cliente de transacción (db) para que el
 * registro quede atado a la misma transacción que la operación auditada.
 */
export async function auditarCompra(db, { modulo, entidadId, usuarioId, accion, metadatos }) {
  const conexion = db || poolPorDefecto
  await conexion.query(
    `INSERT INTO cmp_auditoria (modulo, entidad_id, usuario_id, accion, metadatos)
     VALUES ($1,$2,$3,$4,$5)`,
    [modulo, entidadId, usuarioId || null, accion, metadatos ? JSON.stringify(metadatos) : null]
  )
}

export async function obtenerAuditoria(db, { modulo, entidadId }) {
  const conexion = db || poolPorDefecto
  const { rows } = await conexion.query(
    `SELECT a.*, u.nombre AS usuario_nombre
     FROM cmp_auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.modulo = $1 AND a.entidad_id = $2
     ORDER BY a.creado_en ASC`,
    [modulo, entidadId]
  )
  return rows
}
