/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Layout — Header                                      ║
 * ║  Archivo         : Header.jsx                                           ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, ChevronDown, MapPin } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store.js'
import api from '../../services/api.js'

const RUTAS = {
  '/dashboard':    { modulo:'Dashboard',            titulo:'Panel Principal',          sub:'Resumen de operaciones de la funeraria',        color:'#6366F1' },
  '/terceros':     { modulo:'Terceros',              titulo:'Terceros',                  sub:'Clientes, titulares, beneficiarios y difuntos', color:'#10B981' },
  '/contratos':    { modulo:'Contratos',            titulo:'Contratos de Servicio',     sub:'Previsión funeraria y contratos activos',        color:'#F59E0B' },
  '/servicios':    { modulo:'Servicios',            titulo:'Servicios Funerarios',      sub:'Registro y seguimiento de servicios',            color:'#8B5CF6' },
  '/polizas':         { modulo:'Pólizas',        titulo:'Pólizas de Previsión',      sub:'Afiliaciones, beneficiarios y cobro de cuotas',  color:'#059669' },
  '/polizas/planes':  { modulo:'Pólizas',        titulo:'Planes de Póliza',           sub:'Catálogo de planes — coberturas y tarifas',        color:'#059669' },
  '/pagos':        { modulo:'Cartera',              titulo:'Cartera y Pagos',           sub:'Recaudo, cuotas y gestión de mora',             color:'#EF4444' },
  '/reportes':     { modulo:'Reportes',             titulo:'Reportes y Analytics',      sub:'Indicadores de desempeño y estadísticas',        color:'#0EA5E9' },
  '/usuarios':     { modulo:'Usuarios',             titulo:'Usuarios y Permisos',       sub:'Gestión de roles y control de acceso',           color:'#64748B' },
  '/configuracion':{ modulo:'Configuración',        titulo:'Configuración del Sistema', sub:'Parámetros generales de la funeraria',           color:'#C9A020' },
  '/territorio':   { modulo:'Territorio',           titulo:'División Político-Administrativa', sub:'Departamentos, municipios, barrios y veredas', color:'#059669' },
  '/inventario':   { modulo:'Inventario',           titulo:'Inventario',                        sub:'Productos, bodegas, stock y movimientos',        color:'#0EA5E9' },
  '/compras':      { modulo:'Compras',              titulo:'Compras y Proveedores',             sub:'Órdenes de compra, recepción y proveedores',     color:'#F59E0B' },
  '/recaudo':      { modulo:'Recaudo',             titulo:'Recaudo por Zonas',                 sub:'Gestión operativa de cobro en ruta — Funeraria San José de Abrego', color:'#6366F1' },
  '/asesores':     { modulo:'Asesores',             titulo:'Asesores Comerciales',              sub:'Comisiones y desempeño de ventas',               color:'#EC4899' },
  '/convenios':    { modulo:'Convenios',            titulo:'Convenios',                         sub:'EPS, aseguradoras, alcaldías y empresas',        color:'#0D9488' },
  '/pos':          { modulo:'Punto de Venta',        titulo:'Punto de Venta',                    sub:'Venta de mostrador y caja menor',                color:'#16A34A' },
  '/memoriales':   { modulo:'Memoriales',            titulo:'Memoriales',                        sub:'Novenarios, aniversarios y misas del sitio web', color:'#4C1D95' },
  '/solicitudes':  { modulo:'Solicitudes',           titulo:'Solicitudes',                       sub:'Prospectos que llegan desde la página web',     color:'#DB2777' },
}

const ROL_LABELS = {
  superadmin:'Super Admin', administrador:'Administrador', contador:'Contador',
  operador:'Operador', asesor_comercial:'Asesor Comercial', consultor:'Consultor',
}

function useReloj() {
  const [hora, setHora] = useState('')
  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      setHora(d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }))
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])
  return hora
}

const CSS = `
  .hdr {
    height: 56px;
    background: #fff;
    border-bottom: 1px solid #ECEDF8;
    display: flex;
    align-items: center;
    padding: 0 20px 0 16px;
    gap: 12px;
    flex-shrink: 0;
  }

  /* Breadcrumb módulo */
  .hdr-mod {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .hdr-mod-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 13px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    border: 1.5px solid;
  }
  .hdr-mod-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Separador vertical */
  .hdr-vsep { width:1px; height:28px; background:#F0F1FA; flex-shrink:0; }

  /* Títulos */
  .hdr-titles { flex:1; min-width:0; }
  .hdr-titulo {
    font-size: 18px;
    font-weight: 800;
    color: #0F1035;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hdr-sub {
    font-size: 11px;
    color: #9CA3AF;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Right side */
  .hdr-right { display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:auto; }

  /* Reloj */
  .hdr-clock {
    font-size: 12.5px;
    font-weight: 700;
    color: #374151;
    font-variant-numeric: tabular-nums;
    background: #F4F5FA;
    border: 1px solid #ECEDF8;
    border-radius: 8px;
    padding: 5px 11px;
    letter-spacing: .3px;
    white-space: nowrap;
  }

  /* Status */
  .hdr-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #059669;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    border-radius: 20px;
    padding: 4px 12px;
  }
  .hdr-status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 0 2px rgba(16,185,129,.25);
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 2px rgba(16,185,129,.25)} 50%{box-shadow:0 0 0 4px rgba(16,185,129,.1)} }

  /* Notif */
  .hdr-notif-btn {
    position: relative;
    width: 36px; height: 36px;
    border: 1px solid #ECEDF8;
    border-radius: 10px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6B7280;
    cursor: pointer;
    transition: all .15s;
  }
  .hdr-notif-btn:hover { background:#F4F5FA; color:#2E3192; }
  .hdr-notif-dot {
    position: absolute;
    top: 7px; right: 8px;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #EF4444;
    border: 1.5px solid #fff;
  }

  /* User */
  .hdr-user {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 4px 10px 4px 4px;
    border: 1px solid #ECEDF8;
    border-radius: 12px;
    cursor: pointer;
    transition: all .15s;
    position: relative;
  }
  .hdr-user:hover { background:#F4F5FA; }
  .hdr-avatar {
    width: 32px; height: 32px;
    border-radius: 9px;
    background: linear-gradient(135deg,#2E3192,#C9A020);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
    flex-shrink: 0;
  }
  .hdr-user-info {}
  .hdr-user-name { font-size:12.5px; font-weight:700; color:#0F1035; line-height:1.1; }
  .hdr-user-rol  { font-size:10px; color:#9CA3AF; margin-top:1px; }

  /* Dropdown */
  .hdr-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: #fff;
    border: 1px solid #ECEDF8;
    border-radius: 14px;
    box-shadow: 0 8px 28px rgba(0,0,0,.1);
    min-width: 200px;
    z-index: 200;
    overflow: hidden;
    animation: dropIn .18s ease;
  }
  @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  .hdr-dd-header {
    padding: 14px 16px 12px;
    border-bottom: 1px solid #F0F1FA;
  }
  .hdr-dd-name { font-size:14px; font-weight:800; color:#0F1035; }
  .hdr-dd-rol  { font-size:11px; color:#9CA3AF; margin-top:2px; }
  .hdr-dd-sede { display:flex; align-items:center; gap:5px; font-size:11px; color:#6366F1; margin-top:5px; font-weight:600; }
  .hdr-dd-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    font-size: 13px;
    color: #374151;
    cursor: pointer;
    transition: background .12s;
  }
  .hdr-dd-item:hover { background:#F4F5FA; }
  .hdr-dd-item.danger { color:#EF4444; }
  .hdr-dd-item.danger:hover { background:#FEF2F2; }
  .hdr-dd-sep { height:1px; background:#F0F1FA; margin:4px 0; }
`

export default function Header() {
  const { usuario, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const hora     = useReloj()
  const [open, setOpen] = useState(false)
  const [nuevasSolicitudes, setNuevasSolicitudes] = useState(0)

  const ruta = RUTAS[location.pathname] || { modulo:'ERP', titulo:'Orquídea ERP', sub:'Sistema de gestión funeraria', color:'#2E3192' }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  // Campanita de notificaciones — cuenta solicitudes nuevas que llegan de la
  // landing page, se refresca cada 30s para que se sienta "en vivo".
  useEffect(() => {
    let activo = true
    const cargar = () => {
      api.get('/leads/nuevas/conteo')
        .then(res => { if (activo) setNuevasSolicitudes(res.data?.total || 0) })
        .catch(() => {})
    }
    cargar()
    const id = setInterval(cargar, 30000)
    return () => { activo = false; clearInterval(id) }
  }, [])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const fn = () => setOpen(false)
    setTimeout(() => document.addEventListener('click', fn), 0)
    return () => document.removeEventListener('click', fn)
  }, [open])

  return (
    <>
      <style>{CSS}</style>
      <header className="hdr">

        {/* Módulo activo pill */}
        <div className="hdr-mod">
          <div className="hdr-mod-pill"
            style={{ color: ruta.color, borderColor: ruta.color+'30', background: ruta.color+'10' }}>
            <div className="hdr-mod-dot" style={{ background: ruta.color }} />
            {ruta.modulo}
          </div>
        </div>

        <div className="hdr-vsep" />

        {/* Títulos */}
        <div className="hdr-titles">
          <div className="hdr-titulo">{ruta.titulo}</div>
          <div className="hdr-sub">{ruta.sub}</div>
        </div>

        {/* Acciones derecha */}
        <div className="hdr-right">

          {/* Reloj */}
          <div className="hdr-clock">{hora}</div>

          {/* Estado del sistema */}
          <div className="hdr-status">
            <div className="hdr-status-dot" />
            En línea
          </div>

          {/* Notificaciones — solicitudes nuevas desde la landing */}
          <button
            className="hdr-notif-btn"
            onClick={() => navigate('/solicitudes')}
            title={nuevasSolicitudes > 0 ? `${nuevasSolicitudes} solicitud(es) nueva(s)` : 'Sin solicitudes nuevas'}
          >
            <Bell size={16} />
            {nuevasSolicitudes > 0 && (
              <span className="hdr-notif-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, fontSize: 9, fontWeight: 800, color: '#fff' }}>
                {nuevasSolicitudes > 9 ? '9+' : nuevasSolicitudes}
              </span>
            )}
          </button>

          {/* Usuario dropdown */}
          <div className="hdr-user" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
            <div className="hdr-avatar">{usuario?.nombre?.charAt(0)?.toUpperCase()}</div>
            <div className="hdr-user-info">
              <div className="hdr-user-name">{usuario?.nombre}</div>
              <div className="hdr-user-rol">{ROL_LABELS[usuario?.rol] || usuario?.rol}</div>
            </div>
            <ChevronDown size={13} color="#9CA3AF" style={{ transition:'.15s', transform: open?'rotate(180deg)':'none' }} />

            {open && (
              <div className="hdr-dropdown" onClick={e => e.stopPropagation()}>
                <div className="hdr-dd-header">
                  <div className="hdr-dd-name">{usuario?.nombre}</div>
                  <div className="hdr-dd-rol">{ROL_LABELS[usuario?.rol] || usuario?.rol}</div>
                  {usuario?.sede_nombre && (
                    <div className="hdr-dd-sede"><MapPin size={11}/>{usuario.sede_nombre}</div>
                  )}
                </div>
                <div className="hdr-dd-sep" />
                <div className="hdr-dd-item danger" onClick={handleLogout}>
                  <LogOut size={15}/> Cerrar sesión
                </div>
              </div>
            )}
          </div>

        </div>
      </header>
    </>
  )
}
