/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración de Empresa                             ║
 * ║  Archivo         : ConfiguracionPage.jsx                                ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Building2, MapPin, FileText, Sliders,
  Package, Bell, Palette,
  Save, Plus, Pencil, CheckCircle2,
  AlertCircle, Loader2, ChevronRight, X,
  CreditCard, ToggleLeft, ToggleRight, Shield, DoorOpen, Users,
  PackagePlus, Trash2, GripVertical,
  Truck, UserSquare2,
  MessageCircle, Smartphone, RefreshCw, XCircle, Send, Wifi, WifiOff,
} from 'lucide-react'
import { empresaService } from '../../services/empresa.service.js'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { aplicarColoresTema } from '../../context/ThemeContext.jsx'

const TABS = [
  { id:'empresa',        label:'Empresa',           sub:'Datos legales',        Icon:Building2, color:'#6366F1' },
  { id:'sedes',          label:'Sedes',              sub:'Sucursales',           Icon:MapPin,    color:'#10B981' },
  { id:'salas',          label:'Salas de Velación',  sub:'Capacidad y estados',  Icon:DoorOpen,  color:'#8B5CF6' },
  { id:'flota',          label:'Flota',              sub:'Vehículos y conductores', Icon:Truck, color:'#0891B2' },
  { id:'dian',           label:'DIAN',               sub:'Facturación electr.',  Icon:FileText,  color:'#F59E0B' },
  { id:'parametros',     label:'Parámetros',         sub:'Numeración / mora',    Icon:Sliders,   color:'#64748B' },
  { id:'servicios',      label:'Servicios',          sub:'Ítems de servicio',    Icon:Package,   color:'#0EA5E9' },
  { id:'paquetes',       label:'Paquetes',            sub:'Combos de servicio',   Icon:PackagePlus, color:'#7C3AED' },
  { id:'tipos_doc',      label:'Tipos Documento',    sub:'DIAN Colombia',        Icon:CreditCard, color:'#0891B2' },
  { id:'formas_pago',    label:'Formas de Pago',     sub:'Métodos de cobro',     Icon:CreditCard, color:'#059669' },
  { id:'notificaciones', label:'Notificaciones',     sub:'WhatsApp / Email',     Icon:Bell,      color:'#EC4899' },
  { id:'apariencia',     label:'Apariencia',         sub:'Colores del sistema',  Icon:Palette,   color:'#C9A020' },
]

const TIPO_REGIMEN = ['NO_RESPONSABLE_IVA','RESPONSABLE_IVA']
const TIPO_PERSONA = ['JURIDICA','NATURAL']
const CATEGORIAS   = ['ATAUD','URNA','TRASLADO','SALA_VELACION','DOCUMENTOS','CREMACION','INHUMACION','PREPARACION','FLORES','ADICIONAL']
const TIPOS_PLAN   = ['INDIVIDUAL','FAMILIAR','EMPRESARIAL','CONVENIO']

const CSS = `
  @keyframes spin    { to { transform:rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  @keyframes slideIn { from { opacity:0; transform:translateX(10px) } to { opacity:1; transform:translateX(0) } }
  @keyframes modalIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }

  /* ── Modal overlay ── */
  .modal-overlay { position:fixed; inset:0; background:rgba(15,16,53,.45); z-index:8000;
                   display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal-box     { background:#fff; border-radius:20px; width:100%; max-width:580px;
                   box-shadow:0 24px 60px rgba(0,0,0,.18); animation:modalIn .22s ease;
                   max-height:90vh; overflow-y:auto; }
  .modal-head    { padding:22px 28px 18px; border-bottom:1px solid #F4F5FB;
                   display:flex; align-items:center; justify-content:space-between; }
  .modal-title   { font-size:16px; font-weight:800; color:#0F1035; }
  .modal-body    { padding:22px 28px 28px; }
  .modal-close   { background:none; border:none; cursor:pointer; color:#9CA3AF;
                   display:flex; padding:4px; border-radius:6px; }
  .modal-close:hover { color:#EF4444; background:#FEE2E2; }

  .cfg-page  { display:flex; flex-direction:column; height:100%; background:#F5F6FB; overflow:hidden; }
  .cfg-body  { display:flex; flex:1; overflow:hidden; gap:0; }

  /* ── Tabs sidebar ── */
  .cfg-tabs  { width:200px; flex-shrink:0; background:#fff; border-right:1px solid #ECEDF8;
               display:flex; flex-direction:column; overflow-y:auto; padding:16px 10px; gap:4px; }
  .cfg-tab   { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:12px;
               cursor:pointer; border:none; background:transparent; width:100%; text-align:left;
               transition:all .15s; }
  .cfg-tab:hover  { background:#F4F5FA; }
  .cfg-tab.active { background:#F0F1FF; }
  .cfg-tab-icon   { width:36px; height:36px; border-radius:10px; display:flex; align-items:center;
                    justify-content:center; flex-shrink:0; }
  .cfg-tab-text   { flex:1; overflow:hidden; }
  .cfg-tab-label  { font-size:13px; font-weight:700; color:#374151; line-height:1.1;
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cfg-tab.active .cfg-tab-label { color:#2E3192; }
  .cfg-tab-sub    { font-size:10px; color:#9CA3AF; margin-top:1px; white-space:nowrap;
                    overflow:hidden; text-overflow:ellipsis; }
  .cfg-tab-arr    { opacity:0; transition:opacity .15s; color:#2E3192; }
  .cfg-tab.active .cfg-tab-arr { opacity:1; }

  /* ── Content ── */
  .cfg-content { flex:1; overflow-y:auto; padding:28px 32px; }
  .cfg-content::-webkit-scrollbar { width:4px; }
  .cfg-content::-webkit-scrollbar-thumb { background:#DDE1F0; border-radius:4px; }

  /* ── Section card ── */
  .sec-card  { background:#fff; border-radius:20px; border:1px solid #ECEDF8;
               box-shadow:0 1px 4px rgba(0,0,0,.04); overflow:hidden;
               animation:slideIn .22s ease; }
  .sec-head  { padding:22px 28px 18px; border-bottom:1px solid #F4F5FB;
               display:flex; align-items:center; gap:14px; }
  .sec-head-icon { width:42px; height:42px; border-radius:12px; display:flex;
                   align-items:center; justify-content:center; flex-shrink:0; }
  .sec-head-text {}
  .sec-title { font-size:17px; font-weight:800; color:#0F1035; line-height:1.1; }
  .sec-sub   { font-size:12px; color:#9CA3AF; margin-top:3px; }
  .sec-body  { padding:24px 28px 28px; }

  /* ── Grid ── */
  .g1 { display:grid; grid-template-columns:1fr; gap:14px 18px; }
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:14px 18px; }
  .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px 18px; }
  .span2 { grid-column:span 2; }
  .span3 { grid-column:span 3; }

  /* ── Divider ── */
  .divrow { display:flex; align-items:center; gap:12px; margin:20px 0 14px; }
  .divlabel { font-size:10px; font-weight:800; color:#6366F1; letter-spacing:1.4px;
              text-transform:uppercase; white-space:nowrap; }
  .divline  { flex:1; height:1px; background:#F0F1FF; }

  /* ── Campo ── */
  .campo label { display:block; font-size:10.5px; font-weight:800; color:#6B7280;
                 text-transform:uppercase; letter-spacing:.9px; margin-bottom:6px; }
  .campo input, .campo select, .campo textarea {
    width:100%; padding:10px 14px; border:1.5px solid #E8E9F8; border-radius:10px;
    font-size:13.5px; color:#0F1035; background:#FAFBFF; outline:none;
    transition:border-color .15s, box-shadow .15s; font-family:inherit;
    box-sizing:border-box;
  }
  .campo input:focus, .campo select:focus, .campo textarea:focus {
    border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.1);
  }
  .campo input:disabled { background:#F4F5FA; color:#9CA3AF; cursor:not-allowed; }
  .campo textarea { resize:vertical; line-height:1.6; }

  /* ── Info box ── */
  .info-box { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px;
              padding:12px 16px; font-size:12.5px; color:#1D4ED8;
              margin-bottom:18px; display:flex; gap:10px; align-items:flex-start; line-height:1.5; }

  /* ── Notificaciones: sub-tabs ── */
  .notif-subtabs { display:flex; gap:6px; margin-bottom:18px; border-bottom:1.5px solid #ECEDF8; padding-bottom:0; }
  .notif-subtab { display:flex; align-items:center; gap:7px; padding:10px 18px; border:none; background:none;
                  font-size:13px; font-weight:700; color:#9CA3AF; cursor:pointer; border-radius:10px 10px 0 0;
                  border-bottom:2.5px solid transparent; transition:all .15s; margin-bottom:-1.5px; }
  .notif-subtab:hover { color:#4B5065; background:#FAFBFF; }
  .notif-subtab.active { color:#2E3192; border-bottom-color:#2E3192; background:#F8F9FF; }

  /* ── WhatsApp / SMS status cards ── */
  .wa-status-row { display:flex; align-items:center; justify-content:space-between;
                   padding:12px 16px; border:1.5px solid #ECEDF8; border-radius:12px; margin-bottom:14px; }
  .wa-status-label { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:700; color:#374151; }
  .wa-status-badge { padding:5px 12px; border-radius:20px; font-size:12px; font-weight:800; }
  .wa-status-body { display:flex; flex-direction:column; align-items:center; text-align:center;
                    padding:20px; border:1.5px solid #ECEDF8; border-radius:14px; gap:4px; }
  .wa-status-title { font-size:15px; font-weight:800; margin-top:6px; }
  .wa-status-sub { font-size:12px; color:#6B7280; max-width:340px; }
  .wa-status-info { display:flex; flex-direction:column; gap:6px; margin-top:14px; width:100%; max-width:320px; }
  .wa-status-info div { display:flex; justify-content:space-between; font-size:12.5px;
                         padding:6px 0; border-bottom:1px solid #F0F1F8; }
  .wa-status-info span { color:#6B7280; }
  .wa-status-info strong { color:#0F1035; }
  .wa-status-footer { text-align:center; font-size:11px; color:#9CA3AF; margin-top:10px; }
  .spin { animation:spin 1s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  .sms-log-table { width:100%; border-collapse:collapse; font-size:12.5px; }
  .sms-log-table th { text-align:left; color:#9CA3AF; font-weight:700; font-size:10.5px;
                       text-transform:uppercase; letter-spacing:.4px; padding:6px 10px; border-bottom:1.5px solid #ECEDF8; }
  .sms-log-table td { padding:8px 10px; border-bottom:1px solid #F0F1F8; color:#374151; }
  .sms-log-msg { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  /* ── Buttons ── */
  .btn-primary { display:inline-flex; align-items:center; gap:7px;
                 background:linear-gradient(135deg,#2E3192,#4338CA);
                 color:#fff; border:none; border-radius:11px;
                 padding:11px 22px; font-size:13.5px; font-weight:700;
                 cursor:pointer; box-shadow:0 3px 14px rgba(46,49,146,.28);
                 transition:all .15s; }
  .btn-primary:hover  { box-shadow:0 5px 20px rgba(46,49,146,.38); transform:translateY(-1px); }
  .btn-primary:disabled { opacity:.65; cursor:not-allowed; transform:none; }
  .btn-secondary { display:inline-flex; align-items:center; gap:7px;
                   background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0;
                   border-radius:11px; padding:11px 20px; font-size:13.5px;
                   font-weight:600; cursor:pointer; transition:all .15s; }
  .btn-secondary:hover { background:#ECEDF8; }
  .btn-icon { background:#F4F5FA; border:1px solid #E8E9F8; border-radius:9px;
              width:34px; height:34px; display:flex; align-items:center;
              justify-content:center; color:#6366F1; cursor:pointer; transition:all .15s; }
  .btn-icon:hover { background:#EEF0FF; }
  .btn-bar { display:flex; align-items:center; gap:10px; margin-top:22px; padding-top:20px;
             border-top:1px solid #F0F1FA; }

  /* ── Table ── */
  .tbl-wrap { border:1px solid #ECEDF8; border-radius:14px; overflow:hidden; }
  .tbl      { width:100%; border-collapse:collapse; }
  .tbl th   { padding:11px 16px; background:#F8F9FF; font-size:10px; font-weight:800;
              color:#9CA3AF; text-transform:uppercase; letter-spacing:.9px;
              text-align:left; border-bottom:1px solid #ECEDF8; }
  .tbl td   { padding:12px 16px; font-size:13px; color:#374151;
              border-bottom:1px solid #F4F5FA; }
  .tbl tr:last-child td { border-bottom:none; }
  .tbl tr:hover td { background:#FAFBFF; }

  /* ── Badges ── */
  .badge     { display:inline-flex; align-items:center; font-size:11px; font-weight:700;
               padding:3px 10px; border-radius:20px; }
  .badge-blue   { background:#EEF2FF; color:#4338CA; }
  .badge-green  { background:#D1FAE5; color:#047857; }
  .badge-red    { background:#FEE2E2; color:#DC2626; }
  .badge-amber  { background:#FEF3C7; color:#B45309; }
  .code-tag { font-size:11.5px; font-weight:700; color:#4338CA; background:#EEF2FF;
              padding:2px 8px; border-radius:6px; font-family:monospace; }

  /* ── Sede card ── */
  .sede-card { display:flex; align-items:center; gap:14px; background:#FAFBFF;
               border:1.5px solid #ECEDF8; border-radius:14px; padding:16px 18px;
               transition:all .15s; }
  .sede-card:hover { border-color:#C7D2FE; box-shadow:0 2px 10px rgba(99,102,241,.08); }
  .sede-card-icon { width:44px; height:44px; border-radius:12px; flex-shrink:0;
                    background:linear-gradient(135deg,#6366F1,#4338CA);
                    display:flex; align-items:center; justify-content:center; }
  .sede-card-body { flex:1; }
  .sede-card-name  { font-size:14px; font-weight:700; color:#0F1035; display:flex; align-items:center; gap:8px; }
  .sede-card-meta  { font-size:12px; color:#9CA3AF; margin-top:3px; }

  /* ── Color picker ── */
  .color-row { display:flex; align-items:center; gap:12px; }
  .color-row input.color-swatch {
    width:46px; height:46px; min-width:46px; flex:0 0 46px; padding:2px;
    border-radius:12px; border:2px solid #E2E5F0; cursor:pointer;
  }
  .color-row input:not(.color-swatch) { flex:1; min-width:0; }
  .color-preview { margin-top:16px; height:72px; border-radius:16px; display:flex;
                   align-items:center; justify-content:center; font-size:14px;
                   font-weight:800; color:#fff; letter-spacing:.5px;
                   box-shadow:0 4px 20px rgba(0,0,0,.12); }
  .color-row input[type='text'], .color-row input:not([type]) { font-family:'JetBrains Mono',monospace; letter-spacing:.5px; text-transform:uppercase; }
  .input-err { border-color:#EF4444 !important; background:#FFF5F5 !important; }
  .color-hint-err { font-size:11px; color:#DC2626; margin-top:5px; font-weight:600; }

  .paleta-row { display:flex; flex-wrap:wrap; gap:8px; }
  .paleta-chip {
    display:flex; align-items:center; gap:7px;
    background:#F8F9FF; border:1.5px solid #E2E5F0; border-radius:11px;
    padding:8px 13px; font-size:12px; font-weight:700; color:#374151;
    cursor:pointer; transition:all .15s;
  }
  .paleta-chip:hover { border-color:#C7CBE8; background:#F0F1FA; transform:translateY(-1px); }
  .paleta-dot { width:14px; height:14px; border-radius:50%; border:1.5px solid rgba(0,0,0,.08); flex-shrink:0; }

  .ap-preview { margin-top:22px; }
  .ap-preview-lbl { font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#9CA3AF; margin-bottom:10px; }
  .ap-preview-mock {
    display:flex; border-radius:16px; overflow:hidden; border:1px solid #ECEDF8;
    box-shadow:0 4px 20px rgba(0,0,0,.06); height:180px;
  }
  .ap-mock-sidebar { width:34%; padding:18px 16px; display:flex; flex-direction:column; gap:10px; }
  .ap-mock-dot { width:22px; height:22px; border-radius:7px; margin-bottom:6px; }
  .ap-mock-bar { height:9px; border-radius:5px; background:rgba(255,255,255,.35); width:80%; }
  .ap-mock-bar.active { width:75%; height:26px; border-radius:8px; margin:2px 0; }
  .ap-mock-main { flex:1; background:#F8F9FF; padding:24px 22px; display:flex; flex-direction:column; gap:14px; align-items:flex-start; }
  .ap-mock-btn { color:#fff; font-size:13px; font-weight:800; padding:11px 22px; border-radius:11px; box-shadow:0 4px 14px rgba(0,0,0,.12); }
  .ap-mock-chip { font-size:11.5px; font-weight:700; padding:6px 14px; border-radius:20px; border:1.5px solid; }

  /* ── Form panel (modal inline) ── */
  .form-panel { background:#F8F9FF; border:1.5px solid #DDE1F0; border-radius:16px;
                padding:22px 24px; margin-top:20px; animation:fadeUp .2s ease; }
  .form-panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
  .form-panel-title { font-size:15px; font-weight:800; color:#0F1035; }
  .form-panel-close { background:none; border:none; cursor:pointer; color:#9CA3AF;
                      display:flex; align-items:center; padding:4px; border-radius:6px; }
  .form-panel-close:hover { color:#EF4444; background:#FEE2E2; }

  /* ── Select filter ── */
  .select-filter { padding:9px 13px; border:1.5px solid #E2E5F0; border-radius:10px;
                   font-size:13px; font-family:inherit; outline:none;
                   background:#FAFBFF; color:#374151; }

  /* ── Toast ── */
  .toast { position:fixed; top:20px; right:28px; z-index:9999;
           display:flex; align-items:center; gap:10px; padding:13px 18px;
           border-radius:12px; border:1px solid; font-size:13px; font-weight:600;
           box-shadow:0 8px 24px rgba(0,0,0,.12); animation:fadeUp .22s ease; }
  .toast.ok    { background:#F0FDF4; border-color:#A7F3D0; color:#065F46; }
  .toast.error { background:#FFF1F2; border-color:#FECDD3; color:#BE123C; }
`

/* ════════════════════════════════════
   Hook de selectores de Territorio
════════════════════════════════════ */
function useTerritorio() {
  const [depts,  setDepts]  = useState([])
  const [mpios,  setMpios]  = useState([])
  const [zonas,  setZonas]  = useState([])

  useEffect(() => {
    api.get('/territorio/select/departamentos').then(r => setDepts(r.data.data)).catch(() => {})
  }, [])

  const cargarMpios = useCallback(async (deptId) => {
    if (!deptId) { setMpios([]); setZonas([]); return }
    const r = await api.get(`/territorio/select/municipios?departamento_id=${deptId}`)
    setMpios(r.data.data)
    setZonas([])
  }, [])

  const cargarZonas = useCallback(async (mpioId) => {
    if (!mpioId) { setZonas([]); return }
    const r = await api.get(`/territorio/select/zonas?municipio_id=${mpioId}`)
    setZonas(r.data.data)
  }, [])

  return { depts, mpios, zonas, cargarMpios, cargarZonas }
}

/* ════════════════════════════════════
   TAB PAQUETES
════════════════════════════════════ */

const fmtCOP = v => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v||0)

const CAT_COLOR = {
  ATAUD:'#7C3AED', TRASLADO:'#2563EB', SALA_VELACION:'#0891B2',
  DOCUMENTOS:'#D97706', CREMACION:'#DC2626', PREPARACION:'#059669',
  FLORES:'#DB2777', ADICIONAL:'#64748B', INHUMACION:'#92400E',
  URNA:'#6D28D9', GENERAL:'#374151',
}

function TabPaquetes() {
  const [paquetes,   setPaquetes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')

  const PBLANK = { nombre:'', descripcion:'', precio_base:'', activo:true }
  const [pForm, setPForm] = useState({ ...PBLANK })

  // Items
  const [items,      setItems]      = useState([])
  const [catalogo,   setCatalogo]   = useState([])  // catálogo completo para selector
  const [busqueda,   setBusqueda]   = useState('')
  const [catSel,     setCatSel]     = useState(null) // ítem de catálogo seleccionado
  const [savingIt,   setSavingIt]   = useState(false)
  const [itemMsg,    setItemMsg]    = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const r = await api.get('/contratos/paquetes?todos=1')
      setPaquetes(r.data.data || [])
    } finally { setLoading(false) }
  }

  const cargarItems = async (paqId) => {
    const r = await api.get(`/contratos/paquetes/${paqId}/items`)
    setItems(r.data.data || [])
  }

  const cargarCatalogo = async () => {
    if (catalogo.length) return
    const r = await api.get('/servicios/catalogo')
    setCatalogo(r.data.data || [])
  }

  useEffect(() => { cargar() }, [])

  const abrirPaquete = (p = null) => {
    setSelected(p)
    setPForm(p ? { nombre:p.nombre, descripcion:p.descripcion||'', precio_base:p.precio_base, activo:p.activo } : { ...PBLANK })
    setMsg('')
    setModal('paquete')
  }

  const abrirItems = async (p) => {
    setSelected(p)
    setBusqueda(''); setCatSel(null); setItemMsg('')
    await Promise.all([cargarItems(p.id), cargarCatalogo()])
    setModal('items')
  }

  const guardarPaquete = async () => {
    if (!pForm.nombre || !pForm.precio_base) return setMsg('Nombre y precio son obligatorios')
    setSaving(true); setMsg('')
    try {
      if (selected) {
        await api.put(`/contratos/paquetes/${selected.id}`, pForm)
        toast.success('Paquete actualizado con éxito')
      } else {
        await api.post('/contratos/paquetes', pForm)
        toast.success('Paquete creado con éxito')
      }
      await cargar(); setModal(null)
    } catch (e) {
      setMsg(e.response?.data?.error || 'Error al guardar')
      toast.error(e.response?.data?.error || 'Error al guardar')
    }
    finally { setSaving(false) }
  }

  const toggleActivo = async (p) => {
    await api.put(`/contratos/paquetes/${p.id}`, { ...p, activo: !p.activo })
    toast.success(p.activo ? 'Paquete desactivado con éxito' : 'Paquete activado con éxito')
    cargar()
  }

  const agregarItem = async () => {
    if (!catSel) return
    setSavingIt(true); setItemMsg('')
    try {
      await api.post(`/contratos/paquetes/${selected.id}/items`, { catalogo_id: catSel.id })
      toast.success('Ítem agregado con éxito')
      await cargarItems(selected.id)
      setCatSel(null); setBusqueda('')
    } catch (e) {
      setItemMsg(e.response?.data?.error || 'Error al agregar')
      toast.error(e.response?.data?.error || 'Error al agregar')
    }
    finally { setSavingIt(false) }
  }

  const eliminarItem = async (itemId) => {
    await api.delete(`/contratos/paquetes/${selected.id}/items/${itemId}`)
    toast.success('Ítem eliminado con éxito')
    cargarItems(selected.id)
  }

  // Catálogo filtrado (excluye los ya agregados)
  const yaAgregados = new Set(items.map(i => i.catalogo_id).filter(Boolean))
  const catalogoFiltrado = catalogo.filter(c =>
    !yaAgregados.has(c.id) &&
    (busqueda.length < 2 || c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.categoria.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const COLOR = ['#2563EB','#059669','#7C3AED','#D97706','#DC2626','#0891B2']

  return (
    <div style={{ padding:'24px', animation:'fadeUp .2s ease' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:900, color:'#0F1035' }}>Paquetes de Servicio</div>
          <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
            {paquetes.length} paquetes · Combos de cobertura para servicios directos
          </div>
        </div>
        <button onClick={() => abrirPaquete()}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px',
            background:'linear-gradient(135deg,#7C3AED,#6D28D9)', color:'#fff',
            border:'none', borderRadius:12, fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <Plus size={14}/> Nuevo paquete
        </button>
      </div>

      {/* Grid de paquetes */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <Loader2 size={28} color="#7C3AED" style={{ animation:'spin .7s linear infinite' }}/>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:18 }}>
          {paquetes.map((p, idx) => {
            const col = COLOR[idx % COLOR.length]
            return (
              <div key={p.id} style={{
                background:'#fff', borderRadius:18,
                border: p.activo ? `1.5px solid ${col}30` : '1.5px solid #E8EAF0',
                overflow:'hidden',
                boxShadow: p.activo
                  ? `0 4px 20px ${col}22, 0 1px 4px rgba(0,0,0,.06)`
                  : '0 2px 8px rgba(0,0,0,.04)',
                opacity: p.activo ? 1 : .5,
                transition:'box-shadow .2s, opacity .2s'
              }}>
                {/* Barra superior con gradiente */}
                <div style={{
                  height:6,
                  background: p.activo ? `linear-gradient(90deg, ${col}, ${col}88)` : '#E2E8F0'
                }}/>

                <div style={{ padding:'18px 20px' }}>
                  {/* Header: nombre + toggle */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{ fontSize:16, fontWeight:900, color: p.activo ? '#0F1035' : '#94A3B8', letterSpacing:-.3 }}>
                      {p.nombre}
                    </div>
                    <button onClick={() => toggleActivo(p)}
                      title={p.activo ? 'Desactivar' : 'Activar'}
                      style={{ border:'none', background:'none', cursor:'pointer', padding:2, lineHeight:0 }}>
                      {p.activo
                        ? <ToggleRight size={28} color={col}/>
                        : <ToggleLeft  size={28} color="#CBD5E1"/>}
                    </button>
                  </div>

                  {/* Precio */}
                  <div style={{
                    fontSize:22, fontWeight:900, letterSpacing:-.5,
                    color: p.activo ? col : '#CBD5E1',
                    marginBottom:14
                  }}>
                    {fmtCOP(p.precio_base)}
                  </div>

                  {/* Ítems */}
                  <div style={{ marginBottom:16, minHeight:72 }}>
                    {(p.items||[]).slice(0,4).map((it,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:7,
                        fontSize:12, color:'#4B5563', marginBottom:5, lineHeight:1.3 }}>
                        <CheckCircle2 size={12} color={p.activo ? col : '#CBD5E1'} style={{ flexShrink:0 }}/>
                        {it.nombre}
                      </div>
                    ))}
                    {(p.items||[]).length > 4 && (
                      <div style={{ fontSize:11, color: p.activo ? col : '#CBD5E1',
                        fontWeight:700, marginTop:4, paddingLeft:19 }}>
                        +{p.items.length - 4} más incluidos
                      </div>
                    )}
                    {(p.items||[]).length === 0 && (
                      <div style={{ fontSize:11.5, color:'#D1D5DB', fontStyle:'italic' }}>
                        Sin ítems configurados
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:'flex', gap:8, borderTop:'1px solid #F4F6FA', paddingTop:14 }}>
                    <button onClick={() => abrirPaquete(p)}
                      style={{ flex:1, padding:'8px 0', border:'1.5px solid #E4E6F0',
                        borderRadius:10, background:'#F8F9FF', color:'#374151',
                        fontSize:12, fontWeight:700, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
                      onMouseEnter={e => e.currentTarget.style.background='#EEF0FF'}
                      onMouseLeave={e => e.currentTarget.style.background='#F8F9FF'}>
                      <Pencil size={12}/> Editar
                    </button>
                    <button onClick={() => abrirItems(p)}
                      style={{ flex:1, padding:'8px 0',
                        border:`1.5px solid ${p.activo ? col+'44' : '#E4E6F0'}`,
                        borderRadius:10,
                        background: p.activo ? `${col}14` : '#F8F9FF',
                        color: p.activo ? col : '#9CA3AF',
                        fontSize:12, fontWeight:700, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <GripVertical size={12}/> Ítems ({(p.items||[]).length})
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal crear/editar paquete ── */}
      {modal === 'paquete' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div className="modal-head">
              <div className="modal-title">{selected ? 'Editar paquete' : 'Nuevo paquete'}</div>
              <button className="modal-close" onClick={() => setModal(null)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              {msg && <div style={{ background:'#FEE2E2', color:'#DC2626', borderRadius:8,
                padding:'8px 12px', fontSize:12, fontWeight:600, marginBottom:12 }}>{msg}</div>}

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                    Nombre del paquete <span style={{ color:'#EF4444' }}>*</span>
                  </label>
                  <input value={pForm.nombre} onChange={e => setPForm(p=>({...p,nombre:e.target.value}))}
                    placeholder="Ej: Básico, Clásico, Diamante…"
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0',
                      borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                    Precio base <span style={{ color:'#EF4444' }}>*</span>
                  </label>
                  <input type="number" value={pForm.precio_base}
                    onChange={e => setPForm(p=>({...p,precio_base:e.target.value}))}
                    placeholder="0"
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0',
                      borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                    Descripción
                  </label>
                  <textarea value={pForm.descripcion}
                    onChange={e => setPForm(p=>({...p,descripcion:e.target.value}))}
                    rows={3} placeholder="Descripción del paquete…"
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0',
                      borderRadius:10, fontSize:13, outline:'none', resize:'vertical',
                      boxSizing:'border-box', fontFamily:'inherit' }}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button onClick={() => setPForm(p=>({...p,activo:!p.activo}))} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    {pForm.activo ? <ToggleRight size={28} color="#7C3AED"/> : <ToggleLeft size={28} color="#CBD5E1"/>}
                  </button>
                  <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>
                    {pForm.activo ? 'Activo — aparece en el formulario de servicios' : 'Inactivo — oculto del formulario'}
                  </span>
                </div>
              </div>

              <button onClick={guardarPaquete} disabled={saving}
                style={{ width:'100%', marginTop:20, padding:'11px 0',
                  background:'linear-gradient(135deg,#7C3AED,#6D28D9)', color:'#fff',
                  border:'none', borderRadius:12, fontWeight:800, fontSize:14,
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {saving ? <Loader2 size={16} style={{ animation:'spin .7s linear infinite' }}/> : <Save size={14}/>}
                {saving ? 'Guardando…' : 'Guardar paquete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ítems del paquete ── */}
      {modal === 'items' && selected && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth:620 }}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Servicios incluidos — {selected.nombre}</div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>
                  {items.length} servicio{items.length!==1?'s':''} del catálogo incluido{items.length!==1?'s':''}
                </div>
              </div>
              <button className="modal-close" onClick={() => setModal(null)}><X size={16}/></button>
            </div>
            <div className="modal-body">

              {/* ── Buscador del catálogo ── */}
              <div style={{ background:'#F8F9FF', borderRadius:14, padding:'16px',
                border:'1.5px solid #ECEDF8', marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#7C3AED',
                  letterSpacing:.8, textTransform:'uppercase', marginBottom:10 }}>
                  Agregar desde catálogo de servicios
                </div>

                {/* Búsqueda */}
                <div style={{ position:'relative', marginBottom: catSel ? 12 : 0 }}>
                  <input
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setCatSel(null) }}
                    placeholder="Buscar por nombre, código o categoría…"
                    style={{ width:'100%', padding:'9px 12px 9px 36px',
                      border:'1.5px solid #E2E5F0', borderRadius:10,
                      fontSize:13, outline:'none', boxSizing:'border-box' }}/>
                  <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)',
                    color:'#9CA3AF', pointerEvents:'none' }}
                    width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>

                {/* Lista desplegable del catálogo */}
                {busqueda.length >= 1 && !catSel && (
                  <div style={{ maxHeight:200, overflowY:'auto', marginBottom:8,
                    border:'1.5px solid #E2E5F0', borderRadius:10, background:'#fff' }}>
                    {catalogoFiltrado.length === 0 ? (
                      <div style={{ padding:'14px 16px', fontSize:12, color:'#9CA3AF', textAlign:'center' }}>
                        Sin coincidencias en el catálogo
                      </div>
                    ) : catalogoFiltrado.map(c => (
                      <button key={c.id} onClick={() => { setCatSel(c); setBusqueda(c.nombre) }}
                        style={{ display:'flex', alignItems:'center', gap:12, width:'100%',
                          padding:'10px 14px', border:'none', borderBottom:'1px solid #F4F5FA',
                          background:'none', cursor:'pointer', textAlign:'left' }}
                        onMouseEnter={e => e.currentTarget.style.background='#F8F9FF'}
                        onMouseLeave={e => e.currentTarget.style.background='none'}>
                        <span style={{ fontSize:10, fontWeight:800, padding:'2px 7px',
                          borderRadius:6, background: (CAT_COLOR[c.categoria]||'#374151')+'18',
                          color: CAT_COLOR[c.categoria]||'#374151', whiteSpace:'nowrap' }}>
                          {c.codigo}
                        </span>
                        <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#0F1035' }}>{c.nombre}</span>
                        <span style={{ fontSize:12, color:'#6B7280', whiteSpace:'nowrap' }}>
                          {fmtCOP(c.precio_base)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Preview del seleccionado */}
                {catSel && (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                    background:`${CAT_COLOR[catSel.categoria]||'#374151'}0E`,
                    border:`1.5px solid ${CAT_COLOR[catSel.categoria]||'#374151'}30`,
                    borderRadius:10, marginBottom:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10, fontWeight:800, marginBottom:2,
                        color: CAT_COLOR[catSel.categoria]||'#374151' }}>
                        {catSel.codigo} · {catSel.categoria}
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0F1035' }}>{catSel.nombre}</div>
                    </div>
                    <div style={{ fontSize:15, fontWeight:900,
                      color: CAT_COLOR[catSel.categoria]||'#374151' }}>
                      {fmtCOP(catSel.precio_base)}
                    </div>
                    <button onClick={() => { setCatSel(null); setBusqueda('') }}
                      style={{ border:'none', background:'none', cursor:'pointer',
                        color:'#9CA3AF', lineHeight:0, padding:2 }}>
                      <X size={14}/>
                    </button>
                  </div>
                )}

                {itemMsg && (
                  <div style={{ background:'#FEE2E2', color:'#DC2626', borderRadius:8,
                    padding:'7px 12px', fontSize:12, fontWeight:600, marginBottom:10 }}>
                    {itemMsg}
                  </div>
                )}

                <button onClick={agregarItem} disabled={!catSel || savingIt}
                  style={{ padding:'8px 18px',
                    background: catSel ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : '#E4E6F0',
                    color: catSel ? '#fff' : '#9CA3AF',
                    border:'none', borderRadius:10, fontSize:12, fontWeight:700,
                    cursor: catSel ? 'pointer' : 'default',
                    display:'flex', alignItems:'center', gap:6, transition:'background .15s' }}>
                  {savingIt ? <Loader2 size={13} style={{ animation:'spin .7s linear infinite' }}/> : <Plus size={13}/>}
                  {savingIt ? 'Agregando…' : 'Agregar al paquete'}
                </button>
              </div>

              {/* ── Lista de ítems actuales ── */}
              <div style={{ fontSize:11, fontWeight:800, color:'#374151',
                letterSpacing:.6, textTransform:'uppercase', marginBottom:10 }}>
                Servicios incluidos en este paquete
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {items.length === 0 && (
                  <div style={{ textAlign:'center', padding:'28px 0', color:'#CBD5E1', fontSize:13 }}>
                    Sin servicios aún. Búscalos en el catálogo arriba.
                  </div>
                )}
                {items.map(it => {
                  const col = CAT_COLOR[it.categoria] || '#374151'
                  return (
                    <div key={it.id} style={{ display:'flex', alignItems:'center', gap:12,
                      padding:'11px 14px', background:'#fff', borderRadius:11,
                      border:'1.5px solid #ECEDF8' }}>
                      <div style={{ width:36, height:36, borderRadius:9, flexShrink:0,
                        background:`${col}14`, display:'flex', alignItems:'center',
                        justifyContent:'center' }}>
                        <CheckCircle2 size={16} color={col}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#0F1035',
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {it.nombre}
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:2 }}>
                          {it.catalogo_codigo && (
                            <span style={{ fontSize:10, fontWeight:800, padding:'1px 6px',
                              borderRadius:5, background:`${col}18`, color:col }}>
                              {it.catalogo_codigo}
                            </span>
                          )}
                          <span style={{ fontSize:11, color:'#9CA3AF' }}>{it.categoria}</span>
                        </div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, color:col, whiteSpace:'nowrap' }}>
                        {it.precio_unitario > 0 ? fmtCOP(it.precio_unitario) : '—'}
                      </div>
                      <button onClick={() => eliminarItem(it.id)}
                        style={{ border:'none', background:'none', cursor:'pointer',
                          color:'#CBD5E1', padding:4, borderRadius:6, lineHeight:0,
                          transition:'color .15s' }}
                        onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                        onMouseLeave={e => e.currentTarget.style.color='#CBD5E1'}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════ */
export default function ConfiguracionPage() {
  const [tab,      setTab]    = useState('empresa')
  const [empresa,   setEmpresa]  = useState(null)
  const [sedes,     setSedes]    = useState([])
  const [salas,     setSalas]    = useState([])
  const [servs,     setServs]    = useState([])
  const [tiposDoc,  setTiposDoc] = useState([])
  const [loading,   setLoading]  = useState(true)
  const [saving,    setSaving]   = useState(false)
  const [toast,     setToast]    = useState(null)

  const ok  = (msg) => { setToast({ msg, t:'ok'    }); setTimeout(() => setToast(null), 3200) }
  const err = (msg) => { setToast({ msg, t:'error' }); setTimeout(() => setToast(null), 3200) }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [eR,sR,svR,tdR,salR] = await Promise.all([
        empresaService.obtener(),
        empresaService.listarSedes(),
        empresaService.listarServicios(),
        api.get('/tipos-documento'),
        api.get('/servicios/salas'),
      ])
      setEmpresa(eR.data.data)
      setSedes(sR.data.data)
      setServs(svR.data.data)
      setTiposDoc(tdR.data.data)
      setSalas(salR.data.data || [])
    } catch { err('Error al cargar configuración') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const tabActivo = TABS.find(t => t.id === tab)

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12 }}>
      <style>{CSS}</style>
      <Loader2 size={30} color="#6366F1" style={{ animation:'spin 1s linear infinite' }} />
      <span style={{ color:'#9CA3AF', fontSize:13 }}>Cargando configuración…</span>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      {toast && (
        <div className={`toast ${toast.t}`}>
          {toast.t === 'ok' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div className="cfg-page">

        {/* Page header — estilo YarOM */}
        <div style={{ padding:'20px 28px 0', borderBottom:'1px solid #ECEDF8', background:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', paddingBottom:16 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'#C9A020', letterSpacing:1.8, textTransform:'uppercase', marginBottom:4 }}>
                FUNERARIA SAN JOSÉ · SISTEMA DE GESTIÓN
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:'#0F1035', lineHeight:1 }}>
                Configuración del Sistema
              </div>
              <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>
                Empresa, DIAN, sedes, planes, servicios, notificaciones y apariencia
              </div>
            </div>
          </div>
        </div>

        <div className="cfg-body">

          {/* Tabs sidebar */}
          <aside className="cfg-tabs">
            {TABS.map(({ id, label, sub, Icon, color }) => (
              <button key={id} className={`cfg-tab${tab===id?' active':''}`} onClick={() => setTab(id)}>
                <div className="cfg-tab-icon"
                  style={{ background: tab===id ? color+'20' : '#F4F5FA' }}>
                  <Icon size={17} color={tab===id ? color : '#9CA3AF'} />
                </div>
                <div className="cfg-tab-text">
                  <div className="cfg-tab-label">{label}</div>
                  <div className="cfg-tab-sub">{sub}</div>
                </div>
                <ChevronRight size={13} className="cfg-tab-arr" />
              </button>
            ))}
          </aside>

          {/* Contenido */}
          <main className="cfg-content">

            {tab === 'empresa'        && <TabEmpresa         data={empresa}  saving={saving} setSaving={setSaving} onOk={d=>{setEmpresa(e=>({...e,...d}));ok('Empresa actualizada')}}          onErr={()=>err('Error al guardar')} />}
            {tab === 'sedes'          && <TabSedes           sedes={sedes}   saving={saving} setSaving={setSaving} onOk={()=>{cargar();ok('Sede guardada')}}                     onErr={()=>err('Error al guardar')} />}
            {tab === 'salas'          && <TabSalas           salas={salas}   saving={saving} setSaving={setSaving} onOk={()=>{api.get('/servicios/salas').then(r=>setSalas(r.data.data||[]));ok('Sala guardada')}} onErr={()=>err('Error al guardar')} />}
            {tab === 'flota'          && <TabFlota />}
            {tab === 'dian'           && <TabDian            data={empresa}  saving={saving} setSaving={setSaving} onOk={d=>{setEmpresa(e=>({...e,...d}));ok('Parámetros DIAN actualizados')}}  onErr={()=>err('Error al guardar')} />}
            {tab === 'parametros'     && <TabParametros      data={empresa}  saving={saving} setSaving={setSaving} onOk={d=>{setEmpresa(e=>({...e,...d}));ok('Parámetros actualizados')}}        onErr={()=>err('Error al guardar')} />}
            {tab === 'servicios'      && <TabServicios       servs={servs}   saving={saving} setSaving={setSaving} onOk={()=>{cargar();ok('Servicio guardado')}}                  onErr={()=>err('Error al guardar')} />}
            {tab === 'paquetes'       && <TabPaquetes />}
            {tab === 'tipos_doc'      && <TabTiposDocumento  tiposDoc={tiposDoc} saving={saving} setSaving={setSaving} onOk={()=>{api.get('/tipos-documento').then(r=>setTiposDoc(r.data.data));ok('Guardado')}} onErr={()=>err('Error al guardar')} />}
            {tab === 'formas_pago'    && <TabFormasPago />}
            {tab === 'notificaciones' && <TabNotificaciones  data={empresa}  saving={saving} setSaving={setSaving} onOk={d=>{setEmpresa(e=>({...e,...d}));ok('Notificaciones actualizadas')}}    onErr={()=>err('Error al guardar')} />}
            {tab === 'apariencia'     && <TabApariencia      data={empresa}  saving={saving} setSaving={setSaving} onOk={d=>{setEmpresa(e=>({...e,...d}));ok('Apariencia actualizada')}}          onErr={()=>err('Error al guardar')} />}

          </main>
        </div>
      </div>
    </>
  )
}

/* ════════════════════════════════════
   TAB EMPRESA
════════════════════════════════════ */
function TabEmpresa({ data, saving, setSaving, onOk, onErr }) {
  const [f, setF] = useState({
    razon_social:'', nombre_comercial:'', nit:'', digito_verificador:'',
    tipo_persona:'JURIDICA', regimen_tributario:'NO_RESPONSABLE_IVA', ciiu:'',
    representante_legal:'', cedula_representante:'',
    email:'', telefono_1:'', telefono_2:'', sitio_web:'',
    departamento_id:'', municipio_id:'', direccion:'', codigo_postal:'',
    pie_pagina:'', terminos_condiciones:'',
  })
  const { depts, mpios, cargarMpios } = useTerritorio()

  useEffect(() => {
    if (data) {
      setF(x => ({...x, ...data}))
      if (data.departamento_id) cargarMpios(data.departamento_id)
    }
  }, [data, cargarMpios])

  const set = k => v => setF(x => ({...x,[k]:v}))

  const onDept = async e => {
    const id = e.target.value
    setF(x => ({...x, departamento_id:id, municipio_id:'', codigo_postal:''}))
    await cargarMpios(id)
  }

  const onMpio = e => {
    const id = e.target.value
    const mpio = mpios.find(m => m.id === id)
    setF(x => ({
      ...x,
      municipio_id: id,
      codigo_postal: mpio?.codigo_postal || x.codigo_postal || '',
    }))
  }

  const guardar = async () => {
    setSaving(true)
    try { onOk((await empresaService.actualizar(f)).data.data) }
    catch { onErr() } finally { setSaving(false) }
  }

  return (
    <SecCard titulo="Datos de la Empresa" sub="Información legal registrada ante la DIAN" Icon={Building2} color="#6366F1">
      <div className="g3">
        <div className="campo span2"><label>Razón Social *</label><input value={f.razon_social} onChange={e=>set('razon_social')(e.target.value)} /></div>
        <div className="campo"><label>Nombre Comercial</label><input value={f.nombre_comercial} onChange={e=>set('nombre_comercial')(e.target.value)} /></div>
        <div className="campo"><label>NIT *</label><input value={f.nit} onChange={e=>set('nit')(e.target.value)} /></div>
        <div className="campo"><label>Dígito Verificador</label><input value={f.digito_verificador} onChange={e=>set('digito_verificador')(e.target.value)} type="number" /></div>
        <div className="campo"><label>Tipo Persona</label><select value={f.tipo_persona} onChange={e=>set('tipo_persona')(e.target.value)}>{TIPO_PERSONA.map(o=><option key={o}>{o}</option>)}</select></div>
        <div className="campo span2"><label>Régimen Tributario</label><select value={f.regimen_tributario} onChange={e=>set('regimen_tributario')(e.target.value)}>{TIPO_REGIMEN.map(o=><option key={o}>{o}</option>)}</select></div>
        <div className="campo"><label>CIIU</label><input value={f.ciiu} onChange={e=>set('ciiu')(e.target.value)} placeholder="9603" /></div>
      </div>

      <Div label="Representante Legal" />
      <div className="g2">
        <div className="campo"><label>Nombre Completo</label><input value={f.representante_legal} onChange={e=>set('representante_legal')(e.target.value)} /></div>
        <div className="campo"><label>Cédula</label><input value={f.cedula_representante} onChange={e=>set('cedula_representante')(e.target.value)} /></div>
      </div>

      <Div label="Contacto" />
      <div className="g3">
        <div className="campo"><label>Correo Electrónico</label><input value={f.email} onChange={e=>set('email')(e.target.value)} type="email" /></div>
        <div className="campo"><label>Teléfono Principal</label><input value={f.telefono_1} onChange={e=>set('telefono_1')(e.target.value)} /></div>
        <div className="campo"><label>Teléfono Previsión</label><input value={f.telefono_2} onChange={e=>set('telefono_2')(e.target.value)} /></div>
        <div className="campo span3"><label>Sitio Web</label><input value={f.sitio_web} onChange={e=>set('sitio_web')(e.target.value)} placeholder="https://" /></div>
      </div>

      <Div label="Ubicación Principal" />
      <div className="g3">
        <div className="campo">
          <label>Departamento</label>
          <select value={f.departamento_id||''} onChange={onDept}>
            <option value="">— Seleccionar —</option>
            {depts.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Municipio / Ciudad</label>
          <select value={f.municipio_id||''} onChange={onMpio} disabled={!mpios.length}>
            <option value="">— Seleccionar —</option>
            {mpios.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Código Postal</label>
          <input value={f.codigo_postal||''} onChange={e=>set('codigo_postal')(e.target.value)} placeholder="Autocompletado al seleccionar municipio" />
        </div>
        <div className="campo span3"><label>Dirección Completa</label><input value={f.direccion} onChange={e=>set('direccion')(e.target.value)} placeholder="Carrera 6 No 13-56" /></div>
      </div>

      <Div label="Documentos" />
      <div className="g1">
        <div className="campo"><label>Pie de Página (facturas)</label><textarea value={f.pie_pagina} onChange={e=>set('pie_pagina')(e.target.value)} rows={2} /></div>
        <div className="campo"><label>Términos y Condiciones</label><textarea value={f.terminos_condiciones} onChange={e=>set('terminos_condiciones')(e.target.value)} rows={4} /></div>
      </div>

      <BtnBar saving={saving} onGuardar={guardar} />
    </SecCard>
  )
}

/* ════════════════════════════════════
   TAB SEDES
════════════════════════════════════ */
function TabSedes({ sedes, saving, setSaving, onOk, onErr }) {
  const EMPTY = { nombre:'', codigo:'', departamento_id:'', municipio_id:'', zona_id:'', direccion:'', telefono_1:'', telefono_2:'', responsable_nombre:'', num_salas:1, es_principal:false }
  const [f, setF]       = useState(EMPTY)
  const [editId, setId] = useState(null)
  const [show, setShow] = useState(false)
  const { depts, mpios, zonas, cargarMpios, cargarZonas } = useTerritorio()
  const set = k => v => setF(x => ({...x,[k]:v}))

  const abrir = async (s=null) => {
    const base = s ? {...EMPTY,...s} : EMPTY
    setF(base); setId(s?.id||null); setShow(true)
    if (s?.departamento_id) {
      await cargarMpios(s.departamento_id)
      if (s.municipio_id) await cargarZonas(s.municipio_id)
    }
  }
  const onDept = async e => {
    const id = e.target.value
    setF(x => ({...x, departamento_id:id, municipio_id:'', zona_id:''}))
    await cargarMpios(id)
  }
  const onMpio = async e => {
    const id = e.target.value
    setF(x => ({...x, municipio_id:id, zona_id:''}))
    await cargarZonas(id)
  }

  const guardar = async () => {
    if (!f.nombre) return
    setSaving(true)
    try {
      if (editId) await empresaService.actualizarSede(editId,f); else await empresaService.crearSede(f)
      setShow(false); onOk()
    } catch { onErr() } finally { setSaving(false) }
  }

  return (
    <SecCard titulo="Sedes y Sucursales" sub="Ubique y gestione las oficinas de la funeraria" Icon={MapPin} color="#10B981">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div style={{ fontSize:13, color:'#9CA3AF' }}>{sedes.length} sede{sedes.length !== 1 ? 's' : ''} registrada{sedes.length !== 1 ? 's' : ''}</div>
        <button className="btn-primary" onClick={() => abrir()}><Plus size={15}/> Nueva Sede</button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {sedes.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0', color:'#9CA3AF', fontSize:13 }}>No hay sedes registradas. Agrega la primera.</div>
        )}
        {sedes.map(s => (
          <div className="sede-card" key={s.id}>
            <div className="sede-card-icon"><MapPin size={18} color="#fff" /></div>
            <div className="sede-card-body">
              <div className="sede-card-name">
                {s.nombre}
                {s.es_principal && <span className="badge badge-blue">Principal</span>}
                {!s.activo      && <span className="badge badge-red">Inactiva</span>}
                {s.num_salas > 0 && <span className="badge badge-amber">{s.num_salas} sala{s.num_salas > 1 ? 's' : ''}</span>}
              </div>
              <div className="sede-card-meta">
                {[s.direccion, s.municipio_nombre||s.municipio, s.departamento_nombre||s.departamento].filter(Boolean).join(' · ')}
                {s.telefono_1 && ` · ${s.telefono_1}`}
                {s.responsable_nombre && ` · Resp: ${s.responsable_nombre}`}
              </div>
            </div>
            <button className="btn-icon" onClick={() => abrir(s)}><Pencil size={14}/></button>
          </div>
        ))}
      </div>

      {show && (
        <div className="form-panel">
          <div className="form-panel-head">
            <div className="form-panel-title">{editId ? 'Editar Sede' : 'Nueva Sede'}</div>
            <button className="form-panel-close" onClick={() => setShow(false)}><X size={16}/></button>
          </div>
          <div className="g3">
            <div className="campo span2"><label>Nombre *</label><input value={f.nombre} onChange={e=>set('nombre')(e.target.value)} placeholder="Sede Central, Sucursal Norte…" /></div>
            <div className="campo"><label>Código</label><input value={f.codigo} onChange={e=>set('codigo')(e.target.value)} placeholder="SEDE-01" /></div>
            <div className="campo">
              <label>Departamento</label>
              <select value={f.departamento_id||''} onChange={onDept}>
                <option value="">— Seleccionar —</option>
                {depts.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Municipio / Ciudad</label>
              <select value={f.municipio_id||''} onChange={onMpio} disabled={!mpios.length}>
                <option value="">— Seleccionar —</option>
                {mpios.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Barrio / Vereda</label>
              <select value={f.zona_id||''} onChange={e=>set('zona_id')(e.target.value)} disabled={!zonas.length}>
                <option value="">— Seleccionar —</option>
                {zonas.map(z=><option key={z.id} value={z.id}>{z.nombre} ({z.tipo})</option>)}
              </select>
            </div>
            <div className="campo span3"><label>Dirección Completa</label><input value={f.direccion} onChange={e=>set('direccion')(e.target.value)} placeholder="Carrera 6 No 13-56" /></div>
            <div className="campo"><label>Teléfono 1</label><input value={f.telefono_1} onChange={e=>set('telefono_1')(e.target.value)} /></div>
            <div className="campo"><label>Teléfono 2</label><input value={f.telefono_2} onChange={e=>set('telefono_2')(e.target.value)} /></div>
            <div className="campo"><label>Salas de Velación</label><input value={f.num_salas} onChange={e=>set('num_salas')(e.target.value)} type="number" min={0} /></div>
            <div className="campo span2"><label>Responsable</label><input value={f.responsable_nombre} onChange={e=>set('responsable_nombre')(e.target.value)} /></div>
            <div className="campo" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}>
              <input type="checkbox" id="principal" checked={f.es_principal} onChange={e=>set('es_principal')(e.target.checked)} style={{width:16,height:16,accentColor:'#6366F1'}}/>
              <label htmlFor="principal" style={{textTransform:'none',letterSpacing:0,fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'}}>Sede principal</label>
            </div>
          </div>
          <BtnBar saving={saving} onGuardar={guardar} onCancelar={() => setShow(false)} />
        </div>
      )}
    </SecCard>
  )
}

/* ════════════════════════════════════
   TAB SALAS DE VELACIÓN
════════════════════════════════════ */
function TabSalas({ salas, saving, setSaving, onOk, onErr }) {
  const [lista, setLista]   = useState(salas)
  const [modal, setModal]   = useState(null) // null | sala | {}
  const [form, setForm]     = useState({ nombre:'', capacidad:30 })
  const [saving2, setSav2]  = useState(false)

  useEffect(() => { setLista(salas) }, [salas])

  const abrirNueva = () => { setForm({ nombre:'', capacidad:30 }); setModal({}) }
  const abrirEdit  = s   => { setForm({ nombre:s.nombre, capacidad:s.capacidad }); setModal(s) }

  const guardar = async () => {
    if (!form.nombre.trim()) return
    setSav2(true)
    try {
      if (modal?.id) {
        await api.put(`/servicios/salas/${modal.id}`, form)
        toast.success('Sala actualizada con éxito')
      } else {
        await api.post('/servicios/salas', form)
        toast.success('Sala creada con éxito')
      }
      setModal(null)
      onOk()
    } catch { onErr(); toast.error('Error al guardar') }
    finally { setSav2(false) }
  }

  const toggleActivo = async (s) => {
    setSaving(true)
    try {
      await api.patch(`/servicios/salas/${s.id}`, { activa: !s.activa })
      toast.success(s.activa ? 'Sala desactivada con éxito' : 'Sala activada con éxito')
      onOk()
    } catch { onErr(); toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const COLORES_ESTADO = { true: { bg:'#ECFDF5', color:'#059669', label:'Activa' }, false: { bg:'#FEF2F2', color:'#EF4444', label:'Inactiva' } }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'#0F1035' }}>Salas de Velación</div>
          <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
            {lista.filter(s=>s.activa).length} activa{lista.filter(s=>s.activa).length!==1?'s':''} · {lista.length} en total
          </div>
        </div>
        <button onClick={abrirNueva}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
            background:'#6D28D9', color:'#fff', border:'none', borderRadius:10,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={15}/> Nueva sala
        </button>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'#9CA3AF' }}>
          <DoorOpen size={40} style={{ margin:'0 auto 12px', opacity:.3 }}/>
          <div style={{ fontWeight:700 }}>No hay salas registradas</div>
          <div style={{ fontSize:12, marginTop:4 }}>Agrega la primera sala de velación</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
          {lista.map(s => {
            const est = COLORES_ESTADO[String(s.activa) === 'true' || s.activa === true]
            return (
              <div key={s.id} style={{ background:'#fff', border:'1.5px solid #ECEDF8',
                borderRadius:14, padding:'16px 18px', position:'relative' }}>
                {/* Estado pill */}
                <span style={{ position:'absolute', top:14, right:14, fontSize:10, fontWeight:800,
                  padding:'3px 9px', borderRadius:20, background:est.bg, color:est.color }}>
                  {est.label}
                </span>

                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <div style={{ width:42, height:42, borderRadius:12,
                    background: s.activa ? 'linear-gradient(135deg,#7C3AED,#8B5CF6)' : '#F3F4F6',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <DoorOpen size={20} color={s.activa ? '#fff' : '#9CA3AF'}/>
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#0F1035' }}>{s.nombre}</div>
                    <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>
                      <Users size={11} style={{ display:'inline', marginRight:3 }}/>
                      Capacidad: {s.capacidad} personas
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => abrirEdit(s)}
                    style={{ flex:1, padding:'7px 0', border:'1.5px solid #ECEDF8',
                      borderRadius:8, background:'#F8F9FC', color:'#374151',
                      fontSize:12, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <Pencil size={12}/> Editar
                  </button>
                  <button onClick={() => toggleActivo(s)}
                    style={{ flex:1, padding:'7px 0', border:'1.5px solid',
                      borderColor: s.activa ? '#FECACA' : '#A7F3D0',
                      borderRadius:8,
                      background: s.activa ? '#FEF2F2' : '#ECFDF5',
                      color: s.activa ? '#DC2626' : '#059669',
                      fontSize:12, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    {s.activa
                      ? <><ToggleLeft size={13}/>Desactivar</>
                      : <><ToggleRight size={13}/>Activar</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva / editar sala */}
      {modal !== null && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(null) }}>
          <div className="modal-box" style={{ maxWidth:400 }}>
            <div className="modal-head">
              <span className="modal-title">{modal?.id ? 'Editar sala' : 'Nueva sala de velación'}</span>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="campo" style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                  Nombre de la sala <span style={{ color:'#EF4444' }}>*</span>
                </label>
                <input
                  className="campo-input"
                  value={form.nombre}
                  onChange={e => setForm(p=>({...p, nombre:e.target.value}))}
                  placeholder="Sala Principal, Sala A, Capilla…"
                  autoFocus
                />
              </div>
              <div className="campo" style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                  Capacidad (personas)
                </label>
                <input
                  className="campo-input"
                  type="number" min={1} max={500}
                  value={form.capacidad}
                  onChange={e => setForm(p=>({...p, capacidad:Number(e.target.value)}))}
                />
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={() => setModal(null)}
                  style={{ padding:'9px 18px', border:'1.5px solid #ECEDF8', borderRadius:10,
                    background:'#F8F9FC', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving2 || !form.nombre.trim()}
                  style={{ padding:'9px 20px', border:'none', borderRadius:10,
                    background: form.nombre.trim() ? '#6D28D9' : '#D1D5DB',
                    color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                    display:'flex', alignItems:'center', gap:7 }}>
                  {saving2 ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <CheckCircle2 size={14}/>}
                  {modal?.id ? 'Guardar cambios' : 'Crear sala'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════
   TAB FLOTA — Vehículos y Conductores
════════════════════════════════════ */
const TIPOS_VEHICULO = ['CARROZA','VAN','CAMIONETA','BUSETA','MOTO','OTRO']
const TIPO_VEHICULO_LABEL = { CARROZA:'Carroza fúnebre', VAN:'Van', CAMIONETA:'Camioneta', BUSETA:'Buseta', MOTO:'Moto', OTRO:'Otro' }

function EstadoDisponibilidad({ disponible, numero }) {
  return disponible ? (
    <span style={{ fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:20, background:'#ECFDF5', color:'#059669' }}>
      Disponible
    </span>
  ) : (
    <span style={{ fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:20, background:'#FEF2F2', color:'#DC2626' }}>
      En servicio #{numero}
    </span>
  )
}

function TabFlota() {
  const [sub, setSub] = useState('vehiculos') // 'vehiculos' | 'conductores'
  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalV, setModalV] = useState(null) // null | {} | vehiculo
  const [modalC, setModalC] = useState(null)
  const [formV, setFormV] = useState({ placa:'', marca:'', modelo:'', anio:'', tipo:'CARROZA', capacidad:1, color:'', observaciones:'' })
  const [formC, setFormC] = useState({ nombre:'', documento:'', telefono:'', licencia_numero:'', licencia_categoria:'', licencia_vencimiento:'', vehiculo_predeterminado_id:'', observaciones:'' })
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [v, c] = await Promise.all([api.get('/flota/vehiculos'), api.get('/flota/conductores')])
      setVehiculos(v.data.data || [])
      setConductores(c.data.data || [])
    } catch { toast.error('Error al cargar la flota') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevoV = () => { setFormV({ placa:'', marca:'', modelo:'', anio:'', tipo:'CARROZA', capacidad:1, color:'', observaciones:'' }); setModalV({}) }
  const abrirEditV  = v => { setFormV({ placa:v.placa, marca:v.marca||'', modelo:v.modelo||'', anio:v.anio||'', tipo:v.tipo, capacidad:v.capacidad, color:v.color||'', observaciones:v.observaciones||'' }); setModalV(v) }

  const guardarV = async () => {
    if (!formV.placa.trim()) return
    setSaving(true)
    try {
      if (modalV?.id) {
        await api.put(`/flota/vehiculos/${modalV.id}`, formV)
        toast.success('Vehículo actualizado con éxito')
      } else {
        await api.post('/flota/vehiculos', formV)
        toast.success('Vehículo creado con éxito')
      }
      setModalV(null); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar el vehículo') }
    finally { setSaving(false) }
  }

  const toggleV = async (v) => {
    try {
      await api.put(`/flota/vehiculos/${v.id}`, { activo: !v.activo })
      toast.success(v.activo ? 'Vehículo desactivado con éxito' : 'Vehículo activado con éxito')
      cargar()
    } catch { toast.error('Error al actualizar el vehículo') }
  }

  const abrirNuevoC = () => { setFormC({ nombre:'', documento:'', telefono:'', licencia_numero:'', licencia_categoria:'', licencia_vencimiento:'', vehiculo_predeterminado_id:'', observaciones:'' }); setModalC({}) }
  const abrirEditC  = c => { setFormC({ nombre:c.nombre, documento:c.documento||'', telefono:c.telefono||'', licencia_numero:c.licencia_numero||'', licencia_categoria:c.licencia_categoria||'', licencia_vencimiento:c.licencia_vencimiento?.slice(0,10)||'', vehiculo_predeterminado_id:c.vehiculo_predeterminado_id||'', observaciones:c.observaciones||'' }); setModalC(c) }

  const guardarC = async () => {
    if (!formC.nombre.trim()) return
    setSaving(true)
    try {
      const body = { ...formC, vehiculo_predeterminado_id: formC.vehiculo_predeterminado_id || null }
      if (modalC?.id) {
        await api.put(`/flota/conductores/${modalC.id}`, body)
        toast.success('Conductor actualizado con éxito')
      } else {
        await api.post('/flota/conductores', body)
        toast.success('Conductor creado con éxito')
      }
      setModalC(null); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar el conductor') }
    finally { setSaving(false) }
  }

  const toggleC = async (c) => {
    try {
      await api.put(`/flota/conductores/${c.id}`, { activo: !c.activo })
      toast.success(c.activo ? 'Conductor desactivado con éxito' : 'Conductor activado con éxito')
      cargar()
    } catch { toast.error('Error al actualizar el conductor') }
  }

  if (cargando) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <Loader2 size={24} style={{ animation:'spin 1s linear infinite' }} color="#0891B2"/>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', gap:6, background:'#F4F5FA', borderRadius:12, padding:4 }}>
          <button onClick={() => setSub('vehiculos')}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9, border:'none',
              cursor:'pointer', fontSize:12.5, fontWeight:700,
              background: sub==='vehiculos' ? '#fff' : 'transparent',
              color: sub==='vehiculos' ? '#0891B2' : '#6B7280',
              boxShadow: sub==='vehiculos' ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            <Truck size={14}/> Vehículos ({vehiculos.length})
          </button>
          <button onClick={() => setSub('conductores')}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9, border:'none',
              cursor:'pointer', fontSize:12.5, fontWeight:700,
              background: sub==='conductores' ? '#fff' : 'transparent',
              color: sub==='conductores' ? '#0891B2' : '#6B7280',
              boxShadow: sub==='conductores' ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            <UserSquare2 size={14}/> Conductores ({conductores.length})
          </button>
        </div>
        <button onClick={sub==='vehiculos' ? abrirNuevoV : abrirNuevoC}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
            background:'#0891B2', color:'#fff', border:'none', borderRadius:10,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={15}/> {sub==='vehiculos' ? 'Nuevo vehículo' : 'Nuevo conductor'}
        </button>
      </div>

      {sub === 'vehiculos' ? (
        vehiculos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px', color:'#9CA3AF' }}>
            <Truck size={40} style={{ margin:'0 auto 12px', opacity:.3 }}/>
            <div style={{ fontWeight:700 }}>No hay vehículos registrados</div>
            <div style={{ fontSize:12, marginTop:4 }}>Agrega la primera unidad de la flota</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:12 }}>
            {vehiculos.map(v => (
              <div key={v.id} style={{ background:'#fff', border:'1.5px solid #ECEDF8',
                borderRadius:14, padding:'16px 18px', opacity: v.activo ? 1 : .55 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:12,
                      background: v.activo ? 'linear-gradient(135deg,#0891B2,#0E7490)' : '#F3F4F6',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Truck size={20} color={v.activo ? '#fff' : '#9CA3AF'}/>
                    </div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:900, color:'#0F1035', letterSpacing:.5 }}>{v.placa}</div>
                      <div style={{ fontSize:11.5, color:'#6B7280', marginTop:1 }}>
                        {[v.marca, v.modelo, v.anio].filter(Boolean).join(' · ') || TIPO_VEHICULO_LABEL[v.tipo]}
                      </div>
                    </div>
                  </div>
                  {v.activo && <EstadoDisponibilidad disponible={v.disponible} numero={v.servicio_actual_numero}/>}
                </div>

                <div style={{ display:'flex', gap:8, fontSize:11.5, color:'#6B7280', marginBottom:14 }}>
                  <span style={{ background:'#F4F5FA', borderRadius:7, padding:'3px 9px', fontWeight:600 }}>
                    {TIPO_VEHICULO_LABEL[v.tipo]}
                  </span>
                  <span style={{ background:'#F4F5FA', borderRadius:7, padding:'3px 9px', fontWeight:600 }}>
                    <Users size={10} style={{ display:'inline', marginRight:3, verticalAlign:-1 }}/>
                    Cap. {v.capacidad}
                  </span>
                  {v.color && <span style={{ background:'#F4F5FA', borderRadius:7, padding:'3px 9px', fontWeight:600 }}>{v.color}</span>}
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => abrirEditV(v)}
                    style={{ flex:1, padding:'7px 0', border:'1.5px solid #ECEDF8', borderRadius:8,
                      background:'#F8F9FC', color:'#374151', fontSize:12, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <Pencil size={12}/> Editar
                  </button>
                  <button onClick={() => toggleV(v)}
                    style={{ flex:1, padding:'7px 0', border:'1.5px solid', borderColor: v.activo ? '#FECACA' : '#A7F3D0',
                      borderRadius:8, background: v.activo ? '#FEF2F2' : '#ECFDF5', color: v.activo ? '#DC2626' : '#059669',
                      fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    {v.activo ? <><ToggleLeft size={13}/>Desactivar</> : <><ToggleRight size={13}/>Activar</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        conductores.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px', color:'#9CA3AF' }}>
            <UserSquare2 size={40} style={{ margin:'0 auto 12px', opacity:.3 }}/>
            <div style={{ fontWeight:700 }}>No hay conductores registrados</div>
            <div style={{ fontSize:12, marginTop:4 }}>Agrega el primer conductor de la flota</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:12 }}>
            {conductores.map(c => {
              const vencida = c.licencia_vencimiento && new Date(c.licencia_vencimiento) < new Date()
              return (
                <div key={c.id} style={{ background:'#fff', border:'1.5px solid #ECEDF8',
                  borderRadius:14, padding:'16px 18px', opacity: c.activo ? 1 : .55 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:42, height:42, borderRadius:12, flexShrink:0,
                        background: c.activo ? 'linear-gradient(135deg,#0891B2,#0E7490)' : '#F3F4F6',
                        color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:800, fontSize:16 }}>
                        {c.activo ? c.nombre.charAt(0).toUpperCase() : <UserSquare2 size={18} color="#9CA3AF"/>}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800, color:'#0F1035' }}>{c.nombre}</div>
                        <div style={{ fontSize:11.5, color:'#6B7280', marginTop:1 }}>{c.telefono || c.documento || '—'}</div>
                      </div>
                    </div>
                    {c.activo && <EstadoDisponibilidad disponible={c.disponible} numero={c.servicio_actual_numero}/>}
                  </div>

                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, fontSize:11.5, color:'#6B7280', marginBottom:14 }}>
                    {c.vehiculo_predeterminado_placa && (
                      <span style={{ background:'#ECFEFF', color:'#0891B2', borderRadius:7, padding:'3px 9px', fontWeight:700 }}>
                        <Truck size={10} style={{ display:'inline', marginRight:3, verticalAlign:-1 }}/>
                        {c.vehiculo_predeterminado_placa}
                      </span>
                    )}
                    {c.licencia_numero && (
                      <span style={{ background: vencida ? '#FEF2F2' : '#F4F5FA', color: vencida ? '#DC2626' : '#6B7280',
                        borderRadius:7, padding:'3px 9px', fontWeight:600 }}>
                        <CreditCard size={10} style={{ display:'inline', marginRight:3, verticalAlign:-1 }}/>
                        Lic. {c.licencia_categoria} {vencida ? '· vencida' : ''}
                      </span>
                    )}
                  </div>

                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => abrirEditC(c)}
                      style={{ flex:1, padding:'7px 0', border:'1.5px solid #ECEDF8', borderRadius:8,
                        background:'#F8F9FC', color:'#374151', fontSize:12, fontWeight:700, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <Pencil size={12}/> Editar
                    </button>
                    <button onClick={() => toggleC(c)}
                      style={{ flex:1, padding:'7px 0', border:'1.5px solid', borderColor: c.activo ? '#FECACA' : '#A7F3D0',
                        borderRadius:8, background: c.activo ? '#FEF2F2' : '#ECFDF5', color: c.activo ? '#DC2626' : '#059669',
                        fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      {c.activo ? <><ToggleLeft size={13}/>Desactivar</> : <><ToggleRight size={13}/>Activar</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal vehículo */}
      {modalV !== null && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModalV(null) }}>
          <div className="modal-box" style={{ maxWidth:460 }}>
            <div className="modal-head">
              <span className="modal-title">{modalV?.id ? 'Editar vehículo' : 'Nuevo vehículo'}</span>
              <button className="modal-close" onClick={() => setModalV(null)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="g2">
                <div className="campo span2">
                  <label>Placa <span style={{ color:'#EF4444' }}>*</span></label>
                  <input className="campo-input" value={formV.placa} autoFocus
                    onChange={e => setFormV(p=>({...p, placa:e.target.value.toUpperCase()}))} placeholder="ABC123"/>
                </div>
                <div className="campo"><label>Marca</label>
                  <input className="campo-input" value={formV.marca} onChange={e => setFormV(p=>({...p, marca:e.target.value}))} placeholder="Chevrolet"/>
                </div>
                <div className="campo"><label>Modelo</label>
                  <input className="campo-input" value={formV.modelo} onChange={e => setFormV(p=>({...p, modelo:e.target.value}))} placeholder="N300"/>
                </div>
                <div className="campo"><label>Año</label>
                  <input className="campo-input" type="number" value={formV.anio} onChange={e => setFormV(p=>({...p, anio:e.target.value}))}/>
                </div>
                <div className="campo"><label>Tipo</label>
                  <select className="campo-input" value={formV.tipo} onChange={e => setFormV(p=>({...p, tipo:e.target.value}))}>
                    {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{TIPO_VEHICULO_LABEL[t]}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Capacidad</label>
                  <input className="campo-input" type="number" min={1} value={formV.capacidad}
                    onChange={e => setFormV(p=>({...p, capacidad:+e.target.value}))}/>
                </div>
                <div className="campo"><label>Color</label>
                  <input className="campo-input" value={formV.color} onChange={e => setFormV(p=>({...p, color:e.target.value}))}/>
                </div>
                <div className="campo span2"><label>Observaciones</label>
                  <textarea className="campo-input" rows={2} value={formV.observaciones}
                    onChange={e => setFormV(p=>({...p, observaciones:e.target.value}))}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
                <button onClick={() => setModalV(null)}
                  style={{ padding:'9px 18px', border:'1.5px solid #ECEDF8', borderRadius:10,
                    background:'#F8F9FC', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={guardarV} disabled={saving || !formV.placa.trim()}
                  style={{ padding:'9px 20px', border:'none', borderRadius:10,
                    background: formV.placa.trim() ? '#0891B2' : '#D1D5DB',
                    color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                    display:'flex', alignItems:'center', gap:7 }}>
                  {saving ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <CheckCircle2 size={14}/>}
                  {modalV?.id ? 'Guardar cambios' : 'Crear vehículo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal conductor */}
      {modalC !== null && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModalC(null) }}>
          <div className="modal-box" style={{ maxWidth:460 }}>
            <div className="modal-head">
              <span className="modal-title">{modalC?.id ? 'Editar conductor' : 'Nuevo conductor'}</span>
              <button className="modal-close" onClick={() => setModalC(null)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="g2">
                <div className="campo span2">
                  <label>Nombre completo <span style={{ color:'#EF4444' }}>*</span></label>
                  <input className="campo-input" value={formC.nombre} autoFocus
                    onChange={e => setFormC(p=>({...p, nombre:e.target.value}))} placeholder="Nombre del conductor"/>
                </div>
                <div className="campo"><label>Documento</label>
                  <input className="campo-input" value={formC.documento} onChange={e => setFormC(p=>({...p, documento:e.target.value}))}/>
                </div>
                <div className="campo"><label>Teléfono</label>
                  <input className="campo-input" value={formC.telefono} onChange={e => setFormC(p=>({...p, telefono:e.target.value}))}/>
                </div>
                <div className="campo"><label>N° Licencia</label>
                  <input className="campo-input" value={formC.licencia_numero} onChange={e => setFormC(p=>({...p, licencia_numero:e.target.value}))}/>
                </div>
                <div className="campo"><label>Categoría</label>
                  <input className="campo-input" value={formC.licencia_categoria} placeholder="C2, B1…"
                    onChange={e => setFormC(p=>({...p, licencia_categoria:e.target.value}))}/>
                </div>
                <div className="campo"><label>Vencimiento licencia</label>
                  <input className="campo-input" type="date" value={formC.licencia_vencimiento}
                    onChange={e => setFormC(p=>({...p, licencia_vencimiento:e.target.value}))}/>
                </div>
                <div className="campo"><label>Vehículo predeterminado</label>
                  <select className="campo-input" value={formC.vehiculo_predeterminado_id}
                    onChange={e => setFormC(p=>({...p, vehiculo_predeterminado_id:e.target.value}))}>
                    <option value="">— Sin asignar —</option>
                    {vehiculos.filter(v=>v.activo).map(v => <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo}</option>)}
                  </select>
                </div>
                <div className="campo span2"><label>Observaciones</label>
                  <textarea className="campo-input" rows={2} value={formC.observaciones}
                    onChange={e => setFormC(p=>({...p, observaciones:e.target.value}))}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
                <button onClick={() => setModalC(null)}
                  style={{ padding:'9px 18px', border:'1.5px solid #ECEDF8', borderRadius:10,
                    background:'#F8F9FC', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={guardarC} disabled={saving || !formC.nombre.trim()}
                  style={{ padding:'9px 20px', border:'none', borderRadius:10,
                    background: formC.nombre.trim() ? '#0891B2' : '#D1D5DB',
                    color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                    display:'flex', alignItems:'center', gap:7 }}>
                  {saving ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <CheckCircle2 size={14}/>}
                  {modalC?.id ? 'Guardar cambios' : 'Crear conductor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════
   TAB DIAN
════════════════════════════════════ */
function TabDian({ data, saving, setSaving, onOk, onErr }) {
  const [f, setF] = useState({ dataico_api_key:'', dataico_ambiente:'habilitacion', fe_prefijo:'FE', fe_resolucion_numero:'', fe_resolucion_fecha:'', fe_consecutivo_desde:1, fe_consecutivo_hasta:100000, fe_consecutivo_actual:1, fe_correo_habilitado:'' })
  useEffect(() => { if (data) setF(x => ({...x,...data})) }, [data])
  const set = k => v => setF(x => ({...x,[k]:v}))
  const guardar = async () => { setSaving(true); try { onOk((await empresaService.actualizarParametros(f)).data.data) } catch { onErr() } finally { setSaving(false) } }

  return (
    <SecCard titulo="Facturación Electrónica DIAN" sub="Resolución de facturación y conexión con Dataico" Icon={FileText} color="#F59E0B">
      <div className="info-box"><span>💡</span><span>La API Key se guarda cifrada en el servidor. Para no modificarla, deja el campo en blanco.</span></div>
      <div className="g2">
        <div className="campo span2"><label>API Key Dataico</label><input value={f.dataico_api_key} onChange={e=>set('dataico_api_key')(e.target.value)} type="password" placeholder="Ingrese para actualizar" /></div>
        <div className="campo"><label>Ambiente</label><select value={f.dataico_ambiente} onChange={e=>set('dataico_ambiente')(e.target.value)}><option value="habilitacion">Habilitación (pruebas)</option><option value="produccion">Producción</option></select></div>
        <div className="campo"><label>Correo habilitado DIAN</label><input value={f.fe_correo_habilitado} onChange={e=>set('fe_correo_habilitado')(e.target.value)} type="email" /></div>
      </div>
      <Div label="Resolución de Facturación" />
      <div className="g3">
        <div className="campo"><label>Prefijo</label><input value={f.fe_prefijo} onChange={e=>set('fe_prefijo')(e.target.value)} placeholder="FE" /></div>
        <div className="campo"><label>N° Resolución</label><input value={f.fe_resolucion_numero} onChange={e=>set('fe_resolucion_numero')(e.target.value)} /></div>
        <div className="campo"><label>Fecha Resolución</label><input value={f.fe_resolucion_fecha} onChange={e=>set('fe_resolucion_fecha')(e.target.value)} type="date" /></div>
        <div className="campo"><label>Consecutivo Desde</label><input value={f.fe_consecutivo_desde} onChange={e=>set('fe_consecutivo_desde')(e.target.value)} type="number" /></div>
        <div className="campo"><label>Consecutivo Hasta</label><input value={f.fe_consecutivo_hasta} onChange={e=>set('fe_consecutivo_hasta')(e.target.value)} type="number" /></div>
        <div className="campo"><label>Consecutivo Actual</label><input value={f.fe_consecutivo_actual} disabled /></div>
      </div>
      <BtnBar saving={saving} onGuardar={guardar} />
    </SecCard>
  )
}

/* ════════════════════════════════════
   TAB PARÁMETROS
════════════════════════════════════ */
function TabParametros({ data, saving, setSaving, onOk, onErr }) {
  // ── Parámetros generales (empresa) ──────────────────────────────────────
  const [f, setF] = useState({ prefijo_contrato:'CONT', prefijo_servicio:'SRV', prefijo_prevision:'PREV' })
  useEffect(() => { if (data) setF(x => ({...x,...data})) }, [data])
  const set = k => v => setF(x => ({...x,[k]:v}))
  const guardar = async () => { setSaving(true); try { onOk((await empresaService.actualizarParametros(f)).data.data) } catch { onErr() } finally { setSaving(false) } }

  // ── Intereses de mora dinámicos ──────────────────────────────────────────
  const [mora, setMora] = useState({
    nombre: 'Configuración principal',
    tasa_interes_diario: 0.0033,
    dias_gracia_promesa: 1,
    dias_auto_cancelacion: 30,
    auto_cancelar: true,
    cobrar_intereses: true,
  })
  const [loadingMora, setLoadingMora] = useState(true)
  const [savingMora,  setSavingMora]  = useState(false)
  const [msgMora,     setMsgMora]     = useState('')
  const [resumen,     setResumen]     = useState(null)
  const [aplicando,   setAplicando]   = useState(false)

  useEffect(() => {
    api.get('/mora/parametros').then(r => {
      if (r.data.data) setMora(r.data.data)
    }).finally(() => setLoadingMora(false))
    api.get('/mora/resumen').then(r => setResumen(r.data.data)).catch(() => {})
  }, [])

  const setM = k => v => setMora(x => ({...x, [k]: v}))

  const guardarMora = async () => {
    setSavingMora(true)
    try {
      await api.put('/mora/parametros', mora)
      setMsgMora('✓ Guardado')
      toast.success('Parámetros de mora actualizados con éxito')
      setTimeout(() => setMsgMora(''), 3000)
    } catch {
      setMsgMora('Error al guardar')
      toast.error('Error al guardar')
    }
    finally { setSavingMora(false) }
  }

  const aplicarAhora = async () => {
    setAplicando(true)
    try {
      const r = await api.post('/mora/aplicar-ahora')
      setMsgMora(r.data.mensaje)
      toast.success('Mora aplicada con éxito')
      setTimeout(() => setMsgMora(''), 5000)
      const rs = await api.get('/mora/resumen')
      setResumen(rs.data.data)
    } catch {
      setMsgMora('Error al aplicar')
      toast.error('Error al aplicar')
    }
    finally { setAplicando(false) }
  }

  // Tasa como porcentaje mensual para mostrar al usuario
  const tasaMensual = ((mora.tasa_interes_diario || 0) * 30 * 100).toFixed(2)
  const tasaDiaria  = ((mora.tasa_interes_diario || 0) * 100).toFixed(4)

  return (
    <>
      <SecCard titulo="Prefijos de Numeración" sub="Documentos generados por el sistema" Icon={Sliders} color="#64748B">
        <div className="g3">
          <div className="campo"><label>Contratos</label><input value={f.prefijo_contrato} onChange={e=>set('prefijo_contrato')(e.target.value)} placeholder="CONT" /></div>
          <div className="campo"><label>Servicios</label><input value={f.prefijo_servicio} onChange={e=>set('prefijo_servicio')(e.target.value)} placeholder="SRV" /></div>
          <div className="campo"><label>Previsión</label><input value={f.prefijo_prevision} onChange={e=>set('prefijo_prevision')(e.target.value)} placeholder="PREV" /></div>
        </div>
        <BtnBar saving={saving} onGuardar={guardar} />
      </SecCard>

      <SecCard titulo="Intereses de Mora — Pólizas Prepago" sub="Parámetros dinámicos aplicados automáticamente cada noche" Icon={Sliders} color="#EF4444">
        {loadingMora ? (
          <div style={{display:'flex',gap:8,alignItems:'center',color:'#6B7280',padding:'20px 0'}}>
            <Loader2 size={18} className="spin" /> Cargando…
          </div>
        ) : (
          <>
            {/* Resumen actual */}
            {resumen && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
                {[
                  { label:'Con intereses', val: resumen.con_interes, color:'#EF4444' },
                  { label:'Total intereses', val: `$${Number(resumen.total_intereses).toLocaleString('es-CO')}`, color:'#F59E0B' },
                  { label:'Promesas incumplidas', val: resumen.promesas_incumplidas, color:'#8B5CF6' },
                  { label:'Promesas vencidas', val: resumen.promesas_vencidas, color:'#6366F1' },
                ].map(k => (
                  <div key={k.label} style={{background:'#FAFAFA',border:'1px solid #F0F0F8',borderRadius:10,padding:'12px 16px',borderTop:`3px solid ${k.color}`}}>
                    <div style={{fontSize:11,color:'#9CA3AF',marginBottom:4}}>{k.label}</div>
                    <div style={{fontSize:22,fontWeight:700,color:k.color}}>{k.val}</div>
                  </div>
                ))}
              </div>
            )}

            <Div label="Tasa de Interés Moratoria" />
            <div className="g3">
              <div className="campo">
                <label>Tasa diaria (%)</label>
                <input
                  type="number" step="0.0001" min="0" max="1"
                  value={tasaDiaria}
                  onChange={e => setM('tasa_interes_diario')(parseFloat(e.target.value) / 100 || 0)}
                />
                <small style={{color:'#6B7280',fontSize:11}}>≈ {tasaMensual}% mensual · Máx legal Colombia: 1% mensual</small>
              </div>
              <div className="campo">
                <label>Días de gracia tras vencimiento</label>
                <input type="number" min="0" max="30" value={mora.dias_gracia_promesa}
                  onChange={e => setM('dias_gracia_promesa')(parseInt(e.target.value) || 0)} />
                <small style={{color:'#6B7280',fontSize:11}}>Días antes de empezar a cobrar interés</small>
              </div>
              <div className="campo">
                <label>Días para auto-cancelar</label>
                <input type="number" min="1" max="365" value={mora.dias_auto_cancelacion}
                  onChange={e => setM('dias_auto_cancelacion')(parseInt(e.target.value) || 30)} />
                <small style={{color:'#6B7280',fontSize:11}}>Desde la fecha de promesa vencida</small>
              </div>
            </div>

            <Div label="Opciones" />
            <div className="g2">
              <div className="campo" style={{display:'flex',alignItems:'center',gap:12,flexDirection:'row'}}>
                <button
                  onClick={() => setM('cobrar_intereses')(!mora.cobrar_intereses)}
                  style={{background:'none',border:'none',cursor:'pointer',padding:0,color: mora.cobrar_intereses ? '#10B981' : '#D1D5DB'}}
                >
                  {mora.cobrar_intereses
                    ? <ToggleRight size={32} />
                    : <ToggleLeft size={32} />}
                </button>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>Cobrar intereses automáticamente</div>
                  <div style={{fontSize:12,color:'#6B7280'}}>El cron nocturno aplica interés a promesas vencidas</div>
                </div>
              </div>
              <div className="campo" style={{display:'flex',alignItems:'center',gap:12,flexDirection:'row'}}>
                <button
                  onClick={() => setM('auto_cancelar')(!mora.auto_cancelar)}
                  style={{background:'none',border:'none',cursor:'pointer',padding:0,color: mora.auto_cancelar ? '#EF4444' : '#D1D5DB'}}
                >
                  {mora.auto_cancelar
                    ? <ToggleRight size={32} />
                    : <ToggleLeft size={32} />}
                </button>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>Auto-cancelar pólizas vencidas</div>
                  <div style={{fontSize:12,color:'#6B7280'}}>Cancela automáticamente tras {mora.dias_auto_cancelacion} días sin pago</div>
                </div>
              </div>
            </div>

            {msgMora && (
              <div style={{background: msgMora.startsWith('✓') ? '#D1FAE5' : '#FEE2E2', color: msgMora.startsWith('✓') ? '#065F46' : '#991B1B', borderRadius:8, padding:'10px 14px', fontSize:13, marginTop:8}}>
                {msgMora}
              </div>
            )}

            <div style={{display:'flex',gap:10,marginTop:16,justifyContent:'space-between',alignItems:'center'}}>
              <button
                onClick={aplicarAhora}
                disabled={aplicando}
                style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid #6366F1',background:'#F5F3FF',color:'#6366F1',fontSize:13,fontWeight:600,cursor:'pointer'}}
              >
                {aplicando ? <Loader2 size={15} className="spin" /> : <AlertCircle size={15} />}
                Aplicar mora ahora (manual)
              </button>
              <button
                onClick={guardarMora}
                disabled={savingMora}
                style={{display:'flex',alignItems:'center',gap:6,padding:'8px 20px',borderRadius:8,background:'#EF4444',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}
              >
                {savingMora ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                Guardar parámetros de mora
              </button>
            </div>
          </>
        )}
      </SecCard>
    </>
  )
}

/* ════════════════════════════════════
   TAB SERVICIOS
════════════════════════════════════ */
function TabServicios({ servs, saving, setSaving, onOk, onErr }) {
  const EMPTY = { nombre:'', codigo:'', categoria:'ATAUD', descripcion:'', precio_base:0, aplica_iva:false, porcentaje_iva:0, activo:true }
  const [f, setF]       = useState(EMPTY)
  const [editId, setId] = useState(null)
  const [show, setShow] = useState(false)
  const [filt,  setFilt]= useState('')
  const set = k => v => setF(x => ({...x,[k]:v}))
  const fmt = n => Number(n||0).toLocaleString('es-CO')

  const abrir = (s=null) => { setF(s?{...EMPTY,...s}:EMPTY); setId(s?.id||null); setShow(true) }
  const guardar = async () => {
    if (!f.nombre) return
    setSaving(true)
    try {
      if (editId) await empresaService.actualizarServicio(editId,f); else await empresaService.crearServicio(f)
      setShow(false); onOk()
    } catch { onErr() } finally { setSaving(false) }
  }

  const lista = filt ? servs.filter(s => s.categoria === filt) : servs

  return (
    <SecCard titulo="Catálogo de Servicios" sub="Ítems disponibles para armar paquetes funerarios" Icon={Package} color="#0EA5E9">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, gap:12 }}>
        <select className="select-filter" value={filt} onChange={e => setFilt(e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn-primary" onClick={() => abrir()}><Plus size={15}/> Nuevo Servicio</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Precio Base</th><th>IVA</th><th>Estado</th><th></th></tr></thead>
          <tbody>{lista.map(s => (
            <tr key={s.id}>
              <td><span className="code-tag">{s.codigo}</span></td>
              <td style={{fontWeight:600}}>{s.nombre}</td>
              <td><span className="badge badge-blue">{s.categoria}</span></td>
              <td style={{fontWeight:700}}>${fmt(s.precio_base)}</td>
              <td style={{textAlign:'center'}}>{s.aplica_iva?`${s.porcentaje_iva}%`:'—'}</td>
              <td><span className={`badge ${s.activo?'badge-green':'badge-red'}`}>{s.activo?'Activo':'Inactivo'}</span></td>
              <td><button className="btn-icon" onClick={() => abrir(s)}><Pencil size={13}/></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {show && (
        <div className="form-panel">
          <div className="form-panel-head">
            <div className="form-panel-title">{editId?'Editar Servicio':'Nuevo Servicio'}</div>
            <button className="form-panel-close" onClick={() => setShow(false)}><X size={16}/></button>
          </div>
          <div className="g3">
            <div className="campo span2"><label>Nombre *</label><input value={f.nombre} onChange={e=>set('nombre')(e.target.value)} /></div>
            <div className="campo"><label>Código</label><input value={f.codigo} onChange={e=>set('codigo')(e.target.value)} /></div>
            <div className="campo"><label>Categoría</label><select value={f.categoria} onChange={e=>set('categoria')(e.target.value)}>{CATEGORIAS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="campo"><label>Precio Base</label><input value={f.precio_base} onChange={e=>set('precio_base')(e.target.value)} type="number" /></div>
            <div className="campo" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}>
              <input type="checkbox" id="iva" checked={f.aplica_iva} onChange={e=>set('aplica_iva')(e.target.checked)} style={{width:16,height:16,accentColor:'#6366F1'}}/>
              <label htmlFor="iva" style={{textTransform:'none',letterSpacing:0,fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'}}>Aplica IVA</label>
            </div>
            {f.aplica_iva && <div className="campo"><label>% IVA</label><input value={f.porcentaje_iva} onChange={e=>set('porcentaje_iva')(e.target.value)} type="number" /></div>}
            <div className="campo span3"><label>Descripción</label><textarea value={f.descripcion} onChange={e=>set('descripcion')(e.target.value)} rows={2} /></div>
          </div>
          <BtnBar saving={saving} onGuardar={guardar} onCancelar={() => setShow(false)} />
        </div>
      )}
    </SecCard>
  )
}

/* ════════════════════════════════════
   TAB TIPOS DE DOCUMENTO
════════════════════════════════════ */
const APLICA_OPTS = [
  { v:'AMBOS',    label:'Natural y Jurídica' },
  { v:'NATURAL',  label:'Solo Persona Natural' },
  { v:'JURIDICA', label:'Solo Persona Jurídica' },
]
const APLICA_COLOR = { NATURAL:'badge-blue', JURIDICA:'badge-amber', AMBOS:'badge-green' }

function TabTiposDocumento({ tiposDoc, saving, setSaving, onOk, onErr }) {
  const EMPTY = { codigo_dian:'', sigla:'', nombre:'', aplica_para:'AMBOS', requiere_dv:false, es_extranjero:false, orden:0 }
  const [f,      setF]    = useState(EMPTY)
  const [editId, setId]   = useState(null)
  const [show,   setShow] = useState(false)
  const [filt,   setFilt] = useState('')
  const set = k => v => setF(x => ({...x,[k]:v}))

  const abrir = (t=null) => { setF(t ? {...EMPTY,...t} : EMPTY); setId(t?.id||null); setShow(true) }

  const guardar = async () => {
    if (!f.codigo_dian || !f.sigla || !f.nombre) return
    setSaving(true)
    try {
      if (editId) { await api.put(`/tipos-documento/${editId}`, f); toast.success('Tipo de documento actualizado con éxito') }
      else        { await api.post('/tipos-documento', f); toast.success('Tipo de documento creado con éxito') }
      setShow(false); onOk()
    } catch(e) {
      onErr(e?.response?.data?.error || 'Error al guardar')
      toast.error(e?.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const toggle = async (t) => {
    try {
      await api.patch(`/tipos-documento/${t.id}/toggle`)
      toast.success(t.activo ? 'Tipo de documento desactivado con éxito' : 'Tipo de documento activado con éxito')
      onOk()
    } catch { onErr(); toast.error('Error al guardar') }
  }

  const lista = filt
    ? tiposDoc.filter(t => t.aplica_para === filt || t.aplica_para === 'AMBOS')
    : tiposDoc

  const activos   = tiposDoc.filter(t => t.activo).length
  const inactivos = tiposDoc.length - activos

  return (
    <>
    <SecCard titulo="Tipos de Documento" sub="Documentos habilitados por la DIAN — Colombia (Res. 000042/2020)" Icon={CreditCard} color="#0891B2">

      {/* Info DIAN */}
      <div className="info-box" style={{ background:'#F0F9FF', borderColor:'#BAE6FD', color:'#075985' }}>
        <Shield size={15} style={{ flexShrink:0, marginTop:1 }}/>
        <span>Tipos de documento oficiales habilitados por la <strong>DIAN</strong> para facturación electrónica en Colombia. El código DIAN es el que va en el XML de la factura electrónica.</span>
      </div>

      {/* KPIs + acciones */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:10, padding:'8px 16px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:900, color:'#0891B2' }}>{activos}</div>
            <div style={{ fontSize:10, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', letterSpacing:.8 }}>Activos</div>
          </div>
          <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:10, padding:'8px 16px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:900, color:'#C2410C' }}>{inactivos}</div>
            <div style={{ fontSize:10, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', letterSpacing:.8 }}>Inactivos</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select className="select-filter" value={filt} onChange={e=>setFilt(e.target.value)}>
            <option value="">Todos</option>
            <option value="NATURAL">Persona Natural</option>
            <option value="JURIDICA">Persona Jurídica</option>
          </select>
          <button className="btn-primary" onClick={() => abrir()}><Plus size={15}/> Nuevo Tipo</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Código DIAN</th>
              <th>Sigla</th>
              <th>Nombre</th>
              <th>Aplica Para</th>
              <th style={{textAlign:'center'}}>Dígito V.</th>
              <th style={{textAlign:'center'}}>Extranjero</th>
              <th style={{textAlign:'center'}}>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map(t => (
              <tr key={t.id} style={{ opacity: t.activo ? 1 : 0.55 }}>
                <td><span className="code-tag">{t.codigo_dian}</span></td>
                <td style={{ fontWeight:800, color:'#0891B2', fontSize:14 }}>{t.sigla}</td>
                <td style={{ fontWeight:600 }}>{t.nombre}</td>
                <td><span className={`badge ${APLICA_COLOR[t.aplica_para]||'badge-blue'}`}>{t.aplica_para}</span></td>
                <td style={{ textAlign:'center' }}>
                  {t.requiere_dv
                    ? <span style={{ color:'#059669', fontWeight:700, fontSize:13 }}>✓ Sí</span>
                    : <span style={{ color:'#D1D5DB', fontSize:13 }}>—</span>}
                </td>
                <td style={{ textAlign:'center' }}>
                  {t.es_extranjero
                    ? <span style={{ color:'#F59E0B', fontWeight:700, fontSize:13 }}>✓ Sí</span>
                    : <span style={{ color:'#D1D5DB', fontSize:13 }}>—</span>}
                </td>
                <td style={{ textAlign:'center' }}>
                  <button
                    onClick={() => toggle(t)}
                    style={{ background:'none', border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700,
                             color: t.activo ? '#10B981' : '#9CA3AF' }}>
                    {t.activo
                      ? <><ToggleRight size={20} color="#10B981"/> Activo</>
                      : <><ToggleLeft  size={20} color="#9CA3AF"/> Inactivo</>}
                  </button>
                </td>
                <td>
                  <button className="btn-icon" onClick={() => abrir(t)}><Pencil size={13}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </SecCard>

    {/* Modal crear / editar — fuera del SecCard para no quedar bajo overflow:hidden */}
    {show && (
      <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setShow(false) }}>
        <div className="modal-box">
          <div className="modal-head">
            <div className="modal-title">
              {editId ? '✏️ Editar Tipo de Documento' : '+ Nuevo Tipo de Documento'}
            </div>
            <button className="modal-close" onClick={() => setShow(false)}><X size={18}/></button>
          </div>
          <div className="modal-body">
            <div className="info-box" style={{ background:'#FFFBEB', borderColor:'#FDE68A', color:'#92400E', marginBottom:18, fontSize:12 }}>
              <span>⚠️</span>
              <span>El <strong>Código DIAN</strong> debe coincidir con la tabla oficial (ej: 13 → CC, 31 → NIT). No se puede editar una vez creado.</span>
            </div>
            <div className="g3">
              <div className="campo">
                <label>Código DIAN *</label>
                <input value={f.codigo_dian} onChange={e=>set('codigo_dian')(e.target.value.toUpperCase())}
                       disabled={!!editId} placeholder="13, 31, PEP…"
                       style={editId ? {background:'#F4F5FA',color:'#9CA3AF'} : {}}/>
              </div>
              <div className="campo">
                <label>Sigla *</label>
                <input value={f.sigla} onChange={e=>set('sigla')(e.target.value.toUpperCase())} placeholder="CC, NIT, TI…" />
              </div>
              <div className="campo">
                <label>Orden</label>
                <input value={f.orden} onChange={e=>set('orden')(Number(e.target.value))} type="number" min={0}/>
              </div>
              <div className="campo span3">
                <label>Nombre completo *</label>
                <input value={f.nombre} onChange={e=>set('nombre')(e.target.value)} placeholder="Cédula de Ciudadanía…"/>
              </div>
              <div className="campo span3">
                <label>Aplica Para</label>
                <select value={f.aplica_para} onChange={e=>set('aplica_para')(e.target.value)}>
                  {APLICA_OPTS.map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </div>
              <div className="campo span3" style={{display:'flex',gap:24,alignItems:'center',paddingTop:4}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',margin:0}}>
                  <input type="checkbox" checked={f.requiere_dv} onChange={e=>set('requiere_dv')(e.target.checked)} style={{width:16,height:16,accentColor:'#6366F1'}}/>
                  <span style={{fontSize:13,fontWeight:600,color:'#374151',textTransform:'none',letterSpacing:0}}>Requiere dígito verificador (NIT)</span>
                </label>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',margin:0}}>
                  <input type="checkbox" checked={f.es_extranjero} onChange={e=>set('es_extranjero')(e.target.checked)} style={{width:16,height:16,accentColor:'#6366F1'}}/>
                  <span style={{fontSize:13,fontWeight:600,color:'#374151',textTransform:'none',letterSpacing:0}}>Es documento extranjero</span>
                </label>
              </div>
            </div>
            <BtnBar saving={saving} onGuardar={guardar} onCancelar={() => setShow(false)} />
          </div>
        </div>
      </div>
    )}
    </>
  )
}

/* ════════════════════════════════════
   TAB NOTIFICACIONES
════════════════════════════════════ */
const NOTIF_SUBTABS = [
  { id:'correo',   label:'Correo (SMTP)', Icon:Send },
  { id:'whatsapp', label:'WhatsApp',      Icon:MessageCircle },
  { id:'sms',      label:'SMS',           Icon:Smartphone },
]

function TabNotificaciones({ data, saving, setSaving, onOk, onErr }) {
  const [sub, setSub] = useState('correo')
  const [f, setF] = useState({ wa_token:'', wa_phone_id:'', wa_business_id:'', smtp_host:'', smtp_puerto:587, smtp_usuario:'', smtp_password:'', smtp_de_nombre:'' })
  useEffect(() => { if (data) setF(x => ({...x,...data})) }, [data])
  const set = k => v => setF(x => ({...x,[k]:v}))
  const guardar = async () => { setSaving(true); try { onOk((await empresaService.actualizarParametros(f)).data.data) } catch { onErr() } finally { setSaving(false) } }

  return (
    <>
    <div className="notif-subtabs">
      {NOTIF_SUBTABS.map(t => (
        <button key={t.id} className={`notif-subtab${sub === t.id ? ' active' : ''}`} onClick={() => setSub(t.id)}>
          <t.Icon size={15}/> {t.label}
        </button>
      ))}
    </div>

    {sub === 'correo' && (
      <SecCard titulo="Correo Electrónico" sub="Envío transaccional (SMTP)" Icon={Bell} color="#EC4899">
        <div className="info-box"><span>🔒</span><span>Los tokens y contraseñas se guardan cifrados. Dejar en blanco para conservar el valor actual.</span></div>
        <div className="g3">
          <div className="campo span2"><label>Servidor SMTP</label><input value={f.smtp_host} onChange={e=>set('smtp_host')(e.target.value)} placeholder="smtp.gmail.com" /></div>
          <div className="campo"><label>Puerto</label><input value={f.smtp_puerto} onChange={e=>set('smtp_puerto')(e.target.value)} type="number" /></div>
          <div className="campo"><label>Usuario / Email</label><input value={f.smtp_usuario} onChange={e=>set('smtp_usuario')(e.target.value)} /></div>
          <div className="campo"><label>Contraseña</label><input value={f.smtp_password} onChange={e=>set('smtp_password')(e.target.value)} type="password" placeholder="Ingrese para actualizar" /></div>
          <div className="campo"><label>Nombre del Remitente</label><input value={f.smtp_de_nombre} onChange={e=>set('smtp_de_nombre')(e.target.value)} placeholder="Funeraria San José" /></div>
        </div>
        <BtnBar saving={saving} onGuardar={guardar} />
      </SecCard>
    )}

    {sub === 'whatsapp' && (
      <>
        <WhatsAppEstadoCard />
        <SecCard titulo="WhatsApp Business API (Meta)" sub="Alternativa oficial — opcional, no se usa mientras la sesión QR esté activa" Icon={MessageCircle} color="#25D366">
          <div className="info-box"><span>🔒</span><span>Los tokens se guardan cifrados. Dejar en blanco para conservar el valor actual.</span></div>
          <div className="g2">
            <div className="campo"><label>Phone Number ID</label><input value={f.wa_phone_id} onChange={e=>set('wa_phone_id')(e.target.value)} /></div>
            <div className="campo"><label>Business Account ID</label><input value={f.wa_business_id} onChange={e=>set('wa_business_id')(e.target.value)} /></div>
            <div className="campo span2"><label>Token de Acceso</label><input value={f.wa_token} onChange={e=>set('wa_token')(e.target.value)} type="password" placeholder="Ingrese para actualizar" /></div>
          </div>
          <BtnBar saving={saving} onGuardar={guardar} />
        </SecCard>
      </>
    )}

    {sub === 'sms' && <SmsEstadoCard />}
    </>
  )
}

/* ── Card: WhatsApp (whatsapp-web.js) — estado de sesión + QR ── */
function WhatsAppEstadoCard() {
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reiniciando, setReiniciando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const r = await api.get('/notificaciones/whatsapp/estado')
      setEstado(r.data.data)
    } catch { setEstado({ ready:false, estado:'error_conexion' }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 3000)
    return () => clearInterval(t)
  }, [cargar])

  const reiniciar = async () => {
    setReiniciando(true)
    try {
      await api.post('/notificaciones/whatsapp/reiniciar')
      toast.success('Reiniciando sesión de WhatsApp — escanea el nuevo código QR')
      await cargar()
    } catch { toast.error('No se pudo reiniciar la sesión') }
    finally { setReiniciando(false) }
  }

  const conectado = estado?.ready
  const badge = conectado
    ? { label:'Conectado', bg:'#ECFDF5', fg:'#059669', Icon:Wifi }
    : estado?.estado === 'esperando_qr'
      ? { label:'Esperando escaneo', bg:'#FFFBEB', fg:'#D97706', Icon:Smartphone }
      : { label:'Desconectado', bg:'#FEF2F2', fg:'#DC2626', Icon:WifiOff }

  return (
    <SecCard titulo="WhatsApp" sub="Sesión estilo WhatsApp Web (escanea con el celular de la funeraria)" Icon={MessageCircle} color="#25D366">
      <div className="wa-status-row">
        <span className="wa-status-label"><badge.Icon size={15}/> Estado</span>
        <span className="wa-status-badge" style={{ background:badge.bg, color:badge.fg }}>{badge.label}</span>
      </div>

      {loading ? (
        <div className="wa-status-body"><Loader2 size={22} className="spin"/></div>
      ) : conectado ? (
        <div className="wa-status-body">
          <CheckCircle2 size={44} color="#059669"/>
          <div className="wa-status-title" style={{ color:'#059669' }}>Sesión activa</div>
          <div className="wa-status-sub">WhatsApp conectado y listo para enviar notificaciones.</div>
          <div className="wa-status-info">
            <div><span>Número conectado</span><strong>+{estado.numero}</strong></div>
            <div><span>Vinculado el</span><strong>{estado.conectado_desde ? new Date(estado.conectado_desde).toLocaleString('es-CO') : '—'}</strong></div>
          </div>
        </div>
      ) : estado?.qr ? (
        <div className="wa-status-body">
          <img src={estado.qr} alt="QR WhatsApp" width={220} height={220} style={{ borderRadius:14, boxShadow:'0 8px 24px rgba(0,0,0,.12)' }}/>
          <div className="wa-status-sub">Escanea con WhatsApp → Dispositivos vinculados → Vincular dispositivo</div>
        </div>
      ) : (
        <div className="wa-status-body">
          <XCircle size={44} color="#DC2626"/>
          <div className="wa-status-title" style={{ color:'#DC2626' }}>Sin sesión activa</div>
          <div className="wa-status-sub">
            {estado?.estado === 'no_configurado' ? 'El servicio de WhatsApp aún no está configurado.' : `Estado: ${estado?.estado || 'desconocido'}`}
          </div>
        </div>
      )}

      <button className="btn-primary" style={{ background:'#25D366', marginTop:14 }} onClick={reiniciar} disabled={reiniciando}>
        {reiniciando ? <Loader2 size={14} className="spin"/> : <RefreshCw size={14}/>} Reiniciar y generar QR
      </button>
      <div className="wa-status-footer">El estado se actualiza automáticamente cada 3 segundos</div>
    </SecCard>
  )
}

/* ── Card: SMS (LabsMobile) — saldo + historial de envíos ── */
function SmsEstadoCard() {
  const [saldo, setSaldo] = useState(null)
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [rs, rl] = await Promise.all([
        api.get('/notificaciones/sms/saldo'),
        api.get('/notificaciones/log?canal=SMS&limit=15'),
      ])
      setSaldo(rs.data.data.saldo)
      setLog(rl.data.data)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const fmtF = f => new Date(f).toLocaleString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })

  return (
    <SecCard titulo="SMS" sub="Proveedor: LabsMobile" Icon={Send} color="#6366F1">
      <div className="wa-status-row">
        <span className="wa-status-label"><Send size={15}/> Saldo disponible</span>
        <span className="wa-status-badge" style={{ background: saldo > 5 ? '#ECFDF5' : '#FEF2F2', color: saldo > 5 ? '#059669' : '#DC2626' }}>
          {saldo == null ? '—' : `${saldo} créditos`}
        </span>
      </div>
      {saldo != null && saldo < 5 && (
        <div className="info-box" style={{ marginTop:10 }}><span>⚠️</span><span>Saldo bajo — recarga en tu cuenta de LabsMobile para seguir enviando SMS.</span></div>
      )}

      <Div label="Últimos mensajes enviados" />
      {loading ? (
        <div className="wa-status-body"><Loader2 size={22} className="spin"/></div>
      ) : log.length === 0 ? (
        <div className="wa-status-sub" style={{ textAlign:'center', padding:'14px 0' }}>Aún no se ha enviado ningún SMS.</div>
      ) : (
        <table className="sms-log-table">
          <thead>
            <tr><th>Destinatario</th><th>Mensaje</th><th>Estado</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {log.map(m => (
              <tr key={m.id}>
                <td>{m.destinatario}</td>
                <td className="sms-log-msg" title={m.mensaje}>{m.mensaje}</td>
                <td>
                  <span className="wa-status-badge" style={{
                    background: m.estado === 'ENVIADO' ? '#ECFDF5' : '#FEF2F2',
                    color: m.estado === 'ENVIADO' ? '#059669' : '#DC2626', fontSize:11 }}>
                    {m.estado}
                  </span>
                </td>
                <td>{fmtF(m.creado_en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SecCard>
  )
}

/* ════════════════════════════════════
   TAB APARIENCIA
════════════════════════════════════ */
const HEX_RE = /^#[0-9a-fA-F]{6}$/
const PALETAS_SUGERIDAS = [
  { nombre:'Orquídea (original)', primario:'#2E3192', acento:'#C9A020' },
  { nombre:'Esmeralda',           primario:'#065F46', acento:'#D97706' },
  { nombre:'Vino',                primario:'#7C2D12', acento:'#B45309' },
  { nombre:'Azul corporativo',    primario:'#1E3A8A', acento:'#0EA5E9' },
  { nombre:'Grafito',             primario:'#1F2937', acento:'#9CA3AF' },
]

function CampoColor({ label, valor, onCambiar }) {
  const [draft, setDraft] = useState(valor)
  useEffect(() => { setDraft(valor) }, [valor])
  const valido = HEX_RE.test(draft)

  const commit = () => { if (valido) { onCambiar(draft.toUpperCase()) } else { setDraft(valor) } }

  return (
    <div className="campo">
      <label>{label}</label>
      <div className="color-row">
        <input
          type="color"
          className="color-swatch"
          value={valido ? draft : valor}
          onChange={e => { onCambiar(e.target.value); setDraft(e.target.value) }}
        />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          placeholder="#2E3192"
          className={draft && !valido ? 'input-err' : undefined}
          maxLength={7}
        />
      </div>
      {draft && !valido && <div className="color-hint-err">Formato inválido — usa #RRGGBB</div>}
    </div>
  )
}

function TabApariencia({ data, saving, setSaving, onOk, onErr }) {
  const [f, setF] = useState({ color_primario:'#2E3192', color_acento:'#C9A020' })
  useEffect(() => { if (data?.color_primario || data?.color_acento) setF(x => ({...x,...data})) }, [data])
  const set = k => v => setF(x => ({...x,[k]:v}))

  const guardar = async () => {
    setSaving(true)
    try {
      const res = await empresaService.actualizarParametros({ color_primario:f.color_primario, color_acento:f.color_acento })
      aplicarColoresTema(f.color_primario, f.color_acento)
      onOk(res.data.data)
    } catch { onErr() } finally { setSaving(false) }
  }

  const aplicarPaleta = p => {
    setF(x => ({ ...x, color_primario:p.primario, color_acento:p.acento }))
  }

  return (
    <SecCard titulo="Apariencia del Sistema" sub="Personaliza los colores corporativos que se ven en todo el ERP" Icon={Palette} color="#C9A020">
      <div className="g2">
        <CampoColor label="Color primario" valor={f.color_primario} onCambiar={set('color_primario')} />
        <CampoColor label="Color acento (dorado)" valor={f.color_acento} onCambiar={set('color_acento')} />
      </div>

      <div className="campo" style={{ marginTop:18 }}>
        <label>Paletas sugeridas</label>
        <div className="paleta-row">
          {PALETAS_SUGERIDAS.map(p => (
            <button
              type="button"
              key={p.nombre}
              className="paleta-chip"
              title={p.nombre}
              onClick={() => aplicarPaleta(p)}
            >
              <span className="paleta-dot" style={{ background:p.primario }} />
              <span className="paleta-dot" style={{ background:p.acento }} />
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="ap-preview">
        <div className="ap-preview-lbl">Vista previa en vivo</div>
        <div className="ap-preview-mock">
          <div className="ap-mock-sidebar" style={{ background: `linear-gradient(180deg, ${f.color_primario}, ${f.color_primario}CC)` }}>
            <div className="ap-mock-dot" style={{ background:f.color_acento }} />
            <div className="ap-mock-bar" style={{ width:'70%' }} />
            <div className="ap-mock-bar active" style={{ background:'rgba(255,255,255,.18)' }} />
            <div className="ap-mock-bar" style={{ width:'55%' }} />
            <div className="ap-mock-bar" style={{ width:'65%' }} />
          </div>
          <div className="ap-mock-main">
            <div className="ap-mock-btn" style={{ background:`linear-gradient(135deg, ${f.color_primario}, ${f.color_acento})` }}>
              Botón principal
            </div>
            <div className="ap-mock-chip" style={{ color:f.color_primario, borderColor:f.color_primario+'55', background:f.color_primario+'12' }}>
              Etiqueta activa
            </div>
          </div>
        </div>
      </div>

      <BtnBar saving={saving} onGuardar={guardar} />
    </SecCard>
  )
}

/* ════════════════════════════════════
   COMPONENTES COMPARTIDOS
════════════════════════════════════ */
function SecCard({ titulo, sub, Icon, color, children }) {
  return (
    <div className="sec-card">
      <div className="sec-head">
        <div className="sec-head-icon" style={{ background: color+'18' }}>
          <Icon size={20} color={color} />
        </div>
        <div className="sec-head-text">
          <div className="sec-title">{titulo}</div>
          <div className="sec-sub">{sub}</div>
        </div>
      </div>
      <div className="sec-body">{children}</div>
    </div>
  )
}

function Div({ label }) {
  return (
    <div className="divrow">
      <span className="divlabel">{label}</span>
      <div className="divline" />
    </div>
  )
}

function BtnBar({ saving, onGuardar, onCancelar }) {
  return (
    <div className="btn-bar">
      <button className="btn-primary" onClick={onGuardar} disabled={saving}>
        {saving
          ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> Guardando…</>
          : <><Save size={14}/> Guardar Cambios</>}
      </button>
      {onCancelar && <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: FORMAS DE PAGO
═══════════════════════════════════════════════════════════════════════════ */
function TabFormasPago() {
  const [formas, setFormas]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const BLANK_FORMA = { codigo:'', nombre:'', icono:'💳', requiere_referencia:false, requiere_soporte:false, orden:99 }
  const [form, setForm] = useState(BLANK_FORMA)

  const cargar = async () => {
    setLoading(true)
    try {
      const r = await api.get('/formas-pago?todas=1')
      setFormas(r.data.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const abrirNueva = () => { setEditando(null); setForm(BLANK_FORMA); setModal(true) }
  const abrirEditar = (f) => {
    setEditando(f)
    setForm({ codigo:f.codigo, nombre:f.nombre, icono:f.icono,
              requiere_referencia:f.requiere_referencia, requiere_soporte:f.requiere_soporte, orden:f.orden })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return setMsg('El nombre es obligatorio')
    if (!editando && !form.codigo.trim()) return setMsg('El código es obligatorio')
    setSaving(true); setMsg('')
    try {
      if (editando) { await api.put(`/formas-pago/${editando.id}`, form); toast.success('Forma de pago actualizada con éxito') }
      else          { await api.post('/formas-pago', form); toast.success('Forma de pago creada con éxito') }
      setModal(false); cargar()
    } catch(e) {
      setMsg(e.response?.data?.error || 'Error al guardar')
      toast.error(e.response?.data?.error || 'Error al guardar')
    }
    finally { setSaving(false) }
  }

  const toggleActivo = async (f) => {
    await api.patch(`/formas-pago/${f.id}`)
    toast.success(f.activo ? 'Forma de pago desactivada con éxito' : 'Forma de pago activada con éxito')
    cargar()
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:'#0F1035' }}>Formas de Pago</div>
          <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
            Configura los métodos de cobro disponibles en el módulo de Cartera
          </div>
        </div>
        <button onClick={abrirNueva} style={{ display:'flex', alignItems:'center', gap:6,
          background:'#059669', color:'#fff', border:'none', borderRadius:10,
          padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <Plus size={14}/>Nueva forma de pago
        </button>
      </div>

      {loading
        ? <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>
            <Loader2 size={20} style={{ animation:'spin 1s linear infinite' }}/>
          </div>
        : <div style={{ display:'grid', gap:10 }}>
            {formas.map(f => (
              <div key={f.id} style={{
                display:'flex', alignItems:'center', gap:14,
                background: f.activo ? '#fff' : '#FAFAFA',
                border:`1.5px solid ${f.activo ? '#E2E5F0' : '#F3F4F6'}`,
                borderRadius:12, padding:'12px 16px',
                opacity: f.activo ? 1 : 0.6,
              }}>
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                  background: f.activo ? '#ECFDF5' : '#F3F4F6',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                  {f.icono}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color: f.activo ? '#111827' : '#9CA3AF' }}>
                    {f.nombre}
                    {!f.activo && <span style={{ fontSize:11, marginLeft:8, color:'#EF4444', fontWeight:400 }}>Inactiva</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#6B7280', marginTop:2, display:'flex', gap:10 }}>
                    <span>Código: <code style={{ background:'#F3F4F6', padding:'1px 5px', borderRadius:4 }}>{f.codigo}</code></span>
                    {f.requiere_referencia && <span style={{ color:'#F59E0B', fontWeight:600 }}>⚠ Req. referencia</span>}
                    {f.requiere_soporte    && <span style={{ color:'#6366F1', fontWeight:600 }}>📎 Req. soporte</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => abrirEditar(f)} title="Editar"
                    style={{ background:'#F3F4F6', border:'none', borderRadius:8, padding:'7px 10px', cursor:'pointer' }}>
                    <Pencil size={13} color="#6B7280"/>
                  </button>
                  <button onClick={() => toggleActivo(f)} title={f.activo ? 'Desactivar' : 'Activar'}
                    style={{ background: f.activo ? '#FEF3C7' : '#ECFDF5',
                      border:'none', borderRadius:8, padding:'7px 10px', cursor:'pointer' }}>
                    {f.activo ? <ToggleRight size={16} color="#F59E0B"/> : <ToggleLeft size={16} color="#059669"/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
      }

      {/* Modal nueva / editar */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setModal(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:420, maxWidth:'95vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>{editando ? 'Editar forma de pago' : 'Nueva forma de pago'}</div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ display:'grid', gap:14 }}>
              {!editando && (
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                    Código <span style={{color:'#EF4444'}}>*</span>
                    <span style={{color:'#9CA3AF',fontWeight:400,marginLeft:4}}>(único, sin espacios)</span>
                  </label>
                  <input value={form.codigo} onChange={e => setForm(p=>({...p, codigo:e.target.value.toLowerCase().replace(/\s+/g,'_')}))}
                    placeholder="ej: nequi, transferencia_bcsc"
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0',
                      borderRadius:10, fontSize:13, boxSizing:'border-box' }}/>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'60px 1fr', gap:10 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Ícono</label>
                  <input value={form.icono} onChange={e => setForm(p=>({...p, icono:e.target.value}))}
                    style={{ width:'100%', padding:'9px 8px', border:'1.5px solid #E2E5F0',
                      borderRadius:10, fontSize:20, textAlign:'center', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                    Nombre <span style={{color:'#EF4444'}}>*</span>
                  </label>
                  <input value={form.nombre} onChange={e => setForm(p=>({...p, nombre:e.target.value}))}
                    placeholder="ej: Nequi, Transferencia BBVA"
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0',
                      borderRadius:10, fontSize:13, boxSizing:'border-box' }}/>
                </div>
              </div>
              <div style={{ display:'grid', gap:10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={form.requiere_referencia}
                    onChange={e => setForm(p=>({...p, requiere_referencia:e.target.checked}))}
                    style={{ width:16, height:16, accentColor:'#F59E0B' }}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>Requiere número de referencia</div>
                    <div style={{ fontSize:11, color:'#6B7280' }}>El cajero debe ingresar el código de la transacción</div>
                  </div>
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={form.requiere_soporte}
                    onChange={e => setForm(p=>({...p, requiere_soporte:e.target.checked}))}
                    style={{ width:16, height:16, accentColor:'#6366F1' }}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>Requiere adjuntar soporte</div>
                    <div style={{ fontSize:11, color:'#6B7280' }}>Se pedirá captura o PDF del comprobante de pago</div>
                  </div>
                </label>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Orden de aparición</label>
                <input type="number" min="1" max="99" value={form.orden}
                  onChange={e => setForm(p=>({...p, orden:Number(e.target.value)}))}
                  style={{ width:80, padding:'9px 12px', border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13 }}/>
              </div>
            </div>

            {msg && <div style={{ marginTop:12, color:'#EF4444', fontSize:12 }}>{msg}</div>}

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={() => setModal(false)}
                style={{ flex:1, padding:'10px', border:'1.5px solid #E2E5F0', borderRadius:10,
                  background:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                style={{ flex:2, padding:'10px', border:'none', borderRadius:10,
                  background:'#059669', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                {saving ? 'Guardando…' : <><Save size={13}/> {editando ? 'Actualizar' : 'Crear'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
