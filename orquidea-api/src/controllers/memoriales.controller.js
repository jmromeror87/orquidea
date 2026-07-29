/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Memoriales — conmemoraciones publicadas en el sitio ║
 * ║  Archivo         : memoriales.controller.js                            ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, sedeParaCrear } from '../utils/sede.js'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FOTOS_DIR = path.join(__dirname, '..', 'uploads', 'memoriales')
fs.mkdirSync(FOTOS_DIR, { recursive: true })
const EXT_PERMITIDAS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

// ── Listar (panel interno) ──────────────────────────────────────────────────
export async function listar(req, reply) {
  const { sedeIds } = resolverSede(req)
  const { rows } = await pool.query(`
    SELECT m.*, s.nombre AS sede_nombre, u.nombre AS creado_por_nombre
    FROM memoriales_web m
    LEFT JOIN sedes s ON s.id = m.sede_id
    LEFT JOIN usuarios u ON u.id = m.creado_por
    WHERE ($1::uuid[] IS NULL OR m.sede_id = ANY($1::uuid[]) OR m.sede_id IS NULL)
    ORDER BY m.fecha_evento DESC, m.creado_en DESC
  `, [sedeIds])
  return reply.send({ data: rows })
}

// ── Subir foto ───────────────────────────────────────────────────────────────
export async function subirFoto(req, reply) {
  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No se recibió ningún archivo' })

  const ext = path.extname(data.filename).toLowerCase()
  if (!EXT_PERMITIDAS.has(ext))
    return reply.code(400).send({ error: `Formato no permitido. Use: ${[...EXT_PERMITIDAS].join(', ')}` })

  const nombreArchivo = `memorial_${req.user.id}_${Date.now()}${ext}`
  const rutaLocal = path.join(FOTOS_DIR, nombreArchivo)
  const urlPublica = `/uploads/memoriales/${nombreArchivo}`

  const writeStream = fs.createWriteStream(rutaLocal)
  await pipeline(data.file, writeStream)

  if (data.file.truncated) {
    fs.unlink(rutaLocal, () => {})
    return reply.code(413).send({ error: 'La imagen supera el límite permitido.' })
  }

  return reply.send({ ok: true, url: urlPublica })
}

// ── Crear ────────────────────────────────────────────────────────────────────
export async function crear(req, reply) {
  const { nombre, foto_url, tipo = 'NOVENARIO', fecha_evento, mensaje, tercero_id, activo = true } = req.body
  if (!nombre?.trim() || !fecha_evento) {
    return reply.code(400).send({ error: 'Nombre y fecha del evento son requeridos' })
  }
  const sede_id = sedeParaCrear(req)

  const { rows } = await pool.query(`
    INSERT INTO memoriales_web (nombre, foto_url, tipo, fecha_evento, mensaje, tercero_id, sede_id, activo, creado_por)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [nombre.trim(), foto_url || null, tipo, fecha_evento, mensaje?.trim() || null, tercero_id || null, sede_id, activo, req.user.id])

  return reply.code(201).send({ data: rows[0] })
}

// ── Actualizar ───────────────────────────────────────────────────────────────
export async function actualizar(req, reply) {
  const { id } = req.params
  const { nombre, foto_url, tipo, fecha_evento, mensaje, activo } = req.body

  const { rows } = await pool.query(`
    UPDATE memoriales_web SET
      nombre = COALESCE($1, nombre),
      foto_url = COALESCE($2, foto_url),
      tipo = COALESCE($3, tipo),
      fecha_evento = COALESCE($4, fecha_evento),
      mensaje = $5,
      activo = COALESCE($6, activo)
    WHERE id = $7
    RETURNING *
  `, [nombre, foto_url, tipo, fecha_evento, mensaje ?? null, activo, id])

  if (!rows.length) return reply.code(404).send({ error: 'No encontrado' })
  return reply.send({ data: rows[0] })
}

// ── Eliminar ─────────────────────────────────────────────────────────────────
export async function eliminar(req, reply) {
  const { id } = req.params
  await pool.query('DELETE FROM memoriales_web WHERE id = $1', [id])
  return reply.send({ ok: true })
}
