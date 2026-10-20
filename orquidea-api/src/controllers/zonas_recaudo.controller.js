/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Territorio — Recaudo                                ║
 * ║  Archivo         : zonas_recaudo.controller.js                         ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-03                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, sedeParaCrear, zonaPermitida, rutaPermitida } from '../utils/sede.js'

// GET /api/zonas-recaudo
export async function listarZonas(req, reply) {
  const { sedeIds } = resolverSede(req)
  const r = await pool.query(`
    SELECT z.*, s.nombre AS sede_nombre,
      COUNT(DISTINCT rr.id) AS total_rutas,
      COUNT(DISTINCT pr.poliza_id) AS total_polizas,
      (SELECT COUNT(*) FROM terceros t WHERE t.zona_recaudo_id = z.id)::int AS total_titulares
    FROM zonas_recaudo z
    LEFT JOIN sedes s ON s.id = z.sede_id
    LEFT JOIN rutas_recaudo rr ON rr.zona_id = z.id AND rr.activa
    LEFT JOIN poliza_ruta pr ON pr.ruta_id = rr.id AND pr.activa
    -- Las eliminadas que tenían historial quedan archivadas (activa = FALSE)
    WHERE z.activa AND ($1::uuid[] IS NULL OR z.sede_id = ANY($1::uuid[]))
    GROUP BY z.id, s.nombre ORDER BY z.nombre
  `, [sedeIds])
  return reply.send({ data: r.rows })
}

// POST /api/zonas-recaudo
export async function crearZona(req, reply) {
  const { nombre, descripcion, tipo = 'URBANA', color = '#6366F1' } = req.body
  if (!nombre) return reply.code(400).send({ error: 'Nombre requerido' })
  const sede_id = sedeParaCrear(req)
  const r = await pool.query(
    `INSERT INTO zonas_recaudo (nombre, descripcion, tipo, color, sede_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [nombre, descripcion, tipo, color, sede_id]
  )
  return reply.code(201).send({ data: r.rows[0] })
}

// PUT /api/zonas-recaudo/:id
export async function actualizarZona(req, reply) {
  const { id } = req.params
  const { nombre, descripcion, tipo, color, activa, sede_id } = req.body
  const { sedeIds } = resolverSede(req)
  if (!(await zonaPermitida(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta zona' })
  }
  // Solo superadmin/administrador pueden reasignar la sede de una zona existente
  const esAdmin = ['superadmin', 'administrador'].includes(req.user?.rol)
  const nuevaSede = (esAdmin && sede_id) ? sede_id : null
  const r = await pool.query(
    `UPDATE zonas_recaudo SET nombre=$1, descripcion=$2, tipo=$3, color=$4, activa=$5, sede_id=COALESCE($7, sede_id) WHERE id=$6 RETURNING *`,
    [nombre, descripcion, tipo, color, activa, id, nuevaSede]
  )
  return reply.send({ data: r.rows[0] })
}

// DELETE /api/zonas-recaudo/:id
export async function eliminarZona(req, reply) {
  const { sedeIds } = resolverSede(req)
  if (!(await zonaPermitida(pool, req.params.id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta zona' })
  }
  const id = req.params.id
  // No se elimina si hay cobro en marcha: pólizas asignadas o citas pendientes
  const uso = (await pool.query(`
    SELECT
      (SELECT COUNT(DISTINCT pr.poliza_id) FROM poliza_ruta pr JOIN rutas_recaudo rr ON rr.id = pr.ruta_id
        WHERE rr.zona_id = $1 AND rr.activa AND pr.activa)::int AS polizas,
      (SELECT COUNT(*) FROM recaudo_agenda a JOIN rutas_recaudo rr ON rr.id = a.ruta_id
        WHERE rr.zona_id = $1 AND a.estado = 'PENDIENTE')::int AS citas`, [id])).rows[0]
  if (uso.polizas) return reply.code(409).send({ error: `La zona tiene ${uso.polizas} póliza${uso.polizas > 1 ? 's' : ''} asignada${uso.polizas > 1 ? 's' : ''} en sus rutas. Retírelas o páselas a otra ruta antes de eliminarla.` })
  if (uso.citas) return reply.code(409).send({ error: `La zona tiene ${uso.citas} cita${uso.citas > 1 ? 's' : ''} de cobro pendiente${uso.citas > 1 ? 's' : ''}. Atiéndalas o cancélelas en Recaudo → Calendario.` })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Rutas: las que nunca se usaron se borran; las que tienen órdenes de cobro
    // (historial de visitas y recibos) se archivan para no perderlo
    const rutas = (await client.query(`
      SELECT rr.id, EXISTS (SELECT 1 FROM ordenes_recaudo o WHERE o.ruta_id = rr.id)
                 OR EXISTS (SELECT 1 FROM recaudo_agenda a WHERE a.ruta_id = rr.id) AS con_historial
      FROM rutas_recaudo rr WHERE rr.zona_id = $1`, [id])).rows
    for (const r of rutas) {
      if (r.con_historial) await client.query(`UPDATE rutas_recaudo SET activa = FALSE WHERE id = $1`, [r.id])
      else await client.query(`DELETE FROM rutas_recaudo WHERE id = $1`, [r.id])
    }
    const archivar = rutas.some(r => r.con_historial)
      || (await client.query(`SELECT 1 FROM terceros WHERE zona_recaudo_id = $1 LIMIT 1`, [id])).rows.length > 0
    if (archivar) await client.query(`UPDATE zonas_recaudo SET activa = FALSE WHERE id = $1`, [id])
    else await client.query(`DELETE FROM zonas_recaudo WHERE id = $1`, [id])
    await client.query('COMMIT')
    return reply.send({ ok: true, archivada: archivar })
  } catch (e) { await client.query('ROLLBACK'); throw e } finally { client.release() }
}

// DELETE /api/zonas-recaudo/rutas/:id
export async function eliminarRuta(req, reply) {
  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, req.params.id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }
  const id = req.params.id
  const uso = (await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM poliza_ruta WHERE ruta_id = $1 AND activa)::int AS polizas,
      (SELECT COUNT(*) FROM recaudo_agenda WHERE ruta_id = $1 AND estado = 'PENDIENTE')::int AS citas,
      EXISTS (SELECT 1 FROM ordenes_recaudo WHERE ruta_id = $1) OR EXISTS (SELECT 1 FROM recaudo_agenda WHERE ruta_id = $1) AS con_historial`, [id])).rows[0]
  if (uso.polizas) return reply.code(409).send({ error: `La ruta tiene ${uso.polizas} póliza${uso.polizas > 1 ? 's' : ''} asignada${uso.polizas > 1 ? 's' : ''}. Retírelas o páselas a otra ruta antes de eliminarla.` })
  if (uso.citas) return reply.code(409).send({ error: `La ruta tiene ${uso.citas} cita${uso.citas > 1 ? 's' : ''} de cobro pendiente${uso.citas > 1 ? 's' : ''}. Atiéndalas o cancélelas en Recaudo → Calendario.` })
  // Con historial de cobros se archiva (borrarla eliminaría en cascada órdenes,
  // visitas y recibos); sin historial se borra del todo
  if (uso.con_historial) await pool.query(`UPDATE rutas_recaudo SET activa = FALSE WHERE id = $1`, [id])
  else await pool.query(`DELETE FROM rutas_recaudo WHERE id = $1`, [id])
  return reply.send({ ok: true, archivada: uso.con_historial })
}

// GET /api/zonas-recaudo/:zona_id/rutas
export async function listarRutas(req, reply) {
  const { sedeIds } = resolverSede(req)
  if (!(await zonaPermitida(pool, req.params.zona_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta zona' })
  }
  const r = await pool.query(`
    SELECT rr.*,
      u.nombre AS recaudador_nombre,
      COUNT(pr.poliza_id) AS total_polizas
    FROM rutas_recaudo rr
    LEFT JOIN usuarios u ON u.id = rr.recaudador_id
    LEFT JOIN poliza_ruta pr ON pr.ruta_id = rr.id AND pr.activa
    WHERE rr.zona_id = $1 AND rr.activa
    GROUP BY rr.id, u.nombre ORDER BY rr.nombre
  `, [req.params.zona_id])
  return reply.send({ data: r.rows })
}

// POST /api/zonas-recaudo/:zona_id/rutas
export async function crearRuta(req, reply) {
  const { nombre, descripcion, dias_mes = [], recaudador_id } = req.body
  const { sedeIds } = resolverSede(req)
  if (!(await zonaPermitida(pool, req.params.zona_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta zona' })
  }
  const r = await pool.query(
    `INSERT INTO rutas_recaudo (zona_id, nombre, descripcion, dias_mes, recaudador_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.zona_id, nombre, descripcion, dias_mes, recaudador_id || null]
  )
  return reply.code(201).send({ data: r.rows[0] })
}

// PUT /api/zonas-recaudo/rutas/:id
export async function actualizarRuta(req, reply) {
  const { nombre, descripcion, dias_mes, recaudador_id, activa } = req.body
  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, req.params.id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }
  const r = await pool.query(
    `UPDATE rutas_recaudo SET nombre=$1, descripcion=$2, dias_mes=$3, recaudador_id=$4, activa=$5 WHERE id=$6 RETURNING *`,
    [nombre, descripcion, dias_mes, recaudador_id || null, activa, req.params.id]
  )
  return reply.send({ data: r.rows[0] })
}

// GET /api/zonas-recaudo/rutas/:id/polizas
export async function polizasDeRuta(req, reply) {
  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, req.params.id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }
  const r = await pool.query(`
    SELECT p.id, p.numero, p.estado, p.valor_cuota, p.meses_mora,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre,
      t.numero_documento AS titular_doc
    FROM poliza_ruta pr
    JOIN polizas p ON p.id = pr.poliza_id
    JOIN terceros t ON t.id = p.titular_id
    WHERE pr.ruta_id = $1 AND pr.activa
    ORDER BY t.apellidos, t.nombres
  `, [req.params.id])
  return reply.send({ data: r.rows })
}

// POST /api/zonas-recaudo/rutas/:id/polizas — asignar póliza a ruta
export async function asignarPoliza(req, reply) {
  const { poliza_id } = req.body
  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, req.params.id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }
  await pool.query(
    `INSERT INTO poliza_ruta (poliza_id, ruta_id) VALUES ($1,$2)
     ON CONFLICT (poliza_id) DO UPDATE SET ruta_id=$2, activa=TRUE`,
    [poliza_id, req.params.id]
  )
  return reply.code(201).send({ ok: true })
}

// DELETE /api/zonas-recaudo/rutas/:id/polizas/:poliza_id
export async function quitarPoliza(req, reply) {
  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, req.params.id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }
  await pool.query(
    `UPDATE poliza_ruta SET activa=FALSE WHERE ruta_id=$1 AND poliza_id=$2`,
    [req.params.id, req.params.poliza_id]
  )
  return reply.send({ ok: true })
}

// GET /api/zonas-recaudo/recaudadores — recaudadores disponibles
export async function listarRecaudadores(req, reply) {
  const { sedeIds } = resolverSede(req)
  const r = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.rol FROM usuarios u
     WHERE u.activo AND u.rol IN ('operador','asesor_comercial','administrador')
       AND ($1::uuid[] IS NULL OR EXISTS (
         SELECT 1 FROM usuario_sedes us WHERE us.usuario_id = u.id AND us.sede_id = ANY($1::uuid[])
       ))
     ORDER BY u.nombre`,
    [sedeIds]
  )
  return reply.send({ data: r.rows })
}

// GET /api/zonas-recaudo/rutas/:id/sugeridas
// Sugiere pólizas NO asignadas cuya dirección del titular coincida con palabras clave de la zona/ruta
export async function polizasSugeridas(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }

  // Obtener info de la ruta y su zona
  const rutaQ = await pool.query(`
    SELECT r.nombre AS ruta_nombre, z.id AS zona_id, z.nombre AS zona_nombre, z.tipo, z.sede_id
    FROM rutas_recaudo r JOIN zonas_recaudo z ON z.id = r.zona_id WHERE r.id = $1
  `, [id])
  if (!rutaQ.rows.length) return reply.code(404).send({ error: 'Ruta no encontrada' })

  const { ruta_nombre, zona_id, zona_nombre, tipo, sede_id: rutaSedeId } = rutaQ.rows[0]

  // Construir palabras clave desde el nombre de la ruta y zona
  // Eliminar palabras genéricas y extraer términos significativos
  const stopWords = new Set(['zona','ruta','de','la','el','los','las','del','y','en','sur','norte','oriente','occidente','oriental','occidental'])
  const palabras = [...zona_nombre.split(/\s+/), ...ruta_nombre.split(/\s+/)]
    .map(p => p.toLowerCase().replace(/[^a-záéíóúüñ]/g, ''))
    .filter(p => p.length > 2 && !stopWords.has(p))

  // Si tipo es RURAL, buscar por vereda/corregimiento; si es URBANA por barrio/sector
  const tipoKeywords = tipo === 'RURAL' ? ['vereda','corregimiento','rural','finca','km','carretera']
                     : tipo === 'URBANA' ? ['calle','carrera','avenida','cra','cl','av','barrio','bto','manzana']
                     : [] // MIXTA — sin filtro de tipo

  // Construir condición ILIKE para buscar en dirección
  const allKeywords = [...palabras, ...tipoKeywords]

  // Pólizas ACTIVAS que NO están ya asignadas a NINGUNA ruta
  // Ordenar por: coincidencia de dirección primero, luego por mora (más mora = más urgente cobrar)
  const r = await pool.query(`
    WITH ya_asignadas AS (
      SELECT poliza_id FROM poliza_ruta WHERE activa
    ),
    candidatas AS (
      SELECT
        p.id, p.numero, p.estado, p.valor_cuota, p.meses_mora,
        COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre,
        t.numero_documento AS titular_doc,
        t.telefono AS titular_cel,
        t.direccion AS titular_dir,
        (t.zona_recaudo_id = $2) AS misma_zona,
        -- El titular está en la zona de esta ruta: la mejor señal (vale más que la dirección)
        (CASE WHEN t.zona_recaudo_id = $2 THEN 10 ELSE 0 END) + (
          ${allKeywords.length > 0
            ? allKeywords.map(kw => `
          CASE WHEN busca(LOWER(COALESCE(t.direccion,'')), '%${kw}%') THEN 1 ELSE 0 END`).join(' + ')
            : '1'}
        ) AS score
      FROM polizas p
      JOIN terceros t ON t.id = p.titular_id
      WHERE p.estado IN ('ACTIVA','VIGENTE')
        AND p.id NOT IN (SELECT poliza_id FROM ya_asignadas)
        AND ($1::uuid IS NULL OR p.sede_id = $1)
    )
    -- Primero las de la zona y las que coinciden por dirección; después el resto
    -- de pólizas SIN ruta (antes no salían y la lista quedaba vacía)
    SELECT * FROM candidatas
    ORDER BY score DESC, meses_mora DESC NULLS LAST, titular_nombre
    LIMIT 50
  `, [rutaSedeId || null, zona_id])

  return reply.send({
    data: r.rows,
    meta: {
      ruta_nombre,
      zona_nombre,
      palabras_clave: allKeywords,
      total: r.rows.length,
      tiempo_estimado_min: r.rows.length * 7,
    }
  })
}

// POST /api/zonas-recaudo/rutas/:id/sugeridas/asignar-todas
// Asigna todas las pólizas sugeridas a la ruta de una vez
export async function asignarTodasSugeridas(req, reply) {
  const { poliza_ids } = req.body // array de UUIDs
  const { id } = req.params
  if (!poliza_ids?.length) return reply.code(400).send({ error: 'poliza_ids requerido' })

  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const pid of poliza_ids) {
      await client.query(`
        INSERT INTO poliza_ruta (poliza_id, ruta_id) VALUES ($1, $2)
        ON CONFLICT (poliza_id) DO UPDATE SET ruta_id=$2, activa=TRUE
      `, [pid, id])
    }
    await client.query('COMMIT')
    return reply.send({ ok: true, asignadas: poliza_ids.length })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
