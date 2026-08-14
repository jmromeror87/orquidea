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
  UserPlus, User, History, ShieldCheck, Ban, TrendingUp, Wallet, ChevronRight,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { useFormasPago } from '../../hooks/useFormasPago.js'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'
import PhoneInput from '../../components/ui/PhoneInput.jsx'
import { useAuthStore } from '../../store/auth.store.js'

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
  .pos-grid { flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
    gap:10px; align-content:start; padding:2px; }
  .pos-prod { background:#fff; border:1.5px solid #ECEDF8; border-radius:12px; padding:12px; cursor:pointer;
    transition:all .12s; display:flex; flex-direction:column; gap:4px; }
  .pos-prod:hover { border-color:#16A34A; box-shadow:0 4px 14px rgba(22,163,74,.12); transform:translateY(-1px); }
  .pos-prod-nombre { font-size:12.5px; font-weight:700; color:#0F1035; line-height:1.3; }
  .pos-prod-precio { font-size:14px; font-weight:800; color:#16A34A; }
  .pos-prod-stock { font-size:10.5px; color:#9CA3AF; }
  .pos-cart-items { flex:1; overflow-y:auto; padding:12px; }
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

// ── Recibo imprimible ───────────────────────────────────────────────────────
function ModalRecibo({ ventaId, onClose, onNuevaVenta }) {
  const [recibo, setRecibo] = useState(null)

  useEffect(() => {
    api.get(`/pos/ventas/${ventaId}/recibo`).then(r => setRecibo(r.data.data)).catch(() => {})
  }, [ventaId])

  if (!recibo) return null

  return (
    <div className="pos-overlay">
      <div className="pos-modal" style={{ maxWidth:380 }}>
        <div className="pos-recibo" style={{ padding:24, fontFamily:'monospace', fontSize:12.5 }}>
          <div style={{ textAlign:'center', marginBottom:10 }}>
            <div style={{ fontWeight:800, fontSize:14 }}>{recibo.empresa_razon_social}</div>
            <div>NIT {recibo.empresa_nit}</div>
            <div>{recibo.empresa_direccion}</div>
            <div>{recibo.empresa_telefono}</div>
          </div>
          <div style={{ borderTop:'1px dashed #999', borderBottom:'1px dashed #999', padding:'8px 0', margin:'8px 0' }}>
            <div>Recibo N° POS-{recibo.numero}</div>
            <div>{fmtDateTime(recibo.creado_en)}</div>
            <div>Sede: {recibo.sede_nombre} · {recibo.bodega_nombre}</div>
            <div>Cajero: {recibo.cajero_nombre}</div>
            <div>Cliente: {recibo.cliente_registrado_nombre || recibo.cliente_nombre || 'Consumidor final'}</div>
          </div>
          {recibo.items.map(it => (
            <div key={it.id} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span>{it.cantidad}x {it.producto_nombre}</span>
              <span>{fmt(it.subtotal)}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px dashed #999', marginTop:8, paddingTop:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:14 }}><span>TOTAL</span><span>{fmt(recibo.total)}</span></div>
          </div>
          <div style={{ borderTop:'1px dashed #999', marginTop:8, paddingTop:8 }}>
            <div style={{ fontWeight:700, marginBottom:2 }}>Pago{recibo.pagos?.length > 1 ? ' dividido' : ''}:</div>
            {(recibo.pagos || []).map((p, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between' }}>
                <span>
                  {p.metodo_pago}{p.referencia ? ` (${p.referencia})` : ''}
                  {p.soporte_url && (
                    <a href={`http://localhost:3001${p.soporte_url}`} target="_blank" rel="noreferrer" style={{ marginLeft:6, color:'#6366F1' }}>
                      [ver]
                    </a>
                  )}
                </span>
                <span>{fmt(p.monto)}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:14, fontSize:11 }}>¡Gracias por su compra!</div>
        </div>
        <div style={{ display:'flex', gap:10, padding:'0 20px 20px' }}>
          <button className="pos-btn pos-btn-ghost" style={{ flex:1 }} onClick={onClose}>Cerrar</button>
          <button className="pos-btn pos-btn-ghost" style={{ flex:1 }} onClick={() => window.print()}>
            <Printer size={14}/> Imprimir
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
                  {esImagen && <img src={`http://localhost:3001${soporteUrl}`} alt="Comprobante" style={{ maxHeight:140, maxWidth:'100%', objectFit:'contain', marginBottom:6, borderRadius:6 }}/>}
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
  const usuario = useAuthStore(s => s.usuario)
  const puedeFijarPrecio = ['superadmin', 'administrador'].includes(usuario?.rol)
  const [q, setQ] = useState('')
  const [productos, setProductos] = useState([])
  const [loadingProds, setLoadingProds] = useState(true)
  const [carrito, setCarrito] = useState([]) // [{producto, cantidad, precio_unit_nuevo}]
  const [fijarPrecioProd, setFijarPrecioProd] = useState(null) // producto pendiente de precio
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

  const agregar = (prod) => {
    if (!(+prod.precio_venta > 0)) {
      if (!puedeFijarPrecio) return toast.error('Este producto no tiene precio — pide a un administrador que lo fije.')
      setFijarPrecioProd(prod)
      return
    }
    agregarAlCarrito(prod)
  }

  const agregarAlCarrito = (prod, precioNuevo) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.id === prod.id)
      if (existe) {
        if (existe.cantidad >= +prod.stock_disponible) { toast.error('No hay más stock disponible de este producto'); return prev }
        return prev.map(i => i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      const producto = precioNuevo ? { ...prod, precio_venta: precioNuevo } : prod
      return [...prev, { producto, cantidad: 1, precio_unit_nuevo: precioNuevo || undefined }]
    })
  }

  const confirmarPrecioNuevo = (precio) => {
    if (!(+precio > 0)) return toast.error('Ingresa un precio válido')
    agregarAlCarrito(fijarPrecioProd, +precio)
    setFijarPrecioProd(null)
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev.map(i => {
      if (i.producto.id !== id) return i
      const nueva = i.cantidad + delta
      if (nueva > +i.producto.stock_disponible) { toast.error('No hay más stock disponible'); return i }
      return { ...i, cantidad: nueva }
    }).filter(i => i.cantidad > 0))
  }

  const quitar = (id) => setCarrito(prev => prev.filter(i => i.producto.id !== id))

  const subtotal = carrito.reduce((acc, i) => acc + (+i.producto.precio_venta * i.cantidad), 0)
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
        items: carrito.map(i => ({ producto_id: i.producto.id, cantidad: i.cantidad, precio_unit_nuevo: i.precio_unit_nuevo })),
        pagos: pagos.map(p => ({ metodo_pago: p.metodo_pago, monto: +p.monto, referencia: p.referencia || null, soporte_url: p.soporte_url || null })),
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
              placeholder="Buscar producto por nombre o código…" autoFocus/>
          </div>
          <div className="pos-grid">
            {loadingProds ? (
              <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#9CA3AF', padding:40 }}>Cargando…</div>
            ) : productos.length === 0 ? (
              <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#9CA3AF', padding:40 }}>
                <Package size={28} style={{ marginBottom:8 }}/><br/>
                Sin productos con stock disponible en esta bodega
              </div>
            ) : productos.map(p => {
              const sinPrecio = !(+p.precio_venta > 0)
              return (
                <div key={p.id} className="pos-prod" onClick={() => agregar(p)}
                  style={sinPrecio ? { opacity:.75 } : undefined}>
                  <div style={{ fontSize:18 }}>{p.categoria_icono || '📦'}</div>
                  <div className="pos-prod-nombre">{p.nombre}</div>
                  {sinPrecio ? (
                    <div className="pos-prod-precio" style={{ color:'#D97706', fontSize:11.5 }}>
                      {puedeFijarPrecio ? 'Sin precio — click para fijar' : 'Sin precio'}
                    </div>
                  ) : (
                    <div className="pos-prod-precio">{fmt(p.precio_venta)}</div>
                  )}
                  <div className="pos-prod-stock">Stock: {p.stock_disponible}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="pos-carrito">
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #ECEDF8', display:'flex', alignItems:'center', gap:8 }}>
            <ShoppingCart size={16} color="#16A34A"/>
            <span style={{ fontWeight:800, fontSize:13.5 }}>Carrito ({carrito.length})</span>
          </div>
          <div className="pos-cart-items">
            {carrito.length === 0 ? (
              <div style={{ textAlign:'center', color:'#9CA3AF', fontSize:12.5, padding:30 }}>
                Haz clic en un producto para agregarlo
              </div>
            ) : carrito.map(i => (
              <div key={i.producto.id} className="pos-cart-item">
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'#0F1035', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {i.producto.nombre}
                  </div>
                  <div style={{ fontSize:11.5, color:'#9CA3AF' }}>{fmt(i.producto.precio_venta)} c/u</div>
                </div>
                <button onClick={() => cambiarCantidad(i.producto.id, -1)}
                  style={{ width:22, height:22, borderRadius:6, border:'1px solid #E2E5F0', background:'#fff', cursor:'pointer' }}>
                  <Minus size={11}/>
                </button>
                <span style={{ fontSize:12.5, fontWeight:700, minWidth:18, textAlign:'center' }}>{i.cantidad}</span>
                <button onClick={() => cambiarCantidad(i.producto.id, 1)}
                  style={{ width:22, height:22, borderRadius:6, border:'1px solid #E2E5F0', background:'#fff', cursor:'pointer' }}>
                  <Plus size={11}/>
                </button>
                <div style={{ fontSize:12.5, fontWeight:800, minWidth:70, textAlign:'right' }}>
                  {fmt(i.producto.precio_venta * i.cantidad)}
                </div>
                <button onClick={() => quitar(i.producto.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444' }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>

          <div className="pos-cart-footer">
            <ClienteSelector clienteId={clienteId} clienteLabel={clienteLabel}
              onSeleccionar={(t) => { setClienteId(t.id); setClienteLabel(`${t.nombres} ${t.apellidos || ''}`.trim() + (t.numero_documento ? ` · ${t.numero_documento}` : '')) }}
              onLimpiar={() => { setClienteId(''); setClienteLabel('') }}/>

            <div style={{ display:'flex', justifyContent:'space-between', fontSize:17, fontWeight:800, marginBottom:10 }}>
              <span>Total</span><span style={{ color:'#16A34A' }}>{fmt(total)}</span>
            </div>

            <div style={{ fontSize:11.5, fontWeight:700, color:'#6B7280', marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>MEDIO(S) DE PAGO</span>
              {restante > 1 && (
                <button onClick={agregarLineaPago} style={{ background:'none', border:'none', color:'#16A34A', cursor:'pointer',
                  fontSize:11.5, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                  <Plus size={11}/> Dividir pago
                </button>
              )}
            </div>

            {pagos.map((p, idx) => {
              const forma = formas.find(f => f.codigo === p.metodo_pago)
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
                      placeholder="Monto"
                      style={{ width:90 }}/>
                    {noEfectivo && (
                      <button onClick={() => setShowSoporteIdx(idx)} title={soportado ? 'Soporte adjunto ✓' : 'Adjuntar soporte'}
                        style={{ width:30, borderRadius:8, border:`1.5px solid ${soportado ? '#A7F3D0' : '#E2E5F0'}`,
                          background: soportado ? '#F0FDF4' : '#fff', cursor:'pointer',
                          color: soportado ? '#059669' : '#9CA3AF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {soportado ? <CheckCircle2 size={14}/> : <Receipt size={14}/>}
                      </button>
                    )}
                    {tienePagoDividido && (
                      <button onClick={() => quitarLineaPago(idx)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444' }}>
                        <Trash2 size={13}/>
                      </button>
                    )}
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
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <input type="number" min="0" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)}
                  placeholder="Efectivo recibido (opcional)…"
                  style={{ flex:1, padding:'7px 8px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12 }}/>
                {vuelto !== null && (
                  <div style={{ fontSize:12, fontWeight:800, color:'#16A34A', whiteSpace:'nowrap' }}>Vuelto: {fmt(vuelto)}</div>
                )}
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
      {fijarPrecioProd && (
        <ModalFijarPrecio producto={fijarPrecioProd} onClose={() => setFijarPrecioProd(null)} onConfirmar={confirmarPrecioNuevo}/>
      )}
    </div>
  )
}

// ── Fijar precio a un producto que no lo tiene (solo admin/superadmin) ──────
function ModalFijarPrecio({ producto, onClose, onConfirmar }) {
  const [precio, setPrecio] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:380, maxWidth:'92vw', padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'#0F1035' }}>Fijar precio de venta</div>
            <div style={{ fontSize:12, color:'#9CA3AF' }}>{producto.nombre}</div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={16}/></button>
        </div>
        <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Precio de venta</label>
        <CurrencyInput value={precio} onChange={setPrecio} placeholder="0" autoFocus/>
        <div style={{ fontSize:10.5, color:'#9CA3AF', marginTop:6 }}>
          Este precio queda guardado — la próxima vez cualquier cajero podrá venderlo sin que se lo vuelvan a pedir.
        </div>
        <button onClick={() => onConfirmar(precio)}
          style={{ width:'100%', marginTop:16, padding:'11px 0', background:'linear-gradient(135deg,#16A34A,#15803D)',
            color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:14, cursor:'pointer' }}>
          Fijar precio y agregar al carrito
        </button>
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
                      <a href={`http://localhost:3001${(v.pagos.find(p => p.soporte_url)||{}).soporte_url}`} target="_blank" rel="noreferrer"
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
