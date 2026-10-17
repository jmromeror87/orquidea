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
export const CATEGORIAS = ['NOTA', 'SEGUIMIENTO', 'LLAMADA', 'VISITA', 'RECOGIDA', 'NOVEDAD', 'BENEFICIARIOS', 'PAGOS', 'DOCUMENTOS', 'RECLAMO']

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

  const eventos = tipo === 'POLIZA' ? await eventosPoliza(id) : []
  return reply.send({ data: { notas: notas.rows, eventos, categorias: CATEGORIAS } })
}

const pesos = n => '$' + Math.round(+n || 0).toLocaleString('es-CO')
const fCorta = d => d ? new Date(d).toISOString().slice(0, 10).split('-').reverse().join('/') : ''

// Lo que el sistema ya registró sobre la póliza, como eventos de bitácora
async function eventosPoliza(polizaId) {
  const q = (sql) => pool.query(sql, [polizaId]).then(r => r.rows)
  const [pol, pagos, bens, transf, react, servs] = await Promise.all([
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
