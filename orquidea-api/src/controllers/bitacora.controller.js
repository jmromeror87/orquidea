/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Bitácora (pólizas y servicios)                       ║
 * ║  Archivo         : bitacora.controller.js                               ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Bitácora = notas manuales (texto enriquecido escrito por los usuarios) +
 * eventos automáticos que el sistema ya conoce (pagos, anulaciones,
 * beneficiarios, transferencias, cancelaciones, servicios). Se devuelven
 * juntos en una sola línea de tiempo.
 *
 * El HTML que llega del editor se SANEA aquí (lista blanca de etiquetas y
 * estilos): nunca se guarda <script>, eventos on*, iframes ni imágenes de
 * fuera — solo las subidas a /uploads/bitacora.
 */
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'
import sanitizeHtml from 'sanitize-html'
import pool from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMG_DIR = path.join(__dirname, '..', 'uploads', 'bitacora')
fs.mkdirSync(IMG_DIR, { recursive: true })
const EXT_IMG = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const MAX_IMG = 8 * 1024 * 1024

const TIPOS = new Set(['POLIZA', 'SERVICIO'])
const ADMINS = new Set(['superadmin', 'administrador'])
export const CATEGORIAS = ['NOTA', 'SEGUIMIENTO', 'LLAMADA', 'VISITA', 'RECOGIDA', 'NOVEDAD', 'BENEFICIARIOS', 'PAGOS', 'DOCUMENTOS', 'RECLAMO', 'FAMILIA', 'TRAMITES', 'CEREMONIA']

const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^var\(--[\w-]+\)$/]
const SANEO = {
  allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'span', 'sub', 'sup',
    'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'img', 'code', 'pre',
    'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td', 'label', 'input', 'div'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    mark: ['data-color', 'style'],
    span: ['style'],
    p: ['style'], h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], li: ['style', 'data-checked', 'data-type'],
    ul: ['data-type'], ol: ['start', 'type'],
    td: ['colspan', 'rowspan', 'colwidth', 'style'], th: ['colspan', 'rowspan', 'colwidth', 'style'], col: ['style'],
    input: ['type', 'checked', 'disabled'], label: [], div: [],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: COLOR, 'background-color': COLOR,
      'min-width': [/^\d+px$/], width: [/^\d+px$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  transformTags: {
    a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }),
    // Solo imágenes subidas a la bitácora; se guardan con ruta relativa para
    // que funcionen igual en local y en producción.
    img: (tag, attribs) => {
      const m = String(attribs.src || '').match(/\/uploads\/bitacora\/[\w.-]+$/)
      return m ? { tagName: 'img', attribs: { ...attribs, src: m[0] } } : { tagName: 'span', attribs: {} }
    },
    input: (tag, attribs) => attribs.type === 'checkbox'
      ? { tagName: 'input', attribs: { type: 'checkbox', disabled: 'disabled', ...(attribs.checked !== undefined ? { checked: 'checked' } : {}) } }
      : { tagName: 'span', attribs: {} },
  },
}

const sanear = html => sanitizeHtml(String(html || ''), SANEO).trim()
const aTexto = html => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim()
const vacio = html => !aTexto(html) && !/<img\s/i.test(html)

function validarTipo(req, reply) {
  const tipo = String(req.params.tipo || '').toUpperCase()
  if (!TIPOS.has(tipo)) { reply.code(400).send({ error: 'Tipo de bitácora no válido' }); return null }
  return tipo
}

// ── Línea de tiempo ─────────────────────────────────────────────────────────
export async function listar(req, reply) {
  const tipo = validarTipo(req, reply); if (!tipo) return
  const { id } = req.params

  const notas = await pool.query(`
    SELECT b.*, u.nombre AS usuario_nombre, u.rol AS usuario_rol, ue.nombre AS editado_por_nombre,
      ud.nombre AS eliminado_por_nombre,
      (SELECT COUNT(*)::int FROM bitacora_versiones v WHERE v.bitacora_id = b.id) AS versiones
    FROM bitacora b
    LEFT JOIN usuarios u  ON u.id  = b.usuario_id
    LEFT JOIN usuarios ue ON ue.id = b.editado_por
    LEFT JOIN usuarios ud ON ud.id = b.eliminado_por
    WHERE b.entidad_tipo = $1 AND b.entidad_id = $2
    ORDER BY b.creado_en DESC`, [tipo, id])

  const eventos = tipo === 'POLIZA' ? await eventosPoliza(id) : await eventosServicio(id)
  return reply.send({ data: { notas: notas.rows, eventos, categorias: CATEGORIAS } })
}

const pesos = n => '$' + Math.round(+n || 0).toLocaleString('es-CO')
const fCorta = d => d ? new Date(d).toISOString().slice(0, 10).split('-').reverse().join('/') : ''

// Lo que el sistema ya registró sobre la póliza, como eventos de bitácora
async function eventosPoliza(polizaId) {
  const q = (sql) => pool.query(sql, [polizaId]).then(r => r.rows)
  const [pol, pagos, bens, transf, react, servs, renov] = await Promise.all([
    q(`SELECT p.creado_en, u.nombre AS usuario, pl.nombre AS plan, p.valor_cuota, p.numero, p.observaciones
         FROM polizas p JOIN planes_poliza pl ON pl.id = p.plan_id LEFT JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = $1`),
    q(`SELECT pp.id, pp.numero_recibo, pp.tipo, pp.monto, pp.parcial, pp.mes_correspondiente, pp.periodo_hasta,
              pp.creado_en, pp.anulado, pp.anulado_en, pp.fecha_anulacion, pp.motivo_anulacion,
              u.nombre AS usuario, ua.nombre AS anulado_por
         FROM pagos_poliza pp LEFT JOIN usuarios u ON u.id = pp.usuario_id LEFT JOIN usuarios ua ON ua.id = pp.anulado_por
        WHERE pp.poliza_id = $1`),
    q(`SELECT pb.id, pb.parentesco, pb.creado_en, pb.ejecutado, pb.fecha_ejecucion, pb.activo, pb.es_cambio,
              COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS nombre
         FROM poliza_beneficiarios pb JOIN terceros t ON t.id = pb.tercero_id WHERE pb.poliza_id = $1`),
    q(`SELECT pt.id, pt.creado_en, pt.motivo, u.nombre AS usuario,
              COALESCE(ta.nombres||' '||ta.apellidos, ta.razon_social) AS anterior,
              COALESCE(tn.nombres||' '||tn.apellidos, tn.razon_social) AS nuevo
         FROM poliza_transferencias pt
         LEFT JOIN terceros ta ON ta.id = pt.titular_anterior_id LEFT JOIN terceros tn ON tn.id = pt.titular_nuevo_id
         LEFT JOIN usuarios u ON u.id = pt.usuario_id WHERE pt.poliza_id = $1`),
    q(`SELECT r.*, uc.nombre AS cancelado_por_nombre, ur.nombre AS reactivado_por_nombre
         FROM poliza_reactivaciones r LEFT JOIN usuarios uc ON uc.id = r.cancelado_por LEFT JOIN usuarios ur ON ur.id = r.reactivado_por
        WHERE r.poliza_id = $1`),
    q(`SELECT sf.id, sf.numero, sf.estado, sf.creado_en, sf.fecha_recogida,
              COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS difunto
         FROM servicios_funerarios sf LEFT JOIN terceros t ON t.id = sf.difunto_id WHERE sf.poliza_id = $1`),
    q(`SELECT r.*, u.nombre AS usuario FROM poliza_renovaciones r LEFT JOIN usuarios u ON u.id = r.usuario_id WHERE r.poliza_id = $1`),
  ])

  const ev = []
  const add = (id, fecha, tipo, icono, titulo, detalle, usuario) => fecha && ev.push({ id, fecha, tipo, icono, titulo, detalle, usuario })

  for (const p of pol) {
    add('pol', p.creado_en, 'POLIZA', 'shield', 'Póliza creada', `${p.plan} · cuota ${pesos(p.valor_cuota)}`, p.usuario)
    // Las observaciones del formulario de la póliza también se ven aquí
    if (p.observaciones?.trim()) add('pol-obs', p.creado_en, 'OBSERVACION', 'nota', 'Observaciones de la póliza', p.observaciones.trim(), p.usuario)
  }
  for (const p of pagos) {
    const que = p.tipo === 'AFILIACION' ? 'Afiliación / cambio de beneficiario'
      : `${p.parcial ? 'Abono' : 'Cuota'} del periodo ${fCorta(p.mes_correspondiente)} → ${fCorta(p.periodo_hasta)}`
    add(`pago-${p.id}`, p.creado_en, 'PAGO', 'pago', `Pago registrado · recibo N° ${String(p.numero_recibo).padStart(6, '0')}`, `${que} · ${pesos(p.monto)}`, p.usuario)
    if (p.anulado) add(`anul-${p.id}`, p.anulado_en || p.fecha_anulacion, 'ANULACION', 'anulado',
      `Pago anulado · recibo N° ${String(p.numero_recibo).padStart(6, '0')}`, `${pesos(p.monto)}${p.motivo_anulacion ? ` — ${p.motivo_anulacion}` : ''}`, p.anulado_por)
  }
  for (const b of bens) {
    add(`ben-${b.id}`, b.creado_en, 'BENEFICIARIO', 'persona', `Beneficiario agregado: ${b.nombre}`,
      `Parentesco: ${b.parentesco}${b.es_cambio ? ' · ingresó como cambio de beneficiario' : ''}${!b.activo && !b.ejecutado ? ' · (luego retirado)' : ''}`, null)
    if (b.ejecutado) add(`eje-${b.id}`, b.fecha_ejecucion, 'EJECUCION', 'ejecucion', `Póliza ejecutada por fallecimiento de ${b.nombre}`, `Parentesco: ${b.parentesco}`, null)
  }
  for (const t of transf) add(`tr-${t.id}`, t.creado_en, 'TRANSFERENCIA', 'transfer', 'Titular transferido', `${t.anterior} → ${t.nuevo}${t.motivo ? ` — ${t.motivo}` : ''}`, t.usuario)
  for (const r of react) {
    add(`can-${r.id}`, r.cancelado_en, 'CANCELACION', 'anulado', 'Póliza cancelada', r.motivo_cancelacion || '', r.cancelado_por_nombre)
    add(`rea-${r.id}`, r.reactivado_en, 'REACTIVACION', 'shield', 'Póliza reactivada', r.motivo_reactivacion || '', r.reactivado_por_nombre)
  }
  for (const s of servs) {
    add(`srv-${s.id}`, s.creado_en, 'SERVICIO', 'servicio', `Servicio funerario N° ${s.numero ?? ''} abierto`, `Difunto: ${s.difunto || '—'} · estado ${s.estado}`, null)
    if (s.fecha_recogida) add(`rec-${s.id}`, s.fecha_recogida, 'SERVICIO', 'servicio', 'Recogida del cuerpo', `Servicio N° ${s.numero ?? ''} · ${s.difunto || ''}`, null)
  }
  for (const r of renov) add(`ren-${r.id}`, r.fecha, 'RENOVACION', 'renovacion', 'Renovación anual de la póliza',
    `Cuota ${pesos(r.cuota_anterior)} → ${pesos(r.cuota_nueva)} (+${String(+r.porcentaje).replace('.', ',')} % salario mínimo ${r.anio_smmlv}${r.proyectado ? ', proyectado' : ''})`,
    r.usuario || 'Automática')
  return ev
}

// Lo que el sistema ya registró sobre el servicio funerario (su historial de
// cambios, traslados, tanatopraxia y las fechas clave) como eventos de bitácora
const MODULO_SRV = {
  items: ['SERVICIO_ITEM', 'Servicios del paquete'], personal: ['PERSONAL', 'Personal'], traslados: ['TRASLADO', 'Traslados'],
  tramites: ['TRAMITE', 'Trámites'], documentos: ['DOCUMENTO', 'Documentos'], info: ['SERVICIO', 'Información del servicio'],
  fallecido: ['SERVICIO', 'Datos del fallecido'], contratante: ['SERVICIO', 'Contratante'], tanatopraxia: ['TANATOPRAXIA', 'Tanatopraxia'],
}
const DISPOSICION = { INHUMACION: 'Inhumación', CREMACION: 'Cremación', TRASLADO: 'Traslado' }
const fHora = d => d ? new Date(d).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''

async function eventosServicio(servicioId) {
  const q = (sql) => pool.query(sql, [servicioId]).then(r => r.rows)
  const [srv, audit, tras, tana] = await Promise.all([
    q(`SELECT sf.*, u.nombre AS usuario, sa.nombre AS sala,
              COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS difunto
         FROM servicios_funerarios sf LEFT JOIN usuarios u ON u.id = sf.usuario_id
         LEFT JOIN terceros t ON t.id = sf.difunto_id LEFT JOIN salas_velacion sa ON sa.id = sf.sala_id
        WHERE sf.id = $1`),
    q(`SELECT a.id, a.modulo, a.accion, a.metadatos, a.creado_en, u.nombre AS usuario
         FROM servicio_auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id WHERE a.servicio_id = $1`),
    q(`SELECT id, tipo, origen, destino, fecha_hora, vehiculo, conductor, completado, creado_en FROM traslados WHERE servicio_id = $1`),
    q(`SELECT o.id, o.tipo_servicio, o.estado, o.responsable, o.hora_inicio, o.hora_fin, o.creado_en, u.nombre AS usuario
         FROM ordenes_tanatopraxia o LEFT JOIN usuarios u ON u.id = o.usuario_id WHERE o.servicio_id = $1`),
  ])

  const ev = []
  const add = (id, fecha, tipo, icono, titulo, detalle, usuario) => fecha && ev.push({ id, fecha, tipo, icono, titulo, detalle, usuario })

  for (const s of srv) {
    const disp = DISPOSICION[s.tipo_disposicion] || s.tipo_disposicion || ''
    add('srv', s.creado_en, 'SERVICIO', 'servicio', `Servicio ${s.codigo || 'N° ' + (s.numero ?? '')} abierto`,
      `Difunto: ${s.difunto || '—'}${disp ? ` · ${disp}` : ''}`, s.usuario)
    if (s.observaciones?.trim()) add('srv-obs', s.creado_en, 'OBSERVACION', 'nota', 'Observaciones del servicio', s.observaciones.trim(), s.usuario)
    if (s.fecha_recogida) add('srv-rec', s.fecha_recogida, 'RECOGIDA', 'traslado', 'Recogida del cuerpo', s.lugar_recogida || '', null)
    if (s.fecha_velacion_ini) add('srv-vel', s.fecha_velacion_ini, 'VELACION', 'velacion', 'Inicio de la velación',
      `${s.sala || 'Sala'}${s.fecha_velacion_fin ? ` · hasta ${fHora(s.fecha_velacion_fin)}` : ''}`, null)
    if (s.fecha_disposicion) add('srv-disp', s.fecha_disposicion, 'DISPOSICION', 'disposicion', `${disp || 'Disposición final'}`,
      [s.lugar_disposicion, s.iglesia && `Iglesia: ${s.iglesia}`, s.coro && `Coro: ${s.coro}`].filter(Boolean).join(' · '), null)
  }
  for (const a of audit) {
    const [tipo, area] = MODULO_SRV[a.modulo] || ['SERVICIO', a.modulo || 'Servicio']
    const m = a.metadatos && typeof a.metadatos === 'object' ? a.metadatos : null
    const detalle = m?.origen || m?.destino ? `${m.origen || '—'} → ${m.destino || '—'}` : area
    // "NaN% completado": el porcentaje de trámites se calculaba mal en registros viejos
    add(`aud-${a.id}`, a.creado_en, tipo, tipo.toLowerCase(), String(a.accion || '').replace(/\s*\(NaN% completado\)/, ''), detalle, a.usuario)
  }
  for (const t of tras) {
    if (t.completado && t.fecha_hora) add(`tr-${t.id}`, t.fecha_hora, 'TRASLADO', 'traslado', `Traslado realizado (${String(t.tipo || '').replace(/_/g, ' ').toLowerCase()})`,
      [`${t.origen || '—'} → ${t.destino || '—'}`, t.vehiculo, t.conductor].filter(Boolean).join(' · '), null)
  }
  for (const o of tana) {
    add(`tan-${o.id}`, o.creado_en, 'TANATOPRAXIA', 'tanatopraxia', `Orden de tanatopraxia${o.tipo_servicio ? ` · ${o.tipo_servicio}` : ''}`,
      `Estado: ${o.estado}${o.responsable ? ` · responsable ${o.responsable}` : ''}`, o.usuario)
  }
  return ev
}

// ── Crear / editar / eliminar / fijar ──────────────────────────────────────
export async function crear(req, reply) {
  const tipo = validarTipo(req, reply); if (!tipo) return
  const { id } = req.params
  const { contenido_html, titulo, categoria = 'NOTA' } = req.body || {}
  const html = sanear(contenido_html)
  if (vacio(html)) return reply.code(400).send({ error: 'La nota está vacía: escriba algo o agregue una imagen' })
  if (!CATEGORIAS.includes(categoria)) return reply.code(400).send({ error: 'Categoría no válida' })

  const { rows } = await pool.query(`
    INSERT INTO bitacora (entidad_tipo, entidad_id, categoria, titulo, contenido_html, contenido_texto, usuario_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [tipo, id, categoria, (titulo || '').trim().slice(0, 200) || null, html, aTexto(html), req.user.id])
  return reply.code(201).send({ data: rows[0] })
}

async function cargarNota(req, reply) {
  const { rows } = await pool.query('SELECT * FROM bitacora WHERE id = $1', [req.params.notaId])
  if (!rows.length) { reply.code(404).send({ error: 'La nota no existe' }); return null }
  const nota = rows[0]
  if (nota.eliminado) { reply.code(400).send({ error: 'La nota fue eliminada' }); return null }
  // Solo el autor o un administrador pueden modificarla
  if (nota.usuario_id !== req.user.id && !ADMINS.has(req.user.rol)) {
    reply.code(403).send({ error: 'Solo quien escribió la nota o un administrador puede modificarla' }); return null
  }
  return nota
}

export async function actualizar(req, reply) {
  const nota = await cargarNota(req, reply); if (!nota) return
  const { contenido_html, titulo, categoria } = req.body || {}
  const html = sanear(contenido_html)
  if (vacio(html)) return reply.code(400).send({ error: 'La nota está vacía: escriba algo o agregue una imagen' })
  if (categoria && !CATEGORIAS.includes(categoria)) return reply.code(400).send({ error: 'Categoría no válida' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    // La versión anterior queda guardada (quién la escribió y cuándo)
    await db.query(`
      INSERT INTO bitacora_versiones (bitacora_id, categoria, titulo, contenido_html, usuario_id, guardado_en)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [nota.id, nota.categoria, nota.titulo, nota.contenido_html, nota.editado_por || nota.usuario_id, nota.editado_en || nota.creado_en])
    const { rows } = await db.query(`
      UPDATE bitacora SET contenido_html=$1, contenido_texto=$2, titulo=$3, categoria=COALESCE($4, categoria),
        editado_en=NOW(), editado_por=$5 WHERE id=$6 RETURNING *`,
      [html, aTexto(html), (titulo || '').trim().slice(0, 200) || null, categoria || null, req.user.id, nota.id])
    await db.query('COMMIT')
    return reply.send({ data: rows[0] })
  } catch (e) { await db.query('ROLLBACK'); throw e } finally { db.release() }
}

export async function eliminar(req, reply) {
  const nota = await cargarNota(req, reply); if (!nota) return
  const motivo = String(req.body?.motivo || '').trim()
  if (motivo.length < 5) return reply.code(400).send({ error: 'Indique el motivo de la eliminación (mínimo 5 caracteres)' })
  await pool.query(`UPDATE bitacora SET eliminado=TRUE, eliminado_por=$1, eliminado_en=NOW(), motivo_eliminacion=$2 WHERE id=$3`,
    [req.user.id, motivo, nota.id])
  return reply.send({ ok: true })
}

export async function fijar(req, reply) {
  const { rows } = await pool.query(
    `UPDATE bitacora SET fijada = NOT fijada WHERE id=$1 AND NOT eliminado RETURNING fijada`, [req.params.notaId])
  if (!rows.length) return reply.code(404).send({ error: 'La nota no existe' })
  return reply.send({ data: rows[0] })
}

export async function versiones(req, reply) {
  const { rows } = await pool.query(`
    SELECT v.*, u.nombre AS usuario_nombre FROM bitacora_versiones v
    LEFT JOIN usuarios u ON u.id = v.usuario_id
    WHERE v.bitacora_id = $1 ORDER BY v.guardado_en DESC`, [req.params.notaId])
  return reply.send({ data: rows })
}

// ── Imágenes del editor ─────────────────────────────────────────────────────
export async function subirImagen(req, reply) {
  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No se recibió ninguna imagen' })
  const ext = path.extname(data.filename || '').toLowerCase()
  if (!EXT_IMG.has(ext) || !/^image\//.test(data.mimetype || ''))
    return reply.code(400).send({ error: 'Formato no permitido. Use JPG, PNG, WEBP o GIF' })

  const nombre = `bit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
  const ruta = path.join(IMG_DIR, nombre)
  let bytes = 0
  data.file.on('data', c => { bytes += c.length })
  await pipeline(data.file, fs.createWriteStream(ruta))
  if (data.file.truncated || bytes > MAX_IMG) {
    fs.unlink(ruta, () => {})
    return reply.code(413).send({ error: 'La imagen supera 8 MB' })
  }
  return reply.send({ url: `/uploads/bitacora/${nombre}` })
}
