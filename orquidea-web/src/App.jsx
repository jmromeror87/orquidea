/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Núcleo                                          ║
 * ║  Archivo         : App.jsx                                         ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2, ShieldOff } from 'lucide-react'
import { useAuthStore } from './store/auth.store.js'
import { usePermisos } from './store/permisos.store.js'

// Layouts
import MainLayout   from './components/layout/MainLayout.jsx'
import AuthLayout   from './components/layout/AuthLayout.jsx'

// Páginas
import LoginPage        from './pages/auth/LoginPage.jsx'
import ActivarCuentaPage from './pages/auth/ActivarCuentaPage.jsx'
import DashboardPage    from './pages/dashboard/DashboardPage.jsx'
import TercerosPage     from './pages/terceros/TercerosPage.jsx'
import ServiciosPage    from './pages/servicios/ServiciosPage.jsx'
import ContratosPage    from './pages/contratos/ContratosPage.jsx'
import PagosPage        from './pages/pagos/PagosPage.jsx'
import ReportesPage     from './pages/reportes/ReportesPage.jsx'
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage.jsx'
import UsuariosPage     from './pages/usuarios/UsuariosPage.jsx'
import TerritorioPage  from './pages/territorio/TerritorioPage.jsx'
import PolizasPage        from './pages/polizas/PolizasPage.jsx'
import PlanesPolizaPage  from './pages/polizas/PlanesPolizaPage.jsx'
import InventarioPage    from './pages/inventario/InventarioPage.jsx'
import ComprasPage       from './pages/compras/ComprasPage.jsx'
import RecaudoPage      from './pages/recaudo/RecaudoPage.jsx'
import AsesoresPage     from './pages/asesores/AsesoresPage.jsx'
import ConveniosPage    from './pages/convenios/ConveniosPage.jsx'
import CarteraConveniosPage from './pages/convenios/CarteraConveniosPage.jsx'
import POSPage          from './pages/pos/POSPage.jsx'
import MemorialesPage   from './pages/memoriales/MemorialesPage.jsx'
import SolicitudesPage  from './pages/solicitudes/SolicitudesPage.jsx'
import ContabilidadPage from './pages/contabilidad/ContabilidadPage.jsx'
import TesoreriaPage    from './pages/tesoreria/TesoreriaPage.jsx'
import AuditoriaPage    from './pages/auditoria/AuditoriaPage.jsx'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

const Cargando = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:'#6366F1' }}>
    <Loader2 size={26} style={{ animation:'spin 1s linear infinite' }}/>
  </div>
)

const SinModulos = () => (
  <div style={{ maxWidth:460, margin:'60px auto', textAlign:'center', padding:28, background:'#fff', borderRadius:18, border:'1px solid #E8E9F8' }}>
    <ShieldOff size={36} color="#94A3B8"/>
    <h2 style={{ margin:'12px 0 6px', fontSize:18, color:'#0F1035' }}>Sin módulos asignados</h2>
    <p style={{ margin:0, fontSize:13.5, color:'#64748B', lineHeight:1.5 }}>
      Su rol todavía no tiene acceso a ningún módulo. Pida al administrador que se los asigne en Usuarios → Roles y Permisos.
    </p>
  </div>
)

// Página de inicio = primer módulo permitido (sin Dashboard → directo a lo suyo)
function Inicio() {
  const { listo, inicio } = usePermisos()
  if (!listo) return <Cargando/>
  return inicio ? <Navigate to={inicio} replace/> : <SinModulos/>
}

// Solo deja entrar a los módulos que el rol tiene con "Ver" (aunque escriban la URL)
function ConPermiso() {
  const { pathname } = useLocation()
  const { listo, puede, inicio } = usePermisos()
  if (!listo) return <Cargando/>
  if (puede(pathname)) return <Outlet/>
  return inicio ? <Navigate to={inicio} replace/> : <SinModulos/>
}

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activar-cuenta/:token" element={<ActivarCuentaPage />} />
      </Route>

      {/* Rutas privadas */}
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Inicio/>} />
        <Route element={<ConPermiso/>}>
        <Route path="/dashboard"     element={<DashboardPage />} />
        <Route path="/terceros"      element={<TercerosPage />} />
        <Route path="/servicios"     element={<ServiciosPage />} />
        <Route path="/contratos"     element={<ContratosPage />} />
        <Route path="/polizas"        element={<PolizasPage />} />
        <Route path="/polizas/planes" element={<PlanesPolizaPage />} />
        <Route path="/pagos"         element={<PagosPage />} />
        <Route path="/reportes"      element={<ReportesPage />} />
        <Route path="/usuarios"      element={<UsuariosPage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/territorio"    element={<TerritorioPage />} />
        <Route path="/inventario"    element={<InventarioPage />} />
        <Route path="/compras"       element={<ComprasPage />} />
        <Route path="/recaudo"       element={<RecaudoPage />} />
        <Route path="/asesores"      element={<AsesoresPage />} />
        <Route path="/convenios"     element={<ConveniosPage />} />
        <Route path="/cartera-convenios" element={<CarteraConveniosPage />} />
        <Route path="/pos"          element={<POSPage />} />
        <Route path="/memoriales"   element={<MemorialesPage />} />
        <Route path="/solicitudes"  element={<SolicitudesPage />} />
        <Route path="/contabilidad" element={<ContabilidadPage />} />
        <Route path="/tesoreria" element={<TesoreriaPage />} />
        <Route path="/auditoria" element={<AuditoriaPage />} />
        </Route>
        <Route path="*" element={<Inicio/>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
