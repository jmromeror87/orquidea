/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Usuarios y Permisos                                  ║
 * ║  Archivo         : UsuariosPage.jsx                                     ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Search, RefreshCw, Shield, Edit2,
  ToggleLeft, ToggleRight, Key, X, Loader2,
  CheckCircle2, XCircle, UserCog, Clock,
  MapPin, Mail, Lock, ShieldCheck, Eye,
  FilePlus, FileEdit, Trash2, Download,
  AlertTriangle,
} from 'lucide-react'
import api from '../../services/api.js'
import { useAuthStore } from '../../store/auth.store.js'
import { toast } from '../../store/toast.store.js'

/* ─── Roles ─── */
const ROLES = [
  { value:'superadmin',       label:'Super Admin',      color:'#4338CA', bg:'#EEF2FF', icon:'👑' },
  { value:'administrador',    label:'Administrador',    color:'#1D4ED8', bg:'#DBEAFE', icon:'⚙️' },
  { value:'contador',         label:'Contador',         color:'#0D7490', bg:'#CFFAFE', icon:'📊' },
  { value:'operador',         label:'Operador',         color:'#6D28D9', bg:'#EDE9FE', icon:'🔧' },
  { value:'asesor_comercial', label:'Asesor Comercial', color:'#B45309', bg:'#FEF3C7', icon:'💼' },
  { value:'consultor',        label:'Consultor',        color:'#374151', bg:'#F3F4F6', icon:'👁' },
]
const getRol = v => ROLES.find(r => r.value === v) || ROLES[5]

/* ─── Módulos con íconos y colores ─── */
const MODULOS = [
  { key:'dashboard',     label:'Dashboard',       color:'#6366F1', icon:'📊', desc:'Panel principal y resumen' },
  { key:'clientes',      label:'Clientes',        color:'#10B981', icon:'👥', desc:'Registro de clientes y difuntos' },
  { key:'contratos',     label:'Contratos',       color:'#F59E0B', icon:'📄', desc:'Contratos y previsión funeraria' },
  { key:'servicios',     label:'Servicios',       color:'#8B5CF6', icon:'🌸', desc:'Servicios funerarios activos' },
  { key:'cartera',       label:'Cartera',         color:'#EF4444', icon:'💰', desc:'Pagos, cuotas y recaudo' },
  { key:'reportes',      label:'Reportes',        color:'#0EA5E9', icon:'📈', desc:'Informes y estadísticas' },
  { key:'usuarios',      label:'Usuarios',        color:'#64748B', icon:'👤', desc:'Gestión de usuarios del sistema' },
  { key:'configuracion', label:'Configuración',   color:'#C9A020', icon:'⚙️', desc:'Parámetros del sistema' },
  { key:'territorio',    label:'Territorio',      color:'#059669', icon:'🗺️', desc:'División geográfica de Colombia' },
  { key:'recaudo',       label:'Recaudo',         color:'#6366F1', icon:'🛣️', desc:'Rutas, zonas y cobro en campo' },
  { key:'pos',           label:'Punto de Venta',  color:'#16A34A', icon:'🛒', desc:'Venta de mostrador y caja menor' },
  { key:'memoriales',    label:'Memoriales',      color:'#4C1D95', icon:'🌸', desc:'Novenarios, aniversarios y misas del sitio web' },
  { key:'solicitudes',   label:'Solicitudes',     color:'#DB2777', icon:'📥', desc:'Prospectos que llegan desde la página web' },
]

/* ─── Acciones ─── */
const ACCIONES = [
  { key:'ver',      label:'Ver',      icon:<Eye size={13}/>,      color:'#6366F1' },
  { key:'crear',    label:'Crear',    icon:<FilePlus size={13}/>, color:'#10B981' },
  { key:'editar',   label:'Editar',   icon:<FileEdit size={13}/>, color:'#F59E0B' },
  { key:'eliminar', label:'Eliminar', icon:<Trash2 size={13}/>,   color:'#EF4444' },
  { key:'exportar', label:'Exportar', icon:<Download size={13}/>, color:'#0EA5E9' },
]

/* ─── CSS ─── */
const CSS = `
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes modalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }

  .upage { display:flex; flex-direction:column; height:100%; overflow:hidden; }

  /* Header */
  .upage-head {
    padding:20px 28px 0; background:#fff; border-bottom:1px solid #ECEDF8; flex-shrink:0;
  }
  .upage-head-top { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; padding-bottom:16px; }
  .upage-category { font-size:10px; font-weight:800; color:#64748B; letter-spacing:1.8px; text-transform:uppercase; margin-bottom:4px; }
  .upage-title    { font-size:24px; font-weight:900; color:#0F1035; line-height:1; }
  .upage-sub      { font-size:12px; color:#9CA3AF; margin-top:4px; }

  /* Tabs */
  .utabs { display:flex; gap:0; border-top:1px solid #ECEDF8; }
  .utab {
    padding:12px 22px; font-size:13px; font-weight:700; color:#9CA3AF;
    cursor:pointer; border-bottom:2px solid transparent; display:flex; align-items:center; gap:7px;
    transition:all .15s; margin-bottom:-1px;
  }
  .utab:hover  { color:#6366F1; background:#F8F9FF; }
  .utab.active { color:#4338CA; border-bottom-color:#4338CA; background:#fff; }
  .utab-badge {
    background:#EEF2FF; color:#4338CA; border-radius:20px;
    padding:1px 8px; font-size:10px; font-weight:800;
  }
  .utab.active .utab-badge { background:#4338CA; color:#fff; }

  /* Body */
  .upage-body { flex:1; overflow-y:auto; padding:24px 28px; display:flex; flex-direction:column; gap:20px; }
  .upage-body::-webkit-scrollbar { width:4px; }
  .upage-body::-webkit-scrollbar-thumb { background:#DDE1F0; border-radius:4px; }

  /* KPI strip */
  .kpi-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .kpi-card {
    background:#fff; border:1px solid #ECEDF8; border-radius:16px;
    padding:18px 20px; display:flex; align-items:center; gap:14px;
    box-shadow:0 1px 4px rgba(0,0,0,.04); animation:fadeIn .3s ease;
  }
  .kpi-icon { width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:20px; }
  .kpi-val  { font-size:28px; font-weight:900; line-height:1; }
  .kpi-lbl  { font-size:11.5px; color:#9CA3AF; margin-top:3px; font-weight:500; }

  /* Toolbar */
  .toolbar { background:#fff; border:1px solid #ECEDF8; border-radius:14px; padding:14px 16px; display:flex; gap:10px; align-items:center; }
  .search-wrap { position:relative; flex:1; min-width:180px; }
  .search-wrap svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#9CA3AF; pointer-events:none; }
  .search-inp { width:100%; padding:10px 12px 10px 38px; border:1.5px solid #E8E9F8; border-radius:10px; font-size:13.5px; outline:none; background:#FAFBFF; transition:border-color .15s; box-sizing:border-box; font-family:inherit; }
  .search-inp:focus { border-color:#6366F1; }
  .filt-select { padding:10px 13px; border:1.5px solid #E8E9F8; border-radius:10px; font-size:13px; outline:none; background:#FAFBFF; font-family:inherit; cursor:pointer; }
  .tool-btn { width:40px; height:40px; border:1.5px solid #E8E9F8; border-radius:10px; background:#FAFBFF; display:flex; align-items:center; justify-content:center; color:#6B7280; cursor:pointer; transition:all .15s; flex-shrink:0; }
  .tool-btn:hover { background:#EEF2FF; color:#6366F1; border-color:#C7D2FE; }

  /* Table card */
  .tbl-card { background:#fff; border:1px solid #ECEDF8; border-radius:16px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .tbl-card-head { padding:14px 20px; border-bottom:1px solid #F0F1FA; display:flex; align-items:center; justify-content:space-between; }
  .tbl-card-title { font-size:14px; font-weight:800; color:#0F1035; }
  .tbl-card-count { font-size:11.5px; color:#9CA3AF; background:#F4F5FA; border-radius:20px; padding:2px 10px; }
  .tbl { width:100%; border-collapse:collapse; }
  .tbl th { padding:11px 18px; text-align:left; font-size:10px; font-weight:800; color:#9CA3AF; text-transform:uppercase; letter-spacing:1px; background:#FAFBFF; border-bottom:1px solid #ECEDF8; }
  .tbl td { padding:0 18px; border-bottom:1px solid #F4F5FA; }
  .tbl tr:last-child td { border-bottom:none; }
  .tbl tr:hover td { background:#FAFBFF; }
  .tbl-row-inner { display:flex; align-items:center; padding:13px 0; }
  .uavatar { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; flex-shrink:0; }
  .uname  { font-size:13.5px; font-weight:700; color:#0F1035; }
  .uemail { font-size:11.5px; color:#9CA3AF; margin-top:1px; display:flex; align-items:center; gap:4px; }
  .rol-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; border-radius:20px; font-size:11.5px; font-weight:700; }
  .estado-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; border-radius:20px; font-size:11.5px; font-weight:700; }
  .badge-active   { background:#D1FAE5; color:#047857; }
  .badge-inactive { background:#FEE2E2; color:#DC2626; }
  .last-access { font-size:11.5px; color:#9CA3AF; display:flex; align-items:center; gap:5px; }
  .act-btns { display:flex; gap:6px; align-items:center; }
  .act-btn { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; border:1.5px solid transparent; }
  .tbl-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:60px; color:#9CA3AF; }
  .tbl-loading { display:flex; justify-content:center; align-items:center; padding:60px; color:#6366F1; }

  /* ══ PERMISOS MATRIX ══ */
  .perm-wrap { display:flex; flex-direction:column; gap:16px; }
  .perm-info {
    background:linear-gradient(135deg,#EEF2FF,#F5F3FF);
    border:1px solid #C7D2FE; border-radius:14px; padding:14px 18px;
    display:flex; align-items:flex-start; gap:12px;
  }
  .perm-info p { font-size:12.5px; color:#4338CA; line-height:1.6; margin:0; }

  .perm-table-wrap { background:#fff; border:1px solid #ECEDF8; border-radius:16px; overflow:auto; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .perm-table { border-collapse:collapse; min-width:900px; width:100%; }

  /* Header fila de roles */
  .perm-table .ph-corner {
    padding:14px 16px; background:#FAFBFF; border-bottom:2px solid #ECEDF8;
    border-right:1px solid #ECEDF8; position:sticky; left:0; z-index:2;
    font-size:11px; font-weight:800; color:#9CA3AF; text-transform:uppercase; letter-spacing:1px;
  }
  .perm-table .ph-rol {
    padding:12px 10px; background:#FAFBFF; border-bottom:2px solid #ECEDF8;
    border-right:1px solid #F0F1FA; text-align:center; min-width:120px;
  }
  .rol-col-header {
    display:flex; flex-direction:column; align-items:center; gap:4px;
  }
  .rol-col-pill {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:20px; font-size:11px; font-weight:800; white-space:nowrap;
  }

  /* Fila módulo */
  .perm-table .pm-modulo-row td {
    background:#F8F9FF; padding:0;
    border-bottom:1px solid #ECEDF8; border-top:2px solid #ECEDF8;
  }
  .pm-mod-label {
    display:flex; align-items:center; gap:8px; padding:10px 16px;
    position:sticky; left:0; background:#F8F9FF; z-index:1;
    border-right:1px solid #ECEDF8;
  }
  .pm-mod-icon { font-size:16px; }
  .pm-mod-name { font-size:13px; font-weight:800; color:#0F1035; }
  .pm-mod-desc { font-size:11px; color:#9CA3AF; margin-top:1px; }

  /* Fila acción */
  .perm-table .pm-accion-row td { border-bottom:1px solid #F4F5FA; }
  .pm-accion-label {
    padding:9px 16px 9px 36px; display:flex; align-items:center; gap:7px;
    position:sticky; left:0; background:#fff; border-right:1px solid #ECEDF8; z-index:1;
    font-size:12px; font-weight:600; color:#374151;
  }
  .perm-table .pm-accion-row:last-child td { border-bottom:2px solid #ECEDF8; }

  /* Celda toggle */
  .perm-cell { text-align:center; padding:8px 10px; border-right:1px solid #F4F5FA; }
  .perm-toggle {
    width:36px; height:20px; border-radius:20px; border:none; cursor:pointer;
    position:relative; transition:background .2s; display:inline-flex; align-items:center;
    padding:2px; flex-shrink:0;
  }
  .perm-toggle.on  { background:#6366F1; }
  .perm-toggle.off { background:#E2E5F0; }
  .perm-toggle-knob {
    width:16px; height:16px; border-radius:50%; background:#fff;
    box-shadow:0 1px 3px rgba(0,0,0,.2); transition:transform .2s;
  }
  .perm-toggle.on  .perm-toggle-knob { transform:translateX(16px); }
  .perm-toggle.off .perm-toggle-knob { transform:translateX(0); }
  .perm-toggle:disabled { opacity:.5; cursor:not-allowed; }

  /* Saving overlay */
  .perm-saving { font-size:11px; color:#6366F1; display:flex; align-items:center; gap:5px; }

  /* Leyenda acciones */
  .perm-legend {
    display:flex; gap:12px; flex-wrap:wrap; align-items:center;
    background:#fff; border:1px solid #ECEDF8; border-radius:12px; padding:12px 16px;
  }
  .perm-legend-item { display:flex; align-items:center; gap:5px; font-size:11.5px; color:#374151; font-weight:600; }

  /* Modal */
  .modal-overlay { position:fixed; inset:0; background:rgba(15,16,53,.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; backdrop-filter:blur(3px); }
  .modal-box { background:#fff; border-radius:20px; width:100%; max-width:480px; box-shadow:0 24px 64px rgba(0,0,0,.22); animation:modalIn .2s ease; overflow:hidden; }
  .modal-header { padding:22px 24px 18px; border-bottom:1px solid #F0F1FA; display:flex; align-items:center; gap:12px; }
  .modal-header-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .modal-title { font-size:16px; font-weight:800; color:#0F1035; flex:1; }
  .modal-close { width:32px; height:32px; border-radius:8px; border:none; background:#F4F5FA; color:#6B7280; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .modal-close:hover { background:#FEE2E2; color:#EF4444; }
  .modal-body { padding:22px 24px; display:flex; flex-direction:column; gap:16px; }
  .modal-footer { padding:16px 24px; border-top:1px solid #F0F1FA; display:flex; justify-content:flex-end; gap:10px; }
  .mfield label { display:block; font-size:10.5px; font-weight:800; color:#6B7280; text-transform:uppercase; letter-spacing:.9px; margin-bottom:6px; }
  .mfield input, .mfield select { width:100%; padding:10px 14px; border:1.5px solid #E8E9F8; border-radius:10px; font-size:13.5px; color:#0F1035; background:#FAFBFF; outline:none; transition:border-color .15s; font-family:inherit; box-sizing:border-box; }
  .mfield input:focus, .mfield select:focus { border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
  .mfield input:disabled { background:#F4F5FA; color:#9CA3AF; }
  .merror { background:#FFF1F2; border:1px solid #FECDD3; border-radius:10px; padding:10px 14px; font-size:12.5px; color:#BE123C; display:flex; align-items:center; gap:8px; }
  .mbtn-primary { display:inline-flex; align-items:center; gap:7px; background:linear-gradient(135deg,#2E3192,#4338CA); color:#fff; border:none; border-radius:10px; padding:10px 22px; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(46,49,146,.25); transition:all .15s; }
  .mbtn-primary:disabled { opacity:.65; cursor:not-allowed; }
  .mbtn-secondary { display:inline-flex; align-items:center; gap:7px; background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0; border-radius:10px; padding:10px 18px; font-size:13.5px; font-weight:600; cursor:pointer; }
  .btn-nuevo { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#2E3192,#4338CA); color:#fff; border:none; border-radius:11px; padding:11px 22px; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 3px 14px rgba(46,49,146,.28); transition:all .15s; white-space:nowrap; }
  .btn-nuevo:hover { box-shadow:0 5px 20px rgba(46,49,146,.38); transform:translateY(-1px); }
`

/* ─── RolBadge ─── */
function RolBadge({ rol }) {
  const cfg = getRol(rol)
  return <span className="rol-badge" style={{ background:cfg.bg, color:cfg.color }}><Shield size={11}/>{cfg.label}</span>
}

/* ─── KpiCard ─── */
function KpiCard({ label, value, color, bg, emoji }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background:bg }}><span>{emoji}</span></div>
      <div>
        <div className="kpi-val" style={{ color }}>{value}</div>
        <div className="kpi-lbl">{label}</div>
      </div>
    </div>
  )
}

/* ─── Modal crear/editar usuario ─── */
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '')

function ModalUsuario({ usuario, sedes, onClose, onGuardado, pedirConfirmacion }) {
  const esEdit = !!usuario
  const [f, setF] = useState({ nombre:usuario?.nombre||'', email:usuario?.email||'', rol:usuario?.rol||'operador' })
  const [sedesSel, setSedesSel] = useState(usuario?.sede_id ? [usuario.sede_id] : [])
  const [cargandoSedes, setCargandoSedes] = useState(esEdit)
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(usuario?.foto_url ? `${API_ORIGIN}${usuario.foto_url}` : null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const ch = k => e => { setF(x=>({...x,[k]:e.target.value})); setError('') }

  const onFotoChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  useEffect(() => {
    if (!esEdit) return
    api.get(`/usuarios/${usuario.id}/sedes-multiples`)
      .then(r => { const ids = (r.data.data||[]).map(s=>s.id); if (ids.length) setSedesSel(ids) })
      .finally(() => setCargandoSedes(false))
  }, [esEdit, usuario?.id])

  const toggleSede = (id) => {
    setSedesSel(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
    setError('')
  }

  const guardar = async () => {
    setSaving(true)
    try {
      const body = { nombre:f.nombre, email:f.email, rol:f.rol, sedes: sedesSel, sede_id: sedesSel[0] }
      let id = usuario?.id
      let correoEnviado = true
      if (esEdit) {
        await api.put(`/usuarios/${id}`, body)
      } else {
        const res = await api.post('/usuarios', body)
        id = res.data.data.id
        correoEnviado = res.data.correoEnviado
      }

      if (foto) {
        const fd = new FormData()
        fd.append('foto', foto)
        await api.post(`/usuarios/${id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }

      if (esEdit) {
        toast.success('Usuario actualizado')
      } else if (correoEnviado) {
        toast.success(`Usuario creado. Se envió un correo a ${f.email} para que cree su contraseña.`)
      } else {
        toast.success('Usuario creado. El correo de activación no pudo enviarse — contacta al administrador del sistema.')
      }
      onGuardado()
    } catch(err) { setError(err.response?.data?.error||'Error al guardar'); toast.error(err.response?.data?.error||'Error al guardar') }
    finally { setSaving(false) }
  }

  const submit = e => {
    e.preventDefault()
    if (!f.nombre || !f.email) return setError('Nombre y correo son requeridos')
    if (sedesSel.length === 0) return setError('Seleccione al menos una sede')

    const otorgaSuperadmin = f.rol === 'superadmin' && (!esEdit || usuario.rol !== 'superadmin')
    if (otorgaSuperadmin) {
      pedirConfirmacion({
        titulo: 'Otorgar rol Super Admin',
        mensaje: <>Estás a punto de dar acceso total al sistema a <strong>{f.nombre}</strong>. Este rol puede ver y modificar todo, incluyendo otros usuarios. ¿Continuar?</>,
        textoBoton: 'Sí, otorgar acceso',
        accion: async () => { await guardar(); pedirConfirmacion(null) },
      })
      return
    }
    guardar()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-header-icon" style={{ background:'#EEF2FF' }}><UserCog size={20} color="#4338CA"/></div>
          <div className="modal-title">{esEdit?'Editar usuario':'Nuevo usuario'}</div>
          <button className="modal-close" onClick={onClose}><X size={15}/></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="modal-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 16px' }}>
              <div className="mfield" style={{ gridColumn:'span 2', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{
                  width:56, height:56, borderRadius:'50%', overflow:'hidden', flexShrink:0,
                  background:'linear-gradient(135deg,#2E3192,#C9A020)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:800, fontSize:20,
                }}>
                  {fotoPreview
                    ? <img src={fotoPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : (f.nombre?.charAt(0)?.toUpperCase() || '?')}
                </div>
                <div>
                  <label htmlFor="foto-usuario" style={{ cursor:'pointer', fontSize:12.5, fontWeight:700, color:'#4338CA' }}>
                    {fotoPreview ? 'Cambiar foto' : 'Agregar foto'}
                  </label>
                  <input id="foto-usuario" type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={onFotoChange} style={{ display:'none' }}/>
                </div>
              </div>
              <div className="mfield" style={{ gridColumn:'span 2' }}>
                <label>Nombre completo *</label>
                <input value={f.nombre} onChange={ch('nombre')} placeholder="Juan García"/>
              </div>
              <div className="mfield" style={{ gridColumn:'span 2' }}>
                <label>Correo electrónico *</label>
                <input value={f.email} onChange={ch('email')} type="email" placeholder="juan@empresa.com" disabled={esEdit}/>
              </div>
              <div className="mfield">
                <label>Rol *</label>
                <select value={f.rol} onChange={ch('rol')}>
                  {ROLES.map(r=><option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                </select>
              </div>
              <div className="mfield" style={{ gridColumn:'span 2' }}>
                <label>Sedes en las que puede trabajar *</label>
                {cargandoSedes ? (
                  <div style={{ fontSize:12.5, color:'#9CA3AF', padding:'6px 0' }}>Cargando…</div>
                ) : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'4px 0' }}>
                    {sedes.map(s => {
                      const activo = sedesSel.includes(s.id)
                      return (
                        <button type="button" key={s.id} onClick={() => toggleSede(s.id)}
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px',
                            border:`1.5px solid ${activo?'#4338CA':'#E2E5F0'}`, borderRadius:10,
                            background: activo?'#EEF2FF':'#FAFBFF', color: activo?'#4338CA':'#374151',
                            fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                          {activo && <CheckCircle2 size={13}/>} {s.nombre}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>
                  Si selecciona varias, este usuario verá y podrá crear registros en cualquiera de ellas.
                  La primera marcada queda como su sede principal.
                </div>
              </div>
              {!esEdit && (
                <div className="mfield" style={{ gridColumn:'span 2' }}>
                  <div style={{
                    display:'flex', gap:8, alignItems:'flex-start', padding:'10px 12px',
                    background:'#EEF2FF', border:'1px solid #C7D2FE', borderRadius:10,
                    fontSize:12, color:'#3730A3', lineHeight:1.5,
                  }}>
                    <Mail size={15} style={{ flexShrink:0, marginTop:1 }}/>
                    Se enviará un correo a este usuario para que cree su propia contraseña antes de ingresar.
                  </div>
                </div>
              )}
            </div>
            {error && <div className="merror"><XCircle size={15}/>{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="mbtn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="mbtn-primary" disabled={saving}>
              {saving?<><Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> Guardando…</>:<>{esEdit?'Guardar cambios':'Crear usuario'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Modal contraseña ─── */
function ModalPassword({ usuario, onClose, onGuardado }) {
  const [pwd, setPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async e => {
    e.preventDefault()
    if (pwd.length < 8) return setError('Mínimo 8 caracteres')
    setSaving(true)
    try { await api.put(`/usuarios/${usuario.id}/password`,{password:pwd}); toast.success('Contraseña actualizada'); onGuardado() }
    catch(err) { setError(err.response?.data?.error||'Error'); toast.error(err.response?.data?.error||'Error') }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{maxWidth:380}}>
        <div className="modal-header">
          <div className="modal-header-icon" style={{background:'#FEF3C7'}}><Lock size={20} color="#B45309"/></div>
          <div className="modal-title">Cambiar contraseña</div>
          <button className="modal-close" onClick={onClose}><X size={15}/></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="modal-body">
            <div style={{fontSize:13,color:'#6B7280',background:'#F8F9FF',border:'1px solid #ECEDF8',borderRadius:10,padding:'10px 14px'}}>
              Usuario: <strong style={{color:'#0F1035'}}>{usuario.nombre}</strong>
            </div>
            <div className="mfield">
              <label>Nueva contraseña *</label>
              <input type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setError('')}} placeholder="Mínimo 8 caracteres" autoFocus/>
            </div>
            {error && <div className="merror"><XCircle size={15}/>{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="mbtn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="mbtn-primary" disabled={saving}>
              {saving?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Modal de confirmación (acciones sensibles) ─── */
function ModalConfirmar({ titulo, mensaje, textoBoton='Confirmar', peligro=true, onCancelar, onConfirmar }) {
  const [busy, setBusy] = useState(false)
  const confirmar = async () => {
    setBusy(true)
    try { await onConfirmar() } finally { setBusy(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onCancelar()}>
      <div className="modal-box" style={{maxWidth:400}}>
        <div className="modal-header">
          <div className="modal-header-icon" style={{background:peligro?'#FEF2F2':'#EEF2FF'}}>
            <AlertTriangle size={20} color={peligro?'#DC2626':'#4338CA'}/>
          </div>
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={onCancelar}><X size={15}/></button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize:13.5, color:'#4B5065', lineHeight:1.6 }}>{mensaje}</div>
        </div>
        <div className="modal-footer">
          <button type="button" className="mbtn-secondary" onClick={onCancelar} disabled={busy}>Cancelar</button>
          <button type="button" className="mbtn-primary" onClick={confirmar} disabled={busy}
            style={peligro?{background:'#DC2626'}:undefined}>
            {busy?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:textoBoton}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TAB 1 — USUARIOS
══════════════════════════════════════════════ */
function TabUsuarios({ esAdmin }) {
  const usuarioActual = useAuthStore(s => s.usuario)
  const [usuarios, setUsuarios] = useState([])
  const [sedes,    setSedes]    = useState([])
  const [meta,     setMeta]     = useState({ total:0 })
  const [loading,  setLoading]  = useState(true)
  const [buscar,   setBuscar]   = useState('')
  const [filtroRol,setFiltroRol]= useState('')
  const [modal,    setModal]    = useState(null)
  const [sel,      setSel]      = useState(null)
  const [confirmar, setConfirmar] = useState(null) // { titulo, mensaje, accion }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (buscar)    params.set('buscar', buscar)
      if (filtroRol) params.set('rol', filtroRol)
      const [uR,sR] = await Promise.all([
        api.get(`/usuarios?${params}`),
        api.get('/usuarios/sedes'),
      ])
      setUsuarios(uR.data.data)
      setMeta(uR.data.meta)
      setSedes(sR.data.data)
    } catch{}
    finally { setLoading(false) }
  }, [buscar, filtroRol])

  useEffect(()=>{ cargar() },[cargar])

  const cambiarActivo = async (u, nuevoActivo) => {
    try {
      await api.put(`/usuarios/${u.id}`,{activo:nuevoActivo})
      toast.success(nuevoActivo?'Usuario activado':'Usuario desactivado')
      cargar()
    } catch(err) {
      toast.error(err.response?.data?.error || 'Error al cambiar el estado del usuario')
    }
  }

  const toggleActivo = u => {
    if (!u.activo) return cambiarActivo(u, true) // activar no es destructivo, no requiere confirmación
    setConfirmar({
      titulo: 'Desactivar usuario',
      mensaje: <>¿Seguro que quieres desactivar a <strong>{u.nombre}</strong>? No podrá iniciar sesión hasta que lo actives de nuevo.</>,
      textoBoton: 'Desactivar',
      accion: async () => { await cambiarActivo(u, false); setConfirmar(null) },
    })
  }
  const guardado = () => { setModal(null); setSel(null); cargar() }
  const activos   = usuarios.filter(u=>u.activo).length
  const inactivos = usuarios.filter(u=>!u.activo).length
  const roles     = [...new Set(usuarios.map(u=>u.rol))].length
  const fmtFecha  = d => d ? new Date(d).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) : 'Nunca'

  return (
    <>
      <div className="kpi-strip">
        <KpiCard label="Total Usuarios"  value={meta.total||0} color="#4338CA" bg="#EEF2FF" emoji="👥"/>
        <KpiCard label="Activos"         value={activos}       color="#047857" bg="#ECFDF5" emoji="✅"/>
        <KpiCard label="Inactivos"       value={inactivos}     color="#DC2626" bg="#FEF2F2" emoji="🚫"/>
        <KpiCard label="Roles Distintos" value={roles}         color="#0369A1" bg="#E0F2FE" emoji="🛡️"/>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15}/>
          <input className="search-inp" value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por nombre o correo…"/>
        </div>
        <select className="filt-select" value={filtroRol} onChange={e=>setFiltroRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button className="tool-btn" onClick={cargar} title="Actualizar">
          <RefreshCw size={15} style={loading?{animation:'spin 1s linear infinite'}:{}}/>
        </button>
        {esAdmin && (
          <button className="btn-nuevo" onClick={()=>setModal('crear')}><UserPlus size={16}/> Nuevo Usuario</button>
        )}
      </div>

      <div className="tbl-card">
        <div className="tbl-card-head">
          <span className="tbl-card-title">Listado de Usuarios</span>
          <span className="tbl-card-count">{usuarios.length} registros</span>
        </div>
        {loading ? (
          <div className="tbl-loading"><Loader2 size={26} style={{animation:'spin 1s linear infinite'}}/></div>
        ) : usuarios.length === 0 ? (
          <div className="tbl-empty"><UserCog size={48}/><p style={{fontWeight:600}}>No se encontraron usuarios</p></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Sede</th><th>Último Acceso</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const cfg = getRol(u.rol)
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="tbl-row-inner" style={{gap:12}}>
                        <div className="uavatar" style={{background:cfg.bg,color:cfg.color}}>{u.nombre.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="uname">{u.nombre}</div>
                          <div className="uemail"><Mail size={10}/>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><div className="tbl-row-inner"><RolBadge rol={u.rol}/></div></td>
                    <td>
                      <div className="tbl-row-inner">
                        {u.sede_nombre
                          ? <span style={{display:'flex',alignItems:'center',gap:5,fontSize:13,color:'#374151',fontWeight:600}}><MapPin size={12} color="#6366F1"/>{u.sede_nombre}</span>
                          : <span style={{fontSize:12,color:'#D1D5DB'}}>—</span>}
                      </div>
                    </td>
                    <td><div className="tbl-row-inner"><span className="last-access"><Clock size={12}/>{fmtFecha(u.ultimo_acceso)}</span></div></td>
                    <td>
                      <div className="tbl-row-inner">
                        <span className={`estado-badge ${u.activo?'badge-active':'badge-inactive'}`}>
                          {u.activo?<CheckCircle2 size={11}/>:<XCircle size={11}/>}{u.activo?'Activo':'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="tbl-row-inner">
                        <div className="act-btns">
                          {esAdmin && (<>
                            <button className="act-btn" title="Editar" style={{background:'#EEF2FF',color:'#4338CA',border:'1.5px solid #C7D2FE'}} onClick={()=>{setSel(u);setModal('editar')}}><Edit2 size={13}/></button>
                            <button className="act-btn" title="Cambiar contraseña" style={{background:'#FEF3C7',color:'#B45309',border:'1.5px solid #FDE68A'}} onClick={()=>{setSel(u);setModal('password')}}><Key size={13}/></button>
                            {u.id !== usuarioActual?.id && (
                              <button className="act-btn" title={u.activo?'Desactivar':'Activar'}
                                style={u.activo?{background:'#FEF2F2',color:'#DC2626',border:'1.5px solid #FECACA'}:{background:'#ECFDF5',color:'#047857',border:'1.5px solid #A7F3D0'}}
                                onClick={()=>toggleActivo(u)}>
                                {u.activo?<ToggleRight size={14}/>:<ToggleLeft size={14}/>}
                              </button>
                            )}
                          </>)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal==='crear' && <ModalUsuario sedes={sedes} onClose={()=>setModal(null)} onGuardado={guardado} pedirConfirmacion={setConfirmar}/>}
      {modal==='editar' && sel && <ModalUsuario usuario={sel} sedes={sedes} onClose={()=>{setModal(null);setSel(null)}} onGuardado={guardado} pedirConfirmacion={setConfirmar}/>}
      {modal==='password' && sel && <ModalPassword usuario={sel} onClose={()=>{setModal(null);setSel(null)}} onGuardado={guardado}/>}

      {confirmar && (
        <ModalConfirmar
          titulo={confirmar.titulo}
          mensaje={confirmar.mensaje}
          textoBoton={confirmar.textoBoton}
          peligro={confirmar.peligro ?? true}
          onCancelar={()=>setConfirmar(null)}
          onConfirmar={confirmar.accion}
        />
      )}
    </>
  )
}

/* ══════════════════════════════════════════════
   TAB 2 — ROLES Y PERMISOS (Matriz)
══════════════════════════════════════════════ */
function TabPermisos({ esSuperAdmin }) {
  const [matriz,   setMatriz]  = useState({})  // { 'superadmin.dashboard.ver': true, ... }
  const [loading,  setLoading] = useState(true)
  const [saving,   setSaving]  = useState(null) // key siendo guardado
  const [rolSel,   setRolSel]  = useState('todos')
  const [permToast, setPermToast] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/permisos')
      const m = {}
      r.data.data.forEach(p => { m[`${p.rol}.${p.modulo}.${p.accion}`] = p.permitido })
      setMatriz(m)
    } catch{}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const get = (rol, modulo, accion) => matriz[`${rol}.${modulo}.${accion}`] ?? false

  const toggle = async (rol, modulo, accion) => {
    if (!esSuperAdmin) return
    const key     = `${rol}.${modulo}.${accion}`
    const actual  = get(rol, modulo, accion)
    const nuevo   = !actual
    setSaving(key)
    setMatriz(m => ({ ...m, [key]: nuevo }))
    try {
      await api.put('/permisos', { rol, modulo, accion, permitido: nuevo })
      setPermToast(`✓ ${rol} › ${modulo} › ${accion} → ${nuevo?'Permitido':'Denegado'}`)
      setTimeout(() => setPermToast(''), 2500)
      toast.success('Permiso actualizado')
    } catch {
      setMatriz(m => ({ ...m, [key]: actual }))
      toast.error('Error al actualizar el permiso')
    } finally { setSaving(null) }
  }

  const rolesVisibles = rolSel === 'todos' ? ROLES : ROLES.filter(r => r.value === rolSel)

  if (loading) return <div className="tbl-loading"><Loader2 size={26} style={{animation:'spin 1s linear infinite'}}/></div>

  return (
    <div className="perm-wrap">
      {/* Info banner */}
      <div className="perm-info">
        <ShieldCheck size={22} color="#4338CA" style={{flexShrink:0,marginTop:2}}/>
        <div>
          <p><strong>Matriz de Roles y Permisos</strong> — Define qué puede hacer cada rol en cada módulo del sistema.<br/>
          {esSuperAdmin
            ? 'Como <strong>Superadmin</strong>, puedes activar o desactivar cualquier permiso haciendo clic en el interruptor.'
            : 'Solo el <strong>Superadmin</strong> puede modificar los permisos. Aquí puedes consultar la configuración actual.'}
          </p>
        </div>
      </div>

      {/* Filtro por rol */}
      <div className="perm-legend">
        <span style={{fontSize:12,fontWeight:800,color:'#6B7280',marginRight:4}}>VER ROL:</span>
        <button
          onClick={()=>setRolSel('todos')}
          style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid',fontSize:11.5,fontWeight:700,cursor:'pointer',
            background:rolSel==='todos'?'#4338CA':'#F4F5FA',color:rolSel==='todos'?'#fff':'#374151',
            borderColor:rolSel==='todos'?'#4338CA':'#E2E5F0'}}
        >Todos</button>
        {ROLES.map(r => (
          <button key={r.value} onClick={()=>setRolSel(r.value)}
            style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid',fontSize:11.5,fontWeight:700,cursor:'pointer',
              background:rolSel===r.value?r.color:r.bg,color:rolSel===r.value?'#fff':r.color,
              borderColor:r.color+'60'}}
          >{r.icon} {r.label}</button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:16,flexWrap:'wrap'}}>
          {ACCIONES.map(a => (
            <span key={a.key} className="perm-legend-item" style={{color:a.color}}>
              {a.icon} {a.label}
            </span>
          ))}
        </div>
      </div>

      {/* Toast */}
      {permToast && (
        <div style={{background:'#0F1035',color:'#fff',borderRadius:10,padding:'10px 18px',
          fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8,
          position:'fixed',bottom:72,left:'50%',transform:'translateX(-50%)',
          boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:200,animation:'fadeIn .2s ease'}}>
          <CheckCircle2 size={16} color="#34D399"/> {permToast}
        </div>
      )}

      {/* Tabla matriz */}
      <div className="perm-table-wrap">
        <table className="perm-table">
          <thead>
            <tr>
              <td className="ph-corner">Módulo / Acción</td>
              {rolesVisibles.map(r => (
                <td key={r.value} className="ph-rol">
                  <div className="rol-col-header">
                    <span style={{fontSize:20}}>{r.icon}</span>
                    <span className="rol-col-pill" style={{background:r.bg,color:r.color}}>{r.label}</span>
                  </div>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map(mod => (
              <>
                {/* Fila título módulo */}
                <tr key={`mod-${mod.key}`} className="pm-modulo-row">
                  <td colSpan={rolesVisibles.length + 1}>
                    <div className="pm-mod-label">
                      <span className="pm-mod-icon">{mod.icon}</span>
                      <div>
                        <div className="pm-mod-name" style={{color:mod.color}}>{mod.label}</div>
                        <div className="pm-mod-desc">{mod.desc}</div>
                      </div>
                    </div>
                  </td>
                </tr>
                {/* Filas de acciones */}
                {ACCIONES.map(acc => (
                  <tr key={`${mod.key}-${acc.key}`} className="pm-accion-row">
                    <td>
                      <div className="pm-accion-label" style={{color:acc.color}}>
                        {acc.icon} {acc.label}
                      </div>
                    </td>
                    {rolesVisibles.map(rol => {
                      const key       = `${rol.value}.${mod.key}.${acc.key}`
                      const on        = get(rol.value, mod.key, acc.key)
                      const isSaving  = saving === key
                      return (
                        <td key={rol.value} className="perm-cell">
                          <button
                            className={`perm-toggle ${on?'on':'off'}`}
                            onClick={() => toggle(rol.value, mod.key, acc.key)}
                            disabled={!esSuperAdmin || isSaving}
                            title={`${rol.label} › ${mod.label} › ${acc.label}: ${on?'Permitido':'Denegado'}`}
                          >
                            {isSaving
                              ? <Loader2 size={12} style={{animation:'spin .6s linear infinite',color:on?'#fff':'#9CA3AF',position:'absolute'}}/>
                              : <div className="perm-toggle-knob"/>
                            }
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {!esSuperAdmin && (
        <div style={{display:'flex',alignItems:'center',gap:10,background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:12,padding:'12px 16px'}}>
          <AlertTriangle size={18} color="#D97706"/>
          <span style={{fontSize:13,color:'#92400E',fontWeight:600}}>Solo el <strong>Superadmin</strong> puede modificar los permisos del sistema.</span>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════ */
export default function UsuariosPage() {
  const usuarioActual  = useAuthStore(s => s.usuario)
  const esAdmin        = ['superadmin','administrador'].includes(usuarioActual?.rol)
  const esSuperAdmin   = usuarioActual?.rol === 'superadmin'
  const [tab, setTab]  = useState('usuarios')

  return (
    <>
      <style>{CSS}</style>
      <div className="upage">

        {/* Header con tabs */}
        <div className="upage-head">
          <div className="upage-head-top">
            <div>
              <div className="upage-category">GESTIÓN DEL SISTEMA · SEGURIDAD</div>
              <div className="upage-title">Usuarios y Permisos</div>
              <div className="upage-sub">Control de acceso, roles y permisos del sistema</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="utabs">
            <div className={`utab${tab==='usuarios'?' active':''}`} onClick={()=>setTab('usuarios')}>
              <UserCog size={15}/>
              Usuarios
            </div>
            <div className={`utab${tab==='permisos'?' active':''}`} onClick={()=>setTab('permisos')}>
              <ShieldCheck size={15}/>
              Roles y Permisos
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="upage-body">
          {tab === 'usuarios' && <TabUsuarios esAdmin={esAdmin}/>}
          {tab === 'permisos' && <TabPermisos esAdmin={esAdmin} esSuperAdmin={esSuperAdmin}/>}
        </div>

      </div>
    </>
  )
}
