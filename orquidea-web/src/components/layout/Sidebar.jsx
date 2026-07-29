/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Layout — Sidebar colapsable                          ║
 * ║  Archivo         : Sidebar.jsx                                          ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, FileText,
  CreditCard, BarChart2, Settings, UserCog,
  ChevronLeft, ChevronRight, MapPin, ShieldCheck, Warehouse, ShoppingCart, Wallet,
  Percent, Handshake, Store, Flower2, UserPlus,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store.js'
import api from '../../services/api.js'

const ADMIN  = ['superadmin','administrador']
const OPS    = ['superadmin','administrador','operador']
const TODOS  = ['superadmin','administrador','operador','asesor_comercial','contador','consultor']

const GRUPOS = [
  {
    label: 'PRINCIPAL',
    color: '#2E3192',
    items: [
      { to: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard, grad: 'linear-gradient(135deg,#6366F1,#4338CA)', roles: TODOS },
    ],
  },
  {
    label: 'OPERACIONES',
    color: '#059669',
    items: [
      { to: '/terceros',   label: 'Terceros',   Icon: Users,        grad: 'linear-gradient(135deg,#10B981,#059669)', roles: OPS },
      { to: '/contratos',  label: 'Contratos',  Icon: FileText,     grad: 'linear-gradient(135deg,#F59E0B,#D97706)', roles: OPS },
      { to: '/servicios',  label: 'Servicios',  Icon: Package,      grad: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', roles: OPS },
      { to: '/polizas',    label: 'Pólizas',    Icon: ShieldCheck,  grad: 'linear-gradient(135deg,#059669,#047857)', roles: [...OPS,'asesor_comercial'] },
      { to: '/pagos',      label: 'Cartera',    Icon: CreditCard,   grad: 'linear-gradient(135deg,#EF4444,#DC2626)', roles: [...OPS,'contador'] },
      { to: '/inventario', label: 'Inventario', Icon: Warehouse,    grad: 'linear-gradient(135deg,#0EA5E9,#0369A1)', roles: OPS },
      { to: '/compras',    label: 'Compras',    Icon: ShoppingCart, grad: 'linear-gradient(135deg,#F59E0B,#D97706)', roles: OPS },
      { to: '/convenios',  label: 'Convenios',  Icon: Handshake,    grad: 'linear-gradient(135deg,#0891B2,#0E7490)', roles: ADMIN },
      { to: '/pos',        label: 'Punto de Venta', Icon: Store,    grad: 'linear-gradient(135deg,#16A34A,#15803D)', roles: OPS },
      { to: '/memoriales', label: 'Memoriales', Icon: Flower2,      grad: 'linear-gradient(135deg,#312E81,#4C1D95)', roles: OPS },
    ],
  },
  {
    label: 'GESTIÓN',
    color: '#C9A020',
    items: [
      { to: '/solicitudes',   label: 'Solicitudes',   Icon: UserPlus,  grad: 'linear-gradient(135deg,#DB2777,#BE185D)',  roles: [...OPS,'asesor_comercial'] },
      { to: '/recaudo',       label: 'Recaudo',       Icon: Wallet,    grad: 'linear-gradient(135deg,#6366F1,#4338CA)',  roles: [...OPS,'asesor_comercial'] },
      { to: '/asesores',      label: 'Asesores',      Icon: Percent,   grad: 'linear-gradient(135deg,#EC4899,#BE185D)',  roles: [...ADMIN,'asesor_comercial','contador'] },
      { to: '/reportes',      label: 'Reportes',      Icon: BarChart2, grad: 'linear-gradient(135deg,#0EA5E9,#0284C7)', roles: [...ADMIN,'contador'] },
      { to: '/usuarios',      label: 'Usuarios',      Icon: UserCog,   grad: 'linear-gradient(135deg,#64748B,#475569)', roles: ADMIN },
      { to: '/territorio',    label: 'Territorio',    Icon: MapPin,    grad: 'linear-gradient(135deg,#059669,#047857)',  roles: ADMIN },
      { to: '/configuracion', label: 'Configuración', Icon: Settings,  grad: 'linear-gradient(135deg,#C9A020,#A37A10)', roles: ADMIN },
    ],
  },
]

const ROL_LABELS = {
  superadmin:       'Super Admin',
  administrador:    'Administrador',
  contador:         'Contador',
  operador:         'Operador',
  asesor_comercial: 'Asesor Comercial',
  consultor:        'Consultor',
}

const CSS = `
  .sb { display:flex; flex-direction:column; height:100%; background:#fff;
        border-right:1px solid #ECEDF8; transition:width .22s cubic-bezier(.4,0,.2,1);
        overflow:hidden; flex-shrink:0; position:relative; }
  .sb.open  { width:232px; }
  .sb.closed { width:68px; }

  /* Header logo */
  .sb-head { display:flex; align-items:center; gap:10px; padding:16px 14px 12px;
             border-bottom:1px solid #F0F1FA; flex-shrink:0; min-height:64px; }
  .sb-logo-img { width:36px; height:36px; border-radius:10px; object-fit:cover;
                 border:2px solid #C9A020; flex-shrink:0;
                 box-shadow:0 2px 8px rgba(201,160,32,.25); }
  .sb-logo-texts { overflow:hidden; white-space:nowrap; }
  .sb-logo-name { font-size:13px; font-weight:900; color:#0F1035; letter-spacing:.6px; line-height:1.1; }
  .sb-logo-sub  { font-size:9px; color:#9CA3AF; letter-spacing:.3px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px; }

  /* Toggle btn */
  .sb-toggle { width:28px; height:28px; border-radius:8px; background:#F4F5FA;
               border:1.5px solid #E2E5F0; display:flex; align-items:center; justify-content:center;
               cursor:pointer; color:#6B7280; flex-shrink:0;
               transition:all .15s; }
  .sb-toggle:hover { background:#2E3192; color:#fff; border-color:#2E3192; }

  /* Nav */
  .sb-nav { flex:1; overflow-y:auto; overflow-x:hidden; padding:8px 0; }
  .sb-nav::-webkit-scrollbar { width:3px; }
  .sb-nav::-webkit-scrollbar-thumb { background:#E2E5F0; border-radius:4px; }

  /* Grupo */
  .sb-group { margin-bottom:4px; }
  .sb-group-label { font-size:9px; font-weight:800; letter-spacing:1.6px;
                    padding:10px 14px 4px; white-space:nowrap; overflow:hidden; }
  .sb-group-divider { height:1px; background:#F0F1FA; margin:6px 14px 4px; }

  /* Link */
  .sb-link { display:flex; align-items:center; gap:11px; padding:6px 10px;
             margin:1px 8px; border-radius:12px; text-decoration:none;
             color:#6B7280; font-size:13.5px; font-weight:500;
             transition:all .15s; cursor:pointer; white-space:nowrap; }
  .sb-link:hover { background:#F4F5FA; color:#1A1A2E; }
  .sb-link.active { background:#F0F1FA; color:#2E3192; font-weight:700;
                    box-shadow:0 0 0 1.5px #DDE1F0; }

  /* Icon box */
  .sb-icon { width:34px; height:34px; border-radius:10px; display:flex;
             align-items:center; justify-content:center; flex-shrink:0;
             background:#F4F5FA; transition:all .15s; }
  .sb-link:hover .sb-icon { filter:brightness(.97); }
  .sb-link.active .sb-icon { box-shadow:0 3px 10px rgba(0,0,0,.15); }

  .sb-label { overflow:hidden; text-overflow:ellipsis; }

  /* Footer */
  .sb-footer { border-top:1px solid #F0F1FA; padding:10px 10px; display:flex;
               align-items:center; gap:10px; flex-shrink:0; }
  .sb-avatar { width:36px; height:36px; border-radius:10px; flex-shrink:0;
               background:linear-gradient(135deg,#2E3192,#C9A020);
               color:#fff; display:flex; align-items:center; justify-content:center;
               font-weight:800; font-size:14px; box-shadow:0 2px 6px rgba(46,49,146,.2); }
  .sb-footer-info { flex:1; overflow:hidden; }
  .sb-fname { font-size:12.5px; font-weight:700; color:#0F1035; white-space:nowrap;
              overflow:hidden; text-overflow:ellipsis; }
  .sb-frol  { font-size:10px; color:#9CA3AF; margin-top:1px; }
  .sb-logout { background:#F4F5FA; border:1px solid #ECEDF8; border-radius:8px;
               width:30px; height:30px; display:flex; align-items:center; justify-content:center;
               color:#9CA3AF; cursor:pointer; transition:all .15s; flex-shrink:0; }
  .sb-logout:hover { background:#FEE2E2; border-color:#FECACA; color:#EF4444; }

  /* Version */
  /* Collapsed: ocultar textos */
  .sb.closed .sb-label,
  .sb.closed .sb-group-label,
  .sb.closed .sb-logo-texts,
  .sb.closed .sb-footer-info,
  .sb.closed .sb-logout { display:none; }
  .sb.closed .sb-link { margin:1px 6px; padding:6px; justify-content:center; }
  .sb.closed .sb-head  { justify-content:center; padding:10px 8px; gap:0; flex-wrap:wrap; row-gap:6px; }
  .sb.closed .sb-footer { justify-content:center; padding:10px 0; }
  .sb.closed .sb-group-divider { margin:6px 8px 4px; }
  .sb.closed .sb-toggle { margin:0 auto; }
`

// Mapa ruta → clave de módulo en permisos_roles
const RUTA_MODULO = {
  '/dashboard':    'dashboard',
  '/terceros':     'terceros',
  '/contratos':    'contratos',
  '/servicios':    'servicios',
  '/polizas':      'polizas',
  '/pagos':        'cartera',
  '/inventario':   'inventario',
  '/compras':      'compras',
  '/convenios':    'convenios',
  '/pos':          'pos',
  '/memoriales':   'memoriales',
  '/solicitudes':  'solicitudes',
  '/recaudo':      'recaudo',
  '/asesores':     'asesores',
  '/reportes':     'reportes',
  '/usuarios':     'usuarios',
  '/territorio':   'territorio',
  '/configuracion':'configuracion',
}

export default function Sidebar() {
  const [open, setOpen] = useState(true)
  const [nombreComercial, setNombreComercial] = useState('')
  // 'loading' | 'all' (admin) | objeto mapa de permisos
  const [permisos, setPermisos] = useState('loading')
  const { usuario } = useAuthStore()

  useEffect(() => {
    api.get('/empresa').then(r => setNombreComercial(r.data.data?.nombre_comercial || '')).catch(() => {})
  }, [])

  useEffect(() => {
    if (!usuario?.rol) { setPermisos('loading'); return }
    if (['superadmin','administrador'].includes(usuario.rol)) {
      setPermisos('all')
      return
    }
    api.get('/permisos/mis-permisos')
      .then(r => {
        const map = {}
        ;(r.data.data || []).forEach(p => {
          if (p.accion === 'ver') map[p.modulo] = p.permitido
        })
        setPermisos(map)
      })
      .catch(() => setPermisos({}))
  }, [usuario?.rol])

  const puede = (to) => {
    if (!usuario?.rol) return false
    if (permisos === 'loading') return false
    if (permisos === 'all') return true
    const modulo = RUTA_MODULO[to]
    if (!modulo) return false
    return permisos[modulo] === true
  }

  return (
    <>
      <style>{CSS}</style>
      <aside className={`sb ${open ? 'open' : 'closed'}`}>

        {/* Logo + Toggle integrado */}
        <div className="sb-head">
          <img src="/logo.jpg" alt="Logo" className="sb-logo-img"
            onError={e => { e.target.style.display='none' }} />
          <div className="sb-logo-texts">
            <div className="sb-logo-name">Orquídea ERP</div>
            <div className="sb-logo-sub">{nombreComercial || 'ERP Funerario'}</div>
          </div>
          <button className="sb-toggle" onClick={() => setOpen(o => !o)} title={open ? 'Colapsar' : 'Expandir'}>
            {open ? <ChevronLeft size={13}/> : <ChevronRight size={13}/>}
          </button>
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          {GRUPOS.map(grupo => {
            const visibles = grupo.items.filter(i => puede(i.to))
            if (!visibles.length) return null
            return (
              <div className="sb-group" key={grupo.label}>
                <div className="sb-group-label" style={{ color: grupo.color }}>{grupo.label}</div>
                {visibles.map(({ to, label, Icon, grad }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
                    title={!open ? label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="sb-icon"
                          style={{ background: isActive ? grad : '#F4F5FA' }}>
                          <Icon size={16} color={isActive ? '#fff' : '#9CA3AF'} />
                        </div>
                        <span className="sb-label">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
                <div className="sb-group-divider" />
              </div>
            )
          })}
        </nav>


      </aside>
    </>
  )
}
