/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración de Empresa                             ║
 * ║  Archivo         : empresa.controller.js                                ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { query } from '../config/database.js'

/* ════════════════════════════════════════════════
   EMPRESA
════════════════════════════════════════════════ */

export async function obtenerEmpresa(req, reply) {
  const { rows } = await query(`
    SELECT e.*,
           p.dataico_ambiente, p.dataico_api_key,
           p.fe_prefijo, p.fe_resolucion_numero, p.fe_resolucion_fecha,
           p.fe_consecutivo_desde, p.fe_consecutivo_hasta, p.fe_consecutivo_actual,
           p.fe_correo_habilitado,
           p.prefijo_contrato, p.prefijo_servicio, p.prefijo_prevision,
           p.consecutivo_contrato, p.consecutivo_servicio, p.consecutivo_prevision,
           p.dias_gracia_mora, p.porcentaje_mora, p.enviar_alerta_mora_dias,
           p.wa_token, p.wa_phone_id, p.wa_business_id,
           p.smtp_host, p.smtp_puerto, p.smtp_usuario, p.smtp_de_nombre,
           p.color_primario, p.color_acento,
           p.id AS parametros_id
    FROM empresa e
    LEFT JOIN parametros_sistema p ON p.empresa_id = e.id
    WHERE e.activo = TRUE
    LIMIT 1
  `)
  if (!rows.length) return reply.status(404).send({ error: 'Empresa no configurada' })
  // Ocultar campos sensibles
  const data = rows[0]
  if (data.dataico_api_key) data.dataico_api_key = '••••••••'
  if (data.wa_token)        data.wa_token        = '••••••••'
  if (data.smtp_password)   data.smtp_password   = '••••••••'
  return reply.send({ data })
}

export async function actualizarEmpresa(req, reply) {
  const {
    razon_social, nombre_comercial, nit, digito_verificador,
    tipo_persona, regimen_tributario, ciiu,
    representante_legal, cedula_representante,
    email, telefono_1, telefono_2, sitio_web,
    departamento_id, municipio_id, direccion, codigo_postal,
    pie_pagina, terminos_condiciones,
  } = req.body

  const { rows } = await query(`
    UPDATE empresa SET
      razon_social         = COALESCE($1,  razon_social),
      nombre_comercial     = COALESCE($2,  nombre_comercial),
      nit                  = COALESCE($3,  nit),
      digito_verificador   = COALESCE($4,  digito_verificador),
      tipo_persona         = COALESCE($5,  tipo_persona),
      regimen_tributario   = COALESCE($6,  regimen_tributario),
      ciiu                 = COALESCE($7,  ciiu),
      representante_legal  = COALESCE($8,  representante_legal),
      cedula_representante = COALESCE($9,  cedula_representante),
      email                = COALESCE($10, email),
      telefono_1           = COALESCE($11, telefono_1),
      telefono_2           = COALESCE($12, telefono_2),
      sitio_web            = COALESCE($13, sitio_web),
      departamento_id      = COALESCE($14, departamento_id),
      municipio_id         = COALESCE($15, municipio_id),
      direccion            = COALESCE($16, direccion),
      codigo_postal        = COALESCE($17, codigo_postal),
      pie_pagina           = COALESCE($18, pie_pagina),
      terminos_condiciones = COALESCE($19, terminos_condiciones)
    WHERE activo = TRUE
    RETURNING *
  `, [
    razon_social||null, nombre_comercial||null, nit||null, digito_verificador||null,
    tipo_persona||null, regimen_tributario||null, ciiu||null,
    representante_legal||null, cedula_representante||null,
    email||null, telefono_1||null, telefono_2||null, sitio_web||null,
    departamento_id||null, municipio_id||null, direccion||null, codigo_postal||null,
    pie_pagina||null, terminos_condiciones||null,
  ])
  if (!rows.length) return reply.status(404).send({ error: 'Empresa no encontrada' })
  return reply.send({ data: rows[0], mensaje: 'Empresa actualizada correctamente' })
}

/* ════════════════════════════════════════════════
   PARÁMETROS DEL SISTEMA
════════════════════════════════════════════════ */

export async function actualizarParametros(req, reply) {
  const campos = req.body
  const empresaRow = await query(`SELECT id FROM empresa WHERE activo = TRUE LIMIT 1`)
  if (!empresaRow.rows.length) return reply.status(404).send({ error: 'Empresa no encontrada' })
  const empresa_id = empresaRow.rows[0].id

  // Construir SET dinámico solo con campos enviados (evitar sobreescribir tokens con vacío)
  const CAMPOS_PERMITIDOS = [
    'dataico_ambiente', 'fe_prefijo', 'fe_resolucion_numero', 'fe_resolucion_fecha',
    'fe_consecutivo_desde', 'fe_consecutivo_hasta', 'fe_correo_habilitado',
    'prefijo_contrato', 'prefijo_servicio', 'prefijo_prevision',
    'dias_gracia_mora', 'porcentaje_mora', 'enviar_alerta_mora_dias',
    'porcentaje_iva_defecto',
    'wa_phone_id', 'wa_business_id',
    'smtp_host', 'smtp_puerto', 'smtp_usuario', 'smtp_de_nombre',
    'color_primario', 'color_acento',
  ]
  // Campos sensibles solo se actualizan si vienen no enmascarados
  const CAMPOS_SENSIBLES = ['dataico_api_key', 'wa_token', 'smtp_password']

  const sets = []; const vals = [empresa_id]; let idx = 2
  for (const campo of CAMPOS_PERMITIDOS) {
    if (campos[campo] !== undefined) {
      sets.push(`${campo} = $${idx++}`); vals.push(campos[campo])
    }
  }
  for (const campo of CAMPOS_SENSIBLES) {
    if (campos[campo] && !campos[campo].includes('•')) {
      sets.push(`${campo} = $${idx++}`); vals.push(campos[campo])
    }
  }
  if (!sets.length) return reply.send({ data: {}, mensaje: 'Sin cambios' })

  // Asegurar que exista la fila de parámetros antes de actualizarla
  await query(
    `INSERT INTO parametros_sistema (empresa_id) VALUES ($1) ON CONFLICT (empresa_id) DO NOTHING`,
    [empresa_id]
  )

  const { rows } = await query(`
    UPDATE parametros_sistema SET ${sets.join(', ')}
    WHERE empresa_id = $1
    RETURNING id, empresa_id, dataico_ambiente, fe_prefijo,
              prefijo_contrato, prefijo_servicio, prefijo_prevision,
              dias_gracia_mora, porcentaje_mora, color_primario, color_acento
  `, vals)
  return reply.send({ data: rows[0] || {}, mensaje: 'Parámetros actualizados correctamente' })
}

/* ════════════════════════════════════════════════
   SEDES
════════════════════════════════════════════════ */

export async function listarSedes(req, reply) {
  const { rows } = await query(`
    SELECT s.*,
           d.nombre AS departamento_nombre,
           m.nombre AS municipio_nombre,
           z.nombre AS zona_nombre, z.tipo AS zona_tipo
    FROM sedes s
    INNER JOIN empresa e ON e.id = s.empresa_id AND e.activo = TRUE
    LEFT JOIN geo_departamentos d ON d.id = s.departamento_id
    LEFT JOIN geo_municipios    m ON m.id = s.municipio_id
    LEFT JOIN geo_zonas         z ON z.id = s.zona_id
    WHERE s.activo = $1
    ORDER BY s.es_principal DESC, s.nombre ASC
  `, [req.query.activo !== 'false'])
  return reply.send({ data: rows, meta: { total: rows.length } })
}

export async function crearSede(req, reply) {
  const empresaRow = await query(`SELECT id FROM empresa WHERE activo = TRUE LIMIT 1`)
  if (!empresaRow.rows.length) return reply.status(404).send({ error: 'Empresa no encontrada' })
  const empresa_id = empresaRow.rows[0].id

  const {
    nombre, codigo, departamento_id, municipio_id, zona_id, direccion,
    codigo_postal, telefono_1, telefono_2,
    email, responsable_nombre, horario, num_salas, es_principal,
  } = req.body

  if (!nombre) return reply.status(400).send({ error: 'El nombre de la sede es requerido' })

  if (es_principal) {
    await query(`UPDATE sedes SET es_principal = FALSE WHERE empresa_id = $1`, [empresa_id])
  }

  const { rows } = await query(`
    INSERT INTO sedes (
      empresa_id, nombre, codigo,
      departamento_id, municipio_id, zona_id,
      direccion, codigo_postal, telefono_1, telefono_2, email,
      responsable_nombre, horario, num_salas, es_principal
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *
  `, [
    empresa_id, nombre, codigo||null,
    departamento_id||null, municipio_id||null, zona_id||null,
    direccion||null, codigo_postal||null, telefono_1||null, telefono_2||null, email||null,
    responsable_nombre||null, horario ? JSON.stringify(horario) : null,
    num_salas || 1, es_principal || false,
  ])
  return reply.status(201).send({ data: rows[0], mensaje: 'Sede creada correctamente' })
}

export async function actualizarSede(req, reply) {
  const { id } = req.params
  const {
    nombre, codigo, departamento_id, municipio_id, zona_id, direccion,
    codigo_postal, telefono_1, telefono_2,
    email, responsable_nombre, horario, num_salas, es_principal, activo,
  } = req.body

  if (es_principal) {
    const sedeRow = await query(`SELECT empresa_id FROM sedes WHERE id = $1`, [id])
    if (sedeRow.rows.length) {
      await query(`UPDATE sedes SET es_principal = FALSE WHERE empresa_id = $1`, [sedeRow.rows[0].empresa_id])
    }
  }

  const { rows } = await query(`
    UPDATE sedes SET
      nombre             = COALESCE($2,  nombre),
      codigo             = COALESCE($3,  codigo),
      departamento_id    = COALESCE($4,  departamento_id),
      municipio_id       = COALESCE($5,  municipio_id),
      zona_id            = COALESCE($6,  zona_id),
      direccion          = COALESCE($7,  direccion),
      codigo_postal      = COALESCE($8,  codigo_postal),
      telefono_1         = COALESCE($9,  telefono_1),
      telefono_2         = COALESCE($10, telefono_2),
      email              = COALESCE($11, email),
      responsable_nombre = COALESCE($12, responsable_nombre),
      horario            = COALESCE($13::jsonb, horario),
      num_salas          = COALESCE($14, num_salas),
      es_principal       = COALESCE($15, es_principal),
      activo             = COALESCE($16, activo)
    WHERE id = $1
    RETURNING *
  `, [
    id, nombre, codigo||null,
    departamento_id||null, municipio_id||null, zona_id||null,
    direccion||null, codigo_postal||null, telefono_1||null, telefono_2||null, email||null,
    responsable_nombre||null, horario ? JSON.stringify(horario) : null,
    num_salas, es_principal, activo,
  ])
  if (!rows.length) return reply.status(404).send({ error: 'Sede no encontrada' })
  return reply.send({ data: rows[0], mensaje: 'Sede actualizada correctamente' })
}

/* ════════════════════════════════════════════════
   SERVICIOS CATÁLOGO
════════════════════════════════════════════════ */

export async function listarServicios(req, reply) {
  const { categoria } = req.query
  const { rows } = await query(`
    SELECT s.* FROM servicios_catalogo s
    INNER JOIN empresa e ON e.id = s.empresa_id AND e.activo = TRUE
    WHERE s.activo = TRUE
      AND ($1::text IS NULL OR s.categoria = $1)
    ORDER BY s.categoria ASC, s.orden_display ASC, s.nombre ASC
  `, [categoria || null])
  return reply.send({ data: rows, meta: { total: rows.length } })
}

// Genera un código único a partir de la categoría, ej: ATAUD-001, URNA-002…
async function generarCodigoServicio(categoria) {
  const prefijo = categoria.slice(0, 6).toUpperCase()
  const { rows } = await query(
    `SELECT codigo FROM servicios_catalogo WHERE codigo LIKE $1 ORDER BY codigo DESC LIMIT 1`,
    [`${prefijo}-%`]
  )
  const ultimoNum = rows.length ? parseInt(rows[0].codigo.split('-').pop(), 10) || 0 : 0
  let candidato, intento = ultimoNum
  do {
    intento += 1
    candidato = `${prefijo}-${String(intento).padStart(3, '0')}`
    const existe = await query(`SELECT 1 FROM servicios_catalogo WHERE codigo = $1`, [candidato])
    if (!existe.rows.length) break
  } while (true)
  return candidato
}

// PORCENTAJE: precio_base = costo + (costo * margen%). FIJO: el usuario escribe
// el precio de venta directamente (margen_valor ES el precio, no un recargo).
// Es la única fuente de verdad del precio_base: siempre se recalcula desde
// costo+margen o se toma el precio fijo, nunca se confía en un precio_base
// que mande el cliente directamente por otra vía.
function calcularPrecioVenta(costo, margenTipo, margenValor) {
  const c = Number(costo) || 0
  const m = Number(margenValor) || 0
  return margenTipo === 'FIJO' ? m : c * (1 + m / 100)
}

export async function crearServicio(req, reply) {
  const empresaRow = await query(`SELECT id, porcentaje_iva_defecto FROM empresa WHERE activo = TRUE LIMIT 1`)
  if (!empresaRow.rows.length) return reply.status(404).send({ error: 'Empresa no encontrada' })
  const empresa_id = empresaRow.rows[0].id

  const {
    nombre, descripcion, categoria,
    costo, margen_tipo, margen_valor, aplica_iva,
    codigo_producto_dian, unidad_medida, orden_display,
  } = req.body

  if (!nombre || !categoria) return reply.status(400).send({ error: 'Nombre y categoría son requeridos' })

  const codigo = await generarCodigoServicio(categoria)
  const margenTipo = margen_tipo === 'FIJO' ? 'FIJO' : 'PORCENTAJE'
  const precio_base = calcularPrecioVenta(costo, margenTipo, margen_valor)
  // El % de IVA nunca lo digita el usuario: siempre es el que está en Parámetros generales
  const porcentaje_iva = aplica_iva ? Number(empresaRow.rows[0].porcentaje_iva_defecto) : 0
  const iva = aplica_iva ? (precio_base * (porcentaje_iva / 100)) : 0

  const { rows } = await query(`
    INSERT INTO servicios_catalogo (
      empresa_id, nombre, codigo, descripcion, categoria,
      costo, margen_tipo, margen_valor,
      precio_base, precio_iva, aplica_iva, porcentaje_iva,
      codigo_producto_dian, unidad_medida, orden_display
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *
  `, [
    empresa_id, nombre, codigo, descripcion, categoria,
    costo || 0, margenTipo, margen_valor || 0,
    precio_base, iva, aplica_iva || false, porcentaje_iva || 0,
    codigo_producto_dian || '99', unidad_medida || 'UNIDAD', orden_display || 0,
  ])
  return reply.status(201).send({ data: rows[0], mensaje: 'Servicio creado correctamente' })
}

export async function actualizarServicio(req, reply) {
  const { id } = req.params
  const body = req.body

  let precio_base, iva
  if (body.costo !== undefined || body.margen_tipo !== undefined || body.margen_valor !== undefined) {
    const actual = await query(`SELECT costo, margen_tipo, margen_valor FROM servicios_catalogo WHERE id=$1`, [id])
    if (!actual.rows.length) return reply.status(404).send({ error: 'Servicio no encontrado' })
    const costo = body.costo ?? actual.rows[0].costo
    const margenTipo = body.margen_tipo ?? actual.rows[0].margen_tipo
    const margenValor = body.margen_valor ?? actual.rows[0].margen_valor
    precio_base = calcularPrecioVenta(costo, margenTipo, margenValor)
    body.costo = costo; body.margen_tipo = margenTipo; body.margen_valor = margenValor
  }

  // El % de IVA nunca lo digita el usuario: siempre es el que está en Parámetros generales
  if (body.aplica_iva !== undefined) {
    if (body.aplica_iva) {
      const empresaRow = await query(`SELECT porcentaje_iva_defecto FROM empresa WHERE activo = TRUE LIMIT 1`)
      body.porcentaje_iva = Number(empresaRow.rows[0]?.porcentaje_iva_defecto || 0)
    } else {
      body.porcentaje_iva = 0
    }
  }
  iva = body.aplica_iva && (precio_base ?? body.precio_base) && body.porcentaje_iva
    ? (precio_base ?? body.precio_base) * (body.porcentaje_iva / 100) : undefined

  const { rows } = await query(`
    UPDATE servicios_catalogo SET
      nombre = COALESCE($2, nombre),
      codigo = COALESCE($3, codigo),
      descripcion = COALESCE($4, descripcion),
      categoria = COALESCE($5, categoria),
      costo = COALESCE($6, costo),
      margen_tipo = COALESCE($7, margen_tipo),
      margen_valor = COALESCE($8, margen_valor),
      precio_base = COALESCE($9, precio_base),
      precio_iva = COALESCE($10, precio_iva),
      aplica_iva = COALESCE($11, aplica_iva),
      porcentaje_iva = COALESCE($12, porcentaje_iva),
      codigo_producto_dian = COALESCE($13, codigo_producto_dian),
      unidad_medida = COALESCE($14, unidad_medida),
      activo = COALESCE($15, activo),
      orden_display = COALESCE($16, orden_display)
    WHERE id = $1
    RETURNING *
  `, [
    id, body.nombre, body.codigo, body.descripcion, body.categoria,
    body.costo, body.margen_tipo, body.margen_valor,
    precio_base, iva, body.aplica_iva, body.porcentaje_iva,
    body.codigo_producto_dian, body.unidad_medida, body.activo, body.orden_display,
  ])
  if (!rows.length) return reply.status(404).send({ error: 'Servicio no encontrado' })
  return reply.send({ data: rows[0], mensaje: 'Servicio actualizado correctamente' })
}
