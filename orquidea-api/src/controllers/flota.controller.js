/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Flota — Vehículos y Conductores                  ║
 * ║  Archivo         : flota.controller.js                             ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, sedeParaCrear } from '../utils/sede.js'

// ── Vehículos ────────────────────────────────────────────────────────────────

export async function listarVehiculos(req, reply) {
  const { sedeIds } = resolverSede(req)
  const where = sedeIds ? 'WHERE v.sede_id = ANY($1::uuid[])' : ''
  const { rows } = await pool.query(`
    SELECT v.*, se.nombre AS sede_nombre,
      t.id AS traslado_actual_id, t.tipo AS traslado_actual_tipo,
      s.id AS servicio_actual_id, s.numero AS servicio_actual_numero
    FROM flota_vehiculos v
    LEFT JOIN sedes se ON se.id = v.sede_id
    LEFT JOIN LATERAL (
      SELECT * FROM traslados tr
      WHERE tr.vehiculo_id = v.id AND tr.completado = FALSE
      ORDER BY tr.fecha_hora NULLS LAST LIMIT 1
    ) t ON TRUE
    LEFT JOIN servicios_funerarios s ON s.id = t.servicio_id
    ${where}
    ORDER BY v.activo DESC, v.placa`,
    sedeIds ? [sedeIds] : []
  )
  return reply.send({
    data: rows.map(v => ({ ...v, disponible: !v.traslado_actual_id })),
  })
}

export async function crearVehiculo(req, reply) {
  const { placa, marca, modelo, anio, tipo, capacidad, color, observaciones } = req.body
  if (!placa?.trim()) return reply.code(400).send({ error: 'La placa es obligatoria' })

  try {
    const { rows } = await pool.query(`
      INSERT INTO flota_vehiculos (placa, marca, modelo, anio, tipo, capacidad, color, observaciones, sede_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [placa.trim().toUpperCase(), marca || null, modelo || null, anio || null,
       tipo || 'CARROZA', capacidad || 1, color || null, observaciones || null, sedeParaCrear(req)]
    )
    return reply.code(201).send({ data: rows[0] })
  } catch (e) {
    if (e.code === '23505') return reply.code(400).send({ error: 'Ya existe un vehículo con esa placa' })
    throw e
  }
}

export async function actualizarVehiculo(req, reply) {
  const { id } = req.params
  const { placa, marca, modelo, anio, tipo, capacidad, color, observaciones, activo } = req.body
  try {
    const { rows } = await pool.query(`
      UPDATE flota_vehiculos SET
        placa = COALESCE($1, placa), marca = COALESCE($2, marca), modelo = COALESCE($3, modelo),
        anio = COALESCE($4, anio), tipo = COALESCE($5, tipo), capacidad = COALESCE($6, capacidad),
        color = COALESCE($7, color), observaciones = COALESCE($8, observaciones),
        activo = COALESCE($9, activo), actualizado = NOW()
      WHERE id = $10 RETURNING *`,
      [placa?.trim().toUpperCase() || null, marca ?? null, modelo ?? null, anio ?? null,
       tipo ?? null, capacidad ?? null, color ?? null, observaciones ?? null, activo ?? null, id]
    )
    if (!rows[0]) return reply.code(404).send({ error: 'Vehículo no encontrado' })
    return reply.send({ data: rows[0] })
  } catch (e) {
    if (e.code === '23505') return reply.code(400).send({ error: 'Ya existe un vehículo con esa placa' })
    throw e
  }
}

// ── Conductores ──────────────────────────────────────────────────────────────

export async function listarConductores(req, reply) {
  const { sedeIds } = resolverSede(req)
  const where = sedeIds ? 'WHERE c.sede_id = ANY($1::uuid[])' : ''
  const { rows } = await pool.query(`
    SELECT c.*, se.nombre AS sede_nombre,
      v.placa AS vehiculo_predeterminado_placa, v.marca AS vehiculo_predeterminado_marca,
      t.id AS traslado_actual_id,
      s.id AS servicio_actual_id, s.numero AS servicio_actual_numero
    FROM flota_conductores c
    LEFT JOIN sedes se ON se.id = c.sede_id
    LEFT JOIN flota_vehiculos v ON v.id = c.vehiculo_predeterminado_id
    LEFT JOIN LATERAL (
      SELECT * FROM traslados tr
      WHERE tr.conductor_id = c.id AND tr.completado = FALSE
      ORDER BY tr.fecha_hora NULLS LAST LIMIT 1
    ) t ON TRUE
    LEFT JOIN servicios_funerarios s ON s.id = t.servicio_id
    ${where}
    ORDER BY c.activo DESC, c.nombre`,
    sedeIds ? [sedeIds] : []
  )
  return reply.send({
    data: rows.map(c => ({ ...c, disponible: !c.traslado_actual_id })),
  })
}

export async function crearConductor(req, reply) {
  const { nombre, documento, telefono, licencia_numero, licencia_categoria,
    licencia_vencimiento, vehiculo_predeterminado_id, observaciones } = req.body
  if (!nombre?.trim()) return reply.code(400).send({ error: 'El nombre es obligatorio' })

  const { rows } = await pool.query(`
    INSERT INTO flota_conductores
      (nombre, documento, telefono, licencia_numero, licencia_categoria,
       licencia_vencimiento, vehiculo_predeterminado_id, observaciones, sede_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [nombre.trim(), documento || null, telefono || null, licencia_numero || null,
     licencia_categoria || null, licencia_vencimiento || null,
     vehiculo_predeterminado_id || null, observaciones || null, sedeParaCrear(req)]
  )
  return reply.code(201).send({ data: rows[0] })
}

export async function actualizarConductor(req, reply) {
  const { id } = req.params
  const { nombre, documento, telefono, licencia_numero, licencia_categoria,
    licencia_vencimiento, vehiculo_predeterminado_id, observaciones, activo } = req.body

  const { rows } = await pool.query(`
    UPDATE flota_conductores SET
      nombre = COALESCE($1, nombre), documento = COALESCE($2, documento),
      telefono = COALESCE($3, telefono), licencia_numero = COALESCE($4, licencia_numero),
      licencia_categoria = COALESCE($5, licencia_categoria),
      licencia_vencimiento = COALESCE($6, licencia_vencimiento),
      vehiculo_predeterminado_id = COALESCE($7, vehiculo_predeterminado_id),
      observaciones = COALESCE($8, observaciones), activo = COALESCE($9, activo),
      actualizado = NOW()
    WHERE id = $10 RETURNING *`,
    [nombre ?? null, documento ?? null, telefono ?? null, licencia_numero ?? null,
     licencia_categoria ?? null, licencia_vencimiento ?? null,
     vehiculo_predeterminado_id || null,
     observaciones ?? null, activo ?? null, id]
  )
  if (!rows[0]) return reply.code(404).send({ error: 'Conductor no encontrado' })
  return reply.send({ data: rows[0] })
}
