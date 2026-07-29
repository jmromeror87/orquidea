/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Compras                                             ║
 * ║  Archivo         : ComprasPage.jsx                                     ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShoppingCart, ClipboardList, TrendingUp, FileCheck, AlertCircle,
  Search, RefreshCw, Plus, X, Check, ChevronDown, Star,
  Package, Truck, CreditCard, Building2, Phone, Mail,
  Calendar, AlertTriangle, CheckCircle, Eye, Edit3, ThumbsUp,
} from 'lucide-react'
import api from '../../services/api.js'
import { useAuthStore } from '../../store/auth.store.js'
import { toast } from '../../store/toast.store.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)
const fmtDate = d => d ? new Date(String(d).includes('T') ? d : d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
.cmp { display:flex; flex-direction:column; height:100%; background:#F8F9FC; }

/* Stats */
.cmp-stats { display:flex; gap:12px; padding:16px 20px 0; flex-shrink:0; flex-wrap:wrap; }
.cmp-stat {
  flex:1; min-width:160px;
  background:#fff; border:1px solid #ECEDF8; border-radius:14px;
  padding:14px 18px; display:flex; align-items:center; gap:14px;
  cursor:pointer; transition:all .15s;
}
.cmp-stat:hover { border-color:#F59E0B; box-shadow:0 4px 14px rgba(245,158,11,.1); transform:translateY(-1px); }
.cmp-stat-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cmp-stat-label { font-size:11px; color:#9CA3AF; margin-bottom:3px; }
.cmp-stat-value { font-size:22px; font-weight:800; color:#0F1035; line-height:1; }
.cmp-stat-sub   { font-size:10px; color:#9CA3AF; margin-top:2px; }

/* Tabs */
.cmp-tabs { display:flex; gap:4px; padding:16px 20px 0; flex-shrink:0; flex-wrap:wrap; }
.cmp-tab {
  padding:8px 18px; border-radius:10px; font-size:13px; font-weight:600;
  cursor:pointer; border:1.5px solid transparent; transition:all .15s;
  color:#6B7280; background:transparent;
}
.cmp-tab.active { background:#F59E0B; color:#fff; border-color:#F59E0B; }
.cmp-tab:not(.active):hover { background:#FFF7ED; color:#D97706; border-color:#FED7AA; }

/* Body */
.cmp-body { flex:1; overflow:auto; padding:16px 20px 20px; }

/* Filters */
.cmp-filters { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.cmp-input {
  height:38px; border:1.5px solid #ECEDF8; border-radius:10px;
  padding:0 12px; font-size:13px; color:#0F1035; background:#fff;
  outline:none; transition:border .15s;
}
.cmp-input:focus { border-color:#F59E0B; }
.cmp-search-wrap { position:relative; flex:1; min-width:200px; }
.cmp-search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; }
.cmp-search-input { padding-left:36px; width:100%; }

/* Buttons */
.cmp-btn {
  height:38px; border-radius:10px; padding:0 16px; font-size:13px; font-weight:700;
  cursor:pointer; display:inline-flex; align-items:center; gap:7px;
  border:none; transition:all .15s;
}
.cmp-btn-primary  { background:#F59E0B; color:#fff; }
.cmp-btn-primary:hover { background:#D97706; }
.cmp-btn-success  { background:#059669; color:#fff; }
.cmp-btn-success:hover { background:#047857; }
.cmp-btn-ghost    { background:#F4F5FA; color:#374151; border:1.5px solid #ECEDF8; }
.cmp-btn-ghost:hover { background:#ECEDF8; }
.cmp-btn-danger   { background:#EF4444; color:#fff; }
.cmp-btn-danger:hover { background:#DC2626; }
.cmp-btn-sm { height:30px; padding:0 12px; font-size:12px; }
.cmp-btn-xs { height:26px; padding:0 10px; font-size:11px; }
.cmp-btn:disabled { opacity:.5; cursor:not-allowed; }

/* Table */
.cmp-table-wrap { background:#fff; border:1px solid #ECEDF8; border-radius:14px; overflow:hidden; }
.cmp-table { width:100%; border-collapse:collapse; font-size:13px; }
.cmp-table th {
  background:#F8F9FC; font-size:11px; font-weight:700; color:#6B7280;
  text-transform:uppercase; letter-spacing:.5px; padding:10px 14px;
  text-align:left; border-bottom:1px solid #ECEDF8; white-space:nowrap;
}
.cmp-table td { padding:11px 14px; border-bottom:1px solid #F0F1FA; color:#374151; vertical-align:middle; }
.cmp-table tr:last-child td { border-bottom:none; }
.cmp-table tr:hover td { background:#FFFBEB; }
.cmp-empty { text-align:center; padding:48px; color:#9CA3AF; }

/* Badge */
.cmp-badge {
  display:inline-flex; align-items:center; gap:4px;
  font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px;
}
.badge-yellow  { background:#FFF7ED; color:#D97706; }
.badge-green   { background:#ECFDF5; color:#059669; }
.badge-red     { background:#FEF2F2; color:#EF4444; }
.badge-blue    { background:#EFF6FF; color:#3B82F6; }
.badge-indigo  { background:#EEF2FF; color:#6366F1; }
.badge-gray    { background:#F3F4F6; color:#6B7280; }
.badge-orange  { background:#FFF7ED; color:#EA580C; }
.badge-pink    { background:#FDF2F8; color:#DB2777; }

/* Modal */
.cmp-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:1000;
  display:flex; align-items:center; justify-content:center; padding:20px;
  animation:cmpFadeIn .15s ease;
}
@keyframes cmpFadeIn { from{opacity:0} to{opacity:1} }
.cmp-modal {
  background:#fff; border-radius:20px; padding:28px;
  width:100%; max-width:680px; max-height:90vh; overflow-y:auto;
  box-shadow:0 24px 60px rgba(0,0,0,.18); animation:cmpSlideUp .2s ease;
}
.cmp-modal-lg { max-width:820px; }
@keyframes cmpSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.cmp-modal-title {
  font-size:18px; font-weight:800; color:#0F1035; margin-bottom:20px;
  display:flex; align-items:center; justify-content:space-between;
}
.cmp-modal-close {
  width:32px; height:32px; border-radius:8px; background:#F4F5FA;
  display:flex; align-items:center; justify-content:center; cursor:pointer; border:none;
}
.cmp-modal-close:hover { background:#ECEDF8; }

/* Fields */
.cmp-field { margin-bottom:16px; }
.cmp-label { font-size:12px; font-weight:700; color:#374151; margin-bottom:6px; display:block; }
.cmp-select {
  width:100%; height:40px; border:1.5px solid #ECEDF8; border-radius:10px;
  padding:0 12px; font-size:13px; color:#0F1035; background:#fff;
  outline:none; transition:border .15s;
}
.cmp-select:focus { border-color:#F59E0B; }
.cmp-textarea {
  width:100%; border:1.5px solid #ECEDF8; border-radius:10px;
  padding:10px 12px; font-size:13px; color:#0F1035; background:#fff;
  outline:none; resize:vertical; min-height:80px; font-family:inherit;
}
.cmp-textarea:focus { border-color:#F59E0B; }
.cmp-row { display:flex; gap:12px; }
.cmp-row .cmp-field { flex:1; }
.cmp-full { width:100%; }

/* Error alert */
.cmp-error {
  background:#FEF2F2; color:#EF4444; border-radius:8px;
  padding:8px 12px; font-size:13px; margin-bottom:12px;
  display:flex; gap:6px; align-items:center;
}

/* Info card */
.cmp-info-card {
  background:#FFF7ED; border:1.5px solid #FED7AA; border-radius:12px;
  padding:14px 16px; margin-bottom:16px;
}
.cmp-info-card-title { font-size:13px; font-weight:800; color:#D97706; margin-bottom:8px; }

/* Items section */
.cmp-items-header {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:10px;
}
.cmp-items-title { font-size:13px; font-weight:700; color:#374151; }
.cmp-item-row {
  background:#F8F9FC; border:1.5px solid #ECEDF8; border-radius:10px;
  padding:12px; margin-bottom:8px; position:relative;
}
.cmp-item-remove {
  position:absolute; top:8px; right:8px; width:22px; height:22px;
  border-radius:6px; background:#FEE2E2; border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; color:#EF4444;
}
.cmp-total-bar {
  background:#F0FFF4; border:1.5px solid #A7F3D0; border-radius:10px;
  padding:12px 16px; text-align:right; font-size:15px; font-weight:800; color:#059669;
  margin-top:12px;
}

/* Autocomplete */
.cmp-autocomplete {
  position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:200;
  background:#fff; border:1.5px solid #ECEDF8; border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.1); overflow:hidden; max-height:220px; overflow-y:auto;
}
.cmp-ac-item {
  padding:10px 14px; cursor:pointer; transition:background .1s;
}
.cmp-ac-item:hover { background:#FFF7ED; }
.cmp-ac-name  { font-size:13px; font-weight:700; color:#0F1035; }
.cmp-ac-meta  { font-size:11px; color:#6B7280; margin-top:2px; }

/* Provider grid */
.cmp-prov-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
.cmp-prov-card {
  background:#fff; border:1.5px solid #ECEDF8; border-radius:16px;
  padding:20px; transition:all .15s;
}
.cmp-prov-card:hover { border-color:#F59E0B; box-shadow:0 4px 16px rgba(245,158,11,.12); }
.cmp-prov-avatar {
  width:48px; height:48px; border-radius:14px;
  background:linear-gradient(135deg,#F59E0B,#D97706);
  color:#fff; display:flex; align-items:center; justify-content:center;
  font-size:18px; font-weight:800; margin-bottom:12px;
}
.cmp-prov-name  { font-size:15px; font-weight:800; color:#0F1035; margin-bottom:4px; }
.cmp-prov-meta  { font-size:12px; color:#6B7280; }
.cmp-prov-stars { display:flex; gap:2px; margin:8px 0; }
.cmp-prov-info  { display:flex; flex-direction:column; gap:5px; margin-top:10px; }
.cmp-prov-info-row { display:flex; align-items:center; gap:6px; font-size:12px; color:#6B7280; }
.cmp-prov-actions { display:flex; gap:8px; margin-top:14px; }

/* Progress bar */
.cmp-progress { background:#E5E7EB; border-radius:4px; height:6px; margin-top:4px; }
.cmp-progress-fill { background:#059669; height:6px; border-radius:4px; transition:width .3s; }

/* Star interactive */
.cmp-star { font-size:20px; cursor:pointer; transition:transform .1s; }
.cmp-star:hover { transform:scale(1.2); }

/* Timeline */
.cmp-timeline { display:flex; flex-direction:column; gap:10px; }
.cmp-tl-item { display:flex; gap:12px; align-items:flex-start; }
.cmp-tl-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:4px; }
.cmp-tl-content { flex:1; }
.cmp-tl-label { font-size:12px; font-weight:700; color:#374151; }
.cmp-tl-date  { font-size:11px; color:#9CA3AF; }
`

// ── Sub-components ────────────────────────────────────────────────────────────

function Stars({ value, max = 5, interactive = false, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => {
        const filled = (hover || value) > i
        return (
          <span
            key={i}
            className={interactive ? 'cmp-star' : ''}
            style={{ fontSize: interactive ? 24 : 14, color: filled ? '#F59E0B' : '#D1D5DB' }}
            onMouseEnter={() => interactive && setHover(i + 1)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange && onChange(i + 1)}
          >★</span>
        )
      })}
    </div>
  )
}

function Autocomplete({ placeholder, value, onChange, onSelect, fetchFn, renderItem, renderValue }) {
  const [query, setQuery] = useState(value ? renderValue(value) : '')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const ref = useRef(null)

  useEffect(() => {
    if (value) setQuery(renderValue(value))
  }, [value])

  const onInput = v => {
    setQuery(v)
    onChange && onChange(null)
    clearTimeout(timer.current)
    if (v.length < 2) { setOptions([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      try { const res = await fetchFn(v); setOptions(res); setOpen(true) } catch {}
    }, 300)
  }

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="cmp-input cmp-full"
        placeholder={placeholder}
        value={query}
        onChange={e => onInput(e.target.value)}
        onFocus={() => options.length && setOpen(true)}
      />
      {open && options.length > 0 && (
        <div className="cmp-autocomplete">
          {options.map((opt, i) => (
            <div key={i} className="cmp-ac-item" onClick={() => {
              onSelect(opt); setQuery(renderValue(opt)); setOptions([]); setOpen(false)
            }}>
              {renderItem(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal: Nueva Solicitud ────────────────────────────────────────────────────

function ModalNuevaSolicitud({ onClose, onOk }) {
  const [bodegas, setBodegas] = useState([])
  const [form, setForm] = useState({ bodega_id: '', prioridad: 'NORMAL', motivo: '', fecha_requerida: '' })
  const [items, setItems] = useState([{ producto: null, cantidad_solicitada: 1, costo_estimado: 0, notas: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/inventario/bodegas').then(r => setBodegas(r.data || [])).catch(() => {})
  }, [])

  const total = items.reduce((s, i) => s + (parseFloat(i.costo_estimado) || 0) * (parseFloat(i.cantidad_solicitada) || 0), 0)

  const addItem = () => setItems(p => [...p, { producto: null, cantidad_solicitada: 1, costo_estimado: 0, notas: '' }])
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const handleSubmit = async () => {
    if (!form.bodega_id) return setError('Seleccione una bodega')
    const validItems = items.filter(i => i.producto)
    if (!validItems.length) return setError('Agregue al menos un producto')
    setLoading(true); setError('')
    try {
      await api.post('/compras/solicitudes', {
        ...form,
        items: validItems.map(i => ({
          producto_id: i.producto.id,
          cantidad_solicitada: parseFloat(i.cantidad_solicitada),
          costo_estimado: parseFloat(i.costo_estimado) || 0,
          notas: i.notas,
        }))
      })
      toast.success('Solicitud de compra creada con éxito')
      onOk()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al crear solicitud')
      toast.error(e.response?.data?.error || 'Error al crear solicitud')
    } finally { setLoading(false) }
  }

  const fetchProductos = async q => {
    const r = await api.get('/inventario/productos', { params: { q, limit: 10 } })
    return r.data.data || []
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal cmp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={20} color="#F59E0B" />Nueva Solicitud de Compra</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Bodega</label>
            <select className="cmp-select" value={form.bodega_id} onChange={e => setForm(p => ({ ...p, bodega_id: e.target.value }))}>
              <option value="">Seleccione…</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Prioridad</label>
            <select className="cmp-select" value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))}>
              <option value="BAJA">Baja</option>
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Fecha requerida</label>
            <input className="cmp-input cmp-full" type="date" value={form.fecha_requerida} onChange={e => setForm(p => ({ ...p, fecha_requerida: e.target.value }))} />
          </div>
        </div>

        <div className="cmp-field">
          <label className="cmp-label">Motivo</label>
          <textarea className="cmp-textarea" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Describa el motivo de la solicitud…" />
        </div>

        <div className="cmp-items-header">
          <span className="cmp-items-title">Productos solicitados</span>
          <button className="cmp-btn cmp-btn-ghost cmp-btn-sm" onClick={addItem}><Plus size={13} />Agregar</button>
        </div>

        {items.map((item, idx) => (
          <div className="cmp-item-row" key={idx}>
            <button className="cmp-item-remove" onClick={() => removeItem(idx)}><X size={12} /></button>
            <div className="cmp-row" style={{ marginBottom: 8 }}>
              <div className="cmp-field" style={{ flex: 3 }}>
                <label className="cmp-label">Producto</label>
                <Autocomplete
                  placeholder="Buscar por nombre o SKU…"
                  value={item.producto}
                  onChange={() => updateItem(idx, 'producto', null)}
                  onSelect={p => { updateItem(idx, 'producto', p); updateItem(idx, 'costo_estimado', p.costo_promedio || 0) }}
                  fetchFn={fetchProductos}
                  renderValue={p => `${p.codigo_sku} — ${p.nombre}`}
                  renderItem={p => (
                    <div>
                      <div className="cmp-ac-name">{p.nombre}</div>
                      <div className="cmp-ac-meta">{p.codigo_sku} · Stock: {p.total_stock} {p.unidad_medida}</div>
                    </div>
                  )}
                />
              </div>
              <div className="cmp-field">
                <label className="cmp-label">Cantidad</label>
                <input className="cmp-input cmp-full" type="number" min="0.01" step="0.01" value={item.cantidad_solicitada} onChange={e => updateItem(idx, 'cantidad_solicitada', e.target.value)} />
              </div>
              <div className="cmp-field">
                <label className="cmp-label">Costo est. ($)</label>
                <input className="cmp-input cmp-full" type="number" min="0" value={item.costo_estimado} onChange={e => updateItem(idx, 'costo_estimado', e.target.value)} />
              </div>
            </div>
            <div className="cmp-field" style={{ margin: 0 }}>
              <label className="cmp-label">Notas</label>
              <input className="cmp-input cmp-full" value={item.notas} onChange={e => updateItem(idx, 'notas', e.target.value)} placeholder="Opcional…" />
            </div>
          </div>
        ))}

        {total > 0 && <div className="cmp-total-bar">Total estimado: {fmt(total)}</div>}

        {error && <div className="cmp-error"><AlertTriangle size={13} />{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="cmp-btn cmp-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="cmp-btn cmp-btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando…' : <><ClipboardList size={14} />Crear Solicitud</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Detalle Solicitud ──────────────────────────────────────────────────

function ModalDetalleSolicitud({ id, onClose, onAprobar, onConvertir }) {
  const [data, setData] = useState(null)
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin', 'administrador'].includes(usuario?.rol)

  useEffect(() => {
    api.get(`/compras/solicitudes/${id}`).then(r => setData(r.data)).catch(() => {})
  }, [id])

  const PRIOR_CLS = { URGENTE: 'badge-red', ALTA: 'badge-orange', NORMAL: 'badge-blue', BAJA: 'badge-gray' }
  const EST_CLS   = { PENDIENTE: 'badge-yellow', APROBADA: 'badge-green', RECHAZADA: 'badge-red', CONVERTIDA: 'badge-indigo' }

  if (!data) return (
    <div className="cmp-overlay"><div className="cmp-modal"><div className="cmp-empty">Cargando…</div></div></div>
  )

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal cmp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span>Solicitud #{data.numero}</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`cmp-badge ${EST_CLS[data.estado]}`}>{data.estado}</span>
          <span className={`cmp-badge ${PRIOR_CLS[data.prioridad]}`}>{data.prioridad}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Solicitante: <strong>{data.solicitante_nombre}</strong></span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Bodega: <strong>{data.bodega_nombre}</strong></span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Fecha req.: <strong>{fmtDate(data.fecha_requerida)}</strong></span>
        </div>

        {data.motivo && <div className="cmp-info-card"><div className="cmp-info-card-title">Motivo</div>{data.motivo}</div>}

        {data.estado === 'APROBADA' && (
          <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#059669' }}>
            <CheckCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
            Aprobado por <strong>{data.aprobado_por_nombre}</strong> el {fmtDate(data.fecha_aprobacion)}
          </div>
        )}

        {data.estado === 'RECHAZADA' && (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#EF4444' }}>
            <X size={14} style={{ display: 'inline', marginRight: 6 }} />
            Rechazado: {data.notas_rechazo}
          </div>
        )}

        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead><tr>
              <th>Producto</th><th>SKU</th><th>Stock</th><th>Cant. Sol.</th><th>Cant. Apr.</th><th>Costo Est.</th>
            </tr></thead>
            <tbody>
              {(data.items || []).map(i => (
                <tr key={i.id}>
                  <td><strong>{i.producto_nombre}</strong></td>
                  <td style={{ fontSize: 11 }}>{i.codigo_sku}</td>
                  <td>{i.stock_actual} {i.unidad_medida}</td>
                  <td>{i.cantidad_solicitada}</td>
                  <td style={{ color: i.cantidad_aprobada ? '#059669' : '#9CA3AF' }}>{i.cantidad_aprobada ?? '—'}</td>
                  <td>{fmt(i.costo_estimado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.historial?.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '16px 0 8px' }}>TRAZABILIDAD</div>
            <div style={{ marginBottom: 4 }}>
              {data.historial.map(h => (
                <div key={h.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #F4F5FA' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', minWidth: 130 }}>
                    {new Date(h.creado_en).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#374151' }}>
                    {h.accion} <span style={{ color: '#9CA3AF' }}>· {h.usuario_nombre || 'Sistema'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          {esAdmin && data.estado === 'PENDIENTE' && (
            <>
              <button className="cmp-btn cmp-btn-success cmp-btn-sm" onClick={() => { onAprobar(data); onClose() }}>
                <Check size={13} />Aprobar
              </button>
              <button className="cmp-btn cmp-btn-danger cmp-btn-sm" onClick={() => {
                const notas = prompt('Motivo de rechazo:')
                if (notas) api.patch(`/compras/solicitudes/${id}/rechazar`, { notas_rechazo: notas })
                  .then(() => { toast.success('Solicitud rechazada con éxito'); onClose() })
                  .catch(e => toast.error(e.response?.data?.error || 'Error al rechazar la solicitud'))
              }}>
                <X size={13} />Rechazar
              </button>
            </>
          )}
          {esAdmin && data.estado === 'APROBADA' && (
            <button className="cmp-btn cmp-btn-primary cmp-btn-sm" onClick={() => { onConvertir(data); onClose() }}>
              <FileCheck size={13} />Convertir en OC
            </button>
          )}
          <button className="cmp-btn cmp-btn-ghost cmp-btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Aprobar Solicitud ──────────────────────────────────────────────────

function ModalAprobarSolicitud({ solicitud, onClose, onOk }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get(`/compras/solicitudes/${solicitud.id}`).then(r => {
      setItems((r.data.items || []).map(i => ({ ...i, cantidad_aprobada_input: i.cantidad_solicitada })))
    }).catch(() => {})
  }, [solicitud.id])

  const handleAprobar = async () => {
    setLoading(true)
    try {
      await api.patch(`/compras/solicitudes/${solicitud.id}/aprobar`, {
        items: items.map(i => ({ id: i.id, cantidad_aprobada: parseFloat(i.cantidad_aprobada_input) }))
      })
      toast.success('Solicitud aprobada con éxito')
      onOk()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span><ThumbsUp size={18} color="#059669" style={{ marginRight: 8 }} />Aprobar Solicitud #{solicitud.numero}</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Puede ajustar la cantidad aprobada por ítem.</p>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, background: '#F8F9FC', padding: '10px 12px', borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{item.producto_nombre}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Solicitado: {item.cantidad_solicitada} {item.unidad_medida}</div>
            </div>
            <div>
              <label className="cmp-label" style={{ marginBottom: 4 }}>Cant. Aprobada</label>
              <input className="cmp-input" style={{ width: 100 }} type="number" min="0" max={item.cantidad_solicitada} step="0.01"
                value={item.cantidad_aprobada_input}
                onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, cantidad_aprobada_input: e.target.value } : it))} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="cmp-btn cmp-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="cmp-btn cmp-btn-success" style={{ flex: 2 }} onClick={handleAprobar} disabled={loading}>
            {loading ? 'Aprobando…' : <><Check size={14} />Confirmar Aprobación</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Convertir a OC ─────────────────────────────────────────────────────

function ModalConvertirOC({ solicitud, onClose, onOk }) {
  const [proveedores, setProveedores] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [form, setForm] = useState({ proveedor_id: '', bodega_destino_id: '', fecha_esperada: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/compras/proveedores').then(r => setProveedores(r.data || [])).catch(() => {})
    api.get('/inventario/bodegas').then(r => setBodegas(r.data || [])).catch(() => {})
  }, [])

  const handleConvertir = async () => {
    if (!form.proveedor_id || !form.bodega_destino_id) return setError('Complete todos los campos')
    setLoading(true); setError('')
    try {
      await api.post(`/compras/solicitudes/${solicitud.id}/convertir`, form)
      toast.success('Solicitud convertida en orden de compra con éxito')
      onOk()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al convertir')
      toast.error(e.response?.data?.error || 'Error al convertir')
    } finally { setLoading(false) }
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span><FileCheck size={18} color="#F59E0B" style={{ marginRight: 8 }} />Convertir en Orden de Compra</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cmp-info-card">
          <div className="cmp-info-card-title">Solicitud #{solicitud.numero}</div>
          <span style={{ fontSize: 12, color: '#374151' }}>{solicitud.motivo || 'Sin motivo especificado'}</span>
        </div>
        <div className="cmp-field">
          <label className="cmp-label">Proveedor</label>
          <select className="cmp-select" value={form.proveedor_id} onChange={e => setForm(p => ({ ...p, proveedor_id: e.target.value }))}>
            <option value="">Seleccione proveedor…</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo_proveedor})</option>)}
          </select>
        </div>
        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Bodega destino</label>
            <select className="cmp-select" value={form.bodega_destino_id} onChange={e => setForm(p => ({ ...p, bodega_destino_id: e.target.value }))}>
              <option value="">Seleccione…</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Fecha esperada entrega</label>
            <input className="cmp-input cmp-full" type="date" value={form.fecha_esperada} onChange={e => setForm(p => ({ ...p, fecha_esperada: e.target.value }))} />
          </div>
        </div>
        {error && <div className="cmp-error"><AlertTriangle size={13} />{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="cmp-btn cmp-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="cmp-btn cmp-btn-primary" style={{ flex: 2 }} onClick={handleConvertir} disabled={loading}>
            {loading ? 'Convirtiendo…' : <><FileCheck size={14} />Crear Orden de Compra</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Nuevo/Editar Proveedor ─────────────────────────────────────────────

function ModalProveedor({ proveedor, onClose, onOk }) {
  const [terceros, setTerceros] = useState([])
  const [form, setForm] = useState({
    tercero_id: proveedor?.tercero_id || '',
    tipo_proveedor: proveedor?.tipo_proveedor || 'GENERAL',
    condicion_pago: proveedor?.condicion_pago || 'CONTADO',
    dias_entrega: proveedor?.dias_entrega || 1,
    descuento_habitual: proveedor?.descuento_habitual || 0,
    contacto_nombre: proveedor?.contacto_nombre || '',
    contacto_cargo: proveedor?.contacto_cargo || '',
    banco: proveedor?.banco || '',
    numero_cuenta: proveedor?.numero_cuenta || '',
    tipo_cuenta: proveedor?.tipo_cuenta || '',
  })
  const [terceroSel, setTerceroSel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTerceros = async q => {
    const r = await api.get('/terceros', { params: { q, limit: 10 } })
    return r.data.data || []
  }

  const handleSubmit = async () => {
    if (!proveedor && !form.tercero_id) return setError('Seleccione un tercero')
    setLoading(true); setError('')
    try {
      if (proveedor) {
        await api.put(`/compras/proveedores/${proveedor.id}`, form)
      } else {
        await api.post('/compras/proveedores', form)
      }
      toast.success(proveedor ? 'Proveedor actualizado con éxito' : 'Proveedor creado con éxito')
      onOk()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar')
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally { setLoading(false) }
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span><Truck size={18} color="#F59E0B" style={{ marginRight: 8 }} />{proveedor ? 'Editar' : 'Nuevo'} Proveedor</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {!proveedor && (
          <div className="cmp-field">
            <label className="cmp-label">Tercero (persona/empresa)</label>
            <Autocomplete
              placeholder="Buscar por nombre o NIT…"
              value={terceroSel}
              onChange={() => { setTerceroSel(null); setForm(p => ({ ...p, tercero_id: '' })) }}
              onSelect={t => { setTerceroSel(t); setForm(p => ({ ...p, tercero_id: t.id })) }}
              fetchFn={fetchTerceros}
              renderValue={t => `${t.nombre} (${t.nit || t.numero_documento || '—'})`}
              renderItem={t => (
                <div>
                  <div className="cmp-ac-name">{t.nombre}</div>
                  <div className="cmp-ac-meta">{t.nit || t.numero_documento} · {t.telefono}</div>
                </div>
              )}
            />
          </div>
        )}

        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Tipo proveedor</label>
            <select className="cmp-select" value={form.tipo_proveedor} onChange={e => setForm(p => ({ ...p, tipo_proveedor: e.target.value }))}>
              {['GENERAL','ATAUD','FLORES','INSUMOS','SERVICIOS','PAPELERIA'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Condición de pago</label>
            <select className="cmp-select" value={form.condicion_pago} onChange={e => setForm(p => ({ ...p, condicion_pago: e.target.value }))}>
              {['CONTADO','8_DIAS','15_DIAS','30_DIAS','45_DIAS','60_DIAS'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Días de entrega</label>
            <input className="cmp-input cmp-full" type="number" min="1" value={form.dias_entrega} onChange={e => setForm(p => ({ ...p, dias_entrega: e.target.value }))} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Descuento habitual (%)</label>
            <input className="cmp-input cmp-full" type="number" min="0" max="100" step="0.1" value={form.descuento_habitual} onChange={e => setForm(p => ({ ...p, descuento_habitual: e.target.value }))} />
          </div>
        </div>

        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Nombre contacto</label>
            <input className="cmp-input cmp-full" value={form.contacto_nombre} onChange={e => setForm(p => ({ ...p, contacto_nombre: e.target.value }))} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Cargo contacto</label>
            <input className="cmp-input cmp-full" value={form.contacto_cargo} onChange={e => setForm(p => ({ ...p, contacto_cargo: e.target.value }))} />
          </div>
        </div>

        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Banco</label>
            <input className="cmp-input cmp-full" value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">N° cuenta</label>
            <input className="cmp-input cmp-full" value={form.numero_cuenta} onChange={e => setForm(p => ({ ...p, numero_cuenta: e.target.value }))} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Tipo cuenta</label>
            <select className="cmp-select" value={form.tipo_cuenta} onChange={e => setForm(p => ({ ...p, tipo_cuenta: e.target.value }))}>
              <option value="">Seleccione…</option>
              {['AHORROS','CORRIENTE','NEQUI','DAVIPLATA'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="cmp-error"><AlertTriangle size={13} />{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="cmp-btn cmp-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="cmp-btn cmp-btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando…' : <><Truck size={14} />Guardar Proveedor</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Calificar Proveedor ────────────────────────────────────────────────

function ModalCalificar({ proveedor, onClose, onOk }) {
  const [cal, setCal] = useState(5)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post(`/compras/proveedores/${proveedor.id}/calificar`, { calificacion: cal })
      toast.success('Calificación guardada con éxito')
      onOk()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span><Star size={18} color="#F59E0B" style={{ marginRight: 8 }} />Calificar Proveedor</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1035', marginBottom: 12 }}>{proveedor.nombre}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <Stars value={cal} max={5} interactive onChange={setCal} />
          </div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>{cal === 5 ? 'Excelente' : cal === 4 ? 'Muy bueno' : cal === 3 ? 'Bueno' : cal === 2 ? 'Regular' : 'Deficiente'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="cmp-btn cmp-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="cmp-btn cmp-btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando…' : <><Star size={14} />Guardar Calificación</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Nueva OC ───────────────────────────────────────────────────────────

function ModalNuevaOC({ onClose, onOk }) {
  const [proveedores, setProveedores] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [form, setForm] = useState({ proveedor_id: '', bodega_destino_id: '', fecha_esperada: '', notas: '' })
  const [items, setItems] = useState([{ producto: null, cantidad_solicitada: 1, costo_unitario: 0, notas: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/compras/proveedores').then(r => setProveedores(r.data || [])).catch(() => {})
    api.get('/inventario/bodegas').then(r => setBodegas(r.data || [])).catch(() => {})
  }, [])

  const addItem = () => setItems(p => [...p, { producto: null, cantidad_solicitada: 1, costo_unitario: 0, notas: '' }])
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))
  const total = items.reduce((s, i) => s + (parseFloat(i.costo_unitario) || 0) * (parseFloat(i.cantidad_solicitada) || 0), 0)

  const fetchProductos = async q => {
    const r = await api.get('/inventario/productos', { params: { q, limit: 10 } })
    return r.data.data || []
  }

  const handleSubmit = async () => {
    if (!form.proveedor_id || !form.bodega_destino_id) return setError('Complete proveedor y bodega')
    const validItems = items.filter(i => i.producto)
    if (!validItems.length) return setError('Agregue al menos un producto')
    setLoading(true); setError('')
    try {
      await api.post('/compras/ordenes', {
        ...form,
        items: validItems.map(i => ({
          producto_id: i.producto.id,
          cantidad_solicitada: parseFloat(i.cantidad_solicitada),
          costo_unitario: parseFloat(i.costo_unitario),
          notas: i.notas,
        }))
      })
      toast.success('Orden de compra creada con éxito')
      onOk()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al crear OC')
      toast.error(e.response?.data?.error || 'Error al crear OC')
    }
    finally { setLoading(false) }
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal cmp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span><ShoppingCart size={20} color="#F59E0B" />Nueva Orden de Compra</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cmp-row">
          <div className="cmp-field" style={{ flex: 2 }}>
            <label className="cmp-label">Proveedor</label>
            <select className="cmp-select" value={form.proveedor_id} onChange={e => setForm(p => ({ ...p, proveedor_id: e.target.value }))}>
              <option value="">Seleccione…</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.tipo_proveedor}</option>)}
            </select>
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Bodega destino</label>
            <select className="cmp-select" value={form.bodega_destino_id} onChange={e => setForm(p => ({ ...p, bodega_destino_id: e.target.value }))}>
              <option value="">Seleccione…</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Fecha esperada</label>
            <input className="cmp-input cmp-full" type="date" value={form.fecha_esperada} onChange={e => setForm(p => ({ ...p, fecha_esperada: e.target.value }))} />
          </div>
        </div>
        <div className="cmp-field">
          <label className="cmp-label">Notas</label>
          <input className="cmp-input cmp-full" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Opcional…" />
        </div>

        <div className="cmp-items-header">
          <span className="cmp-items-title">Productos</span>
          <button className="cmp-btn cmp-btn-ghost cmp-btn-sm" onClick={addItem}><Plus size={13} />Agregar</button>
        </div>

        {items.map((item, idx) => (
          <div className="cmp-item-row" key={idx}>
            <button className="cmp-item-remove" onClick={() => removeItem(idx)}><X size={12} /></button>
            <div className="cmp-row">
              <div className="cmp-field" style={{ flex: 3 }}>
                <label className="cmp-label">Producto</label>
                <Autocomplete
                  placeholder="Buscar producto…"
                  value={item.producto}
                  onChange={() => updateItem(idx, 'producto', null)}
                  onSelect={p => { updateItem(idx, 'producto', p); updateItem(idx, 'costo_unitario', p.costo_promedio || 0) }}
                  fetchFn={fetchProductos}
                  renderValue={p => `${p.codigo_sku} — ${p.nombre}`}
                  renderItem={p => (
                    <div>
                      <div className="cmp-ac-name">{p.nombre}</div>
                      <div className="cmp-ac-meta">{p.codigo_sku} · {fmt(p.costo_promedio)}</div>
                    </div>
                  )}
                />
              </div>
              <div className="cmp-field">
                <label className="cmp-label">Cantidad</label>
                <input className="cmp-input cmp-full" type="number" min="0.01" step="0.01" value={item.cantidad_solicitada} onChange={e => updateItem(idx, 'cantidad_solicitada', e.target.value)} />
              </div>
              <div className="cmp-field">
                <label className="cmp-label">Costo unit.</label>
                <input className="cmp-input cmp-full" type="number" min="0" value={item.costo_unitario} onChange={e => updateItem(idx, 'costo_unitario', e.target.value)} />
              </div>
            </div>
          </div>
        ))}

        {total > 0 && <div className="cmp-total-bar">Total OC: {fmt(total)}</div>}
        {error && <div className="cmp-error"><AlertTriangle size={13} />{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="cmp-btn cmp-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="cmp-btn cmp-btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando…' : <><ShoppingCart size={14} />Crear Orden de Compra</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Nueva Recepción ────────────────────────────────────────────────────

function ModalNuevaRecepcion({ onClose, onOk }) {
  const [step, setStep] = useState(1)
  const [ocs, setOcs] = useState([])
  const [ocSel, setOcSel] = useState(null)
  const [ocDetalle, setOcDetalle] = useState(null)
  const [bodegas, setBodegas] = useState([])
  const [form, setForm] = useState({ numero_remision: '', observaciones: '' })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/compras/ordenes', { params: { estado: 'APROBADA', limit: 50 } }).then(r => setOcs(r.data.data || [])).catch(() => {})
    api.get('/inventario/bodegas').then(r => setBodegas(r.data || [])).catch(() => {})
  }, [])

  const selectOC = async oc => {
    setOcSel(oc)
    const r = await api.get(`/compras/ordenes/${oc.id}`)
    setOcDetalle(r.data)
    setItems((r.data.detalle || []).map(d => ({
      producto_id: d.producto_id,
      producto_nombre: d.producto_nombre,
      cantidad_esperada: d.cantidad_solicitada,
      cantidad_recibida: d.cantidad_solicitada,
      cantidad_rechazada: 0,
      costo_unitario: d.costo_unitario,
      ubicacion_id: '',
      motivo_rechazo: '',
    })))
    setStep(2)
  }

  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      await api.post('/compras/recepciones', {
        orden_compra_id: ocSel.id,
        ...form,
        items: items.map(i => ({
          ...i,
          cantidad_recibida: parseFloat(i.cantidad_recibida),
          cantidad_rechazada: parseFloat(i.cantidad_rechazada) || 0,
          costo_unitario: parseFloat(i.costo_unitario),
        }))
      })
      toast.success('Recepción registrada con éxito')
      onOk()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al registrar recepción')
      toast.error(e.response?.data?.error || 'Error al registrar recepción')
    } finally { setLoading(false) }
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal cmp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span><Package size={20} color="#F59E0B" />Registrar Recepción {step === 2 ? '— ' + (ocSel?.proveedor_nombre || '') : ''}</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {step === 1 && (
          <>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Seleccione la Orden de Compra a recibir:</p>
            {ocs.length === 0 ? (
              <div className="cmp-empty">No hay OC aprobadas pendientes de recepción</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ocs.map(oc => (
                  <div key={oc.id} style={{ background: '#F8F9FC', border: '1.5px solid #ECEDF8', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'all .15s' }}
                    onClick={() => selectOC(oc)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#F59E0B'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#ECEDF8'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: '#F59E0B' }}>OC #{oc.numero}</span>
                        <span style={{ marginLeft: 10, fontSize: 13, color: '#374151' }}>{oc.proveedor_nombre}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#059669' }}>{fmt(oc.total)}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{oc.total_items} ítem(s) · {fmtDate(oc.fecha_esperada)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && ocDetalle && (
          <>
            <div className="cmp-info-card">
              <div className="cmp-info-card-title">OC #{ocDetalle.numero} — {ocDetalle.proveedor_nombre}</div>
              <span style={{ fontSize: 12 }}>Bodega: {ocDetalle.bodega_nombre} · Total: {fmt(ocDetalle.total)}</span>
            </div>
            <div className="cmp-row">
              <div className="cmp-field">
                <label className="cmp-label">N° Remisión / Factura</label>
                <input className="cmp-input cmp-full" value={form.numero_remision} onChange={e => setForm(p => ({ ...p, numero_remision: e.target.value }))} placeholder="REF-001…" />
              </div>
            </div>
            <div className="cmp-field">
              <label className="cmp-label">Observaciones</label>
              <textarea className="cmp-textarea" value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Opcional…" style={{ minHeight: 60 }} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>Ítems recibidos</div>

            {items.map((item, idx) => (
              <div key={idx} className="cmp-item-row">
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{item.producto_nombre}</div>
                <div className="cmp-row">
                  <div className="cmp-field">
                    <label className="cmp-label">Esperado</label>
                    <input className="cmp-input cmp-full" type="number" readOnly value={item.cantidad_esperada} style={{ background: '#F3F4F6' }} />
                  </div>
                  <div className="cmp-field">
                    <label className="cmp-label">Recibido</label>
                    <input className="cmp-input cmp-full" type="number" min="0" step="0.01" value={item.cantidad_recibida} onChange={e => updateItem(idx, 'cantidad_recibida', e.target.value)} />
                  </div>
                  <div className="cmp-field">
                    <label className="cmp-label">Rechazado</label>
                    <input className="cmp-input cmp-full" type="number" min="0" step="0.01" value={item.cantidad_rechazada} onChange={e => updateItem(idx, 'cantidad_rechazada', e.target.value)} />
                  </div>
                  <div className="cmp-field">
                    <label className="cmp-label">Costo unit.</label>
                    <input className="cmp-input cmp-full" type="number" min="0" value={item.costo_unitario} onChange={e => updateItem(idx, 'costo_unitario', e.target.value)} />
                  </div>
                </div>
                {parseFloat(item.cantidad_rechazada) > 0 && (
                  <div className="cmp-field" style={{ margin: '8px 0 0' }}>
                    <label className="cmp-label">Motivo rechazo</label>
                    <input className="cmp-input cmp-full" value={item.motivo_rechazo} onChange={e => updateItem(idx, 'motivo_rechazo', e.target.value)} placeholder="Describa el motivo…" />
                  </div>
                )}
              </div>
            ))}

            {error && <div className="cmp-error"><AlertTriangle size={13} />{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="cmp-btn cmp-btn-ghost cmp-btn-sm" onClick={() => setStep(1)}>← Volver</button>
              <div style={{ flex: 1 }} />
              <button className="cmp-btn cmp-btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="cmp-btn cmp-btn-success" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Registrando…' : <><Check size={14} />Confirmar Recepción</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal: Pagar Cuenta ───────────────────────────────────────────────────────

function ModalPagarCuenta({ cuenta, onClose, onOk }) {
  const [form, setForm] = useState({
    monto: parseFloat(cuenta.monto_pendiente) || 0,
    metodo_pago: 'Efectivo',
    referencia_pago: '',
    fecha_pago: new Date().toISOString().slice(0, 10),
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePagar = async () => {
    if (parseFloat(form.monto) <= 0) return setError('El monto debe ser mayor a 0')
    if (parseFloat(form.monto) > parseFloat(cuenta.monto_pendiente)) return setError('El monto no puede superar el saldo pendiente')
    setLoading(true); setError('')
    try {
      await api.post(`/compras/cuentas-pagar/${cuenta.id}/pagar`, form)
      toast.success('Pago registrado con éxito')
      onOk()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al registrar pago')
      toast.error(e.response?.data?.error || 'Error al registrar pago')
    } finally { setLoading(false) }
  }

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span><CreditCard size={18} color="#F59E0B" style={{ marginRight: 8 }} />Registrar Pago</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cmp-info-card">
          <div className="cmp-info-card-title">{cuenta.proveedor_nombre}</div>
          <div style={{ fontSize: 12, color: '#374151' }}>{cuenta.concepto}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div><span style={{ fontSize: 11, color: '#9CA3AF' }}>Total </span><strong>{fmt(cuenta.monto_total)}</strong></div>
            <div><span style={{ fontSize: 11, color: '#9CA3AF' }}>Pagado </span><strong style={{ color: '#059669' }}>{fmt(cuenta.monto_pagado)}</strong></div>
            <div><span style={{ fontSize: 11, color: '#9CA3AF' }}>Pendiente </span><strong style={{ color: '#EF4444' }}>{fmt(cuenta.monto_pendiente)}</strong></div>
          </div>
        </div>
        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Monto a pagar ($)</label>
            <input className="cmp-input cmp-full" type="number" min="0" max={cuenta.monto_pendiente} step="100" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Fecha pago</label>
            <input className="cmp-input cmp-full" type="date" value={form.fecha_pago} onChange={e => setForm(p => ({ ...p, fecha_pago: e.target.value }))} />
          </div>
        </div>
        <div className="cmp-row">
          <div className="cmp-field">
            <label className="cmp-label">Método de pago</label>
            <select className="cmp-select" value={form.metodo_pago} onChange={e => setForm(p => ({ ...p, metodo_pago: e.target.value }))}>
              {['Efectivo','Transferencia','Cheque','Nequi','Daviplata'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {form.metodo_pago !== 'Efectivo' && (
            <div className="cmp-field">
              <label className="cmp-label">Referencia</label>
              <input className="cmp-input cmp-full" value={form.referencia_pago} onChange={e => setForm(p => ({ ...p, referencia_pago: e.target.value }))} placeholder="N° transacción…" />
            </div>
          )}
        </div>
        <div className="cmp-field">
          <label className="cmp-label">Notas</label>
          <input className="cmp-input cmp-full" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Opcional…" />
        </div>
        {error && <div className="cmp-error"><AlertTriangle size={13} />{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="cmp-btn cmp-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="cmp-btn cmp-btn-success" style={{ flex: 2 }} onClick={handlePagar} disabled={loading}>
            {loading ? 'Registrando…' : <><CreditCard size={14} />Registrar Pago · {fmt(form.monto)}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const PRIOR_CLS = { URGENTE: 'badge-red', ALTA: 'badge-orange', NORMAL: 'badge-blue', BAJA: 'badge-gray' }
const SOL_EST_CLS = { PENDIENTE: 'badge-yellow', APROBADA: 'badge-green', RECHAZADA: 'badge-red', CONVERTIDA: 'badge-indigo' }
const OC_EST_CLS  = { BORRADOR: 'badge-gray', PENDIENTE: 'badge-yellow', APROBADA: 'badge-blue', RECIBIDA: 'badge-green', CANCELADA: 'badge-red', PARCIAL: 'badge-orange' }
const REC_EST_CLS = { PENDIENTE: 'badge-yellow', PARCIAL: 'badge-orange', COMPLETA: 'badge-green', CON_DISCREPANCIA: 'badge-red' }
const CXP_EST_CLS = { PENDIENTE: 'badge-yellow', PARCIAL: 'badge-orange', PAGADA: 'badge-green', VENCIDA: 'badge-red', ANULADA: 'badge-gray' }
const TIPO_PROV_CLS = { GENERAL: 'badge-gray', ATAUD: 'badge-gray', FLORES: 'badge-pink', INSUMOS: 'badge-blue', SERVICIOS: 'badge-indigo', PAPELERIA: 'badge-orange' }

function TabSolicitudes({ onRefreshStats }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ estado: '', prioridad: '', page: 1 })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // nueva | detalle | aprobar | convertir
  const [selected, setSelected] = useState(null)
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin', 'administrador'].includes(usuario?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/compras/solicitudes', { params: filters })
      setData(r.data.data || []); setTotal(r.data.total || 0)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { cargar() }, [cargar])

  const closeModal = () => { setModal(null); setSelected(null); cargar(); onRefreshStats() }

  return (
    <div>
      <div className="cmp-filters">
        <select className="cmp-input" style={{ width: 160 }} value={filters.estado} onChange={e => setFilters(p => ({ ...p, estado: e.target.value, page: 1 }))}>
          <option value="">Todos los estados</option>
          {['PENDIENTE','APROBADA','RECHAZADA','CONVERTIDA'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="cmp-input" style={{ width: 140 }} value={filters.prioridad} onChange={e => setFilters(p => ({ ...p, prioridad: e.target.value, page: 1 }))}>
          <option value="">Todas las prioridades</option>
          {['BAJA','NORMAL','ALTA','URGENTE'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="cmp-btn cmp-btn-ghost" onClick={cargar}><RefreshCw size={14} /></button>
        <div style={{ flex: 1 }} />
        <button className="cmp-btn cmp-btn-primary" onClick={() => setModal('nueva')}><Plus size={14} />Nueva Solicitud</button>
      </div>

      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{total} solicitud(es)</div>

      <div className="cmp-table-wrap">
        {loading ? <div className="cmp-empty">Cargando…</div> : data.length === 0 ? (
          <div className="cmp-empty">No hay solicitudes</div>
        ) : (
          <table className="cmp-table">
            <thead><tr>
              <th>N°</th><th>Solicitante</th><th>Bodega</th><th>Prioridad</th>
              <th>Ítems</th><th>Fecha req.</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {data.map(s => (
                <tr key={s.id}>
                  <td><strong style={{ color: '#F59E0B' }}>#{s.numero}</strong></td>
                  <td>{s.solicitante_nombre}</td>
                  <td style={{ fontSize: 12 }}>{s.bodega_nombre}</td>
                  <td><span className={`cmp-badge ${PRIOR_CLS[s.prioridad]}`}>{s.prioridad}</span></td>
                  <td>{s.total_items}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(s.fecha_requerida)}</td>
                  <td><span className={`cmp-badge ${SOL_EST_CLS[s.estado]}`}>{s.estado}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="cmp-btn cmp-btn-ghost cmp-btn-xs" onClick={() => { setSelected(s); setModal('detalle') }}><Eye size={11} />Ver</button>
                      {esAdmin && s.estado === 'PENDIENTE' && (
                        <button className="cmp-btn cmp-btn-success cmp-btn-xs" onClick={() => { setSelected(s); setModal('aprobar') }}><Check size={11} />Aprobar</button>
                      )}
                      {esAdmin && s.estado === 'APROBADA' && (
                        <button className="cmp-btn cmp-btn-primary cmp-btn-xs" onClick={() => { setSelected(s); setModal('convertir') }}><FileCheck size={11} />Convertir</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'nueva'    && <ModalNuevaSolicitud onClose={closeModal} onOk={closeModal} />}
      {modal === 'detalle'  && selected && <ModalDetalleSolicitud id={selected.id} onClose={closeModal} onAprobar={s => { setSelected(s); setModal('aprobar') }} onConvertir={s => { setSelected(s); setModal('convertir') }} />}
      {modal === 'aprobar'  && selected && <ModalAprobarSolicitud solicitud={selected} onClose={closeModal} onOk={closeModal} />}
      {modal === 'convertir'&& selected && <ModalConvertirOC solicitud={selected} onClose={closeModal} onOk={closeModal} />}
    </div>
  )
}

function TabProveedores({ onRefreshStats }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin', 'administrador'].includes(usuario?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/compras/proveedores'); setData(r.data || []) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])
  const closeModal = () => { setModal(null); setSelected(null); cargar() }

  const initials = name => (name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div>
      <div className="cmp-filters">
        <button className="cmp-btn cmp-btn-ghost" onClick={cargar}><RefreshCw size={14} /></button>
        <div style={{ flex: 1 }} />
        {esAdmin && <button className="cmp-btn cmp-btn-primary" onClick={() => setModal('nuevo')}><Plus size={14} />Nuevo Proveedor</button>}
      </div>

      {loading ? <div className="cmp-empty">Cargando…</div> : data.length === 0 ? (
        <div className="cmp-empty">No hay proveedores registrados</div>
      ) : (
        <div className="cmp-prov-grid">
          {data.map(p => (
            <div key={p.id} className="cmp-prov-card">
              <div className="cmp-prov-avatar">{initials(p.nombre)}</div>
              <div className="cmp-prov-name">{p.nombre}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <span className={`cmp-badge ${TIPO_PROV_CLS[p.tipo_proveedor]}`}>{p.tipo_proveedor}</span>
                <span className="cmp-badge badge-gray">{(p.condicion_pago || '').replace('_', ' ')}</span>
              </div>
              <div className="cmp-prov-stars">
                <Stars value={parseFloat(p.calificacion) || 0} />
                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>{parseFloat(p.calificacion || 0).toFixed(1)}</span>
              </div>
              <div className="cmp-prov-info">
                {p.telefono && <div className="cmp-prov-info-row"><Phone size={11} />{p.telefono}</div>}
                {p.email    && <div className="cmp-prov-info-row"><Mail size={11} />{p.email}</div>}
                <div className="cmp-prov-info-row"><Truck size={11} />{p.dias_entrega} día(s) entrega</div>
                <div className="cmp-prov-info-row"><ShoppingCart size={11} />Total compras: {fmt(p.total_compras)}</div>
              </div>
              <div className="cmp-prov-actions">
                {esAdmin && <button className="cmp-btn cmp-btn-ghost cmp-btn-xs" onClick={() => { setSelected(p); setModal('editar') }}><Edit3 size={11} />Editar</button>}
                <button className="cmp-btn cmp-btn-ghost cmp-btn-xs" onClick={() => { setSelected(p); setModal('calificar') }}><Star size={11} />Calificar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'nuevo'    && <ModalProveedor onClose={closeModal} onOk={closeModal} />}
      {modal === 'editar'   && selected && <ModalProveedor proveedor={selected} onClose={closeModal} onOk={closeModal} />}
      {modal === 'calificar'&& selected && <ModalCalificar proveedor={selected} onClose={closeModal} onOk={closeModal} />}
    </div>
  )
}

function TabOrdenes({ onRefreshStats }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ estado: '', desde: '', hasta: '', page: 1 })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin', 'administrador'].includes(usuario?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/compras/ordenes', { params: filters })
      setData(r.data.data || []); setTotal(r.data.total || 0)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { cargar() }, [cargar])
  const closeModal = () => { setModal(null); setSelected(null); cargar(); onRefreshStats() }

  const handleEnviar = async (id) => {
    if (!confirm('¿Enviar esta OC a aprobación?')) return
    try { await api.patch(`/compras/ordenes/${id}/enviar`); toast.success('Orden enviada a aprobación con éxito'); cargar(); onRefreshStats() }
    catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const handleAprobar = async (id) => {
    if (!confirm('¿Confirma la aprobación de esta OC?')) return
    try { await api.patch(`/compras/ordenes/${id}/aprobar`); toast.success('Orden de compra aprobada con éxito'); cargar(); onRefreshStats() }
    catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar esta OC?')) return
    try { await api.patch(`/compras/ordenes/${id}/cancelar`); toast.success('Orden de compra cancelada con éxito'); cargar() }
    catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  return (
    <div>
      <div className="cmp-filters">
        <select className="cmp-input" style={{ width: 160 }} value={filters.estado} onChange={e => setFilters(p => ({ ...p, estado: e.target.value, page: 1 }))}>
          <option value="">Todos los estados</option>
          {['BORRADOR','PENDIENTE','APROBADA','RECIBIDA','CANCELADA'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input className="cmp-input" type="date" value={filters.desde} onChange={e => setFilters(p => ({ ...p, desde: e.target.value }))} title="Desde" />
        <input className="cmp-input" type="date" value={filters.hasta} onChange={e => setFilters(p => ({ ...p, hasta: e.target.value }))} title="Hasta" />
        <button className="cmp-btn cmp-btn-ghost" onClick={cargar}><RefreshCw size={14} /></button>
        <div style={{ flex: 1 }} />
        {esAdmin && <button className="cmp-btn cmp-btn-primary" onClick={() => setModal('nueva')}><Plus size={14} />Nueva OC</button>}
      </div>

      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{total} orden(es)</div>

      <div className="cmp-table-wrap">
        {loading ? <div className="cmp-empty">Cargando…</div> : data.length === 0 ? (
          <div className="cmp-empty">No hay órdenes de compra</div>
        ) : (
          <table className="cmp-table">
            <thead><tr>
              <th>N° OC</th><th>Proveedor</th><th>Bodega</th><th>Emisión</th><th>Esperada</th><th>Ítems</th><th>Total</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {data.map(o => (
                <tr key={o.id}>
                  <td><strong style={{ color: '#F59E0B' }}>#{o.numero}</strong></td>
                  <td>{o.proveedor_nombre || <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                  <td style={{ fontSize: 12 }}>{o.bodega_nombre}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(o.creado_en)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(o.fecha_esperada)}</td>
                  <td>{o.total_items}</td>
                  <td><strong style={{ color: '#059669' }}>{fmt(o.total)}</strong></td>
                  <td><span className={`cmp-badge ${OC_EST_CLS[o.estado]}`}>{o.estado}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="cmp-btn cmp-btn-ghost cmp-btn-xs" onClick={() => { setSelected(o); setModal('detalle') }}><Eye size={11} />Ver</button>
                      {esAdmin && o.estado === 'BORRADOR' && <button className="cmp-btn cmp-btn-ghost cmp-btn-xs" onClick={() => handleEnviar(o.id)}>Enviar a aprobación</button>}
                      {esAdmin && o.estado === 'PENDIENTE' && <button className="cmp-btn cmp-btn-success cmp-btn-xs" onClick={() => handleAprobar(o.id)}><Check size={11} />Aprobar</button>}
                      {esAdmin && ['BORRADOR','PENDIENTE'].includes(o.estado) && <button className="cmp-btn cmp-btn-danger cmp-btn-xs" onClick={() => handleCancelar(o.id)}><X size={11} />Cancelar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'nueva'   && <ModalNuevaOC onClose={closeModal} onOk={closeModal} />}
      {modal === 'detalle' && selected && <DetalleOCModal id={selected.id} onClose={closeModal} />}
    </div>
  )
}

function DetalleOCModal({ id, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => { api.get(`/compras/ordenes/${id}`).then(r => setData(r.data)).catch(() => {}) }, [id])

  if (!data) return <div className="cmp-overlay"><div className="cmp-modal"><div className="cmp-empty">Cargando…</div></div></div>

  return (
    <div className="cmp-overlay" onClick={onClose}>
      <div className="cmp-modal cmp-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-title">
          <span>OC #{data.numero}</span>
          <button className="cmp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`cmp-badge ${OC_EST_CLS[data.estado]}`}>{data.estado}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Proveedor: <strong>{data.proveedor_nombre || '—'}</strong></span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Bodega: <strong>{data.bodega_nombre}</strong></span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Total: <strong style={{ color: '#059669' }}>{fmt(data.total)}</strong></span>
        </div>

        <div className="cmp-timeline" style={{ marginBottom: 16 }}>
          <div className="cmp-tl-item">
            <div className="cmp-tl-dot" style={{ background: '#F59E0B' }} />
            <div className="cmp-tl-content">
              <div className="cmp-tl-label">Creada</div>
              <div className="cmp-tl-date">{fmtDate(data.creado_en)} · por {data.usuario_nombre}</div>
            </div>
          </div>
          {data.fecha_aprobacion && (
            <div className="cmp-tl-item">
              <div className="cmp-tl-dot" style={{ background: '#059669' }} />
              <div className="cmp-tl-content">
                <div className="cmp-tl-label">Aprobada</div>
                <div className="cmp-tl-date">{fmtDate(data.fecha_aprobacion)} · por {data.aprobado_por_nombre}</div>
              </div>
            </div>
          )}
          {data.fecha_esperada && (
            <div className="cmp-tl-item">
              <div className="cmp-tl-dot" style={{ background: '#3B82F6' }} />
              <div className="cmp-tl-content">
                <div className="cmp-tl-label">Entrega esperada</div>
                <div className="cmp-tl-date">{fmtDate(data.fecha_esperada)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="cmp-table-wrap" style={{ marginBottom: 16 }}>
          <table className="cmp-table">
            <thead><tr><th>Producto</th><th>SKU</th><th>Cantidad</th><th>Recibido</th><th>Costo unit.</th><th>Subtotal</th></tr></thead>
            <tbody>
              {(data.detalle || []).map(d => {
                const pct = Math.min(100, (parseFloat(d.cantidad_recibida || 0) / parseFloat(d.cantidad_solicitada)) * 100)
                return (
                  <tr key={d.id}>
                    <td><strong>{d.producto_nombre}</strong></td>
                    <td style={{ fontSize: 11 }}>{d.codigo_sku}</td>
                    <td>{d.cantidad_solicitada} {d.unidad_medida}</td>
                    <td>
                      <div>{d.cantidad_recibida || 0}</div>
                      <div className="cmp-progress"><div className="cmp-progress-fill" style={{ width: pct + '%' }} /></div>
                    </td>
                    <td>{fmt(d.costo_unitario)}</td>
                    <td>{fmt(parseFloat(d.cantidad_solicitada) * parseFloat(d.costo_unitario))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {data.recepciones?.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>HISTORIAL DE RECEPCIONES</div>
            {data.recepciones.map(r => (
              <div key={r.id} style={{ background: '#F8F9FC', borderRadius: 8, padding: '8px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}>Rec. #{r.numero} — {r.numero_remision || '—'}</span>
                <span><span className={`cmp-badge ${REC_EST_CLS[r.estado]}`}>{r.estado}</span> <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(r.fecha_recepcion)}</span></span>
              </div>
            ))}
          </>
        )}

        {data.historial?.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>TRAZABILIDAD</div>
            <div style={{ marginBottom: 16 }}>
              {data.historial.map(h => (
                <div key={h.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #F4F5FA' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', minWidth: 130 }}>
                    {new Date(h.creado_en).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#374151' }}>
                    {h.accion} <span style={{ color: '#9CA3AF' }}>· {h.usuario_nombre || 'Sistema'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="cmp-btn cmp-btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function TabRecepciones({ onRefreshStats }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ estado: '', page: 1 })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/compras/recepciones', { params: filters })
      setData(r.data.data || []); setTotal(r.data.total || 0)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { cargar() }, [cargar])
  const closeModal = () => { setModal(null); cargar(); onRefreshStats() }

  return (
    <div>
      <div className="cmp-filters">
        <select className="cmp-input" style={{ width: 200 }} value={filters.estado} onChange={e => setFilters(p => ({ ...p, estado: e.target.value }))}>
          <option value="">Todos los estados</option>
          {['PENDIENTE','PARCIAL','COMPLETA','CON_DISCREPANCIA'].map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="cmp-btn cmp-btn-ghost" onClick={cargar}><RefreshCw size={14} /></button>
        <div style={{ flex: 1 }} />
        <button className="cmp-btn cmp-btn-primary" onClick={() => setModal('nueva')}><Plus size={14} />Registrar Recepción</button>
      </div>

      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{total} recepción(es)</div>

      <div className="cmp-table-wrap">
        {loading ? <div className="cmp-empty">Cargando…</div> : data.length === 0 ? (
          <div className="cmp-empty">No hay recepciones</div>
        ) : (
          <table className="cmp-table">
            <thead><tr>
              <th>N° Rec.</th><th>OC Ref.</th><th>Proveedor</th><th>Bodega</th><th>Fecha</th><th>Ítems</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id}>
                  <td><strong style={{ color: '#F59E0B' }}>#{r.numero}</strong></td>
                  <td style={{ fontSize: 12 }}>{r.oc_numero ? `OC #${r.oc_numero}` : '—'}</td>
                  <td>{r.proveedor_nombre}</td>
                  <td style={{ fontSize: 12 }}>{r.bodega_nombre}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.fecha_recepcion)}</td>
                  <td>{r.total_items}</td>
                  <td><span className={`cmp-badge ${REC_EST_CLS[r.estado]}`}>{r.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'nueva' && <ModalNuevaRecepcion onClose={closeModal} onOk={closeModal} />}
    </div>
  )
}

function TabCuentasPagar({ onRefreshStats }) {
  const [data, setData] = useState([])
  const [filters, setFilters] = useState({ estado: '', vencidas: 'false' })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const hoy = new Date()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/compras/cuentas-pagar', { params: filters })
      setData(r.data || [])
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { cargar() }, [cargar])
  const closeModal = () => { setModal(null); setSelected(null); cargar(); onRefreshStats() }

  const isVencida = (cp) => {
    if (['PAGADA','ANULADA'].includes(cp.estado)) return false
    return new Date(cp.fecha_vencimiento) < hoy
  }

  return (
    <div>
      <div className="cmp-filters">
        <select className="cmp-input" style={{ width: 160 }} value={filters.estado} onChange={e => setFilters(p => ({ ...p, estado: e.target.value }))}>
          <option value="">Todos los estados</option>
          {['PENDIENTE','PARCIAL','PAGADA','VENCIDA','ANULADA'].map(s => <option key={s}>{s}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
          <input type="checkbox" checked={filters.vencidas === 'true'} onChange={e => setFilters(p => ({ ...p, vencidas: e.target.checked ? 'true' : 'false' }))} />
          Solo vencidas
        </label>
        <button className="cmp-btn cmp-btn-ghost" onClick={cargar}><RefreshCw size={14} /></button>
      </div>

      <div className="cmp-table-wrap">
        {loading ? <div className="cmp-empty">Cargando…</div> : data.length === 0 ? (
          <div className="cmp-empty">No hay cuentas por pagar</div>
        ) : (
          <table className="cmp-table">
            <thead><tr>
              <th>N°</th><th>Proveedor</th><th>Concepto</th><th>OC</th>
              <th>Emisión</th><th>Vencimiento</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th>Estado</th><th>Acción</th>
            </tr></thead>
            <tbody>
              {data.map(cp => (
                <tr key={cp.id}>
                  <td><strong style={{ color: '#F59E0B' }}>#{cp.numero}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{cp.proveedor_nombre}</div>
                    {cp.proveedor_telefono && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{cp.proveedor_telefono}</div>}
                  </td>
                  <td style={{ fontSize: 12 }}>{cp.concepto}</td>
                  <td style={{ fontSize: 12 }}>{cp.oc_numero ? `OC #${cp.oc_numero}` : '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(cp.fecha_emision)}</td>
                  <td style={{ fontSize: 12 }}>
                    <span style={{ color: isVencida(cp) ? '#EF4444' : '#374151' }}>
                      {isVencida(cp) && <AlertCircle size={12} style={{ display: 'inline', marginRight: 3 }} />}
                      {fmtDate(cp.fecha_vencimiento)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmt(cp.monto_total)}</td>
                  <td style={{ color: '#059669' }}>{fmt(cp.monto_pagado)}</td>
                  <td style={{ color: '#EF4444', fontWeight: 700 }}>{fmt(cp.monto_pendiente)}</td>
                  <td><span className={`cmp-badge ${CXP_EST_CLS[cp.estado]}`}>{cp.estado}</span></td>
                  <td>
                    {!['PAGADA','ANULADA'].includes(cp.estado) && (
                      <button className="cmp-btn cmp-btn-success cmp-btn-xs" onClick={() => { setSelected(cp); setModal('pagar') }}>
                        <CreditCard size={11} />Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'pagar' && selected && <ModalPagarCuenta cuenta={selected} onClose={closeModal} onOk={closeModal} />}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ComprasPage() {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('solicitudes')

  const cargarStats = useCallback(async () => {
    try { const r = await api.get('/compras/stats'); setStats(r.data) }
    catch {}
  }, [])

  useEffect(() => { cargarStats() }, [cargarStats])

  return (
    <>
      <style>{CSS}</style>
      <div className="cmp">

        {/* Stats bar */}
        <div className="cmp-stats">
          <div className="cmp-stat" onClick={() => setTab('solicitudes')}>
            <div className="cmp-stat-icon" style={{ background: '#FFF7ED' }}>
              <ClipboardList size={22} color="#D97706" />
            </div>
            <div>
              <div className="cmp-stat-label">Solicitudes pendientes</div>
              <div className="cmp-stat-value" style={{ color: stats?.solicitudes_pendientes > 0 ? '#D97706' : '#0F1035' }}>
                {stats?.solicitudes_pendientes ?? '—'}
              </div>
            </div>
          </div>

          <div className="cmp-stat" onClick={() => setTab('ordenes')}>
            <div className="cmp-stat-icon" style={{ background: '#ECFDF5' }}>
              <TrendingUp size={22} color="#059669" />
            </div>
            <div>
              <div className="cmp-stat-label">Compras del mes</div>
              <div className="cmp-stat-value" style={{ fontSize: 16, color: '#059669' }}>
                {fmt(stats?.compras_mes)}
              </div>
            </div>
          </div>

          <div className="cmp-stat" onClick={() => setTab('ordenes')}>
            <div className="cmp-stat-icon" style={{ background: '#EFF6FF' }}>
              <FileCheck size={22} color="#3B82F6" />
            </div>
            <div>
              <div className="cmp-stat-label">OC pendientes aprobación</div>
              <div className="cmp-stat-value" style={{ color: stats?.ordenes_pendientes_aprobacion > 0 ? '#3B82F6' : '#0F1035' }}>
                {stats?.ordenes_pendientes_aprobacion ?? '—'}
              </div>
            </div>
          </div>

          <div className="cmp-stat" onClick={() => setTab('cuentas')}>
            <div className="cmp-stat-icon" style={{ background: stats?.cuentas_vencidas > 0 ? '#FEF2F2' : '#FFF7ED' }}>
              <AlertCircle size={22} color={stats?.cuentas_vencidas > 0 ? '#EF4444' : '#D97706'} />
            </div>
            <div>
              <div className="cmp-stat-label">Cuentas por pagar</div>
              <div className="cmp-stat-value" style={{ fontSize: 16, color: stats?.cuentas_vencidas > 0 ? '#EF4444' : '#0F1035' }}>
                {fmt(stats?.cuentas_por_pagar)}
              </div>
              {stats?.cuentas_vencidas > 0 && (
                <div className="cmp-stat-sub" style={{ color: '#EF4444' }}>{stats.cuentas_vencidas} vencida(s)</div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="cmp-tabs">
          {[
            { key: 'solicitudes', label: 'Solicitudes', Icon: ClipboardList },
            { key: 'proveedores', label: 'Proveedores', Icon: Truck },
            { key: 'ordenes',     label: 'Órdenes de Compra', Icon: ShoppingCart },
            { key: 'recepciones', label: 'Recepciones', Icon: Package },
            { key: 'cuentas',     label: 'Cuentas por Pagar', Icon: CreditCard },
          ].map(({ key, label, Icon }) => (
            <button key={key} className={`cmp-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              <Icon size={14} style={{ display: 'inline', marginRight: 5 }} />{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="cmp-body">
          {tab === 'solicitudes' && <TabSolicitudes onRefreshStats={cargarStats} />}
          {tab === 'proveedores' && <TabProveedores onRefreshStats={cargarStats} />}
          {tab === 'ordenes'     && <TabOrdenes     onRefreshStats={cargarStats} />}
          {tab === 'recepciones' && <TabRecepciones onRefreshStats={cargarStats} />}
          {tab === 'cuentas'     && <TabCuentasPagar onRefreshStats={cargarStats} />}
        </div>

      </div>
    </>
  )
}
