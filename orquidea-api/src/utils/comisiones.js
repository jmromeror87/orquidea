/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Asesores Comerciales                             ║
 * ║  Archivo         : comisiones.js                                    ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Genera el registro de comisión de una venta (póliza o contrato) si el
 * usuario que la vendió tiene rol asesor_comercial. Usa el % propio del
 * asesor si lo tiene configurado, o el % global por defecto.
 * Debe llamarse dentro de la misma transacción (db) que crea la venta.
 */
export async function generarComision(db, { usuarioId, origenTipo, origenId, valorBase }) {
  if (!valorBase || +valorBase <= 0) return null

  const { rows: userRows } = await db.query(
    'SELECT rol, porcentaje_comision FROM usuarios WHERE id = $1',
    [usuarioId]
  )
  const usuario = userRows[0]
  if (!usuario || usuario.rol !== 'asesor_comercial') return null

  let porcentaje = usuario.porcentaje_comision
  if (porcentaje === null || porcentaje === undefined) {
    const { rows: cfgRows } = await db.query('SELECT porcentaje_default FROM comision_config WHERE id = 1')
    porcentaje = cfgRows[0]?.porcentaje_default ?? 3
  }

  const valorComision = +(valorBase * (porcentaje / 100)).toFixed(2)

  const { rows } = await db.query(
    `INSERT INTO comisiones (usuario_id, origen_tipo, origen_id, valor_base, porcentaje, valor_comision)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (origen_tipo, origen_id) DO NOTHING
     RETURNING id`,
    [usuarioId, origenTipo, origenId, valorBase, porcentaje, valorComision]
  )
  return rows[0] || null
}
