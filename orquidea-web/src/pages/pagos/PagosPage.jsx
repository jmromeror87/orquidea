/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Cartera y Pagos                                     ║
 * ║  Archivo         : PagosPage.jsx                                       ║
 * ║  Fecha           : 2026-07-01                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'
import {
  DollarSign, AlertTriangle, Clock, TrendingUp, Search,
  CheckCircle, XCircle, Printer, RefreshCw, ChevronRight,
  CreditCard, Banknote, Building2, FileText, Phone,
  Calendar, X, Plus, Receipt, Upload, Paperclip,
} from 'lucide-react'
import api from '../../services/api.js'
import { useAuthStore } from '../../store/auth.store.js'
import { useFormasPago } from '../../hooks/useFormasPago.js'
import { toast } from '../../store/toast.store.js'

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
.pg { display:flex; flex-direction:column; height:100%; background:#F8F9FC; }

/* Stats bar */
.pg-stats { display:flex; gap:12px; padding:16px 20px 0; flex-shrink:0; flex-wrap:wrap; }
.pg-stat {
  flex:1; min-width:160px;
  background:#fff; border:1px solid #ECEDF8; border-radius:14px;
  padding:14px 18px; display:flex; align-items:center; gap:14px;
}
.pg-stat-icon {
  width:44px; height:44px; border-radius:12px;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.pg-stat-label { font-size:11px; color:#9CA3AF; margin-bottom:3px; }
.pg-stat-value { font-size:22px; font-weight:800; color:#0F1035; line-height:1; }
.pg-stat-sub   { font-size:10px; color:#9CA3AF; margin-top:2px; }

/* Tabs */
.pg-tabs { display:flex; gap:4px; padding:16px 20px 0; flex-shrink:0; }
.pg-tab {
  padding:8px 18px; border-radius:10px; font-size:13px; font-weight:600;
  cursor:pointer; border:1.5px solid transparent; transition:all .15s;
  color:#6B7280; background:transparent;
}
.pg-tab.active { background:#2E3192; color:#fff; border-color:#2E3192; }
.pg-tab:not(.active):hover { background:#F4F5FA; color:#2E3192; border-color:#ECEDF8; }

/* Body */
.pg-body { flex:1; overflow:auto; padding:16px 20px 20px; }

/* Filtros */
.pg-filtros {
  display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center;
}
.pg-input {
  height:38px; border:1.5px solid #ECEDF8; border-radius:10px;
  padding:0 12px; font-size:13px; color:#0F1035; background:#fff;
  outline:none; transition:border .15s;
}
.pg-input:focus { border-color:#2E3192; }
.pg-input.busca { flex:1; min-width:200px; padding-left:36px; }
.pg-search-wrap { position:relative; flex:1; min-width:200px; }
.pg-search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; }
.pg-btn {
  height:38px; border-radius:10px; padding:0 16px; font-size:13px; font-weight:700;
  cursor:pointer; display:inline-flex; align-items:center; gap:7px;
  border:none; transition:all .15s;
}
.pg-btn-primary { background:#2E3192; color:#fff; }
.pg-btn-primary:hover { background:#252880; }
.pg-btn-success { background:#059669; color:#fff; }
.pg-btn-success:hover { background:#047857; }
.pg-btn-ghost { background:#F4F5FA; color:#374151; border:1.5px solid #ECEDF8; }
.pg-btn-ghost:hover { background:#ECEDF8; }
.pg-btn-sm { height:30px; padding:0 12px; font-size:12px; }

/* Tabla */
.pg-table-wrap { background:#fff; border:1px solid #ECEDF8; border-radius:14px; overflow:hidden; }
.pg-table { width:100%; border-collapse:collapse; font-size:13px; }
.pg-table th {
  background:#F8F9FC; font-size:11px; font-weight:700; color:#6B7280;
  text-transform:uppercase; letter-spacing:.5px; padding:10px 14px;
  text-align:left; border-bottom:1px solid #ECEDF8; white-space:nowrap;
}
.pg-table td { padding:11px 14px; border-bottom:1px solid #F0F1FA; color:#374151; }
.pg-table tr:last-child td { border-bottom:none; }
.pg-table tr:hover td { background:#FAFBFF; }
.pg-empty { text-align:center; padding:48px; color:#9CA3AF; }

/* Pills estado */
.pill {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px;
}
.pill-verde  { background:#ECFDF5; color:#059669; }
.pill-rojo   { background:#FEF2F2; color:#EF4444; }
.pill-naranja{ background:#FFF7ED; color:#EA580C; }
.pill-gris   { background:#F3F4F6; color:#6B7280; }

/* Mora badge */
.mora-badge {
  display:inline-flex; align-items:center; gap:4px;
  font-size:12px; font-weight:800; padding:3px 10px; border-radius:20px;
}
.mora-0  { background:#ECFDF5; color:#059669; }
.mora-1  { background:#FFF7ED; color:#EA580C; }
.mora-2  { background:#FEF2F2; color:#EF4444; }

/* Modal */
.pg-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1000;
  display:flex; align-items:center; justify-content:center; padding:20px;
  animation:fadeIn .15s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.pg-modal {
  background:#fff; border-radius:20px; padding:28px;
  width:100%; max-width:560px; max-height:90vh; overflow-y:auto;
  box-shadow:0 24px 60px rgba(0,0,0,.18); animation:slideUp .2s ease;
}
@keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.pg-modal-title {
  font-size:18px; font-weight:800; color:#0F1035; margin-bottom:20px;
  display:flex; align-items:center; justify-content:space-between;
}
.pg-modal-close {
  width:32px; height:32px; border-radius:8px; background:#F4F5FA;
  display:flex; align-items:center; justify-content:center; cursor:pointer; border:none;
}
.pg-modal-close:hover { background:#ECEDF8; }

/* Campos modal */
.pg-field { margin-bottom:16px; }
.pg-label { font-size:12px; font-weight:700; color:#374151; margin-bottom:6px; display:block; }
.pg-select {
  width:100%; height:40px; border:1.5px solid #ECEDF8; border-radius:10px;
  padding:0 12px; font-size:13px; color:#0F1035; background:#fff;
  outline:none; transition:border .15s; appearance:none;
}
.pg-select:focus { border-color:#2E3192; }
.pg-row { display:flex; gap:12px; }
.pg-row .pg-field { flex:1; }

/* Card titular */
.pg-titular-card {
  background:#F8F9FC; border:1.5px solid #ECEDF8; border-radius:12px;
  padding:14px 16px; margin-bottom:16px;
}
.pg-titular-nombre { font-size:15px; font-weight:800; color:#0F1035; }
.pg-titular-meta { font-size:12px; color:#6B7280; margin-top:2px; }
.pg-titular-row { display:flex; gap:20px; margin-top:8px; flex-wrap:wrap; }
.pg-titular-item { font-size:12px; color:#374151; display:flex; align-items:center; gap:5px; }

/* Resumen pago */
.pg-resumen {
  background:#F0F4FF; border:1.5px solid #C7D2FE; border-radius:12px;
  padding:14px 16px; margin-bottom:16px;
}
.pg-resumen-row { display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; }
.pg-resumen-row:last-child { margin-bottom:0; border-top:1px solid #C7D2FE; padding-top:8px; margin-top:4px; font-weight:800; font-size:15px; }
.pg-resumen-label { color:#6366F1; }
.pg-resumen-valor { font-weight:700; color:#0F1035; }

/* Recibo impreso */
.pg-recibo {
  background:#fff; border:2px solid #ECEDF8; border-radius:16px;
  padding:24px; max-width:400px; margin:0 auto; font-family:monospace;
}
.pg-recibo-header { text-align:center; margin-bottom:16px; }
.pg-recibo-titulo { font-size:16px; font-weight:800; color:#0F1035; }
.pg-recibo-sub { font-size:11px; color:#6B7280; }
.pg-recibo-num { font-size:24px; font-weight:900; color:#2E3192; margin:8px 0; }
.pg-recibo-sep { border:none; border-top:1px dashed #ECEDF8; margin:12px 0; }
.pg-recibo-row { display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; }
.pg-recibo-total { font-size:18px; font-weight:900; color:#059669; text-align:right; margin-top:8px; }

/* Busqueda autocomplete */
.pg-autocomplete {
  position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:100;
  background:#fff; border:1.5px solid #ECEDF8; border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.1); overflow:hidden;
}
.pg-ac-item {
  padding:10px 14px; cursor:pointer; transition:background .1s;
  display:flex; justify-content:space-between; align-items:center;
}
.pg-ac-item:hover { background:#F4F5FA; }
.pg-ac-nombre { font-size:13px; font-weight:700; color:#0F1035; }
.pg-ac-meta { font-size:11px; color:#6B7280; margin-top:2px; }
.pg-ac-mora { font-size:12px; font-weight:800; }

/* Tarjetas de acción rápida */
.pg-action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: #fff;
  border: 1.5px solid #ECEDF8;
  border-radius: 14px;
  cursor: pointer;
  transition: all .15s;
  text-align: left;
  flex: 1;
  min-width: 220px;
  max-width: 340px;
}
.pg-action-card:hover {
  border-color: #2E3192;
  box-shadow: 0 4px 14px rgba(46,49,146,.1);
  transform: translateY(-1px);
}
.pg-action-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pg-action-body { flex: 1; }
.pg-action-title { font-size: 14px; font-weight: 700; color: #0F1035; }
.pg-action-desc  { font-size: 11px; color: #9CA3AF; margin-top: 2px; }

/* Morosos */
.pg-moroso-row {
  background:#fff; border:1.5px solid #ECEDF8; border-radius:12px;
  padding:14px 16px; margin-bottom:10px; display:flex; gap:16px;
  align-items:center;
}
.pg-moroso-info { flex:1; }
.pg-moroso-nombre { font-size:14px; font-weight:800; color:#0F1035; }
.pg-moroso-meta { font-size:12px; color:#6B7280; margin-top:2px; }
.pg-moroso-actions { display:flex; gap:8px; align-items:center; }
`

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const parseDate = d => { if (!d) return null; const s = String(d); return new Date(s.includes('T') ? s : s + 'T12:00:00') }
const fmtFecha = d => { const dt = parseDate(d); return dt ? dt.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : '—' }
const mesLabel = d => { const dt = parseDate(d); return dt ? dt.toLocaleDateString('es-CO', { month:'long', year:'numeric' }) : '—' }
const METODO_ICON = { efectivo:<Banknote size={14}/>, transferencia:<Building2 size={14}/>, tarjeta:<CreditCard size={14}/>, cheque:<FileText size={14}/>, nequi:<span style={{fontWeight:900,fontSize:12}}>N</span>, daviplata:<span style={{fontWeight:900,fontSize:12}}>D</span> }

function MoraBadge({ meses, valor }) {
  const cls = meses === 0 ? 'mora-0' : meses < 3 ? 'mora-1' : 'mora-2'
  if (meses === 0) return <span className={`mora-badge ${cls}`}><CheckCircle size={12}/>Al día</span>
  return (
    <div>
      <span className={`mora-badge ${cls}`}><AlertTriangle size={12}/>{meses} mes{meses!==1?'es':''}</span>
      {valor > 0 && <div style={{fontSize:11,color:'#EF4444',marginTop:2}}>{fmt(valor)}</div>}
    </div>
  )
}

// ── Modal registrar pago ─────────────────────────────────────────────────────
function ModalPago({ tipo, polizaInicial, onClose, onOk }) {
  const [busca, setBusca]           = useState('')
  const [opciones, setOpciones]     = useState([])
  const [seleccionado, setSeleccionado] = useState(polizaInicial || null)
  const [meses, setMeses]           = useState(1)
  const [formasPago, setFormasPago] = useState([])
  const [metodo, setMetodo]         = useState('efectivo')
  const [referencia, setReferencia] = useState('')
  const [archivo, setArchivo]       = useState(null)       // File object
  const [archivoNombre, setArchivoNombre] = useState('')
  const [descuento, setDescuento]   = useState(0)
  const [recargo, setRecargo]       = useState(0)
  const [notas, setNotas]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [recibo, setRecibo]         = useState(null)
  const [error, setError]           = useState('')
  const fileRef = useRef(null)
  const searchRef = useRef(null)

  // Cargar formas de pago dinámicas
  useEffect(() => {
    api.get('/formas-pago').then(r => {
      setFormasPago(r.data.data || [])
    }).catch(() => {})
  }, [])

  const formaSel = formasPago.find(f => f.codigo === metodo) || null

  const buscarDebounce = useRef(null)
  const doBusca = v => {
    setBusca(v); setSeleccionado(null)
    clearTimeout(buscarDebounce.current)
    if (v.length < 2) { setOpciones([]); return }
    buscarDebounce.current = setTimeout(async () => {
      const res = await api.get('/pagos/buscar', { params: { q: v, tipo } })
      setOpciones(res.data.data || [])
    }, 300)
  }

  const sel = polizaInicial ? polizaInicial : seleccionado
  const monto = sel ? Number(sel.valor_cuota) * meses : 0
  const total = monto - Number(descuento) + Number(recargo)
  const moraMeses = sel ? Number(sel.meses_mora || 0) : 0

  useEffect(() => {
    if (sel && moraMeses > 0) setMeses(moraMeses)
  }, [sel])

  const onArchivoChange = e => {
    const f = e.target.files?.[0]
    if (!f) return
    setArchivo(f)
    setArchivoNombre(f.name)
  }

  const handlePagar = async () => {
    if (!sel) return setError('Seleccione una póliza o contrato')
    if (formaSel?.requiere_referencia && !referencia.trim())
      return setError(`La forma de pago "${formaSel.nombre}" requiere número de referencia.`)
    if (formaSel?.requiere_soporte && !archivo)
      return setError(`La forma de pago "${formaSel.nombre}" requiere adjuntar el soporte de pago.`)

    setError(''); setLoading(true)
    try {
      const endpoint = tipo === 'POLIZA' ? '/pagos/poliza' : '/pagos/contrato'
      const body = tipo === 'POLIZA'
        ? { poliza_id: sel.id, meses, metodo_pago: metodo, referencia, descuento: Number(descuento), recargo_mora: Number(recargo), notas }
        : { contrato_id: sel.id, meses, metodo_pago: metodo, referencia, descuento: Number(descuento), recargo_mora: Number(recargo), notas }
      const res = await api.post(endpoint, body)

      // Subir soporte si se adjuntó
      if (archivo && res.data?.recibo?.id) {
        const tabla = tipo === 'POLIZA' ? 'poliza' : 'contrato'
        const fd = new FormData()
        fd.append('file', archivo)
        await api.post(`/pagos/${res.data.recibo.id}/soporte?tabla=${tabla}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      toast.success('Pago registrado')
      setRecibo(res.data)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar pago')
      setError(e.response?.data?.error || 'Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  if (recibo) return (
    <div className="pg-overlay" onClick={onClose}>
      <div className="pg-modal" onClick={e => e.stopPropagation()}>
        <div className="pg-modal-title">
          <span style={{color:'#059669',display:'flex',alignItems:'center',gap:8}}><CheckCircle size={20}/>¡Pago registrado!</span>
          <button className="pg-modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="pg-recibo">
          <div className="pg-recibo-header">
            <div className="pg-recibo-titulo">RECIBO DE CAJA</div>
            <div className="pg-recibo-sub">Funeraria San José de Ábrego</div>
            <div className="pg-recibo-num">N° {String(recibo.numero_recibo).padStart(6,'0')}</div>
          </div>
          <hr className="pg-recibo-sep"/>
          <div className="pg-recibo-row"><span>Titular</span><span style={{fontWeight:700}}>{sel?.titular || '—'}</span></div>
          <div className="pg-recibo-row"><span>{tipo === 'POLIZA' ? 'Póliza' : 'Contrato'}</span><span>N° {sel?.numero}</span></div>
          <div className="pg-recibo-row"><span>Plan</span><span>{sel?.plan}</span></div>
          <hr className="pg-recibo-sep"/>
          <div className="pg-recibo-row"><span>Período</span><span>{mesLabel(recibo.recibo?.mes_correspondiente)} – {mesLabel(recibo.recibo?.periodo_hasta)}</span></div>
          <div className="pg-recibo-row"><span>Meses</span><span>{meses}</span></div>
          <div className="pg-recibo-row">
            <span>Forma de pago</span>
            <span>{formaSel ? `${formaSel.icono} ${formaSel.nombre}` : metodo}</span>
          </div>
          {referencia && <div className="pg-recibo-row"><span>Referencia</span><span>{referencia}</span></div>}
          {archivoNombre && <div className="pg-recibo-row"><span>Soporte</span><span style={{color:'#059669'}}>✓ Adjunto</span></div>}
          <hr className="pg-recibo-sep"/>
          <div className="pg-recibo-row"><span>Valor</span><span>{fmt(monto)}</span></div>
          {Number(descuento) > 0 && <div className="pg-recibo-row"><span>Descuento</span><span style={{color:'#059669'}}>-{fmt(descuento)}</span></div>}
          {Number(recargo) > 0 && <div className="pg-recibo-row"><span>Recargo mora</span><span style={{color:'#EF4444'}}>+{fmt(recargo)}</span></div>}
          <div className="pg-recibo-total">TOTAL: {fmt(total)}</div>
        </div>

        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button className="pg-btn pg-btn-ghost" style={{flex:1}} onClick={() => window.print()}>
            <Printer size={14}/>Imprimir
          </button>
          <button className="pg-btn pg-btn-success" style={{flex:1}} onClick={() => { onOk(); onClose() }}>
            <Plus size={14}/>Nuevo pago
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="pg-overlay" onClick={onClose}>
      <div className="pg-modal" onClick={e => e.stopPropagation()}>
        <div className="pg-modal-title">
          <span style={{display:'flex',alignItems:'center',gap:8}}><Receipt size={20} color="#2E3192"/>Registrar Pago — {tipo === 'POLIZA' ? 'Póliza' : 'Contrato'}</span>
          <button className="pg-modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        {!polizaInicial && (
          <div className="pg-field" style={{position:'relative'}}>
            <label className="pg-label">Buscar titular, cédula o número de {tipo === 'POLIZA' ? 'póliza' : 'contrato'}</label>
            <div className="pg-search-wrap" ref={searchRef}>
              <Search size={15}/>
              <input
                className="pg-input busca"
                style={{width:'100%'}}
                placeholder="Nombre, cédula o número…"
                value={busca}
                onChange={e => doBusca(e.target.value)}
                autoFocus
              />
              {opciones.length > 0 && !seleccionado && (
                <div className="pg-autocomplete">
                  {opciones.map(o => (
                    <div key={o.id} className="pg-ac-item" onClick={() => { setSeleccionado(o); setOpciones([]); setBusca(o.titular) }}>
                      <div>
                        <div className="pg-ac-nombre">{o.titular}</div>
                        <div className="pg-ac-meta">N°{o.numero} · {o.plan} · {fmt(o.valor_cuota)}/mes</div>
                      </div>
                      <div><MoraBadge meses={Number(o.meses_mora||0)} valor={Number(o.saldo_mora||0)}/></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {sel && (
          <div className="pg-titular-card">
            <div className="pg-titular-nombre">{sel.titular}</div>
            <div className="pg-titular-meta">{tipo === 'POLIZA' ? 'Póliza' : 'Contrato'} N°{sel.numero} · {sel.plan}</div>
            <div className="pg-titular-row">
              <div className="pg-titular-item"><Phone size={12}/>{sel.telefono || '—'}</div>
              <div className="pg-titular-item"><Calendar size={12}/>Día cobro: {sel.dia_cobro || '—'}</div>
              <div className="pg-titular-item">Pago hasta: <strong>{fmtFecha(sel.pago_hasta)}</strong></div>
            </div>
            {moraMeses > 0 && (
              <div style={{marginTop:8,padding:'6px 10px',background:'#FEF2F2',borderRadius:8,display:'flex',alignItems:'center',gap:6}}>
                <AlertTriangle size={14} color="#EF4444"/>
                <span style={{fontSize:12,color:'#EF4444',fontWeight:700}}>
                  {moraMeses} mes{moraMeses!==1?'es':''} en mora · {fmt(sel.saldo_mora)} pendiente
                </span>
              </div>
            )}
          </div>
        )}

        <div className="pg-row">
          <div className="pg-field">
            <label className="pg-label">Meses a pagar</label>
            <select className="pg-select" value={meses} onChange={e => setMeses(Number(e.target.value))}>
              {[1,2,3,4,5,6,12].map(m => <option key={m} value={m}>{m} mes{m!==1?'es':''}</option>)}
            </select>
          </div>
          <div className="pg-field">
            <label className="pg-label">Forma de pago</label>
            <select className="pg-select" value={metodo} onChange={e => { setMetodo(e.target.value); setReferencia(''); setArchivo(null); setArchivoNombre('') }}>
              {formasPago.map(f => (
                <option key={f.codigo} value={f.codigo}>{f.icono} {f.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Referencia — aparece cuando la forma de pago la requiere */}
        {formaSel?.requiere_referencia && (
          <div className="pg-field">
            <label className="pg-label">
              N° de referencia / comprobante <span style={{color:'#EF4444'}}>*</span>
            </label>
            <input
              className="pg-input"
              style={{width:'100%', borderColor: !referencia.trim() ? '#FCA5A5' : undefined}}
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder={`Ingrese el número de ${formaSel.nombre}…`}
            />
            {!referencia.trim() && (
              <span style={{fontSize:11,color:'#EF4444',marginTop:3,display:'block'}}>
                Obligatorio para pagos por {formaSel.nombre}
              </span>
            )}
          </div>
        )}

        {/* Input de archivo — siempre montado para que el ref funcione */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
          style={{display:'none'}}
          onChange={onArchivoChange}
          onClick={e => { e.target.value = null }}
        />

        {/* Soporte — aparece cuando la forma de pago lo requiere */}
        {formaSel?.requiere_soporte && (
          <div className="pg-field">
            <label className="pg-label">
              Soporte de pago <span style={{color:'#EF4444'}}>*</span>
              <span style={{color:'#9CA3AF',fontWeight:400,marginLeft:6}}>PDF, JPG, PNG, etc.</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${archivo ? '#059669' : '#E2E5F0'}`,
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                background: archivo ? '#F0FDF4' : '#FAFBFF',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!archivo) e.currentTarget.style.borderColor='#8B5CF6' }}
              onMouseLeave={e => { if (!archivo) e.currentTarget.style.borderColor='#E2E5F0' }}
            >
              {archivo
                ? <><CheckCircle size={18} color="#059669"/>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#065F46'}}>{archivoNombre}</div>
                      <div style={{fontSize:11,color:'#059669'}}>Archivo listo para adjuntar</div>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setArchivo(null); setArchivoNombre('') }}
                      style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#9CA3AF'}}>
                      <X size={14}/>
                    </button>
                  </>
                : <><Upload size={18} color="#9CA3AF"/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#374151'}}>Haz clic para adjuntar el soporte</div>
                      <div style={{fontSize:11,color:'#9CA3AF'}}>PDF, JPG, PNG, WEBP, BMP — máx. 10 MB</div>
                    </div>
                  </>
              }
            </div>
            {!archivo && (
              <span style={{fontSize:11,color:'#EF4444',marginTop:3,display:'block'}}>
                <Paperclip size={10}/> Obligatorio para pagos por {formaSel.nombre}
              </span>
            )}
          </div>
        )}

        <div className="pg-row">
          <div className="pg-field">
            <label className="pg-label">Descuento ($)</label>
            <CurrencyInput style={{width:'100%'}} value={descuento} onChange={v=>setDescuento(v)}/>
          </div>
          <div className="pg-field">
            <label className="pg-label">Recargo mora ($)</label>
            <CurrencyInput style={{width:'100%'}} value={recargo} onChange={v=>setRecargo(v)}/>
          </div>
        </div>

        <div className="pg-field">
          <label className="pg-label">Notas</label>
          <input className="pg-input" style={{width:'100%'}} value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Opcional"/>
        </div>

        {sel && (
          <div className="pg-resumen">
            <div className="pg-resumen-row">
              <span className="pg-resumen-label">Cuota mensual</span>
              <span className="pg-resumen-valor">{fmt(sel.valor_cuota)}</span>
            </div>
            <div className="pg-resumen-row">
              <span className="pg-resumen-label">× {meses} mes{meses!==1?'es':''}</span>
              <span className="pg-resumen-valor">{fmt(monto)}</span>
            </div>
            {Number(descuento) > 0 && (
              <div className="pg-resumen-row">
                <span className="pg-resumen-label">Descuento</span>
                <span className="pg-resumen-valor" style={{color:'#059669'}}>-{fmt(descuento)}</span>
              </div>
            )}
            {Number(recargo) > 0 && (
              <div className="pg-resumen-row">
                <span className="pg-resumen-label">Recargo mora</span>
                <span className="pg-resumen-valor" style={{color:'#EF4444'}}>+{fmt(recargo)}</span>
              </div>
            )}
            <div className="pg-resumen-row">
              <span className="pg-resumen-label">TOTAL</span>
              <span className="pg-resumen-valor">{fmt(total)}</span>
            </div>
          </div>
        )}

        {error && <div style={{background:'#FEF2F2',color:'#EF4444',borderRadius:8,padding:'8px 12px',fontSize:13,marginBottom:12,display:'flex',gap:6,alignItems:'center'}}><AlertTriangle size={13}/>{error}</div>}

        <div style={{display:'flex',gap:10}}>
          <button className="pg-btn pg-btn-ghost" style={{flex:1}} onClick={onClose}>Cancelar</button>
          <button
            className="pg-btn pg-btn-success"
            style={{flex:2}}
            onClick={handlePagar}
            disabled={!sel || loading}
          >
            {loading ? 'Registrando…' : <><DollarSign size={15}/>Registrar pago {sel ? `· ${fmt(total)}` : ''}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Historial de recibos ────────────────────────────────────────────────
function TabHistorial() {
  const { label: fmtMetodo } = useFormasPago()
  const [tipo, setTipo] = useState('POLIZA')
  const [busca, setBusca] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/pagos', { params: { tipo, busca, desde, hasta } })
      setData(res.data.data || [])
      setTotal(res.data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [tipo, busca, desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div>
      <div className="pg-filtros">
        <select className="pg-input" style={{width:140}} value={tipo} onChange={e=>setTipo(e.target.value)}>
          <option value="POLIZA">Pólizas</option>
          <option value="CONTRATO">Contratos</option>
        </select>
        <div className="pg-search-wrap">
          <Search size={15}/>
          <input className="pg-input busca" placeholder="Titular, cédula, N° póliza…" value={busca} onChange={e=>setBusca(e.target.value)}/>
        </div>
        <input className="pg-input" type="date" value={desde} onChange={e=>setDesde(e.target.value)} title="Desde"/>
        <input className="pg-input" type="date" value={hasta} onChange={e=>setHasta(e.target.value)} title="Hasta"/>
        <button className="pg-btn pg-btn-ghost" onClick={cargar}>
          <RefreshCw size={14}/>
        </button>
      </div>

      <div style={{fontSize:12,color:'#6B7280',marginBottom:10}}>{total} recibo{total!==1?'s':''} encontrado{total!==1?'s':''}</div>

      <div className="pg-table-wrap">
        {loading ? <div className="pg-empty">Cargando…</div> : data.length === 0 ? (
          <div className="pg-empty">No hay recibos para mostrar</div>
        ) : (
          <table className="pg-table">
            <thead>
              <tr>
                <th>N° Recibo</th>
                <th>Fecha</th>
                <th>Titular</th>
                <th>{tipo==='POLIZA'?'Póliza':'Contrato'}</th>
                <th>Período</th>
                <th>Método</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Soporte</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id}>
                  <td><strong style={{color:'#2E3192'}}>N°{String(r.numero_recibo).padStart(6,'0')}</strong></td>
                  <td>{fmtFecha(r.fecha_pago)}</td>
                  <td>
                    <div style={{fontWeight:600}}>{r.titular}</div>
                    <div style={{fontSize:11,color:'#6B7280'}}>{r.telefono}</div>
                  </td>
                  <td><span style={{color:'#6366F1',fontWeight:700}}>N°{r.poliza_numero || r.contrato_numero}</span></td>
                  <td style={{fontSize:12}}>{mesLabel(r.mes_correspondiente)}</td>
                  <td>
                    <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}>
                      {METODO_ICON[r.metodo_pago]||<DollarSign size={13}/>}
                      {fmtMetodo(r.metodo_pago)}
                    </span>
                  </td>
                  <td><strong style={{color:'#059669'}}>{fmt(r.total)}</strong></td>
                  <td>
                    {r.anulado
                      ? <span className="pill pill-rojo"><XCircle size={11}/>Anulado</span>
                      : <span className="pill pill-verde"><CheckCircle size={11}/>Válido</span>}
                  </td>
                  <td>
                    {r.soporte_url
                      ? <a href={`http://localhost:3001${r.soporte_url}`} target="_blank" rel="noreferrer"
                           style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,
                             color:'#6366F1',background:'#EEF2FF',padding:'4px 10px',borderRadius:8,textDecoration:'none'}}>
                          <Paperclip size={11}/>Ver soporte
                        </a>
                      : <span style={{fontSize:11,color:'#D1D5DB'}}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab: Morosos ─────────────────────────────────────────────────────────────
function TabMorosos({ onPagar }) {
  const [tipo, setTipo] = useState('POLIZA')
  const [busca, setBusca] = useState('')
  const [minMora, setMinMora] = useState(1)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/pagos/morosos', { params: { tipo, busca, min_mora: minMora } })
      setData(res.data.data || [])
      setTotal(res.data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [tipo, busca, minMora])

  useEffect(() => { cargar() }, [cargar])

  const totalMora = data.reduce((s, r) => s + Number(r.saldo_mora || 0), 0)

  return (
    <div>
      <div className="pg-filtros">
        <select className="pg-input" style={{width:140}} value={tipo} onChange={e=>setTipo(e.target.value)}>
          <option value="POLIZA">Pólizas</option>
          <option value="CONTRATO">Contratos</option>
        </select>
        <select className="pg-input" style={{width:160}} value={minMora} onChange={e=>setMinMora(e.target.value)}>
          <option value={1}>≥ 1 mes mora</option>
          <option value={2}>≥ 2 meses mora</option>
          <option value={3}>≥ 3 meses mora</option>
          <option value={6}>≥ 6 meses mora</option>
        </select>
        <div className="pg-search-wrap">
          <Search size={15}/>
          <input className="pg-input busca" placeholder="Nombre, cédula, N°…" value={busca} onChange={e=>setBusca(e.target.value)}/>
        </div>
        <button className="pg-btn pg-btn-ghost" onClick={cargar}><RefreshCw size={14}/></button>
      </div>

      {data.length > 0 && (
        <div style={{display:'flex',gap:20,marginBottom:14,padding:'12px 16px',background:'#FEF2F2',borderRadius:12,border:'1.5px solid #FECACA'}}>
          <div>
            <div style={{fontSize:11,color:'#9CA3AF'}}>Total morosos</div>
            <div style={{fontSize:20,fontWeight:800,color:'#EF4444'}}>{total}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'#9CA3AF'}}>Cartera en mora</div>
            <div style={{fontSize:20,fontWeight:800,color:'#EF4444'}}>{fmt(totalMora)}</div>
          </div>
        </div>
      )}

      {loading ? <div className="pg-empty">Cargando…</div> : data.length === 0 ? (
        <div style={{textAlign:'center',padding:'48px',color:'#059669'}}>
          <CheckCircle size={40} style={{margin:'0 auto 12px'}}/>
          <div style={{fontWeight:700}}>¡Sin morosos con {minMora}+ mes{minMora!==1?'es':''} de mora!</div>
        </div>
      ) : (
        <div>
          {data.map(m => (
            <div key={m.id} className="pg-moroso-row">
              <div className="pg-moroso-info">
                <div className="pg-moroso-nombre">
                  {m.titular}
                  <span style={{marginLeft:8,fontSize:11,color:'#6B7280',fontWeight:400}}>N°{m.numero}</span>
                </div>
                <div className="pg-moroso-meta">
                  {m.plan} · Cuota: {fmt(m.valor_cuota)} · Día cobro: {m.dia_cobro||'—'} · Tel: {m.telefono||'—'}
                </div>
                <div style={{marginTop:4,fontSize:11,color:'#6B7280'}}>
                  Pago hasta: {fmtFecha(m.pago_hasta)} · {m.cobrador || 'Sin cobrador asignado'}
                </div>
              </div>
              <div className="pg-moroso-actions">
                <MoraBadge meses={Number(m.meses_mora||0)} valor={Number(m.saldo_mora||0)}/>
                <button
                  className="pg-btn pg-btn-success pg-btn-sm"
                  onClick={() => onPagar(m, tipo)}
                >
                  <DollarSign size={13}/>Pagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function PagosPage() {
  useAuthStore()
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('registrar')
  const [modal, setModal] = useState(null) // null | { tipo, poliza }
  const [refreshKey, setRefreshKey] = useState(0)

  const cargarStats = useCallback(async () => {
    try {
      const res = await api.get('/pagos/stats')
      setStats(res.data)
    } catch {}
  }, [])

  useEffect(() => { cargarStats() }, [cargarStats, refreshKey])

  const abrirPago = (tipo = 'POLIZA', poliza = null) => setModal({ tipo, poliza })
  const cerrarModal = () => { setModal(null); setRefreshKey(k=>k+1); cargarStats() }

  return (
    <>
      <style>{CSS}</style>
      <div className="pg">

        {/* Stats */}
        <div className="pg-stats">
          <div className="pg-stat">
            <div className="pg-stat-icon" style={{background:'#ECFDF5'}}>
              <DollarSign size={22} color="#059669"/>
            </div>
            <div>
              <div className="pg-stat-label">Recaudado hoy</div>
              <div className="pg-stat-value">{fmt(stats?.recaudado_hoy)}</div>
            </div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-icon" style={{background:'#EFF6FF'}}>
              <TrendingUp size={22} color="#3B82F6"/>
            </div>
            <div>
              <div className="pg-stat-label">Recaudado este mes</div>
              <div className="pg-stat-value">{fmt(stats?.recaudado_mes)}</div>
              <div className="pg-stat-sub">Meta: {fmt(stats?.total_cartera_mes)}</div>
            </div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-icon" style={{background:'#FEF2F2'}}>
              <AlertTriangle size={22} color="#EF4444"/>
            </div>
            <div>
              <div className="pg-stat-label">Pólizas en mora</div>
              <div className="pg-stat-value" style={{color:'#EF4444'}}>{stats?.polizas_mora || 0}</div>
              <div className="pg-stat-sub">Cartera: {fmt(stats?.valor_mora)}</div>
            </div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-icon" style={{background:'#FFF7ED'}}>
              <Clock size={22} color="#EA580C"/>
            </div>
            <div>
              <div className="pg-stat-label">Próximas a vencer</div>
              <div className="pg-stat-value" style={{color:'#EA580C'}}>{stats?.prox_vencer || 0}</div>
              <div className="pg-stat-sub">En los próximos 30 días</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="pg-tabs">
          <button className={`pg-tab ${tab==='registrar'?'active':''}`} onClick={()=>setTab('registrar')}>
            <DollarSign size={14} style={{display:'inline',marginRight:5}}/>Registrar Pago
          </button>
          <button className={`pg-tab ${tab==='historial'?'active':''}`} onClick={()=>setTab('historial')}>
            <Receipt size={14} style={{display:'inline',marginRight:5}}/>Historial de Recibos
          </button>
          <button className={`pg-tab ${tab==='morosos'?'active':''}`} onClick={()=>setTab('morosos')}>
            <AlertTriangle size={14} style={{display:'inline',marginRight:5}}/>Morosos
            {stats?.polizas_mora > 0 && (
              <span style={{marginLeft:6,background:'#EF4444',color:'#fff',borderRadius:20,padding:'1px 7px',fontSize:11,fontWeight:800}}>{stats.polizas_mora}</span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="pg-body">
          {tab === 'registrar' && (
            <div>
              {/* Acciones rápidas */}
              <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
                <button className="pg-action-card" onClick={() => abrirPago('POLIZA')}>
                  <div className="pg-action-icon" style={{background:'#ECFDF5'}}>
                    <Receipt size={18} color="#059669"/>
                  </div>
                  <div className="pg-action-body">
                    <div className="pg-action-title">Pago de Póliza</div>
                    <div className="pg-action-desc">Cuota mensual de previsión funeraria</div>
                  </div>
                  <ChevronRight size={16} color="#9CA3AF"/>
                </button>
                <button className="pg-action-card" onClick={() => abrirPago('CONTRATO')}>
                  <div className="pg-action-icon" style={{background:'#EFF6FF'}}>
                    <FileText size={18} color="#3B82F6"/>
                  </div>
                  <div className="pg-action-body">
                    <div className="pg-action-title">Pago de Contrato</div>
                    <div className="pg-action-desc">Cuota de contrato de servicio en cuotas</div>
                  </div>
                  <ChevronRight size={16} color="#9CA3AF"/>
                </button>
              </div>

              {/* Morosos destacados */}
              <div style={{fontSize:12,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>
                Clientes con mora — acción requerida
              </div>
              <TabMorosos key={`m${refreshKey}`} onPagar={(p, tipo) => abrirPago(tipo, p)}/>
            </div>
          )}

          {tab === 'historial' && <TabHistorial key={`h${refreshKey}`}/>}

          {tab === 'morosos' && (
            <TabMorosos key={`m2${refreshKey}`} onPagar={(p, tipo) => abrirPago(tipo, p)}/>
          )}
        </div>
      </div>

      {modal && (
        <ModalPago
          tipo={modal.tipo}
          polizaInicial={modal.poliza}
          onClose={cerrarModal}
          onOk={() => setRefreshKey(k=>k+1)}
        />
      )}
    </>
  )
}
