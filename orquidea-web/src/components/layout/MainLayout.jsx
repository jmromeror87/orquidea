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
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

        <Sidebar />

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0, minHeight:0 }}>
          <Header />
          {/* minHeight:0 es obligatorio aquí: sin él, un hijo flex nunca se
              encoge por debajo del alto de su contenido, así que <main>
              crecería para caber toda la página en vez de activar su propio
              scroll — y el overflow:hidden de arriba se comía el resto sin
              dar forma de bajar (bug real: Usuarios mostraba 4 de 5 filas
              sin scrollbar). */}
          <main style={{ flex:1, overflowY:'auto', overflowX:'hidden', minHeight:0 }}>
            <Outlet />
          </main>
        </div>

      </div>

      {/* Footer ancho completo */}
      <Footer />

    </div>
  )
}
