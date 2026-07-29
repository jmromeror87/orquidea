/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/AuthLinks.jsx                            ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import BenefitIcon from './BenefitIcons'

// TODO: sin destino real todavía — el sitio público no tiene portal de
// clientes. Cuando exista, reemplazar href="#" por las rutas reales.
export default function AuthLinks() {
  return (
    <div className="hidden items-center lg:flex">
      <a href="#" className="flex items-center gap-1.5 text-sm font-semibold text-brand-900 transition hover:text-gold-700">
        <BenefitIcon name="usuario" className="h-4 w-4" />
        Inicia sesión
      </a>
    </div>
  )
}
