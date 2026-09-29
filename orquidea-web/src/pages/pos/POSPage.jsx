/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : POS — Punto de Venta                                ║
 * ║  Archivo         : POSPage.jsx                                          ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Store, Search, Plus, Minus, Trash2, ShoppingCart, X, Loader2,
  Lock, Unlock, Printer, Receipt, AlertTriangle, CheckCircle2, Package,
  UserPlus, User, History, ShieldCheck, Ban, TrendingUp, Wallet, ChevronRight, ChevronLeft,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { useFormasPago } from '../../hooks/useFormasPago.js'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'
import PhoneInput from '../../components/ui/PhoneInput.jsx'
import { useAuthStore } from '../../store/auth.store.js'
import { imprimirReciboPOS } from '../../utils/recibo.js'
import { archivoUrl } from '../../utils/archivoUrl.js'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-CO', { dateStyle:'medium', timeStyle:'short' }) : '—'

const CSS = `
  @keyframes pos-spin-kf { to { transform:rotate(360deg); } }
  .pos-spin { animation: pos-spin-kf 1s linear infinite; }
  .pos-wrap { display:flex; flex-direction:column; height:100%; }
  .pos-topbar {
    display:flex; align-items:center; gap:16px; padding:14px 20px;
    background:#fff; border-bottom:1px solid #ECEDF8;
  }
  .pos-body { flex:1; display:flex; gap:16px; padding:16px; overflow:hidden; }
  .pos-catalogo { flex:1.6; display:flex; flex-direction:column; min-width:0; }
  .pos-carrito { flex:1; min-width:340px; max-width:420px; display:flex; flex-direction:column;
    background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; overflow:hidden; }
  .pos-search { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #E2E5F0;
    border-radius:12px; padding:10px 14px; margin-bottom:12px; }
  .pos-search input { border:none; outline:none; flex:1; font-size:14px; }
  .pos-cats { display:flex; gap:7px; margin-bottom:12px; flex-wrap:wrap; }
  .pos-cat-pill { border:1.5px solid #E2E5F0; background:#fff; color:#374151; border-radius:20px;
    padding:7px 15px; font-size:12.5px; font-weight:700; cursor:pointer; transition:all .12s; white-space:nowrap; }
  .pos-cat-pill:hover { border-color:#4338CA; color:#4338CA; }
  .pos-cat-pill.active { background:linear-gradient(135deg,#2E3192,#4338CA); border-color:transparent; color:#fff;
    box-shadow:0 3px 10px rgba(46,49,146,.28); }
  .pos-grid { flex:1; min-height:0; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr));
    gap:12px; align-content:start; padding:2px; }
  .pos-prod { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; padding:14px; cursor:pointer;
    transition:all .12s; display:flex; flex-direction:column; gap:6px; }
  .pos-prod:hover { border-color:#4338CA; box-shadow:0 4px 14px rgba(67,56,202,.12); transform:translateY(-1px); }
  .pos-prod-img { width:100%; height:88px; border-radius:10px; background:#F4F5FA; display:flex;
    align-items:center; justify-content:center; overflow:hidden; font-size:30px; }
  .pos-prod-img img { width:100%; height:100%; object-fit:cover; }
  .pos-prod-nombre { font-size:12.5px; font-weight:700; color:#0F1035; line-height:1.3; min-height:32px; }
  .pos-prod-precio { font-size:15px; font-weight:900; color:#4338CA; }
  .pos-prod-stock { font-size:10.5px; color:#9CA3AF; }
  .pos-prod-add { margin-top:2px; border:none; border-radius:9px; padding:8px; font-size:12px; font-weight:800;
    cursor:pointer; background:linear-gradient(135deg,#2E3192,#4338CA); color:#fff;
    display:flex; align-items:center; justify-content:center; gap:5px; transition:all .12s; }
  .pos-prod-add:hover { box-shadow:0 4px 12px rgba(46,49,146,.32); }
  .pos-cart-empty { display:flex; flex-direction:column; align-items:center; justify-content:center;
    text-align:center; color:#9CA3AF; padding:50px 20px; gap:10px; }
  .pos-cart-empty-icon { width:56px; height:56px; border-radius:16px; background:#F4F5FA; display:flex;
    align-items:center; justify-content:center; color:#C7CBE8; }
  .pos-pay-pills { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; margin-bottom:10px; }
  .pos-pay-pill { border:1.5px solid #E2E5F0; background:#fff; color:#374151; border-radius:10px;
    padding:9px 10px; font-size:12.5px; font-weight:700; cursor:pointer; transition:all .12s;
    display:flex; align-items:center; gap:6px; justify-content:center; }
  .pos-pay-pill.active { background:#EEF2FF; border-color:#4338CA; color:#2E3192; box-shadow:0 0 0 1.5px #4338CA inset; }
  .pos-search-hint { font-size:10px; font-weight:700; color:#B8BCD8; background:#F4F5FA; padding:3px 8px;
    border-radius:6px; letter-spacing:.3px; }
  .pos-cart-items { flex:1; min-height:0; overflow-y:auto; padding:12px; }
  .pos-cart-item { display:flex; align-items:center; gap:8px; padding:9px 0; border-bottom:1px solid #F3F4F6; }
  .pos-cart-footer { border-top:1.5px solid #ECEDF8; padding:14px; background:#FAFBFF; }
  .pos-btn { border:none; border-radius:10px; padding:10px 16px; font-size:13px; font-weight:700; cursor:pointer;
    display:flex; align-items:center; gap:7px; justify-content:center; }
  .pos-btn-primary { background:linear-gradient(135deg,#16A34A,#15803D); color:#fff; }
  .pos-btn-primary:disabled { opacity:.5; cursor:not-allowed; }
  .pos-btn-ghost { background:#fff; border:1.5px solid #E2E5F0; color:#374151; }
  .pos-overlay { position:fixed; inset:0; background:rgba(15,16,53,.5); display:flex; align-items:center;
    justify-content:center; z-index:1000; padding:20px; }
  .pos-modal { background:#fff; border-radius:16px; width:100%; max-width:440px; max-height:90vh; overflow-y:auto; }
  .pos-mhead { display:flex; align-items:center; justify-content:space-between; padding:18px 20px;
    border-bottom:1px solid #ECEDF8; }
  .pos-mbody { padding:20px; }
  .pos-field { margin-bottom:14px; }
  .pos-field label { display:block; font-size:12px; font-weight:700; color:#374151; margin-bottom:5px; }
  .pos-field input, .pos-field select { width:100%; padding:9px 12px; border:1.5px solid #E2E5F0;
    border-radius:9px; font-size:13.5px; box-sizing:border-box; }
  @media print {
    body * { visibility:hidden; }
    .pos-recibo, .pos-recibo * { visibility:visible; }
    .pos-recibo { position:absolute; top:0; left:0; width:100%; }
    .pos-no-print { display:none !important; }
  }
`

// ── Pantalla: abrir caja ────────────────────────────────────────────────────
function AbrirCaja({ onAbierta }) {
  const [bodegas, setBodegas] = useState([])
  const [bodegaId, setBodegaId] = useState('')
  const [monto, setMonto] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/pos/bodegas').then(r => {
      const data = r.data?.data || []
      setBodegas(data)
      if (data.length === 1) setBodegaId(data[0].id)
    }).catch(() => {})
  }, [])

  const abrir = async () => {
    setErr('')
    if (!bodegaId) return setErr('Selecciona la bodega de mostrador')
    if (monto === '' || +monto < 0) return setErr('Ingresa el monto de apertura (puede ser 0)')
    setSaving(true)
    try {
      const res = await api.post('/pos/caja/abrir', { bodega_id: bodegaId, monto_apertura: +monto, observaciones: obs })
      toast.success('Caja abierta con éxito')
      onAbierta(res.data.data)
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al abrir la caja'
      setErr(msg); toast.error(msg)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', border:'1.5px solid #ECEDF8', borderRadius:16, padding:32, width:420 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'linear-gradient(135deg,#16A34A,#15803D)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Unlock size={18} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'#0F1035' }}>Abrir caja menor</div>
            <div style={{ fontSize:12, color:'#9CA3AF' }}>Necesitas abrir caja para empezar a vender</div>
          </div>
        </div>

        {err && <div style={{ background:'#FEE2E2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:9,
          padding:'9px 12px', fontSize:12.5, marginTop:14 }}><AlertTriangle size={13} style={{ marginRight:6, verticalAlign:-2 }}/>{err}</div>}

        <div className="pos-field" style={{ marginTop:18 }}>
          <label>Bodega de mostrador <span style={{ color:'#EF4444' }}>*</span></label>
          <select value={bodegaId} onChange={e => setBodegaId(e.target.value)}>
            <option value="">Selecciona una bodega…</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre} — {b.sede_nombre}</option>)}
          </select>
        </div>
        <div className="pos-field">
          <label>Monto de apertura (efectivo en caja) <span style={{ color:'#EF4444' }}>*</span></label>
          <CurrencyInput value={monto} onChange={v => setMonto(v)} placeholder="Ej: 100000"/>
        </div>
        <div className="pos-field" style={{ marginBottom:6 }}>
          <label>Observaciones <span style={{ color:'#9CA3AF', fontWeight:400 }}>(opcional)</span></label>
          <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Notas de apertura…"/>
        </div>

        <button className="pos-btn pos-btn-primary" style={{ width:'100%', marginTop:12, padding:'11px 16px' }}
          onClick={abrir} disabled={saving}>
          {saving ? <Loader2 size={15} className="pos-spin"/> : <Unlock size={15}/>}
          Abrir caja
        </button>
      </div>
    </div>
  )
}

// ── Modal: cerrar caja ──────────────────────────────────────────────────────
function ModalCerrarCaja({ caja, onClose, onCerrada }) {
  const [montoReal, setMontoReal] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const esperado = parseFloat(caja.monto_apertura) + parseFloat(caja.total_efectivo || 0)

  const cerrar = async () => {
    setErr('')
    if (montoReal === '' || +montoReal < 0) return setErr('Ingresa el monto real contado en caja')
    setSaving(true)
    try {
      const res = await api.patch(`/pos/caja/${caja.id}/cerrar`, { monto_cierre_real: +montoReal, observaciones: obs })
      toast.success('Caja cerrada con éxito')
      onCerrada(res.data.data)
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al cerrar la caja'
      setErr(msg); toast.error(msg)
    } finally { setSaving(false) }
  }

  const diferencia = montoReal !== '' ? (+montoReal - esperado) : null

  return (
    <div className="pos-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pos-modal">
        <div className="pos-mhead">
          <div style={{ fontSize:15, fontWeight:800 }}>Cerrar caja</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16}/></button>
        </div>
        <div className="pos-mbody">
          {err && <div style={{ background:'#FEE2E2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:9,
            padding:'9px 12px', fontSize:12.5, marginBottom:14 }}>{err}</div>}

          <div style={{ background:'#F8F9FF', borderRadius:10, padding:14, marginBottom:16, fontSize:13, lineHeight:2 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>Apertura</span><strong>{fmt(caja.monto_apertura)}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>Ventas en efectivo</span><strong>{fmt(caja.total_efectivo)}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between', color:'#16A34A' }}><span>Ventas otros medios</span><strong>{fmt((caja.total_vendido||0) - (caja.total_efectivo||0))}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #E2E5F0', marginTop:6, paddingTop:6 }}>
              <span>Efectivo esperado en caja</span><strong>{fmt(esperado)}</strong>
            </div>
          </div>

          <div className="pos-field">
            <label>Monto real contado en caja <span style={{ color:'#EF4444' }}>*</span></label>
            <CurrencyInput value={montoReal} onChange={v => setMontoReal(v)} placeholder="Ej: 130000"/>
          </div>
          {diferencia !== null && diferencia !== 0 && (
            <div style={{ fontSize:12.5, fontWeight:700, color: diferencia > 0 ? '#059669' : '#DC2626', marginTop:-8, marginBottom:14 }}>
              {diferencia > 0 ? `Sobran ${fmt(diferencia)}` : `Faltan ${fmt(Math.abs(diferencia))}`}
            </div>
          )}
          <div className="pos-field" style={{ marginBottom:6 }}>
            <label>Observaciones de cierre</label>
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Notas del cierre…"/>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button className="pos-btn pos-btn-ghost" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
            <button className="pos-btn pos-btn-primary" style={{ flex:1 }} onClick={cerrar} disabled={saving}>
              {saving ? <Loader2 size={14} className="pos-spin"/> : <Lock size={14}/>}
              Cerrar caja
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Confirmación de venta procesada (imprime en térmica 80mm aparte) ───────
function ModalRecibo({ ventaId, onClose, onNuevaVenta }) {
  const [recibo, setRecibo] = useState(null)

  useEffect(() => {
    api.get(`/pos/ventas/${ventaId}/recibo`).then(r => setRecibo(r.data.data)).catch(() => {})
  }, [ventaId])

  if (!recibo) return null
  const pagoEfectivo = recibo.pagos?.find(p => p.metodo_pago === 'efectivo' && +p.monto_recibido > 0)

  return (
    <div className="pos-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pos-modal" style={{ maxWidth:340, textAlign:'center', padding:'28px 24px' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'#16A34A', display:'flex',
          alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
          <CheckCircle2 size={28} color="#fff" strokeWidth={2.5}/>
        </div>
        <div style={{ fontSize:17, fontWeight:800, color:'#0F1035' }}>Venta procesada</div>
        <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>
          Venta #{recibo.numero} · {recibo.items.length} producto{recibo.items.length !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize:28, fontWeight:900, color:'#4338CA', margin:'12px 0 18px' }}>{fmt(recibo.total)}</div>

        {pagoEfectivo && (
          <div style={{ background:'#F8F9FF', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12.5 }}>
            <div style={{ display:'flex', justifyContent:'space-between', color:'#6B7280' }}>
              <span>Efectivo recibido</span><strong style={{ color:'#0F1035' }}>{fmt(pagoEfectivo.monto_recibido)}</strong>
            </div>
            {+pagoEfectivo.cambio > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ color:'#059669', fontWeight:700 }}>Cambio</span>
                <strong style={{ color:'#059669', fontSize:14 }}>{fmt(pagoEfectivo.cambio)}</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button className="pos-btn pos-btn-ghost" style={{ flex:1 }} onClick={() => imprimirReciboPOS(recibo)}>
            <Printer size={14}/> Imprimir recibo
          </button>
          <button className="pos-btn pos-btn-primary" style={{ flex:1 }} onClick={onNuevaVenta}>
            <ShoppingCart size={14}/> Nueva venta
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: crear cliente rápido (para POS) ─────────────────────────────────
// ── Modal: soporte de pago no-efectivo (referencia + foto/PDF) ────────────
// Un pago que no sea en efectivo (Nequi, transferencia, tarjeta…) debe quedar
// soportado: referencia de texto O comprobante adjunto, cualquiera de los
// dos. Se sube ANTES de crear la venta — el archivo real queda guardado en
// el servidor (no como base64), igual que el resto del sistema.
function ModalSoportePago({ metodoLabel, referenciaInicial, soporteInicial, onConfirmar, onCerrar }) {
  const [ref, setRef] = useState(referenciaInicial || '')
  const [soporteUrl, setSoporteUrl] = useState(soporteInicial || '')
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef(null)

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await api.post('/pos/soporte-pago', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSoporteUrl(res.data.url)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir el comprobante')
    } finally { setSubiendo(false); e.target.value = null }
  }

  const esImagen = /\.(jpe?g|png|webp|gif|bmp|tiff)$/i.test(soporteUrl || '')

  return (
    <div className="pos-overlay" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="pos-modal" style={{ maxWidth:400 }}>
        <div className="pos-mhead">
          <div>
            <div style={{ fontSize:15, fontWeight:800 }}>Soporte de pago</div>
            <div style={{ fontSize:12, color:'#9CA3AF' }}>{metodoLabel}</div>
          </div>
          <button onClick={onCerrar} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16}/></button>
        </div>
        <div className="pos-mbody">
          <div className="pos-field">
            <label>Referencia / N° de aprobación</label>
            <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Ej: número de aprobación, consignación…" autoFocus/>
          </div>

          <div className="pos-field" style={{ marginBottom:6 }}>
            <label>Comprobante (foto o PDF) <span style={{ color:'#9CA3AF', fontWeight:400 }}>(opcional si ya hay referencia)</span></label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff" capture="environment"
              style={{ display:'none' }} onChange={onFile}/>
            <div onClick={() => !subiendo && fileRef.current?.click()}
              style={{ border:`2px dashed ${soporteUrl ? '#059669' : '#E2E5F0'}`, borderRadius:10, padding:'12px',
                cursor: subiendo ? 'default' : 'pointer', background: soporteUrl ? '#F0FDF4' : '#FAFBFF', textAlign:'center' }}>
              {subiendo ? (
                <span style={{ fontSize:12.5, color:'#6B7280' }}>Subiendo…</span>
              ) : soporteUrl ? (
                <>
                  {esImagen && <img src={archivoUrl(soporteUrl)} alt="Comprobante" style={{ maxHeight:140, maxWidth:'100%', objectFit:'contain', marginBottom:6, borderRadius:6 }}/>}
                  <div style={{ fontSize:12, fontWeight:700, color:'#059669' }}>✓ Comprobante adjunto</div>
                  <button onClick={e => { e.stopPropagation(); setSoporteUrl('') }}
                    style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:11.5, marginTop:4 }}>
                    Quitar
                  </button>
                </>
              ) : (
                <span style={{ fontSize:12.5, color:'#6B7280' }}>Toca para adjuntar la foto o el PDF del comprobante…</span>
              )}
            </div>
          </div>

          {!ref.trim() && !soporteUrl && (
            <div style={{ fontSize:11.5, color:'#B45309', marginBottom:10 }}>
              ⚠️ Se recomienda dejar la referencia o el comprobante para poder auditar este pago después.
            </div>
          )}

          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button className="pos-btn pos-btn-ghost" style={{ flex:1 }} onClick={onCerrar}>Cancelar</button>
            <button className="pos-btn pos-btn-primary" style={{ flex:1 }} onClick={() => onConfirmar(ref, soporteUrl)} disabled={subiendo}>
              Confirmar pago
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalClienteRapido({ onClose, onCreado }) {
  const [tiposDoc, setTiposDoc] = useState([])
  const [form, setForm] = useState({ tipo_documento_id: '', numero_documento: '', nombres: '', apellidos: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/tipos-documento/select').then(r => {
      const lista = r.data?.data || []
      setTiposDoc(lista)
      const cc = lista.find(t => t.sigla === 'CC')
      if (cc) setForm(p => ({ ...p, tipo_documento_id: cc.id }))
    }).catch(() => {})
  }, [])

  const crear = async () => {
    setErr('')
    if (!form.tipo_documento_id) return setErr('Selecciona el tipo de documento')
    if (!form.numero_documento.trim()) return setErr('El número de documento es obligatorio')
    if (!form.nombres.trim() || !form.apellidos.trim()) return setErr('Nombres y apellidos son obligatorios')
    setSaving(true)
    try {
      const res = await api.post('/terceros', {
        tipo_documento_id: form.tipo_documento_id,
        numero_documento: form.numero_documento.trim(),
        tipo_persona: 'NATURAL',
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        telefono: form.telefono.trim() || null,
        roles: ['CLIENTE'],
      })
      const t = res.data.data
      toast.success('Cliente creado con éxito')
      onCreado({ id: t.id, nombres: t.nombres, apellidos: t.apellidos, numero_documento: t.numero_documento })
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al crear el cliente'
      setErr(msg); toast.error(msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="pos-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pos-modal" style={{ maxWidth:400 }}>
        <div className="pos-mhead">
          <div style={{ fontSize:15, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}>
            <UserPlus size={17} color="#16A34A"/> Nuevo cliente
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16}/></button>
        </div>
        <div className="pos-mbody">
          {err && <div style={{ background:'#FEE2E2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:9,
            padding:'9px 12px', fontSize:12.5, marginBottom:14 }}>{err}</div>}

          <div style={{ display:'flex', gap:10 }}>
            <div className="pos-field" style={{ width:120 }}>
              <label>Tipo doc. <span style={{ color:'#EF4444' }}>*</span></label>
              <select value={form.tipo_documento_id} onChange={e => setForm(p => ({ ...p, tipo_documento_id: e.target.value }))}>
                <option value="">—</option>
                {tiposDoc.map(t => <option key={t.id} value={t.id}>{t.sigla}</option>)}
              </select>
            </div>
            <div className="pos-field" style={{ flex:1 }}>
              <label>N° documento <span style={{ color:'#EF4444' }}>*</span></label>
              <input value={form.numero_documento} onChange={e => setForm(p => ({ ...p, numero_documento: e.target.value }))} placeholder="Ej: 13456789"/>
            </div>
          </div>
          <div className="pos-field">
            <label>Nombres <span style={{ color:'#EF4444' }}>*</span></label>
            <input value={form.nombres} onChange={e => setForm(p => ({ ...p, nombres: e.target.value }))} placeholder="Nombres…"/>
          </div>
          <div className="pos-field">
            <label>Apellidos <span style={{ color:'#EF4444' }}>*</span></label>
            <input value={form.apellidos} onChange={e => setForm(p => ({ ...p, apellidos: e.target.value }))} placeholder="Apellidos…"/>
          </div>
          <div className="pos-field" style={{ marginBottom:6 }}>
            <label>Teléfono</label>
            <PhoneInput value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="Ej: 3001234567"/>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button className="pos-btn pos-btn-ghost" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
            <button className="pos-btn pos-btn-primary" style={{ flex:1 }} onClick={crear} disabled={saving}>
              {saving ? <Loader2 size={14} className="pos-spin"/> : <UserPlus size={14}/>}
              Crear cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Buscador + creación rápida de cliente ──────────────────────────────────
function ClienteSelector({ clienteId, clienteLabel, onSeleccionar, onLimpiar }) {
  const [busq, setBusq] = useState('')
  const [candidatos, setCandidatos] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [showCrear, setShowCrear] = useState(false)

  useEffect(() => {
    if (busq.length < 2) { setCandidatos([]); return }
    const t = setTimeout(() => {
      api.get(`/terceros/select?q=${encodeURIComponent(busq)}`)
        .then(r => setCandidatos(r.data?.data || []))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [busq])

  if (clienteId) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', border:'1.5px solid #A7F3D0',
        background:'#F0FDF4', borderRadius:8, marginBottom:8 }}>
        <User size={14} color="#059669"/>
        <span style={{ fontSize:12.5, fontWeight:700, color:'#065F46', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {clienteLabel}
        </span>
        <button onClick={onLimpiar} style={{ background:'none', border:'none', cursor:'pointer', color:'#059669' }}><X size={13}/></button>
      </div>
    )
  }

  return (
    <div style={{ position:'relative', marginBottom:8 }}>
      <input value={busq}
        onChange={e => { setBusq(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar cliente por nombre o documento…"
        style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5, boxSizing:'border-box' }}/>
      {abierto && (busq.length >= 2 || true) && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1.5px solid #E2E5F0',
          borderRadius:8, marginTop:4, maxHeight:200, overflowY:'auto', zIndex:20, boxShadow:'0 8px 20px rgba(0,0,0,.08)' }}>
          {candidatos.map(c => (
            <div key={c.id} onClick={() => { onSeleccionar(c); setAbierto(false); setBusq('') }}
              style={{ padding:'8px 10px', cursor:'pointer', fontSize:12.5, borderBottom:'1px solid #F3F4F6' }}
              onMouseEnter={e => e.currentTarget.style.background='#F8F9FF'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
              <div style={{ fontWeight:700, color:'#0F1035' }}>{c.nombres ? `${c.nombres} ${c.apellidos||''}` : c.razon_social}</div>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.numero_documento}</div>
            </div>
          ))}
          {busq.length >= 2 && candidatos.length === 0 && (
            <div style={{ padding:'10px', fontSize:12, color:'#9CA3AF' }}>Sin resultados para "{busq}"</div>
          )}
          <div onClick={() => { setShowCrear(true); setAbierto(false) }}
            style={{ padding:'9px 10px', cursor:'pointer', fontSize:12.5, fontWeight:700, color:'#16A34A',
              display:'flex', alignItems:'center', gap:6, borderTop: candidatos.length ? '1px solid #F3F4F6' : 'none' }}>
            <UserPlus size={13}/> Crear nuevo cliente
          </div>
        </div>
      )}
      {showCrear && (
        <ModalClienteRapido onClose={() => setShowCrear(false)}
          onCreado={(t) => { onSeleccionar(t); setShowCrear(false) }}/>
      )}
    </div>
  )
}

// ── Pantalla principal: vender ──────────────────────────────────────────────
function VentaActiva({ caja, onCajaActualizada, onCerrarCaja, onVerHistorial }) {
  const { formas } = useFormasPago()
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(8)
  const [productos, setProductos] = useState([])
  const [loadingProds, setLoadingProds] = useState(true)
  const [carrito, setCarrito] = useState([]) // [{producto, cantidad}]
  const [clienteId, setClienteId] = useState('')
  const [clienteLabel, setClienteLabel] = useState('')
  // Pago dividido (multi-tender): una o varias líneas [{metodo_pago, monto, referencia, soporte_url}]
  const [pagos, setPagos] = useState([{ metodo_pago: 'efectivo', monto: '', referencia: '', soporte_url: '' }])
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [showSoporteIdx, setShowSoporteIdx] = useState(null) // índice del pago pendiente de soporte
  const [ventaCreada, setVentaCreada] = useState(null)
  const searchRef = useRef(null)

  const cargarCatalogo = useCallback(async () => {
    setLoadingProds(true)
    try {
      const r = await api.get(`/pos/catalogo?bodega_id=${caja.bodega_id}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      setProductos(r.data.data || [])
    } catch { /* noop */ } finally { setLoadingProds(false) }
  }, [caja.bodega_id, q])

  useEffect(() => { const t = setTimeout(cargarCatalogo, 250); return () => clearTimeout(t) }, [cargarCatalogo])

  // Atajo F2: foco inmediato en el buscador — útil para retomar rápido
  // después de cobrar o de usar un lector de código de barras.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const categorias = [...new Set(productos.map(p => p.categoria_nombre).filter(Boolean))]
  const productosFiltrados = categoria ? productos.filter(p => p.categoria_nombre === categoria) : productos
  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / porPagina))
  const paginaSeg = Math.min(pagina, totalPaginas)
  const productosVisibles = productosFiltrados.slice((paginaSeg - 1) * porPagina, paginaSeg * porPagina)

  useEffect(() => { setPagina(1) }, [q, categoria, porPagina])

  // Clave única de línea del carrito: mismo producto en distintas
  // presentaciones (caja / docena / unidad) son líneas separadas.
  const claveLinea = (productoId, presentacionId) => `${productoId}::${presentacionId || 'base'}`

  // Cuántas unidades de esta presentación (o del producto base) caben en el
  // stock disponible — el stock siempre está en unidades base.
  const maxCantidadLinea = (prod, presentacion) =>
    presentacion ? Math.floor(+prod.stock_disponible / +presentacion.factor_conversion) : +prod.stock_disponible

  const [presentacionModal, setPresentacionModal] = useState(null) // producto pendiente de elegir presentación

  const agregarConPresentacion = (prod, presentacion) => {
    const precioEfectivo = presentacion ? +presentacion.precio : +prod.precio_venta
    if (!(precioEfectivo > 0)) {
      return toast.error('Este producto no tiene precio de venta — configúralo en Inventario antes de venderlo.')
    }
    const max = maxCantidadLinea(prod, presentacion)
    if (max < 1) return toast.error('No hay stock disponible para esta presentación')

    setCarrito(prev => {
      const clave = claveLinea(prod.id, presentacion?.id)
      const existe = prev.find(i => claveLinea(i.producto.id, i.presentacion?.id) === clave)
      if (existe) {
        if (existe.cantidad >= max) { toast.error('No hay más stock disponible de este producto'); return prev }
        return prev.map(i => claveLinea(i.producto.id, i.presentacion?.id) === clave ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto: prod, presentacion: presentacion || null, cantidad: 1 }]
    })
  }

  // El precio de venta siempre viene del catálogo (Inventario → costeo y
  // margen) — el cajero nunca lo escribe en el mostrador. Un producto sin
  // precio configurado simplemente no se puede vender hasta que un admin
  // lo fije en Inventario. Si el producto tiene presentaciones (caja,
  // docena, unidad...), primero hay que elegir cuál — se abre un selector
  // en vez de agregar directo.
  const agregar = (prod) => {
    if (prod.presentaciones?.length > 0) { setPresentacionModal(prod); return }
    agregarConPresentacion(prod, null)
  }

  const cambiarCantidad = (producto, presentacion, delta) => {
    setCarrito(prev => prev.map(i => {
      if (claveLinea(i.producto.id, i.presentacion?.id) !== claveLinea(producto.id, presentacion?.id)) return i
      const nueva = i.cantidad + delta
      if (nueva > maxCantidadLinea(producto, presentacion)) { toast.error('No hay más stock disponible'); return i }
      return { ...i, cantidad: nueva }
    }).filter(i => i.cantidad > 0))
  }

  const quitar = (producto, presentacion) =>
    setCarrito(prev => prev.filter(i => claveLinea(i.producto.id, i.presentacion?.id) !== claveLinea(producto.id, presentacion?.id)))

  const precioLinea = (i) => i.presentacion ? +i.presentacion.precio : +i.producto.precio_venta
  const subtotal = carrito.reduce((acc, i) => acc + precioLinea(i) * i.cantidad, 0)
  const total = subtotal

  // Mientras haya una sola línea de pago, se mantiene sincronizada con el
  // total automáticamente — el cajero solo tiene que escribir montos cuando
  // decide dividir el pago entre varios medios.
  useEffect(() => {
    if (pagos.length === 1) {
      setPagos([{ ...pagos[0], monto: total || '' }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const pagado = pagos.reduce((acc, p) => acc + (+p.monto || 0), 0)
  const restante = Math.round((total - pagado) * 100) / 100
  const tienePagoDividido = pagos.length > 1

  const actualizarPago = (idx, campo, valor) => {
    setPagos(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))
  }

  const agregarLineaPago = () => {
    // Autocompleta con lo que falta para cuadrar, para agilizar el reparto
    setPagos(prev => [...prev, { metodo_pago: 'efectivo', monto: restante > 0 ? restante : '', referencia: '', soporte_url: '' }])
  }

  const quitarLineaPago = (idx) => setPagos(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  // Solo tiene sentido calcular "vuelto" cuando hay UNA sola línea y es en efectivo
  const vuelto = (pagos.length === 1 && pagos[0].metodo_pago === 'efectivo' && +efectivoRecibido > 0)
    ? Math.max(0, +efectivoRecibido - total) : null

  const cobrar = async () => {
    if (!carrito.length) return toast.error('Agrega al menos un producto')
    if (Math.abs(restante) > 1) {
      return toast.error(restante > 0
        ? `Falta ${fmt(restante)} por cubrir en los medios de pago`
        : `Los medios de pago suman ${fmt(Math.abs(restante))} de más`)
    }
    // Todo pago no-efectivo necesita referencia O comprobante adjunto — si
    // falta alguno, se abre el modal de soporte para ese pago en vez de
    // dejar pasar la venta sin sustento (igual que un POS real).
    const idxPendiente = pagos.findIndex(p => p.metodo_pago !== 'efectivo' && !p.referencia?.trim() && !p.soporte_url)
    if (idxPendiente !== -1) { setShowSoporteIdx(idxPendiente); return }

    setCobrando(true)
    try {
      const res = await api.post('/pos/ventas', {
        caja_id: caja.id,
        items: carrito.map(i => ({ producto_id: i.producto.id, cantidad: i.cantidad, presentacion_id: i.presentacion?.id || null })),
        pagos: pagos.map((p, i) => ({
          metodo_pago: p.metodo_pago, monto: +p.monto, referencia: p.referencia || null, soporte_url: p.soporte_url || null,
          // El vuelto solo tiene sentido en pago único en efectivo — con pago
          // dividido no hay un campo de "efectivo recibido" por línea todavía.
          monto_recibido: (i === 0 && !tienePagoDividido && p.metodo_pago === 'efectivo' && +efectivoRecibido > 0) ? +efectivoRecibido : null,
        })),
        cliente_id: clienteId || null,
      })
      setVentaCreada(res.data.data.id)
      setCarrito([]); setClienteId(''); setClienteLabel('')
      setPagos([{ metodo_pago: 'efectivo', monto: '', referencia: '', soporte_url: '' }]); setEfectivoRecibido('')
      onCajaActualizada()
      toast.success('Venta registrada con éxito')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar la venta')
    } finally { setCobrando(false) }
  }

  return (
    <div className="pos-wrap">
      <style>{CSS}</style>
      <div className="pos-topbar">
        <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#16A34A,#15803D)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Store size={17} color="#fff"/>
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:'#0F1035' }}>{caja.bodega_nombre} · {caja.sede_nombre}</div>
          <div style={{ fontSize:11.5, color:'#9CA3AF' }}>Caja abierta desde {fmtDateTime(caja.abierta_en)}</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:24 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'#9CA3AF' }}>Ventas hoy</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#0F1035' }}>{caja.total_ventas || 0}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'#9CA3AF' }}>Total vendido</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#16A34A' }}>{fmt(caja.total_vendido)}</div>
          </div>
        </div>
        <button className="pos-btn pos-btn-ghost" onClick={onVerHistorial}><History size={14}/> Historial</button>
        <button className="pos-btn pos-btn-ghost" onClick={onCerrarCaja}><Lock size={14}/> Cerrar caja</button>
      </div>

      <div className="pos-body">
        <div className="pos-catalogo">
          <div className="pos-search">
            <Search size={16} color="#9CA3AF"/>
            <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar o escanear producto por nombre o código…" autoFocus/>
            <span className="pos-search-hint">F2 · ENTER</span>
          </div>

          {categorias.length > 1 && (
            <div className="pos-cats">
              <button className={`pos-cat-pill${!categoria ? ' active' : ''}`} onClick={() => setCategoria('')}>Todos</button>
              {categorias.map(c => (
                <button key={c} className={`pos-cat-pill${categoria === c ? ' active' : ''}`}
                  onClick={() => setCategoria(c)}>{c}</button>
              ))}
            </div>
          )}

          <div className="pos-grid">
            {loadingProds ? (
              <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#9CA3AF', padding:40 }}>Cargando…</div>
            ) : productosVisibles.length === 0 ? (
              <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#9CA3AF', padding:40 }}>
                <Package size={28} style={{ marginBottom:8 }}/><br/>
                Sin productos con stock disponible en esta bodega
              </div>
            ) : productosVisibles.map(p => {
              const sinPrecio = !(+p.precio_venta > 0)
              return (
                <div key={p.id} className="pos-prod" onClick={() => !sinPrecio && agregar(p)}
                  style={sinPrecio ? { opacity: .6, cursor: 'default' } : undefined}>
                  <div className="pos-prod-img">
                    {p.imagen_url
                      ? <img src={archivoUrl(p.imagen_url)} alt={p.nombre}/>
                      : (p.categoria_icono || '📦')}
                  </div>
                  <div className="pos-prod-nombre">{p.nombre}</div>
                  {sinPrecio ? (
                    <div className="pos-prod-precio" style={{ color: '#D97706', fontSize: 11.5 }}>
                      Sin precio configurado
                    </div>
                  ) : p.presentaciones?.length > 0 ? (
                    <div className="pos-prod-precio" style={{ fontSize: 12.5 }}>
                      Desde {fmt(Math.min(+p.precio_venta, ...p.presentaciones.map(pr => +pr.precio)))}
                    </div>
                  ) : (
                    <div className="pos-prod-precio">{fmt(p.precio_venta)}</div>
                  )}
                  <div className="pos-prod-stock" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    Stock: {p.stock_disponible}
                    {p.presentaciones?.length > 0 && (
                      <span style={{ background: '#EEF2FF', color: '#4338CA', fontSize: 9.5, fontWeight: 800,
                        padding: '1px 6px', borderRadius: 8 }}>
                        {p.presentaciones.length + 1} presentaciones
                      </span>
                    )}
                  </div>
                  <button className="pos-prod-add" onClick={e => { e.stopPropagation(); agregar(p) }} disabled={sinPrecio}
                    style={sinPrecio ? { background: '#D1D5DB', cursor: 'not-allowed' } : undefined}>
                    <Plus size={13}/> Agregar
                  </button>
                </div>
              )
            })}
          </div>

          {!loadingProds && productosFiltrados.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 4px 2px', borderTop:'1px solid #ECEDF8', marginTop:8 }}>
              <div style={{ fontSize:12.5, color:'#374151' }}>
                <strong>{(paginaSeg - 1) * porPagina + 1}–{Math.min(paginaSeg * porPagina, productosFiltrados.length)}</strong>{' '}
                de <strong>{productosFiltrados.length}</strong>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button className="pos-btn pos-btn-ghost" style={{ padding:'6px 8px' }}
                  onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaSeg === 1}>
                  <ChevronLeft size={14}/>
                </button>
                <span style={{ fontSize:12, color:'#9CA3AF' }}>{paginaSeg} / {totalPaginas}</span>
                <button className="pos-btn pos-btn-ghost" style={{ padding:'6px 8px' }}
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaSeg === totalPaginas}>
                  <ChevronRight size={14}/>
                </button>
                <select className="select-filter" value={porPagina} onChange={e => setPorPagina(+e.target.value)}
                  style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:9, fontSize:12.5 }}>
                  <option value={8}>8 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={16}>16 por página</option>
                  <option value={24}>24 por página</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="pos-carrito">
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #ECEDF8', display:'flex', alignItems:'center', gap:8 }}>
            <ShoppingCart size={16} color="#4338CA"/>
            <span style={{ fontWeight:800, fontSize:13.5 }}>Venta · Carrito ({carrito.length})</span>
          </div>
          <div className="pos-cart-items">
            {carrito.length === 0 ? (
              <div className="pos-cart-empty">
                <div className="pos-cart-empty-icon"><ShoppingCart size={26}/></div>
                <div style={{ fontWeight:700, color:'#374151', fontSize:13 }}>Carrito vacío</div>
                <div style={{ fontSize:12 }}>Selecciona productos o escanea un código de barras</div>
              </div>
            ) : carrito.map(i => (
              <div key={claveLinea(i.producto.id, i.presentacion?.id)} className="pos-cart-item">
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'#0F1035', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {i.producto.nombre}
                  </div>
                  <div style={{ fontSize:11.5, color:'#9CA3AF' }}>
                    {fmt(precioLinea(i))} {i.presentacion ? `· ${i.presentacion.nombre}` : 'c/u'}
                  </div>
                </div>
                <button onClick={() => cambiarCantidad(i.producto, i.presentacion, -1)}
                  style={{ width:22, height:22, borderRadius:6, border:'1px solid #E2E5F0', background:'#fff', cursor:'pointer' }}>
                  <Minus size={11}/>
                </button>
                <span style={{ fontSize:12.5, fontWeight:700, minWidth:18, textAlign:'center' }}>{i.cantidad}</span>
                <button onClick={() => cambiarCantidad(i.producto, i.presentacion, 1)}
                  style={{ width:22, height:22, borderRadius:6, border:'1px solid #E2E5F0', background:'#fff', cursor:'pointer' }}>
                  <Plus size={11}/>
                </button>
                <div style={{ fontSize:12.5, fontWeight:800, minWidth:70, textAlign:'right' }}>
                  {fmt(precioLinea(i) * i.cantidad)}
                </div>
                <button onClick={() => quitar(i.producto, i.presentacion)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444' }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>

          <div className="pos-cart-footer">
            <ClienteSelector clienteId={clienteId} clienteLabel={clienteLabel}
              onSeleccionar={(t) => { setClienteId(t.id); setClienteLabel(`${t.nombres} ${t.apellidos || ''}`.trim() + (t.numero_documento ? ` · ${t.numero_documento}` : '')) }}
              onLimpiar={() => { setClienteId(''); setClienteLabel('') }}/>

            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, color:'#9CA3AF', marginBottom:4 }}>
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:19, fontWeight:900, marginBottom:12,
              paddingTop:8, borderTop:'1.5px dashed #ECEDF8' }}>
              <span>TOTAL</span><span style={{ color:'#2E3192' }}>{fmt(total)}</span>
            </div>

            <div style={{ fontSize:11.5, fontWeight:700, color:'#6B7280', marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>FORMA DE PAGO</span>
              {restante > 1 && (
                <button onClick={agregarLineaPago} style={{ background:'none', border:'none', color:'#4338CA', cursor:'pointer',
                  fontSize:11.5, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                  <Plus size={11}/> Dividir pago
                </button>
              )}
            </div>

            {!tienePagoDividido ? (
              <div className="pos-pay-pills">
                {formas.map(f => (
                  <button key={f.codigo}
                    className={`pos-pay-pill${pagos[0].metodo_pago === f.codigo ? ' active' : ''}`}
                    onClick={() => actualizarPago(0, 'metodo_pago', f.codigo)}>
                    {f.icono_url ? <img src={f.icono_url} alt="" style={{ width:16, height:16, objectFit:'contain' }}/> : <span>{f.icono}</span>} {f.nombre}
                  </button>
                ))}
              </div>
            ) : pagos.map((p, idx) => {
              const noEfectivo = p.metodo_pago !== 'efectivo'
              const soportado = !!(p.referencia?.trim() || p.soporte_url)
              return (
                <div key={idx} style={{ marginBottom:6 }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <select value={p.metodo_pago}
                      onChange={e => actualizarPago(idx, 'metodo_pago', e.target.value)}
                      style={{ flex:1.3, padding:'7px 8px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12 }}>
                      {formas.map(f => <option key={f.codigo} value={f.codigo}>{f.icono} {f.nombre}</option>)}
                    </select>
                    <CurrencyInput value={p.monto}
                      onChange={v => actualizarPago(idx, 'monto', v)}
                      placeholder="Monto" ayuda={false}
                      style={{ width:90 }}/>
                    {noEfectivo && (
                      <button onClick={() => setShowSoporteIdx(idx)} title={soportado ? 'Soporte adjunto ✓' : 'Adjuntar soporte'}
                        style={{ width:30, borderRadius:8, border:`1.5px solid ${soportado ? '#A7F3D0' : '#E2E5F0'}`,
                          background: soportado ? '#F0FDF4' : '#fff', cursor:'pointer',
                          color: soportado ? '#059669' : '#9CA3AF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {soportado ? <CheckCircle2 size={14}/> : <Receipt size={14}/>}
                      </button>
                    )}
                    <button onClick={() => quitarLineaPago(idx)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              )
            })}

            {showSoporteIdx !== null && (
              <ModalSoportePago
                metodoLabel={formas.find(f => f.codigo === pagos[showSoporteIdx].metodo_pago)?.nombre || pagos[showSoporteIdx].metodo_pago}
                referenciaInicial={pagos[showSoporteIdx].referencia}
                soporteInicial={pagos[showSoporteIdx].soporte_url}
                onCerrar={() => setShowSoporteIdx(null)}
                onConfirmar={(ref, soporteUrl) => {
                  actualizarPago(showSoporteIdx, 'referencia', ref)
                  actualizarPago(showSoporteIdx, 'soporte_url', soporteUrl)
                  setShowSoporteIdx(null)
                }}/>
            )}

            {tienePagoDividido && (
              <div style={{ fontSize:11.5, fontWeight:700, textAlign:'right', marginBottom:8,
                color: Math.abs(restante) <= 1 ? '#16A34A' : '#DC2626' }}>
                {Math.abs(restante) <= 1 ? '✓ Pagos cuadran con el total' : restante > 0 ? `Falta ${fmt(restante)}` : `Sobran ${fmt(Math.abs(restante))}`}
              </div>
            )}

            {!tienePagoDividido && pagos[0].metodo_pago === 'efectivo' && (
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <input type="number" min="0" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)}
                    placeholder="Efectivo recibido (opcional)…"
                    style={{ flex:1, padding:'7px 8px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12 }}/>
                  {vuelto !== null && (
                    <div style={{ fontSize:12, fontWeight:800, color:'#16A34A', whiteSpace:'nowrap' }}>Vuelto: {fmt(vuelto)}</div>
                  )}
                </div>
                {/* Billetes rápidos — igual que un POS de almacén: un tap suma la
                    denominación en vez de escribirla a mano */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {[2000, 5000, 10000, 20000, 50000, 100000].map(billete => (
                    <button key={billete} type="button"
                      onClick={() => setEfectivoRecibido(String((+efectivoRecibido || 0) + billete))}
                      style={{ padding:'4px 9px', border:'1.5px solid #E2E5F0', borderRadius:7,
                        background:'#FAFBFF', color:'#374151', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      +{fmt(billete).replace('$', '').trim()}
                    </button>
                  ))}
                  <button type="button" onClick={() => setEfectivoRecibido(String(total))}
                    style={{ padding:'4px 9px', border:'1.5px solid #BBF7D0', borderRadius:7,
                      background:'#F0FDF4', color:'#059669', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    Exacto
                  </button>
                  <button type="button" onClick={() => setEfectivoRecibido('')}
                    style={{ padding:'4px 9px', border:'1.5px solid #FECACA', borderRadius:7,
                      background:'#FEF2F2', color:'#DC2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    Limpiar
                  </button>
                </div>
              </div>
            )}

            <button className="pos-btn pos-btn-primary" style={{ width:'100%', padding:'12px 16px', fontSize:14 }}
              onClick={cobrar} disabled={cobrando || !carrito.length || Math.abs(restante) > 1}>
              {cobrando ? <Loader2 size={16} className="pos-spin"/> : <Receipt size={16}/>}
              Cobrar {fmt(total)}
            </button>
          </div>
        </div>
      </div>

      {ventaCreada && (
        <ModalRecibo ventaId={ventaCreada} onClose={() => setVentaCreada(null)}
          onNuevaVenta={() => { setVentaCreada(null); searchRef.current?.focus() }}/>
      )}

      {presentacionModal && (
        <ModalPresentacion producto={presentacionModal} onClose={() => setPresentacionModal(null)}
          onElegir={(presentacion) => { agregarConPresentacion(presentacionModal, presentacion); setPresentacionModal(null) }}/>
      )}
    </div>
  )
}

// ── Elegir presentación (caja, docena, unidad...) al agregar al carrito ───
function ModalPresentacion({ producto, onClose, onElegir }) {
  const opciones = [
    ...(+producto.precio_venta > 0 ? [{ id: null, nombre: `Por ${producto.unidad_medida || 'unidad'}`, precio: producto.precio_venta, factor_conversion: 1 }] : []),
    ...producto.presentaciones,
  ]
  return (
    <div className="pos-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal" style={{ maxWidth: 380 }}>
        <div className="pos-mhead">
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F1035' }}>{producto.nombre}</div>
            <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>Elige la presentación de venta</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={17}/></button>
        </div>
        <div className="pos-mbody" style={{ display: 'grid', gap: 8 }}>
          {opciones.map((op, idx) => {
            const max = op.id ? Math.floor(+producto.stock_disponible / +op.factor_conversion) : +producto.stock_disponible
            return (
              <button key={op.id || 'base'} disabled={max < 1}
                onClick={() => onElegir(op.id ? op : null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', border: '1.5px solid #E2E5F0', borderRadius: 12,
                  background: max < 1 ? '#F9FAFB' : '#fff', cursor: max < 1 ? 'not-allowed' : 'pointer',
                  opacity: max < 1 ? .5 : 1, textAlign: 'left',
                }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F1035' }}>{op.nombre}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {op.id ? `${op.factor_conversion} ${producto.unidad_medida || 'unidades'} · ` : ''}
                    {max < 1 ? 'Sin stock' : `Disponible: ${max}`}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#2E3192' }}>{fmt(op.precio)}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Auditoría completa de una caja (apertura → ventas → cierre) ───────────
// Reporte pensado para blindar cualquier reclamo: desglose por forma de
// pago, cada venta (incluidas las anuladas, nunca ocultas), top productos y
// el arqueo final con la diferencia exacta.
function ReporteAuditoriaCaja({ cajaId, onCerrar }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/pos/cajas/${cajaId}/auditoria`)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('No se pudo cargar la auditoría de la caja'))
      .finally(() => setLoading(false))
  }, [cajaId])

  if (loading || !data) {
    return (
      <div className="pos-overlay">
        <div className="pos-modal" style={{ maxWidth:400, padding:40, textAlign:'center' }}>
          <Loader2 size={22} className="pos-spin" style={{ color:'#16A34A' }}/>
        </div>
      </div>
    )
  }

  const { caja, resumen, por_metodo_pago, ventas, top_productos, arqueo } = data
  const abierta = caja.estado === 'ABIERTA'

  return (
    <div className="pos-overlay" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="pos-modal" style={{ maxWidth:820 }}>
        <div className="pos-recibo" style={{ padding:'22px 26px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:10, background: abierta ? '#FEF3C7' : '#D1FAE5',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ShieldCheck size={18} color={abierta ? '#B45309' : '#059669'}/>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:'#0F1035' }}>Auditoría de caja</div>
                <div style={{ fontSize:12, color:'#9CA3AF' }}>
                  {caja.bodega_nombre} · {caja.sede_nombre} · Cajero: {caja.cajero_nombre}
                  {abierta && <span style={{ color:'#B45309', fontWeight:700 }}> · AÚN ABIERTA</span>}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }} className="pos-no-print">
              <button className="pos-btn pos-btn-ghost" onClick={() => window.print()}><Printer size={13}/> Imprimir</button>
              <button onClick={onCerrar} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
            </div>
          </div>

          <div style={{ display:'flex', gap:14, fontSize:12, color:'#374151', marginBottom:16, flexWrap:'wrap' }}>
            <div><strong>Apertura:</strong> {fmtDateTime(caja.abierta_en)}</div>
            <div><strong>Cierre:</strong> {abierta ? '— (turno en curso)' : fmtDateTime(caja.cerrada_en)}</div>
          </div>

          {/* Resumen numérico */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:18 }}>
            {[
              { label:'Ventas válidas', value: resumen.total_ventas, color:'#16A34A', Icon: TrendingUp },
              { label:'Total vendido', value: fmt(resumen.total_vendido), color:'#16A34A', Icon: Wallet },
              { label:'Ventas anuladas', value: resumen.ventas_anuladas, color: resumen.ventas_anuladas ? '#DC2626' : '#9CA3AF', Icon: Ban },
              { label:'Valor anulado', value: fmt(resumen.valor_anulado), color: resumen.valor_anulado ? '#DC2626' : '#9CA3AF', Icon: Ban },
            ].map((k, i) => (
              <div key={i} style={{ border:'1.5px solid #ECEDF8', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10.5, color:'#9CA3AF', fontWeight:700, marginBottom:4 }}>
                  <k.Icon size={11}/> {k.label.toUpperCase()}
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Desglose por forma de pago */}
          <div style={{ fontSize:12.5, fontWeight:800, color:'#0F1035', marginBottom:8 }}>Desglose por forma de pago</div>
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:18, fontSize:12.5 }}>
            <thead>
              <tr style={{ background:'#F8F9FF', textAlign:'left' }}>
                <th style={{ padding:'7px 10px' }}>Forma de pago</th>
                <th style={{ padding:'7px 10px', textAlign:'center' }}>N° pagos</th>
                <th style={{ padding:'7px 10px', textAlign:'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {por_metodo_pago.length === 0 ? (
                <tr><td colSpan={3} style={{ padding:10, color:'#9CA3AF', textAlign:'center' }}>Sin pagos registrados</td></tr>
              ) : por_metodo_pago.map((m, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #F3F4F6' }}>
                  <td style={{ padding:'7px 10px', textTransform:'capitalize' }}>{m.metodo_pago}</td>
                  <td style={{ padding:'7px 10px', textAlign:'center' }}>{m.cantidad_pagos}</td>
                  <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700 }}>{fmt(m.total)}</td>
                </tr>
              ))}
            </tbody>
            {por_metodo_pago.length > 0 && (
              <tfoot>
                <tr style={{ borderTop:'2px solid #E2E5F0', fontWeight:800 }}>
                  <td style={{ padding:'7px 10px' }} colSpan={2}>Total</td>
                  <td style={{ padding:'7px 10px', textAlign:'right' }}>{fmt(por_metodo_pago.reduce((a,m)=>a+m.total,0))}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {/* Arqueo de caja */}
          <div style={{ fontSize:12.5, fontWeight:800, color:'#0F1035', marginBottom:8 }}>Arqueo de caja (efectivo)</div>
          <div style={{ background:'#F8F9FF', borderRadius:10, padding:14, marginBottom:18, fontSize:12.5, lineHeight:2 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>Monto de apertura</span><strong>{fmt(arqueo.monto_apertura)}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>Ventas en efectivo</span><strong>{fmt(arqueo.total_efectivo_ventas)}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #E2E5F0', paddingTop:4, marginTop:2 }}>
              <span>Efectivo esperado</span><strong>{fmt(arqueo.esperado)}</strong>
            </div>
            {!abierta && (
              <>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span>Efectivo contado (real)</span><strong>{fmt(arqueo.monto_cierre_real)}</strong></div>
                <div style={{ display:'flex', justifyContent:'space-between', color: arqueo.diferencia === 0 ? '#16A34A' : arqueo.diferencia > 0 ? '#059669' : '#DC2626', fontWeight:800 }}>
                  <span>{arqueo.diferencia === 0 ? '✓ Cuadra exacto' : arqueo.diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
                  <span>{arqueo.diferencia !== 0 ? fmt(Math.abs(arqueo.diferencia)) : ''}</span>
                </div>
              </>
            )}
          </div>

          {/* Top productos */}
          {top_productos.length > 0 && (
            <>
              <div style={{ fontSize:12.5, fontWeight:800, color:'#0F1035', marginBottom:8 }}>Productos más vendidos</div>
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:18, fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:'#F8F9FF', textAlign:'left' }}>
                    <th style={{ padding:'7px 10px' }}>Producto</th>
                    <th style={{ padding:'7px 10px', textAlign:'center' }}>Cant.</th>
                    <th style={{ padding:'7px 10px', textAlign:'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {top_productos.map((p, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #F3F4F6' }}>
                      <td style={{ padding:'7px 10px' }}>{p.nombre}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center' }}>{p.cantidad_vendida}</td>
                      <td style={{ padding:'7px 10px', textAlign:'right' }}>{fmt(p.total_vendido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Detalle de ventas */}
          <div style={{ fontSize:12.5, fontWeight:800, color:'#0F1035', marginBottom:8 }}>Detalle de ventas ({ventas.length})</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#F8F9FF', textAlign:'left' }}>
                <th style={{ padding:'6px 8px' }}>N°</th>
                <th style={{ padding:'6px 8px' }}>Hora</th>
                <th style={{ padding:'6px 8px' }}>Cliente</th>
                <th style={{ padding:'6px 8px' }}>Pago</th>
                <th style={{ padding:'6px 8px', textAlign:'center' }}>Items</th>
                <th style={{ padding:'6px 8px', textAlign:'right' }}>Total</th>
                <th style={{ padding:'6px 8px', textAlign:'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id} style={{ borderBottom:'1px solid #F3F4F6', opacity: v.anulada ? .55 : 1 }}>
                  <td style={{ padding:'6px 8px', fontWeight:700 }}>POS-{v.numero}</td>
                  <td style={{ padding:'6px 8px' }}>{new Date(v.creado_en).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}</td>
                  <td style={{ padding:'6px 8px' }}>{v.cliente_registrado_nombre || v.cliente_nombre || 'Consumidor final'}</td>
                  <td style={{ padding:'6px 8px', textTransform:'capitalize' }}>
                    {v.metodo_pago}
                    {(v.pagos || []).some(p => p.soporte_url) && (
                      <a href={archivoUrl((v.pagos.find(p => p.soporte_url)||{}).soporte_url)} target="_blank" rel="noreferrer"
                        style={{ marginLeft:5, color:'#6366F1' }}>[ver]</a>
                    )}
                  </td>
                  <td style={{ padding:'6px 8px', textAlign:'center' }}>{v.total_items}</td>
                  <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, textDecoration: v.anulada ? 'line-through' : 'none' }}>{fmt(v.total)}</td>
                  <td style={{ padding:'6px 8px', textAlign:'center' }}>
                    {v.anulada
                      ? <span style={{ color:'#DC2626', fontWeight:700, fontSize:11 }}>ANULADA</span>
                      : <span style={{ color:'#16A34A', fontWeight:700, fontSize:11 }}>✓ Válida</span>}
                  </td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr><td colSpan={7} style={{ padding:14, textAlign:'center', color:'#9CA3AF' }}>Sin ventas registradas en esta caja</td></tr>
              )}
            </tbody>
          </table>
          {ventas.some(v => v.anulada) && (
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:10 }}>
              * Las ventas anuladas se muestran para trazabilidad completa, pero no suman al total vendido ni al arqueo.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Historial de cajas (turnos abiertos/cerrados) ──────────────────────────
function HistorialCajas({ onVerAuditoria, onVolver }) {
  const [cajas, setCajas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/pos/cajas').then(r => setCajas(r.data.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={onVolver} className="pos-btn pos-btn-ghost"><ChevronRight size={14} style={{ transform:'rotate(180deg)' }}/> Volver a vender</button>
        <div style={{ fontSize:16, fontWeight:800, color:'#0F1035', marginLeft:8 }}>Historial de cajas</div>
      </div>

      {loading ? (
        <div style={{ color:'#9CA3AF', textAlign:'center', padding:40 }}>Cargando…</div>
      ) : cajas.length === 0 ? (
        <div style={{ color:'#9CA3AF', textAlign:'center', padding:40 }}>Aún no hay turnos de caja registrados</div>
      ) : (
        <div style={{ background:'#fff', border:'1.5px solid #ECEDF8', borderRadius:14, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
            <thead>
              <tr style={{ background:'#F8F9FF', textAlign:'left' }}>
                <th style={{ padding:'10px 14px' }}>Cajero</th>
                <th style={{ padding:'10px 14px' }}>Bodega / Sede</th>
                <th style={{ padding:'10px 14px' }}>Apertura</th>
                <th style={{ padding:'10px 14px' }}>Cierre</th>
                <th style={{ padding:'10px 14px', textAlign:'center' }}>Ventas</th>
                <th style={{ padding:'10px 14px', textAlign:'right' }}>Vendido</th>
                <th style={{ padding:'10px 14px', textAlign:'center' }}>Diferencia</th>
                <th style={{ padding:'10px 14px', textAlign:'center' }}>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cajas.map(c => (
                <tr key={c.id} onClick={() => onVerAuditoria(c.id)}
                  style={{ borderBottom:'1px solid #F3F4F6', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAFBFF'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <td style={{ padding:'9px 14px', fontWeight:700 }}>{c.cajero_nombre}</td>
                  <td style={{ padding:'9px 14px' }}>{c.bodega_nombre} · {c.sede_nombre}</td>
                  <td style={{ padding:'9px 14px' }}>{fmtDateTime(c.abierta_en)}</td>
                  <td style={{ padding:'9px 14px' }}>{c.cerrada_en ? fmtDateTime(c.cerrada_en) : '—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'center' }}>
                    {c.total_ventas}{+c.ventas_anuladas > 0 && <span style={{ color:'#DC2626' }}> ({c.ventas_anuladas} anul.)</span>}
                  </td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700 }}>{fmt(c.total_vendido)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'center' }}>
                    {c.diferencia == null ? '—' : (
                      <span style={{ color: +c.diferencia === 0 ? '#16A34A' : '#DC2626', fontWeight:700 }}>
                        {+c.diferencia === 0 ? '✓' : fmt(Math.abs(c.diferencia))}
                      </span>
                    )}
                  </td>
                  <td style={{ padding:'9px 14px', textAlign:'center' }}>
                    <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 8px', borderRadius:20,
                      background: c.estado === 'ABIERTA' ? '#FEF3C7' : '#D1FAE5',
                      color: c.estado === 'ABIERTA' ? '#B45309' : '#059669' }}>
                      {c.estado}
                    </span>
                  </td>
                  <td style={{ padding:'9px 14px' }}><ChevronRight size={14} color="#9CA3AF"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function POSPage() {
  const [caja, setCaja] = useState(undefined) // undefined=cargando, null=sin caja, obj=abierta
  const [showCerrar, setShowCerrar] = useState(false)
  const [vista, setVista] = useState('pos') // 'pos' | 'historial'
  const [auditoriaId, setAuditoriaId] = useState(null) // caja_id a mostrar en el reporte

  const cargarCaja = useCallback(() => {
    api.get('/pos/caja-actual').then(r => setCaja(r.data.data)).catch(() => setCaja(null))
  }, [])

  useEffect(() => { cargarCaja() }, [cargarCaja])

  if (caja === undefined) {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#9CA3AF' }}>Cargando…</div>
  }

  return (
    <div style={{ height:'100%' }}>
      <style>{CSS}</style>

      {vista === 'historial' ? (
        <HistorialCajas onVerAuditoria={setAuditoriaId} onVolver={() => setVista('pos')}/>
      ) : !caja ? (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', padding:'14px 20px 0' }}>
            <button className="pos-btn pos-btn-ghost" onClick={() => setVista('historial')}>
              <History size={14}/> Historial de caja
            </button>
          </div>
          <AbrirCaja onAbierta={cargarCaja}/>
        </>
      ) : (
        <VentaActiva caja={caja} onCajaActualizada={cargarCaja} onCerrarCaja={() => setShowCerrar(true)}
          onVerHistorial={() => setVista('historial')}/>
      )}

      {showCerrar && caja && (
        <ModalCerrarCaja caja={caja} onClose={() => setShowCerrar(false)}
          onCerrada={(cajaCerrada) => { setShowCerrar(false); setCaja(null); setAuditoriaId(cajaCerrada.id) }}/>
      )}

      {auditoriaId && (
        <ReporteAuditoriaCaja cajaId={auditoriaId} onCerrar={() => setAuditoriaId(null)}/>
      )}
    </div>
  )
}
