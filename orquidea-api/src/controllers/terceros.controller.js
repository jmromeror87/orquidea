/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Terceros (Clientes, Difuntos, Beneficiarios, etc.)   ║
 * ║  Archivo         : terceros.controller.js                               ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, sedeParaCrear, terceroPermitido } from '../utils/sede.js'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOPORTES_DIR = path.join(__dirname, '..', 'uploads', 'soportes')
const EXT_PERMITIDAS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'])

// ── Helpers ────────────────────────────────────────────────────────────────

const SELECT_TERCERO = `
  SELECT t.*,
    td.sigla         AS tipo_doc_sigla,
    td.nombre        AS tipo_doc_nombre,
    td.requiere_dv   AS tipo_doc_requiere_dv,
    d.nombre         AS departamento_nombre,
    m.nombre         AS municipio_nombre,
    z.nombre         AS zona_nombre,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object('rol', tr.rol, 'activo', tr.activo))
      FILTER (WHERE tr.rol IS NOT NULL), '[]'
    ) AS roles
  FROM terceros t
  LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
  LEFT JOIN geo_departamentos d ON d.id = t.departamento_id
  LEFT JOIN geo_municipios    m ON m.id = t.municipio_id
  LEFT JOIN geo_zonas         z ON z.id = t.zona_id
  LEFT JOIN tercero_roles     tr ON tr.tercero_id = t.id
`

// ── Listar con filtros + paginación ────────────────────────────────────────
export async function listar(req, reply) {
  const { q, rol, activo, tipo_persona, page = 1, limit = 25 } = req.query
  const { sedeIds } = resolverSede(req)
  const conds = []
  const vals  = []

  conds.push(`($${vals.length + 1}::uuid[] IS NULL OR t.sede_id = ANY($${vals.length + 1}::uuid[]))`)
  vals.push(sedeIds)

  if (activo !== undefined) {
    conds.push(`t.activo = $${vals.length + 1}`)
    vals.push(activo !== 'false')
  }
  if (tipo_persona) {
    conds.push(`t.tipo_persona = $${vals.length + 1}`)
    vals.push(tipo_persona.toUpperCase())
  }
  if (q) {
    const idx = vals.length + 1
    conds.push(`(
      t.nombres         ILIKE $${idx} OR
      t.apellidos       ILIKE $${idx} OR
      t.razon_social    ILIKE $${idx} OR
      t.numero_documento ILIKE $${idx} OR
      t.email           ILIKE $${idx} OR
      t.telefono        ILIKE $${idx}
    )`)
    vals.push(`%${q}%`)
  }
  if (rol) {
    conds.push(`EXISTS (
      SELECT 1 FROM tercero_roles tr2
      WHERE tr2.tercero_id = t.id AND tr2.rol = $${vals.length + 1} AND tr2.activo = TRUE
    )`)
    vals.push(rol.toUpperCase())
  }

  const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const offset = (Number(page) - 1) * Number(limit)

  const [{ rows }, { rows: cnt }] = await Promise.all([
    pool.query(
      `${SELECT_TERCERO} ${where}
       GROUP BY t.id, td.sigla, td.nombre, td.requiere_dv, d.nombre, m.nombre, z.nombre
       ORDER BY t.apellidos, t.nombres, t.razon_social
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, Number(limit), offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM terceros t
       LEFT JOIN tercero_roles tr ON tr.tercero_id = t.id ${where}`,
      vals
    ),
  ])

  return reply.send({
    data: rows,
    meta: { total: Number(cnt[0].count), page: Number(page), limit: Number(limit) },
    error: null,
  })
}

// ── Obtener uno por ID ─────────────────────────────────────────────────────
export async function obtener(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }
  const { rows } = await pool.query(
    `${SELECT_TERCERO} WHERE t.id = $1
     GROUP BY t.id, td.sigla, td.nombre, td.requiere_dv, d.nombre, m.nombre, z.nombre`,
    [id]
  )
  if (!rows.length) return reply.code(404).send({ data: null, error: 'Tercero no encontrado' })

  // Cargar núcleo familiar (como titular o como beneficiario)
  const { rows: nucleo } = await pool.query(
    `SELECT nf.parentesco, nf.activo,
       CASE WHEN nf.titular_id = $1 THEN 'BENEFICIARIO' ELSE 'TITULAR' END AS relacion,
       t.id, t.nombres, t.apellidos, t.numero_documento,
       td.sigla AS tipo_doc_sigla
     FROM nucleo_familiar nf
     JOIN terceros t ON t.id = (
       CASE WHEN nf.titular_id = $1 THEN nf.beneficiario_id ELSE nf.titular_id END
     )
     LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
     WHERE nf.titular_id = $1 OR nf.beneficiario_id = $1`,
    [id]
  )

  // Defunción, si aplica
  const { rows: def } = await pool.query(
    `SELECT * FROM defunciones WHERE tercero_id = $1 LIMIT 1`, [id]
  )

  return reply.send({
    data: { ...rows[0], nucleo_familiar: nucleo, defuncion: def[0] || null },
    error: null,
  })
}

// ── Crear tercero ──────────────────────────────────────────────────────────
export async function crear(req, reply) {
  const {
    tipo_documento_id, numero_documento, dv, tipo_persona = 'NATURAL',
    nombres, apellidos, razon_social, fecha_nacimiento, sexo, rh,
    telefono, telefono_alt, email, direccion, barrio, vereda,
    departamento_id, municipio_id, zona_id, observaciones,
    roles = [],
  } = req.body

  if (!tipo_documento_id || !numero_documento)
    return reply.code(400).send({ data: null, error: 'tipo_documento_id y numero_documento son requeridos' })

  if (tipo_persona === 'NATURAL' && (!nombres || !apellidos))
    return reply.code(400).send({ data: null, error: 'nombres y apellidos son requeridos para persona natural' })

  if (tipo_persona === 'JURIDICA' && !razon_social)
    return reply.code(400).send({ data: null, error: 'razon_social es requerida para persona jurídica' })

  const sede_id = sedeParaCrear(req)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO terceros
         (tipo_documento_id, numero_documento, dv, tipo_persona,
          nombres, apellidos, razon_social, fecha_nacimiento, sexo, rh,
          telefono, telefono_alt, email, direccion, barrio, vereda,
          departamento_id, municipio_id, zona_id, observaciones, sede_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [tipo_documento_id, numero_documento, dv || null, tipo_persona,
       nombres || null, apellidos || null, razon_social || null,
       fecha_nacimiento || null, sexo || null, rh || null,
       telefono || null, telefono_alt || null, email || null, direccion || null,
       barrio || null, vereda || null,
       departamento_id || null, municipio_id || null, zona_id || null,
       observaciones || null, sede_id]
    )
    const tercero = rows[0]

    const ROLES_VALIDOS = ['CLIENTE','DIFUNTO','BENEFICIARIO','TITULAR_POLIZA','CONTRATANTE','PROVEEDOR']
    const rolesValidos = roles.map(r => r.toUpperCase()).filter(r => ROLES_VALIDOS.includes(r))
    for (const rol of rolesValidos) {
      await client.query(
        `INSERT INTO tercero_roles (tercero_id, rol) VALUES ($1,$2)
         ON CONFLICT (tercero_id, rol) DO NOTHING`,
        [tercero.id, rol]
      )
    }

    await client.query('COMMIT')
    return reply.code(201).send({ data: tercero, error: null })
  } catch (e) {
    await client.query('ROLLBACK')
    if (e.code === '23505')
      return reply.code(409).send({ data: null, error: `Ya existe un tercero con ese tipo y número de documento` })
    throw e
  } finally {
    client.release()
  }
}

// ── Actualizar tercero ─────────────────────────────────────────────────────
export async function actualizar(req, reply) {
  const { id } = req.params
  const {
    tipo_documento_id, numero_documento, dv, tipo_persona,
    nombres, apellidos, razon_social, fecha_nacimiento, sexo, rh,
    telefono, telefono_alt, email, direccion, barrio, vereda,
    departamento_id, municipio_id, zona_id, observaciones, activo,
    estado_civil, ocupacion,
  } = req.body

  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }

  const { rows } = await pool.query(
    `UPDATE terceros SET
       tipo_documento_id = COALESCE($2,  tipo_documento_id),
       numero_documento  = COALESCE($3,  numero_documento),
       dv                = COALESCE($4,  dv),
       tipo_persona      = COALESCE($5,  tipo_persona),
       nombres           = COALESCE($6,  nombres),
       apellidos         = COALESCE($7,  apellidos),
       razon_social      = COALESCE($8,  razon_social),
       fecha_nacimiento  = COALESCE($9,  fecha_nacimiento),
       sexo              = COALESCE($10, sexo),
       rh                = COALESCE($11, rh),
       telefono          = COALESCE($12, telefono),
       telefono_alt      = COALESCE($13, telefono_alt),
       email             = COALESCE($14, email),
       direccion         = COALESCE($15, direccion),
       barrio            = COALESCE($21, barrio),
       vereda            = COALESCE($22, vereda),
       departamento_id   = COALESCE($16, departamento_id),
       municipio_id      = COALESCE($17, municipio_id),
       zona_id           = COALESCE($18, zona_id),
       observaciones     = COALESCE($19, observaciones),
       activo            = COALESCE($20, activo),
       estado_civil      = COALESCE($23, estado_civil),
       ocupacion         = COALESCE($24, ocupacion),
       actualizado       = NOW()
     WHERE id = $1 RETURNING *`,
    [id,
     tipo_documento_id || null, numero_documento || null, dv ?? null, tipo_persona || null,
     nombres || null, apellidos || null, razon_social || null, fecha_nacimiento || null,
     sexo || null, rh || null, telefono || null, telefono_alt || null,
     email || null, direccion || null, departamento_id || null,
     municipio_id || null, zona_id || null, observaciones || null, activo ?? null,
     barrio || null, vereda || null, estado_civil || null, ocupacion || null]
  )
  if (!rows.length) return reply.code(404).send({ data: null, error: 'Tercero no encontrado' })
  return reply.send({ data: rows[0], error: null })
}

// ── Gestión de roles ───────────────────────────────────────────────────────
export async function agregarRol(req, reply) {
  const { id } = req.params
  const { rol } = req.body

  if (!rol) return reply.code(400).send({ data: null, error: 'rol es requerido' })

  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tercero_roles (tercero_id, rol)
       VALUES ($1, $2)
       ON CONFLICT (tercero_id, rol) DO UPDATE SET activo = TRUE
       RETURNING *`,
      [id, rol.toUpperCase()]
    )
    return reply.code(201).send({ data: rows[0], error: null })
  } catch (e) {
    if (e.code === '23503') return reply.code(404).send({ data: null, error: 'Tercero no encontrado' })
    throw e
  }
}

export async function quitarRol(req, reply) {
  const { id, rol } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }
  await pool.query(
    `UPDATE tercero_roles SET activo = FALSE WHERE tercero_id = $1 AND rol = $2`,
    [id, rol.toUpperCase()]
  )
  return reply.send({ data: null, error: null })
}

// ── Registro de defunción (convierte un tercero en DIFUNTO) ───────────────
export async function registrarDefuncion(req, reply) {
  const { id } = req.params
  const { fecha_fallecimiento, hora_fallecimiento, lugar_fallecimiento, causa_fallecimiento } = req.body

  if (!fecha_fallecimiento)
    return reply.code(400).send({ data: null, error: 'fecha_fallecimiento es requerida' })

  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO defunciones (tercero_id, fecha_fallecimiento, hora_fallecimiento, lugar_fallecimiento, causa_fallecimiento)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tercero_id) DO UPDATE SET
         fecha_fallecimiento  = EXCLUDED.fecha_fallecimiento,
         hora_fallecimiento   = EXCLUDED.hora_fallecimiento,
         lugar_fallecimiento  = EXCLUDED.lugar_fallecimiento,
         causa_fallecimiento  = EXCLUDED.causa_fallecimiento
       RETURNING *`,
      [id, fecha_fallecimiento, hora_fallecimiento || null,
       lugar_fallecimiento || null, causa_fallecimiento || null]
    )

    // Asignar automáticamente el rol DIFUNTO
    await client.query(
      `INSERT INTO tercero_roles (tercero_id, rol)
       VALUES ($1, 'DIFUNTO')
       ON CONFLICT (tercero_id, rol) DO UPDATE SET activo = TRUE`,
      [id]
    )

    await client.query('COMMIT')
    return reply.send({ data: rows[0], error: null })
  } catch (e) {
    await client.query('ROLLBACK')
    if (e.code === '23503') return reply.code(404).send({ data: null, error: 'Tercero no encontrado' })
    throw e
  } finally {
    client.release()
  }
}

// ── Núcleo familiar ────────────────────────────────────────────────────────
export async function agregarFamiliar(req, reply) {
  const { id: titular_id } = req.params
  const { beneficiario_id, parentesco } = req.body

  if (!beneficiario_id || !parentesco)
    return reply.code(400).send({ data: null, error: 'beneficiario_id y parentesco son requeridos' })

  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, titular_id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO nucleo_familiar (titular_id, beneficiario_id, parentesco)
       VALUES ($1,$2,$3)
       ON CONFLICT (titular_id, beneficiario_id) DO UPDATE SET parentesco=$3, activo=TRUE
       RETURNING *`,
      [titular_id, beneficiario_id, parentesco]
    )

    // Asignar rol BENEFICIARIO al familiar si no lo tiene
    await pool.query(
      `INSERT INTO tercero_roles (tercero_id, rol)
       VALUES ($1,'BENEFICIARIO')
       ON CONFLICT (tercero_id, rol) DO UPDATE SET activo=TRUE`,
      [beneficiario_id]
    )

    return reply.code(201).send({ data: rows[0], error: null })
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ data: null, error: 'Ya existe esa relación familiar' })
    if (e.code === '23514') return reply.code(400).send({ data: null, error: 'Un tercero no puede ser su propio familiar' })
    throw e
  }
}

export async function quitarFamiliar(req, reply) {
  const { id: titular_id, familiarId: beneficiario_id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, titular_id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }
  await pool.query(
    `UPDATE nucleo_familiar SET activo=FALSE WHERE titular_id=$1 AND beneficiario_id=$2`,
    [titular_id, beneficiario_id]
  )
  return reply.send({ data: null, error: null })
}

// ── Select rápido (para dropdowns en Contratos, Pólizas, etc.) ────────────
export async function select(req, reply) {
  const { q, rol } = req.query
  const { sedeIds } = resolverSede(req)
  const conds = ['t.activo = TRUE']
  const vals  = []

  conds.push(`($${vals.length + 1}::uuid[] IS NULL OR t.sede_id = ANY($${vals.length + 1}::uuid[]))`)
  vals.push(sedeIds)

  if (q) {
    conds.push(`(
      t.nombres ILIKE $${vals.length + 1} OR
      t.apellidos ILIKE $${vals.length + 1} OR
      t.razon_social ILIKE $${vals.length + 1} OR
      t.numero_documento ILIKE $${vals.length + 1}
    )`)
    vals.push(`%${q}%`)
  }
  if (rol) {
    conds.push(`EXISTS (
      SELECT 1 FROM tercero_roles tr
      WHERE tr.tercero_id = t.id AND tr.rol = $${vals.length + 1} AND tr.activo = TRUE
    )`)
    vals.push(rol.toUpperCase())
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT t.id, t.tipo_persona, t.nombres, t.apellidos, t.razon_social,
            t.numero_documento, t.telefono, t.email, t.direccion,
            td.sigla AS tipo_doc_sigla,
            COALESCE(
              json_agg(DISTINCT tr.rol) FILTER (WHERE tr.rol IS NOT NULL), '[]'
            ) AS roles
     FROM terceros t
     LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
     LEFT JOIN tercero_roles tr ON tr.tercero_id = t.id AND tr.activo = TRUE
     ${where}
     GROUP BY t.id, td.sigla
     ORDER BY t.apellidos, t.nombres, t.razon_social
     LIMIT 50`,
    vals
  )
  return reply.send({ data: rows, error: null })
}

export async function obtenerDefuncion(req, reply) {
  const { id } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ data: null, error: 'No tiene acceso a este tercero' })
  }
  const r = await pool.query(
    `SELECT * FROM defunciones WHERE tercero_id = $1`, [id]
  )
  return reply.send({ data: r.rows[0] || null })
}

// ── Soporte adjunto de la defunción (acta / permiso escaneados) ──────────
// Un solo registro por persona — lo que se suba aquí se ve reflejado tanto
// en esta ficha como en cualquier servicio funerario vinculado a esta misma
// persona (Servicios lee/escribe exactamente este mismo campo).
export async function subirSoporteDefuncion(req, reply) {
  const { id } = req.params
  const { campo } = req.query // 'acta_defuncion' | 'permiso_inhumacion'
  const columnas = {
    acta_defuncion: 'acta_defuncion_soporte_url',
    permiso_inhumacion: 'permiso_inhumacion_soporte_url',
  }
  const columna = columnas[campo]
  if (!columna) return reply.code(400).send({ error: 'campo debe ser acta_defuncion o permiso_inhumacion' })

  const { sedeIds } = resolverSede(req)
  if (!(await terceroPermitido(pool, id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a este tercero' })
  }

  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No se recibió ningún archivo' })

  const ext = path.extname(data.filename).toLowerCase()
  if (!EXT_PERMITIDAS.has(ext))
    return reply.code(400).send({ error: `Formato no permitido. Use: ${[...EXT_PERMITIDAS].join(', ')}` })

  const nombreArchivo = `defuncion_${campo}_${id}_${Date.now()}${ext}`
  const rutaLocal = path.join(SOPORTES_DIR, nombreArchivo)
  const urlPublica = `/uploads/soportes/${nombreArchivo}`

  const writeStream = fs.createWriteStream(rutaLocal)
  await pipeline(data.file, writeStream)

  if (data.file.truncated) {
    fs.unlink(rutaLocal, () => {})
    return reply.code(413).send({ error: 'El archivo supera el límite permitido. Comprime la imagen o usa PDF.' })
  }

  const res = await pool.query(
    `UPDATE defunciones SET ${columna} = $1 WHERE tercero_id = $2 RETURNING id, ${columna}`,
    [urlPublica, id]
  )
  if (!res.rows.length) {
    fs.unlink(rutaLocal, () => {})
    return reply.code(404).send({ error: 'Este tercero aún no tiene un registro de defunción. Regístrala primero.' })
  }

  return reply.send({ ok: true, url: urlPublica })
}
