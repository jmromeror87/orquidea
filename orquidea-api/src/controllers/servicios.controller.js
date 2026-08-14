/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios                                       ║
 * ║  Archivo         : servicios.controller.js                         ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Controlador: servicios
 */

import pool from '../config/database.js'
import { agregarMaterial, eliminarMaterial } from '../utils/tanatopraxiaMateriales.js'
import { anthropic } from '../utils/anthropicClient.js'
import { computeCobertura } from './convenios.controller.js'
import { sincronizarCartera } from './carteraTerceros.controller.js'
import { resolverSede, sedeParaCrear, convenioPermitido } from '../utils/sede.js'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOPORTES_DIR = path.join(__dirname, '..', 'uploads', 'soportes')
const EXT_PERMITIDAS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'])

// ── Soporte adjunto (acta de defunción / permiso de inhumación) ───────────
// El archivo pertenece a la PERSONA (tabla defunciones), no al servicio —
// así el mismo documento se ve reflejado tanto en la ficha del servicio
// como en la ficha del tercero (pestaña Defunción), sin duplicar nada.
// Acepta PDF e imágenes; el número del documento y el archivo escaneado
// son cosas separadas.
export async function subirSoporteDocumento(req, reply) {
  const { id } = req.params // id del SERVICIO
  const { campo } = req.query // 'acta_defuncion' | 'permiso_inhumacion'
  const columnas = {
    acta_defuncion: 'acta_defuncion_soporte_url',
    permiso_inhumacion: 'permiso_inhumacion_soporte_url',
  }
  const columna = columnas[campo]
  if (!columna) return reply.code(400).send({ error: 'campo debe ser acta_defuncion o permiso_inhumacion' })

  const sf = await pool.query(`SELECT difunto_id FROM servicios_funerarios WHERE id = $1`, [id])
  if (!sf.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado' })
  const difuntoId = sf.rows[0].difunto_id

  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No se recibió ningún archivo' })

  const ext = path.extname(data.filename).toLowerCase()
  if (!EXT_PERMITIDAS.has(ext))
    return reply.code(400).send({ error: `Formato no permitido. Use: ${[...EXT_PERMITIDAS].join(', ')}` })

  const nombreArchivo = `defuncion_${campo}_${difuntoId}_${Date.now()}${ext}`
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
    [urlPublica, difuntoId]
  )
  if (!res.rows.length) {
    fs.unlink(rutaLocal, () => {})
    return reply.code(404).send({ error: 'No hay un registro de defunción para este difunto' })
  }

  return reply.send({ ok: true, url: urlPublica })
}

// ── Auditoría ─────────────────────────────────────────────────────────────────
async function audit(servicioId, usuarioId, modulo, accion, metadatos = null) {
  try {
    await pool.query(
      `INSERT INTO servicio_auditoria (servicio_id, usuario_id, modulo, accion, metadatos)
       VALUES ($1,$2,$3,$4,$5)`,
      [servicioId, usuarioId || null, modulo, accion, metadatos ? JSON.stringify(metadatos) : null]
    )
  } catch { /* no interrumpir flujo principal */ }
}

// ── Choques de agenda ─────────────────────────────────────────────────────────
// Sala de velación: dos servicios no pueden ocupar la misma sala en horarios que se traslapen.
async function verificarChoqueSala(db, { salaId, ini, fin, excluirId }) {
  if (!salaId || !ini || !fin) return null
  const r = await db.query(`
    SELECT sf.numero, sf.fecha_velacion_ini, sf.fecha_velacion_fin
    FROM servicios_funerarios sf
    WHERE sf.sala_id = $1
      AND sf.estado NOT IN ('CANCELADO')
      AND sf.id != COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)
      AND sf.fecha_velacion_ini IS NOT NULL AND sf.fecha_velacion_fin IS NOT NULL
      AND sf.fecha_velacion_ini < $4::timestamptz AND sf.fecha_velacion_fin > $3::timestamptz
    LIMIT 1`,
    [salaId, excluirId || null, ini, fin]
  )
  return r.rows[0] || null
}

// Flota: el mismo vehículo o conductor no puede tener dos traslados dentro de una ventana
// de 90 minutos entre sí (tiempo mínimo razonable de desplazamiento/servicio).
const BUFFER_TRASLADO_MIN = 90
async function verificarChoqueTraslado(db, { vehiculoId, conductorId, fechaHora, excluirId }) {
  if ((!vehiculoId && !conductorId) || !fechaHora) return null
  const r = await db.query(`
    SELECT t.fecha_hora, sf.numero AS servicio_numero
    FROM traslados t
    JOIN servicios_funerarios sf ON sf.id = t.servicio_id
    WHERE (t.vehiculo_id = $1 OR t.conductor_id = $2)
      AND NOT t.completado
      AND sf.estado != 'CANCELADO'
      AND t.id != COALESCE($3, '00000000-0000-0000-0000-000000000000'::uuid)
      AND t.fecha_hora IS NOT NULL
      AND ABS(EXTRACT(EPOCH FROM (t.fecha_hora - $4::timestamptz))) < $5
    LIMIT 1`,
    [vehiculoId || null, conductorId || null, excluirId || null, fechaHora, BUFFER_TRASLADO_MIN * 60]
  )
  return r.rows[0] || null
}

// ── SELECT base ───────────────────────────────────────────────────────────

const JOINS = `
  FROM servicios_funerarios sf
  LEFT JOIN contratos c    ON c.id  = sf.contrato_id
  LEFT JOIN terceros dif   ON dif.id = sf.difunto_id
  LEFT JOIN terceros cont  ON cont.id = c.contratante_id
  LEFT JOIN salas_velacion sv ON sv.id = sf.sala_id
  LEFT JOIN usuarios u     ON u.id  = sf.usuario_id
  LEFT JOIN convenios conv ON conv.id = sf.convenio_id
  LEFT JOIN polizas pol    ON pol.id = sf.poliza_id
  LEFT JOIN terceros contConv ON contConv.id = sf.contratante_convenio_id
  LEFT JOIN sedes se ON se.id = sf.sede_id
  LEFT JOIN defunciones defu ON defu.tercero_id = sf.difunto_id
`

const SELECT_LIST = `
  SELECT
    sf.id, sf.numero, sf.codigo, sf.tipo_disposicion, sf.estado,
    sf.fecha_velacion_ini, sf.fecha_velacion_fin,
    sf.fecha_recogida, sf.fecha_disposicion,
    sf.lugar_recogida, sf.lugar_disposicion,
    sf.acta_defuncion, sf.permiso_inhumacion,
    defu.acta_defuncion_soporte_url, defu.permiso_inhumacion_soporte_url,
    sf.tramites_completos, sf.observaciones, sf.creado_en,
    -- Difunto
    dif.id   AS difunto_id,
    COALESCE(dif.nombres||' '||dif.apellidos, dif.razon_social) AS difunto_nombre,
    dif.rh   AS difunto_rh,
    dif.fecha_nacimiento AS difunto_nacimiento,
    -- Contratante (del contrato, o si no hay, el responsable opcional del convenio)
    COALESCE(cont.id, contConv.id)  AS contratante_id,
    COALESCE(cont.nombres||' '||cont.apellidos, cont.razon_social,
             contConv.nombres||' '||contConv.apellidos, contConv.razon_social) AS contratante_nombre,
    COALESCE(cont.telefono, contConv.telefono) AS contratante_tel,
    -- Contrato
    c.numero AS contrato_numero, c.id AS contrato_id,
    -- Convenio
    conv.id AS convenio_id, conv.nombre AS convenio_nombre,
    sf.convenio_valor_cubierto,
    -- Póliza
    pol.id AS poliza_id, pol.numero AS poliza_numero,
    -- Sala
    sv.id AS sala_id, sv.nombre AS sala_nombre,
    -- Sede
    sf.sede_id, se.nombre AS sede_nombre,
    -- Asesor
    u.nombre AS operador_nombre
`

// ── Listar ────────────────────────────────────────────────────────────────

export async function listar(req, reply) {
  const { q = '', estado = '', page = 1, limit = 20 } = req.query
  const offset = (Math.max(1, +page) - 1) * +limit

  const conds = ['1=1']
  const vals  = []
  let i = 1

  if (q) {
    conds.push(`(
      CAST(sf.numero AS TEXT) ILIKE $${i}
      OR COALESCE(dif.nombres||' '||dif.apellidos,'') ILIKE $${i}
      OR COALESCE(cont.nombres||' '||cont.apellidos,'') ILIKE $${i}
    )`)
    vals.push(`%${q}%`); i++
  }
  if (estado) { conds.push(`sf.estado = $${i}`); vals.push(estado); i++ }

  const { sedeIds } = resolverSede(req)
  if (sedeIds) { conds.push(`sf.sede_id = ANY($${i}::uuid[])`); vals.push(sedeIds); i++ }

  const where = `WHERE ${conds.join(' AND ')}`

  const [data, count] = await Promise.all([
    pool.query(`${SELECT_LIST} ${JOINS} ${where} ORDER BY sf.creado_en DESC LIMIT $${i} OFFSET $${i+1}`,
      [...vals, +limit, offset]),
    pool.query(`SELECT COUNT(*) ${JOINS} ${where}`, vals),
  ])

  return reply.send({
    data: data.rows,
    meta: { total: +count.rows[0].count, page: +page, pages: Math.ceil(+count.rows[0].count / +limit) },
  })
}

// ── Obtener detalle ───────────────────────────────────────────────────────

export async function obtener(req, reply) {
  const { id } = req.params

  const [sfRes, trasRes, itemsRes, tanaRes, defRes, benRes, tanaMatRes] = await Promise.all([
    pool.query(`
      SELECT sf.*,
        sf.checklist, sf.certificado_medico, sf.registro_civil,
        -- Difunto (datos básicos para cabecera)
        dif.id             AS difunto_id,
        dif.nombres        AS difunto_nombres,
        dif.apellidos      AS difunto_apellidos,
        COALESCE(dif.nombres||' '||dif.apellidos, dif.razon_social) AS difunto_nombre,
        dif.rh             AS difunto_rh,
        dif.fecha_nacimiento AS difunto_nacimiento,
        dif.sexo           AS difunto_sexo,
        dif.numero_documento AS difunto_documento,
        dif.tipo_documento_id AS difunto_tipo_documento_id,
        td.sigla           AS difunto_tipo_doc,
        dif.lugar_exp_documento AS difunto_lugar_exp_doc,
        dif.estado_civil   AS difunto_estado_civil,
        dif.tipo_matrimonio AS difunto_tipo_matrimonio,
        dif.num_hijos      AS difunto_num_hijos,
        dif.nacionalidad   AS difunto_nacionalidad,
        dif.religion       AS difunto_religion,
        dif.nivel_estudios AS difunto_nivel_estudios,
        dif.ocupacion      AS difunto_ocupacion,
        dif.seguridad_social AS difunto_seguridad_social,
        dif.nombre_conyuge AS difunto_nombre_conyuge,
        dif.nombre_padre   AS difunto_nombre_padre,
        dif.nombre_madre   AS difunto_nombre_madre,
        dif.direccion      AS difunto_direccion,
        dif.municipio_id   AS difunto_municipio_id,
        dif.departamento_id AS difunto_departamento_id,
        gm.nombre          AS difunto_municipio,
        gd.nombre          AS difunto_departamento,
        dif.municipio_nac_id AS difunto_municipio_nac_id,
        gn.nombre          AS difunto_municipio_nacimiento,
        -- Contratante (del contrato, o si no hay, el responsable opcional del convenio)
        COALESCE(cont.id, contConv.id) AS contratante_id,
        COALESCE(cont.nombres||' '||cont.apellidos, cont.razon_social,
                 contConv.nombres||' '||contConv.apellidos, contConv.razon_social) AS contratante_nombre,
        COALESCE(cont.nombres, contConv.nombres)             AS contratante_nombres,
        COALESCE(cont.apellidos, contConv.apellidos)         AS contratante_apellidos,
        COALESCE(cont.numero_documento, contConv.numero_documento) AS contratante_documento,
        COALESCE(tdc.sigla, tdcc.sigla)                       AS contratante_tipo_doc,
        COALESCE(cont.telefono, contConv.telefono)           AS contratante_tel,
        COALESCE(cont.telefono_alt, contConv.telefono_alt)   AS contratante_tel_alt,
        COALESCE(cont.email, contConv.email)                 AS contratante_email,
        COALESCE(cont.direccion, contConv.direccion)         AS contratante_direccion,
        COALESCE(cont.municipio_id, contConv.municipio_id)   AS contratante_municipio_id,
        COALESCE(cont.departamento_id, contConv.departamento_id) AS contratante_departamento_id,
        COALESCE(gmc.nombre, gmcc.nombre)                     AS contratante_municipio,
        COALESCE(gdc.nombre, gdcc.nombre)                     AS contratante_departamento,
        COALESCE(cont.estado_civil, contConv.estado_civil)   AS contratante_estado_civil,
        COALESCE(cont.ocupacion, contConv.ocupacion)         AS contratante_ocupacion,
        COALESCE(cont.fecha_nacimiento, contConv.fecha_nacimiento) AS contratante_nacimiento,
        COALESCE(cont.sexo, contConv.sexo)                   AS contratante_sexo,
        sf.parentesco          AS contratante_parentesco,
        (contConv.id IS NOT NULL AND cont.id IS NULL) AS contratante_es_convenio,
        -- Póliza / contrato
        c.numero               AS contrato_numero,
        c.id                   AS contrato_id,
        -- Póliza
        pol.id                 AS poliza_id,
        pol.numero             AS poliza_numero,
        pol.estado             AS poliza_estado,
        pol.fecha_inicio       AS poliza_fecha_inicio,
        pol.pago_hasta         AS poliza_pago_hasta,
        pol.meses_mora         AS poliza_meses_mora,
        pol.valor_cuota        AS poliza_valor_cuota,
        pol.saldo_mora         AS poliza_saldo_mora,
        -- Plan de la póliza
        ppl.nombre             AS poliza_plan,
        ppl.tipo               AS poliza_plan_tipo,
        pol.servicios_incluidos AS poliza_servicios,
        pol.cubre_velacion_h   AS poliza_cubre_velacion_h,
        pol.valor_excedente    AS poliza_valor_excedente,
        ppl.valor_mensual      AS poliza_valor_mensual,
        -- Titular de la póliza
        tpol.id                AS poliza_titular_id,
        COALESCE(tpol.nombres||' '||tpol.apellidos, tpol.razon_social) AS poliza_titular,
        tpol.telefono          AS poliza_titular_tel,
        -- Sala
        sv.id AS sala_id, sv.nombre AS sala_nombre,
        -- Operador
        u.nombre AS operador_nombre,
        -- Convenio
        conv.nombre AS convenio_nombre, conv.tipo_entidad AS convenio_tipo_entidad,
        conv.nit AS convenio_nit, conv.contacto_nombre AS convenio_contacto_nombre,
        conv.contacto_telefono AS convenio_contacto_telefono, conv.contacto_email AS convenio_contacto_email,
        convAut.nombre AS convenio_autorizacion_nombre,
        defu.acta_defuncion_soporte_url, defu.permiso_inhumacion_soporte_url
      FROM servicios_funerarios sf
      LEFT JOIN contratos c           ON c.id   = sf.contrato_id
      LEFT JOIN terceros dif          ON dif.id  = sf.difunto_id
      LEFT JOIN defunciones defu      ON defu.tercero_id = sf.difunto_id
      LEFT JOIN tipos_documento td    ON td.id   = dif.tipo_documento_id
      LEFT JOIN geo_municipios gm     ON gm.id   = dif.municipio_id
      LEFT JOIN geo_departamentos gd  ON gd.id   = dif.departamento_id
      LEFT JOIN geo_municipios gn     ON gn.id   = dif.municipio_nac_id
      LEFT JOIN terceros cont         ON cont.id  = c.contratante_id
      LEFT JOIN tipos_documento tdc   ON tdc.id   = cont.tipo_documento_id
      LEFT JOIN geo_municipios gmc    ON gmc.id   = cont.municipio_id
      LEFT JOIN geo_departamentos gdc ON gdc.id   = cont.departamento_id
      LEFT JOIN polizas pol           ON pol.id   = sf.poliza_id
      LEFT JOIN planes_poliza ppl     ON ppl.id   = pol.plan_id
      LEFT JOIN terceros tpol         ON tpol.id  = pol.titular_id
      LEFT JOIN salas_velacion sv     ON sv.id   = sf.sala_id
      LEFT JOIN usuarios u            ON u.id    = sf.usuario_id
      LEFT JOIN convenios conv        ON conv.id = sf.convenio_id
      LEFT JOIN convenio_autorizaciones convAut ON convAut.id = sf.convenio_autorizacion_id
      LEFT JOIN terceros contConv     ON contConv.id = sf.contratante_convenio_id
      LEFT JOIN tipos_documento tdcc  ON tdcc.id  = contConv.tipo_documento_id
      LEFT JOIN geo_municipios gmcc   ON gmcc.id  = contConv.municipio_id
      LEFT JOIN geo_departamentos gdcc ON gdcc.id = contConv.departamento_id
      WHERE sf.id = $1`, [id]),
    pool.query(`
      SELECT tr.*, v.placa AS vehiculo_placa, v.marca AS vehiculo_marca, v.modelo AS vehiculo_modelo,
        c.nombre AS conductor_nombre, c.telefono AS conductor_telefono
      FROM traslados tr
      LEFT JOIN flota_vehiculos v ON v.id = tr.vehiculo_id
      LEFT JOIN flota_conductores c ON c.id = tr.conductor_id
      WHERE tr.servicio_id = $1 ORDER BY tr.fecha_hora NULLS LAST`, [id]),
    pool.query(`
      SELECT i.*, sc.codigo AS catalogo_codigo, sc.categoria
      FROM items_servicio i
      LEFT JOIN servicios_catalogo sc ON sc.id = i.catalogo_id
      WHERE i.servicio_id = $1 ORDER BY i.creado_en
    `, [id]),
    pool.query(`
      SELECT ot.*, u.nombre AS responsable_nombre
      FROM ordenes_tanatopraxia ot
      LEFT JOIN usuarios u ON u.id = ot.responsable_id
      WHERE ot.servicio_id = $1 LIMIT 1`, [id]),
    pool.query(`
      SELECT d.*,
        gmd.nombre AS municipio_nombre,
        gdd.nombre AS departamento_nombre
      FROM defunciones d
      LEFT JOIN geo_municipios gmd    ON gmd.id = d.municipio_id
      LEFT JOIN geo_departamentos gdd ON gdd.id = d.departamento_id
      WHERE d.tercero_id = (SELECT difunto_id FROM servicios_funerarios WHERE id = $1)
    `, [id]),
    pool.query(`
      SELECT pb.parentesco, pb.ejecutado, pb.fecha_ejecucion,
        COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS beneficiario_nombre,
        t.numero_documento AS beneficiario_documento
      FROM poliza_beneficiarios pb
      JOIN terceros t ON t.id = pb.tercero_id
      WHERE pb.servicio_id = $1 LIMIT 1
    `, [id]),
    pool.query(`
      SELECT tm.*, p.nombre AS producto_nombre, p.codigo_sku AS producto_sku, p.unidad_medida
      FROM tanatopraxia_materiales tm
      JOIN inv_productos p ON p.id = tm.producto_id
      JOIN ordenes_tanatopraxia ot ON ot.id = tm.tanatopraxia_id
      WHERE ot.servicio_id = $1
      ORDER BY tm.creado_en
    `, [id]),
  ])

  if (!sfRes.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado' })

  return reply.send({
    data: {
      ...sfRes.rows[0],
      defuncion:           defRes.rows[0] || null,
      traslados:           trasRes.rows,
      items:               itemsRes.rows,
      tanatopraxia:        tanaRes.rows[0] ? { ...tanaRes.rows[0], materiales: tanaMatRes.rows } : null,
      poliza_beneficiario: benRes.rows[0] || null,
    },
  })
}

// ── Crear ─────────────────────────────────────────────────────────────────

// ── Ítems de catálogo cubiertos por una póliza ───────────────────────────
// Se leen desde servicios_incluidos, congelado en la póliza al momento de
// la venta (migración 061) — no desde el plan en vivo, para que editar el
// plan después no cambie retroactivamente lo que esta póliza ya cubre.
// El precio se re-consulta en servicios_catalogo por si cambió desde la venta.
async function itemsDesdePoliza(polizaId, db) {
  const p = await db.query(`SELECT servicios_incluidos FROM polizas WHERE id=$1`, [polizaId])
  if (!p.rows.length) return []
  const ids = (p.rows[0].servicios_incluidos || []).map(s => s.id)
  if (!ids.length) return []

  const res = await db.query(
    `SELECT id, codigo, nombre, precio_base FROM servicios_catalogo WHERE id = ANY($1) AND activo`,
    [ids]
  )
  return res.rows
}

// ── Preview plan (para mostrar en frontend antes de crear) ─────────────────
export async function previewPlan(req, reply) {
  const { poliza_id } = req.params
  const polRes = await pool.query(`SELECT id FROM polizas WHERE id=$1`, [poliza_id])
  if (!polRes.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })

  const db = await pool.connect()
  try {
    const items = await itemsDesdePoliza(poliza_id, db)
    const total = items.reduce((s, i) => s + Number(i.precio_base), 0)
    return reply.send({ data: { items, total } })
  } finally { db.release() }
}

export async function crear(req, reply) {
  const {
    // vínculo: contrato, póliza o convenio
    contrato_id, poliza_id, beneficiario_id,
    convenio_id, convenio_autorizacion_id, convenio_numero_autorizacion,
    convenio_valor_servicio, convenio_observaciones, contratante_convenio_id,
    contratante_id, parentesco,
    difunto_id, tipo_disposicion = 'INHUMACION',
    sala_id, fecha_velacion_ini, fecha_velacion_fin,
    lugar_recogida, fecha_recogida,
    lugar_disposicion, fecha_disposicion,
    acta_defuncion, permiso_inhumacion,
    observaciones,
  } = req.body

  if (!difunto_id) return reply.code(400).send({ error: 'difunto_id es obligatorio' })

  // ── Validar contrato (si se proporcionó) ─────────────────────────────────
  if (contrato_id) {
    const cRes = await pool.query(`SELECT id FROM contratos WHERE id = $1`, [contrato_id])
    if (!cRes.rows.length) return reply.code(400).send({ error: 'El contrato no existe' })
  }

  // ── Validar contratante (si se proporcionó sin contrato — servicio directo) ─
  if (contratante_id && !contrato_id) {
    const tRes = await pool.query(`SELECT id FROM terceros WHERE id = $1`, [contratante_id])
    if (!tRes.rows.length) return reply.code(400).send({ error: 'El contratante no existe' })
  }

  // ── Validar convenio (si se proporcionó) — la cobertura SIEMPRE se recalcula
  // en el servidor, nunca se confía en un valor_cubierto que mande el cliente ──
  let convenioCobertura = null
  if (convenio_id) {
    const { sedeIds: sedeIdsConvenio } = resolverSede(req)
    if (!(await convenioPermitido(pool, convenio_id, sedeIdsConvenio))) {
      return reply.code(403).send({ error: 'No tiene acceso a este convenio' })
    }

    const convRes = await pool.query(`SELECT id, activo FROM convenios WHERE id=$1`, [convenio_id])
    if (!convRes.rows.length) return reply.code(400).send({ error: 'El convenio no existe' })
    if (!convRes.rows[0].activo) return reply.code(400).send({ error: 'El convenio está inactivo' })

    if (convenio_autorizacion_id) {
      const autRes = await pool.query(
        `SELECT id FROM convenio_autorizaciones WHERE id=$1 AND convenio_id=$2 AND activo`,
        [convenio_autorizacion_id, convenio_id]
      )
      if (!autRes.rows.length)
        return reply.code(400).send({ error: 'El tipo de autorización no pertenece a este convenio o está inactivo' })
    }

    convenioCobertura = await computeCobertura(pool, {
      convenioId: convenio_id, autorizacionId: convenio_autorizacion_id || null,
      valorServicio: convenio_valor_servicio,
    })
  }

  // ── Validar póliza y beneficiario (si se proporcionó) ────────────────────
  if (poliza_id) {
    if (!beneficiario_id)
      return reply.code(400).send({ error: 'Debe seleccionar qué beneficiario falleció' })

    const eligRes = await pool.query(`
      SELECT p.estado, p.meses_mora, p.fecha_fin_carencia,
        (CURRENT_DATE < p.fecha_fin_carencia) AS en_carencia,
        EXISTS(
          SELECT 1 FROM poliza_beneficiarios pb
          WHERE pb.poliza_id=p.id AND pb.tercero_id=$2 AND pb.activo AND NOT pb.ejecutado
        ) AS es_beneficiario
      FROM polizas p WHERE p.id=$1`, [poliza_id, beneficiario_id]
    )
    if (!eligRes.rows.length)
      return reply.code(404).send({ error: 'Póliza no encontrada' })

    const e = eligRes.rows[0]
    if (e.estado !== 'VIGENTE')
      return reply.code(400).send({ error: `La póliza está ${e.estado}. Solo se ejecutan pólizas VIGENTES.` })
    if (e.en_carencia)
      return reply.code(400).send({ error: `La póliza está en período de carencia hasta ${e.fecha_fin_carencia}.` })
    if (+e.meses_mora > 0)
      return reply.code(400).send({ error: `La póliza tiene ${e.meses_mora} mes(es) de mora. Debe estar al día.` })
    if (!e.es_beneficiario)
      return reply.code(400).send({ error: 'El beneficiario no está activo en esta póliza o ya fue ejecutado.' })
  }

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    // ── Choque de agenda: sala de velación ───────────────────────────────
    if (sala_id && fecha_velacion_ini && fecha_velacion_fin) {
      const choque = await verificarChoqueSala(db, { salaId: sala_id, ini: fecha_velacion_ini, fin: fecha_velacion_fin })
      if (choque) {
        await db.query('ROLLBACK')
        return reply.code(409).send({ error: `La sala ya está reservada para el servicio #${choque.numero} en ese horario.` })
      }
    }

    // ── Servicio directo con contratante nuevo/sin contrato: crear contrato mínimo ──
    let contratoIdFinal = contrato_id || null
    const paquete_id = req.body.paquete_id || null
    if (!contratoIdFinal && contratante_id) {
      let valorPaquete = 0
      if (paquete_id) {
        const pkRes = await db.query(`SELECT precio_base FROM paquetes_servicio WHERE id = $1`, [paquete_id])
        valorPaquete = pkRes.rows[0]?.precio_base || 0
      }
      const contRes = await db.query(`
        INSERT INTO contratos (
          contratante_id, difunto_id, paquete_id, usuario_id,
          valor_total, valor_cuota, estado, tipo_contrato, modalidad, num_cuotas,
          fecha_servicio, sede_id
        ) VALUES ($1,$2,$3,$4,$5,$5,'activo','INMEDIATO','CONTADO',1,CURRENT_DATE,$6)
        RETURNING id`,
        [contratante_id, difunto_id, paquete_id, req.user.id, valorPaquete, sedeParaCrear(req)]
      )
      contratoIdFinal = contRes.rows[0].id
      await db.query(
        `INSERT INTO tercero_roles (tercero_id, rol) VALUES ($1, 'CONTRATANTE')
         ON CONFLICT (tercero_id, rol) DO UPDATE SET activo = TRUE`,
        [contratante_id]
      )
    }

    // ── Insertar servicio ─────────────────────────────────────────────────
    const ins = await db.query(`
      INSERT INTO servicios_funerarios (
        contrato_id, poliza_id, paquete_id, difunto_id, tipo_disposicion,
        sala_id, fecha_velacion_ini, fecha_velacion_fin,
        lugar_recogida, fecha_recogida,
        lugar_disposicion, fecha_disposicion,
        acta_defuncion, permiso_inhumacion,
        observaciones, usuario_id, estado,
        convenio_id, convenio_autorizacion_id, convenio_numero_autorizacion,
        convenio_valor_servicio, convenio_valor_cubierto, convenio_observaciones,
        contratante_convenio_id, convenio_absorbe_resto, sede_id, parentesco
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'RECIBIDO',$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      RETURNING id, numero`,
      [
        contratoIdFinal, poliza_id || null, paquete_id, difunto_id, tipo_disposicion,
        sala_id || null, fecha_velacion_ini || null, fecha_velacion_fin || null,
        lugar_recogida || null, fecha_recogida || null,
        lugar_disposicion || null, fecha_disposicion || null,
        acta_defuncion || null, permiso_inhumacion || null,
        observaciones || null, req.user.id,
        convenio_id || null, convenio_autorizacion_id || null, convenio_numero_autorizacion || null,
        convenio_valor_servicio != null ? +convenio_valor_servicio : null,
        convenioCobertura ? convenioCobertura.valor_cubierto : null,
        convenio_observaciones || null,
        contratante_convenio_id || null,
        convenioCobertura ? convenioCobertura.absorbe_resto : null,
        sedeParaCrear(req),
        parentesco || null,
      ]
    )

    const servicioId = ins.rows[0].id

    // ── Auto-cargar ítems del plan (si viene de póliza) ──────────────────
    if (poliza_id) {
      const polRes = await db.query(`SELECT id FROM polizas WHERE id=$1`, [poliza_id])
      if (polRes.rows.length) {
        const planItems = await itemsDesdePoliza(poliza_id, db)
        // items_extras del body (adicionales que el operador agregó)
        const extras = req.body.items_extras || []
        for (const item of planItems) {
          await db.query(
            `INSERT INTO items_servicio (servicio_id, catalogo_id, descripcion, cantidad, precio_unit, es_cobertura)
             VALUES ($1,$2,$3,1,$4,TRUE)`,
            [servicioId, item.id, item.nombre, item.precio_base]
          )
        }
        for (const ex of extras) {
          await db.query(
            `INSERT INTO items_servicio (servicio_id, catalogo_id, descripcion, cantidad, precio_unit, es_cobertura)
             VALUES ($1,$2,$3,$4,$5,FALSE)`,
            [servicioId, ex.catalogo_id || null, ex.descripcion, ex.cantidad || 1, ex.precio_unit || 0]
          )
        }
      }
    }

    // ── Auto-cargar ítems del paquete (si viene de CONTRATO con paquete) ───
    if (paquete_id && !poliza_id) {
      const pkItems = await db.query(
        `SELECT nombre, categoria, catalogo_id, precio_unitario FROM paquete_items WHERE paquete_id=$1 AND incluido ORDER BY orden`,
        [paquete_id]
      )
      for (const it of pkItems.rows) {
        await db.query(
          `INSERT INTO items_servicio (servicio_id, catalogo_id, descripcion, cantidad, precio_unit, es_cobertura)
           VALUES ($1,$2,$3,1,$4,TRUE)`,
          [servicioId, it.catalogo_id || null, it.nombre, it.precio_unitario || 0]
        )
      }
    }

    // ── Guardar datos de defunción capturados en apertura ────────────────────
    const def = req.body.defuncion
    if (def && def.fecha_fallecimiento) {
      await db.query(`
        INSERT INTO defunciones (
          tercero_id, fecha_fallecimiento, hora_fallecimiento,
          tipo_lugar, lugar_fallecimiento, direccion_fallecimiento,
          causa_fallecimiento, tipo_muerte, medico_certifica, registro_medico
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (tercero_id) DO UPDATE SET
          fecha_fallecimiento  = EXCLUDED.fecha_fallecimiento,
          hora_fallecimiento   = COALESCE(EXCLUDED.hora_fallecimiento,   defunciones.hora_fallecimiento),
          tipo_lugar           = COALESCE(EXCLUDED.tipo_lugar,           defunciones.tipo_lugar),
          lugar_fallecimiento  = COALESCE(EXCLUDED.lugar_fallecimiento,  defunciones.lugar_fallecimiento),
          direccion_fallecimiento = COALESCE(EXCLUDED.direccion_fallecimiento, defunciones.direccion_fallecimiento),
          causa_fallecimiento  = COALESCE(EXCLUDED.causa_fallecimiento,  defunciones.causa_fallecimiento),
          tipo_muerte          = COALESCE(EXCLUDED.tipo_muerte,          defunciones.tipo_muerte),
          medico_certifica     = COALESCE(EXCLUDED.medico_certifica,     defunciones.medico_certifica),
          registro_medico      = COALESCE(EXCLUDED.registro_medico,      defunciones.registro_medico)`,
        [
          difunto_id,
          def.fecha_fallecimiento,
          def.hora_fallecimiento   || null,
          def.tipo_lugar           || null,
          def.lugar_fallecimiento  || null,
          def.direccion_fallecimiento || null,
          def.causa_fallecimiento  || null,
          def.tipo_muerte          || null,
          def.medico_certifica     || null,
          def.registro_medico      || null,
        ]
      )
    }

    // ── Si viene de póliza → ejecutar beneficiario ────────────────────────
    if (poliza_id && beneficiario_id) {
      const benUpd = await db.query(`
        UPDATE poliza_beneficiarios
        SET ejecutado=TRUE, fecha_ejecucion=CURRENT_DATE, servicio_id=$1
        WHERE poliza_id=$2 AND tercero_id=$3 AND activo AND NOT ejecutado
        RETURNING id`, [servicioId, poliza_id, beneficiario_id]
      )
      if (!benUpd.rows.length) {
        await db.query('ROLLBACK')
        return reply.code(400).send({ error: 'No se pudo ejecutar el beneficiario (ya ejecutado o inactivo)' })
      }
      // Si no quedan beneficiarios disponibles → marcar póliza EJECUTADA
      const restantes = await db.query(`
        SELECT COUNT(*) FROM poliza_beneficiarios
        WHERE poliza_id=$1 AND activo AND NOT ejecutado`, [poliza_id]
      )
      if (+restantes.rows[0].count === 0) {
        await db.query(`UPDATE polizas SET estado='EJECUTADA', actualizado=NOW() WHERE id=$1`, [poliza_id])
      }
    }

    // ── Asignar rol DIFUNTO ───────────────────────────────────────────────
    await db.query(`
      INSERT INTO tercero_roles (tercero_id, rol)
      VALUES ($1, 'DIFUNTO')
      ON CONFLICT (tercero_id, rol) DO UPDATE SET activo = TRUE`,
      [difunto_id]
    )

    // ── Registrar defunción ───────────────────────────────────────────────
    const fechaFallecimiento = req.body.fecha_fallecimiento || fecha_recogida || new Date().toISOString().split('T')[0]
    await db.query(`
      INSERT INTO defunciones (tercero_id, fecha_fallecimiento)
      VALUES ($1, $2)
      ON CONFLICT (tercero_id) DO UPDATE SET
        fecha_fallecimiento = EXCLUDED.fecha_fallecimiento
      WHERE defunciones.fecha_fallecimiento IS NULL`,
      [difunto_id, fechaFallecimiento]
    )

    // ── Cartera: lo que autoriza el convenio y el excedente NUNCA los       ──
    // absorbe la funeraria — quedan como cuentas por cobrar (ver módulo       ──
    // "Cartera de terceros"), salvo que el convenio marque absorbe_resto      ──
    // = 'FUNERARIA' (excepción explícita).
    if (convenio_id) {
      const difRes = await db.query(`SELECT nombres, apellidos FROM terceros WHERE id=$1`, [difunto_id])
      const nombreServicio = difRes.rows[0] ? `${difRes.rows[0].nombres} ${difRes.rows[0].apellidos}` : null
      await sincronizarCartera(db, {
        servicioId: servicioId,
        sedeId: sedeParaCrear(req),
        convenioId: convenio_id,
        contratanteConvenioId: contratante_convenio_id || null,
        valorCubierto: convenioCobertura ? convenioCobertura.valor_cubierto : 0,
        absorbeResto: convenioCobertura ? convenioCobertura.absorbe_resto : null,
        valorServicio: convenio_valor_servicio != null ? +convenio_valor_servicio : 0,
        nombreServicio,
      })
    }

    await db.query('COMMIT')
    return reply.code(201).send({ data: ins.rows[0] })
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  } finally {
    db.release()
  }
}

// ── Actualizar ────────────────────────────────────────────────────────────

export async function actualizar(req, reply) {
  const { id } = req.params
  const {
    tipo_disposicion, sala_id,
    fecha_velacion_ini, fecha_velacion_fin,
    lugar_recogida, fecha_recogida,
    lugar_disposicion, fecha_disposicion,
    acta_defuncion, permiso_inhumacion,
    tramites_completos, observaciones, parentesco,
  } = req.body

  // ── Choque de agenda: sala de velación (considerando campos ya guardados) ──
  if (sala_id !== undefined || fecha_velacion_ini !== undefined || fecha_velacion_fin !== undefined) {
    const actual = await pool.query(
      `SELECT sala_id, fecha_velacion_ini, fecha_velacion_fin FROM servicios_funerarios WHERE id=$1`, [id]
    )
    if (actual.rows.length) {
      const efectivo = {
        salaId: sala_id || actual.rows[0].sala_id,
        ini: fecha_velacion_ini || actual.rows[0].fecha_velacion_ini,
        fin: fecha_velacion_fin || actual.rows[0].fecha_velacion_fin,
      }
      const choque = await verificarChoqueSala(pool, { ...efectivo, excluirId: id })
      if (choque) return reply.code(409).send({ error: `La sala ya está reservada para el servicio #${choque.numero} en ese horario.` })
    }
  }

  const res = await pool.query(`
    UPDATE servicios_funerarios SET
      tipo_disposicion   = COALESCE($1,  tipo_disposicion),
      sala_id            = COALESCE($2,  sala_id),
      fecha_velacion_ini = COALESCE($3,  fecha_velacion_ini),
      fecha_velacion_fin = COALESCE($4,  fecha_velacion_fin),
      lugar_recogida     = COALESCE($5,  lugar_recogida),
      fecha_recogida     = COALESCE($6,  fecha_recogida),
      lugar_disposicion  = COALESCE($7,  lugar_disposicion),
      fecha_disposicion  = COALESCE($8,  fecha_disposicion),
      acta_defuncion     = COALESCE($9,  acta_defuncion),
      permiso_inhumacion = COALESCE($10, permiso_inhumacion),
      tramites_completos = COALESCE($11, tramites_completos),
      observaciones      = COALESCE($12, observaciones),
      parentesco         = COALESCE($14, parentesco),
      actualizado        = NOW()
    WHERE id = $13 AND estado NOT IN ('COMPLETADO','CANCELADO')
    RETURNING id`,
    [
      tipo_disposicion || null, sala_id || null,
      fecha_velacion_ini || null, fecha_velacion_fin || null,
      lugar_recogida || null, fecha_recogida || null,
      lugar_disposicion || null, fecha_disposicion || null,
      acta_defuncion || null, permiso_inhumacion || null,
      tramites_completos ?? null, observaciones || null, id, parentesco || null,
    ]
  )

  if (!res.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado o ya finalizado' })
  await audit(id, req.user?.id, 'info', 'Actualizó información general del servicio')
  return reply.send({ data: res.rows[0] })
}

// ── Cambiar estado ────────────────────────────────────────────────────────

// Transiciones válidas de la máquina de estados del servicio
const TRANSICIONES = {
  RECIBIDO:  ['EN_CURSO', 'CANCELADO'],
  EN_CURSO:  ['COMPLETADO', 'CANCELADO'],
  COMPLETADO: [],
  CANCELADO:  [],
}

export async function cambiarEstado(req, reply) {
  const { id } = req.params
  const { estado } = req.body
  const validos = ['RECIBIDO','EN_CURSO','COMPLETADO','CANCELADO']
  if (!validos.includes(estado)) return reply.code(400).send({ error: 'Estado inválido' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    // Verificar estado actual antes de transicionar
    const actual = await db.query(
      `SELECT id, estado, contrato_id FROM servicios_funerarios WHERE id=$1`, [id]
    )
    if (!actual.rows.length) { await db.query('ROLLBACK'); return reply.code(404).send({ error: 'No encontrado' }) }

    const estadoActual = actual.rows[0].estado
    if (!TRANSICIONES[estadoActual]?.includes(estado)) {
      await db.query('ROLLBACK')
      return reply.code(400).send({
        error: `No se puede pasar de ${estadoActual} a ${estado}. Transiciones válidas: ${TRANSICIONES[estadoActual]?.join(', ') || 'ninguna'}`
      })
    }

    const res = await db.query(
      `UPDATE servicios_funerarios SET estado=$1, actualizado=NOW() WHERE id=$2 RETURNING id, contrato_id`,
      [estado, id]
    )
    if (!res.rows.length) { await db.query('ROLLBACK'); return reply.code(404).send({ error: 'No encontrado' }) }

    // Si se completa el servicio → marcar contrato como completado
    if (estado === 'COMPLETADO') {
      await db.query(
        `UPDATE contratos SET estado='completado', actualizado=NOW() WHERE id=$1`,
        [res.rows[0].contrato_id]
      )
    }
    await db.query('COMMIT')
    const LABELS = { RECIBIDO:'Recibido', EN_CURSO:'En curso', COMPLETADO:'Completado', CANCELADO:'Cancelado' }
    await audit(id, req.user?.id, 'estado', `Cambió estado a "${LABELS[estado] || estado}"`)
    return reply.send({ data: res.rows[0] })
  } catch (e) {
    await db.query('ROLLBACK'); throw e
  } finally { db.release() }
}

// ── Traslados ─────────────────────────────────────────────────────────────

export async function agregarTraslado(req, reply) {
  const { id } = req.params
  const {
    tipo, origen, destino, fecha_hora, vehiculo_id, conductor_id,
    origen_lat, origen_lon, destino_lat, destino_lon,
  } = req.body
  if (!tipo) return reply.code(400).send({ error: 'tipo de traslado es obligatorio' })

  if (fecha_hora && (vehiculo_id || conductor_id)) {
    const choque = await verificarChoqueTraslado(pool, { vehiculoId: vehiculo_id, conductorId: conductor_id, fechaHora: fecha_hora })
    if (choque) {
      return reply.code(409).send({
        error: `El vehículo/conductor ya tiene un traslado asignado cerca de ese horario (servicio #${choque.servicio_numero}, ${BUFFER_TRASLADO_MIN} min de margen mínimo).`
      })
    }
  }

  const res = await pool.query(`
    INSERT INTO traslados (
      servicio_id, tipo, origen, destino, fecha_hora, vehiculo_id, conductor_id,
      origen_lat, origen_lon, destino_lat, destino_lon
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [id, tipo, origen||null, destino||null, fecha_hora||null, vehiculo_id||null, conductor_id||null,
     origen_lat ?? null, origen_lon ?? null, destino_lat ?? null, destino_lon ?? null]
  )
  await audit(id, req.user?.id, 'traslados', `Registró traslado de tipo "${tipo}"`, { origen, destino })
  return reply.code(201).send({ data: res.rows[0] })
}

export async function actualizarTraslado(req, reply) {
  const { id, trasladoId } = req.params
  const {
    tipo, origen, destino, fecha_hora, vehiculo_id, conductor_id,
    origen_lat, origen_lon, destino_lat, destino_lon,
  } = req.body

  if (fecha_hora && (vehiculo_id || conductor_id)) {
    const choque = await verificarChoqueTraslado(pool, {
      vehiculoId: vehiculo_id, conductorId: conductor_id, fechaHora: fecha_hora, excluirId: trasladoId,
    })
    if (choque) {
      return reply.code(409).send({
        error: `El vehículo/conductor ya tiene un traslado asignado cerca de ese horario (servicio #${choque.servicio_numero}, ${BUFFER_TRASLADO_MIN} min de margen mínimo).`
      })
    }
  }

  const res = await pool.query(`
    UPDATE traslados SET
      tipo         = COALESCE($1, tipo),
      origen       = $2,
      destino      = $3,
      fecha_hora   = $4,
      vehiculo_id  = $5,
      conductor_id = $6,
      origen_lat   = $9,
      origen_lon   = $10,
      destino_lat  = $11,
      destino_lon  = $12
    WHERE id = $7 AND servicio_id = $8 RETURNING *`,
    [tipo || null, origen || null, destino || null, fecha_hora || null,
     vehiculo_id || null, conductor_id || null, trasladoId, id,
     origen_lat ?? null, origen_lon ?? null, destino_lat ?? null, destino_lon ?? null]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Traslado no encontrado' })
  await audit(id, req.user?.id, 'traslados', 'Actualizó datos del traslado', { origen, destino })
  return reply.send({ data: res.rows[0] })
}

export async function completarTraslado(req, reply) {
  const { trasladoId } = req.params
  const res = await pool.query(
    `UPDATE traslados SET completado=TRUE WHERE id=$1 RETURNING id`, [trasladoId]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Traslado no encontrado' })
  await audit(req.params.id, req.user?.id, 'traslados', 'Marcó traslado como completado')
  return reply.send({ data: res.rows[0] })
}

// ── Stats ─────────────────────────────────────────────────────────────────

export async function stats(req, reply) {
  const { sedeIds } = resolverSede(req)
  const res = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE estado = 'RECIBIDO')   AS recibidos,
      COUNT(*) FILTER (WHERE estado = 'EN_CURSO')   AS en_curso,
      COUNT(*) FILTER (WHERE estado = 'COMPLETADO') AS completados,
      COUNT(*) FILTER (WHERE estado = 'CANCELADO')  AS cancelados,
      COUNT(*) FILTER (WHERE tipo_disposicion = 'INHUMACION') AS inhumaciones,
      COUNT(*) FILTER (WHERE tipo_disposicion = 'CREMACION')  AS cremaciones,
      COUNT(*) FILTER (WHERE tramites_completos = FALSE AND estado NOT IN ('COMPLETADO','CANCELADO')) AS tramites_pendientes
    FROM servicios_funerarios
    WHERE ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))
  `, [sedeIds])
  return reply.send({ data: res.rows[0] })
}

// ── Salas ─────────────────────────────────────────────────────────────────

export async function salas(req, reply) {
  const { sedeIds } = resolverSede(req)
  const { ini, fin, excluir_id } = req.query
  const params = sedeIds ? [sedeIds] : []
  const where = sedeIds ? 'WHERE sv.sede_id = ANY($1::uuid[])' : ''
  const iniIdx = params.push(ini || null)
  const finIdx = params.push(fin || null)
  const excluirIdx = params.push(excluir_id || null)
  const res = await pool.query(
    `SELECT sv.id, sv.nombre, sv.capacidad, sv.activa, sv.sede_id, se.nombre AS sede_nombre,
       EXISTS (
         SELECT 1 FROM servicios_funerarios sf
         WHERE sf.sala_id = sv.id
           AND sf.estado NOT IN ('CANCELADO')
           AND sf.id != COALESCE($${excluirIdx}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
           AND sf.fecha_velacion_ini IS NOT NULL AND sf.fecha_velacion_fin IS NOT NULL
           AND $${iniIdx}::timestamptz IS NOT NULL AND $${finIdx}::timestamptz IS NOT NULL
           AND sf.fecha_velacion_ini < $${finIdx}::timestamptz AND sf.fecha_velacion_fin > $${iniIdx}::timestamptz
       ) AS ocupada
     FROM salas_velacion sv LEFT JOIN sedes se ON se.id = sv.sede_id
     ${where} ORDER BY sv.nombre`,
    params
  )
  return reply.send({ data: res.rows })
}

export async function crearSala(req, reply) {
  const { nombre, capacidad = 30 } = req.body
  if (!nombre?.trim()) return reply.code(400).send({ error: 'nombre es obligatorio' })
  const res = await pool.query(
    `INSERT INTO salas_velacion (nombre, capacidad, sede_id) VALUES ($1,$2,$3) RETURNING *`,
    [nombre.trim(), Number(capacidad), sedeParaCrear(req)]
  )
  return reply.code(201).send({ data: res.rows[0] })
}

export async function actualizarSala(req, reply) {
  const { id } = req.params
  const { nombre, capacidad } = req.body
  const res = await pool.query(
    `UPDATE salas_velacion SET
       nombre    = COALESCE($1, nombre),
       capacidad = COALESCE($2, capacidad)
     WHERE id = $3 RETURNING *`,
    [nombre?.trim() || null, capacidad ? Number(capacidad) : null, id]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Sala no encontrada' })
  return reply.send({ data: res.rows[0] })
}

export async function toggleSala(req, reply) {
  const { id } = req.params
  const { activa } = req.body
  const res = await pool.query(
    `UPDATE salas_velacion SET activa=$1 WHERE id=$2 RETURNING *`,
    [Boolean(activa), id]
  )
  if (!res.rows.length) return reply.code(404).send({ error: 'Sala no encontrada' })
  return reply.send({ data: res.rows[0] })
}

// ── Tanatopraxia ──────────────────────────────────────────────────────────

export async function guardarTanatopraxia(req, reply) {
  const { id } = req.params
  const {
    tipo_servicio = 'BASICA', estado = 'PENDIENTE', responsable_id = null,
    hora_inicio, hora_fin, observaciones = '',
  } = req.body

  const res = await pool.query(`
    INSERT INTO ordenes_tanatopraxia
      (servicio_id, tipo_servicio, estado, responsable_id, hora_inicio, hora_fin, observaciones, usuario_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (servicio_id) DO UPDATE SET
      tipo_servicio = EXCLUDED.tipo_servicio,
      estado        = EXCLUDED.estado,
      responsable_id= EXCLUDED.responsable_id,
      hora_inicio   = EXCLUDED.hora_inicio,
      hora_fin      = EXCLUDED.hora_fin,
      observaciones = EXCLUDED.observaciones,
      actualizado   = NOW()
    RETURNING *
  `, [
    id, tipo_servicio, estado,
    responsable_id || null, hora_inicio || null, hora_fin || null,
    observaciones || null, req.user.id,
  ])

  await audit(id, req.user?.id, 'tanatopraxia', `Guardó tanatopraxia — tipo: ${tipo_servicio}, estado: ${estado}`)
  return reply.send({ data: res.rows[0] })
}

// ── Materiales de tanatopraxia (con descargue de inventario) ──────────────

export async function agregarMaterialTanatopraxia(req, reply) {
  const { id } = req.params
  const { producto_id, cantidad } = req.body
  if (!producto_id || !cantidad || +cantidad <= 0)
    return reply.code(400).send({ error: 'producto_id y cantidad son obligatorios' })

  const tana = await pool.query('SELECT id FROM ordenes_tanatopraxia WHERE servicio_id = $1', [id])
  if (!tana.rows.length)
    return reply.code(400).send({ error: 'Primero guarda la orden de tanatopraxia' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const material = await agregarMaterial(db, {
      tanatopraxiaId: tana.rows[0].id, servicioId: id,
      productoId: producto_id, cantidad: +cantidad, usuarioId: req.user.id,
    })
    await db.query('COMMIT')
    const prod = await pool.query('SELECT nombre FROM inv_productos WHERE id=$1', [producto_id])
    await audit(id, req.user?.id, 'tanatopraxia', `Agregó material: ${prod.rows[0]?.nombre} x${cantidad}`)
    return reply.code(201).send({ data: material })
  } catch (e) {
    await db.query('ROLLBACK')
    return reply.code(e.statusCode || 500).send({ error: e.message })
  } finally { db.release() }
}

export async function eliminarMaterialTanatopraxia(req, reply) {
  const { id, materialId } = req.params
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const material = await eliminarMaterial(db, { materialId })
    await db.query('COMMIT')
    await audit(id, req.user?.id, 'tanatopraxia', 'Eliminó material y repuso inventario')
    return reply.send({ ok: true, data: material })
  } catch (e) {
    await db.query('ROLLBACK')
    return reply.code(e.statusCode || 500).send({ error: e.message })
  } finally { db.release() }
}

// ── Sugerencia de materiales y duración con IA ─────────────────────────────

const DURACION_BASE_HORAS = { BASICA: 2, EMBALSAMAMIENTO: 5, RESTAURACION: 8, ESPECIAL: 10 }

export async function duracionEstimadaTanatopraxia(req, reply) {
  const { tipo_servicio = 'BASICA' } = req.query
  return reply.send({ data: { horas: DURACION_BASE_HORAS[tipo_servicio] ?? 3 } })
}

export async function sugerenciaTanatopraxiaIA(req, reply) {
  const { id } = req.params

  const sf = await pool.query(`
    SELECT sf.tipo_disposicion,
      dif.nombres, dif.apellidos, dif.sexo, dif.fecha_nacimiento
    FROM servicios_funerarios sf
    LEFT JOIN terceros dif ON dif.id = sf.difunto_id
    WHERE sf.id = $1
  `, [id])
  if (!sf.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado' })
  const s = sf.rows[0]

  const defRes = await pool.query(`
    SELECT d.fecha_fallecimiento, d.hora_fallecimiento, d.causa_fallecimiento,
      d.tipo_muerte, d.lugar_fallecimiento, d.tipo_lugar
    FROM defunciones d
    JOIN servicios_funerarios sf ON sf.difunto_id = d.tercero_id
    WHERE sf.id = $1
  `, [id])
  const def = defRes.rows[0] || {}

  const { tipo_servicio = 'BASICA' } = req.body || {}

  const catalogo = await pool.query(`
    SELECT p.id, p.nombre, p.unidad_medida, p.costo_promedio,
      COALESCE(SUM(st.cantidad),0) AS stock_disponible
    FROM inv_productos p
    JOIN inv_categorias c ON c.id = p.categoria_id
    LEFT JOIN inv_stock st ON st.producto_id = p.id
    WHERE p.activo = true AND c.nombre ILIKE '%Preparación%'
    GROUP BY p.id
    ORDER BY p.nombre
  `)

  if (!catalogo.rows.length) {
    return reply.code(400).send({ error: 'No hay insumos de preparación activos en el catálogo de inventario' })
  }

  if (!anthropic) {
    return reply.code(400).send({ error: 'ANTHROPIC_API_KEY no está configurada en el servidor' })
  }

  const edad = s.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(s.fecha_nacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const horasDesdeDefuncion = (def.fecha_fallecimiento)
    ? Math.round((Date.now() - new Date(`${def.fecha_fallecimiento.toISOString().split('T')[0]}T${def.hora_fallecimiento || '00:00:00'}`).getTime()) / 3600000)
    : null

  const contexto = {
    tipo_servicio,
    tipo_disposicion: s.tipo_disposicion,
    difunto: {
      sexo: s.sexo || 'no registrado',
      edad_anios: edad,
      causa_fallecimiento: def.causa_fallecimiento || 'no registrada',
      tipo_muerte: def.tipo_muerte || 'no registrado',
      lugar_fallecimiento: def.tipo_lugar || 'no registrado',
      horas_transcurridas_desde_fallecimiento: horasDesdeDefuncion,
    },
    catalogo_disponible: catalogo.rows.map(p => ({
      producto_id: p.id, nombre: p.nombre, unidad: p.unidad_medida,
      costo_unitario: +p.costo_promedio, stock_disponible: +p.stock_disponible,
    })),
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1200,
      thinking: { type: 'adaptive' },
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              duracion_estimada_horas: { type: 'number' },
              materiales: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    producto_id: { type: 'string', enum: catalogo.rows.map(p => p.id) },
                    cantidad: { type: 'number' },
                    motivo: { type: 'string' },
                  },
                  required: ['producto_id', 'cantidad', 'motivo'],
                  additionalProperties: false,
                },
              },
              costo_minimo_estimado: { type: 'number' },
              explicacion: { type: 'string' },
            },
            required: ['duracion_estimada_horas', 'materiales', 'costo_minimo_estimado', 'explicacion'],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: 'user',
        content: `Eres un tanatopractor experto asesorando a un asistente funerario sobre la preparación de un cuerpo. Con base en esta información, sugiere QUÉ materiales del catálogo disponible usar, en qué cantidad mínima razonable, y el costo mínimo estimado total. Considera especialmente las horas transcurridas desde el fallecimiento (a más tiempo, más conservante se requiere), el tipo de servicio solicitado, y la causa de muerte si aplica. Usa SOLO productos del catálogo dado (por su producto_id exacto). Sé conservador con las cantidades — sugiere lo mínimo necesario, no un máximo. La explicación debe ser breve (2-3 frases, en español, dirigida al personal de la funeraria).\n\nDatos:\n${JSON.stringify(contexto, null, 2)}`,
      }],
    })

    const textBlock = msg.content.find(b => b.type === 'text')
    const sugerencia = textBlock ? JSON.parse(textBlock.text) : null
    if (!sugerencia) return reply.code(502).send({ error: 'La IA no devolvió una sugerencia válida' })

    const materialesConNombre = sugerencia.materiales.map(m => {
      const prod = catalogo.rows.find(p => p.id === m.producto_id)
      return { ...m, producto_nombre: prod?.nombre, unidad: prod?.unidad_medida, stock_disponible: +(prod?.stock_disponible || 0) }
    })

    return reply.send({ data: { ...sugerencia, materiales: materialesConNombre, contexto } })
  } catch (e) {
    const detalle = e.error?.error?.message || e.message
    const mensaje = detalle?.includes('credit balance')
      ? 'La cuenta de IA configurada no tiene saldo disponible. Contacta al administrador del sistema.'
      : 'No se pudo generar la sugerencia con IA. Intenta de nuevo en unos minutos.'
    return reply.code(502).send({ error: mensaje })
  }
}

// ── Checklist de trámites ─────────────────────────────────────────────────

export async function actualizarChecklist(req, reply) {
  const { id } = req.params
  const { checklist, certificado_medico, registro_civil,
          acta_defuncion, permiso_inhumacion } = req.body

  // Calcular si todos los ítems están listos
  const todosCompletos = Array.isArray(checklist) && checklist.every(i => i.done)

  const res = await pool.query(`
    UPDATE servicios_funerarios SET
      checklist           = $1::jsonb,
      certificado_medico  = COALESCE($2, certificado_medico),
      registro_civil      = COALESCE($3, registro_civil),
      acta_defuncion      = COALESCE($4, acta_defuncion),
      permiso_inhumacion  = COALESCE($5, permiso_inhumacion),
      tramites_completos  = $6,
      actualizado         = NOW()
    WHERE id = $7
    RETURNING id, checklist, tramites_completos
  `, [
    JSON.stringify(checklist || []),
    certificado_medico || null,
    registro_civil || null,
    acta_defuncion || null,
    permiso_inhumacion || null,
    todosCompletos,
    id,
  ])

  if (!res.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado' })
  const pct = checklist ? Math.round(checklist.filter(i=>i.done).length / checklist.length * 100) : 0
  await audit(id, req.user?.id, 'tramites', `Actualizó trámites legales (${pct}% completado)`)
  return reply.send({ data: res.rows[0] })
}

// ── Datos para imprimir orden de servicio ────────────────────────────────

export async function ordenImpresion(req, reply) {
  const { id } = req.params

  const [sfRes, trasRes, tanaRes, empRes, itemsRes, defRes] = await Promise.all([
    pool.query(`
      SELECT sf.*,
        COALESCE(dif.nombres||' '||dif.apellidos, dif.razon_social) AS difunto_nombre,
        dif.fecha_nacimiento, dif.rh, dif.numero_documento AS difunto_documento,
        td_dif.sigla AS difunto_tipo_doc,
        COALESCE(
          COALESCE(cont.nombres||' '||cont.apellidos, cont.razon_social),
          COALESCE(tpol.nombres||' '||tpol.apellidos, tpol.razon_social)
        ) AS contratante_nombre,
        COALESCE(cont.telefono, tpol.telefono) AS contratante_tel,
        COALESCE(cont.numero_documento, tpol.numero_documento) AS contratante_cedula,
        COALESCE(td_cont.sigla, td_tpol.sigla) AS contratante_tipo_doc,
        COALESCE(cont.direccion, tpol.direccion) AS contratante_direccion,
        c.numero AS contrato_numero, sv.nombre AS sala_nombre,
        u.nombre AS operador_nombre,
        pol.numero AS poliza_numero, ppl.nombre AS poliza_plan,
        COALESCE(tpol.nombres||' '||tpol.apellidos, tpol.razon_social) AS poliza_titular,
        pol.valor_cuota AS poliza_cuota
      FROM servicios_funerarios sf
      LEFT JOIN contratos c        ON c.id   = sf.contrato_id
      LEFT JOIN terceros dif       ON dif.id  = sf.difunto_id
      LEFT JOIN tipos_documento td_dif  ON td_dif.id = dif.tipo_documento_id
      LEFT JOIN terceros cont      ON cont.id = c.contratante_id
      LEFT JOIN tipos_documento td_cont ON td_cont.id = cont.tipo_documento_id
      LEFT JOIN salas_velacion sv  ON sv.id  = sf.sala_id
      LEFT JOIN usuarios u         ON u.id   = sf.usuario_id
      LEFT JOIN polizas pol        ON pol.id  = sf.poliza_id
      LEFT JOIN planes_poliza ppl  ON ppl.id  = pol.plan_id
      LEFT JOIN terceros tpol      ON tpol.id = pol.titular_id
      LEFT JOIN tipos_documento td_tpol ON td_tpol.id = tpol.tipo_documento_id
      WHERE sf.id = $1`, [id]),
    pool.query(`
      SELECT tr.*, v.placa AS vehiculo_placa, v.marca AS vehiculo_marca, v.modelo AS vehiculo_modelo,
        c.nombre AS conductor_nombre, c.telefono AS conductor_telefono
      FROM traslados tr
      LEFT JOIN flota_vehiculos v ON v.id = tr.vehiculo_id
      LEFT JOIN flota_conductores c ON c.id = tr.conductor_id
      WHERE tr.servicio_id=$1 ORDER BY tr.fecha_hora NULLS LAST`, [id]),
    pool.query(`
      SELECT ot.*, u.nombre AS responsable_nombre
      FROM ordenes_tanatopraxia ot
      LEFT JOIN usuarios u ON u.id = ot.responsable_id
      WHERE ot.servicio_id=$1 LIMIT 1`, [id]),
    pool.query(`SELECT razon_social AS nombre_empresa, COALESCE(nombre_comercial, razon_social) AS nombre_comercial, nit, direccion, telefono_1 AS telefono, email, logo_url, municipio, representante_legal FROM empresa LIMIT 1`),
    pool.query(`
      SELECT i.*, sc.codigo AS catalogo_codigo, sc.categoria
      FROM items_servicio i
      LEFT JOIN servicios_catalogo sc ON sc.id = i.catalogo_id
      WHERE i.servicio_id=$1 ORDER BY i.es_cobertura DESC, i.creado_en`, [id]),
    pool.query(`
      SELECT d.*, gm.nombre AS municipio_nombre, gd.nombre AS departamento_nombre
      FROM defunciones d
      LEFT JOIN geo_municipios gm ON gm.id = d.municipio_id
      LEFT JOIN geo_departamentos gd ON gd.id = d.departamento_id
      WHERE d.tercero_id = (SELECT difunto_id FROM servicios_funerarios WHERE id=$1)`, [id]),
  ])

  if (!sfRes.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado' })

  return reply.send({
    servicio:     sfRes.rows[0],
    traslados:    trasRes.rows,
    tanatopraxia: tanaRes.rows[0] || null,
    empresa:      empRes.rows[0] || {},
    items:        itemsRes.rows,
    defuncion:    defRes.rows[0] || null,
  })
}

export async function buscarCatalogo(req, reply) {
  const { q = '', limit = 10 } = req.query
  if (!q) {
    const r = await pool.query(
      `SELECT id, codigo, nombre, categoria, precio_base
       FROM servicios_catalogo WHERE activo ORDER BY categoria, nombre`
    )
    return reply.send({ data: r.rows })
  }
  const r = await pool.query(
    `SELECT id, codigo, nombre, categoria, precio_base
     FROM servicios_catalogo
     WHERE activo AND (nombre ILIKE $1 OR codigo ILIKE $1 OR categoria ILIKE $1)
     ORDER BY nombre LIMIT $2`,
    [`%${q}%`, Number(limit)]
  )
  return reply.send({ data: r.rows })
}

// ── Recalcular cobertura de convenio (tras cambiar config del convenio) ──────
// Un servicio congela su cobertura al crearse (auditable); esta función permite
// volver a calcularla con la configuración ACTUAL del convenio/autorización,
// por si el operador cambió el % de cobertura, el tope, o quién absorbe el resto
// después de haber creado el servicio.
export async function recalcularConvenioCobertura(req, reply) {
  const { id } = req.params
  const { convenio_valor_servicio } = req.body

  const sfRes = await pool.query(
    `SELECT sf.convenio_id, sf.convenio_autorizacion_id, sf.convenio_valor_servicio,
            sf.contratante_convenio_id, sf.sede_id, t.nombres, t.apellidos
     FROM servicios_funerarios sf LEFT JOIN terceros t ON t.id = sf.difunto_id
     WHERE sf.id=$1`, [id]
  )
  if (!sfRes.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado' })
  const sf = sfRes.rows[0]
  if (!sf.convenio_id) return reply.code(400).send({ error: 'Este servicio no está vinculado a un convenio' })

  const valorServicio = convenio_valor_servicio != null ? convenio_valor_servicio : sf.convenio_valor_servicio
  if (valorServicio == null || +valorServicio <= 0)
    return reply.code(400).send({ error: 'Debe indicar el valor del servicio para poder calcular la cobertura' })

  const resultado = await computeCobertura(pool, {
    convenioId: sf.convenio_id, autorizacionId: sf.convenio_autorizacion_id, valorServicio,
  })
  if (!resultado) return reply.code(400).send({ error: 'El convenio o la autorización ya no existen' })

  await pool.query(`
    UPDATE servicios_funerarios SET
      convenio_valor_servicio = $1, convenio_valor_cubierto = $2, convenio_absorbe_resto = $3, actualizado = NOW()
    WHERE id = $4`,
    [valorServicio, resultado.valor_cubierto, resultado.absorbe_resto, id]
  )
  await sincronizarCartera(pool, {
    servicioId: id, sedeId: sf.sede_id, convenioId: sf.convenio_id,
    contratanteConvenioId: sf.contratante_convenio_id,
    valorCubierto: resultado.valor_cubierto, absorbeResto: resultado.absorbe_resto,
    valorServicio, nombreServicio: sf.nombres ? `${sf.nombres} ${sf.apellidos}` : null,
  })
  await audit(id, req.user?.id, 'convenio', 'Recalculó la cobertura del convenio con la configuración actual')
  return reply.send({ data: resultado })
}

// ── Actualizar ficha del fallecido (tercero + defunción) ─────────────────────

export async function actualizarContratante(req, reply) {
  const { id } = req.params
  const { parentesco } = req.body
  await pool.query(
    `UPDATE servicios_funerarios SET parentesco=$1, actualizado=NOW() WHERE id=$2`,
    [parentesco || null, id]
  )
  await audit(id, req.user?.id, 'contratante', `Actualizó parentesco del contratante: "${parentesco || 'sin especificar'}"`)
  return reply.send({ ok: true })
}

export async function actualizarFallecido(req, reply) {
  const { id } = req.params  // servicio_id
  const b = req.body

  const sfRes = await pool.query(`SELECT difunto_id FROM servicios_funerarios WHERE id=$1`, [id])
  if (!sfRes.rows.length) return reply.code(404).send({ error: 'Servicio no encontrado' })
  const difunto_id = sfRes.rows[0].difunto_id

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    // Actualizar tercero (datos personales del fallecido)
    await db.query(`
      UPDATE terceros SET
        tipo_documento_id   = COALESCE($1::uuid, tipo_documento_id),
        numero_documento    = COALESCE($2, numero_documento),
        fecha_nacimiento    = COALESCE($3::date, fecha_nacimiento),
        sexo                = COALESCE($4, sexo),
        lugar_exp_documento = COALESCE($5, lugar_exp_documento),
        municipio_nac_id    = COALESCE($6::CHAR(5), municipio_nac_id),
        estado_civil        = COALESCE($7, estado_civil),
        tipo_matrimonio     = COALESCE($8, tipo_matrimonio),
        num_hijos           = COALESCE($9::SMALLINT, num_hijos),
        nacionalidad        = COALESCE($10, nacionalidad),
        religion            = COALESCE($11, religion),
        nivel_estudios      = COALESCE($12, nivel_estudios),
        ocupacion           = COALESCE($13, ocupacion),
        seguridad_social    = COALESCE($14, seguridad_social),
        nombre_conyuge      = COALESCE($15, nombre_conyuge),
        nombre_padre        = COALESCE($16, nombre_padre),
        nombre_madre        = COALESCE($17, nombre_madre),
        actualizado         = NOW()
      WHERE id = $18`,
      [
        b.tipo_documento_id   || null,
        b.numero_documento    || null,
        b.fecha_nacimiento    || null,
        b.sexo                || null,
        b.lugar_exp_documento || null,
        b.municipio_nac_id    || null,
        b.estado_civil        || null,
        b.tipo_matrimonio     || null,
        (b.num_hijos !== '' && b.num_hijos != null) ? Number(b.num_hijos) : null,
        b.nacionalidad        || null,
        b.religion            || null,
        b.nivel_estudios      || null,
        b.ocupacion           || null,
        b.seguridad_social    || null,
        b.nombre_conyuge      || null,
        b.nombre_padre        || null,
        b.nombre_madre        || null,
        difunto_id,
      ]
    )

    // Upsert defunción (evento de muerte)
    await db.query(`
      INSERT INTO defunciones (
        tercero_id, fecha_fallecimiento, hora_fallecimiento,
        tipo_lugar, lugar_fallecimiento, direccion_fallecimiento,
        departamento_id, municipio_id,
        causa_fallecimiento, tipo_muerte,
        medico_certifica, registro_medico, cert_defuncion_num,
        licencia_inhumacion, ciudad_registro, notaria,
        serial_registro, fecha_registro, fecha_llegada
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (tercero_id) DO UPDATE SET
        fecha_fallecimiento  = COALESCE(EXCLUDED.fecha_fallecimiento,  defunciones.fecha_fallecimiento),
        hora_fallecimiento   = COALESCE(EXCLUDED.hora_fallecimiento,   defunciones.hora_fallecimiento),
        tipo_lugar           = COALESCE(EXCLUDED.tipo_lugar,           defunciones.tipo_lugar),
        lugar_fallecimiento  = COALESCE(EXCLUDED.lugar_fallecimiento,  defunciones.lugar_fallecimiento),
        direccion_fallecimiento = COALESCE(EXCLUDED.direccion_fallecimiento, defunciones.direccion_fallecimiento),
        departamento_id      = COALESCE(EXCLUDED.departamento_id,      defunciones.departamento_id),
        municipio_id         = COALESCE(EXCLUDED.municipio_id,         defunciones.municipio_id),
        causa_fallecimiento  = COALESCE(EXCLUDED.causa_fallecimiento,  defunciones.causa_fallecimiento),
        tipo_muerte          = COALESCE(EXCLUDED.tipo_muerte,          defunciones.tipo_muerte),
        medico_certifica     = COALESCE(EXCLUDED.medico_certifica,     defunciones.medico_certifica),
        registro_medico      = COALESCE(EXCLUDED.registro_medico,      defunciones.registro_medico),
        cert_defuncion_num   = COALESCE(EXCLUDED.cert_defuncion_num,   defunciones.cert_defuncion_num),
        licencia_inhumacion  = COALESCE(EXCLUDED.licencia_inhumacion,  defunciones.licencia_inhumacion),
        ciudad_registro      = COALESCE(EXCLUDED.ciudad_registro,      defunciones.ciudad_registro),
        notaria              = COALESCE(EXCLUDED.notaria,              defunciones.notaria),
        serial_registro      = COALESCE(EXCLUDED.serial_registro,      defunciones.serial_registro),
        fecha_registro       = COALESCE(EXCLUDED.fecha_registro,       defunciones.fecha_registro),
        fecha_llegada        = COALESCE(EXCLUDED.fecha_llegada,        defunciones.fecha_llegada)`,
      [
        difunto_id,
        b.fecha_fallecimiento || null,
        b.hora_fallecimiento  || null,
        b.tipo_lugar          || null,
        b.lugar_fallecimiento || null,
        b.direccion_fallecimiento || null,
        b.departamento_id     || null,
        b.municipio_id        || null,
        b.causa_fallecimiento || null,
        b.tipo_muerte         || null,
        b.medico_certifica    || null,
        b.registro_medico     || null,
        b.cert_defuncion_num  || null,
        b.licencia_inhumacion || null,
        b.ciudad_registro     || null,
        b.notaria             || null,
        b.serial_registro     || null,
        b.fecha_registro      || null,
        b.fecha_llegada       || null,
      ]
    )

    await db.query('COMMIT')
    await audit(id, req.user?.id, 'fallecido', 'Actualizó datos del fallecido')
    return reply.send({ ok: true })
  } catch (e) {
    await db.query('ROLLBACK')
    req.log.error(e)
    if (e.code === '23505') {
      return reply.code(409).send({ error: 'Ya existe otro tercero registrado con ese tipo y número de documento' })
    }
    return reply.code(500).send({ error: 'Error al actualizar datos del fallecido' })
  } finally {
    db.release()
  }
}

// ── Items del servicio ────────────────────────────────────────────────────────

const fmtCOP_ = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v)

// Valida que agregar/editar un ítem no haga que el total del servicio supere
// lo que el convenio realmente alcanza a cubrir (según su tope). Si lo supera,
// bloquea la operación con un mensaje claro en vez de dejar que la funeraria
// o la familia absorban un excedente silenciosamente cada vez más grande.
async function validarPresupuestoConvenio(servicioId, montoNuevoItem, excluirItemId = null) {
  const sfRes = await pool.query(
    `SELECT convenio_id, convenio_autorizacion_id FROM servicios_funerarios WHERE id=$1`, [servicioId]
  )
  const sf = sfRes.rows[0]
  if (!sf?.convenio_id) return null

  const sumRes = await pool.query(
    `SELECT COALESCE(SUM(subtotal),0) AS total FROM items_servicio WHERE servicio_id=$1 AND id != COALESCE($2,'00000000-0000-0000-0000-000000000000'::uuid)`,
    [servicioId, excluirItemId]
  )
  const totalActual = +sumRes.rows[0].total
  const totalNuevo = totalActual + montoNuevoItem

  const resultado = await computeCobertura(pool, {
    convenioId: sf.convenio_id, autorizacionId: sf.convenio_autorizacion_id, valorServicio: totalNuevo,
  })
  if (!resultado || !resultado.tope_aplicado) return null

  if (resultado.valor_servicio_maximo != null) {
    const disponible = Math.max(0, resultado.valor_servicio_maximo - totalActual)
    return `Su convenio cubre hasta ${fmtCOP_(resultado.valor_servicio_maximo)} en total con esta autorización. `
      + `Ya lleva ${fmtCOP_(totalActual)} en ítems — le queda ${fmtCOP_(disponible)} de margen. `
      + `Por favor agregue un servicio que se ajuste a su convenio, o quite algún ítem existente.`
  }
  return `Este ítem hace que el servicio supere el tope de cobertura del convenio (${fmtCOP_(resultado.tope_maximo)}). `
    + `Ajuste el valor o quite algún ítem existente.`
}

// Mantiene sincronizada la cobertura del convenio con el valor REAL de los
// ítems agregados al servicio (en vez de un valor tipiado a mano que se
// desactualiza). Se llama después de crear/editar/eliminar un ítem.
async function sincronizarCoberturaConvenio(servicioId) {
  const sfRes = await pool.query(
    `SELECT sf.convenio_id, sf.convenio_autorizacion_id, sf.contratante_convenio_id, sf.sede_id,
            t.nombres, t.apellidos
     FROM servicios_funerarios sf LEFT JOIN terceros t ON t.id = sf.difunto_id
     WHERE sf.id=$1`, [servicioId]
  )
  const sf = sfRes.rows[0]
  if (!sf?.convenio_id) return

  const sumRes = await pool.query(
    `SELECT COALESCE(SUM(subtotal),0) AS total FROM items_servicio WHERE servicio_id=$1`, [servicioId]
  )
  const valorServicio = +sumRes.rows[0].total

  const resultado = await computeCobertura(pool, {
    convenioId: sf.convenio_id, autorizacionId: sf.convenio_autorizacion_id, valorServicio,
  })
  if (!resultado) return

  await pool.query(`
    UPDATE servicios_funerarios SET
      convenio_valor_servicio = $1, convenio_valor_cubierto = $2, convenio_absorbe_resto = $3
    WHERE id = $4`,
    [valorServicio, resultado.valor_cubierto, resultado.absorbe_resto, servicioId]
  )
  await sincronizarCartera(pool, {
    servicioId, sedeId: sf.sede_id, convenioId: sf.convenio_id,
    contratanteConvenioId: sf.contratante_convenio_id,
    valorCubierto: resultado.valor_cubierto, absorbeResto: resultado.absorbe_resto,
    valorServicio, nombreServicio: sf.nombres ? `${sf.nombres} ${sf.apellidos}` : null,
  })
}

export async function agregarItem(req, reply) {
  const { id } = req.params
  const { catalogo_id, descripcion, cantidad = 1, precio_unit, es_cobertura = false } = req.body

  // Si el servicio viene de un convenio con catálogo restringido, validar que el
  // ítem esté autorizado (si el convenio no tiene ítems configurados, no hay restricción)
  if (catalogo_id) {
    const sfRes = await pool.query(`SELECT convenio_id FROM servicios_funerarios WHERE id=$1`, [id])
    const convenioId = sfRes.rows[0]?.convenio_id
    if (convenioId) {
      const restrRes = await pool.query(`SELECT COUNT(*) FROM convenio_items WHERE convenio_id=$1`, [convenioId])
      if (+restrRes.rows[0].count > 0) {
        const permitido = await pool.query(
          `SELECT 1 FROM convenio_items WHERE convenio_id=$1 AND catalogo_id=$2`, [convenioId, catalogo_id]
        )
        if (!permitido.rows.length)
          return reply.code(400).send({ error: 'Este ítem no está autorizado por el convenio de este servicio.' })
      }
    }
  }

  // Si viene catalogo_id, tomar descripcion y precio del catálogo si no se especifican
  let desc = descripcion, precio = precio_unit
  if (catalogo_id && (!desc || precio == null)) {
    const sc = await pool.query('SELECT nombre, precio_base FROM servicios_catalogo WHERE id=$1', [catalogo_id])
    if (sc.rows.length) {
      desc  = desc  || sc.rows[0].nombre
      precio = precio != null ? precio : sc.rows[0].precio_base
    }
  }
  if (!desc) return reply.code(400).send({ error: 'Descripción es obligatoria' })

  // No dejar que este ítem haga que el servicio supere lo que el convenio cubre
  const errorPresupuesto = await validarPresupuestoConvenio(id, +cantidad * +(precio || 0))
  if (errorPresupuesto) return reply.code(400).send({ error: errorPresupuesto })

  const r = await pool.query(
    `INSERT INTO items_servicio (servicio_id, catalogo_id, descripcion, cantidad, precio_unit, es_cobertura)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, catalogo_id || null, desc, cantidad, precio || 0, es_cobertura]
  )
  await audit(id, req.user?.id, 'items', `Agregó ítem: "${desc}"${es_cobertura ? ' (cobertura póliza)' : ''}`)
  await sincronizarCoberturaConvenio(id)
  return reply.code(201).send({ data: r.rows[0] })
}

export async function actualizarItem(req, reply) {
  const { id, itemId } = req.params
  const { descripcion, cantidad, precio_unit } = req.body

  const actual = await pool.query(`SELECT cantidad, precio_unit FROM items_servicio WHERE id=$1 AND servicio_id=$2`, [itemId, id])
  if (!actual.rows.length) return reply.code(404).send({ error: 'Ítem no encontrado' })
  const nuevaCantidad = cantidad ?? actual.rows[0].cantidad
  const nuevoPrecio = precio_unit ?? actual.rows[0].precio_unit

  const errorPresupuesto = await validarPresupuestoConvenio(id, +nuevaCantidad * +nuevoPrecio, itemId)
  if (errorPresupuesto) return reply.code(400).send({ error: errorPresupuesto })

  const r = await pool.query(
    `UPDATE items_servicio SET
       descripcion = COALESCE($1, descripcion),
       cantidad    = COALESCE($2, cantidad),
       precio_unit = COALESCE($3, precio_unit)
     WHERE id=$4 AND servicio_id=$5 RETURNING *`,
    [descripcion || null, cantidad ?? null, precio_unit ?? null, itemId, id]
  )
  if (!r.rows.length) return reply.code(404).send({ error: 'Ítem no encontrado' })
  await audit(id, req.user?.id, 'items', `Editó ítem: "${r.rows[0].descripcion}"`)
  await sincronizarCoberturaConvenio(id)
  return reply.send({ data: r.rows[0] })
}

export async function eliminarItem(req, reply) {
  const { id, itemId } = req.params
  const r = await pool.query('SELECT descripcion FROM items_servicio WHERE id=$1', [itemId])
  await pool.query('DELETE FROM items_servicio WHERE id=$1 AND servicio_id=$2', [itemId, id])
  await audit(id, req.user?.id, 'items', `Eliminó ítem: "${r.rows[0]?.descripcion || itemId}"`)
  await sincronizarCoberturaConvenio(id)
  return reply.send({ ok: true })
}

// ── Personal asignado ────────────────────────────────────────────────────────

export async function listarPersonal(req, reply) {
  const { id } = req.params
  const r = await pool.query(
    `SELECT sp.id, sp.rol_servicio, sp.notas, sp.asignado_en,
            u.id AS usuario_id, u.nombre, u.email, u.rol
     FROM servicio_personal sp
     JOIN usuarios u ON u.id = sp.usuario_id
     WHERE sp.servicio_id = $1
     ORDER BY sp.asignado_en`,
    [id]
  )
  return reply.send({ data: r.rows })
}

export async function asignarPersonal(req, reply) {
  const { id } = req.params
  const { usuario_id, rol_servicio, notas } = req.body
  if (!usuario_id || !rol_servicio)
    return reply.code(400).send({ error: 'usuario_id y rol_servicio son obligatorios' })

  const r = await pool.query(
    `INSERT INTO servicio_personal (servicio_id, usuario_id, rol_servicio, notas)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (servicio_id, usuario_id)
       DO UPDATE SET rol_servicio=$3, notas=$4, asignado_en=NOW()
     RETURNING *`,
    [id, usuario_id, rol_servicio, notas || null]
  )
  // obtener nombre del usuario para el log
  const uRes = await pool.query('SELECT nombre FROM usuarios WHERE id=$1', [usuario_id])
  const uNombre = uRes.rows[0]?.nombre || usuario_id
  await audit(id, req.user?.id, 'personal', `Asignó a "${uNombre}" como ${rol_servicio}`)
  return reply.code(201).send({ data: r.rows[0] })
}

export async function quitarPersonal(req, reply) {
  const { id, personalId } = req.params
  const pRes = await pool.query(
    `SELECT u.nombre, sp.rol_servicio FROM servicio_personal sp
     JOIN usuarios u ON u.id=sp.usuario_id WHERE sp.id=$1`, [personalId]
  )
  await pool.query('DELETE FROM servicio_personal WHERE id=$1 AND servicio_id=$2', [personalId, id])
  const p = pRes.rows[0]
  if (p) await audit(id, req.user?.id, 'personal', `Retiró a "${p.nombre}" del rol ${p.rol_servicio}`)
  return reply.send({ ok: true })
}

export async function listarOperadores(req, reply) {
  const r = await pool.query(
    `SELECT id, nombre, email, rol FROM usuarios WHERE activo=true ORDER BY nombre`
  )
  return reply.send({ data: r.rows })
}

// ── Historial de auditoría ────────────────────────────────────────────────────

export async function historialServicio(req, reply) {
  const { id } = req.params
  const r = await pool.query(
    `SELECT sa.id, sa.modulo, sa.accion, sa.metadatos, sa.creado_en,
            u.nombre AS usuario_nombre, u.rol AS usuario_rol
     FROM servicio_auditoria sa
     LEFT JOIN usuarios u ON u.id = sa.usuario_id
     WHERE sa.servicio_id = $1
     ORDER BY sa.creado_en DESC
     LIMIT 200`,
    [id]
  )
  return reply.send({ data: r.rows })
}
