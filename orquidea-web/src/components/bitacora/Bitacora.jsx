/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Bitácora (pólizas y servicios)                       ║
 * ║  Archivo         : components/bitacora/Bitacora.jsx                     ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Línea de tiempo de una póliza (o servicio): notas que escriben los
 * usuarios con el editor de texto + eventos que el sistema registra solo
 * (pagos, anulaciones, beneficiarios, transferencias, servicios…).
 *  - Notas fijadas arriba; filtros por tipo y categoría; buscador.
 *  - Editar guarda la versión anterior ("ver versiones").
 *  - Eliminar pide motivo y deja rastro (visible con "ver eliminadas").
 *  - Imprimir / guardar como PDF.
 *
 *   <Bitacora tipo="poliza" entidadId={id} titulo="Póliza #5 — …" puedeEscribir usuario={usuario}/>
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, Printer, Pin, PinOff, Pencil, Trash2, History, Loader2, X, Save, NotebookPen, Cpu, Eye, EyeOff,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import EditorTexto from './EditorTexto.jsx'
import { CSS_PROSA, conImagenesAbsolutas } from './prosa.js'
import { verHTML } from '../../store/visorPdf.store.js'

export const CATEGORIAS = {
  NOTA:          { label:'Nota general',        icon:'📝', color:'#475569', bg:'#f1f5f9' },
  SEGUIMIENTO:   { label:'Seguimiento',         icon:'🔁', color:'#1d4ed8', bg:'#dbeafe' },
  LLAMADA:       { label:'Llamada',             icon:'📞', color:'#0e7490', bg:'#cffafe' },
  VISITA:        { label:'Visita',              icon:'🏠', color:'#6d28d9', bg:'#ede9fe' },
  RECOGIDA:      { label:'Recogida del cuerpo', icon:'🚐', color:'#047857', bg:'#d1fae5' },
  NOVEDAD:       { label:'Novedad',             icon:'⚠️', color:'#b45309', bg:'#fef3c7' },
  BENEFICIARIOS: { label:'Beneficiarios',       icon:'👨‍👩‍👧', color:'#4338ca', bg:'#e0e7ff' },
  PAGOS:         { label:'Pagos',               icon:'💳', color:'#15803d', bg:'#dcfce7' },
  DOCUMENTOS:    { label:'Documentos',          icon:'📄', color:'#334155', bg:'#e2e8f0' },
  RECLAMO:       { label:'Reclamo / queja',     icon:'❗', color:'#b91c1c', bg:'#fee2e2' },
  FAMILIA:       { label:'Familia / dolientes', icon:'👪', color:'#9d174d', bg:'#fce7f3' },
  TRAMITES:      { label:'Trámites',            icon:'📋', color:'#0f766e', bg:'#ccfbf1' },
  CEREMONIA:     { label:'Ceremonia / exequias', icon:'🕯️', color:'#7c2d12', bg:'#ffedd5' },
}
const EVENTOS = {
  POLIZA:'🛡️', PAGO:'💳', ANULACION:'⛔', BENEFICIARIO:'👤', EJECUCION:'🕊️', TRANSFERENCIA:'🔄',
  CANCELACION:'⛔', REACTIVACION:'✅', SERVICIO:'⚱️', OBSERVACION:'📝', RENOVACION:'📈',
  // Servicio funerario
  SERVICIO_ITEM:'📦', PERSONAL:'👥', TRASLADO:'🚐', TRAMITE:'📝', DOCUMENTO:'🗂️', TANATOPRAXIA:'🩺',
  RECOGIDA:'🚐', VELACION:'🕯️', DISPOSICION:'⚱️', CONTRATO:'📄',
}
const ADMINS = ['superadmin', 'administrador']

const CSS = `
.bt-top { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:12px; }
.bt-tit { display:flex; align-items:center; gap:10px; }
.bt-tit h3 { margin:0; font-size:16px; font-weight:900; color:#0f172a; }
.bt-tit small { display:block; font-size:11.5px; color:#64748b; font-weight:600; }
.bt-acciones { margin-left:auto; display:flex; gap:8px; flex-wrap:wrap; }
.bt-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; border:1.5px solid transparent; white-space:nowrap; }
.bt-btn.pri { background:linear-gradient(135deg,#059669,#047857); color:#fff; box-shadow:0 4px 12px rgba(5,150,105,.25); }
.bt-btn.pri:disabled { opacity:.6; cursor:not-allowed; }
.bt-btn.sec { background:#fff; color:#334155; border-color:#e2e8f0; }
.bt-btn.sec:hover { background:#f8fafc; }
.bt-btn.dan { background:#dc2626; color:#fff; }
.bt-filtros { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:10px 12px; background:#f8fafc; border:1px solid #eef2f7; border-radius:12px; margin-bottom:16px; }
.bt-chip { border:1.5px solid #e2e8f0; background:#fff; color:#475569; border-radius:20px; padding:4px 12px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:5px; }
.bt-chip.on { background:#ecfdf5; border-color:#6ee7b7; color:#047857; }
.bt-chip span { font-weight:600; opacity:.7; }
.bt-select { border:1.5px solid #e2e8f0; border-radius:8px; padding:5px 8px; font-size:12.5px; font-weight:600; color:#334155; background:#fff; font-family:inherit; }
.bt-buscar { position:relative; margin-left:auto; }
.bt-buscar svg { position:absolute; left:9px; top:8px; color:#94a3b8; }
.bt-buscar input { border:1.5px solid #e2e8f0; border-radius:8px; padding:6px 10px 6px 28px; font-size:12.5px; outline:none; font-family:inherit; width:220px; }
.bt-buscar input:focus { border-color:#10b981; }
.bt-comp { border:1.5px solid #a7f3d0; background:linear-gradient(180deg,#f0fdf4,#fff 60px); border-radius:14px; padding:14px; margin-bottom:18px; box-shadow:0 6px 20px rgba(5,150,105,.08); }
.bt-comp-fila { display:grid; grid-template-columns:220px 1fr; gap:10px; margin-bottom:10px; }
.bt-comp label { display:block; font-size:10.5px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; color:#065f46; margin-bottom:4px; }
.bt-input { width:100%; box-sizing:border-box; border:1.5px solid #d1d5db; border-radius:9px; padding:8px 10px; font-size:13px; font-family:inherit; outline:none; background:#fff; }
.bt-input:focus { border-color:#10b981; }
.bt-comp-pie { display:flex; justify-content:flex-end; gap:8px; margin-top:10px; }
.bt-seccion { font-size:11px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#94a3b8; margin:4px 0 10px; display:flex; align-items:center; gap:8px; }
.bt-seccion::after { content:''; flex:1; height:1px; background:#eef2f7; }
.bt-linea { position:relative; padding-left:34px; }
.bt-linea::before { content:''; position:absolute; left:13px; top:4px; bottom:4px; width:2px; background:linear-gradient(#d1fae5,#e2e8f0); border-radius:2px; }
.bt-item { position:relative; margin-bottom:12px; }
.bt-punto { position:absolute; left:-34px; top:10px; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; background:#fff; border:2px solid #d1fae5; box-shadow:0 0 0 4px #fff; }
.bt-nota { border:1.5px solid #e5e7eb; border-radius:14px; background:#fff; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,.04); }
.bt-nota.fijada { border-color:#fcd34d; box-shadow:0 0 0 3px #fef3c7; }
.bt-nhead { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid #f1f5f9; flex-wrap:wrap; }
.bt-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#059669,#10b981); color:#fff; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.bt-autor { font-size:13px; font-weight:800; color:#0f172a; line-height:1.2; }
.bt-autor small { display:block; font-size:11px; color:#94a3b8; font-weight:600; }
.bt-cat { font-size:11px; font-weight:800; border-radius:20px; padding:3px 10px; white-space:nowrap; }
.bt-nacc { margin-left:auto; display:flex; gap:4px; }
.bt-ib { width:30px; height:30px; border-radius:8px; border:1px solid transparent; background:transparent; color:#64748b; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.bt-ib:hover { background:#f1f5f9; color:#0f172a; }
.bt-ib.on { color:#b45309; }
.bt-ib.rojo:hover { background:#fef2f2; color:#dc2626; }
.bt-ncuerpo { padding:12px 16px 14px; }
.bt-ntitulo { font-size:15px; font-weight:800; color:#0f172a; margin-bottom:6px; }
.bt-npie { padding:6px 14px; border-top:1px dashed #eef2f7; font-size:11px; color:#94a3b8; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.bt-npie button { border:none; background:none; color:#4f46e5; font-weight:700; font-size:11px; cursor:pointer; padding:0; font-family:inherit; display:flex; align-items:center; gap:3px; }
.bt-evento { display:flex; gap:10px; align-items:flex-start; padding:9px 12px; border-radius:10px; background:#f8fafc; border:1px solid #eef2f7; }
.bt-evento .bt-etit { font-size:12.5px; font-weight:700; color:#334155; }
.bt-evento .bt-edet { font-size:12px; color:#64748b; margin-top:1px; white-space:pre-wrap; }
.bt-evento .bt-ehora { margin-left:auto; font-size:11px; color:#94a3b8; white-space:nowrap; text-align:right; }
.bt-auto { font-size:9.5px; font-weight:800; letter-spacing:.05em; color:#64748b; background:#e2e8f0; border-radius:5px; padding:1px 5px; margin-left:6px; vertical-align:1px; }
.bt-borrada { padding:9px 12px; border-radius:10px; border:1px dashed #fecaca; background:#fef2f2; font-size:12px; color:#991b1b; }
.bt-vacio { text-align:center; padding:40px 20px; color:#94a3b8; }
.bt-vacio b { display:block; color:#475569; font-size:14px; margin:8px 0 4px; }
.bt-ov { position:fixed; inset:0; background:rgba(10,10,30,.45); backdrop-filter:blur(3px); z-index:1200; display:flex; align-items:center; justify-content:center; padding:16px; }
.bt-modal { background:#fff; border-radius:18px; width:100%; max-width:560px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.25); }
.bt-modal.lg { max-width:820px; }
.bt-mhead { display:flex; align-items:center; gap:10px; padding:16px 18px; border-bottom:1px solid #f1f5f9; }
.bt-mhead b { font-size:15px; color:#0f172a; flex:1; }
.bt-mbody { padding:16px 18px; overflow-y:auto; min-height:0; }
.bt-mpie { display:flex; justify-content:flex-end; gap:8px; padding:12px 18px; border-top:1px solid #f1f5f9; }
.bt-version { border:1px solid #e5e7eb; border-radius:12px; margin-bottom:12px; overflow:hidden; }
.bt-version > div:first-child { background:#f8fafc; padding:7px 12px; font-size:11.5px; color:#475569; font-weight:700; border-bottom:1px solid #eef2f7; }
.bt-version > div:last-child { padding:10px 14px; }
@media (max-width:720px) { .bt-comp-fila { grid-template-columns:1fr; } .bt-buscar { margin-left:0; width:100%; } .bt-buscar input { width:100%; box-sizing:border-box; } }
`

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
const hora = d => new Date(d).toLocaleTimeString('es-CO', { hour:'numeric', minute:'2-digit' })
const fechaHora = d => new Date(d).toLocaleString('es-CO', { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' })
function diaLabel(d) {
  const f = new Date(d); const hoy = new Date(); const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  const mismo = (a, b) => a.toDateString() === b.toDateString()
  if (mismo(f, hoy)) return 'Hoy'
  if (mismo(f, ayer)) return 'Ayer'
  const s = f.toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const ROLES = { superadmin:'Superadmin', administrador:'Administrador', operador:'Operador', asesor_comercial:'Asesor comercial', contador:'Contador', consultor:'Consultor' }

// ── Formulario de nota (nueva o edición) ────────────────────────────────────
function Composer({ inicial, onGuardar, onCancelar }) {
  const [categoria, setCategoria] = useState(inicial?.categoria || 'NOTA')
  const [titulo, setTitulo] = useState(inicial?.titulo || '')
  const [html, setHtml] = useState(inicial ? conImagenesAbsolutas(inicial.contenido_html) : '')
  const [guardando, setGuardando] = useState(false)
  const sucio = html !== (inicial ? conImagenesAbsolutas(inicial.contenido_html) : '') || titulo !== (inicial?.titulo || '') || categoria !== (inicial?.categoria || 'NOTA')

  const guardar = async () => {
    if (!html.trim()) { toast.error('La nota está vacía: escriba algo o agregue una imagen'); return }
    setGuardando(true)
    try { await onGuardar({ categoria, titulo, contenido_html: html }) } finally { setGuardando(false) }
  }
  const cancelar = () => {
    if (sucio && !window.confirm('¿Descartar lo que escribió? Los cambios no guardados se perderán.')) return
    onCancelar()
  }

  return (
    <div className="bt-comp">
      <div className="bt-comp-fila">
        <div>
          <label>Categoría</label>
          <select className="bt-input" value={categoria} onChange={e => setCategoria(e.target.value)}>
            {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.icon}  {v.label}</option>)}
          </select>
        </div>
        <div>
          <label>Título (opcional)</label>
          <input className="bt-input" value={titulo} maxLength={200} onChange={e => setTitulo(e.target.value)}
            placeholder="Ej.: Recogida del cuerpo en el Hospital Regional"/>
        </div>
      </div>
      <EditorTexto valor={html} onChange={setHtml} autoFocus
        placeholder="Escriba lo sucedido: qué se hizo, con quién se habló, novedades… Puede usar negrilla, viñetas, tablas e imágenes."/>
      <div className="bt-comp-pie">
        <button type="button" className="bt-btn sec" onClick={cancelar} disabled={guardando}>Cancelar</button>
        <button type="button" className="bt-btn pri" onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 size={14} className="pl-spin"/> : <Save size={14}/>} {inicial ? 'Guardar cambios' : 'Guardar en la bitácora'}
        </button>
      </div>
    </div>
  )
}

export default function Bitacora({ tipo = 'poliza', entidadId, titulo = '', puedeEscribir = false, usuario }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [nueva, setNueva] = useState(false)
  const [editando, setEditando] = useState(null)
  const [filtro, setFiltro] = useState('TODO')       // TODO | NOTAS | EVENTOS
  const [categoria, setCategoria] = useState('')
  const [q, setQ] = useState('')
  const [verEliminadas, setVerEliminadas] = useState(false)
  const [borrar, setBorrar] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [versiones, setVersiones] = useState(null)   // { nota, lista }

  const cargar = useCallback(async () => {
    try {
      const r = await api.get(`/bitacora/${tipo}/${entidadId}`)
      setDatos(r.data.data)
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo cargar la bitácora')
    } finally { setCargando(false) }
  }, [tipo, entidadId])
  useEffect(() => { cargar() }, [cargar])

  const esAdmin = ADMINS.includes(usuario?.rol)
  const puedeModificar = n => puedeEscribir && (n.usuario_id === usuario?.id || esAdmin)

  const notas = datos?.notas || []
  const eventos = datos?.eventos || []

  const items = useMemo(() => {
    const t = norm(q.trim())
    const ns = notas
      .filter(n => verEliminadas || !n.eliminado)
      .filter(n => !categoria || n.categoria === categoria)
      .filter(n => !t || norm(`${n.titulo} ${n.contenido_texto} ${n.usuario_nombre} ${CATEGORIAS[n.categoria]?.label}`).includes(t))
      .map(n => ({ k: `n-${n.id}`, clase: 'nota', fecha: n.creado_en, nota: n }))
    const es = categoria ? [] : eventos
      .filter(e => !t || norm(`${e.titulo} ${e.detalle} ${e.usuario}`).includes(t))
      .map(e => ({ k: `e-${e.id}`, clase: 'evento', fecha: e.fecha, ev: e }))
    const todos = filtro === 'NOTAS' ? ns : filtro === 'EVENTOS' ? es : [...ns, ...es]
    return todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [notas, eventos, q, categoria, filtro, verEliminadas])

  const fijadas = filtro !== 'EVENTOS' ? items.filter(i => i.clase === 'nota' && i.nota.fijada && !i.nota.eliminado) : []
  const resto = items.filter(i => !(i.clase === 'nota' && i.nota.fijada && !i.nota.eliminado) || filtro === 'EVENTOS')
  const porDia = []
  for (const it of resto) {
    const d = diaLabel(it.fecha)
    if (!porDia.length || porDia[porDia.length - 1].dia !== d) porDia.push({ dia: d, items: [] })
    porDia[porDia.length - 1].items.push(it)
  }
  const nNotas = notas.filter(n => !n.eliminado).length
  const nEliminadas = notas.filter(n => n.eliminado).length

  const crear = async body => {
    try {
      await api.post(`/bitacora/${tipo}/${entidadId}`, body)
      toast.success('Nota guardada en la bitácora')
      setNueva(false); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo guardar la nota') }
  }
  const actualizar = async (nota, body) => {
    try {
      await api.put(`/bitacora/nota/${nota.id}`, body)
      toast.success('Nota actualizada — la versión anterior quedó guardada')
      setEditando(null); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo actualizar la nota') }
  }
  const fijar = async nota => {
    try {
      const r = await api.patch(`/bitacora/nota/${nota.id}/fijar`)
      toast.success(r.data.data.fijada ? 'Nota fijada arriba' : 'Nota desfijada')
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo fijar la nota') }
  }
  const confirmarBorrado = async () => {
    if (motivo.trim().length < 5) { toast.error('Indique el motivo (mínimo 5 caracteres)'); return }
    setBorrando(true)
    try {
      await api.delete(`/bitacora/nota/${borrar.id}`, { data: { motivo: motivo.trim() } })
      toast.success('Nota eliminada — queda registro de quién y por qué')
      setBorrar(null); setMotivo(''); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo eliminar la nota') }
    finally { setBorrando(false) }
  }
  const verVersiones = async nota => {
    try {
      const r = await api.get(`/bitacora/nota/${nota.id}/versiones`)
      setVersiones({ nota, lista: r.data.data })
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudieron cargar las versiones') }
  }

  const imprimir = () => {
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]))
    const filas = [...fijadas, ...resto].map(it => it.clase === 'nota' ? `
      <div class="n${it.nota.eliminado ? ' del' : ''}">
        <div class="h"><b>${esc(CATEGORIAS[it.nota.categoria]?.icon)} ${esc(CATEGORIAS[it.nota.categoria]?.label)}</b>
          · ${esc(fechaHora(it.nota.creado_en))} · ${esc(it.nota.usuario_nombre)}${it.nota.fijada ? ' · 📌 Fijada' : ''}
          ${it.nota.editado_en ? ` · editada ${esc(fechaHora(it.nota.editado_en))} por ${esc(it.nota.editado_por_nombre)}` : ''}</div>
        ${it.nota.eliminado ? `<div class="motivo">ELIMINADA por ${esc(it.nota.eliminado_por_nombre)} el ${esc(fechaHora(it.nota.eliminado_en))} — ${esc(it.nota.motivo_eliminacion)}</div>` : ''}
        ${it.nota.titulo ? `<h2 class="t">${esc(it.nota.titulo)}</h2>` : ''}
        <div class="bt-prosa">${conImagenesAbsolutas(it.nota.contenido_html)}</div>
      </div>` : `
      <div class="e">${esc(EVENTOS[it.ev.tipo] || '•')} <b>${esc(it.ev.titulo)}</b> — ${esc(it.ev.detalle)}
        <span>${esc(fechaHora(it.ev.fecha))}${it.ev.usuario ? ` · ${esc(it.ev.usuario)}` : ''}</span></div>`).join('')
    verHTML(`<!doctype html><html><head><meta charset="utf-8"><title>Bitácora — ${esc(titulo)}</title>
      <style>
        body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color:#111827; margin:28px; }
        header { border-bottom:3px solid #059669; padding-bottom:10px; margin-bottom:18px; }
        header h1 { margin:0; font-size:20px; color:#065f46; } header p { margin:3px 0 0; font-size:12px; color:#6b7280; }
        .n { border:1px solid #d1d5db; border-radius:10px; padding:10px 14px; margin-bottom:12px; page-break-inside:avoid; }
        .n.del { border-style:dashed; opacity:.7; }
        .h { font-size:11.5px; color:#475569; margin-bottom:6px; } .t { font-size:15px; margin:4px 0 6px; }
        .motivo { font-size:11.5px; color:#b91c1c; margin-bottom:6px; }
        .e { font-size:12px; color:#374151; padding:5px 0; border-bottom:1px dotted #e5e7eb; }
        .e span { color:#9ca3af; float:right; }
        ${CSS_PROSA}
      </style></head><body>
      <header><h1>Bitácora — ${esc(titulo)}</h1>
        <p>Impresa el ${esc(fechaHora(new Date()))} por ${esc(usuario?.nombre || '')} · ${items.length} registro(s)${q || categoria || filtro !== 'TODO' ? ' (filtrados)' : ''}</p></header>
      ${filas || '<p>Sin registros.</p>'}
      </body></html>`, `Bitácora — ${titulo}`)
  }

  const Nota = ({ n }) => {
    const cat = CATEGORIAS[n.categoria] || CATEGORIAS.NOTA
    if (n.eliminado) return (
      <div className="bt-borrada">
        🗑️ Nota{n.titulo ? ` «${n.titulo}»` : ''} de <b>{n.usuario_nombre}</b> eliminada por <b>{n.eliminado_por_nombre}</b> el {fechaHora(n.eliminado_en)} — <em>{n.motivo_eliminacion}</em>
      </div>
    )
    if (editando === n.id) return <Composer inicial={n} onGuardar={body => actualizar(n, body)} onCancelar={() => setEditando(null)}/>
    return (
      <div className={`bt-nota${n.fijada ? ' fijada' : ''}`}>
        <div className="bt-nhead">
          <div className="bt-avatar">{iniciales(n.usuario_nombre)}</div>
          <div className="bt-autor">{n.usuario_nombre || '—'}<small>{ROLES[n.usuario_rol] || ''} · {fechaHora(n.creado_en)}</small></div>
          <span className="bt-cat" style={{ background:cat.bg, color:cat.color }}>{cat.icon} {cat.label}</span>
          {n.fijada && <span className="bt-cat" style={{ background:'#fef3c7', color:'#b45309' }}>📌 Fijada</span>}
          {puedeEscribir && (
            <div className="bt-nacc">
              <button type="button" className={`bt-ib${n.fijada ? ' on' : ''}`} title={n.fijada ? 'Desfijar' : 'Fijar arriba'} onClick={() => fijar(n)}>
                {n.fijada ? <PinOff size={15}/> : <Pin size={15}/>}
              </button>
              {puedeModificar(n) && <>
                <button type="button" className="bt-ib" title="Editar" onClick={() => { setNueva(false); setEditando(n.id) }}><Pencil size={15}/></button>
                <button type="button" className="bt-ib rojo" title="Eliminar" onClick={() => { setBorrar(n); setMotivo('') }}><Trash2 size={15}/></button>
              </>}
            </div>
          )}
        </div>
        <div className="bt-ncuerpo">
          {n.titulo && <div className="bt-ntitulo">{n.titulo}</div>}
          <div className="bt-prosa" dangerouslySetInnerHTML={{ __html: conImagenesAbsolutas(n.contenido_html) }}/>
        </div>
        {(n.editado_en || n.versiones > 0) && (
          <div className="bt-npie">
            {n.editado_en && <span>✏️ Editada el {fechaHora(n.editado_en)} por {n.editado_por_nombre}</span>}
            {n.versiones > 0 && <button type="button" onClick={() => verVersiones(n)}><History size={12}/> Ver {n.versiones} versión{n.versiones === 1 ? '' : 'es'} anterior{n.versiones === 1 ? '' : 'es'}</button>}
          </div>
        )}
      </div>
    )
  }

  const Item = ({ it }) => it.clase === 'nota' ? (
    <div className="bt-item">
      <span className="bt-punto" style={{ borderColor: (CATEGORIAS[it.nota.categoria] || CATEGORIAS.NOTA).bg }}>
        {it.nota.eliminado ? '🗑️' : (CATEGORIAS[it.nota.categoria] || CATEGORIAS.NOTA).icon}
      </span>
      <Nota n={it.nota}/>
    </div>
  ) : (
    <div className="bt-item">
      <span className="bt-punto" style={{ borderColor:'#e2e8f0' }}>{EVENTOS[it.ev.tipo] || '•'}</span>
      <div className="bt-evento">
        <div>
          <div className="bt-etit">{it.ev.titulo}<span className="bt-auto">AUTOMÁTICO</span></div>
          {it.ev.detalle && <div className="bt-edet">{it.ev.detalle}</div>}
        </div>
        <div className="bt-ehora">{hora(it.ev.fecha)}{it.ev.usuario && <div>{it.ev.usuario}</div>}</div>
      </div>
    </div>
  )

  return (
    <>
      <style>{CSS + CSS_PROSA}</style>
      <div className="bt-top">
        <div className="bt-tit">
          <NotebookPen size={22} color="#059669"/>
          <div><h3>Bitácora</h3><small>{nNotas} nota{nNotas === 1 ? '' : 's'} · {eventos.length} evento{eventos.length === 1 ? '' : 's'} del sistema</small></div>
        </div>
        <div className="bt-acciones">
          <button type="button" className="bt-btn sec" onClick={imprimir} disabled={!items.length}><Printer size={14}/> Imprimir / PDF</button>
          {puedeEscribir && !nueva && (
            <button type="button" className="bt-btn pri" onClick={() => { setEditando(null); setNueva(true) }}><Plus size={15}/> Nueva nota</button>
          )}
        </div>
      </div>

      {nueva && <Composer onGuardar={crear} onCancelar={() => setNueva(false)}/>}

      <div className="bt-filtros">
        {[['TODO', 'Todo', nNotas + eventos.length, null], ['NOTAS', 'Notas', nNotas, <NotebookPen key="i" size={12}/>], ['EVENTOS', 'Del sistema', eventos.length, <Cpu key="i" size={12}/>]].map(([k, l, n, ic]) => (
          <button key={k} type="button" className={`bt-chip${filtro === k ? ' on' : ''}`} onClick={() => setFiltro(k)}>{ic}{l}<span>{n}</span></button>
        ))}
        <select className="bt-select" value={categoria} onChange={e => setCategoria(e.target.value)} title="Filtrar notas por categoría">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        {nEliminadas > 0 && (
          <button type="button" className={`bt-chip${verEliminadas ? ' on' : ''}`} onClick={() => setVerEliminadas(v => !v)}>
            {verEliminadas ? <EyeOff size={12}/> : <Eye size={12}/>} {verEliminadas ? 'Ocultar' : 'Ver'} eliminadas<span>{nEliminadas}</span>
          </button>
        )}
        <div className="bt-buscar">
          <Search size={13}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en la bitácora…"/>
        </div>
      </div>

      {cargando ? (
        <div className="bt-vacio"><Loader2 size={26} className="pl-spin" color="#059669"/></div>
      ) : !items.length ? (
        <div className="bt-vacio">
          <NotebookPen size={34}/>
          <b>{q || categoria || filtro !== 'TODO' ? 'Nada coincide con el filtro' : 'La bitácora está vacía'}</b>
          {puedeEscribir && !q && !categoria && `Use "Nueva nota" para registrar lo que suceda con ${tipo === 'servicio' ? 'este servicio' : 'esta póliza'}.`}
        </div>
      ) : (
        <>
          {fijadas.length > 0 && <>
            <div className="bt-seccion">📌 Fijadas</div>
            <div className="bt-linea">{fijadas.map(it => <Item key={it.k} it={it}/>)}</div>
          </>}
          {porDia.map(g => (
            <div key={g.dia}>
              <div className="bt-seccion">{g.dia}</div>
              <div className="bt-linea">{g.items.map(it => <Item key={it.k} it={it}/>)}</div>
            </div>
          ))}
        </>
      )}

      {borrar && (
        <div className="bt-ov">
          <div className="bt-modal">
            <div className="bt-mhead"><Trash2 size={18} color="#dc2626"/><b>Eliminar nota de la bitácora</b>
              <button type="button" className="bt-ib" onClick={() => setBorrar(null)} title="Cerrar"><X size={16}/></button></div>
            <div className="bt-mbody">
              <p style={{ margin:'0 0 10px', fontSize:13, color:'#475569' }}>
                La nota no se borra del todo: queda registrado quién la eliminó, cuándo y por qué, y un administrador puede consultarla con "Ver eliminadas".
              </p>
              <label style={{ fontSize:11, fontWeight:800, color:'#991b1b', textTransform:'uppercase', letterSpacing:'.05em' }}>Motivo *</label>
              <textarea className="bt-input" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} autoFocus
                placeholder="Ej.: se registró en la póliza equivocada" style={{ marginTop:4, resize:'vertical' }}/>
            </div>
            <div className="bt-mpie">
              <button type="button" className="bt-btn sec" onClick={() => setBorrar(null)} disabled={borrando}>Cancelar</button>
              <button type="button" className="bt-btn dan" onClick={confirmarBorrado} disabled={borrando}>
                {borrando ? <Loader2 size={14} className="pl-spin"/> : <Trash2 size={14}/>} Eliminar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {versiones && (
        <div className="bt-ov">
          <div className="bt-modal lg">
            <div className="bt-mhead"><History size={18} color="#4f46e5"/><b>Versiones anteriores{versiones.nota.titulo ? ` — ${versiones.nota.titulo}` : ''}</b>
              <button type="button" className="bt-ib" onClick={() => setVersiones(null)} title="Cerrar"><X size={16}/></button></div>
            <div className="bt-mbody">
              <div className="bt-version">
                <div>Versión actual · {fechaHora(versiones.nota.editado_en || versiones.nota.creado_en)} · {versiones.nota.editado_por_nombre || versiones.nota.usuario_nombre}</div>
                <div>
                  {versiones.nota.titulo && <div className="bt-ntitulo">{versiones.nota.titulo}</div>}
                  <div className="bt-prosa" dangerouslySetInnerHTML={{ __html: conImagenesAbsolutas(versiones.nota.contenido_html) }}/>
                </div>
              </div>
              {versiones.lista.map(v => (
                <div key={v.id} className="bt-version" style={{ opacity:.85 }}>
                  <div>Escrita el {fechaHora(v.guardado_en)} por {v.usuario_nombre || '—'} · reemplazada el {fechaHora(v.reemplazada_en)}</div>
                  <div>
                    {v.titulo && <div className="bt-ntitulo">{v.titulo}</div>}
                    <div className="bt-prosa" dangerouslySetInnerHTML={{ __html: conImagenesAbsolutas(v.contenido_html) }}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="bt-mpie"><button type="button" className="bt-btn sec" onClick={() => setVersiones(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </>
  )
}
