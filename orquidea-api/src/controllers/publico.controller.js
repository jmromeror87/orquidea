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
// Fuente única: planes_poliza (el mismo catálogo usado al afiliar en el
// módulo de Pólizas). "planes_catalogo" quedó deprecado — ver migración 057.
function construirServiciosIncluidos(p) {
  // Ataúd, traslados, flores, cremación, trámites y lápida ya no son campos
  // fijos del plan — ahora se configuran como servicios reales del catálogo
  // (plan_servicios), que se agregan aparte más abajo. Solo la velación
  // queda como campo estructurado propio del plan.
  return [
    { nombre: `Velación ${p.cubre_velacion_h}h`, incluido: true },
  ]
}

export async function listarPlanesPublico(req, reply) {
  const { rows } = await pool.query(`
    SELECT p.id, p.nombre, p.codigo, p.descripcion, p.tipo, p.max_beneficiarios,
           p.valor_mensual, p.meses_carencia,
           p.cubre_ataud, p.cubre_velacion_h, p.cubre_traslado_local, p.cubre_traslado_nacional,
           p.cubre_flores, p.cubre_cremacion, p.cubre_tramites, p.cubre_lapida, p.valor_excedente,
           COALESCE((
             SELECT json_agg(sc.nombre ORDER BY sc.nombre)
             FROM plan_servicios ps JOIN servicios_catalogo sc ON sc.id = ps.servicio_id AND sc.activo = TRUE
             WHERE ps.plan_id = p.id
           ), '[]') AS servicios_catalogo
    FROM planes_poliza p
    WHERE p.activo = TRUE
    ORDER BY p.valor_mensual, p.nombre
  `)
  // Sin precio a propósito: la landing no debe mostrar valores, solo la
  // cobertura completa — el precio se da por llamada/WhatsApp.
  const data = rows.map(p => ({
    nombre: p.nombre,
    codigo: p.codigo,
    descripcion: p.descripcion,
    tipo: p.tipo,
    num_beneficiarios: p.max_beneficiarios,
    meses_carencia: p.meses_carencia,
    servicios_incluidos: [
      ...construirServiciosIncluidos(p),
      ...p.servicios_catalogo.map(nombre => ({ nombre, incluido: true })),
    ],
  }))
  return reply.send({ data })
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

// ── Empresa (datos de contacto públicos) ────────────────────────────────────
export async function obtenerEmpresaPublico(req, reply) {
  const { rows } = await pool.query(`
    SELECT razon_social, nombre_comercial, email, telefono_1, telefono_2,
           sitio_web, direccion, departamento, municipio, logo_url
    FROM empresa
    WHERE activo = TRUE
    LIMIT 1
  `)
  if (!rows.length) return reply.send({ data: null })
  return reply.send({ data: rows[0] })
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
      SELECT p.id, p.numero, p.estado, p.valor_cuota, p.dia_cobro, p.meses_mora, p.saldo_mora,
             p.pago_hasta, p.ultimo_pago, p.fecha_inicio, p.fecha_fin_carencia,
             p.max_beneficiarios, p.cubre_velacion_h, p.servicios_incluidos, p.valor_excedente,
             pl.nombre AS plan, pl.tipo AS plan_tipo,
             t.nombres, t.apellidos, t.razon_social, t.numero_documento, t.telefono
      FROM polizas p
      JOIN terceros t ON t.id = p.titular_id
      JOIN planes_poliza pl ON pl.id = p.plan_id
      WHERE t.numero_documento = $1 AND p.numero::TEXT = $2
      LIMIT 1
    `, [numero_documento, String(numero)])
    if (!rows.length) return reply.code(404).send({ error: 'No encontramos una póliza con esos datos' })
    const pol = rows[0]

    const [{ rows: benefRows }, { rows: pagoRows }] = await Promise.all([
      pool.query(`
        SELECT t.nombres, t.apellidos, t.razon_social, pb.parentesco
        FROM poliza_beneficiarios pb
        JOIN terceros t ON t.id = pb.tercero_id
        WHERE pb.poliza_id = $1 AND pb.activo = TRUE
        ORDER BY t.nombres
      `, [pol.id]),
      pool.query(`
        SELECT numero_recibo, mes_correspondiente, monto, fecha_pago, metodo_pago
        FROM pagos_poliza
        WHERE poliza_id = $1 AND anulado = FALSE
        ORDER BY fecha_pago DESC
        LIMIT 12
      `, [pol.id]),
    ])

    return reply.send({
      data: {
        numero: pol.numero,
        estado: pol.estado,
        titular: {
          nombre: pol.razon_social || `${pol.nombres || ''} ${pol.apellidos || ''}`.trim(),
          numero_documento: pol.numero_documento,
          telefono: pol.telefono,
        },
        plan: pol.plan,
        plan_tipo: pol.plan_tipo,
        valor_cuota: pol.valor_cuota,
        dia_cobro: pol.dia_cobro,
        meses_mora: pol.meses_mora,
        saldo_mora: pol.saldo_mora,
        pago_hasta: pol.pago_hasta,
        ultimo_pago: pol.ultimo_pago,
        fecha_inicio: pol.fecha_inicio,
        fecha_fin_carencia: pol.fecha_fin_carencia,
        en_carencia: pol.fecha_fin_carencia ? new Date(pol.fecha_fin_carencia) > new Date() : false,
        cobertura: {
          max_beneficiarios: pol.max_beneficiarios,
          cubre_velacion_h: pol.cubre_velacion_h,
          servicios_incluidos: pol.servicios_incluidos || [],
          valor_excedente: pol.valor_excedente,
        },
        afiliados_actuales: benefRows.length,
        beneficiarios: benefRows.map(b => ({
          nombre: b.razon_social || `${b.nombres || ''} ${b.apellidos || ''}`.trim(),
          parentesco: b.parentesco,
        })),
        pagos: pagoRows,
      },
    })
  }

  const { rows } = await pool.query(`
    SELECT c.id, c.numero, c.estado, c.valor_cuota, c.dia_cobro, c.meses_mora, c.saldo_mora,
           c.pago_hasta, c.fecha_inicio, c.tipo_contrato, c.modalidad,
           c.valor_total, c.valor_pagado,
           ps.nombre AS paquete,
           t.nombres, t.apellidos, t.razon_social, t.numero_documento, t.telefono
    FROM contratos c
    JOIN terceros t ON t.id = c.contratante_id
    LEFT JOIN paquetes_servicio ps ON ps.id = c.paquete_id
    WHERE t.numero_documento = $1 AND c.numero::TEXT = $2
    LIMIT 1
  `, [numero_documento, String(numero)])
  if (!rows.length) return reply.code(404).send({ error: 'No encontramos un contrato con esos datos' })
  const cont = rows[0]

  const { rows: pagoRows } = await pool.query(`
    SELECT numero_recibo, mes_correspondiente, monto, fecha_pago, metodo_pago
    FROM pagos_contrato
    WHERE contrato_id = $1 AND anulado = FALSE
    ORDER BY fecha_pago DESC
    LIMIT 12
  `, [cont.id])

  return reply.send({
    data: {
      numero: cont.numero,
      estado: cont.estado,
      tipo_contrato: cont.tipo_contrato,
      modalidad: cont.modalidad,
      titular: {
        nombre: cont.razon_social || `${cont.nombres || ''} ${cont.apellidos || ''}`.trim(),
        numero_documento: cont.numero_documento,
        telefono: cont.telefono,
      },
      paquete: cont.paquete,
      valor_cuota: cont.valor_cuota,
      dia_cobro: cont.dia_cobro,
      meses_mora: cont.meses_mora,
      saldo_mora: cont.saldo_mora,
      pago_hasta: cont.pago_hasta,
      fecha_inicio: cont.fecha_inicio,
      valor_total: cont.valor_total,
      valor_pagado: cont.valor_pagado,
      pagos: pagoRows,
    },
  })
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
