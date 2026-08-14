/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Cartera de terceros (convenios y familias)           ║
 * ║  Archivo         : CarteraConveniosPage.jsx                             ║
 * ║  Fecha           : 2026-08-14                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import { Wallet, Search, Loader2, X, RefreshCw, Handshake, Users, CheckCircle2 } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'

const fmtCOP = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(Number(v)||0)
const fmtFecha = v => v ? new Date(v).toLocaleDateString('es-CO') : '—'

const ESTADO_META = {
  PENDIENTE: { label:'Pendiente', bg:'#FEF3C7', fg:'#92400E' },
  PARCIAL:   { label:'Abono parcial', bg:'#DBEAFE', fg:'#1D4ED8' },
  PAGADO:    { label:'Pagado', bg:'#D1FAE5', fg:'#065F46' },
  ANULADO:   { label:'Anulado', bg:'#F3F4F6', fg:'#6B7280' },
}

function ModalAbono({ item, onClose, onSaved }) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    if (!monto || Number(monto) <= 0) return toast.error('Ingrese un monto válido')
    setSaving(true)
    try {
      await api.post(`/cartera-terceros/${item.id}/abonos`, { monto: Number(monto), metodo_pago: metodo, referencia, notas })
      toast.success('Abono registrado con éxito')
      onSaved()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Error al registrar el abono')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:420, maxWidth:'92vw', padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'#0F1035' }}>Registrar abono</div>
            <div style={{ fontSize:12, color:'#9CA3AF' }}>{item.deudor_nombre || 'Sin tercero asignado'} · {item.concepto}</div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={16}/></button>
        </div>

        <div style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, color:'#6B7280' }}>Saldo pendiente</span>
          <span style={{ fontSize:15, fontWeight:900, color:'#DC2626' }}>{fmtCOP(item.saldo_pendiente)}</span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div>
            <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Monto del abono *</label>
            <CurrencyInput value={monto} onChange={v => setMonto(v)} placeholder="0"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Método de pago</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13, boxSizing:'border-box' }}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Referencia</label>
              <input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="N° recibo, transacción…"
                style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13, boxSizing:'border-box' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13, boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }}/>
          </div>
        </div>

        <button onClick={guardar} disabled={saving}
          style={{ width:'100%', marginTop:16, padding:'11px 0', background:'linear-gradient(135deg,#0891B2,#0E7490)',
            color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:14, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {saving ? <Loader2 size={16} className="cct-spin"/> : <CheckCircle2 size={15}/>}
          {saving ? 'Guardando…' : 'Registrar abono'}
        </button>
      </div>
    </div>
  )
}

export default function CarteraConveniosPage() {
  const [items, setItems] = useState([])
  const [resumen, setResumen] = useState({ total_pendiente:0, total_convenio:0, total_familia:0 })
  const [loading, setLoading] = useState(true)
  const [deudorTipo, setDeudorTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [busq, setBusq] = useState('')
  const [abonoItem, setAbonoItem] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (deudorTipo) params.deudor_tipo = deudorTipo
      if (estado) params.estado = estado
      if (busq.trim().length >= 2) params.q = busq.trim()
      const r = await api.get('/cartera-terceros', { params })
      setItems(r.data.data || [])
      setResumen(r.data.resumen || { total_pendiente:0, total_convenio:0, total_familia:0 })
    } finally { setLoading(false) }
  }, [deudorTipo, estado, busq])

  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t) }, [cargar])

  return (
    <div style={{ padding:24 }}>
      <style>{`
        .cct-spin { animation: cct-spin .7s linear infinite } @keyframes cct-spin { to { transform: rotate(360deg) } }
        .btn-icon { background:#F4F5FA; border:1px solid #E8E9F8; border-radius:9px;
          width:34px; height:34px; display:flex; align-items:center; justify-content:center;
          color:#0891B2; cursor:pointer; transition:all .15s; }
        .btn-icon:hover { background:#ECFEFF; }
        .tbl-wrap { border:1px solid #ECEDF8; border-radius:14px; overflow:hidden; }
        .tbl { width:100%; border-collapse:collapse; }
        .tbl th { padding:11px 16px; background:#F8F9FF; font-size:10px; font-weight:800;
          color:#9CA3AF; text-transform:uppercase; letter-spacing:.9px; text-align:left; border-bottom:1px solid #ECEDF8; }
        .tbl td { padding:12px 16px; font-size:13px; color:#374151; border-bottom:1px solid #F4F5FA; vertical-align:top; }
        .tbl tr:last-child td { border-bottom:none; }
        .tbl tr:hover td { background:#FAFBFF; }
        .badge { display:inline-flex; align-items:center; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0891B2,#0E7490)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Wallet size={22} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:'#0F1035' }}>Cartera de Convenios</div>
            <div style={{ fontSize:12, color:'#9CA3AF' }}>
              Lo que autoriza cada convenio y el excedente de familia — nunca lo asume la funeraria
            </div>
          </div>
        </div>
        <button onClick={cargar} className="btn-icon" title="Recargar" style={{ padding:9 }}>
          <RefreshCw size={15} className={loading ? 'cct-spin' : ''}/>
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        <div style={{ background:'#fff', border:'1.5px solid #E8EAF0', borderRadius:14, padding:'14px 18px' }}>
          <div style={{ fontSize:10.5, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:.5 }}>Total en cartera</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#0F1035' }}>{fmtCOP(resumen.total_pendiente)}</div>
        </div>
        <div style={{ background:'#fff', border:'1.5px solid #E8EAF0', borderRadius:14, padding:'14px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:800, color:'#0891B2', textTransform:'uppercase', letterSpacing:.5 }}>
            <Handshake size={12}/> A cargo de convenios
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:'#0891B2' }}>{fmtCOP(resumen.total_convenio)}</div>
        </div>
        <div style={{ background:'#fff', border:'1.5px solid #E8EAF0', borderRadius:14, padding:'14px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:800, color:'#9A3412', textTransform:'uppercase', letterSpacing:.5 }}>
            <Users size={12}/> A cargo de familias
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:'#9A3412' }}>{fmtCOP(resumen.total_familia)}</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:320 }}>
          <Search size={14} color="#9CA3AF" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar por convenio, familia o concepto…"
            style={{ width:'100%', padding:'9px 12px 9px 32px', border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13, boxSizing:'border-box' }}/>
        </div>
        <select value={deudorTipo} onChange={e => setDeudorTipo(e.target.value)}
          style={{ padding:'9px 12px', border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13 }}>
          <option value="">Todos los deudores</option>
          <option value="CONVENIO">Convenios</option>
          <option value="CONTRATANTE">Familias</option>
        </select>
        <select value={estado} onChange={e => setEstado(e.target.value)}
          style={{ padding:'9px 12px', border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13 }}>
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PARCIAL">Abono parcial</option>
          <option value="PAGADO">Pagado</option>
          <option value="ANULADO">Anulado</option>
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <Loader2 size={28} color="#0891B2" className="cct-spin"/>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 0', color:'#9CA3AF', fontSize:13 }}>
          No hay cartera registrada con estos filtros.
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Deudor</th><th>Concepto</th><th>Fecha</th>
                <th style={{textAlign:'right'}}>Valor</th>
                <th style={{textAlign:'right'}}>Pagado</th>
                <th style={{textAlign:'right'}}>Saldo</th>
                <th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const em = ESTADO_META[it.estado] || ESTADO_META.PENDIENTE
                return (
                  <tr key={it.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                        {it.deudor_tipo === 'CONVENIO' ? <Handshake size={13} color="#0891B2"/> : <Users size={13} color="#9A3412"/>}
                        {it.deudor_nombre || <span style={{ color:'#D1D5DB', fontStyle:'italic', fontWeight:400 }}>Sin tercero asignado</span>}
                      </div>
                      {(it.difunto_nombres || it.difunto_apellidos) && (
                        <div style={{ fontSize:11, color:'#9CA3AF' }}>{it.difunto_nombres} {it.difunto_apellidos}</div>
                      )}
                    </td>
                    <td style={{ fontSize:12.5 }}>{it.concepto}</td>
                    <td style={{ fontSize:12, color:'#6B7280' }}>{fmtFecha(it.creado_en)}</td>
                    <td style={{ textAlign:'right' }}>{fmtCOP(it.valor)}</td>
                    <td style={{ textAlign:'right', color:'#059669' }}>{fmtCOP(it.valor_pagado)}</td>
                    <td style={{ textAlign:'right', fontWeight:800 }}>{fmtCOP(it.saldo_pendiente)}</td>
                    <td><span className="badge" style={{ background:em.bg, color:em.fg }}>{em.label}</span></td>
                    <td>
                      {it.estado !== 'PAGADO' && it.estado !== 'ANULADO' && (
                        <button className="btn-icon" title="Registrar abono" onClick={() => setAbonoItem(it)}>
                          <Wallet size={13}/>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {abonoItem && (
        <ModalAbono item={abonoItem} onClose={() => setAbonoItem(null)}
          onSaved={() => { setAbonoItem(null); cargar() }}/>
      )}
    </div>
  )
}
