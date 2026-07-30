/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Autenticación                                   ║
 * ║  Archivo         : auth.controller.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { query } from '../config/database.js'
import { env } from '../config/env.js'

const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 15

export async function login(request, reply) {
  const { email, password } = request.body

  if (!email || !password) {
    return reply.status(400).send({ error: 'Email y contraseña son requeridos' })
  }

  const { rows } = await query(
    `SELECT u.*, s.nombre AS sede_nombre
     FROM usuarios u
     LEFT JOIN sedes s ON s.id = u.sede_id
     WHERE u.email = $1`,
    [email.toLowerCase().trim()]
  )

  const usuario = rows[0]

  if (!usuario) {
    return reply.status(401).send({ error: 'Credenciales inválidas' })
  }

  if (!usuario.activo) {
    return reply.status(403).send({ error: 'Usuario inactivo. Contacte al administrador.' })
  }

  // Verificar bloqueo por intentos fallidos
  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    const minutos = Math.ceil((new Date(usuario.bloqueado_hasta) - new Date()) / 60000)
    return reply.status(429).send({
      error: `Cuenta bloqueada. Intente de nuevo en ${minutos} minuto(s).`,
    })
  }

  const passwordValida = await bcrypt.compare(password, usuario.password)

  if (!passwordValida) {
    const nuevosIntentos = (usuario.login_intentos || 0) + 1
    const bloqueado = nuevosIntentos >= MAX_INTENTOS
      ? new Date(Date.now() + BLOQUEO_MINUTOS * 60000)
      : null

    await query(
      `UPDATE usuarios SET login_intentos = $1, bloqueado_hasta = $2 WHERE id = $3`,
      [nuevosIntentos, bloqueado, usuario.id]
    )

    const restantes = MAX_INTENTOS - nuevosIntentos
    if (bloqueado) {
      return reply.status(429).send({
        error: `Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos por múltiples intentos fallidos.`,
      })
    }
    return reply.status(401).send({
      error: `Credenciales inválidas. ${restantes > 0 ? `Le quedan ${restantes} intentos.` : ''}`,
    })
  }

  // Login exitoso — resetear intentos y registrar acceso
  await query(
    `UPDATE usuarios
     SET login_intentos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW()
     WHERE id = $1`,
    [usuario.id]
  )

  const sedesRes = await query(
    `SELECT s.id, s.nombre FROM usuario_sedes us JOIN sedes s ON s.id = us.sede_id WHERE us.usuario_id = $1 ORDER BY s.nombre`,
    [usuario.id]
  )
  const misSedes = sedesRes.rows.map(r => r.id)

  const payload = {
    id:    usuario.id,
    email: usuario.email,
    rol:   usuario.rol,
    nombre: usuario.nombre,
    sede_id: usuario.sede_id,
    sedes: misSedes,
  }

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn })

  return reply.send({
    data: {
      token,
      usuario: {
        id:           usuario.id,
        nombre:       usuario.nombre,
        email:        usuario.email,
        rol:          usuario.rol,
        foto_url:     usuario.foto_url,
        sede_id:      usuario.sede_id,
        sede_nombre:  usuario.sede_nombre,
        sedes:        sedesRes.rows,
        debe_cambiar_pwd: usuario.debe_cambiar_pwd,
      },
    },
  })
}

export async function me(request, reply) {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.foto_url,
            u.sede_id, u.ultimo_acceso, u.debe_cambiar_pwd,
            s.nombre AS sede_nombre
     FROM usuarios u
     LEFT JOIN sedes s ON s.id = u.sede_id
     WHERE u.id = $1`,
    [request.user.id]
  )

  if (!rows[0]) return reply.status(404).send({ error: 'Usuario no encontrado' })

  const sedesRes = await query(
    `SELECT s.id, s.nombre FROM usuario_sedes us JOIN sedes s ON s.id = us.sede_id WHERE us.usuario_id = $1 ORDER BY s.nombre`,
    [request.user.id]
  )

  return reply.send({ data: { ...rows[0], sedes: sedesRes.rows } })
}

// ── Activación de cuenta (usuario recién creado establece su contraseña) ───
export async function verificarTokenActivacion(request, reply) {
  const { token } = request.params

  const { rows } = await query(
    `SELECT nombre, email, activacion_expira FROM usuarios WHERE activacion_token = $1`,
    [token]
  )
  if (!rows[0]) return reply.status(404).send({ error: 'Enlace inválido' })

  if (new Date(rows[0].activacion_expira) < new Date()) {
    return reply.status(410).send({ error: 'Este enlace expiró. Pide al administrador que te cree de nuevo o reenvíe la invitación.' })
  }

  return reply.send({ data: { nombre: rows[0].nombre, email: rows[0].email } })
}

export async function activarCuenta(request, reply) {
  const { token } = request.params
  const { password } = request.body

  if (!password || password.length < 8) {
    return reply.status(400).send({ error: 'La contraseña debe tener mínimo 8 caracteres' })
  }

  const { rows } = await query(
    `SELECT id, activacion_expira FROM usuarios WHERE activacion_token = $1`,
    [token]
  )
  if (!rows[0]) return reply.status(404).send({ error: 'Enlace inválido' })

  if (new Date(rows[0].activacion_expira) < new Date()) {
    return reply.status(410).send({ error: 'Este enlace expiró. Pide al administrador que te cree de nuevo o reenvíe la invitación.' })
  }

  const hash = await bcrypt.hash(password, 12)

  await query(
    `UPDATE usuarios
     SET password = $1, debe_cambiar_pwd = false, activacion_token = NULL, activacion_expira = NULL,
         login_intentos = 0, bloqueado_hasta = NULL
     WHERE id = $2`,
    [hash, rows[0].id]
  )

  return reply.send({ data: { mensaje: 'Contraseña creada. Ya puedes iniciar sesión.' } })
}
