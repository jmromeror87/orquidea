/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Usuarios y Permisos                             ║
 * ║  Archivo         : usuarios.controller.js                          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { query } from '../config/database.js'
import { enviarCorreoActivacion } from '../utils/mailer.js'
import { env } from '../config/env.js'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FOTOS_DIR = path.join(__dirname, '..', 'uploads', 'usuarios')
fs.mkdirSync(FOTOS_DIR, { recursive: true })
const EXT_PERMITIDAS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const ROLES_VALIDOS = ['superadmin', 'administrador', 'contador', 'operador', 'asesor_comercial', 'consultor']
const SALT_ROUNDS = 12

const CAMPOS_USUARIO = `
  u.id, u.nombre, u.email, u.rol, u.activo, u.foto_url,
  u.sede_id, u.ultimo_acceso, u.debe_cambiar_pwd, u.creado_en,
  s.nombre AS sede_nombre,
  c.nombre AS creado_por_nombre
`

export async function listar(request, reply) {
  const { page = 1, limit = 20, buscar, rol, activo, sede_id } = request.query
  const offset = (page - 1) * limit

  const condiciones = ['u.oculto = false']
  const params = []
  let i = 1

  if (buscar) {
    condiciones.push(`(u.nombre ILIKE $${i} OR u.email ILIKE $${i})`)
    params.push(`%${buscar}%`)
    i++
  }
  if (rol) {
    condiciones.push(`u.rol = $${i}`)
    params.push(rol)
    i++
  }
  if (activo !== undefined) {
    condiciones.push(`u.activo = $${i}`)
    params.push(activo === 'true')
    i++
  }
  if (sede_id) {
    condiciones.push(`u.sede_id = $${i}`)
    params.push(sede_id)
    i++
  }

  const where = condiciones.join(' AND ')

  const [{ rows }, { rows: total }] = await Promise.all([
    query(
      `SELECT ${CAMPOS_USUARIO}
       FROM usuarios u
       LEFT JOIN sedes s ON s.id = u.sede_id
       LEFT JOIN usuarios c ON c.id = u.creado_por
       WHERE ${where}
       ORDER BY u.creado_en DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    ),
    query(
      `SELECT COUNT(*) FROM usuarios u WHERE ${where}`,
      params
    ),
  ])

  return reply.send({
    data: rows,
    meta: {
      total: parseInt(total[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total[0].count / limit),
    },
  })
}

export async function obtener(request, reply) {
  const { rows } = await query(
    `SELECT ${CAMPOS_USUARIO}
     FROM usuarios u
     LEFT JOIN sedes s ON s.id = u.sede_id
     LEFT JOIN usuarios c ON c.id = u.creado_por
     WHERE u.id = $1 AND u.oculto = false`,
    [request.params.id]
  )
  if (!rows[0]) return reply.status(404).send({ error: 'Usuario no encontrado' })
  return reply.send({ data: rows[0] })
}

export async function crear(request, reply) {
  const { nombre, email, rol, sede_id, sedes } = request.body

  if (!nombre || !email || !rol) {
    return reply.status(400).send({ error: 'Nombre, email y rol son requeridos' })
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return reply.status(400).send({ error: `Rol inválido. Roles permitidos: ${ROLES_VALIDOS.join(', ')}` })
  }

  // Solo superadmin puede crear otro superadmin
  if (rol === 'superadmin' && request.user.rol !== 'superadmin') {
    return reply.status(403).send({ error: 'Solo el superadmin puede crear otro superadmin' })
  }

  // Contraseña temporal inutilizable — el usuario debe establecer la suya vía el correo de activación
  const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS)
  const token = crypto.randomBytes(32).toString('hex')
  const expira = new Date(Date.now() + 48 * 60 * 60 * 1000)

  const sedesFinal = Array.isArray(sedes) && sedes.length ? sedes : (sede_id ? [sede_id] : [])
  const sedePrincipal = sede_id || sedesFinal[0] || null
  const emailNormalizado = email.toLowerCase().trim()

  const { rows } = await query(
    `INSERT INTO usuarios (nombre, email, password, rol, sede_id, creado_por, debe_cambiar_pwd, activacion_token, activacion_expira)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
     RETURNING id, nombre, email, rol, sede_id, activo, creado_en`,
    [nombre.trim(), emailNormalizado, hash, rol, sedePrincipal, request.user.id, token, expira]
  )

  for (const sid of sedesFinal) {
    await query(
      `INSERT INTO usuario_sedes (usuario_id, sede_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [rows[0].id, sid]
    )
  }

  const urlActivacion = `${env.appUrl}/activar-cuenta/${token}`
  let correo = { enviado: false, url: urlActivacion }
  try {
    correo = await enviarCorreoActivacion({ para: emailNormalizado, nombre: nombre.trim(), url: urlActivacion })
  } catch (err) {
    request.log.error({ err }, 'No se pudo enviar el correo de activación')
  }

  return reply.status(201).send({
    data: rows[0],
    correoEnviado: correo.enviado,
    ...(correo.enviado ? {} : { urlActivacion: correo.url }),
  })
}

export async function actualizar(request, reply) {
  const { id } = request.params
  const { nombre, email, rol, sede_id, sedes, activo } = request.body

  // No puede editarse a sí mismo para cambiar rol o estado
  if (id === request.user.id && (rol !== undefined || activo !== undefined)) {
    return reply.status(400).send({ error: 'No puede modificar su propio rol o estado' })
  }

  const { rows: actual } = await query('SELECT * FROM usuarios WHERE id = $1', [id])
  if (!actual[0]) return reply.status(404).send({ error: 'Usuario no encontrado' })

  if (rol && !ROLES_VALIDOS.includes(rol)) {
    return reply.status(400).send({ error: 'Rol inválido' })
  }
  if (rol === 'superadmin' && request.user.rol !== 'superadmin') {
    return reply.status(403).send({ error: 'Solo el superadmin puede asignar ese rol' })
  }

  // No puede quedar el sistema sin al menos un superadmin activo
  const dejaDeSerSuperadminActivo =
    actual[0].rol === 'superadmin' &&
    ((activo === false) || (rol && rol !== 'superadmin'))

  if (dejaDeSerSuperadminActivo) {
    const { rows: otros } = await query(
      `SELECT COUNT(*) FROM usuarios WHERE rol = 'superadmin' AND activo = true AND id <> $1`,
      [id]
    )
    if (parseInt(otros[0].count) === 0) {
      return reply.status(400).send({ error: 'No puede quedar el sistema sin al menos un superadmin activo' })
    }
  }

  const sedePrincipal = sede_id || (Array.isArray(sedes) && sedes.length ? sedes[0] : null)

  const { rows } = await query(
    `UPDATE usuarios
     SET nombre      = COALESCE($1, nombre),
         email       = COALESCE($2, email),
         rol         = COALESCE($3, rol),
         sede_id     = COALESCE($4, sede_id),
         activo      = COALESCE($5, activo),
         actualizado = NOW()
     WHERE id = $6
     RETURNING id, nombre, email, rol, sede_id, activo`,
    [
      nombre?.trim() || null,
      email?.toLowerCase().trim() || null,
      rol || null,
      sedePrincipal,
      activo ?? null,
      id,
    ]
  )

  // Si mandan la lista completa de sedes, reemplaza las asignaciones existentes
  if (Array.isArray(sedes)) {
    await query('DELETE FROM usuario_sedes WHERE usuario_id = $1', [id])
    for (const sid of sedes) {
      await query(
        `INSERT INTO usuario_sedes (usuario_id, sede_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, sid]
      )
    }
  }

  return reply.send({ data: rows[0] })
}

// ── Sedes asignadas a un usuario (multisede) ──────────────────────────────
export async function listarSedesUsuario(request, reply) {
  const { id } = request.params
  const { rows } = await query(
    `SELECT s.id, s.nombre FROM usuario_sedes us JOIN sedes s ON s.id = us.sede_id
     WHERE us.usuario_id = $1 ORDER BY s.nombre`,
    [id]
  )
  return reply.send({ data: rows })
}

export async function cambiarPassword(request, reply) {
  const { id } = request.params
  const { password } = request.body

  // Solo el propio usuario o superadmin/administrador pueden cambiar la contraseña
  const esPropioUsuario = id === request.user.id
  const esAdmin = ['superadmin', 'administrador'].includes(request.user.rol)

  if (!esPropioUsuario && !esAdmin) {
    return reply.status(403).send({ error: 'Sin permiso para cambiar esta contraseña' })
  }
  if (!password || password.length < 8) {
    return reply.status(400).send({ error: 'La contraseña debe tener mínimo 8 caracteres' })
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS)

  await query(
    `UPDATE usuarios
     SET password = $1, debe_cambiar_pwd = false, actualizado = NOW()
     WHERE id = $2`,
    [hash, id]
  )

  return reply.send({ data: { mensaje: 'Contraseña actualizada' } })
}

export async function listarSedes(request, reply) {
  const { rows } = await query(
    'SELECT id, nombre, municipio, activo FROM sedes WHERE activo = true ORDER BY nombre'
  )
  return reply.send({ data: rows })
}

export async function subirFoto(request, reply) {
  const { id } = request.params

  const { rows: existe } = await query('SELECT id FROM usuarios WHERE id = $1', [id])
  if (!existe[0]) return reply.status(404).send({ error: 'Usuario no encontrado' })

  const data = await request.file()
  if (!data) return reply.code(400).send({ error: 'No se recibió ningún archivo' })

  const ext = path.extname(data.filename).toLowerCase()
  if (!EXT_PERMITIDAS.has(ext)) {
    return reply.code(400).send({ error: `Formato no permitido. Use: ${[...EXT_PERMITIDAS].join(', ')}` })
  }

  const nombreArchivo = `usuario_${id}_${Date.now()}${ext}`
  const rutaLocal = path.join(FOTOS_DIR, nombreArchivo)
  const urlPublica = `/uploads/usuarios/${nombreArchivo}`

  const writeStream = fs.createWriteStream(rutaLocal)
  await pipeline(data.file, writeStream)

  if (data.file.truncated) {
    fs.unlink(rutaLocal, () => {})
    return reply.code(413).send({ error: 'La imagen supera el límite permitido.' })
  }

  await query('UPDATE usuarios SET foto_url = $1, actualizado = NOW() WHERE id = $2', [urlPublica, id])

  return reply.send({ data: { foto_url: urlPublica } })
}
