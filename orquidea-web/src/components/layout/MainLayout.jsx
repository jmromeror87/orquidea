/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Layout Principal                                     ║
 * ║  Archivo         : MainLayout.jsx                                       ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header  from './Header.jsx'
import Footer  from './Footer.jsx'

export default function MainLayout() {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

      {/* Fila: sidebar + contenido */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        <Sidebar />

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <Header />
          <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
            <Outlet />
          </main>
        </div>

      </div>

      {/* Footer ancho completo */}
      <Footer />

    </div>
  )
}
