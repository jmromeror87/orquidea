/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Inventario                                          ║
 * ║  Archivo         : InventarioPage.jsx                                  ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'
import {
  Package, DollarSign, AlertTriangle, ArrowLeftRight,
  Search, RefreshCw, Plus, Eye, Edit2, Truck,
  ChevronDown, ChevronUp, X, Check, Loader2,
  Warehouse, MapPin, ShoppingCart, FileText,
  Settings, Trash2,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0)

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—'

const TIPO_COLORS = {
  ENTRADA:  '#10B981',
  SALIDA:   '#EF4444',
  TRASLADO: '#3B82F6',
  AJUSTE:   '#F59E0B',
  CONSUMO:  '#8B5CF6',
}

const ESTADO_OC_COLORS = {
  BORRADOR:  '#6B7280',
  PENDIENTE: '#F59E0B',
  APROBADA:  '#3B82F6',
  RECIBIDA:  '#10B981',
  CANCELADA: '#EF4444',
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
.inv { display:flex; flex-direction:column; height:100%; background:#F8F9FC; overflow:hidden; }

/* Stats */
.inv-stats { display:flex; gap:12px; padding:16px 20px 0; flex-shrink:0; flex-wrap:wrap; }
.inv-stat {
  flex:1; min-width:160px; background:#fff; border:1px solid #ECEDF8;
  border-radius:14px; padding:14px 18px; display:flex; align-items:center; gap:14px;
  cursor:default;
}
.inv-stat.clickable { cursor:pointer; transition:box-shadow .15s; }
.inv-stat.clickable:hover { box-shadow:0 4px 16px rgba(46,49,146,.12); }
.inv-stat-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.inv-stat-label { font-size:11px; color:#9CA3AF; margin-bottom:3px; }
.inv-stat-value { font-size:22px; font-weight:800; color:#0F1035; line-height:1; }
.inv-stat-sub   { font-size:10px; color:#9CA3AF; margin-top:2px; }

/* Tabs */
.inv-tabs { display:flex; gap:4px; padding:16px 20px 0; flex-shrink:0; border-bottom:1px solid #ECEDF8; margin-bottom:0; padding-bottom:0; }
.inv-tab {
  padding:8px 18px; border-radius:10px 10px 0 0; font-size:13px; font-weight:600;
  cursor:pointer; border:1.5px solid transparent; border-bottom:none; transition:all .15s;
  color:#6B7280; background:transparent;
}
.inv-tab.active { background:#fff; color:#2E3192; border-color:#ECEDF8; }
.inv-tab:not(.active):hover { background:#F4F5FA; color:#2E3192; }

/* Content area */
.inv-content { flex:1; overflow:auto; padding:20px; }

/* Toolbar */
.inv-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.inv-search { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #ECEDF8; border-radius:10px; padding:7px 12px; flex:1; min-width:200px; }
.inv-search input { border:none; outline:none; font-size:13px; flex:1; background:transparent; color:#0F1035; }
.inv-select { border:1.5px solid #ECEDF8; border-radius:10px; padding:8px 12px; font-size:13px; color:#374151; background:#fff; outline:none; cursor:pointer; }
.inv-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .15s; }
.inv-btn-primary { background:#2E3192; color:#fff; }
.inv-btn-primary:hover { background:#252882; }
.inv-btn-outline { background:#fff; color:#374151; border:1.5px solid #ECEDF8; }
.inv-btn-outline:hover { background:#F4F5FA; }
.inv-btn-sm { padding:5px 10px; font-size:12px; border-radius:8px; }
.inv-btn-danger { background:#FEE2E2; color:#EF4444; border:none; }
.inv-btn-danger:hover { background:#FECACA; }
.inv-btn-success { background:#D1FAE5; color:#10B981; border:none; }
.inv-btn-success:hover { background:#A7F3D0; }
.inv-btn-toggle { background:#fff; color:#6B7280; border:1.5px solid #ECEDF8; }
.inv-btn-toggle.active { background:#FEE2E2; color:#EF4444; border-color:#FECACA; }

/* Table */
.inv-table-wrap { background:#fff; border-radius:14px; border:1px solid #ECEDF8; overflow:hidden; }
.inv-table { width:100%; border-collapse:collapse; font-size:13px; }
.inv-table th { background:#F9FAFB; color:#6B7280; font-weight:600; font-size:11px; text-transform:uppercase; padding:10px 14px; text-align:left; border-bottom:1px solid #ECEDF8; white-space:nowrap; }
.inv-table td { padding:12px 14px; border-bottom:1px solid #F3F4F6; color:#374151; vertical-align:middle; }
.inv-table tr:last-child td { border-bottom:none; }
.inv-table tr:hover td { background:#F9FAFB; }

/* Badges */
.inv-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
.inv-badge-green   { background:#D1FAE5; color:#065F46; }
.inv-badge-red     { background:#FEE2E2; color:#991B1B; }
.inv-badge-orange  { background:#FEF3C7; color:#92400E; }
.inv-badge-blue    { background:#DBEAFE; color:#1E40AF; }
.inv-badge-gray    { background:#F3F4F6; color:#4B5563; }
.inv-badge-purple  { background:#EDE9FE; color:#5B21B6; }

/* SKU */
.inv-sku { font-family:monospace; font-size:11px; color:#9CA3AF; }

/* Bodega cards */
.inv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
.inv-card { background:#fff; border:1px solid #ECEDF8; border-radius:14px; overflow:hidden; }
.inv-card-header { padding:14px 16px; border-bottom:1px solid #F3F4F6; display:flex; align-items:center; justify-content:space-between; }
.inv-card-title { font-size:15px; font-weight:700; color:#0F1035; }
.inv-card-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
.inv-card-body { padding:14px 16px; }
.inv-card-meta { display:flex; flex-direction:column; gap:6px; }
.inv-card-meta-row { display:flex; justify-content:space-between; font-size:12px; color:#6B7280; }
.inv-card-meta-row strong { color:#374151; }
.inv-card-footer { padding:10px 16px; border-top:1px solid #F3F4F6; display:flex; gap:8px; }
.inv-expand-btn { display:flex; align-items:center; gap:4px; font-size:12px; color:#6B7280; cursor:pointer; background:none; border:none; padding:0; }
.inv-expand-body { padding:0 16px 12px; }
.inv-ubic-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:4px; }
.inv-ubic-item { display:flex; justify-content:space-between; font-size:12px; padding:5px 8px; background:#F9FAFB; border-radius:8px; color:#374151; }

/* Modal */
.inv-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.inv-modal { background:#fff; border-radius:16px; width:100%; max-width:600px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(0,0,0,.2); }
.inv-modal-lg { max-width:800px; }
.inv-modal-head { padding:20px 24px 16px; border-bottom:1px solid #ECEDF8; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.inv-modal-title { font-size:17px; font-weight:800; color:#0F1035; }
.inv-modal-body { padding:20px 24px; overflow-y:auto; flex:1; }
.inv-modal-foot { padding:16px 24px; border-top:1px solid #ECEDF8; display:flex; justify-content:flex-end; gap:10px; flex-shrink:0; }
.inv-close { background:none; border:none; cursor:pointer; color:#9CA3AF; padding:4px; border-radius:8px; display:flex; }
.inv-close:hover { background:#F3F4F6; color:#374151; }

/* Forms */
.inv-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.inv-form-grid-3 { grid-template-columns:1fr 1fr 1fr; }
.inv-form-full { grid-column:1/-1; }
.inv-field { display:flex; flex-direction:column; gap:5px; }
.inv-label { font-size:12px; font-weight:600; color:#374151; }
.inv-input { border:1.5px solid #E5E7EB; border-radius:10px; padding:9px 12px; font-size:13px; color:#0F1035; outline:none; transition:border-color .15s; background:#fff; }
.inv-input:focus { border-color:#2E3192; }
.inv-input:disabled { background:#F9FAFB; color:#9CA3AF; }
.inv-textarea { resize:vertical; min-height:80px; }
.inv-checkbox-row { display:flex; align-items:center; gap:8px; font-size:13px; color:#374151; cursor:pointer; }

/* Alert */
.inv-alert { padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:12px; }
.inv-alert-error { background:#FEE2E2; color:#991B1B; border:1px solid #FECACA; }
.inv-alert-success { background:#D1FAE5; color:#065F46; border:1px solid #A7F3D0; }

/* Detail section */
.inv-section-title { font-size:12px; font-weight:700; text-transform:uppercase; color:#6B7280; letter-spacing:.05em; margin:16px 0 8px; }

/* Items row for OC */
.inv-oc-item-row { display:flex; gap:8px; align-items:flex-start; padding:8px; background:#F9FAFB; border-radius:10px; margin-bottom:8px; }
.inv-oc-item-row .inv-input { flex:1; }
.inv-oc-total { text-align:right; padding:12px 0; font-size:15px; font-weight:700; color:#0F1035; border-top:1px solid #ECEDF8; margin-top:8px; }

/* Progress bar */
.inv-progress { background:#E5E7EB; border-radius:99px; height:6px; overflow:hidden; }
.inv-progress-bar { height:100%; border-radius:99px; background:#10B981; transition:width .3s; }

/* Pagination */
.inv-pagination { display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-top:12px; font-size:13px; color:#6B7280; }
.inv-page-btn { border:1.5px solid #ECEDF8; background:#fff; border-radius:8px; padding:5px 10px; cursor:pointer; font-size:12px; font-weight:600; color:#374151; }
.inv-page-btn:disabled { opacity:.4; cursor:not-allowed; }

/* Loading */
.inv-loading { display:flex; align-items:center; justify-content:center; gap:8px; padding:40px; color:#6B7280; font-size:14px; }
.inv-empty { text-align:center; padding:40px; color:#9CA3AF; font-size:14px; }
`

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: PRODUCTO
// ═══════════════════════════════════════════════════════════════════════════
function ModalProducto({ producto, categorias, onClose, onSaved }) {
  const [form, setForm] = useState({
    categoria_id: '', codigo_sku: '', nombre: '', descripcion: '',
    unidad_medida: 'UNIDAD', costo_promedio: 0, precio_venta: 0,
    stock_minimo: 0, stock_maximo: 9999, es_perecedero: false,
    ...producto,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const generarSKU = () => {
    const fecha = new Date().toISOString().replace(/-/g, '').slice(0, 8)
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    const cat = categorias.find(c => c.id === form.categoria_id)
    const prefix = cat ? cat.nombre.substring(0, 3).toUpperCase() : 'PRD'
    set('codigo_sku', `${prefix}-${fecha}-${rand}`)
  }

  const submit = async () => {
    setError(null)
    if (!form.nombre || !form.codigo_sku) return setError('Nombre y SKU son requeridos')
    setLoading(true)
    try {
      if (producto?.id) {
        await api.put(`/inventario/productos/${producto.id}`, form)
        toast.success('Producto actualizado correctamente')
      } else {
        await api.post('/inventario/productos', form)
        toast.success('Producto creado correctamente')
      }
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al guardar'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal">
        <div className="inv-modal-head">
          <span className="inv-modal-title">{producto?.id ? 'Editar Producto' : 'Nuevo Producto'}</span>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="inv-modal-body">
          {error && <div className="inv-alert inv-alert-error">{error}</div>}
          <div className="inv-form-grid">
            <div className="inv-field inv-form-full">
              <label className="inv-label">Nombre del producto *</label>
              <input className="inv-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del producto"/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Código SKU *</label>
              <div style={{display:'flex',gap:6}}>
                <input className="inv-input" style={{flex:1}} value={form.codigo_sku} onChange={e => set('codigo_sku', e.target.value)} placeholder="AUTO"/>
                <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={generarSKU}>Auto</button>
              </div>
            </div>
            <div className="inv-field">
              <label className="inv-label">Categoría</label>
              <select className="inv-input inv-select" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                <option value="">— Sin categoría —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-label">Unidad de medida</label>
              <select className="inv-input inv-select" value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)}>
                {['UNIDAD','CAJA','METRO','KG','LITRO','PAQUETE'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-label">Costo promedio (COP)</label>
              <CurrencyInput value={form.costo_promedio} onChange={v => set('costo_promedio', v)}/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Precio de venta (COP)</label>
              <CurrencyInput value={form.precio_venta} onChange={v => set('precio_venta', v)}/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Stock mínimo</label>
              <input className="inv-input" type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)}/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Stock máximo</label>
              <input className="inv-input" type="number" min="0" value={form.stock_maximo} onChange={e => set('stock_maximo', e.target.value)}/>
            </div>
            <div className="inv-field inv-form-full">
              <label className="inv-label">Descripción</label>
              <textarea className="inv-input inv-textarea" value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción opcional"/>
            </div>
            <div className="inv-field inv-form-full">
              <label className="inv-checkbox-row">
                <input type="checkbox" checked={form.es_perecedero} onChange={e => set('es_perecedero', e.target.checked)}/>
                Producto perecedero
              </label>
            </div>
          </div>
        </div>
        <div className="inv-modal-foot">
          <button className="inv-btn inv-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="inv-btn inv-btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin"/> : <Check size={14}/>}
            {producto?.id ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: DETALLE PRODUCTO
// ═══════════════════════════════════════════════════════════════════════════
function ModalDetalle({ productoId, onClose, onMovimiento }) {
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/inventario/productos/${productoId}`)
      .then(r => setDetalle(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [productoId])

  const estadoBadge = (total, minimo) => {
    if (total === 0) return <span className="inv-badge inv-badge-red">CRÍTICO</span>
    if (total < minimo) return <span className="inv-badge inv-badge-orange">BAJO</span>
    return <span className="inv-badge inv-badge-green">NORMAL</span>
  }

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal inv-modal-lg">
        <div className="inv-modal-head">
          <div>
            <div className="inv-modal-title">{detalle?.nombre || 'Cargando...'}</div>
            {detalle && <div className="inv-sku">{detalle.codigo_sku} · {detalle.unidad_medida}</div>}
          </div>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="inv-modal-body">
          {loading ? (
            <div className="inv-loading"><Loader2 size={18} className="spin"/> Cargando...</div>
          ) : detalle ? (
            <>
              <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
                {detalle.categoria_nombre && (
                  <span className="inv-badge inv-badge-blue">{detalle.categoria_icono} {detalle.categoria_nombre}</span>
                )}
                {estadoBadge(parseFloat(detalle.total_stock || 0), detalle.stock_minimo)}
                {detalle.es_perecedero && <span className="inv-badge inv-badge-orange">Perecedero</span>}
              </div>

              <div className="inv-section-title">Stock por ubicación</div>
              {detalle.stock_detalle?.length ? (
                <div className="inv-table-wrap" style={{marginBottom:16}}>
                  <table className="inv-table">
                    <thead><tr>
                      <th>Bodega</th><th>Ubicación</th><th>Cantidad</th><th>Costo Prom.</th><th>Valor</th>
                    </tr></thead>
                    <tbody>
                      {detalle.stock_detalle.map((s, i) => (
                        <tr key={i}>
                          <td>{s.bodega_nombre}</td>
                          <td><span className="inv-sku">{s.ubicacion_codigo}</span> {s.ubicacion_nombre}</td>
                          <td><strong>{s.cantidad}</strong></td>
                          <td>{fmt(s.costo_unitario_promedio)}</td>
                          <td>{fmt(s.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="inv-empty">Sin stock registrado en ninguna ubicación.</p>}

              <div className="inv-section-title">Últimos movimientos</div>
              {detalle.movimientos_recientes?.length ? (
                <div className="inv-table-wrap">
                  <table className="inv-table">
                    <thead><tr>
                      <th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Costo Unit.</th><th>Total</th><th>Usuario</th>
                    </tr></thead>
                    <tbody>
                      {detalle.movimientos_recientes.map(m => (
                        <tr key={m.id}>
                          <td>{fmtDate(m.fecha)}</td>
                          <td><span className="inv-badge" style={{background:TIPO_COLORS[m.tipo]+'22',color:TIPO_COLORS[m.tipo]}}>{m.tipo}</span></td>
                          <td>{m.cantidad}</td>
                          <td>{fmt(m.costo_unitario)}</td>
                          <td>{fmt(m.valor_total)}</td>
                          <td>{m.usuario_nombre || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="inv-empty">Sin movimientos registrados.</p>}
            </>
          ) : null}
        </div>
        <div className="inv-modal-foot">
          <button className="inv-btn inv-btn-outline" onClick={onClose}>Cerrar</button>
          {detalle && (
            <button className="inv-btn inv-btn-primary" onClick={() => onMovimiento(detalle)}>
              <ArrowLeftRight size={14}/> Registrar movimiento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: MOVIMIENTO
// ═══════════════════════════════════════════════════════════════════════════
function ModalMovimiento({ productoInicial, onClose, onSaved }) {
  const [form, setForm] = useState({
    tipo: 'ENTRADA',
    producto_id: productoInicial?.id || '',
    ubicacion_origen_id: '',
    ubicacion_destino_id: '',
    cantidad: '',
    costo_unitario: productoInicial?.costo_promedio || 0,
    referencia: '',
    motivo: '',
    notas: '',
  })
  const [bodegas, setBodegas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [ubicacionesOrigen, setUbicacionesOrigen] = useState([])
  const [prodSearch, setProdSearch] = useState(productoInicial?.nombre || '')
  const [prodResults, setProdResults] = useState([])
  const [selectedProd, setSelectedProd] = useState(productoInicial || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/inventario/bodegas').then(r => setBodegas(r.data)).catch(console.error)
  }, [])

  const loadUbicaciones = async (bodega_id, isOrigen = false) => {
    if (!bodega_id) return
    const r = await api.get(`/inventario/bodegas/${bodega_id}/ubicaciones`)
    if (isOrigen) setUbicacionesOrigen(r.data)
    else setUbicaciones(r.data)
  }

  const searchProd = async (q) => {
    if (q.length < 2) { setProdResults([]); return }
    const r = await api.get(`/inventario/productos?q=${encodeURIComponent(q)}&limit=10`)
    setProdResults(r.data.data || [])
  }

  const selectProd = (p) => {
    setSelectedProd(p)
    setProdSearch(p.nombre)
    setProdResults([])
    set('producto_id', p.id)
    set('costo_unitario', p.costo_promedio)
  }

  const submit = async () => {
    setError(null)
    if (!form.producto_id) return setError('Seleccione un producto')
    if (!form.cantidad || parseFloat(form.cantidad) <= 0) return setError('Ingrese una cantidad válida')

    const tipo = form.tipo
    if ((tipo === 'ENTRADA') && !form.ubicacion_destino_id) return setError('Seleccione la ubicación destino')
    if ((tipo === 'SALIDA' || tipo === 'CONSUMO') && !form.ubicacion_origen_id) return setError('Seleccione la ubicación origen')
    if (tipo === 'TRASLADO' && (!form.ubicacion_origen_id || !form.ubicacion_destino_id)) return setError('Seleccione ubicación origen y destino')
    if (tipo === 'AJUSTE' && !form.ubicacion_destino_id && !form.ubicacion_origen_id) return setError('Seleccione la ubicación')

    setLoading(true)
    try {
      // For AJUSTE without destino, use origen as destino
      const payload = { ...form }
      if (tipo === 'AJUSTE' && !payload.ubicacion_destino_id) {
        payload.ubicacion_destino_id = payload.ubicacion_origen_id
      }
      await api.post('/inventario/movimientos', payload)
      toast.success('Movimiento registrado correctamente')
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al registrar'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const tipo = form.tipo
  const needsOrigen  = ['SALIDA','CONSUMO','TRASLADO'].includes(tipo)
  const needsDestino = ['ENTRADA','TRASLADO','AJUSTE'].includes(tipo)

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal">
        <div className="inv-modal-head">
          <span className="inv-modal-title">Registrar Movimiento</span>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="inv-modal-body">
          {error && <div className="inv-alert inv-alert-error">{error}</div>}
          <div className="inv-form-grid">
            <div className="inv-field inv-form-full">
              <label className="inv-label">Tipo de movimiento *</label>
              <select className="inv-input inv-select" value={tipo} onChange={e => set('tipo', e.target.value)}>
                <option>ENTRADA</option>
                <option>SALIDA</option>
                <option>TRASLADO</option>
                <option>AJUSTE</option>
                <option>CONSUMO</option>
              </select>
            </div>

            {!productoInicial && (
              <div className="inv-field inv-form-full" style={{position:'relative'}}>
                <label className="inv-label">Producto *</label>
                <input className="inv-input" value={prodSearch}
                  onChange={e => { setProdSearch(e.target.value); searchProd(e.target.value) }}
                  placeholder="Buscar producto por nombre o SKU..."/>
                {prodResults.length > 0 && (
                  <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1.5px solid #ECEDF8',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:10,maxHeight:200,overflowY:'auto'}}>
                    {prodResults.map(p => (
                      <div key={p.id} onClick={() => selectProd(p)}
                        style={{padding:'8px 12px',cursor:'pointer',fontSize:13,borderBottom:'1px solid #F3F4F6'}}
                        onMouseEnter={e => e.currentTarget.style.background='#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <strong>{p.nombre}</strong> <span className="inv-sku">{p.codigo_sku}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {needsOrigen && (
              <>
                <div className="inv-field">
                  <label className="inv-label">Bodega origen</label>
                  <select className="inv-input inv-select" onChange={e => loadUbicaciones(e.target.value, true)}>
                    <option value="">— Seleccionar —</option>
                    {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="inv-field">
                  <label className="inv-label">Ubicación origen *</label>
                  <select className="inv-input inv-select" value={form.ubicacion_origen_id} onChange={e => set('ubicacion_origen_id', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {ubicacionesOrigen.map(u => <option key={u.id} value={u.id}>{u.codigo} · {u.nombre}</option>)}
                  </select>
                </div>
              </>
            )}

            {needsDestino && (
              <>
                <div className="inv-field">
                  <label className="inv-label">Bodega destino</label>
                  <select className="inv-input inv-select" onChange={e => loadUbicaciones(e.target.value, false)}>
                    <option value="">— Seleccionar —</option>
                    {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="inv-field">
                  <label className="inv-label">Ubicación destino *</label>
                  <select className="inv-input inv-select" value={form.ubicacion_destino_id} onChange={e => set('ubicacion_destino_id', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.codigo} · {u.nombre}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="inv-field">
              <label className="inv-label">Cantidad *</label>
              <input className="inv-input" type="number" min="0.01" step="0.01" value={form.cantidad} onChange={e => set('cantidad', e.target.value)}/>
            </div>

            {tipo === 'ENTRADA' && (
              <div className="inv-field">
                <label className="inv-label">Costo unitario (COP)</label>
                <CurrencyInput value={form.costo_unitario} onChange={v => set('costo_unitario', v)}/>
              </div>
            )}

            {tipo !== 'TRASLADO' && tipo !== 'AJUSTE' && (
              <div className="inv-field">
                <label className="inv-label">Referencia</label>
                <input className="inv-input" value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="N° OC, servicio, etc."/>
              </div>
            )}

            <div className="inv-field inv-form-full">
              <label className="inv-label">Motivo / Notas</label>
              <textarea className="inv-input inv-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} style={{minHeight:60}}/>
            </div>
          </div>
        </div>
        <div className="inv-modal-foot">
          <button className="inv-btn inv-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="inv-btn inv-btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin"/> : <ArrowLeftRight size={14}/>}
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: BODEGA
// ═══════════════════════════════════════════════════════════════════════════
function ModalBodega({ onClose, onSaved }) {
  const [form, setForm] = useState({ codigo: '', nombre: '', descripcion: '', sede_id: '', responsable_id: '' })
  const [sedes, setSedes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/usuarios/sedes').then(r => setSedes(r.data?.data || [])).catch(console.error)
    api.get('/usuarios').then(r => setUsuarios(r.data?.data || r.data || [])).catch(console.error)
  }, [])

  const submit = async () => {
    setError(null)
    if (!form.codigo || !form.nombre) return setError('Código y nombre son requeridos')
    setLoading(true)
    try {
      await api.post('/inventario/bodegas', form)
      toast.success('Bodega creada correctamente')
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al guardar'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal">
        <div className="inv-modal-head">
          <span className="inv-modal-title">Nueva Bodega</span>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="inv-modal-body">
          {error && <div className="inv-alert inv-alert-error">{error}</div>}
          <div className="inv-form-grid">
            <div className="inv-field">
              <label className="inv-label">Código *</label>
              <input className="inv-input" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="BOD-001"/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Nombre *</label>
              <input className="inv-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Bodega principal"/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Sede</label>
              <select className="inv-input inv-select" value={form.sede_id} onChange={e => set('sede_id', e.target.value)}>
                <option value="">— Sin sede —</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-label">Responsable</label>
              <select className="inv-input inv-select" value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)}>
                <option value="">— Sin asignar —</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div className="inv-field inv-form-full">
              <label className="inv-label">Descripción</label>
              <textarea className="inv-input inv-textarea" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}/>
            </div>
          </div>
        </div>
        <div className="inv-modal-foot">
          <button className="inv-btn inv-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="inv-btn inv-btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14}/> : <Check size={14}/>} Crear bodega
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: UBICACION
// ═══════════════════════════════════════════════════════════════════════════
function ModalUbicacion({ bodega, onClose, onSaved }) {
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: 'ESTANTE', capacidad_max: 9999 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setError(null)
    if (!form.codigo) return setError('El código es requerido')
    setLoading(true)
    try {
      await api.post(`/inventario/bodegas/${bodega.id}/ubicaciones`, form)
      toast.success('Ubicación creada correctamente')
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al guardar'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal">
        <div className="inv-modal-head">
          <span className="inv-modal-title">Nueva Ubicación — {bodega.nombre}</span>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="inv-modal-body">
          {error && <div className="inv-alert inv-alert-error">{error}</div>}
          <div className="inv-form-grid">
            <div className="inv-field">
              <label className="inv-label">Código * <small style={{color:'#9CA3AF'}}>(ej: A-01-03)</small></label>
              <input className="inv-input" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="A-01-03"/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Tipo</label>
              <select className="inv-input inv-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {['ESTANTE','PISO','REFRIGERADO','EXTERIOR'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="inv-field inv-form-full">
              <label className="inv-label">Nombre descriptivo</label>
              <input className="inv-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Pasillo A, Estante 1, Nivel 3"/>
            </div>
            <div className="inv-field">
              <label className="inv-label">Capacidad máxima</label>
              <input className="inv-input" type="number" value={form.capacidad_max} onChange={e => set('capacidad_max', e.target.value)}/>
            </div>
          </div>
        </div>
        <div className="inv-modal-foot">
          <button className="inv-btn inv-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="inv-btn inv-btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14}/> : <Check size={14}/>} Crear
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: ORDEN DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════
function ModalOC({ bodegas, onClose, onSaved }) {
  const [form, setForm] = useState({ proveedor_id: '', bodega_destino_id: '', fecha_esperada: '', notas: '', detalle: [] })
  const [provSearch, setProvSearch] = useState('')
  const [provResults, setProvResults] = useState([])
  const [selectedProv, setSelectedProv] = useState(null)
  const [prodSearch, setProdSearch] = useState('')
  const [prodResults, setProdResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const searchProv = async (q) => {
    if (q.length < 2) { setProvResults([]); return }
    const r = await api.get(`/terceros/select?q=${encodeURIComponent(q)}&rol=PROVEEDOR`)
    setProvResults(r.data || [])
  }

  const searchProd = async (q) => {
    if (q.length < 2) { setProdResults([]); return }
    const r = await api.get(`/inventario/productos?q=${encodeURIComponent(q)}&limit=10`)
    setProdResults(r.data.data || [])
  }

  const addItem = (prod) => {
    const exists = form.detalle.find(d => d.producto_id === prod.id)
    if (!exists) {
      set('detalle', [...form.detalle, { producto_id: prod.id, nombre: prod.nombre, sku: prod.codigo_sku, cantidad_solicitada: 1, costo_unitario: prod.costo_promedio || 0, notas: '' }])
    }
    setProdSearch('')
    setProdResults([])
  }

  const updateItem = (idx, key, val) => {
    const arr = [...form.detalle]
    arr[idx] = { ...arr[idx], [key]: val }
    set('detalle', arr)
  }

  const removeItem = (idx) => {
    set('detalle', form.detalle.filter((_, i) => i !== idx))
  }

  const total = form.detalle.reduce((acc, d) => acc + (parseFloat(d.cantidad_solicitada) || 0) * (parseFloat(d.costo_unitario) || 0), 0)

  const submit = async () => {
    setError(null)
    if (!form.proveedor_id) return setError('Seleccione un proveedor')
    if (!form.bodega_destino_id) return setError('Seleccione la bodega destino')
    if (!form.detalle.length) return setError('Agregue al menos un producto')
    setLoading(true)
    try {
      await api.post('/inventario/ordenes-compra', form)
      toast.success('Orden de compra creada correctamente')
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al crear OC'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal inv-modal-lg">
        <div className="inv-modal-head">
          <span className="inv-modal-title">Nueva Orden de Compra</span>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="inv-modal-body">
          {error && <div className="inv-alert inv-alert-error">{error}</div>}
          <div className="inv-form-grid">
            <div className="inv-field inv-form-full" style={{position:'relative'}}>
              <label className="inv-label">Proveedor *</label>
              <input className="inv-input" value={selectedProv ? selectedProv.nombre : provSearch}
                onChange={e => { setSelectedProv(null); setProvSearch(e.target.value); searchProv(e.target.value); set('proveedor_id','') }}
                placeholder="Buscar proveedor..."/>
              {provResults.length > 0 && !selectedProv && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1.5px solid #ECEDF8',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:10}}>
                  {provResults.map(p => (
                    <div key={p.id} onClick={() => { setSelectedProv(p); set('proveedor_id', p.id); setProvResults([]) }}
                      style={{padding:'8px 12px',cursor:'pointer',fontSize:13,borderBottom:'1px solid #F3F4F6'}}
                      onMouseEnter={e => e.currentTarget.style.background='#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      {p.nombre} <span style={{color:'#9CA3AF',fontSize:11}}>{p.nit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="inv-field">
              <label className="inv-label">Bodega destino *</label>
              <select className="inv-input inv-select" value={form.bodega_destino_id} onChange={e => set('bodega_destino_id', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-label">Fecha esperada</label>
              <input className="inv-input" type="date" value={form.fecha_esperada} onChange={e => set('fecha_esperada', e.target.value)}/>
            </div>
            <div className="inv-field inv-form-full">
              <label className="inv-label">Notas</label>
              <textarea className="inv-input inv-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} style={{minHeight:50}}/>
            </div>
          </div>

          <div className="inv-section-title">Productos</div>
          <div style={{position:'relative',marginBottom:12}}>
            <input className="inv-input" value={prodSearch}
              onChange={e => { setProdSearch(e.target.value); searchProd(e.target.value) }}
              placeholder="Buscar y agregar producto..."/>
            {prodResults.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1.5px solid #ECEDF8',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:10}}>
                {prodResults.map(p => (
                  <div key={p.id} onClick={() => addItem(p)}
                    style={{padding:'8px 12px',cursor:'pointer',fontSize:13,borderBottom:'1px solid #F3F4F6'}}
                    onMouseEnter={e => e.currentTarget.style.background='#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    {p.nombre} <span className="inv-sku">{p.codigo_sku}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.detalle.map((item, idx) => (
            <div key={idx} className="inv-oc-item-row">
              <div style={{flex:3,fontSize:13}}>
                <strong>{item.nombre}</strong><br/>
                <span className="inv-sku">{item.sku}</span>
              </div>
              <input className="inv-input" type="number" min="1" style={{width:80}} value={item.cantidad_solicitada}
                onChange={e => updateItem(idx,'cantidad_solicitada',e.target.value)} placeholder="Cant."/>
              <CurrencyInput style={{width:120}} value={item.costo_unitario}
                onChange={v => updateItem(idx,'costo_unitario',v)} placeholder="Costo unit."/>
              <div style={{width:120,fontSize:12,color:'#6B7280',alignSelf:'center'}}>
                {fmt((parseFloat(item.cantidad_solicitada)||0)*(parseFloat(item.costo_unitario)||0))}
              </div>
              <button className="inv-btn inv-btn-danger inv-btn-sm" onClick={() => removeItem(idx)}><X size={12}/></button>
            </div>
          ))}

          {form.detalle.length > 0 && (
            <div className="inv-oc-total">Total: {fmt(total)}</div>
          )}
        </div>
        <div className="inv-modal-foot">
          <button className="inv-btn inv-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="inv-btn inv-btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14}/> : <ShoppingCart size={14}/>} Crear OC
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: DETALLE OC
// ═══════════════════════════════════════════════════════════════════════════
function ModalDetalleOC({ ocId, onClose, onRefresh }) {
  const [oc, setOC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recepciones, setRecepciones] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/inventario/ordenes-compra/${ocId}`)
      .then(r => { setOC(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [ocId])

  useEffect(() => { load() }, [load])

  const setRec = (detalleId, val) => setRecepciones(r => ({ ...r, [detalleId]: val }))

  const recibir = async () => {
    setError(null); setSaving(true)
    const payload = Object.entries(recepciones)
      .filter(([,v]) => v > 0)
      .map(([detalle_id, cantidad_recibida]) => ({ detalle_id, cantidad_recibida: parseFloat(cantidad_recibida) }))
    if (!payload.length) { setSaving(false); return setError('Ingrese cantidades a recibir') }
    try {
      await api.post(`/inventario/ordenes-compra/${ocId}/recibir`, { recepciones: payload })
      setSuccess('Mercancía recibida correctamente')
      toast.success('Mercancía recibida correctamente')
      load()
      onRefresh()
      setRecepciones({})
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al recibir'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const aprobar = async () => {
    setSaving(true); setError(null)
    try {
      await api.patch(`/inventario/ordenes-compra/${ocId}/aprobar`)
      toast.success('Orden de compra aprobada correctamente')
      load(); onRefresh()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al aprobar'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal inv-modal-lg">
        <div className="inv-modal-head">
          <div>
            <div className="inv-modal-title">OC #{oc?.numero || '...'}</div>
            {oc && <div style={{fontSize:12,color:'#9CA3AF'}}>{oc.proveedor_nombre} · {fmtDate(oc.fecha_emision)}</div>}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {oc && <span className="inv-badge" style={{background:ESTADO_OC_COLORS[oc.estado]+'22',color:ESTADO_OC_COLORS[oc.estado]}}>{oc.estado}</span>}
            <button className="inv-close" onClick={onClose}><X size={18}/></button>
          </div>
        </div>
        <div className="inv-modal-body">
          {loading ? <div className="inv-loading"><Loader2 size={18} className="spin"/> Cargando...</div> : oc ? (
            <>
              {error && <div className="inv-alert inv-alert-error">{error}</div>}
              {success && <div className="inv-alert inv-alert-success">{success}</div>}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                <div><div className="inv-stat-label">Bodega destino</div><strong style={{fontSize:13}}>{oc.bodega_nombre}</strong></div>
                <div><div className="inv-stat-label">Fecha esperada</div><strong style={{fontSize:13}}>{fmtDate(oc.fecha_esperada)}</strong></div>
                <div><div className="inv-stat-label">Total</div><strong style={{fontSize:15,color:'#2E3192'}}>{fmt(oc.total)}</strong></div>
              </div>

              <div className="inv-section-title">Productos</div>
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead><tr>
                    <th>Producto</th><th>Solicitado</th><th>Recibido</th><th>Progreso</th><th>Costo Unit.</th><th>Subtotal</th>
                    {oc.estado === 'APROBADA' && <th>Recibir</th>}
                  </tr></thead>
                  <tbody>
                    {(oc.detalle || []).map(item => {
                      const pct = Math.min(100, (parseFloat(item.cantidad_recibida) / parseFloat(item.cantidad_solicitada)) * 100)
                      return (
                        <tr key={item.id}>
                          <td><div style={{fontWeight:600,fontSize:13}}>{item.producto_nombre}</div><span className="inv-sku">{item.codigo_sku}</span></td>
                          <td>{item.cantidad_solicitada} {item.unidad_medida}</td>
                          <td>{item.cantidad_recibida}</td>
                          <td style={{minWidth:100}}>
                            <div className="inv-progress">
                              <div className="inv-progress-bar" style={{width:`${pct}%`}}/>
                            </div>
                            <div style={{fontSize:10,color:'#6B7280',marginTop:2}}>{pct.toFixed(0)}%</div>
                          </td>
                          <td>{fmt(item.costo_unitario)}</td>
                          <td>{fmt(item.subtotal)}</td>
                          {oc.estado === 'APROBADA' && (
                            <td>
                              <input className="inv-input" type="number" min="0"
                                style={{width:80,padding:'4px 8px'}}
                                max={item.cantidad_solicitada - item.cantidad_recibida}
                                value={recepciones[item.id] || ''}
                                onChange={e => setRec(item.id, e.target.value)}
                                placeholder="0"/>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
        <div className="inv-modal-foot">
          <button className="inv-btn inv-btn-outline" onClick={onClose}>Cerrar</button>
          {oc?.estado === 'PENDIENTE' && (
            <button className="inv-btn inv-btn-success" onClick={aprobar} disabled={saving}>
              <Check size={14}/> Aprobar OC
            </button>
          )}
          {oc?.estado === 'APROBADA' && (
            <button className="inv-btn inv-btn-primary" onClick={recibir} disabled={saving}>
              {saving ? <Loader2 size={14}/> : <Truck size={14}/>} Recibir mercancía
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════
function TabProductos({ categorias, filtroStock, onClearFiltro, onCategoriasChanged }) {
  const [productos, setProductos] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [catId, setCatId] = useState('')
  const [soloCriticos, setSoloCriticos] = useState(filtroStock || false)
  const [modalProd, setModalProd] = useState(null) // null | 'new' | {producto}
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalMov, setModalMov] = useState(null)
  const [modalCategorias, setModalCategorias] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventario/productos', {
        params: { q, categoria_id: catId || undefined, stock_bajo: soloCriticos || undefined, page, limit: 50 }
      })
      setProductos(r.data.data || [])
      setTotal(r.data.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [q, catId, soloCriticos, page])

  useEffect(() => { load() }, [load])

  useEffect(() => { if (filtroStock) setSoloCriticos(true) }, [filtroStock])

  const estadoBadge = (e) => {
    if (e === 'CRITICO') return <span className="inv-badge inv-badge-red">CRÍTICO</span>
    if (e === 'BAJO') return <span className="inv-badge inv-badge-orange">BAJO</span>
    return <span className="inv-badge inv-badge-green">NORMAL</span>
  }

  return (
    <>
      <div className="inv-toolbar">
        <div className="inv-search">
          <Search size={14} color="#9CA3AF"/>
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Buscar producto o SKU..."/>
        </div>
        <select className="inv-select" value={catId} onChange={e => { setCatId(e.target.value); setPage(1) }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
        </select>
        <button
          className={`inv-btn inv-btn-toggle ${soloCriticos ? 'active' : ''}`}
          onClick={() => { setSoloCriticos(!soloCriticos); onClearFiltro && onClearFiltro(); setPage(1) }}>
          <AlertTriangle size={14}/> Solo críticos
        </button>
        <button className="inv-btn inv-btn-outline" onClick={load}><RefreshCw size={14}/></button>
        <button className="inv-btn inv-btn-outline" onClick={() => setModalCategorias(true)}>
          <Settings size={14}/> Categorías
        </button>
        <button className="inv-btn inv-btn-primary" onClick={() => setModalProd('new')}><Plus size={14}/> Nuevo producto</button>
      </div>

      <div className="inv-table-wrap">
        {loading ? (
          <div className="inv-loading"><Loader2 size={18} className="spin"/> Cargando productos...</div>
        ) : productos.length === 0 ? (
          <div className="inv-empty">No se encontraron productos</div>
        ) : (
          <table className="inv-table">
            <thead><tr>
              <th>SKU</th><th>Producto</th><th>Categoría</th><th>Stock Total</th><th>Costo Prom.</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td><span className="inv-sku">{p.codigo_sku}</span></td>
                  <td>
                    <div style={{fontWeight:600,color:'#0F1035'}}>{p.nombre}</div>
                    <div style={{fontSize:11,color:'#9CA3AF'}}>{p.unidad_medida}{p.es_perecedero ? ' · Perecedero' : ''}</div>
                  </td>
                  <td>
                    {p.categoria_nombre
                      ? <span className="inv-badge inv-badge-blue">{p.categoria_icono} {p.categoria_nombre}</span>
                      : <span style={{color:'#9CA3AF',fontSize:12}}>—</span>}
                  </td>
                  <td>
                    <strong>{parseFloat(p.total_stock)}</strong>
                    <div style={{fontSize:11,color:'#9CA3AF'}}>mín {p.stock_minimo}</div>
                  </td>
                  <td>{fmt(p.costo_promedio)}</td>
                  <td>{estadoBadge(p.estado_stock)}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => setModalDetalle(p.id)} title="Ver detalle">
                        <Eye size={13}/>
                      </button>
                      <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => setModalProd(p)} title="Editar">
                        <Edit2 size={13}/>
                      </button>
                      <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => setModalMov(p)} title="Movimiento rápido">
                        <ArrowLeftRight size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="inv-pagination">
        <span>{total} productos</span>
        <button className="inv-page-btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>←</button>
        <span>Pág {page}</span>
        <button className="inv-page-btn" disabled={page * 50 >= total} onClick={() => setPage(p => p+1)}>→</button>
      </div>

      {modalProd && (
        <ModalProducto
          producto={modalProd === 'new' ? null : modalProd}
          categorias={categorias}
          onClose={() => setModalProd(null)}
          onSaved={() => { setModalProd(null); load() }}
        />
      )}
      {modalDetalle && (
        <ModalDetalle
          productoId={modalDetalle}
          onClose={() => setModalDetalle(null)}
          onMovimiento={p => { setModalDetalle(null); setModalMov(p) }}
        />
      )}
      {modalMov && (
        <ModalMovimiento
          productoInicial={modalMov}
          onClose={() => setModalMov(null)}
          onSaved={() => { setModalMov(null); load() }}
        />
      )}
      {modalCategorias && (
        <ModalCategorias
          onClose={() => setModalCategorias(false)}
          onChanged={() => { onCategoriasChanged && onCategoriasChanged() }}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL — Gestionar categorías de inventario
// ═══════════════════════════════════════════════════════════════════════════
const ICONOS_SUGERIDOS = ['📦','⚰️','🏺','🌸','🧴','👔','📋','🕯️','🚗','💐','🧵','🕊️']

function ModalCategorias({ onClose, onChanged }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre:'', descripcion:'', icono:'📦', color:'#6B7280' })
  const [editando, setEditando] = useState(null) // null | id
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventario/categorias', { params: { todas: 1 } })
      setLista(r.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const editar = (c) => {
    setEditando(c.id)
    setForm({ nombre:c.nombre, descripcion:c.descripcion||'', icono:c.icono, color:c.color })
    setError('')
  }
  const nuevo = () => {
    setEditando('new')
    setForm({ nombre:'', descripcion:'', icono:'📦', color:'#6B7280' })
    setError('')
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    setSaving(true); setError('')
    try {
      if (editando === 'new') await api.post('/inventario/categorias', form)
      else await api.put(`/inventario/categorias/${editando}`, form)
      setEditando(null)
      await cargar()
      onChanged()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const desactivar = async (c) => {
    if (!confirm(`¿Desactivar la categoría "${c.nombre}"?`)) return
    try {
      await api.delete(`/inventario/categorias/${c.id}`)
      await cargar()
      onChanged()
    } catch (e) {
      alert(e.response?.data?.error || 'Error al desactivar')
    }
  }

  return (
    <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal" style={{ maxWidth:520 }}>
        <div className="inv-modal-head">
          <span className="inv-modal-title">Categorías de inventario</span>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="inv-modal-body">
          {loading ? (
            <div className="inv-loading"><Loader2 size={18} className="spin"/> Cargando…</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
              {lista.map(c => (
                <div key={c.id} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                  border:'1.5px solid #E2E5F0', borderRadius:10,
                  opacity: c.activo ? 1 : .5,
                }}>
                  <span style={{ fontSize:18 }}>{c.icono}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#0F1035' }}>
                      {c.nombre} {!c.activo && <span style={{ color:'#9CA3AF', fontWeight:400 }}>(inactiva)</span>}
                    </div>
                    <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.total_productos} producto(s)</div>
                  </div>
                  <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => editar(c)} title="Editar">
                    <Edit2 size={13}/>
                  </button>
                  {c.activo && (
                    <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => desactivar(c)} title="Desactivar">
                      <Trash2 size={13}/>
                    </button>
                  )}
                </div>
              ))}
              {lista.length === 0 && <div className="inv-empty">Sin categorías aún</div>}
            </div>
          )}

          {editando ? (
            <div style={{ border:'1.5px dashed #CBD5E1', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:'#0F1035', marginBottom:10 }}>
                {editando === 'new' ? 'Nueva categoría' : 'Editar categoría'}
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre de la categoría"
                  style={{ flex:1, border:'1.5px solid #E2E5F0', borderRadius:8, padding:'8px 10px', fontSize:13, outline:'none' }}
                />
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width:40, height:36, border:'1.5px solid #E2E5F0', borderRadius:8, padding:2, cursor:'pointer' }}
                />
              </div>
              <input
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción (opcional)"
                style={{ width:'100%', border:'1.5px solid #E2E5F0', borderRadius:8, padding:'8px 10px', fontSize:13, outline:'none', marginBottom:10, boxSizing:'border-box' }}
              />
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                {ICONOS_SUGERIDOS.map(ic => (
                  <button
                    type="button" key={ic}
                    onClick={() => setForm(f => ({ ...f, icono: ic }))}
                    style={{
                      width:32, height:32, borderRadius:8, fontSize:16,
                      border: form.icono === ic ? '2px solid #6366F1' : '1.5px solid #E2E5F0',
                      background: form.icono === ic ? '#EEF2FF' : '#fff', cursor:'pointer',
                    }}
                  >{ic}</button>
                ))}
              </div>
              {error && <div className="inv-alert inv-alert-error" style={{ marginBottom:10 }}>{error}</div>}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                <button className="inv-btn inv-btn-primary inv-btn-sm" onClick={guardar} disabled={saving}>
                  {saving ? <Loader2 size={13} className="spin"/> : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <button className="inv-btn inv-btn-primary" onClick={nuevo}><Plus size={14}/> Nueva categoría</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: BODEGAS
// ═══════════════════════════════════════════════════════════════════════════
function TabBodegas() {
  const [bodegas, setBodegas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState({})
  const [ubicaciones, setUbicaciones] = useState({})
  const [modalBodega, setModalBodega] = useState(false)
  const [modalUbic, setModalUbic] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/inventario/bodegas')
      .then(r => setBodegas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const toggleExpand = async (bod) => {
    const isOpen = expandido[bod.id]
    setExpandido(e => ({ ...e, [bod.id]: !isOpen }))
    if (!isOpen && !ubicaciones[bod.id]) {
      const r = await api.get(`/inventario/bodegas/${bod.id}/ubicaciones`)
      setUbicaciones(u => ({ ...u, [bod.id]: r.data }))
    }
  }

  const onUbicSaved = (bodId) => {
    setModalUbic(null)
    api.get(`/inventario/bodegas/${bodId}/ubicaciones`)
      .then(r => setUbicaciones(u => ({ ...u, [bodId]: r.data })))
  }

  if (loading) return <div className="inv-loading"><Loader2 size={18} className="spin"/> Cargando bodegas...</div>

  return (
    <>
      <div className="inv-toolbar">
        <div style={{flex:1}}/>
        <button className="inv-btn inv-btn-outline" onClick={load}><RefreshCw size={14}/></button>
        <button className="inv-btn inv-btn-primary" onClick={() => setModalBodega(true)}><Plus size={14}/> Nueva Bodega</button>
      </div>

      {bodegas.length === 0 ? (
        <div className="inv-empty">No hay bodegas registradas</div>
      ) : (
        <div className="inv-grid">
          {bodegas.map(b => (
            <div key={b.id} className="inv-card">
              <div className="inv-card-header">
                <div>
                  <div className="inv-card-title"><Warehouse size={15} style={{display:'inline',marginRight:6}}/>{b.nombre}</div>
                  <div className="inv-card-sub">{b.codigo} {b.sede_nombre ? `· ${b.sede_nombre}` : ''}</div>
                </div>
                <span className="inv-badge inv-badge-blue">{b.total_ubicaciones} ubic.</span>
              </div>
              <div className="inv-card-body">
                <div className="inv-card-meta">
                  {b.responsable_nombre && (
                    <div className="inv-card-meta-row"><span>Responsable</span><strong>{b.responsable_nombre}</strong></div>
                  )}
                  <div className="inv-card-meta-row"><span>Productos</span><strong>{b.total_productos}</strong></div>
                  <div className="inv-card-meta-row"><span>Valor total</span><strong style={{color:'#2E3192'}}>{fmt(b.valor_total)}</strong></div>
                </div>
              </div>
              {expandido[b.id] && ubicaciones[b.id] && (
                <div className="inv-expand-body">
                  <ul className="inv-ubic-list">
                    {ubicaciones[b.id].map(u => (
                      <li key={u.id} className="inv-ubic-item">
                        <span><MapPin size={11} style={{display:'inline',marginRight:4}}/><strong>{u.codigo}</strong> {u.nombre}</span>
                        <span style={{color:'#6B7280'}}>{u.tipo} · {parseFloat(u.stock_total)} uds</span>
                      </li>
                    ))}
                    {ubicaciones[b.id].length === 0 && <li style={{fontSize:12,color:'#9CA3AF',padding:'4px 0'}}>Sin ubicaciones</li>}
                  </ul>
                </div>
              )}
              <div className="inv-card-footer">
                <button className="inv-expand-btn" onClick={() => toggleExpand(b)}>
                  {expandido[b.id] ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                  {expandido[b.id] ? 'Ocultar ubicaciones' : 'Ver ubicaciones'}
                </button>
                <div style={{flex:1}}/>
                <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => setModalUbic(b)}>
                  <Plus size={12}/> Ubicación
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalBodega && <ModalBodega onClose={() => setModalBodega(false)} onSaved={() => { setModalBodega(false); load() }}/>}
      {modalUbic && <ModalUbicacion bodega={modalUbic} onClose={() => setModalUbic(null)} onSaved={() => onUbicSaved(modalUbic.id)}/>}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════
function TabMovimientos() {
  const [movimientos, setMovimientos] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ tipo: '', desde: '', hasta: '' })

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventario/movimientos', {
        params: { ...filtros, page, limit: 50 }
      })
      setMovimientos(r.data.data || [])
      setTotal(r.data.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filtros, page])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="inv-toolbar">
        <select className="inv-select" value={filtros.tipo} onChange={e => setF('tipo', e.target.value)}>
          <option value="">Todos los tipos</option>
          {['ENTRADA','SALIDA','TRASLADO','AJUSTE','CONSUMO'].map(t => <option key={t}>{t}</option>)}
        </select>
        <input className="inv-input inv-select" type="date" value={filtros.desde} onChange={e => setF('desde', e.target.value)} placeholder="Desde"/>
        <input className="inv-input inv-select" type="date" value={filtros.hasta} onChange={e => setF('hasta', e.target.value)} placeholder="Hasta"/>
        <button className="inv-btn inv-btn-outline" onClick={load}><RefreshCw size={14}/></button>
      </div>

      <div className="inv-table-wrap">
        {loading ? (
          <div className="inv-loading"><Loader2 size={18} className="spin"/> Cargando movimientos...</div>
        ) : movimientos.length === 0 ? (
          <div className="inv-empty">No hay movimientos en el período seleccionado</div>
        ) : (
          <table className="inv-table">
            <thead><tr>
              <th>Fecha</th><th>Tipo</th><th>Producto</th><th>Desde → Hasta</th><th>Cantidad</th><th>Costo Unit.</th><th>Total</th><th>Usuario</th>
            </tr></thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td style={{whiteSpace:'nowrap'}}>{fmtDate(m.fecha)}</td>
                  <td>
                    <span className="inv-badge" style={{background:TIPO_COLORS[m.tipo]+'22',color:TIPO_COLORS[m.tipo]}}>
                      {m.tipo}
                    </span>
                  </td>
                  <td>
                    <div style={{fontWeight:600,fontSize:13}}>{m.producto_nombre}</div>
                    <span className="inv-sku">{m.codigo_sku}</span>
                  </td>
                  <td style={{fontSize:12,color:'#6B7280'}}>
                    {m.origen_bodega ? `${m.origen_bodega} (${m.origen_codigo})` : '—'} → {m.destino_bodega ? `${m.destino_bodega} (${m.destino_codigo})` : '—'}
                  </td>
                  <td><strong>{m.cantidad}</strong></td>
                  <td>{fmt(m.costo_unitario)}</td>
                  <td>{fmt(m.valor_total)}</td>
                  <td style={{fontSize:12}}>{m.usuario_nombre || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="inv-pagination">
        <span>{total} movimientos</span>
        <button className="inv-page-btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>←</button>
        <span>Pág {page}</span>
        <button className="inv-page-btn" disabled={page * 50 >= total} onClick={() => setPage(p => p+1)}>→</button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════
function TabOrdenesCompra() {
  const [ocs, setOcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [bodegas, setBodegas] = useState([])
  const [modalOC, setModalOC] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/inventario/ordenes-compra', { params: { estado: estadoFiltro || undefined } }),
      api.get('/inventario/bodegas'),
    ])
      .then(([r1, r2]) => { setOcs(r1.data); setBodegas(r2.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [estadoFiltro])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="inv-toolbar">
        <select className="inv-select" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
          <option value="">Todos los estados</option>
          {['BORRADOR','PENDIENTE','APROBADA','RECIBIDA','CANCELADA'].map(e => <option key={e}>{e}</option>)}
        </select>
        <button className="inv-btn inv-btn-outline" onClick={load}><RefreshCw size={14}/></button>
        <button className="inv-btn inv-btn-primary" onClick={() => setModalOC(true)}><Plus size={14}/> Nueva OC</button>
      </div>

      <div className="inv-table-wrap">
        {loading ? (
          <div className="inv-loading"><Loader2 size={18} className="spin"/> Cargando órdenes...</div>
        ) : ocs.length === 0 ? (
          <div className="inv-empty">No hay órdenes de compra</div>
        ) : (
          <table className="inv-table">
            <thead><tr>
              <th>N° OC</th><th>Proveedor</th><th>Bodega</th><th>Emisión</th><th>Esperada</th><th>Total</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {ocs.map(o => (
                <tr key={o.id}>
                  <td><strong style={{color:'#2E3192'}}>#{o.numero}</strong></td>
                  <td>
                    <div style={{fontWeight:600,fontSize:13}}>{o.proveedor_nombre || '—'}</div>
                    {o.proveedor_nit && <span className="inv-sku">{o.proveedor_nit}</span>}
                  </td>
                  <td>{o.bodega_nombre || '—'}</td>
                  <td style={{whiteSpace:'nowrap'}}>{fmtDate(o.fecha_emision)}</td>
                  <td style={{whiteSpace:'nowrap'}}>{fmtDate(o.fecha_esperada)}</td>
                  <td style={{fontWeight:600}}>{fmt(o.total)}</td>
                  <td>
                    <span className="inv-badge" style={{background:ESTADO_OC_COLORS[o.estado]+'22',color:ESTADO_OC_COLORS[o.estado]}}>
                      {o.estado}
                    </span>
                  </td>
                  <td>
                    <button className="inv-btn inv-btn-outline inv-btn-sm" onClick={() => setModalDetalle(o.id)}>
                      <Eye size={13}/> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOC && <ModalOC bodegas={bodegas} onClose={() => setModalOC(false)} onSaved={() => { setModalOC(false); load() }}/>}
      {modalDetalle && <ModalDetalleOC ocId={modalDetalle} onClose={() => setModalDetalle(null)} onRefresh={load}/>}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function InventarioPage() {
  const [stats, setStats] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [tab, setTab] = useState('productos')
  const [filtroStockBajo, setFiltroStockBajo] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api.get('/inventario/stats'),
        api.get('/inventario/categorias'),
      ])
      setStats(s.data)
      setCategorias(c.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const TABS = [
    { key: 'productos',   label: 'Productos' },
    { key: 'bodegas',     label: 'Bodegas & Ubicaciones' },
    { key: 'movimientos', label: 'Movimientos' },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="inv">
        {/* Stats */}
        <div className="inv-stats">
          <div className="inv-stat">
            <div className="inv-stat-icon" style={{background:'#DBEAFE'}}>
              <Package size={22} color="#2563EB"/>
            </div>
            <div>
              <div className="inv-stat-label">Total Productos</div>
              <div className="inv-stat-value">{stats?.total_productos ?? '—'}</div>
            </div>
          </div>
          <div className="inv-stat">
            <div className="inv-stat-icon" style={{background:'#D1FAE5'}}>
              <DollarSign size={22} color="#059669"/>
            </div>
            <div>
              <div className="inv-stat-label">Valor Inventario</div>
              <div className="inv-stat-value" style={{fontSize:16}}>{stats ? fmt(stats.valor_inventario) : '—'}</div>
            </div>
          </div>
          <div
            className="inv-stat clickable"
            onClick={() => { setTab('productos'); setFiltroStockBajo(true) }}>
            <div className="inv-stat-icon" style={{background:'#FEE2E2'}}>
              <AlertTriangle size={22} color="#DC2626"/>
            </div>
            <div>
              <div className="inv-stat-label">Bajo Mínimo</div>
              <div className="inv-stat-value" style={{color:'#DC2626'}}>{stats?.productos_bajo_minimo ?? '—'}</div>
              <div className="inv-stat-sub">clic para ver</div>
            </div>
          </div>
          <div className="inv-stat">
            <div className="inv-stat-icon" style={{background:'#EDE9FE'}}>
              <ArrowLeftRight size={22} color="#7C3AED"/>
            </div>
            <div>
              <div className="inv-stat-label">Movimientos Hoy</div>
              <div className="inv-stat-value">{stats?.movimientos_hoy ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="inv-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`inv-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="inv-content">
          {tab === 'productos' && (
            <TabProductos
              categorias={categorias}
              filtroStock={filtroStockBajo}
              onClearFiltro={() => setFiltroStockBajo(false)}
              onCategoriasChanged={loadStats}
            />
          )}
          {tab === 'bodegas' && <TabBodegas/>}
          {tab === 'movimientos' && <TabMovimientos/>}
        </div>
      </div>
    </>
  )
}
