/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contabilidad — Estados financieros (resumen)         ║
 * ║  Archivo         : pages/contabilidad/EstadosFinancierosTab.jsx         ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-20                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Resumen gerencial en una pantalla (igual al de YaROM POS): Estado de
 * Resultados del período y Balance General a la fecha, con márgenes y
 * patrimonio. Sale del libro diario (partida doble), cuenta por cuenta.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3, Calendar, RefreshCw, TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight,
  Wallet, Landmark, CreditCard, Package, Building2, FileText,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const CSS = `
  @keyframes efUp { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes efSpin { to{transform:rotate(360deg)} }
  .ef-wrap { --primary:#16a34a; --primary-dark:#15803d; --primary-rgb:22,163,74; animation:efUp .3s ease; }
  .ef-top  { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; flex-wrap:wrap; gap:12px; }
  .ef-title-row { display:flex; align-items:center; gap:14px; }
  .ef-ico { width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg,var(--primary),var(--primary-dark)); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(var(--primary-rgb),.3); }
  .ef-title { font-size:20px; font-weight:900; color:#0f172a; }
  .ef-sub   { font-size:12px; color:#94a3b8; margin-top:2px; }
  .ef-date-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .ef-date-input { padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:13px; color:#0f172a; outline:none; font-family:inherit; background:#fff; }
  .ef-date-input:focus { border-color:var(--primary); }
  .ef-btn { padding:9px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; cursor:pointer; color:#64748b; display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; font-family:inherit; }
  .ef-btn:hover { border-color:#cbd5e1; }
  .ef-atajos { display:flex; gap:6px; flex-wrap:wrap; }
  .ef-atajo { padding:6px 11px; border-radius:20px; border:1.5px solid #e2e8f0; background:#fff; color:#475569; font-size:11.5px; font-weight:700; cursor:pointer; font-family:inherit; }
  .ef-atajo.on { background:rgba(var(--primary-rgb),.1); border-color:rgba(var(--primary-rgb),.4); color:var(--primary-dark); }

  .ef-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px; align-items:start; }
  @media(max-width:1000px){ .ef-grid{grid-template-columns:1fr;} }
  .ef-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; }
  .ef-card-hdr { padding:16px 20px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:10px; }
  .ef-card-title { font-size:14px; font-weight:900; color:#0f172a; flex:1; }
  .ef-card-periodo { font-size:11px; color:#94a3b8; }
  .ef-card-body { padding:18px 20px; }
  .ef-sec { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.7px; color:#94a3b8; margin:14px 0 8px; }
  .ef-sec:first-child { margin-top:0; }

  .ef-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 0; border-bottom:1px solid #f8fafc; }
  .ef-row-lbl { font-size:13px; color:#475569; display:flex; align-items:center; gap:8px; min-width:0; }
  .ef-row-val { font-size:14px; font-weight:700; white-space:nowrap; }
  .ef-row.subtotal { background:#f8fafc; margin:6px -20px; padding:9px 20px; border-bottom:none; }
  .ef-row.subtotal .ef-row-lbl { font-weight:800; color:#0f172a; }
  .ef-row.subtotal .ef-row-val { font-size:16px; font-weight:900; }
  .ef-row.total-final { background:linear-gradient(135deg,#0f172a,#1e293b); margin:14px -20px 0; padding:16px 20px; border-bottom:none; }
  .ef-row.total-final .ef-row-lbl { color:#cbd5e1; font-weight:800; font-size:14px; letter-spacing:.3px; }
  .ef-row.total-final .ef-row-val { font-size:20px; font-weight:900; }

  .ef-margin-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; }
  .ef-margin-item { background:#f8fafc; border-radius:12px; padding:14px; text-align:center; }
  .ef-margin-val { font-size:24px; font-weight:900; }
  .ef-margin-lbl { font-size:11px; color:#94a3b8; margin-top:3px; }
  .ef-margen-bar { background:#f1f5f9; border-radius:100px; height:8px; overflow:hidden; margin-top:8px; }
  .ef-margen-fill { height:100%; border-radius:100px; transition:width .6s ease; }

  .ef-cat-row { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid #f8fafc; }
  .ef-cat-name { font-size:12px; color:#475569; flex:1; min-width:0; }
  .ef-cat-bar-wrap { flex:2; }
  .ef-cat-bar { height:6px; border-radius:100px; background:rgba(239,68,68,.15); overflow:hidden; }
  .ef-cat-bar-fill { height:100%; border-radius:100px; background:linear-gradient(90deg,#ef4444,#dc2626); }
  .ef-cat-val { font-size:12px; font-weight:700; color:#dc2626; width:100px; text-align:right; white-space:nowrap; }

  .ef-balance-section { margin-bottom:16px; }
  .ef-balance-title { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.7px; color:#94a3b8; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #f1f5f9; }
  .ef-balance-row { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f8fafc; }
  .ef-balance-lbl { font-size:13px; color:#475569; display:flex; align-items:center; gap:8px; min-width:0; }
  .ef-balance-lbl span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ef-balance-val { font-size:14px; font-weight:700; color:#0f172a; white-space:nowrap; }
  .ef-balance-total { display:flex; justify-content:space-between; padding:12px 0; margin-top:4px; border-top:2px solid #e2e8f0; }
  .ef-balance-total-lbl { font-size:14px; font-weight:800; color:#0f172a; }
  .ef-balance-total-val { font-size:18px; font-weight:900; }
  .ef-cod { font-family:ui-monospace,Menlo,monospace; font-size:11.5px; color:#94a3b8; }

  .ef-patrimonio { background:linear-gradient(135deg,var(--primary),var(--primary-dark)); border-radius:14px; padding:20px; color:#fff; text-align:center; margin-top:16px; }
  .ef-patrimonio-lbl { font-size:12px; color:rgba(255,255,255,.75); margin-bottom:8px; text-transform:uppercase; letter-spacing:.7px; font-weight:700; }
  .ef-patrimonio-val { font-size:32px; font-weight:900; }
  .ef-patrimonio-eq { font-size:12px; color:rgba(255,255,255,.7); margin-top:8px; }
  .ef-cuadre { margin-top:10px; font-size:11.5px; text-align:center; }
  .ef-vacio { font-size:12.5px; color:#cbd5e1; padding:6px 0; }
  .ef-loader { text-align:center; padding:80px 24px; color:#94a3b8; }
`

const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const paren = n => `(${fmt(Math.abs(n))})`
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hoy = () => iso(new Date())
const iniMes = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)) }

// Ícono por tipo de cuenta (o el de la forma de pago, para cajas y bancos)
function IconoCuenta({ c }) {
  if (c.icono_url) return <img src={c.icono_url} alt="" style={{ width:15, height:15, objectFit:'contain', borderRadius:3, flexShrink:0 }}/>
  const g = c.grupo || c.codigo.slice(0, 2)
  const p = { size:13, style:{ flexShrink:0 } }
  if (g === '11') return <Wallet {...p} color="#16a34a"/>
  if (g === '12') return <Landmark {...p} color="#0891b2"/>
  if (g === '13') return <CreditCard {...p} color="#7c3aed"/>
  if (g === '14') return <Package {...p} color="#16a34a"/>
  if (g === '15' || g === '16') return <Building2 {...p} color="#64748b"/>
  if (c.codigo.startsWith('2')) return <TrendingDown {...p} color="#dc2626"/>
  return <FileText {...p} color="#64748b"/>
}

const ATAJOS = [
  { label:'Este mes', rango: () => [iniMes(), hoy()] },
  { label:'Mes anterior', rango: () => { const d = new Date(); return [iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0))] } },
  { label:'Este año', rango: () => [`${new Date().getFullYear()}-01-01`, hoy()] },
]

export default function EstadosFinancierosTab() {
  const [desde, setDesde] = useState(iniMes)
  const [hasta, setHasta] = useState(hoy)
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return
    setCargando(true)
    try {
      const r = await api.get('/contabilidad/reportes/resumen-financiero', { params: { desde, hasta } })
      setData(r.data.data)
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudieron calcular los estados financieros') }
    finally { setCargando(false) }
  }, [desde, hasta])
  useEffect(() => { cargar() }, [cargar])

  const r = data?.resultados, b = data?.balance
  const maxGasto = Math.max(1, ...(r?.gastos || []).map(g => g.saldo))
  const fHasta = new Date(hasta + 'T12:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
  const patrimonioTotal = b ? b.patrimonio_contable + b.utilidad_ejercicio : 0
  const descuadre = b ? Math.round(b.patrimonio_neto - patrimonioTotal) : 0

  return (
    <div className="ef-wrap">
      <style>{CSS}</style>
      <div className="ef-top">
        <div className="ef-title-row">
          <div className="ef-ico"><BarChart3 size={20} color="#fff" strokeWidth={2}/></div>
          <div><div className="ef-title">Estados Financieros</div><div className="ef-sub">P&amp;G · Balance · Márgenes</div></div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <div className="ef-atajos">
            {ATAJOS.map(a => {
              const [d, h] = a.rango()
              return <button key={a.label} className={`ef-atajo${d === desde && h === hasta ? ' on' : ''}`} onClick={() => { setDesde(d); setHasta(h) }}>{a.label}</button>
            })}
          </div>
          <div className="ef-date-row">
            <Calendar size={14} color="#94a3b8"/>
            <input type="date" className="ef-date-input" value={desde} onChange={e => setDesde(e.target.value)}/>
            <span style={{ fontSize:12, color:'#94a3b8' }}>—</span>
            <input type="date" className="ef-date-input" value={hasta} onChange={e => setHasta(e.target.value)}/>
          </div>
          <button className="ef-btn" onClick={cargar}><RefreshCw size={13}/> Recalcular</button>
        </div>
      </div>

      {cargando && !data ? (
        <div className="ef-loader">
          <div style={{ width:36, height:36, border:'3px solid #f1f5f9', borderTopColor:'#16a34a', borderRadius:'50%', animation:'efSpin .8s linear infinite', margin:'0 auto 16px' }}/>
          Calculando estados financieros…
        </div>
      ) : data && (
        <div className="ef-grid" style={{ opacity: cargando ? .6 : 1, transition:'opacity .2s' }}>
          {/* ── Estado de Resultados ── */}
          <div className="ef-card">
            <div className="ef-card-hdr">
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(22,163,74,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <TrendingUp size={16} color="#16a34a"/>
              </div>
              <div className="ef-card-title">Estado de Resultados</div>
              <div className="ef-card-periodo">P&amp;G</div>
            </div>
            <div className="ef-card-body" style={{ paddingBottom:0 }}>
              <div className="ef-sec">Ingresos{r.num_comprobantes ? ` · ${r.num_comprobantes} comprobante${r.num_comprobantes > 1 ? 's' : ''}` : ''}</div>
              {r.ingresos.length ? r.ingresos.map(c => (
                <div key={c.codigo} className="ef-row">
                  <span className="ef-row-lbl"><ArrowUpRight size={13} color="#16a34a" style={{ flexShrink:0 }}/>{c.nombre}</span>
                  <span className="ef-row-val" style={{ color: c.saldo >= 0 ? '#16a34a' : '#dc2626' }}>{c.saldo >= 0 ? fmt(c.saldo) : paren(c.saldo)}</span>
                </div>
              )) : <div className="ef-vacio">Sin ingresos en el período</div>}
              <div className="ef-row subtotal">
                <span className="ef-row-lbl">= Ingresos netos</span>
                <span className="ef-row-val" style={{ color:'#16a34a' }}>{fmt(r.ingresos_netos)}</span>
              </div>

              <div className="ef-sec">Costo de ventas</div>
              {r.costos.length ? r.costos.map(c => (
                <div key={c.codigo} className="ef-row">
                  <span className="ef-row-lbl"><ArrowDownRight size={13} color="#dc2626" style={{ flexShrink:0 }}/>{c.nombre}</span>
                  <span className="ef-row-val" style={{ color:'#dc2626' }}>{paren(c.saldo)}</span>
                </div>
              )) : <div className="ef-vacio">Sin costos en el período</div>}
              <div className="ef-row subtotal">
                <span className="ef-row-lbl">= Utilidad bruta</span>
                <span className="ef-row-val" style={{ color: r.utilidad_bruta >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(r.utilidad_bruta)}</span>
              </div>

              <div className="ef-sec">Gastos operativos</div>
              {r.gastos.length ? r.gastos.map(g => (
                <div key={g.codigo} className="ef-cat-row">
                  <span className="ef-cat-name">{g.nombre}</span>
                  <div className="ef-cat-bar-wrap"><div className="ef-cat-bar"><div className="ef-cat-bar-fill" style={{ width:`${Math.max(2, g.saldo / maxGasto * 100).toFixed(1)}%` }}/></div></div>
                  <span className="ef-cat-val">{paren(g.saldo)}</span>
                </div>
              )) : <div className="ef-vacio">Sin gastos en el período</div>}
              <div className="ef-row subtotal">
                <span className="ef-row-lbl">Total gastos operativos</span>
                <span className="ef-row-val" style={{ color:'#dc2626' }}>{paren(r.total_gastos)}</span>
              </div>

              <div className="ef-row total-final">
                <span className="ef-row-lbl">{r.utilidad_neta >= 0 ? '✅ UTILIDAD NETA' : '⚠️ PÉRDIDA NETA'}</span>
                <span className="ef-row-val" style={{ color: r.utilidad_neta >= 0 ? '#4ade80' : '#f87171' }}>{fmt(r.utilidad_neta)}</span>
              </div>
            </div>
            <div style={{ padding:'0 20px 20px' }}>
              <div className="ef-margin-cards">
                {[['Margen bruto', r.margen_bruto, 20], ['Margen neto', r.margen_neto, 10]].map(([l, v, meta]) => {
                  const c = v >= meta ? '#16a34a' : v >= 0 ? '#d97706' : '#dc2626'
                  return (
                    <div key={l} className="ef-margin-item">
                      <div className="ef-margin-val" style={{ color:c }}>{v}%</div>
                      <div className="ef-margin-lbl">{l}</div>
                      <div className="ef-margen-bar"><div className="ef-margen-fill" style={{ width:`${Math.min(Math.abs(v), 100)}%`, background:c }}/></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Balance General ── */}
          <div className="ef-card">
            <div className="ef-card-hdr">
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(22,163,74,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Scale size={16} color="#16a34a"/>
              </div>
              <div className="ef-card-title">Balance General</div>
              <div className="ef-card-periodo">Al {fHasta}</div>
            </div>
            <div className="ef-card-body">
              {[['Activos', b.activos, b.total_activos, '#16a34a'], ['Pasivos', b.pasivos, b.total_pasivos, '#dc2626']].map(([t, lista, tot, color]) => (
                <div key={t} className="ef-balance-section">
                  <div className="ef-balance-title">{t}</div>
                  {lista.length ? lista.map(c => (
                    <div key={c.codigo} className="ef-balance-row">
                      <span className="ef-balance-lbl"><IconoCuenta c={c}/><span><span className="ef-cod">{c.codigo}</span> — {c.nombre}</span></span>
                      <span className="ef-balance-val" style={{ color: c.saldo < 0 ? '#dc2626' : '#0f172a' }}>{fmt(c.saldo)}</span>
                    </div>
                  )) : <div className="ef-vacio">Sin saldos</div>}
                  <div className="ef-balance-total">
                    <span className="ef-balance-total-lbl">Total {t}</span>
                    <span className="ef-balance-total-val" style={{ color }}>{fmt(tot)}</span>
                  </div>
                </div>
              ))}

              <div className="ef-balance-section">
                <div className="ef-balance-title">Patrimonio</div>
                {b.patrimonio.map(c => (
                  <div key={c.codigo} className="ef-balance-row">
                    <span className="ef-balance-lbl" style={{ color:'#64748b' }}><span><span className="ef-cod">{c.codigo}</span> — {c.nombre}</span></span>
                    <span className="ef-balance-val" style={{ color:'#334155' }}>{fmt(c.saldo)}</span>
                  </div>
                ))}
                <div className="ef-balance-row">
                  <span className="ef-balance-lbl" style={{ color:'#64748b' }}>Resultado del ejercicio {hasta.slice(0, 4)} (aún sin cierre)</span>
                  <span className="ef-balance-val" style={{ color: b.utilidad_ejercicio >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(b.utilidad_ejercicio)}</span>
                </div>
              </div>

              <div className="ef-patrimonio">
                <div className="ef-patrimonio-lbl">Patrimonio neto (Activos − Pasivos)</div>
                <div className="ef-patrimonio-val">{fmt(b.patrimonio_neto)}</div>
                <div className="ef-patrimonio-eq">{fmt(b.total_activos)} − {fmt(b.total_pasivos)} = {fmt(b.patrimonio_neto)}</div>
              </div>
              <div className="ef-cuadre" style={{ color: Math.abs(descuadre) <= 1 ? '#16a34a' : '#b45309' }}>
                {Math.abs(descuadre) <= 1 ? '✓ El balance cuadra: activos = pasivos + patrimonio' : `⚠ Diferencia de ${fmt(descuadre)} entre el balance y el patrimonio contable — revise el libro diario`}
              </div>

              <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'rgba(22,163,74,.05)', border:'1px solid rgba(22,163,74,.15)', borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, marginBottom:4, textTransform:'uppercase' }}>Ingresos históricos</div>
                  <div style={{ fontSize:15, fontWeight:900, color:'#16a34a' }}>{fmt(data.historico.ingresos)}</div>
                </div>
                <div style={{ background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.12)', borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, marginBottom:4, textTransform:'uppercase' }}>Costos y gastos históricos</div>
                  <div style={{ fontSize:15, fontWeight:900, color:'#dc2626' }}>{fmt(data.historico.gastos)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
