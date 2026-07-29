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
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store.js'

// Layouts
import MainLayout   from './components/layout/MainLayout.jsx'
import AuthLayout   from './components/layout/AuthLayout.jsx'

// Páginas
import LoginPage        from './pages/auth/LoginPage.jsx'
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
import POSPage          from './pages/pos/POSPage.jsx'
import MemorialesPage   from './pages/memoriales/MemorialesPage.jsx'
import SolicitudesPage  from './pages/solicitudes/SolicitudesPage.jsx'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Rutas privadas */}
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
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
        <Route path="/pos"          element={<POSPage />} />
        <Route path="/memoriales"   element={<MemorialesPage />} />
        <Route path="/solicitudes"  element={<SolicitudesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
