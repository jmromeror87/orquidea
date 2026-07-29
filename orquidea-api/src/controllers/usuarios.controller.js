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
import { query } from '../config/database.js'

const ROLES_VALIDOS = ['superadmin', 'administrador', 'contador', 'operador', 'asesor_comercial', 'consultor']
const SALT_ROUNDS = 12

const CAMPOS_USUARIO = `
  u.id, u.nombre, u.email, u.rol, u.activo,
  u.sede_id, u.ultimo_acceso, u.debe_cambiar_pwd, u.creado_en,
  s.nombre AS sede_nombre,
  c.nombre AS creado_por_nombre
`

export async function listar(request, reply) {
  const { page = 1, limit = 20, buscar, rol, activo, sede_id } = request.query
  const offset = (page - 1) * limit

  const condiciones = ['1=1']
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
     WHERE u.id = $1`,
    [request.params.id]
  )
  if (!rows[0]) return reply.status(404).send({ error: 'Usuario no encontrado' })
  return reply.send({ data: rows[0] })
}

export async function crear(request, reply) {
  const { nombre, email, password, rol, sede_id, sedes } = request.body

  if (!nombre || !email || !password || !rol) {
    return reply.status(400).send({ error: 'Nombre, email, contraseña y rol son requeridos' })
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return reply.status(400).send({ error: `Rol inválido. Roles permitidos: ${ROLES_VALIDOS.join(', ')}` })
  }
  if (password.length < 8) {
    return reply.status(400).send({ error: 'La contraseña debe tener mínimo 8 caracteres' })
  }

  // Solo superadmin puede crear otro superadmin
  if (rol === 'superadmin' && request.user.rol !== 'superadmin') {
    return reply.status(403).send({ error: 'Solo el superadmin puede crear otro superadmin' })
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const sedesFinal = Array.isArray(sedes) && sedes.length ? sedes : (sede_id ? [sede_id] : [])
  const sedePrincipal = sede_id || sedesFinal[0] || null

  const { rows } = await query(
    `INSERT INTO usuarios (nombre, email, password, rol, sede_id, creado_por, debe_cambiar_pwd)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id, nombre, email, rol, sede_id, activo, creado_en`,
    [nombre.trim(), email.toLowerCase().trim(), hash, rol, sedePrincipal, request.user.id]
  )

  for (const sid of sedesFinal) {
    await query(
      `INSERT INTO usuario_sedes (usuario_id, sede_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [rows[0].id, sid]
    )
  }

  return reply.status(201).send({ data: rows[0] })
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
    'SELECT id, nombre, ciudad, activo FROM sedes WHERE activo = true ORDER BY nombre'
  )
  return reply.send({ data: rows })
}
