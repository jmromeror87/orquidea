/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Convenios                                       ║
 * ║  Archivo         : convenios.controller.js                         ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, sedeParaCrear, convenioPermitido, autorizacionConvenioPermitida } from '../utils/sede.js'

const TIPOS_VALIDOS = ['EPS','ASEGURADORA','ALCALDIA','EMPRESA','CAJA_COMPENSACION','OTRO']
const COBERTURA_VALIDA = ['PORCENTAJE','MONTO_FIJO']
const ABSORBE_VALIDA = ['FAMILIA','FUNERARIA']

// ── Listar convenios ──────────────────────────────────────────────────────
export async function listar(req, reply) {
  const { q = '', activo = '' } = req.query
  const { sedeIds } = resolverSede(req)
  const conds = ['1=1']
  const vals = []
  let i = 1

  if (q) { conds.push(`(c.nombre ILIKE $${i} OR c.nit ILIKE $${i})`); vals.push(`%${q}%`); i++ }
  if (activo === '1' || activo === '0') { conds.push(`c.activo = $${i}`); vals.push(activo === '1'); i++ }
  conds.push(`($${i}::uuid[] IS NULL OR c.sede_id = ANY($${i}::uuid[]))`); vals.push(sedeIds); i++

  const r = await pool.query(`
    SELECT c.*, s.nombre AS sede_nombre,
      (SELECT COUNT(*) FROM convenio_autorizaciones ca WHERE ca.convenio_id=c.id AND ca.activo) AS total_autorizaciones,
      (SELECT COUNT(*) FROM servicios_funerarios sf WHERE sf.convenio_id=c.id) AS total_servicios
    FROM convenios c
    LEFT JOIN sedes s ON s.id = c.sede_id
    WHERE ${conds.join(' AND ')}
    ORDER BY c.nombre`, vals
  )
  return reply.send({ data: r.rows })
}

// ── Obtener uno con sus tipos de autorización ─────────────────────────────
export async function obtener(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }
  const [cRes, aRes] = await Promise.all([
    pool.query(`SELECT c.*, s.nombre AS sede_nombre FROM convenios c LEFT JOIN sedes s ON s.id = c.sede_id WHERE c.id=$1`, [id]),
    pool.query(`SELECT * FROM convenio_autorizaciones WHERE convenio_id=$1 ORDER BY orden, nombre`, [id]),
  ])
  if (!cRes.rows.length) return reply.code(404).send({ error: 'Convenio no encontrado' })
  return reply.send({ data: { ...cRes.rows[0], autorizaciones: aRes.rows } })
}

// ── Crear ─────────────────────────────────────────────────────────────────
export async function crear(req, reply) {
  const {
    nombre, tipo_entidad = 'OTRO', nit, contacto_nombre, contacto_telefono, contacto_email,
    cobertura_tipo = 'PORCENTAJE', cobertura_valor = 100, tope_maximo,
    absorbe_resto = 'FAMILIA', observaciones,
  } = req.body

  if (!nombre) return reply.code(400).send({ error: 'nombre es obligatorio' })
  if (!TIPOS_VALIDOS.includes(tipo_entidad)) return reply.code(400).send({ error: 'tipo_entidad inválido' })
  if (!COBERTURA_VALIDA.includes(cobertura_tipo)) return reply.code(400).send({ error: 'cobertura_tipo inválido' })
  if (!ABSORBE_VALIDA.includes(absorbe_resto)) return reply.code(400).send({ error: 'absorbe_resto inválido' })
  if (cobertura_tipo === 'PORCENTAJE' && (+cobertura_valor < 0 || +cobertura_valor > 100))
    return reply.code(400).send({ error: 'cobertura_valor debe estar entre 0 y 100 cuando es PORCENTAJE' })
  if (tope_maximo != null && +tope_maximo < 0)
    return reply.code(400).send({ error: 'tope_maximo no puede ser negativo' })

  const sede_id = sedeParaCrear(req)

  const r = await pool.query(`
    INSERT INTO convenios (nombre, tipo_entidad, nit, contacto_nombre, contacto_telefono, contacto_email,
      cobertura_tipo, cobertura_valor, tope_maximo, absorbe_resto, observaciones, usuario_id, sede_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [nombre, tipo_entidad, nit||null, contacto_nombre||null, contacto_telefono||null, contacto_email||null,
     cobertura_tipo, +cobertura_valor, tope_maximo != null ? +tope_maximo : null, absorbe_resto, observaciones||null, req.user.id, sede_id]
  )
  return reply.code(201).send({ data: r.rows[0] })
}

// ── Actualizar ────────────────────────────────────────────────────────────
export async function actualizar(req, reply) {
  const { id } = req.params
  const {
    nombre, tipo_entidad, nit, contacto_nombre, contacto_telefono, contacto_email,
    cobertura_tipo, cobertura_valor, tope_maximo, absorbe_resto, activo, observaciones, sede_id,
  } = req.body

  // Solo superadmin/administrador pueden reasignar la sede de un convenio existente
  const esAdmin = ['superadmin', 'administrador'].includes(req.user?.rol)
  const nuevaSede = (esAdmin && sede_id) ? sede_id : null

  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }

  if (tipo_entidad && !TIPOS_VALIDOS.includes(tipo_entidad))
    return reply.code(400).send({ error: 'tipo_entidad inválido' })
  if (cobertura_tipo && !COBERTURA_VALIDA.includes(cobertura_tipo))
    return reply.code(400).send({ error: 'cobertura_tipo inválido' })
  if (absorbe_resto && !ABSORBE_VALIDA.includes(absorbe_resto))
    return reply.code(400).send({ error: 'absorbe_resto inválido' })

  // "" (limpiar tope) debe distinguirse de "no enviado" (no tocar)
  const topeProvisto = Object.prototype.hasOwnProperty.call(req.body, 'tope_maximo')
  const topeValor = tope_maximo === '' || tope_maximo == null ? null : +tope_maximo

  const r = await pool.query(`
    UPDATE convenios SET
      nombre            = COALESCE($1, nombre),
      tipo_entidad      = COALESCE($2, tipo_entidad),
      nit               = COALESCE($3, nit),
      contacto_nombre   = COALESCE($4, contacto_nombre),
      contacto_telefono = COALESCE($5, contacto_telefono),
      contacto_email    = COALESCE($6, contacto_email),
      cobertura_tipo    = COALESCE($7, cobertura_tipo),
      cobertura_valor   = COALESCE($8, cobertura_valor),
      tope_maximo       = CASE WHEN $12 THEN $9 ELSE tope_maximo END,
      activo            = COALESCE($10, activo),
      observaciones     = COALESCE($11, observaciones),
      absorbe_resto     = COALESCE($14, absorbe_resto),
      sede_id           = COALESCE($15, sede_id),
      actualizado       = NOW()
    WHERE id = $13
    RETURNING *`,
    [
      nombre||null, tipo_entidad||null, nit||null, contacto_nombre||null, contacto_telefono||null,
      contacto_email||null, cobertura_tipo||null, cobertura_valor!=null ? +cobertura_valor : null,
      topeValor, activo!=null ? Boolean(activo) : null, observaciones||null, topeProvisto, id,
      absorbe_resto||null, nuevaSede,
    ]
  )
  if (!r.rows.length) return reply.code(404).send({ error: 'Convenio no encontrado' })
  return reply.send({ data: r.rows[0] })
}

// ── Activar/desactivar ─────────────────────────────────────────────────────
export async function toggleActivo(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }
  const r = await pool.query(
    `UPDATE convenios SET activo = NOT activo, actualizado=NOW() WHERE id=$1 RETURNING id, activo`, [id]
  )
  if (!r.rows.length) return reply.code(404).send({ error: 'Convenio no encontrado' })
  return reply.send({ data: r.rows[0] })
}

// ── Autorizaciones (tipos configurables por convenio) ─────────────────────

export async function agregarAutorizacion(req, reply) {
  const { id } = req.params
  const { nombre, cobertura_tipo = 'PORCENTAJE', cobertura_valor = 100, tope_maximo, absorbe_resto, orden = 0 } = req.body

  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }

  if (!nombre) return reply.code(400).send({ error: 'nombre es obligatorio' })
  if (!COBERTURA_VALIDA.includes(cobertura_tipo)) return reply.code(400).send({ error: 'cobertura_tipo inválido' })
  if (absorbe_resto && !ABSORBE_VALIDA.includes(absorbe_resto))
    return reply.code(400).send({ error: 'absorbe_resto inválido' })
  if (cobertura_tipo === 'PORCENTAJE' && (+cobertura_valor < 0 || +cobertura_valor > 100))
    return reply.code(400).send({ error: 'cobertura_valor debe estar entre 0 y 100 cuando es PORCENTAJE' })
  if (tope_maximo != null && tope_maximo !== '' && +tope_maximo < 0)
    return reply.code(400).send({ error: 'tope_maximo no puede ser negativo' })

  const conv = await pool.query(`SELECT id FROM convenios WHERE id=$1`, [id])
  if (!conv.rows.length) return reply.code(404).send({ error: 'Convenio no encontrado' })

  const r = await pool.query(`
    INSERT INTO convenio_autorizaciones (convenio_id, nombre, cobertura_tipo, cobertura_valor, tope_maximo, absorbe_resto, orden)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id, nombre, cobertura_tipo, +cobertura_valor, (tope_maximo!=null && tope_maximo!=='') ? +tope_maximo : null,
     absorbe_resto || null, +orden]
  )
  return reply.code(201).send({ data: r.rows[0] })
}

export async function actualizarAutorizacion(req, reply) {
  const { autId } = req.params
  const { nombre, cobertura_tipo, cobertura_valor, tope_maximo, absorbe_resto, orden, activo } = req.body

  const { sedeIds } = resolverSede(req)
  if (!(await autorizacionConvenioPermitida(pool, autId, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta autorización' })
  }

  if (cobertura_tipo && !COBERTURA_VALIDA.includes(cobertura_tipo))
    return reply.code(400).send({ error: 'cobertura_tipo inválido' })
  if (absorbe_resto && !ABSORBE_VALIDA.includes(absorbe_resto) && absorbe_resto !== '')
    return reply.code(400).send({ error: 'absorbe_resto inválido' })

  const topeProvisto = Object.prototype.hasOwnProperty.call(req.body, 'tope_maximo')
  const topeValor = tope_maximo === '' || tope_maximo == null ? null : +tope_maximo
  const absorbeProvisto = Object.prototype.hasOwnProperty.call(req.body, 'absorbe_resto')
  const absorbeValor = absorbe_resto === '' || absorbe_resto == null ? null : absorbe_resto

  const r = await pool.query(`
    UPDATE convenio_autorizaciones SET
      nombre          = COALESCE($1, nombre),
      cobertura_tipo  = COALESCE($2, cobertura_tipo),
      cobertura_valor = COALESCE($3, cobertura_valor),
      tope_maximo     = CASE WHEN $7 THEN $4 ELSE tope_maximo END,
      orden           = COALESCE($5, orden),
      activo          = COALESCE($6, activo),
      absorbe_resto   = CASE WHEN $9 THEN $10 ELSE absorbe_resto END
    WHERE id = $8
    RETURNING *`,
    [nombre||null, cobertura_tipo||null, cobertura_valor!=null ? +cobertura_valor : null,
     topeValor, orden!=null ? +orden : null, activo!=null ? Boolean(activo) : null, topeProvisto, autId,
     absorbeProvisto, absorbeValor]
  )
  if (!r.rows.length) return reply.code(404).send({ error: 'Autorización no encontrada' })
  return reply.send({ data: r.rows[0] })
}

export async function eliminarAutorizacion(req, reply) {
  const { autId } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await autorizacionConvenioPermitida(pool, autId, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta autorización' })
  }
  const enUso = await pool.query(
    `SELECT COUNT(*) FROM servicios_funerarios WHERE convenio_autorizacion_id=$1`, [autId]
  )
  if (+enUso.rows[0].count > 0) {
    // No se borra si ya hay servicios vinculados: solo se desactiva (preserva historial)
    const r = await pool.query(
      `UPDATE convenio_autorizaciones SET activo=FALSE WHERE id=$1 RETURNING id`, [autId]
    )
    if (!r.rows.length) return reply.code(404).send({ error: 'Autorización no encontrada' })
    return reply.send({ ok: true, desactivada: true })
  }
  const r = await pool.query(`DELETE FROM convenio_autorizaciones WHERE id=$1 RETURNING id`, [autId])
  if (!r.rows.length) return reply.code(404).send({ error: 'Autorización no encontrada' })
  return reply.send({ ok: true, desactivada: false })
}

// ── Calcular cobertura sugerida para un valor de servicio ─────────────────
// GET /convenios/:id/calcular?autorizacion_id=&valor_servicio=
// Núcleo de cálculo — reutilizado también por servicios.controller.js para
// recalcular en el servidor y así nunca confiar en el valor que mande el
// frontend (evita manipulación del monto cubierto por el convenio).
export async function computeCobertura(db, { convenioId, autorizacionId, valorServicio }) {
  let cobertura_tipo, cobertura_valor, tope_maximo, absorbeResto, convenioTope = null

  const convRes = await db.query(`SELECT cobertura_tipo, cobertura_valor, tope_maximo, absorbe_resto FROM convenios WHERE id=$1`, [convenioId])
  if (!convRes.rows.length) return null
  cobertura_tipo = convRes.rows[0].cobertura_tipo
  cobertura_valor = convRes.rows[0].cobertura_valor
  convenioTope = convRes.rows[0].tope_maximo
  absorbeResto = convRes.rows[0].absorbe_resto || 'FAMILIA'

  tope_maximo = convenioTope

  if (autorizacionId) {
    const autRes = await db.query(
      `SELECT cobertura_tipo, cobertura_valor, tope_maximo, absorbe_resto FROM convenio_autorizaciones WHERE id=$1 AND convenio_id=$2 AND activo`,
      [autorizacionId, convenioId]
    )
    if (!autRes.rows.length) return null
    cobertura_tipo  = autRes.rows[0].cobertura_tipo
    cobertura_valor = autRes.rows[0].cobertura_valor
    // El tope y el "quién absorbe el resto" de la autorización mandan si están definidos; si no, heredan del convenio
    tope_maximo = autRes.rows[0].tope_maximo != null ? autRes.rows[0].tope_maximo : convenioTope
    absorbeResto = autRes.rows[0].absorbe_resto || absorbeResto
  }

  const vServicio = +valorServicio || 0
  let valorCubierto = cobertura_tipo === 'PORCENTAJE'
    ? Math.round(vServicio * (+cobertura_valor / 100))
    : Math.min(+cobertura_valor, vServicio)

  let topeAplicado = false
  if (tope_maximo != null && valorCubierto > +tope_maximo) {
    valorCubierto = +tope_maximo
    topeAplicado = true
  }

  const resto = Math.max(0, vServicio - valorCubierto)

  // Valor máximo del servicio que el convenio alcanza a cubrir sin que el tope
  // empiece a "recortar" — solo tiene sentido para cobertura por porcentaje.
  const valorServicioMaximo = (tope_maximo != null && cobertura_tipo === 'PORCENTAJE' && +cobertura_valor > 0)
    ? Math.floor(+tope_maximo / (+cobertura_valor / 100))
    : null

  return {
    cobertura_tipo, cobertura_valor: +cobertura_valor,
    tope_maximo: tope_maximo != null ? +tope_maximo : null,
    tope_aplicado: topeAplicado,
    valor_servicio_maximo: valorServicioMaximo,
    valor_servicio: vServicio,
    valor_cubierto: valorCubierto,
    absorbe_resto: absorbeResto,
    // Compatibilidad: valor_a_cargo_familia solo es > 0 cuando el resto lo asume la familia
    valor_a_cargo_familia: absorbeResto === 'FUNERARIA' ? 0 : resto,
    valor_absorbido_funeraria: absorbeResto === 'FUNERARIA' ? resto : 0,
  }
}

export async function calcularCobertura(req, reply) {
  const { id } = req.params
  const { autorizacion_id, valor_servicio } = req.query

  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }

  const resultado = await computeCobertura(pool, {
    convenioId: id, autorizacionId: autorizacion_id || null, valorServicio: valor_servicio,
  })
  if (!resultado) return reply.code(404).send({ error: 'Convenio o autorización no encontrada' })
  return reply.send({ data: resultado })
}

// ── Ítems permitidos (catálogo restringido por convenio) ──────────────────
// Si un convenio no tiene ningún ítem configurado aquí, se considera SIN
// restricción (se puede prestar cualquier servicio del catálogo).

export async function listarItemsPermitidos(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }
  const r = await pool.query(`
    SELECT ci.id, ci.catalogo_id, sc.nombre, sc.categoria, sc.precio_base
    FROM convenio_items ci
    JOIN servicios_catalogo sc ON sc.id = ci.catalogo_id
    WHERE ci.convenio_id = $1
    ORDER BY sc.categoria, sc.nombre`, [id]
  )
  return reply.send({ data: r.rows })
}

export async function agregarItemPermitido(req, reply) {
  const { id } = req.params
  const { catalogo_id } = req.body
  if (!catalogo_id) return reply.code(400).send({ error: 'catalogo_id es obligatorio' })

  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }

  const conv = await pool.query(`SELECT id FROM convenios WHERE id=$1`, [id])
  if (!conv.rows.length) return reply.code(404).send({ error: 'Convenio no encontrado' })

  try {
    const r = await pool.query(`
      INSERT INTO convenio_items (convenio_id, catalogo_id) VALUES ($1,$2) RETURNING id`,
      [id, catalogo_id]
    )
    return reply.code(201).send({ data: r.rows[0] })
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ error: 'Ese ítem ya está en la lista permitida' })
    throw e
  }
}

export async function eliminarItemPermitido(req, reply) {
  const { itemId } = req.params
  const { sedeIds } = resolverSede(req)

  if (sedeIds !== null) {
    const chk = await pool.query(
      `SELECT c.sede_id FROM convenio_items ci JOIN convenios c ON c.id = ci.convenio_id WHERE ci.id = $1`,
      [itemId]
    )
    if (!chk.rows.length || !sedeIds.includes(chk.rows[0].sede_id)) {
      return reply.code(403).send({ error: 'No tiene acceso a este ítem' })
    }
  }

  const r = await pool.query(`DELETE FROM convenio_items WHERE id=$1 RETURNING id`, [itemId])
  if (!r.rows.length) return reply.code(404).send({ error: 'Ítem no encontrado' })
  return reply.send({ ok: true })
}

// ── Paquetes vinculados (ej: "Servicio Inicial", "Servicio Final") ─────────

export async function listarPaquetesVinculados(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }
  const r = await pool.query(`
    SELECT cp.id, cp.paquete_id, p.nombre, p.precio_base
    FROM convenio_paquetes cp
    JOIN paquetes_servicio p ON p.id = cp.paquete_id
    WHERE cp.convenio_id = $1
    ORDER BY p.nombre`, [id]
  )
  return reply.send({ data: r.rows })
}

export async function agregarPaqueteVinculado(req, reply) {
  const { id } = req.params
  const { paquete_id } = req.body
  if (!paquete_id) return reply.code(400).send({ error: 'paquete_id es obligatorio' })

  const { sedeIds } = resolverSede(req)
  if (!(await convenioPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
  }

  const conv = await pool.query(`SELECT id FROM convenios WHERE id=$1`, [id])
  if (!conv.rows.length) return reply.code(404).send({ error: 'Convenio no encontrado' })

  try {
    const r = await pool.query(`
      INSERT INTO convenio_paquetes (convenio_id, paquete_id) VALUES ($1,$2) RETURNING id`,
      [id, paquete_id]
    )
    return reply.code(201).send({ data: r.rows[0] })
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ error: 'Ese paquete ya está vinculado a este convenio' })
    throw e
  }
}

export async function eliminarPaqueteVinculado(req, reply) {
  const { vinculoId } = req.params
  const { sedeIds } = resolverSede(req)

  if (sedeIds !== null) {
    const chk = await pool.query(
      `SELECT c.sede_id FROM convenio_paquetes cp JOIN convenios c ON c.id = cp.convenio_id WHERE cp.id = $1`,
      [vinculoId]
    )
    if (!chk.rows.length || !sedeIds.includes(chk.rows[0].sede_id)) {
      return reply.code(403).send({ error: 'No tiene acceso a este vínculo' })
    }
  }

  const r = await pool.query(`DELETE FROM convenio_paquetes WHERE id=$1 RETURNING id`, [vinculoId])
  if (!r.rows.length) return reply.code(404).send({ error: 'Vínculo no encontrado' })
  return reply.send({ ok: true })
}
