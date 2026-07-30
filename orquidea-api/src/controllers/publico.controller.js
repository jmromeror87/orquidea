/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : API Pública (landing page)                          ║
 * ║  Archivo         : publico.controller.js                               ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

// Estas rutas NO llevan verifyToken — son de solo lectura y sirven a la
// landing page pública. Cada función selecciona a mano solo las columnas
// de marketing/contacto, nunca columnas internas (empresa_id, ids de otras
// tablas, costos, etc.).

// ── Rate limit simple en memoria para consultar-estado ──────────────────────
// Evita fuerza bruta de "número de póliza" contra una cédula ya conocida.
const intentos = new Map() // ip -> { count, resetAt }
const LIMITE_INTENTOS = 10
const VENTANA_MS = 10 * 60 * 1000 // 10 minutos

function limitado(ip) {
  const ahora = Date.now()
  const reg = intentos.get(ip)
  if (!reg || ahora > reg.resetAt) {
    intentos.set(ip, { count: 1, resetAt: ahora + VENTANA_MS })
    return false
  }
  reg.count++
  return reg.count > LIMITE_INTENTOS
}

// ── Planes ────────────────────────────────────────────────────────────────
export async function listarPlanesPublico(req, reply) {
  const { rows } = await pool.query(`
    SELECT nombre, codigo, descripcion, tipo,
           num_beneficiarios, edad_max_titular, edad_max_beneficiario,
           valor_plan, valor_cuota_mensual, valor_seguro, valor_traslado,
           valor_adicionales, periodicidades, servicios_incluidos,
           meses_vigencia, orden_display
    FROM planes_catalogo
    WHERE activo = TRUE
    ORDER BY orden_display, nombre
  `)
  return reply.send({ data: rows })
}

// ── Servicios (catálogo de marketing) ───────────────────────────────────────
export async function listarServiciosPublico(req, reply) {
  const { rows } = await pool.query(`
    SELECT nombre, codigo, descripcion, categoria, unidad_medida, orden_display
    FROM servicios_catalogo
    WHERE activo = TRUE
    ORDER BY orden_display, nombre
  `)
  return reply.send({ data: rows })
}

// ── Sedes ─────────────────────────────────────────────────────────────────
export async function listarSedesPublico(req, reply) {
  const { rows } = await pool.query(`
    SELECT nombre, direccion, departamento, municipio, barrio,
           telefono_1, telefono_2, email, horario, es_principal
    FROM sedes
    WHERE activo = TRUE
    ORDER BY es_principal DESC, nombre
  `)
  return reply.send({ data: rows })
}

// ── Memoriales (novenarios, aniversarios, misas) ────────────────────────────
export async function listarMemorialesPublico(req, reply) {
  const { rows } = await pool.query(`
    SELECT nombre, foto_url, tipo, fecha_evento, mensaje
    FROM memoriales_web
    WHERE activo = TRUE
    ORDER BY fecha_evento DESC
    LIMIT 20
  `)
  return reply.send({ data: rows })
}

// ── Consultar estado de póliza/contrato (cédula + número) ──────────────────
export async function consultarEstado(req, reply) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
  if (limitado(ip)) {
    return reply.code(429).send({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' })
  }

  const { numero_documento, numero, tipo = 'POLIZA' } = req.body || {}
  if (!numero_documento || !numero) {
    return reply.code(400).send({ error: 'Documento y número son requeridos' })
  }

  if (tipo === 'POLIZA') {
    const { rows } = await pool.query(`
      SELECT p.estado, p.valor_cuota, p.meses_mora, p.saldo_mora, p.pago_hasta, p.fecha_inicio,
             pl.nombre AS plan
      FROM polizas p
      JOIN terceros t ON t.id = p.titular_id
      JOIN planes_poliza pl ON pl.id = p.plan_id
      WHERE t.numero_documento = $1 AND p.numero::TEXT = $2
      LIMIT 1
    `, [numero_documento, String(numero)])
    if (!rows.length) return reply.code(404).send({ error: 'No encontramos una póliza con esos datos' })
    return reply.send({ data: rows[0] })
  }

  const { rows } = await pool.query(`
    SELECT c.estado, c.valor_cuota, c.meses_mora, c.saldo_mora, c.pago_hasta, c.fecha_inicio,
           c.tipo_contrato, c.modalidad
    FROM contratos c
    JOIN terceros t ON t.id = c.contratante_id
    WHERE t.numero_documento = $1 AND c.numero::TEXT = $2
    LIMIT 1
  `, [numero_documento, String(numero)])
  if (!rows.length) return reply.code(404).send({ error: 'No encontramos un contrato con esos datos' })
  return reply.send({ data: rows[0] })
}

// ── Registrar solicitud de contacto (landing) ───────────────────────────────
const TEL_REGEX = /^[0-9+()\s-]{7,20}$/

export async function crearLead(req, reply) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
  if (limitado(ip)) {
    return reply.code(429).send({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' })
  }

  const { nombre, correo, telefono, mensaje, origen = 'landing' } = req.body || {}
  if (!nombre?.trim() || !telefono?.trim()) {
    return reply.code(400).send({ error: 'Nombre y teléfono son requeridos' })
  }
  if (!TEL_REGEX.test(telefono.trim())) {
    return reply.code(400).send({ error: 'El teléfono no parece válido' })
  }

  await pool.query(`
    INSERT INTO leads_web (nombre, correo, telefono, mensaje, origen)
    VALUES ($1, $2, $3, $4, $5)
  `, [nombre.trim(), correo?.trim() || null, telefono.trim(), mensaje?.trim() || null, origen])

  return reply.code(201).send({ ok: true })
}
