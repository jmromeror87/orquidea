/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Multisede — helper de alcance                       ║
 * ║  Archivo         : sede.js                                         ║
 * ║  Versión         : v2.0.0 — soporta usuarios con varias sedes      ║
 * ║  Fecha           : 2026-07-25                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const ROLES_MULTISEDE = ['superadmin', 'administrador']

/**
 * Resuelve el alcance de sede para la petición actual.
 *
 * - superadmin/administrador: ven TODO por defecto (sedeIds=null), o pueden
 *   filtrar a una sede puntual con ?sede_id=
 * - cualquier otro rol: queda SIEMPRE limitado a las sedes que tiene
 *   asignadas (req.user.sedes, un arreglo — puede ser 1 o varias). Si manda
 *   ?sede_id= y esa sede está entre las suyas, se aísla a esa una; si no,
 *   ve el conjunto completo de sus sedes asignadas. Nunca puede ver una
 *   sede que no le pertenezca, sin importar lo que mande en la petición.
 *
 * @returns { sedeIds: string[]|null, forzado: boolean }
 *   sedeIds=null → sin filtro, ver todas las sedes (solo posible para admins)
 *   sedeIds=[]   → el usuario no tiene ninguna sede asignada (no ve nada)
 */
export function resolverSede(req) {
  const esAdmin = ROLES_MULTISEDE.includes(req.user?.rol)
  const sedeQuery = req.query?.sede_id || req.body?.sede_id

  if (esAdmin) {
    return { sedeIds: sedeQuery ? [sedeQuery] : null, forzado: false }
  }

  const misSedes = req.user?.sedes?.length ? req.user.sedes
    : (req.user?.sede_id ? [req.user.sede_id] : [])

  if (sedeQuery && misSedes.includes(sedeQuery)) {
    return { sedeIds: [sedeQuery], forzado: true }
  }
  return { sedeIds: misSedes, forzado: true }
}

/**
 * Sede a asignar cuando se CREA un registro nuevo:
 * - admin: la que mande en el body, o su propia sede principal, o null.
 * - usuario de una sola sede: siempre esa (ignora lo que mande el body).
 * - usuario de varias sedes: debe elegir una válida en el body; si no manda
 *   nada (o manda una que no es suya), cae a la primera de su lista.
 */
export function sedeParaCrear(req) {
  const esAdmin = ROLES_MULTISEDE.includes(req.user?.rol)
  if (esAdmin) return req.body?.sede_id || req.user?.sede_id || null

  const misSedes = req.user?.sedes?.length ? req.user.sedes
    : (req.user?.sede_id ? [req.user.sede_id] : [])
  if (misSedes.length <= 1) return misSedes[0] || null

  const elegida = req.body?.sede_id
  return (elegida && misSedes.includes(elegida)) ? elegida : misSedes[0]
}

/**
 * Compras/Inventario no tienen columna sede_id propia — heredan la sede a
 * través de la bodega (inv_bodegas.sede_id). Este helper valida que una
 * bodega esté dentro del alcance resuelto por resolverSede()/sedeParaCrear(),
 * para bloquear en el servidor cualquier intento de operar sobre una bodega
 * de una sede a la que el usuario no tiene acceso.
 *
 * @returns true si la bodega es válida y está dentro del alcance.
 */
export async function bodegaPermitida(pool, bodegaId, sedeIds) {
  if (!bodegaId) return false
  if (sedeIds === null) return true // admin sin filtro: ve todas las bodegas
  const { rows } = await pool.query('SELECT sede_id FROM inv_bodegas WHERE id = $1', [bodegaId])
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que bodegaPermitida() pero para zonas de recaudo. */
export async function zonaPermitida(pool, zonaId, sedeIds) {
  if (!zonaId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query('SELECT sede_id FROM zonas_recaudo WHERE id = $1', [zonaId])
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que bodegaPermitida() pero valida una RUTA a través de su zona. */
export async function rutaPermitida(pool, rutaId, sedeIds) {
  if (!rutaId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query(
    `SELECT z.sede_id FROM rutas_recaudo r JOIN zonas_recaudo z ON z.id = r.zona_id WHERE r.id = $1`,
    [rutaId]
  )
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que bodegaPermitida() pero para terceros (personas/clientes). */
export async function terceroPermitido(pool, terceroId, sedeIds) {
  if (!terceroId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query('SELECT sede_id FROM terceros WHERE id = $1', [terceroId])
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que bodegaPermitida() pero para convenios (EPS/alcaldía/empresa). */
export async function convenioPermitido(pool, convenioId, sedeIds) {
  if (!convenioId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query('SELECT sede_id FROM convenios WHERE id = $1', [convenioId])
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que convenioPermitido() pero valida una AUTORIZACIÓN a través de su convenio. */
export async function autorizacionConvenioPermitida(pool, autorizacionId, sedeIds) {
  if (!autorizacionId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query(
    `SELECT c.sede_id FROM convenio_autorizaciones ca JOIN convenios c ON c.id = ca.convenio_id WHERE ca.id = $1`,
    [autorizacionId]
  )
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que rutaPermitida() pero valida una ORDEN de recaudo a través de su ruta/zona. */
export async function ordenRecaudoPermitida(pool, ordenId, sedeIds) {
  if (!ordenId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query(
    `SELECT z.sede_id FROM ordenes_recaudo o
     JOIN rutas_recaudo r ON r.id = o.ruta_id
     JOIN zonas_recaudo z ON z.id = r.zona_id
     WHERE o.id = $1`,
    [ordenId]
  )
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que bodegaPermitida() pero para pólizas. */
export async function polizaPermitida(pool, polizaId, sedeIds) {
  if (!polizaId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query('SELECT sede_id FROM polizas WHERE id = $1', [polizaId])
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}

/** Igual que bodegaPermitida() pero para contratos. */
export async function contratoPermitido(pool, contratoId, sedeIds) {
  if (!contratoId) return false
  if (sedeIds === null) return true
  const { rows } = await pool.query('SELECT sede_id FROM contratos WHERE id = $1', [contratoId])
  if (!rows.length) return false
  return sedeIds.includes(rows[0].sede_id)
}
