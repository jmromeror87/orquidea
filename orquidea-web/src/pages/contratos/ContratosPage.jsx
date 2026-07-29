/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contratos                                       ║
 * ║  Archivo         : ContratosPage.jsx                               ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import {
  FileText, FilePlus, Search, RefreshCw, X, Loader2,
  ChevronLeft, ChevronRight, Phone, User, Calendar,
  AlertTriangle, CheckCircle2, Clock, Ban,
  CreditCard, Edit2, Eye,
  ShieldCheck, Zap, DollarSign, Package,
} from 'lucide-react'
import api from '../../services/api.js'
import { useAuthStore } from '../../store/auth.store.js'
import { toast } from '../../store/toast.store.js'
import { useFormasPago } from '../../hooks/useFormasPago.js'

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}) : '—'

const ESTADO_META = {
  activo:     { label:'Activo',     color:'#059669', bg:'#D1FAE5', Icon: Clock },
  completado: { label:'Completado', color:'#6366F1', bg:'#EEF2FF', Icon: CheckCircle2 },
  cancelado:  { label:'Cancelado',  color:'#EF4444', bg:'#FEE2E2', Icon: Ban },
}

const TIPO_META = {
  INMEDIATO: { label:'Inmediato', color:'#F59E0B', bg:'#FEF3C7' },
  PREVISION: { label:'Previsión', color:'#0891B2', bg:'#CFFAFE' },
}

const BLANK = {
  contratante_id:'', difunto_id:'', paquete_id:'',
  tipo_contrato:'INMEDIATO', modalidad:'CONTADO',
  valor_total:'', num_cuotas:1, valor_cuota:'', dia_cobro:'',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_vencimiento:'', fecha_servicio:'', observaciones:'',
}

// ── Chips ──────────────────────────────────────────────────────────────────

function EstadoChip({ estado }) {
  const m = ESTADO_META[estado] || { label: estado, color:'#9CA3AF', bg:'#F3F4F6', Icon: null }
  const { Icon } = m
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:m.bg,
      color:m.color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
      {Icon && <Icon size={11}/>} {m.label}
    </span>
  )
}

function TipoChip({ tipo }) {
  const m = TIPO_META[tipo] || { label:tipo, color:'#9CA3AF', bg:'#F3F4F6' }
  return (
    <span style={{ background:m.bg, color:m.color, borderRadius:20,
      padding:'2px 8px', fontSize:10, fontWeight:700 }}>{m.label}</span>
  )
}

// ── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  .ct-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
  .ct-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px 14px; flex-shrink:0; }
  .ct-head-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .ct-head-icon { width:44px; height:44px; border-radius:14px;
    background:linear-gradient(135deg,#F59E0B,#D97706);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 12px rgba(245,158,11,.3); flex-shrink:0; }
  .ct-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
  .ct-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .ct-kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:22px; }
  .ct-kpi { background:#fff; border-radius:16px; overflow:hidden; border:1.5px solid #ECEDF8; transition:all .2s; }
  .ct-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.08); }
  .ct-kpi-bar { height:3px; }
  .ct-kpi-body { padding:14px 16px 12px; }
  .ct-kpi-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
  .ct-kpi-val { font-size:28px; font-weight:900; color:#0F1035; line-height:1; letter-spacing:-1px; }
  .ct-kpi-label { font-size:11px; color:#9CA3AF; font-weight:600; margin-top:4px; }
  .ct-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ct-search { position:relative; flex:1; min-width:200px; max-width:340px; }
  .ct-search input { width:100%; padding:9px 12px 9px 36px; border:1.5px solid #E2E5F0;
    border-radius:12px; font-size:13px; outline:none; background:#FAFBFF; transition:all .15s; box-sizing:border-box; }
  .ct-search input:focus { border-color:#F59E0B; box-shadow:0 0 0 3px rgba(245,158,11,.1); background:#fff; }
  .ct-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; pointer-events:none; }
  .ct-select { padding:9px 12px; border:1.5px solid #E2E5F0; border-radius:12px; font-size:13px;
    background:#FAFBFF; color:#374151; outline:none; cursor:pointer; }
  .ct-select:focus { border-color:#F59E0B; }
  .ct-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px;
    font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .15s; }
  .ct-btn-primary { background:linear-gradient(135deg,#F59E0B,#D97706); color:#fff;
    box-shadow:0 3px 10px rgba(245,158,11,.3); }
  .ct-btn-primary:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(245,158,11,.4); }
  .ct-btn-ghost { background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0; }
  .ct-btn-ghost:hover { background:#ECEDF8; }
  .ct-table-wrap { flex:1; overflow:auto; padding:0 24px; }
  .ct-table { width:100%; border-collapse:separate; border-spacing:0; }
  .ct-table thead th { padding:10px 14px; text-align:left; font-size:10.5px; font-weight:800;
    color:#9CA3AF; letter-spacing:.6px; text-transform:uppercase; background:#F7F8FC;
    position:sticky; top:0; z-index:1; white-space:nowrap; }
  .ct-table thead th:first-child { border-radius:10px 0 0 10px; }
  .ct-table thead th:last-child  { border-radius:0 10px 10px 0; }
  .ct-table tbody tr { transition:all .12s; cursor:pointer; }
  .ct-table tbody tr:hover td { background:#FFF8EC; }
  .ct-table tbody tr:hover td:first-child { border-left:3px solid #F59E0B; }
  .ct-table td { padding:13px 14px; font-size:13px; color:#374151; border-bottom:1px solid #F4F5FA; vertical-align:middle; }
  .ct-table td:first-child { border-left:3px solid transparent; transition:border-color .12s; }
  .ct-act { width:30px; height:30px; border-radius:8px; border:1.5px solid #E2E5F0;
    background:#fff; display:inline-flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; transition:all .15s; }
  .ct-act:hover { background:#EEF2FF; color:#2E3192; border-color:#C7CAE8; }
  .ct-act.view:hover { background:#FEF3C7; color:#D97706; border-color:#FDE68A; }
  .ct-empty { display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:60px 20px; color:#9CA3AF; gap:10px; }
  .ct-empty p { font-size:15px; font-weight:800; color:#374151; margin:0; }
  .ct-empty span { font-size:12.5px; }
  .ct-pag { display:flex; align-items:center; justify-content:space-between; padding:14px 24px;
    border-top:1.5px solid #ECEDF8; background:#fff; flex-shrink:0; }
  .ct-pag-info { font-size:12.5px; color:#9CA3AF; font-weight:600; }
  .ct-pag-btns { display:flex; gap:6px; }
  .ct-pag-btn { width:32px; height:32px; border-radius:9px; border:1.5px solid #E2E5F0;
    background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;
    color:#6B7280; transition:all .15s; }
  .ct-pag-btn:hover:not(:disabled) { background:#FEF3C7; color:#D97706; border-color:#FDE68A; }
  .ct-pag-btn:disabled { opacity:.4; cursor:not-allowed; }
  .ct-spin { animation:ct-spin .7s linear infinite; }
  @keyframes ct-spin { to{transform:rotate(360deg)} }
  .ct-overlay { position:fixed; inset:0; background:rgba(15,16,53,.55); backdrop-filter:blur(4px);
    z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .ct-modal { background:#fff; border-radius:20px; width:100%; max-width:640px;
    box-shadow:0 24px 60px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:90vh; overflow:hidden; }
  .ct-modal.lg { max-width:820px; }
  /* Drawer contrato */
  .ct-drawer-overlay { position:fixed; inset:0; background:rgba(10,10,30,.45); backdrop-filter:blur(3px);
    z-index:1000; display:flex; justify-content:flex-end; }
  .ct-drawer { background:#fff; width:88%; max-width:1100px; height:100vh; display:flex;
    flex-direction:column; box-shadow:-8px 0 40px rgba(0,0,0,.18); animation:ct-slide-in .22s ease; }
  @keyframes ct-slide-in { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
  .ct-drawer-sidebar { width:190px; flex-shrink:0; border-right:1.5px solid #FEF3C7;
    background:#FFFDF5; display:flex; flex-direction:column; padding:16px 10px; gap:4px; overflow-y:auto; }
  .ct-drawer-stab { display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:10px;
    cursor:pointer; border:none; background:none; width:100%; text-align:left;
    font-size:12.5px; font-weight:600; color:#4B5563; transition:all .15s; }
  .ct-drawer-stab:hover { background:#FEF3C7; color:#92400E; }
  .ct-drawer-stab.active { background:linear-gradient(135deg,#F59E0B,#D97706); color:#fff;
    font-weight:800; box-shadow:0 3px 10px rgba(245,158,11,.3); }
  .ct-drawer-stab .stab-icon { font-size:16px; line-height:1; flex-shrink:0; }
  .ct-drawer-content { flex:1; overflow-y:auto; padding:28px 32px; }
  /* Cards drawer contrato */
  .ctd-card { background:#fff; border:1.5px solid #FDE68A; border-radius:14px; margin-bottom:16px; overflow:hidden; }
  .ctd-card-head { display:flex; align-items:center; gap:9px; padding:12px 16px;
    background:linear-gradient(90deg,#FFFBEB,#FEF3C7); border-bottom:1.5px solid #FDE68A; }
  .ctd-card-icon { font-size:16px; line-height:1; }
  .ctd-card-title { font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#92400E; }
  .ctd-card-body { padding:16px; }
  .ctd-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .ctd-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .ctd-field { display:flex; flex-direction:column; gap:3px; }
  .ctd-label { font-size:10px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.06em; }
  .ctd-value { font-size:13.5px; font-weight:700; color:#111827; }
  .ctd-value.muted { color:#D1D5DB; font-weight:500; }
  .ct-mhead { padding:22px 24px 18px; border-bottom:1.5px solid #ECEDF8;
    display:flex; align-items:center; justify-content:space-between; }
  .ct-mtitle { font-size:17px; font-weight:900; color:#0F1035; }
  .ct-msub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .ct-mclose { width:32px; height:32px; border-radius:10px; border:1.5px solid #ECEDF8;
    background:#F7F8FC; display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; flex-shrink:0; transition:all .15s; }
  .ct-mclose:hover { background:#FEE2E2; border-color:#FECACA; color:#EF4444; }
  .ct-mbody { padding:22px 24px; overflow-y:auto; overflow-x:hidden; flex:1; }
  .ct-grid2 { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; }
  .ct-grid3 { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr); gap:14px; }
  .ct-field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; min-width:0; }
  .ct-field label { font-size:11.5px; font-weight:700; color:#374151; }
  .ct-field input, .ct-field select, .ct-field textarea {
    padding:9px 12px; border:1.5px solid #E2E5F0; border-radius:10px; font-size:13px;
    outline:none; background:#FAFBFF; color:#0F1035; transition:all .15s; font-family:inherit;
    width:100%; box-sizing:border-box; }
  .ct-field input:focus, .ct-field select:focus, .ct-field textarea:focus {
    border-color:#F59E0B; box-shadow:0 0 0 3px rgba(245,158,11,.1); background:#fff; }
  .ct-field textarea { resize:vertical; min-height:70px; }
  @media (max-width:560px) {
    .ct-grid2, .ct-grid3 { grid-template-columns:1fr; }
    .ct-modal { max-width:100% !important; }
  }
  .ct-section { font-size:10px; font-weight:800; color:#9CA3AF; letter-spacing:1px;
    text-transform:uppercase; margin:6px 0 12px; }
  .ct-req { color:#EF4444; }
  .ct-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px;
    font-size:12.5px; font-weight:600; }
  .ct-alert.err { background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; }
  .ct-alert.ok  { background:#D1FAE5; color:#065F46; border:1px solid #A7F3D0; }
  .ct-ficha-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  .ct-ficha-block { background:#F8F9FF; border-radius:12px; padding:14px 16px; border:1.5px solid #ECEDF8; }
  .ct-ficha-tit { font-size:10px; font-weight:800; letter-spacing:.8px; color:#9CA3AF; text-transform:uppercase; margin-bottom:10px; }
  .ct-ficha-row { display:flex; gap:8px; margin-bottom:6px; align-items:flex-start; }
  .ct-ficha-key { font-size:11px; color:#9CA3AF; min-width:100px; flex-shrink:0; }
  .ct-ficha-val { font-size:12.5px; font-weight:700; color:#0F1035; }
  .ct-prog-bar { height:8px; background:#F0F1FA; border-radius:20px; overflow:hidden; margin:6px 0; }
  .ct-prog-fill { height:100%; border-radius:20px; transition:width .4s; }
  .ct-pago-item { display:flex; align-items:center; gap:10px; padding:10px 12px;
    background:#F8F9FF; border-radius:10px; border:1.5px solid #ECEDF8; margin-bottom:8px; }
`

// ── Modal Formulario ──────────────────────────────────────────────────────

function ModalForm({ contrato, paquetes, onClose, onSaved }) {
  const [form, setForm] = useState(contrato ? {
    difunto_id:        contrato.difunto_id        || '',
    paquete_id:        contrato.paquete_id         || '',
    tipo_contrato:     contrato.tipo_contrato      || 'INMEDIATO',
    modalidad:         contrato.modalidad          || 'CONTADO',
    valor_total:       contrato.valor_total        || '',
    num_cuotas:        contrato.num_cuotas         || 1,
    valor_cuota:       contrato.valor_cuota        || '',
    dia_cobro:         contrato.dia_cobro          || '',
    fecha_inicio:      contrato.fecha_inicio?.split('T')[0]      || new Date().toISOString().split('T')[0],
    fecha_vencimiento: contrato.fecha_vencimiento?.split('T')[0] || '',
    fecha_servicio:    contrato.fecha_servicio?.split('T')[0]    || '',
    observaciones:     contrato.observaciones      || '',
  } : { ...BLANK })

  const [busqCont, setBusqCont]         = useState(contrato?.contratante_nombre || '')
  const [busqDif,  setBusqDif]          = useState(contrato?.difunto_nombre     || '')
  const [candCont, setCandCont]         = useState([])
  const [candDif,  setCandDif]          = useState([])
  const [contratanteId, setContratanteId] = useState(contrato?.contratante_id  || '')
  const [saving, setSaving]             = useState(false)
  const [err, setErr]                   = useState('')

  useEffect(() => {
    if (busqCont.length < 1) return setCandCont([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqCont)}`)
      setCandCont(r.data.data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [busqCont])

  useEffect(() => {
    if (busqDif.length < 1) return setCandDif([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqDif)}`)
      setCandDif(r.data.data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [busqDif])

  useEffect(() => {
    if (form.modalidad === 'CUOTAS' && form.valor_total && form.num_cuotas > 1) {
      setForm(p => ({ ...p, valor_cuota: Math.ceil(p.valor_total / p.num_cuotas) }))
    }
  }, [form.valor_total, form.num_cuotas, form.modalidad])

  // ── Crear rápido (Contratante / Difunto no encontrados) ───────────────────
  const [tiposDocs,   setTiposDocs]   = useState([])
  const [quickCrear,  setQuickCrear]  = useState(null) // 'CONTRATANTE' | 'DIFUNTO' | null
  const [quickForm,   setQuickForm]   = useState({ tipo_documento_id:'', numero_documento:'', nombres:'', apellidos:'', telefono:'', email:'' })
  const [quickSaving, setQuickSaving] = useState(false)

  useEffect(() => {
    api.get('/tipos-documento/select').then(r => setTiposDocs(r.data.data || [])).catch(() => {})
  }, [])

  const abrirCrearRapido = (tipo) => {
    const busq = tipo === 'DIFUNTO' ? busqDif : busqCont
    const partes = busq.trim().split(/\s+/)
    setQuickForm({
      tipo_documento_id:'', numero_documento:'',
      nombres:   partes.slice(0, Math.ceil(partes.length/2)).join(' '),
      apellidos: partes.slice(Math.ceil(partes.length/2)).join(' '),
      telefono:'', email:'',
    })
    setQuickCrear(tipo)
  }

  const guardarCreacionRapida = async () => {
    if (!quickForm.tipo_documento_id || !quickForm.numero_documento)
      return toast.error('Tipo y número de documento son requeridos')
    if (!quickForm.nombres || !quickForm.apellidos)
      return toast.error('Nombres y apellidos son requeridos')
    setQuickSaving(true)
    try {
      const r = await api.post('/terceros', {
        tipo_documento_id: quickForm.tipo_documento_id,
        numero_documento:  quickForm.numero_documento,
        nombres:   quickForm.nombres,
        apellidos: quickForm.apellidos,
        telefono:  quickForm.telefono || undefined,
        email:     quickForm.email || undefined,
        roles: [quickCrear],
      })
      const nuevo = r.data.data
      const nombreCompleto = `${nuevo.nombres||''} ${nuevo.apellidos||''}`.trim()
      if (quickCrear === 'DIFUNTO') {
        setForm(p => ({ ...p, difunto_id: nuevo.id }))
        setBusqDif(nombreCompleto)
        setCandDif([])
      } else if (quickCrear === 'CONTRATANTE') {
        setContratanteId(nuevo.id)
        setBusqCont(nombreCompleto)
        setCandCont([])
      }
      toast.success('Tercero creado con éxito')
      setQuickCrear(null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al crear el tercero')
    } finally { setQuickSaving(false) }
  }

  const onPaquete = (e) => {
    const pid = e.target.value
    const pkg = paquetes.find(p => p.id === pid)
    setForm(p => ({ ...p, paquete_id: pid, valor_total: pkg?.precio_base || p.valor_total }))
  }

  const guardar = async () => {
    setErr('')
    if (!contratanteId) return setErr('Seleccione un contratante.')
    if (!form.valor_total || +form.valor_total <= 0) return setErr('Ingrese el valor total del contrato.')
    setSaving(true)
    try {
      const body = { ...form, contratante_id: contratanteId }
      if (contrato) await api.put(`/contratos/${contrato.id}`, body)
      else          await api.post('/contratos', body)
      toast.success(contrato ? 'Contrato actualizado con éxito' : 'Contrato creado con éxito')
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al guardar'
      setErr(msg)
      toast.error(msg)
    } finally { setSaving(false) }
  }

  return (
    <>
    <div className="ct-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ct-modal">
        <div className="ct-mhead">
          <div>
            <div className="ct-mtitle">
              {contrato ? `Editar contrato #${contrato.numero}` : 'Nuevo contrato'}
            </div>
            <div className="ct-msub">Previsión funeraria · Servicio inmediato</div>
          </div>
          <button className="ct-mclose" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="ct-mbody">
          {err && <div className="ct-alert err" style={{ marginBottom:16 }}><AlertTriangle size={13}/>{err}</div>}

          <div className="ct-section">Tipo de contrato</div>
          <div className="ct-grid2">
            <div className="ct-field" style={{ marginBottom:0 }}>
              <label>Tipo <span className="ct-req">*</span></label>
              <select value={form.tipo_contrato} onChange={e => setForm(p => ({...p, tipo_contrato:e.target.value}))}>
                <option value="INMEDIATO">Inmediato (servicio activo)</option>
                <option value="PREVISION">Previsión (anticipado)</option>
              </select>
            </div>
            <div className="ct-field" style={{ marginBottom:0 }}>
              <label>Modalidad de pago <span className="ct-req">*</span></label>
              <select value={form.modalidad} onChange={e => setForm(p => ({...p, modalidad:e.target.value}))}>
                <option value="CONTADO">Contado</option>
                <option value="CUOTAS">Cuotas</option>
              </select>
            </div>
          </div>

          <div className="ct-section" style={{ marginTop:18 }}>Partes del contrato</div>

          {/* Contratante */}
          <div className="ct-field">
            <label>Contratante <span className="ct-req">*</span></label>
            <div style={{ position:'relative' }}>
              <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
              <input value={busqCont}
                onChange={e => { setBusqCont(e.target.value); setContratanteId('') }}
                placeholder="Buscar por nombre o documento…"
                style={{ paddingLeft:30 }}/>
            </div>
            {contratanteId && (
              <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>✓ Contratante seleccionado</span>
            )}
            {candCont.length > 0 && !contratanteId && (
              <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                maxHeight:160, overflowY:'auto', background:'#fff', marginTop:4 }}>
                {candCont.map((c, i) => (
                  <div key={c.id}
                    onClick={() => { setContratanteId(c.id); setBusqCont(`${c.nombres||''} ${c.apellidos||''}`.trim()); setCandCont([]) }}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
                      borderBottom:i<candCont.length-1?'1px solid #F4F5FA':'none', transition:'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#FEF3C7'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                      background:'linear-gradient(135deg,#F59E0B,#D97706)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight:800, color:'#fff' }}>
                      {(c.nombres?.[0]||'?').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:700, color:'#0F1035' }}>{c.nombres} {c.apellidos}</div>
                      <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {busqCont.trim().length >= 2 && candCont.length === 0 && !contratanteId && (
              <button type="button" onClick={() => abrirCrearRapido('CONTRATANTE')}
                style={{ display:'flex', alignItems:'center', gap:6, marginTop:6,
                  background:'#FFFBEB', border:'1.5px dashed #FDE68A', borderRadius:10,
                  padding:'8px 12px', cursor:'pointer', fontSize:12, fontWeight:700, color:'#D97706' }}>
                <User size={14}/> No se encontró "{busqCont}" — crear contratante nuevo
              </button>
            )}
          </div>

          {/* Difunto */}
          <div className="ct-field">
            <label>Difunto / Beneficiario del servicio</label>
            <div style={{ position:'relative' }}>
              <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
              <input value={busqDif}
                onChange={e => { setBusqDif(e.target.value); setForm(p=>({...p,difunto_id:''})) }}
                placeholder="Buscar difunto (opcional)…"
                style={{ paddingLeft:30 }}/>
            </div>
            {form.difunto_id && (
              <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>✓ Difunto seleccionado</span>
            )}
            {candDif.length > 0 && !form.difunto_id && (
              <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                maxHeight:140, overflowY:'auto', background:'#fff', marginTop:4 }}>
                {candDif.map((c, i) => (
                  <div key={c.id}
                    onClick={() => { setForm(p=>({...p,difunto_id:c.id})); setBusqDif(`${c.nombres||''} ${c.apellidos||''}`.trim()); setCandDif([]) }}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
                      borderBottom:i<candDif.length-1?'1px solid #F4F5FA':'none', transition:'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                      background:'linear-gradient(135deg,#64748B,#475569)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                      👼
                    </div>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:700, color:'#0F1035' }}>{c.nombres} {c.apellidos}</div>
                      <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {busqDif.trim().length >= 2 && candDif.length === 0 && !form.difunto_id && (
              <button type="button" onClick={() => abrirCrearRapido('DIFUNTO')}
                style={{ display:'flex', alignItems:'center', gap:6, marginTop:6,
                  background:'#F1F5F9', border:'1.5px dashed #CBD5E1', borderRadius:10,
                  padding:'8px 12px', cursor:'pointer', fontSize:12, fontWeight:700, color:'#475569' }}>
                <User size={14}/> No se encontró "{busqDif}" — crear difunto nuevo
              </button>
            )}
          </div>

          <div className="ct-section" style={{ marginTop:6 }}>Paquete y valor</div>

          <div className="ct-field">
            <label>Paquete de servicio</label>
            <select value={form.paquete_id} onChange={onPaquete}>
              <option value="">— Sin paquete / personalizado —</option>
              {paquetes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} · {fmt(p.precio_base)}</option>
              ))}
            </select>
          </div>

          <div className="ct-grid2">
            <div className="ct-field" style={{ marginBottom:0 }}>
              <label>Valor total <span className="ct-req">*</span></label>
              <input type="number" min="0" value={form.valor_total}
                onChange={e => setForm(p => ({...p, valor_total:e.target.value}))} placeholder="0"/>
            </div>
            {form.modalidad === 'CUOTAS' ? (
              <div className="ct-field" style={{ marginBottom:0 }}>
                <label>N° cuotas</label>
                <input type="number" min="1" max="120" value={form.num_cuotas}
                  onChange={e => setForm(p => ({...p, num_cuotas:+e.target.value}))}/>
              </div>
            ) : (
              <div className="ct-field" style={{ marginBottom:0 }}>
                <label>Fecha de servicio</label>
                <input type="date" value={form.fecha_servicio}
                  onChange={e => setForm(p => ({...p, fecha_servicio:e.target.value}))}/>
              </div>
            )}
          </div>

          {form.modalidad === 'CUOTAS' && (
            <div className="ct-grid3" style={{ marginTop:14 }}>
              <div className="ct-field" style={{ marginBottom:0 }}>
                <label>Valor cuota ($)</label>
                <input type="number" min="0" value={form.valor_cuota}
                  onChange={e => setForm(p => ({...p, valor_cuota:e.target.value}))}/>
              </div>
              <div className="ct-field" style={{ marginBottom:0 }}>
                <label>Día de cobro (1–28)</label>
                <input type="number" min="1" max="28" value={form.dia_cobro}
                  onChange={e => setForm(p => ({...p, dia_cobro:e.target.value}))}/>
              </div>
              <div className="ct-field" style={{ marginBottom:0 }}>
                <label>Fecha inicio</label>
                <input type="date" value={form.fecha_inicio}
                  onChange={e => setForm(p => ({...p, fecha_inicio:e.target.value}))}/>
              </div>
            </div>
          )}

          <div className="ct-field" style={{ marginTop:14 }}>
            <label>Observaciones</label>
            <textarea value={form.observaciones}
              onChange={e => setForm(p => ({...p, observaciones:e.target.value}))}
              placeholder="Notas adicionales sobre el contrato…"/>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
            <button className="ct-btn ct-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="ct-btn ct-btn-primary" onClick={guardar} disabled={saving}>
              {saving ? <Loader2 size={14} className="ct-spin"/> : <FileText size={14}/>}
              {contrato ? 'Guardar cambios' : 'Crear contrato'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ══════════ Modal — Crear rápido (Contratante / Difunto) ══════════ */}
    {quickCrear && (
      <div className="ct-overlay" style={{ zIndex:1001 }}
        onClick={e => { if (e.target === e.currentTarget) setQuickCrear(null) }}>
        <div className="ct-modal" style={{ maxWidth:460 }}>
          <div className="ct-mhead">
            <div>
              <div className="ct-mtitle">
                {quickCrear === 'DIFUNTO' ? 'Crear difunto nuevo' : 'Crear contratante nuevo'}
              </div>
              <div className="ct-msub">Registro rápido de tercero — puedes completar más datos luego</div>
            </div>
            <button className="ct-mclose" onClick={() => setQuickCrear(null)}><X size={16}/></button>
          </div>
          <div className="ct-mbody">
            <div className="ct-grid2">
              <div className="ct-field">
                <label>Tipo de documento <span className="ct-req">*</span></label>
                <select value={quickForm.tipo_documento_id}
                  onChange={e => setQuickForm(p => ({...p, tipo_documento_id:e.target.value}))}>
                  <option value="">— Seleccionar —</option>
                  {tiposDocs.map(t => <option key={t.id} value={t.id}>{t.sigla} — {t.nombre}</option>)}
                </select>
              </div>
              <div className="ct-field">
                <label>Número de documento <span className="ct-req">*</span></label>
                <input value={quickForm.numero_documento}
                  onChange={e => setQuickForm(p => ({...p, numero_documento:e.target.value}))}
                  placeholder="Ej: 1090512345"/>
              </div>
            </div>
            <div className="ct-grid2">
              <div className="ct-field">
                <label>Nombres <span className="ct-req">*</span></label>
                <input value={quickForm.nombres}
                  onChange={e => setQuickForm(p => ({...p, nombres:e.target.value}))}/>
              </div>
              <div className="ct-field">
                <label>Apellidos <span className="ct-req">*</span></label>
                <input value={quickForm.apellidos}
                  onChange={e => setQuickForm(p => ({...p, apellidos:e.target.value}))}/>
              </div>
            </div>
            <div className="ct-grid2">
              <div className="ct-field">
                <label>Teléfono</label>
                <input value={quickForm.telefono}
                  onChange={e => setQuickForm(p => ({...p, telefono:e.target.value}))}/>
              </div>
              <div className="ct-field">
                <label>Email</label>
                <input value={quickForm.email}
                  onChange={e => setQuickForm(p => ({...p, email:e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
              <button className="ct-btn ct-btn-ghost" onClick={() => setQuickCrear(null)}>Cancelar</button>
              <button className="ct-btn ct-btn-primary" onClick={guardarCreacionRapida} disabled={quickSaving}>
                {quickSaving ? <Loader2 size={14} className="ct-spin"/> : <User size={14}/>}
                Crear y usar
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ── Modal Ficha Detalle ───────────────────────────────────────────────────

function ModalFicha({ id, onClose, onEditar, onEstado }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('info')
  const { usuario } = useAuthStore()
  const { label: fmtMetodo } = useFormasPago()
  const esAdmin = ['superadmin','administrador'].includes(usuario?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/contratos/${id}`)
      setData(r.data.data)
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const pct = data ? Math.min(100, Math.round((+data.valor_pagado / +data.valor_total) * 100)) : 0

  const TABS = [
    { key:'info',  icon:'📄', label:'Información' },
    { key:'pagos', icon:'💳', label:`Pagos (${data?.pagos?.length||0})` },
  ]

  const CtdField = ({ label, value, color }) => (
    <div className="ctd-field">
      <span className="ctd-label">{label}</span>
      <span className={`ctd-value${value ? '' : ' muted'}`} style={color ? { color } : {}}>
        {value || '—'}
      </span>
    </div>
  )

  const CtdCard = ({ icon, title, children, headerRight }) => (
    <div className="ctd-card">
      <div className="ctd-card-head">
        <span className="ctd-card-icon">{icon}</span>
        <span className="ctd-card-title">{title}</span>
        {headerRight && <div style={{ marginLeft:'auto' }}>{headerRight}</div>}
      </div>
      <div className="ctd-card-body">{children}</div>
    </div>
  )

  return (
    <div className="ct-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ct-drawer">

        {/* Header dorado */}
        <div style={{ background:'linear-gradient(135deg,#D97706 0%,#F59E0B 60%,#FCD34D 100%)',
          padding:'18px 24px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ width:50, height:50, borderRadius:14, background:'rgba(255,255,255,.2)',
            border:'2px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center',
            justifyContent:'center', flexShrink:0 }}>
            <FileText size={22} color="#fff"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>
              Contrato #{loading ? '…' : data?.numero}
            </div>
            <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {loading ? 'Cargando…' : data?.contratante_nombre}
            </div>
            {!loading && (
              <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
                <span style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)',
                  padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff' }}>
                  {data.tipo_contrato}
                </span>
                <span style={{ background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.3)',
                  padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff' }}>
                  {data.modalidad}
                </span>
                <span style={{ background: data.estado === 'cancelado' ? 'rgba(220,38,38,.7)' : data.estado === 'completado' ? 'rgba(99,102,241,.7)' : 'rgba(255,255,255,.18)',
                  border:'1px solid rgba(255,255,255,.3)',
                  padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff' }}>
                  {data.estado}
                </span>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {!loading && data?.estado !== 'cancelado' && (
              <button onClick={() => { onClose(); onEditar(data) }}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
                  background:'rgba(255,255,255,.18)', border:'1.5px solid rgba(255,255,255,.35)',
                  borderRadius:10, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                <Edit2 size={13}/> Editar
              </button>
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

          {/* Sidebar */}
          <div className="ct-drawer-sidebar">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`ct-drawer-stab${tab === t.key ? ' active' : ''}`}>
                <span className="stab-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="ct-drawer-content">
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center',
                height:200, flexDirection:'column', gap:12 }}>
                <Loader2 size={32} color="#F59E0B" className="ct-spin"/>
                <span style={{ fontSize:13, color:'#9CA3AF' }}>Cargando contrato…</span>
              </div>

            ) : tab === 'info' ? (
              <>
                {/* Barra de progreso */}
                <div style={{ background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)',
                  border:'1.5px solid #FDE68A', borderRadius:16, padding:'18px 22px', marginBottom:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:800, color:'#92400E', textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>
                        Avance de pago
                      </div>
                      <div style={{ fontSize:24, fontWeight:900, color:'#0F1035', lineHeight:1.2 }}>
                        {fmt(data.valor_pagado)}
                        <span style={{ fontSize:13, color:'#9CA3AF', fontWeight:600 }}> de {fmt(data.valor_total)}</span>
                      </div>
                      {+data.saldo_pendiente > 0 && (
                        <div style={{ fontSize:12, color:'#EF4444', fontWeight:700, marginTop:4 }}>
                          Saldo pendiente: {fmt(data.saldo_pendiente)}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:34, fontWeight:900, color:pct===100?'#059669':'#F59E0B', lineHeight:1 }}>{pct}%</div>
                      <div style={{ marginTop:6 }}><EstadoChip estado={data.estado}/></div>
                    </div>
                  </div>
                  <div className="ct-prog-bar" style={{ height:8, borderRadius:99, background:'rgba(0,0,0,.08)', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:99,
                      width:`${pct}%`,
                      background: pct===100 ? 'linear-gradient(90deg,#059669,#10B981)' : 'linear-gradient(90deg,#F59E0B,#FCD34D)',
                      transition:'width .4s ease',
                    }}/>
                  </div>
                </div>

                <div className="ctd-grid2" style={{ marginBottom:16 }}>
                  <CtdCard icon="👤" title="Partes del contrato">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <CtdField label="Contratante" value={data.contratante_nombre}/>
                      <CtdField label="Teléfono" value={data.contratante_tel}/>
                      {data.difunto_id && <CtdField label="Difunto" value={data.difunto_nombre}/>}
                      <CtdField label="Asesor" value={data.asesor_nombre}/>
                    </div>
                  </CtdCard>

                  <CtdCard icon="💰" title="Información financiera">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <CtdField label="Paquete" value={data.paquete_nombre || 'Personalizado'}/>
                      <CtdField label="Valor total" value={fmt(data.valor_total)} color="#059669"/>
                      {data.modalidad === 'CUOTAS' && <>
                        <div className="ctd-grid2">
                          <CtdField label="N° cuotas" value={String(data.num_cuotas)}/>
                          <CtdField label="Valor cuota" value={fmt(data.valor_cuota)}/>
                        </div>
                        {data.dia_cobro && <CtdField label="Día de cobro" value={`Día ${data.dia_cobro} de cada mes`}/>}
                      </>}
                    </div>
                  </CtdCard>
                </div>

                <CtdCard icon="📅" title="Fechas">
                  <div className="ctd-grid3">
                    <CtdField label="Fecha inicio" value={fmtDate(data.fecha_inicio)}/>
                    <CtdField label="Vencimiento" value={fmtDate(data.fecha_vencimiento)}/>
                    <CtdField label="Fecha servicio" value={fmtDate(data.fecha_servicio)}/>
                  </div>
                </CtdCard>

                {data.observaciones && (
                  <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:'#92400E', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
                      Observaciones
                    </div>
                    <p style={{ fontSize:13, color:'#78350F', margin:0, lineHeight:1.6 }}>{data.observaciones}</p>
                  </div>
                )}

                {esAdmin && data.estado !== 'cancelado' && (
                  <div style={{ display:'flex', gap:10, marginTop:16 }}>
                    {data.estado === 'activo' && (
                      <button onClick={() => onEstado(data.id, 'completado')}
                        style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px',
                          background:'#EEF2FF', border:'1.5px solid #C7CAE8', borderRadius:10,
                          color:'#4338CA', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                        <CheckCircle2 size={14}/> Marcar completado
                      </button>
                    )}
                    <button onClick={() => onEstado(data.id, 'cancelado')}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px',
                        background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:10,
                        color:'#DC2626', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                      <Ban size={14}/> Cancelar contrato
                    </button>
                  </div>
                )}
              </>

            ) : (
              <CtdCard icon="💳" title="Historial de pagos">
                {(data.pagos || []).length === 0 ? (
                  <div className="ct-empty" style={{ padding:40 }}>
                    <CreditCard size={32}/>
                    <p>Sin pagos registrados</p>
                    <span>Los pagos se registran desde el módulo de Cartera</span>
                  </div>
                ) : (
                  (data.pagos || []).map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                      background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:12, marginBottom:8 }}>
                      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                        background:'linear-gradient(135deg,#059669,#10B981)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <CreditCard size={16} color="#fff"/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:'#065F46' }}>{fmt(p.monto)}</div>
                        <div style={{ fontSize:11.5, color:'#6B7280', marginTop:2 }}>
                          {fmtMetodo(p.metodo_pago)} · {fmtDate(p.fecha_pago)}{p.cajero && ` · ${p.cajero}`}
                        </div>
                      </div>
                      {p.referencia && (
                        <span style={{ fontSize:11, color:'#9CA3AF', fontWeight:600, background:'#F3F4F6',
                          padding:'3px 8px', borderRadius:6 }}>
                          Ref: {p.referencia}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </CtdCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────

export default function ContratosPage() {
  const [rows, setRows]         = useState([])
  const [meta, setMeta]         = useState({ total:0, page:1, pages:1 })
  const [kpis, setKpis]         = useState({})
  const [paquetes, setPaquetes] = useState([])
  const [loading, setLoading]   = useState(false)
  const [q, setQ]               = useState('')
  const [estado, setEstado]     = useState('')
  const [tipo, setTipo]         = useState('')
  const [page, setPage]         = useState(1)
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const { usuario } = useAuthStore()
  const esEditor = ['superadmin','administrador','operador','asesor_comercial'].includes(usuario?.rol)
  const esAdmin  = ['superadmin','administrador'].includes(usuario?.rol)

  const cargar = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page:pg, limit:20 })
      if (q)      params.set('q', q)
      if (estado) params.set('estado', estado)
      if (tipo)   params.set('tipo', tipo)
      const r = await api.get(`/contratos?${params}`)
      setRows(r.data.data)
      setMeta(r.data.meta)
    } finally { setLoading(false) }
  }, [q, estado, tipo, page])

  const cargarKpis = useCallback(async () => {
    const [kRes, pkgRes] = await Promise.all([
      api.get('/contratos/stats'),
      api.get('/contratos/paquetes'),
    ])
    setKpis(kRes.data.data)
    setPaquetes(pkgRes.data.data)
  }, [])

  useEffect(() => { cargarKpis() }, [cargarKpis])
  useEffect(() => { setPage(1); cargar(1) }, [q, estado, tipo])
  useEffect(() => { cargar() }, [page])

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/contratos/${id}/estado`, { estado: nuevoEstado })
      toast.success('Estado del contrato actualizado con éxito')
      cargar(); cargarKpis(); setModal(null)
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const KPI_LIST = [
    { key:'activos',     label:'Activos',     color:'#059669', bg:'#D1FAE5', Icon: Clock },
    { key:'prevision',   label:'Previsión',   color:'#0891B2', bg:'#CFFAFE', Icon: ShieldCheck },
    { key:'inmediato',   label:'Inmediato',   color:'#F59E0B', bg:'#FEF3C7', Icon: Zap },
    { key:'completados', label:'Completados', color:'#6366F1', bg:'#EEF2FF', Icon: CheckCircle2 },
    { key:'cancelados',  label:'Cancelados',  color:'#EF4444', bg:'#FEE2E2', Icon: Ban },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="ct-page">

        <div className="ct-head">
          <div className="ct-head-top">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="ct-head-icon"><FileText size={22} color="#fff"/></div>
              <div>
                <div className="ct-titulo">Contratos</div>
                <div className="ct-sub">
                  Previsión funeraria y servicios inmediatos · {meta.total} contrato{meta.total!==1?'s':''}
                </div>
              </div>
            </div>
            {esEditor && (
              <button className="ct-btn ct-btn-primary"
                onClick={() => { setSelected(null); setModal('form') }}>
                <FilePlus size={15}/> Nuevo contrato
              </button>
            )}
          </div>

          {/* KPIs */}
          <div className="ct-kpis">
            {KPI_LIST.map(k => (
              <div key={k.key} className="ct-kpi">
                <div className="ct-kpi-bar" style={{ background:k.color }}/>
                <div className="ct-kpi-body">
                  <div className="ct-kpi-icon" style={{ background:k.bg }}>
                    <k.Icon size={17} color={k.color}/>
                  </div>
                  <div className="ct-kpi-val">{kpis[k.key] ?? 0}</div>
                  <div className="ct-kpi-label">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="ct-toolbar">
            <div className="ct-search">
              <Search size={14} className="ct-search-icon"/>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar por número, contratante, difunto…"/>
            </div>
            <select className="ct-select" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="completado">Completados</option>
              <option value="cancelado">Cancelados</option>
            </select>
            <select className="ct-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="PREVISION">Previsión</option>
              <option value="INMEDIATO">Inmediato</option>
            </select>
            <button className="ct-btn ct-btn-ghost" onClick={() => cargar()} title="Recargar">
              <RefreshCw size={14} className={loading ? 'ct-spin' : ''}/>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="ct-table-wrap">
          {loading && rows.length === 0 ? (
            <div className="ct-empty">
              <Loader2 size={32} className="ct-spin" color="#F59E0B"/>
              <p>Cargando contratos…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="ct-empty">
              <div style={{ width:64, height:64, borderRadius:18, background:'#F0F1FA',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={28} color="#C7CAE8"/>
              </div>
              <p>Sin contratos registrados</p>
              <span>Use el botón "Nuevo contrato" para comenzar</span>
            </div>
          ) : (
            <table className="ct-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Contratante</th>
                  <th>Difunto</th>
                  <th>Tipo</th>
                  <th>Paquete</th>
                  <th>Valor total</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} onClick={() => { setSelected(c); setModal('ficha') }}>
                    <td><span style={{ fontWeight:900, color:'#0F1035' }}>#{c.numero}</span></td>
                    <td>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0F1035' }}>{c.contratante_nombre}</div>
                      {c.contratante_tel && <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.contratante_tel}</div>}
                    </td>
                    <td>
                      {c.difunto_nombre
                        ? <span style={{ fontSize:12.5, color:'#64748B' }}>👼 {c.difunto_nombre}</span>
                        : <span style={{ color:'#D1D5DB' }}>—</span>}
                    </td>
                    <td><TipoChip tipo={c.tipo_contrato}/></td>
                    <td style={{ fontSize:12, color:'#6B7280' }}>
                      {c.paquete_nombre || <span style={{ color:'#D1D5DB' }}>Personalizado</span>}
                    </td>
                    <td><span style={{ fontWeight:800, color:'#0F1035', fontSize:13 }}>{fmt(c.valor_total)}</span></td>
                    <td>
                      <span style={{ fontWeight:700, fontSize:12.5,
                        color:+c.saldo_pendiente > 0 ? '#EF4444' : '#059669' }}>
                        {+c.saldo_pendiente > 0 ? fmt(c.saldo_pendiente) : '✓ Al día'}
                      </span>
                    </td>
                    <td><EstadoChip estado={c.estado}/></td>
                    <td style={{ fontSize:11.5, color:'#9CA3AF' }}>{fmtDate(c.creado_en)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="ct-act view" title="Ver ficha"
                          onClick={() => { setSelected(c); setModal('ficha') }}>
                          <Eye size={13}/>
                        </button>
                        {esEditor && c.estado !== 'cancelado' && (
                          <button className="ct-act" title="Editar"
                            onClick={() => { setSelected(c); setModal('form') }}>
                            <Edit2 size={13}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        <div className="ct-pag">
          <span className="ct-pag-info">
            {meta.total} contrato{meta.total!==1?'s':''} · Página {meta.page} de {meta.pages}
          </span>
          <div className="ct-pag-btns">
            <button className="ct-pag-btn" disabled={page<=1} onClick={() => setPage(p=>p-1)}>
              <ChevronLeft size={14}/>
            </button>
            <button className="ct-pag-btn" disabled={page>=meta.pages} onClick={() => setPage(p=>p+1)}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </div>

      {modal === 'form' && (
        <ModalForm
          contrato={selected}
          paquetes={paquetes}
          onClose={() => { setModal(null); setSelected(null) }}
          onSaved={() => { setModal(null); setSelected(null); cargar(); cargarKpis() }}
        />
      )}
      {modal === 'ficha' && selected && (
        <ModalFicha
          id={selected.id}
          onClose={() => { setModal(null); setSelected(null) }}
          onEditar={(c) => { setSelected(c); setModal('form') }}
          onEstado={(id, est) => { cambiarEstado(id, est) }}
        />
      )}
    </>
  )
}
