/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas de Previsión Funeraria                       ║
 * ║  Archivo         : PolizasPage.jsx                                      ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, ShieldPlus, Search, RefreshCw, X, Loader2,
  ChevronLeft, ChevronRight, User, Phone, Mail, Calendar,
  AlertTriangle, CheckCircle2, Clock, Ban, Edit2, Eye,
  CreditCard, Heart, PlusCircle, Trash2, Star, ArrowLeftRight,
  DollarSign, Users, AlertCircle, Settings,
} from 'lucide-react'
import api from '../../services/api.js'
import { useAuthStore } from '../../store/auth.store.js'
import { toast } from '../../store/toast.store.js'
import { useFormasPago } from '../../hooks/useFormasPago.js'

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt     = (n) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n||0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}) : '—'
const MESES   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const mesLabel= (d) => { if (!d) return '—'; const f=new Date(d); return `${MESES[f.getUTCMonth()]} ${f.getUTCFullYear()}` }

// Replica la misma regla del backend (pagos.controller.js → registrarPagoPoliza)
// para saber desde qué mes empieza a aplicar el próximo pago: si la póliza ya
// está al día o adelantada, arranca desde el mes actual; si no, desde pago_hasta.
function calcularMesDesde(poliza) {
  const base = poliza?.pago_hasta || poliza?.fecha_inicio
  if (!base) return null
  const d = new Date(base)
  let anio = d.getUTCFullYear()
  let mes  = d.getUTCMonth()
  const hoy = new Date()
  const ts    = anio*12 + mes
  const tsHoy = hoy.getFullYear()*12 + hoy.getMonth()
  if (ts <= tsHoy) { anio = hoy.getFullYear(); mes = hoy.getMonth() }
  return { anio, mes }
}

function listarMesesDesde(start, n) {
  if (!start) return []
  let { anio, mes } = start
  const out = []
  for (let i = 0; i < n; i++) {
    out.push({ iso: `${anio}-${String(mes+1).padStart(2,'0')}-01`, label: `${MESES[mes]} ${anio}` })
    mes++; if (mes > 11) { mes = 0; anio++ }
  }
  return out
}

const ESTADO_META = {
  VIGENTE:    { label:'Vigente',    color:'#059669', bg:'#D1FAE5' },
  SUSPENDIDA: { label:'Suspendida', color:'#F59E0B', bg:'#FEF3C7' },
  VENCIDA:    { label:'Vencida',    color:'#EF4444', bg:'#FEE2E2' },
  EJECUTADA:  { label:'Ejecutada',  color:'#6366F1', bg:'#EEF2FF' },
  CANCELADA:  { label:'Cancelada',  color:'#9CA3AF', bg:'#F3F4F6' },
}

const TIPO_COLOR = {
  INDIVIDUAL:'#10B981', FAMILIAR:'#0891B2', AMPLIADO:'#8B5CF6', COLECTIVO:'#F59E0B',
}


const PARENTESCOS = ['titular','cónyuge','hijo','hija','padre','madre','hermano','hermana','abuelo','abuela','otro']

// ── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  .pl-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
  .pl-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px 14px; flex-shrink:0; }
  .pl-head-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .pl-head-icon { width:44px; height:44px; border-radius:14px;
    background:linear-gradient(135deg,#059669,#047857);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 12px rgba(5,150,105,.3); flex-shrink:0; }
  .pl-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
  .pl-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .pl-kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:22px; }
  .pl-kpi { background:#fff; border-radius:16px; overflow:hidden; border:1.5px solid #ECEDF8; transition:all .2s; }
  .pl-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.08); }
  .pl-kpi-bar  { height:3px; }
  .pl-kpi-body { padding:14px 16px 12px; }
  .pl-kpi-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
  .pl-kpi-val  { font-size:28px; font-weight:900; color:#0F1035; line-height:1; letter-spacing:-1px; }
  .pl-kpi-label{ font-size:11px; color:#9CA3AF; font-weight:600; margin-top:4px; }
  .pl-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .pl-search { position:relative; flex:1; min-width:200px; max-width:340px; }
  .pl-search input { width:100%; padding:9px 12px 9px 36px; border:1.5px solid #E2E5F0;
    border-radius:12px; font-size:13px; outline:none; background:#FAFBFF; transition:all .15s; box-sizing:border-box; }
  .pl-search input:focus { border-color:#059669; box-shadow:0 0 0 3px rgba(5,150,105,.1); background:#fff; }
  .pl-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; pointer-events:none; }
  .pl-select { padding:9px 12px; border:1.5px solid #E2E5F0; border-radius:12px; font-size:13px;
    background:#FAFBFF; color:#374151; outline:none; cursor:pointer; }
  .pl-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px;
    font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .15s; }
  .pl-btn-primary { background:linear-gradient(135deg,#059669,#047857); color:#fff;
    box-shadow:0 3px 10px rgba(5,150,105,.3); }
  .pl-btn-primary:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(5,150,105,.4); }
  .pl-btn-ghost { background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0; }
  .pl-btn-ghost:hover { background:#ECEDF8; }
  .pl-table-wrap { flex:1; overflow:auto; padding:0 24px; }
  .pl-table { width:100%; border-collapse:separate; border-spacing:0; }
  .pl-table thead th { padding:10px 14px; text-align:left; font-size:10.5px; font-weight:800;
    color:#9CA3AF; letter-spacing:.6px; text-transform:uppercase; background:#F7F8FC;
    position:sticky; top:0; z-index:1; white-space:nowrap; }
  .pl-table thead th:first-child { border-radius:10px 0 0 10px; }
  .pl-table thead th:last-child  { border-radius:0 10px 10px 0; }
  .pl-table tbody tr { transition:all .12s; cursor:pointer; }
  .pl-table tbody tr:hover td { background:#ECFDF5; }
  .pl-table tbody tr:hover td:first-child { border-left:3px solid #059669; }
  .pl-table td { padding:12px 14px; font-size:13px; color:#374151; border-bottom:1px solid #F4F5FA; vertical-align:middle; }
  .pl-table td:first-child { border-left:3px solid transparent; transition:border-color .12s; }
  .pl-act { width:30px; height:30px; border-radius:8px; border:1.5px solid #E2E5F0;
    background:#fff; display:inline-flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; transition:all .15s; }
  .pl-act:hover { background:#ECFDF5; color:#059669; border-color:#A7F3D0; }
  .pl-empty { display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:60px 20px; color:#9CA3AF; gap:10px; }
  .pl-empty p { font-size:15px; font-weight:800; color:#374151; margin:0; }
  .pl-pag { display:flex; align-items:center; justify-content:space-between; padding:14px 24px;
    border-top:1.5px solid #ECEDF8; background:#fff; flex-shrink:0; }
  .pl-pag-info { font-size:12.5px; color:#9CA3AF; font-weight:600; }
  .pl-pag-btns { display:flex; gap:6px; }
  .pl-pag-btn { width:32px; height:32px; border-radius:9px; border:1.5px solid #E2E5F0;
    background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;
    color:#6B7280; transition:all .15s; }
  .pl-pag-btn:hover:not(:disabled) { background:#ECFDF5; color:#059669; border-color:#A7F3D0; }
  .pl-pag-btn:disabled { opacity:.4; cursor:not-allowed; }
  .pl-spin { animation:pl-spin .7s linear infinite; }
  @keyframes pl-spin { to{transform:rotate(360deg)} }
  .pl-overlay { position:fixed; inset:0; background:rgba(15,16,53,.55); backdrop-filter:blur(4px);
    z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .pl-modal { background:#fff; border-radius:20px; width:100%; max-width:660px;
    box-shadow:0 24px 60px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:92vh; overflow:hidden; }
  .pl-modal.lg { max-width:900px; }
  /* Drawer póliza */
  .pl-drawer-overlay { position:fixed; inset:0; background:rgba(10,10,30,.45); backdrop-filter:blur(3px);
    z-index:1000; display:flex; justify-content:flex-end; }
  .pl-drawer { background:#fff; width:88%; max-width:1100px; height:100vh; display:flex;
    flex-direction:column; box-shadow:-8px 0 40px rgba(0,0,0,.18); animation:pl-slide-in .22s ease; }
  @keyframes pl-slide-in { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
  .pl-drawer-sidebar { width:190px; flex-shrink:0; border-right:1.5px solid #E5F7EE;
    background:#F6FDF9; display:flex; flex-direction:column; padding:16px 10px; gap:4px; overflow-y:auto; }
  .pl-drawer-stab { display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:10px;
    cursor:pointer; border:none; background:none; width:100%; text-align:left;
    font-size:12.5px; font-weight:600; color:#4B5563; transition:all .15s; }
  .pl-drawer-stab:hover { background:#D1FAE5; color:#065F46; }
  .pl-drawer-stab.active { background:linear-gradient(135deg,#059669,#047857); color:#fff;
    font-weight:800; box-shadow:0 3px 10px rgba(5,150,105,.25); }
  .pl-drawer-stab .stab-icon { font-size:16px; line-height:1; flex-shrink:0; }
  .pl-drawer-content { flex:1; overflow-y:auto; padding:28px 32px; }
  /* Cards dentro del drawer */
  .pld-card { background:#fff; border:1.5px solid #E5F7EE; border-radius:14px; margin-bottom:16px; overflow:hidden; }
  .pld-card-head { display:flex; align-items:center; gap:9px; padding:12px 16px;
    background:linear-gradient(90deg,#ECFDF5,#F0FDF4); border-bottom:1.5px solid #D1FAE5; }
  .pld-card-icon { font-size:16px; line-height:1; }
  .pld-card-title { font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#065F46; }
  .pld-card-body { padding:16px; }
  .pld-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .pld-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .pld-field { display:flex; flex-direction:column; gap:3px; }
  .pld-label { font-size:10px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.06em; }
  .pld-value { font-size:13.5px; font-weight:700; color:#111827; }
  .pld-value.muted { color:#D1D5DB; font-weight:500; }
  .pl-mhead { padding:22px 24px 18px; border-bottom:1.5px solid #ECEDF8;
    display:flex; align-items:center; justify-content:space-between; }
  .pl-mtitle { font-size:17px; font-weight:900; color:#0F1035; }
  .pl-msub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .pl-mclose { width:32px; height:32px; border-radius:10px; border:1.5px solid #ECEDF8;
    background:#F7F8FC; display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; flex-shrink:0; transition:all .15s; }
  .pl-mclose:hover { background:#FEE2E2; border-color:#FECACA; color:#EF4444; }
  .pl-mbody { padding:22px 24px; overflow-y:auto; flex:1; }
  .pl-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .pl-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
  .pl-field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
  .pl-field label { font-size:11.5px; font-weight:700; color:#374151; }
  .pl-field input, .pl-field select, .pl-field textarea {
    padding:9px 12px; border:1.5px solid #E2E5F0; border-radius:10px; font-size:13px;
    outline:none; background:#FAFBFF; color:#0F1035; transition:all .15s; font-family:inherit; }
  .pl-field input:focus, .pl-field select:focus {
    border-color:#059669; box-shadow:0 0 0 3px rgba(5,150,105,.1); background:#fff; }
  .pl-section { font-size:10px; font-weight:800; color:#9CA3AF; letter-spacing:1px;
    text-transform:uppercase; margin:6px 0 12px; }
  .pl-req { color:#EF4444; }
  .pl-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px;
    font-size:12.5px; font-weight:600; }
  .pl-alert.err  { background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; }
  .pl-alert.ok   { background:#D1FAE5; color:#065F46; border:1px solid #A7F3D0; }
  .pl-alert.warn { background:#FEF3C7; color:#92400E; border:1px solid #FDE68A; }
  .pl-ficha-block { background:#F8F9FF; border-radius:12px; padding:14px 16px; border:1.5px solid #ECEDF8; margin-bottom:12px; }
  .pl-ficha-tit { font-size:10px; font-weight:800; letter-spacing:.8px; color:#9CA3AF; text-transform:uppercase; margin-bottom:10px; }
  .pl-ficha-row { display:flex; gap:8px; margin-bottom:6px; align-items:flex-start; }
  .pl-ficha-key { font-size:11px; color:#9CA3AF; min-width:120px; flex-shrink:0; }
  .pl-ficha-val { font-size:12.5px; font-weight:700; color:#0F1035; }
  .pl-ben-item { display:flex; align-items:center; gap:12px; padding:12px 14px;
    background:#F8F9FF; border-radius:12px; border:1.5px solid #ECEDF8; margin-bottom:8px;
    transition:all .15s; }
  .pl-ben-item:hover { border-color:#A7F3D0; background:#ECFDF5; }
  .pl-pago-item { display:flex; align-items:center; gap:10px; padding:10px 14px;
    background:#F8F9FF; border-radius:10px; border:1.5px solid #ECEDF8; margin-bottom:8px; }
`

// ── Chip estado ────────────────────────────────────────────────────────────

function EstadoChip({ estado, mora }) {
  const m = ESTADO_META[estado] || { label:estado, color:'#9CA3AF', bg:'#F3F4F6' }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:m.bg,
        color:m.color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
        {m.label}
      </span>
      {mora > 0 && estado !== 'CANCELADA' && estado !== 'EJECUTADA' && (
        <span style={{ background:'#FEE2E2', color:'#DC2626', borderRadius:20,
          padding:'2px 7px', fontSize:10, fontWeight:800 }}>
          {mora} mes{mora>1?'es':''} mora
        </span>
      )}
    </div>
  )
}

// ── Cobertura visual ───────────────────────────────────────────────────────

function CoberturaTag({ ok, label }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700,
      color: ok ? '#059669' : '#9CA3AF', background: ok ? '#D1FAE5' : '#F3F4F6',
      padding:'3px 9px', borderRadius:20, margin:'2px' }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

// ── Modal Formulario ──────────────────────────────────────────────────────

function ModalForm({ poliza, planes, onClose, onSaved, esAdmin = false }) {
  const [form, setForm] = useState(poliza ? {
    plan_id:      poliza.plan_id      || '',
    valor_cuota:  poliza.valor_cuota  || '',
    dia_cobro:    poliza.dia_cobro    || 1,
    fecha_inicio: poliza.fecha_inicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    observaciones:poliza.observaciones || '',
  } : {
    plan_id:'', valor_cuota:'', dia_cobro:1,
    fecha_inicio: new Date().toISOString().split('T')[0], observaciones:'',
  })

  const [busqTit, setBusqTit]       = useState(poliza?.titular_nombre || '')
  const [candTit, setCandTit]       = useState([])
  const [titularId, setTitularId]   = useState(poliza?.titular_id || '')
  const [bens, setBens]             = useState([])      // [{tercero_id, nombre, parentesco}]
  const [busqBen, setBusqBen]       = useState('')
  const [candBen, setCandBen]       = useState([])
  const [parBen, setParBen]         = useState('hijo')
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')

  const planActual = planes.find(p => p.id === form.plan_id)

  // Auto-completar cuota con valor del plan
  useEffect(() => {
    if (planActual && !poliza) {
      setForm(p => ({ ...p, valor_cuota: planActual.valor_mensual }))
    }
  }, [form.plan_id])

  useEffect(() => {
    if (busqTit.length < 2) return setCandTit([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqTit)}`)
      setCandTit(r.data.data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [busqTit])

  useEffect(() => {
    if (busqBen.length < 1) return setCandBen([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqBen)}`)
      setCandBen((r.data.data || []).filter(c => c.id !== titularId && !bens.find(b => b.tercero_id === c.id)))
    }, 300)
    return () => clearTimeout(t)
  }, [busqBen, titularId, bens])

  const agregarBen = (t) => {
    setBens(p => [...p, { tercero_id:t.id, nombre:`${t.nombres||''} ${t.apellidos||''}`.trim(),
      doc:`${t.tipo_doc_sigla} ${t.numero_documento}`, parentesco: parBen }])
    setBusqBen(''); setCandBen([])
  }

  const guardar = async () => {
    setErr('')
    if (!titularId)      return setErr('Seleccione el titular de la póliza.')
    if (!form.plan_id)   return setErr('Seleccione un plan.')
    if (!form.valor_cuota || +form.valor_cuota <= 0) return setErr('Ingrese el valor de la cuota mensual.')
    if (planActual && bens.length > planActual.max_beneficiarios)
      return setErr(`El plan "${planActual.nombre}" permite máximo ${planActual.max_beneficiarios} beneficiarios.`)
    setSaving(true)
    try {
      if (poliza) {
        await api.put(`/polizas/${poliza.id}`, form)
        toast.success('Póliza actualizada con éxito')
      } else {
        const res = await api.post('/polizas', { ...form, titular_id: titularId, beneficiarios: bens })
        const costoAfiliacion = Number(res.data.data?.costo_afiliacion || 0)
        toast.success(
          costoAfiliacion > 0
            ? `Póliza afiliada con éxito. Recuerda cobrar el costo de afiliación de ${fmt(costoAfiliacion)} (primera vez).`
            : 'Póliza afiliada con éxito'
        )
      }
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al guardar'
      setErr(msg)
      toast.error(msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="pl-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pl-modal">
        <div className="pl-mhead">
          <div>
            <div className="pl-mtitle">{poliza ? `Editar póliza #${poliza.numero}` : 'Nueva póliza'}</div>
            <div className="pl-msub">Previsión funeraria — registro de afiliación</div>
          </div>
          <button className="pl-mclose" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="pl-mbody">
          {err && <div className="pl-alert err" style={{ marginBottom:16 }}><AlertTriangle size={13}/>{err}</div>}

          {!poliza && (
            <>
              <div className="pl-section">Titular de la póliza</div>
              <div className="pl-field">
                <label>Titular <span className="pl-req">*</span></label>
                <div style={{ position:'relative' }}>
                  <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                    top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <input value={busqTit} onChange={e => { setBusqTit(e.target.value); setTitularId('') }}
                    placeholder="Nombre o documento…" style={{ paddingLeft:30 }}/>
                </div>
                {titularId && <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>✓ Titular seleccionado</span>}
                {candTit.length > 0 && !titularId && (
                  <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                    maxHeight:150, overflowY:'auto', background:'#fff', marginTop:4 }}>
                    {candTit.map((c,i) => (
                      <div key={c.id}
                        onClick={() => { setTitularId(c.id); setBusqTit(`${c.nombres||''} ${c.apellidos||''}`.trim()); setCandTit([]) }}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
                          borderBottom:i<candTit.length-1?'1px solid #F4F5FA':'none', transition:'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background='#ECFDF5'}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                          background:'linear-gradient(135deg,#059669,#047857)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:800, color:'#fff' }}>
                          {(c.nombres?.[0]||'?').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                          <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pl-section" style={{ marginTop: poliza ? 0 : 6 }}>Plan y pago</div>
          <div className="pl-field">
            <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>Plan de póliza <span className="pl-req">*</span></span>
              {esAdmin && (
                <a href="/polizas/planes" target="_blank" rel="noopener"
                  style={{ fontSize:11, color:'#059669', fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
                  <Settings size={11}/> Administrar planes
                </a>
              )}
            </label>
            {planes.length === 0 ? (
              <div style={{ padding:'10px 14px', background:'#fefce8', border:'1.5px solid #fde68a', borderRadius:8, fontSize:13, color:'#92400e' }}>
                No hay planes activos.{' '}
                {esAdmin && (
                  <a href="/polizas/planes" target="_blank" rel="noopener"
                    style={{ color:'#059669', fontWeight:700, textDecoration:'underline' }}>
                    Crear un plan →
                  </a>
                )}
              </div>
            ) : (
              <select value={form.plan_id} onChange={e => setForm(p => ({...p, plan_id:e.target.value}))}>
                <option value="">— Seleccione un plan —</option>
                {planes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {fmt(p.valor_mensual)}/mes · máx {p.max_beneficiarios} beneficiarios
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Previsualización del plan */}
          {planActual && (
            <div style={{ background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'1.5px solid #A7F3D0',
              borderRadius:12, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#059669', letterSpacing:.5,
                textTransform:'uppercase', marginBottom:8 }}>Cobertura del plan</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                <CoberturaTag ok label={`Ataúd ${planActual.cubre_ataud}`}/>
                <CoberturaTag ok label={`Velación ${planActual.cubre_velacion_h}h`}/>
                <CoberturaTag ok={planActual.cubre_traslado_local}   label="Traslado local"/>
                <CoberturaTag ok={planActual.cubre_traslado_nacional} label="Traslado nacional"/>
                <CoberturaTag ok={planActual.cubre_flores}     label="Flores"/>
                <CoberturaTag ok={planActual.cubre_cremacion}  label="Cremación"/>
                <CoberturaTag ok={planActual.cubre_tramites}   label="Trámites"/>
                <CoberturaTag ok={planActual.cubre_lapida}     label="Lápida"/>
                {Array.isArray(planActual.coberturas_extra) && planActual.coberturas_extra.map((c, i) => (
                  <CoberturaTag key={i} ok={c.incluido !== false} label={c.nombre}/>
                ))}
              </div>
              <div style={{ fontSize:11, color:'#065F46', marginTop:8, fontWeight:600 }}>
                ⏳ Carencia: {planActual.meses_carencia} meses · 👥 Máx. beneficiarios: {planActual.max_beneficiarios}
              </div>
            </div>
          )}

          <div className="pl-grid3">
            <div className="pl-field" style={{ marginBottom:0 }}>
              <label>Cuota mensual <span className="pl-req">*</span></label>
              <input type="number" min="0" value={form.valor_cuota}
                onChange={e => setForm(p => ({...p, valor_cuota:e.target.value}))} placeholder="0"/>
            </div>
            <div className="pl-field" style={{ marginBottom:0 }}>
              <label>Día de cobro</label>
              <input type="number" min="1" max="28" value={form.dia_cobro}
                onChange={e => setForm(p => ({...p, dia_cobro:+e.target.value}))}/>
            </div>
            <div className="pl-field" style={{ marginBottom:0 }}>
              <label>Fecha de inicio</label>
              <input type="date" value={form.fecha_inicio}
                onChange={e => setForm(p => ({...p, fecha_inicio:e.target.value}))}/>
            </div>
          </div>

          {/* Beneficiarios (solo en creación) */}
          {!poliza && (
            <>
              <div className="pl-section" style={{ marginTop:18 }}>
                Beneficiarios ({bens.length}/{planActual?.max_beneficiarios || '?'})
              </div>
              <div className="pl-grid2" style={{ marginBottom:10 }}>
                <div className="pl-field" style={{ marginBottom:0 }}>
                  <label>Buscar persona</label>
                  <div style={{ position:'relative' }}>
                    <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                      top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                    <input value={busqBen} onChange={e => setBusqBen(e.target.value)}
                      placeholder="Nombre o documento…" style={{ paddingLeft:30 }}
                      disabled={!titularId}/>
                  </div>
                </div>
                <div className="pl-field" style={{ marginBottom:0 }}>
                  <label>Parentesco</label>
                  <select value={parBen} onChange={e => setParBen(e.target.value)} disabled={!titularId}>
                    {PARENTESCOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              {candBen.length > 0 && (
                <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                  maxHeight:130, overflowY:'auto', background:'#fff', marginBottom:10 }}>
                  {candBen.map((c,i) => (
                    <div key={c.id} onClick={() => agregarBen(c)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                        cursor:'pointer', borderBottom:i<candBen.length-1?'1px solid #F4F5FA':'none',
                        transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#ECFDF5'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                        background:'linear-gradient(135deg,#0891B2,#0F5E7A)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:800, color:'#fff' }}>
                        {(c.nombres?.[0]||'?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                        <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {bens.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                  {bens.map((b, i) => (
                    <div key={b.tercero_id} className="pl-ben-item" style={{ padding:'8px 12px' }}>
                      <Heart size={14} color="#0891B2"/>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:12.5, fontWeight:700 }}>{b.nombre}</span>
                        <span style={{ fontSize:11, color:'#9CA3AF', marginLeft:8 }}>
                          {b.parentesco} · {b.doc}
                        </span>
                      </div>
                      <button onClick={() => setBens(p => p.filter((_,j) => j !== i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444' }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="pl-field" style={{ marginTop:4 }}>
            <label>Observaciones</label>
            <input value={form.observaciones} placeholder="Notas de la afiliación…"
              onChange={e => setForm(p => ({...p, observaciones:e.target.value}))}/>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
            <button className="pl-btn pl-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="pl-btn pl-btn-primary" onClick={guardar} disabled={saving}>
              {saving ? <Loader2 size={14} className="pl-spin"/> : <ShieldCheck size={14}/>}
              {poliza ? 'Guardar cambios' : 'Afiliar póliza'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Pago ─────────────────────────────────────────────────────────────

function ModalPago({ poliza, onClose, onSaved }) {
  const hoy = new Date()
  const { formas, label: fmtMetodo } = useFormasPago()

  const cuota = Number(poliza.valor_cuota) || 0
  const mesDesde = calcularMesDesde(poliza)
  const mesesPendientes = listarMesesDesde(mesDesde, 18)
  const mesSugerido = mesesPendientes[0]?.iso || `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`

  const [modo, setModo] = useState('mes') // 'mes' | 'monto'
  const [form, setForm] = useState({
    mes_correspondiente: mesSugerido,
    monto: poliza.valor_cuota || '',
    metodo_pago: 'efectivo',
    referencia: '',
    fecha_pago: hoy.toISOString().split('T')[0],
  })
  const [montoTotal, setMontoTotal] = useState(poliza.valor_cuota || '')
  const [archivo,      setArchivo]      = useState(null)
  const [archivoNombre,setArchivoNombre]= useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const fileRef = useRef(null)

  // Meses que ya tienen un pago registrado en esta póliza (para no ofrecerlos
  // ni chocar con ellos) y los que el usuario activó/desactivó manualmente.
  const [mesesPagadosSet, setMesesPagadosSet] = useState(new Set())
  const [mesesActivos, setMesesActivos] = useState(new Set())
  const usuarioTocoMeses = useRef(false)

  useEffect(() => {
    api.get(`/polizas/${poliza.id}`).then(res => {
      const pagos = res.data?.data?.pagos || []
      setMesesPagadosSet(new Set(pagos.map(p => p.mes_correspondiente.slice(0,10))))
    }).catch(() => {})
  }, [poliza.id])

  const formaSel = formas.find(f => f.codigo === form.metodo_pago) || null

  // Candidatos: próximos meses libres (saltando los ya pagados) a partir de mesDesde
  const candidatos = (() => {
    if (!mesDesde) return []
    const out = []
    let { anio, mes } = mesDesde
    while (out.length < 24) {
      const iso = `${anio}-${String(mes+1).padStart(2,'0')}-01`
      if (!mesesPagadosSet.has(iso)) out.push({ iso, label: `${MESES[mes]} ${anio}` })
      mes++; if (mes>11){mes=0;anio++}
    }
    return out
  })()

  // Previsualización del reparto: cuántos meses completos cubre + abono parcial sobrante.
  const total = Number(montoTotal)
  const mesesCompletosSugeridos = (total > 0 && cuota > 0) ? Math.floor((total + 0.005) / cuota) : 0

  // Inicializa/ajusta la selección activa a los primeros N candidatos cuando cambia el monto,
  // pero respeta lo que el usuario haya desactivado manualmente después.
  useEffect(() => {
    if (!candidatos.length) return
    if (usuarioTocoMeses.current) return // el usuario ya ajustó manualmente, no pisarlo
    setMesesActivos(new Set(candidatos.slice(0, mesesCompletosSugeridos).map(c => c.iso)))
  }, [mesesCompletosSugeridos, candidatos.length])

  const toggleMes = (iso) => {
    usuarioTocoMeses.current = true
    setMesesActivos(prev => {
      const next = new Set(prev)
      next.has(iso) ? next.delete(iso) : next.add(iso)
      return next
    })
  }

  const preview = (() => {
    if (!(total > 0) || !(cuota > 0)) return null
    const seleccionados = candidatos.filter(c => mesesActivos.has(c.iso))
    let sobrante = Math.round((total - seleccionados.length * cuota) * 100) / 100
    if (sobrante < 0.5) sobrante = 0
    // Si lo que sobra alcanza para otra cuota completa, no es un "abono parcial":
    // el usuario debe activar un mes más en la lista (evita mostrar un "falta" negativo).
    const sobranteAlcanzaOtroMes = sobrante >= cuota
    const mesAbono = (sobrante > 0 && !sobranteAlcanzaOtroMes) ? candidatos.find(c => !mesesActivos.has(c.iso)) : null
    return { mesesCompletos: seleccionados.length, sobrante, sobranteAlcanzaOtroMes, mesesCubiertos: seleccionados, mesAbono }
  })()

  const onArchivoChange = e => {
    const f = e.target.files?.[0]
    if (f) { setArchivo(f); setArchivoNombre(f.name) }
  }

  const guardar = async () => {
    setErr('')
    if (formaSel?.requiere_referencia && !form.referencia.trim())
      return setErr(`La forma de pago "${formaSel.nombre}" requiere número de referencia.`)
    if (formaSel?.requiere_soporte && !archivo)
      return setErr(`La forma de pago "${formaSel.nombre}" requiere adjuntar el soporte de pago.`)
    setSaving(true)
    try {
      let res
      if (modo === 'monto') {
        if (!(Number(montoTotal) > 0)) { setSaving(false); return setErr('Ingresa un monto mayor a 0') }
        if (preview?.sobranteAlcanzaOtroMes) { setSaving(false); return setErr('El sobrante alcanza para otro mes completo — actívalo en la lista antes de registrar el pago.') }
        res = await api.post('/pagos/poliza', {
          poliza_id: poliza.id,
          monto_total: Number(montoTotal),
          meses_seleccionados: preview?.mesesCubiertos?.map(m => m.iso) || [],
          mes_abono: preview?.mesAbono?.iso || null,
          metodo_pago: form.metodo_pago,
          referencia: form.referencia,
          notas: '',
        })
        const soporteId = res.data?.recibo?.id || res.data?.abono_parcial?.id
        if (archivo && soporteId) {
          const fd = new FormData(); fd.append('file', archivo)
          await api.post(`/pagos/${soporteId}/soporte?tabla=poliza`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
        const p = res.data
        if (p.meses_pagados > 0 && p.abono_parcial) {
          toast.success(`Pago registrado: ${p.meses_pagados} mes(es) completo(s) + abono parcial de ${fmt(p.abono_parcial.monto)} para ${mesLabel(p.abono_parcial.mes)}`)
        } else if (p.meses_pagados > 0) {
          toast.success(`Pago registrado: ${p.meses_pagados} mes(es) completo(s) cubierto(s)`)
        } else {
          toast.success(`Abono parcial de ${fmt(p.abono_parcial.monto)} registrado para ${mesLabel(p.abono_parcial.mes)}`)
        }
      } else {
        res = await api.post(`/polizas/${poliza.id}/pagos`, form)
        if (archivo && res.data?.pago?.id) {
          const fd = new FormData(); fd.append('file', archivo)
          await api.post(`/pagos/${res.data.pago.id}/soporte?tabla=poliza`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
        toast.success('Pago registrado con éxito')
      }
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al registrar pago'
      setErr(msg)
      toast.error(msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="pl-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pl-modal">
        <div className="pl-mhead">
          <div>
            <div className="pl-mtitle">Registrar pago — Póliza #{poliza.numero}</div>
            <div className="pl-msub">{poliza.titular_nombre} · Cuota: {fmt(poliza.valor_cuota)}/mes</div>
          </div>
          <button className="pl-mclose" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="pl-mbody">
          {err && <div className="pl-alert err" style={{ marginBottom:14 }}><AlertTriangle size={13}/>{err}</div>}
          {poliza.meses_mora > 0 && (
            <div className="pl-alert warn" style={{ marginBottom:14 }}>
              <AlertCircle size={14}/>
              Esta póliza tiene <strong>{poliza.meses_mora} mes{poliza.meses_mora>1?'es':''} de mora</strong>.
              Se recomienda registrar los pagos pendientes mes por mes.
            </div>
          )}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <button type="button" onClick={() => setModo('mes')}
              style={{ flex:1, padding:'9px 12px', borderRadius:10, cursor:'pointer', fontSize:12.5, fontWeight:700,
                border: modo==='mes' ? '1.5px solid #6366F1' : '1.5px solid #E2E5F0',
                background: modo==='mes' ? '#EEF2FF' : '#fff', color: modo==='mes' ? '#4338CA' : '#6B7280' }}>
              Un mes específico
            </button>
            <button type="button" onClick={() => setModo('monto')}
              style={{ flex:1, padding:'9px 12px', borderRadius:10, cursor:'pointer', fontSize:12.5, fontWeight:700,
                border: modo==='monto' ? '1.5px solid #6366F1' : '1.5px solid #E2E5F0',
                background: modo==='monto' ? '#EEF2FF' : '#fff', color: modo==='monto' ? '#4338CA' : '#6B7280' }}>
              Monto total (varios meses)
            </button>
          </div>

          {modo === 'mes' ? (
            <div className="pl-grid2">
              <div className="pl-field">
                <label>Mes que cubre <span className="pl-req">*</span></label>
                <select value={form.mes_correspondiente}
                  onChange={e => setForm(p => ({...p, mes_correspondiente: e.target.value}))}>
                  {mesesPendientes.map((m, i) => (
                    <option key={m.iso} value={m.iso}>
                      {m.label}{i === 0 ? ' (siguiente pendiente)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pl-field">
                <label>Fecha de pago</label>
                <input type="date" value={form.fecha_pago}
                  onChange={e => setForm(p => ({...p, fecha_pago:e.target.value}))}/>
              </div>
            </div>
          ) : (
            <div className="pl-field">
              <label>Monto total a pagar <span className="pl-req">*</span></label>
              <input type="number" min="0" value={montoTotal}
                onChange={e => setMontoTotal(e.target.value)}
                placeholder={`Ej: ${cuota * 3} para pagar 3 meses`}/>

              {candidatos.length > 0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:11.5, color:'#6B7280', fontWeight:700, marginBottom:6 }}>
                    Activa o desactiva los meses a pagar:
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:130, overflowY:'auto', padding:2 }}>
                    {candidatos.map(m => {
                      const activo = mesesActivos.has(m.iso)
                      const esAbono = !activo && preview?.mesAbono?.iso === m.iso
                      return (
                        <button type="button" key={m.iso} onClick={() => toggleMes(m.iso)}
                          style={{
                            padding:'5px 10px', borderRadius:7, fontSize:11.5, fontWeight:700, cursor:'pointer',
                            border: activo ? '1.5px solid #6366F1' : esAbono ? '1.5px solid #F59E0B' : '1.5px solid #E2E5F0',
                            background: activo ? '#EEF2FF' : esAbono ? '#FFFBEB' : '#fff',
                            color: activo ? '#4338CA' : esAbono ? '#B45309' : '#9CA3AF',
                          }}>
                          {activo ? '✓ ' : ''}{m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {preview && (
                <div style={{ marginTop:10, padding:'10px 12px', background:'#F5F3FF', border:'1px solid #DDD6FE',
                  borderRadius:9, fontSize:12.5, color:'#5B21B6', lineHeight:1.6 }}>
                  {preview.mesesCompletos > 0 ? (
                    <div>
                      ✅ Se pagarán <strong>{preview.mesesCompletos} mes{preview.mesesCompletos>1?'es':''}</strong> ({fmt(cuota)} c/u = {fmt(preview.mesesCompletos*cuota)})
                    </div>
                  ) : (
                    <div>Ningún mes activo — todo el monto se registrará como abono parcial</div>
                  )}
                  {preview.sobrante > 0 && preview.sobranteAlcanzaOtroMes ? (
                    <div style={{ marginTop:6, color:'#B45309' }}>
                      ⚠️ Sobran <strong>{fmt(preview.sobrante)}</strong> — eso alcanza para otro mes completo. Actívalo en la lista de arriba.
                    </div>
                  ) : preview.sobrante > 0 && preview.mesAbono && (
                    <div style={{ marginTop:6 }}>
                      💰 Sobran <strong>{fmt(preview.sobrante)}</strong> — abono parcial para <strong>{preview.mesAbono.label}</strong> (faltarían {fmt(cuota - preview.sobrante)} para completar esa cuota)
                    </div>
                  )}
                  {preview.mesesCompletos === 0 && preview.sobrante === 0 && (
                    <div style={{ color:'#DC2626' }}>El monto no alcanza ni para un abono parcial</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pl-grid2">
            {modo === 'mes' && (
              <div className="pl-field">
                <label>Monto <span className="pl-req">*</span></label>
                <input type="number" min="0" value={form.monto}
                  onChange={e => setForm(p => ({...p, monto:e.target.value}))}/>
              </div>
            )}
            <div className="pl-field">
              <label>Forma de pago</label>
              <select value={form.metodo_pago}
                onChange={e => { setForm(p => ({...p, metodo_pago:e.target.value, referencia:''})); setArchivo(null); setArchivoNombre('') }}>
                {formas.map(f => <option key={f.codigo} value={f.codigo}>{f.icono} {f.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Referencia — condicional */}
          {formaSel?.requiere_referencia && (
            <div className="pl-field">
              <label>N° de referencia <span className="pl-req">*</span></label>
              <input value={form.referencia}
                placeholder={`Código de ${formaSel.nombre}…`}
                style={{ borderColor: !form.referencia.trim() ? '#FCA5A5' : undefined }}
                onChange={e => setForm(p => ({...p, referencia:e.target.value}))}/>
              {!form.referencia.trim() && (
                <span style={{ fontSize:11, color:'#EF4444', marginTop:2, display:'block' }}>
                  Obligatorio para {formaSel.nombre}
                </span>
              )}
            </div>
          )}

          {/* Input de archivo — siempre montado para que el ref funcione */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
            style={{ display:'none' }}
            onChange={onArchivoChange}
            onClick={e => { e.target.value = null }}
          />

          {/* Soporte — condicional */}
          {formaSel?.requiere_soporte && (
            <div className="pl-field">
              <label>Soporte de pago <span className="pl-req">*</span>
                <span style={{ color:'#9CA3AF', fontWeight:400, marginLeft:6 }}>PDF, JPG, PNG…</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border:`2px dashed ${archivo ? '#059669' : '#E2E5F0'}`,
                  borderRadius:10, padding:'12px 14px', cursor:'pointer',
                  background: archivo ? '#F0FDF4' : '#FAFBFF',
                  display:'flex', alignItems:'center', gap:10, transition:'all .15s' }}
                onMouseEnter={e => { if (!archivo) e.currentTarget.style.borderColor='#8B5CF6' }}
                onMouseLeave={e => { if (!archivo) e.currentTarget.style.borderColor= archivo ? '#059669' : '#E2E5F0' }}
              >
                {archivo
                  ? <><CheckCircle2 size={16} color="#059669"/>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#065F46' }}>{archivoNombre}</div>
                        <div style={{ fontSize:11, color:'#059669' }}>Listo para adjuntar</div>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); setArchivo(null); setArchivoNombre('') }}
                        style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                        <X size={13}/>
                      </button>
                    </>
                  : <><CreditCard size={16} color="#9CA3AF"/>
                      <span style={{ fontSize:12, color:'#6B7280' }}>Haz clic para adjuntar el comprobante</span>
                    </>
                }
              </div>
              {!archivo && (
                <span style={{ fontSize:11, color:'#EF4444', marginTop:3, display:'block' }}>
                  Obligatorio para pagos por {formaSel.nombre}
                </span>
              )}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
            <button className="pl-btn pl-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="pl-btn pl-btn-primary" onClick={guardar} disabled={saving}>
              {saving ? <Loader2 size={14} className="pl-spin"/> : <CreditCard size={14}/>}
              Registrar pago
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Ficha ───────────────────────────────────────────────────────────

function ModalFicha({ id, onClose, onEditar, onPagar, onCancelar, onReactivar }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('info')
  const [showBen, setShowBen] = useState(false)
  const [busqBen, setBusqBen] = useState('')
  const [candBen, setCandBen] = useState([])
  const [parBen, setParBen]   = useState('hijo')
  const [showTransf, setShowTransf]   = useState(false)
  const [busqTransf, setBusqTransf]   = useState('')
  const [candTransf, setCandTransf]   = useState([])
  const [nuevoTitular, setNuevoTitular] = useState(null)
  const [motivoTransf, setMotivoTransf] = useState('')
  const [savingTransf, setSavingTransf] = useState(false)
  const [historialTransf, setHistorialTransf] = useState([])
  const [cobrandoAfiliacion, setCobrandoAfiliacion] = useState(false)
  const { usuario } = useAuthStore()
  const { label: fmtMetodo } = useFormasPago()
  const esEditor = ['superadmin','administrador','operador','asesor_comercial'].includes(usuario?.rol)
  const esAdmin  = ['superadmin','administrador'].includes(usuario?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get(`/polizas/${id}`); setData(r.data.data) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const cobrarAfiliacion = async () => {
    setCobrandoAfiliacion(true)
    try {
      await api.post(`/polizas/${id}/cobrar-afiliacion`, { metodo_pago: 'efectivo' })
      toast.success('Costo de afiliación cobrado')
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cobrar la afiliación')
    } finally {
      setCobrandoAfiliacion(false)
    }
  }

  useEffect(() => {
    if (busqBen.length < 1) return setCandBen([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqBen)}`)
      setCandBen((r.data.data||[]).filter(c =>
        c.id !== data?.titular_id &&
        !(data?.beneficiarios||[]).find(b => b.tercero_id === c.id && b.activo)
      ))
    }, 300)
    return () => clearTimeout(t)
  }, [busqBen, data])

  const agregarBen = async (t) => {
    try {
      await api.post(`/polizas/${id}/beneficiarios`, { tercero_id:t.id, parentesco:parBen })
      toast.success('Beneficiario agregado con éxito')
      setBusqBen(''); setCandBen([]); setShowBen(false); cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error')
    }
  }

  const quitarBen = async (benId) => {
    try {
      await api.delete(`/polizas/${id}/beneficiarios/${benId}`)
      toast.success('Beneficiario eliminado con éxito')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error')
    }
  }

  useEffect(() => {
    if (busqTransf.length < 2) return setCandTransf([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqTransf)}`)
      setCandTransf((r.data.data||[]).filter(c => c.id !== data?.titular_id))
    }, 300)
    return () => clearTimeout(t)
  }, [busqTransf, data])

  const cargarHistorialTransferencias = useCallback(async () => {
    try {
      const r = await api.get(`/polizas/${id}/transferencias`)
      setHistorialTransf(r.data.data || [])
    } catch { /* silencioso */ }
  }, [id])
  useEffect(() => { cargarHistorialTransferencias() }, [cargarHistorialTransferencias])

  const confirmarTransferencia = async () => {
    if (!nuevoTitular) return toast.error('Seleccione el nuevo titular')
    setSavingTransf(true)
    try {
      await api.patch(`/polizas/${id}/titular`, {
        nuevo_titular_id: nuevoTitular.id,
        motivo: motivoTransf || undefined,
      })
      toast.success('Titular transferido con éxito')
      setShowTransf(false); setNuevoTitular(null); setBusqTransf(''); setMotivoTransf('')
      cargar(); cargarHistorialTransferencias()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al transferir el titular')
    } finally { setSavingTransf(false) }
  }

  const TABS = [
    { key:'info',      icon:'🛡️',  label:'Información' },
    { key:'bens',      icon:'👨‍👩‍👧', label:`Beneficiarios (${data?.total_beneficiarios||0})` },
    { key:'pagos',     icon:'💳',  label:`Pagos (${data?.total_pagos||0})` },
    { key:'cobertura', icon:'✅',  label:'Cobertura' },
  ]

  const PldField = ({ label, value, color }) => (
    <div className="pld-field">
      <span className="pld-label">{label}</span>
      <span className={`pld-value${value ? '' : ' muted'}`} style={color ? { color } : {}}>
        {value || '—'}
      </span>
    </div>
  )

  const PldCard = ({ icon, title, children, accentColor = '#059669', accentBg = 'linear-gradient(90deg,#ECFDF5,#F0FDF4)', headerRight }) => (
    <div className="pld-card">
      <div className="pld-card-head" style={{ background: accentBg }}>
        <span className="pld-card-icon">{icon}</span>
        <span className="pld-card-title" style={{ color: accentColor }}>{title}</span>
        {headerRight && <div style={{ marginLeft:'auto' }}>{headerRight}</div>}
      </div>
      <div className="pld-card-body">{children}</div>
    </div>
  )

  return (
    <>
    <div className="pl-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pl-drawer">

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#047857 0%,#059669 60%,#10B981 100%)',
          padding:'18px 24px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ width:50, height:50, borderRadius:14, background:'rgba(255,255,255,.2)',
            border:'2px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center',
            justifyContent:'center', flexShrink:0 }}>
            <ShieldCheck size={22} color="#fff"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>
              Póliza #{loading ? '…' : data?.numero}
            </div>
            <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {loading ? 'Cargando…' : data?.titular_nombre}
            </div>
            {!loading && (
              <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
                <span style={{ background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.3)',
                  padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff' }}>
                  {data.plan_nombre}
                </span>
                <span style={{ background: data.meses_mora > 0 ? 'rgba(220,38,38,.8)' : 'rgba(255,255,255,.18)',
                  border:'1px solid rgba(255,255,255,.3)',
                  padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff' }}>
                  {data.estado}{data.meses_mora > 0 ? ` · ${data.meses_mora} mes mora` : ''}
                </span>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {!loading && esEditor && !['CANCELADA','EJECUTADA'].includes(data?.estado) && (
              <>
                <button onClick={() => onPagar(data)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
                    background:'rgba(255,255,255,.18)', border:'1.5px solid rgba(255,255,255,.35)',
                    borderRadius:10, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                  <CreditCard size={13}/> Pagar cuota
                </button>
                <button onClick={() => { onClose(); onEditar(data) }}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px',
                    background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.25)',
                    borderRadius:10, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                  <Edit2 size={13}/> Editar
                </button>
              </>
            )}
            <button onClick={onClose}
              style={{ width:36, height:36, borderRadius:10, border:'1.5px solid rgba(255,255,255,.3)',
                background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center',
                justifyContent:'center', cursor:'pointer', color:'#fff' }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Sidebar tabs */}
          <div className="pl-drawer-sidebar">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`pl-drawer-stab${tab === t.key ? ' active' : ''}`}>
                <span className="stab-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="pl-drawer-content">
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center',
                height:200, flexDirection:'column', gap:12 }}>
                <Loader2 size={32} color="#059669" className="pl-spin"/>
                <span style={{ fontSize:13, color:'#9CA3AF' }}>Cargando póliza…</span>
              </div>

            ) : tab === 'info' ? (
              <>
                <div className="pld-grid2" style={{ marginBottom:16 }}>
                  <PldCard icon="👤" title="Titular" headerRight={
                    esAdmin && !['CANCELADA','EJECUTADA'].includes(data.estado) && (
                      <button onClick={() => setShowTransf(true)}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
                          background:'#ECFDF5', border:'1.5px solid #A7F3D0', borderRadius:8,
                          color:'#047857', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        <ArrowLeftRight size={12}/> Transferir
                      </button>
                    )
                  }>
                    <div className="pld-grid2" style={{ marginBottom:10 }}>
                      <PldField label="Nombre completo" value={data.titular_nombre}/>
                      <PldField label="Documento" value={data.titular_doc}/>
                    </div>
                    <div className="pld-grid2" style={{ marginBottom:10 }}>
                      <PldField label="Teléfono" value={data.titular_tel}/>
                      <PldField label="Email" value={data.titular_email}/>
                    </div>
                    <PldField label="Asesor" value={data.asesor_nombre}/>
                    {historialTransf.length > 0 && (
                      <div style={{ marginTop:12, paddingTop:10, borderTop:'1px dashed #D1FAE5' }}>
                        <span className="pld-label">Historial de transferencias</span>
                        {historialTransf.map(h => (
                          <div key={h.id} style={{ fontSize:11.5, color:'#374151', marginTop:6, lineHeight:1.5 }}>
                            <strong>{h.titular_anterior_nombre}</strong> → <strong>{h.titular_nuevo_nombre}</strong>
                            <div style={{ color:'#9CA3AF' }}>
                              {new Date(h.creado_en).toLocaleDateString('es-CO')} · {h.usuario_nombre}
                              {h.motivo && ` · "${h.motivo}"`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </PldCard>

                  <PldCard icon="📊" title="Estado de la póliza">
                    <div style={{ marginBottom:10 }}>
                      <span className="pld-label">Estado</span>
                      <div style={{ marginTop:4 }}>
                        <EstadoChip estado={data.estado} mora={data.meses_mora}/>
                      </div>
                    </div>
                    <div className="pld-grid2" style={{ marginBottom:10 }}>
                      <PldField label="Plan" value={data.plan_nombre}/>
                      <PldField label="Cuota mensual" value={`${fmt(data.valor_cuota)}/mes`} color="#059669"/>
                    </div>
                    <div className="pld-grid2" style={{ marginBottom:10 }}>
                      <PldField label="Día de cobro" value={`Día ${data.dia_cobro} de cada mes`}/>
                      <PldField label="Último pago" value={fmtDate(data.ultimo_pago)}/>
                    </div>
                    <div className="pld-grid2">
                      <PldField label="Fecha inicio" value={fmtDate(data.fecha_inicio)}/>
                      <div className="pld-field">
                        <span className="pld-label">Fin carencia</span>
                        <span className="pld-value" style={{ color: new Date() < new Date(data.fecha_fin_carencia) ? '#F59E0B' : '#059669' }}>
                          {fmtDate(data.fecha_fin_carencia)} {new Date() < new Date(data.fecha_fin_carencia) ? '⏳' : '✓'}
                        </span>
                      </div>
                    </div>
                  </PldCard>
                </div>

                {esAdmin && !['CANCELADA','EJECUTADA'].includes(data.estado) && (
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => onCancelar(data.id)}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
                        background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:10,
                        color:'#DC2626', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                      <Ban size={14}/> Cancelar póliza
                    </button>
                  </div>
                )}

                {esAdmin && data.estado === 'CANCELADA' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {data.motivo_cancelacion && (
                      <div style={{ fontSize:12, color:'#6B7280' }}>
                        <strong>Motivo de cancelación:</strong> {data.motivo_cancelacion}
                      </div>
                    )}
                    <button onClick={() => onReactivar(data.id)}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
                        background:'#ECFDF5', border:'1.5px solid #A7F3D0', borderRadius:10,
                        color:'#059669', fontSize:12.5, fontWeight:700, cursor:'pointer', width:'fit-content' }}>
                      <ShieldCheck size={14}/> Reactivar póliza
                    </button>
                  </div>
                )}
              </>

            ) : tab === 'bens' ? (
              <PldCard icon="👨‍👩‍👧" title="Beneficiarios"
                headerRight={
                  esEditor && !['CANCELADA','EJECUTADA'].includes(data.estado) &&
                  (data.beneficiarios||[]).filter(b=>b.activo).length < data.max_beneficiarios ? (
                    <button onClick={() => setShowBen(v => !v)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
                        background:'#059669', border:'none', borderRadius:8,
                        color:'#fff', fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
                      <PlusCircle size={12}/> Agregar
                    </button>
                  ) : null
                }>
                <div style={{ fontSize:12, color:'#6B7280', fontWeight:600, marginBottom:12 }}>
                  {(data.beneficiarios||[]).filter(b=>b.activo).length} de {data.max_beneficiarios} beneficiarios usados
                </div>

                {showBen && (
                  <div style={{ background:'#F0FDF4', border:'1.5px solid #A7F3D0', borderRadius:12,
                    padding:14, marginBottom:14 }}>
                    <div className="pld-grid2" style={{ marginBottom:10 }}>
                      <div className="pl-field" style={{ marginBottom:0 }}>
                        <label>Buscar persona</label>
                        <div style={{ position:'relative' }}>
                          <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                          <input value={busqBen} onChange={e => setBusqBen(e.target.value)}
                            placeholder="Nombre o documento…" style={{ paddingLeft:30 }}/>
                        </div>
                      </div>
                      <div className="pl-field" style={{ marginBottom:0 }}>
                        <label>Parentesco</label>
                        <select value={parBen} onChange={e => setParBen(e.target.value)}>
                          {PARENTESCOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    {candBen.length > 0 && (
                      <div style={{ border:'1.5px solid #A7F3D0', borderRadius:10, overflow:'hidden',
                        maxHeight:130, overflowY:'auto', background:'#fff' }}>
                        {candBen.map((c,i) => (
                          <div key={c.id} onClick={() => agregarBen(c)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                              cursor:'pointer', borderBottom:i<candBen.length-1?'1px solid #F4F5FA':'none' }}
                            onMouseEnter={e => e.currentTarget.style.background='#ECFDF5'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                              background:'linear-gradient(135deg,#0891B2,#0F5E7A)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:800, color:'#fff' }}>
                              {(c.nombres?.[0]||'?').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                              <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(data.beneficiarios||[]).filter(b=>b.activo).length === 0 ? (
                  <div className="pl-empty" style={{ padding:32 }}>
                    <Heart size={28}/>
                    <p>Sin beneficiarios registrados</p>
                  </div>
                ) : (
                  (data.beneficiarios||[]).filter(b=>b.activo).map(b => (
                    <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                      background: b.ejecutado ? '#F8FAFC' : '#F0FDF4',
                      border:`1.5px solid ${b.ejecutado ? '#E2E8F0' : '#A7F3D0'}`,
                      borderRadius:12, marginBottom:8 }}>
                      <div style={{ width:42, height:42, borderRadius:12, flexShrink:0,
                        background: b.ejecutado ? 'linear-gradient(135deg,#64748B,#475569)' : 'linear-gradient(135deg,#059669,#047857)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:15, fontWeight:800, color:'#fff' }}>
                        {b.ejecutado ? '👼' : (b.nombre[0]||'?').toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13.5, fontWeight:800, color:'#0F1035' }}>{b.nombre}</div>
                        <div style={{ fontSize:11.5, color:'#6B7280', marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                          <span style={{ background:'#CFFAFE', color:'#0891B2', padding:'2px 7px',
                            borderRadius:6, fontSize:10, fontWeight:700 }}>{b.parentesco}</span>
                          <span>{b.tipo_doc_sigla} {b.documento}</span>
                          {b.ejecutado && <span style={{ color:'#EF4444', fontWeight:700 }}>✓ Ejecutado {fmtDate(b.fecha_ejecucion)}</span>}
                        </div>
                      </div>
                      {!b.ejecutado && esEditor && (
                        <button onClick={() => quitarBen(b.id)}
                          style={{ width:30, height:30, borderRadius:8, border:'1.5px solid #FECACA',
                            background:'#FEF2F2', display:'flex', alignItems:'center',
                            justifyContent:'center', cursor:'pointer', color:'#EF4444' }}>
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </PldCard>

            ) : tab === 'pagos' ? (
              <>
                {Number(data.costo_afiliacion) > 0 && (
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                    padding:'14px 16px', borderRadius:12, marginBottom:14,
                    background: data.afiliacion_pagada ? '#F0FDF4' : '#FFFBEB',
                    border:`1.5px solid ${data.afiliacion_pagada ? '#A7F3D0' : '#FDE68A'}`,
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color: data.afiliacion_pagada ? '#047857' : '#B45309' }}>
                        {data.afiliacion_pagada
                          ? `Costo de afiliación pagado — ${fmt(data.costo_afiliacion)}`
                          : `Costo de afiliación pendiente — ${fmt(data.costo_afiliacion)}`}
                      </div>
                      <div style={{ fontSize:11.5, color:'#9CA3AF', marginTop:2 }}>
                        {data.afiliacion_pagada
                          ? `Pagado el ${fmtDate(data.afiliacion_fecha_pago)}`
                          : 'Se cobra una única vez, aparte de la cuota mensual (primera afiliación del titular).'}
                      </div>
                    </div>
                    {!data.afiliacion_pagada && esEditor && (
                      <button onClick={cobrarAfiliacion} disabled={cobrandoAfiliacion}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
                          background:'#B45309', border:'none', borderRadius:10, color:'#fff',
                          fontSize:12.5, fontWeight:700, cursor:'pointer', flexShrink:0,
                          opacity: cobrandoAfiliacion ? .6 : 1 }}>
                        {cobrandoAfiliacion ? <Loader2 size={13} className="pl-spin"/> : <CreditCard size={13}/>}
                        Cobrar afiliación
                      </button>
                    )}
                  </div>
                )}
              <PldCard icon="💳" title="Historial de pagos">
                {(data.pagos||[]).length === 0 ? (
                  <div className="pl-empty" style={{ padding:40 }}>
                    <CreditCard size={28}/>
                    <p>Sin pagos registrados</p>
                    <span>Use "Pagar cuota" para registrar el primer pago</span>
                  </div>
                ) : (
                  (data.pagos||[]).map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
                      background: p.anulado ? '#F8FAFC' : '#F0FDF4',
                      border:`1.5px solid ${p.anulado ? '#E2E8F0' : '#A7F3D0'}`,
                      borderRadius:12, marginBottom:8, flexWrap:'wrap' }}>
                      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                        background: p.anulado ? 'linear-gradient(135deg,#9CA3AF,#6B7280)' : 'linear-gradient(135deg,#059669,#10B981)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <CreditCard size={16} color="#fff"/>
                      </div>
                      <div style={{ flex:1, minWidth:160 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:14, fontWeight:800,
                            color: p.anulado ? '#9CA3AF' : '#065F46',
                            textDecoration: p.anulado ? 'line-through' : 'none' }}>
                            {fmt(p.monto)}
                          </span>
                          {p.anulado && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#FEE2E2', color:'#EF4444' }}>ANULADO</span>}
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#D1FAE5', color:'#059669', marginLeft:'auto' }}>
                            N° {String(p.numero_recibo).padStart(6,'0')}
                          </span>
                        </div>
                        <div style={{ fontSize:11.5, color:'#6B7280', marginTop:3, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                          <span style={{ background:'#EEF2FF', color:'#4F46E5', fontWeight:700, fontSize:10, padding:'2px 7px', borderRadius:6 }}>
                            {mesLabel(p.mes_correspondiente)}
                          </span>
                          <span>{fmtMetodo(p.metodo_pago)}</span>
                          <span>·</span>
                          <span>{fmtDate(p.fecha_pago)}</span>
                          {p.cajero && <><span>·</span><span>{p.cajero}</span></>}
                          {p.referencia && <span style={{ background:'#F3F4F6', padding:'1px 6px', borderRadius:5, fontSize:10.5, color:'#374151', fontWeight:600 }}>Ref: {p.referencia}</span>}
                        </div>
                      </div>
                      {p.soporte_url && (
                        <a href={`http://localhost:3001${p.soporte_url}`} target="_blank" rel="noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700,
                            color:'#4F46E5', background:'#EEF2FF', border:'1.5px solid #C7D2FE',
                            borderRadius:8, padding:'5px 10px', textDecoration:'none', flexShrink:0 }}>
                          <Eye size={12}/> Ver soporte
                        </a>
                      )}
                    </div>
                  ))
                )}
              </PldCard>
              </>

            ) : (
              <>
                <PldCard icon="✅" title={`Plan: ${data.plan_nombre}`}
                  accentColor="#059669" accentBg="linear-gradient(90deg,#ECFDF5,#D1FAE5)">
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    <CoberturaTag ok label={`Ataúd ${data.cubre_ataud}`}/>
                    <CoberturaTag ok label={`Velación ${data.cubre_velacion_h} horas`}/>
                    <CoberturaTag ok={data.cubre_traslado_local}    label="Traslado local"/>
                    <CoberturaTag ok={data.cubre_traslado_nacional} label="Traslado nacional"/>
                    <CoberturaTag ok={data.cubre_flores}    label="Flores y coronas"/>
                    <CoberturaTag ok={data.cubre_cremacion} label="Cremación"/>
                    <CoberturaTag ok={data.cubre_tramites}  label="Trámites legales"/>
                    <CoberturaTag ok={data.cubre_lapida}    label="Lápida"/>
                    {Array.isArray(data.coberturas_extra) && data.coberturas_extra.map((c, i) => (
                      <CoberturaTag key={i} ok={c.incluido !== false} label={c.nombre}/>
                    ))}
                  </div>
                </PldCard>

                <div className="pld-grid2">
                  <PldCard icon="👥" title="Afiliados">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <PldField label="Tipo de plan" value={data.plan_tipo}/>
                      <PldField label="Máx. beneficiarios" value={`${data.max_beneficiarios} personas`}/>
                      <PldField label="Afiliados actuales" value={`${data.total_beneficiarios} personas`}/>
                    </div>
                  </PldCard>

                  <PldCard icon="⏳" title="Período de carencia">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <PldField label="Duración" value={`${data.meses_carencia} meses`}/>
                      <PldField label="Desde" value={fmtDate(data.fecha_inicio)}/>
                      <div className="pld-field">
                        <span className="pld-label">Hasta</span>
                        <span className="pld-value" style={{ color: new Date() < new Date(data.fecha_fin_carencia) ? '#F59E0B' : '#059669' }}>
                          {fmtDate(data.fecha_fin_carencia)} {new Date() < new Date(data.fecha_fin_carencia) ? '⏳ En carencia' : '✓ Cumplida'}
                        </span>
                      </div>
                    </div>
                  </PldCard>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* ══════════ Modal — Transferir titular ══════════ */}
    {showTransf && (
      <div className="pl-overlay" style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.55)',
        backdropFilter:'blur(4px)', zIndex:1001, display:'flex', alignItems:'center',
        justifyContent:'center', padding:20 }}
        onClick={e => { if (e.target === e.currentTarget) setShowTransf(false) }}>
        <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:460,
          boxShadow:'0 24px 60px rgba(0,0,0,.25)', overflow:'hidden' }}>
          <div style={{ padding:'22px 24px 18px', borderBottom:'1.5px solid #ECEDF8',
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:'#0F1035' }}>Transferir titular</div>
              <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
                Póliza #{data.numero} — se conserva antigüedad, carencia y beneficiarios
              </div>
            </div>
            <button onClick={() => setShowTransf(false)}
              style={{ width:32, height:32, borderRadius:10, border:'1.5px solid #ECEDF8',
                background:'#F7F8FC', display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', color:'#6B7280' }}>
              <X size={16}/>
            </button>
          </div>
          <div style={{ padding:'22px 24px' }}>
            <div style={{ background:'#F0FDF4', border:'1.5px solid #BBF7D0', borderRadius:10,
              padding:'10px 12px', marginBottom:16, fontSize:12.5, color:'#166534' }}>
              Titular actual: <strong>{data.titular_nombre}</strong>
            </div>

            <div className="pld-field" style={{ marginBottom:14 }}>
              <span className="pld-label">Nuevo titular <span style={{color:'#EF4444'}}>*</span></span>
              <div style={{ position:'relative', marginTop:5 }}>
                <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                  top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                <input value={busqTransf}
                  onChange={e => { setBusqTransf(e.target.value); setNuevoTitular(null) }}
                  placeholder="Nombre o documento…"
                  style={{ width:'100%', boxSizing:'border-box', paddingLeft:30, padding:'9px 12px 9px 30px',
                    border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13, outline:'none', background:'#FAFBFF' }}/>
              </div>
              {nuevoTitular && (
                <div style={{ fontSize:11, color:'#059669', fontWeight:700, marginTop:4 }}>
                  ✓ {nuevoTitular.nombres} {nuevoTitular.apellidos} seleccionado
                </div>
              )}
              {candTransf.length > 0 && !nuevoTitular && (
                <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                  maxHeight:160, overflowY:'auto', background:'#fff', marginTop:4 }}>
                  {candTransf.map((c,i) => (
                    <div key={c.id} onClick={() => { setNuevoTitular(c); setBusqTransf(`${c.nombres||''} ${c.apellidos||''}`.trim()); setCandTransf([]) }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
                        borderBottom:i<candTransf.length-1?'1px solid #F4F5FA':'none' }}
                      onMouseEnter={e => e.currentTarget.style.background='#F0FDF4'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                        background:'linear-gradient(135deg,#059669,#047857)', display:'flex',
                        alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>
                        {(c.nombres?.[0]||'?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                        <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pld-field" style={{ marginBottom:8 }}>
              <span className="pld-label">Motivo (opcional)</span>
              <textarea value={motivoTransf} onChange={e => setMotivoTransf(e.target.value)}
                placeholder="Ej: titular original falleció, hijo asume el pago…"
                style={{ width:'100%', boxSizing:'border-box', marginTop:5, padding:'9px 12px',
                  border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13, outline:'none',
                  background:'#FAFBFF', minHeight:60, resize:'vertical', fontFamily:'inherit' }}/>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:14 }}>
              <button className="pl-btn pl-btn-ghost" onClick={() => setShowTransf(false)}>Cancelar</button>
              <button className="pl-btn pl-btn-primary" onClick={confirmarTransferencia} disabled={savingTransf}>
                {savingTransf ? <Loader2 size={14} className="pl-spin"/> : <ArrowLeftRight size={14}/>}
                Confirmar transferencia
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────

export default function PolizasPage() {
  const [rows, setRows]         = useState([])
  const [meta, setMeta]         = useState({ total:0, page:1, pages:1 })
  const [kpis, setKpis]         = useState({})
  const [planes, setPlanes]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [q, setQ]               = useState('')
  const [estado, setEstado]     = useState('')
  const [page, setPage]         = useState(1)
  const [modal, setModal]       = useState(null)  // 'form' | 'ficha' | 'pago'
  const [selected, setSelected] = useState(null)
  const { usuario } = useAuthStore()
  const navigate    = useNavigate()
  const esEditor = ['superadmin','administrador','operador','asesor_comercial'].includes(usuario?.rol)
  const esAdmin  = ['superadmin','administrador'].includes(usuario?.rol)

  const cargar = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page:pg, limit:20 })
      if (q)      params.set('q', q)
      if (estado) params.set('estado', estado)
      const r = await api.get(`/polizas?${params}`)
      setRows(r.data.data)
      setMeta(r.data.meta)
    } finally { setLoading(false) }
  }, [q, estado, page])

  const cargarKpis = useCallback(async () => {
    const [kRes, plRes] = await Promise.all([
      api.get('/polizas/stats'),
      api.get('/polizas/planes'),
    ])
    setKpis(kRes.data.data)
    setPlanes(plRes.data.data)
  }, [])

  useEffect(() => { cargarKpis() }, [cargarKpis])
  useEffect(() => { setPage(1); cargar(1) }, [q, estado])
  useEffect(() => { cargar() }, [page])

  const cancelarPoliza = async (id) => {
    if (!confirm('¿Cancelar esta póliza? Podrá reactivarse más adelante desde su ficha si el contratante vuelve.')) return
    const motivo = prompt('Motivo de la cancelación (opcional):') || null
    try {
      await api.delete(`/polizas/${id}`, { data: { motivo } })
      toast.success('Póliza cancelada con éxito')
      cargar(); cargarKpis(); setModal(null)
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const reactivarPoliza = async (id) => {
    if (!confirm('¿Reactivar esta póliza? Volverá a estado VIGENTE conservando su número e historial.')) return
    const motivo = prompt('Motivo de la reactivación (opcional):') || null
    try {
      await api.patch(`/polizas/${id}/reactivar`, { motivo })
      toast.success('Póliza reactivada con éxito')
      cargar(); cargarKpis()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const fmt2 = (n) => new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(n||0)

  const KPI_LIST = [
    { key:'vigentes',    label:'Vigentes',     color:'#059669', bg:'#D1FAE5', Icon:ShieldCheck },
    { key:'suspendidas', label:'Suspendidas',  color:'#F59E0B', bg:'#FEF3C7', Icon:AlertCircle },
    { key:'vencidas',    label:'Vencidas',     color:'#EF4444', bg:'#FEE2E2', Icon:AlertTriangle },
    { key:'ejecutadas',  label:'Ejecutadas',   color:'#6366F1', bg:'#EEF2FF', Icon:CheckCircle2 },
    { key:'en_mora',     label:'En mora',      color:'#DC2626', bg:'#FEE2E2', Icon:Clock },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="pl-page">

        <div className="pl-head">
          <div className="pl-head-top">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="pl-head-icon"><ShieldCheck size={22} color="#fff"/></div>
              <div>
                <div className="pl-titulo">Pólizas de Previsión</div>
                <div className="pl-sub">
                  Afiliaciones · Beneficiarios · Cuotas · Carencia ·{' '}
                  {meta.total} póliza{meta.total!==1?'s':''}
                  {kpis.recaudo_mensual_esperado > 0 && (
                    <span style={{ marginLeft:8, color:'#059669', fontWeight:700 }}>
                      · Recaudo esperado: {fmt(kpis.recaudo_mensual_esperado)}/mes
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {esAdmin && (
                <button className="pl-btn pl-btn-ghost"
                  onClick={() => navigate('/polizas/planes')}
                  title="Administrar planes">
                  <Settings size={14}/> Planes
                </button>
              )}
              {esEditor && (
                <button className="pl-btn pl-btn-primary"
                  onClick={() => { setSelected(null); setModal('form') }}>
                  <ShieldPlus size={15}/> Nueva póliza
                </button>
              )}
            </div>
          </div>

          <div className="pl-kpis">
            {KPI_LIST.map(k => (
              <div key={k.key} className="pl-kpi">
                <div className="pl-kpi-bar" style={{ background:k.color }}/>
                <div className="pl-kpi-body">
                  <div className="pl-kpi-icon" style={{ background:k.bg }}>
                    <k.Icon size={17} color={k.color}/>
                  </div>
                  <div className="pl-kpi-val">{kpis[k.key] ?? 0}</div>
                  <div className="pl-kpi-label">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pl-toolbar">
            <div className="pl-search">
              <Search size={14} className="pl-search-icon"/>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar por número, titular, documento, teléfono…"/>
            </div>
            <select className="pl-select" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_META).map(([k,v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button className="pl-btn pl-btn-ghost" onClick={() => { cargar(); cargarKpis() }}>
              <RefreshCw size={14} className={loading?'pl-spin':''}/>
            </button>
          </div>
        </div>

        <div className="pl-table-wrap">
          {loading && rows.length === 0 ? (
            <div className="pl-empty">
              <Loader2 size={32} className="pl-spin" color="#059669"/>
              <p>Cargando pólizas…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="pl-empty">
              <div style={{ width:64, height:64, borderRadius:18, background:'#F0F1FA',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ShieldCheck size={28} color="#C7CAE8"/>
              </div>
              <p>Sin pólizas registradas</p>
              <span>Use "Nueva póliza" para registrar la primera afiliación</span>
            </div>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Titular</th>
                  <th>Plan</th>
                  <th>Beneficiarios</th>
                  <th>Cuota</th>
                  <th>Día cobro</th>
                  <th>Carencia</th>
                  <th>Último pago</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} onClick={() => { setSelected(p); setModal('ficha') }}>
                    <td><span style={{ fontWeight:900, color:'#0F1035' }}>#{p.numero}</span></td>
                    <td>
                      <div style={{ fontSize:13, fontWeight:800, color:'#0F1035' }}>{p.titular_nombre}</div>
                      <div style={{ fontSize:11, color:'#9CA3AF' }}>
                        {p.titular_doc}
                        {p.titular_tel && ` · ${p.titular_tel}`}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize:12.5, fontWeight:700,
                        color: TIPO_COLOR[p.plan_tipo] || '#374151' }}>{p.plan_nombre}</div>
                      <div style={{ fontSize:10.5, color:'#9CA3AF' }}>{p.plan_tipo}</div>
                    </td>
                    <td>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                        background:'#CFFAFE', color:'#0891B2', borderRadius:20,
                        padding:'3px 10px', fontSize:11, fontWeight:700 }}>
                        <Users size={10}/> {p.total_beneficiarios}/{p.max_beneficiarios}
                      </span>
                    </td>
                    <td><span style={{ fontWeight:800, color:'#059669' }}>{fmt(p.valor_cuota)}</span></td>
                    <td style={{ fontSize:12.5, color:'#374151' }}>Día {p.dia_cobro}</td>
                    <td style={{ fontSize:12, color: new Date() < new Date(p.fecha_fin_carencia) ? '#F59E0B' : '#9CA3AF' }}>
                      {new Date() < new Date(p.fecha_fin_carencia) ? '⏳ ' : ''}{fmtDate(p.fecha_fin_carencia)}
                    </td>
                    <td style={{ fontSize:12, color: p.meses_mora > 0 ? '#EF4444' : '#374151', fontWeight: p.meses_mora > 0 ? 700 : 400 }}>
                      {fmtDate(p.ultimo_pago)}
                      {p.meses_mora > 0 && ` (${p.meses_mora}m)`}
                    </td>
                    <td><EstadoChip estado={p.estado} mora={p.meses_mora}/></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="pl-act" title="Ver ficha"
                          onClick={() => { setSelected(p); setModal('ficha') }}>
                          <Eye size={13}/>
                        </button>
                        {esEditor && !['CANCELADA','EJECUTADA'].includes(p.estado) && (
                          <>
                            <button className="pl-act" title="Pagar cuota"
                              onClick={() => { setSelected(p); setModal('pago') }}
                              style={{ color:'#059669' }}>
                              <CreditCard size={13}/>
                            </button>
                            <button className="pl-act" title="Editar"
                              onClick={() => { setSelected(p); setModal('form') }}>
                              <Edit2 size={13}/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pl-pag">
          <span className="pl-pag-info">
            {meta.total} póliza{meta.total!==1?'s':''} · Página {meta.page} de {meta.pages}
          </span>
          <div className="pl-pag-btns">
            <button className="pl-pag-btn" disabled={page<=1} onClick={() => setPage(p=>p-1)}>
              <ChevronLeft size={14}/>
            </button>
            <button className="pl-pag-btn" disabled={page>=meta.pages} onClick={() => setPage(p=>p+1)}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </div>

      {modal === 'form' && (
        <ModalForm poliza={selected} planes={planes} esAdmin={esAdmin}
          onClose={() => { setModal(null); setSelected(null) }}
          onSaved={() => { setModal(null); setSelected(null); cargar(); cargarKpis() }}/>
      )}
      {modal === 'pago' && selected && (
        <ModalPago poliza={selected}
          onClose={() => { setModal(null); setSelected(null) }}
          onSaved={() => { setModal(null); setSelected(null); cargar(); cargarKpis() }}/>
      )}
      {modal === 'ficha' && selected && (
        <ModalFicha id={selected.id}
          onClose={() => { setModal(null); setSelected(null) }}
          onEditar={(p) => { setSelected(p); setModal('form') }}
          onPagar={(p) => { setSelected(p); setModal('pago') }}
          onCancelar={(id) => cancelarPoliza(id)}
          onReactivar={(id) => reactivarPoliza(id)}/>
      )}
    </>
  )
}
