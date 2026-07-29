/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/FloatingContact.jsx                      ║
 * ║  Versión         : v2.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import BenefitIcon from './BenefitIcons'

// Pestaña vertical fija en el borde derecho — siempre visible mientras se
// navega/scrollea el sitio, con el texto en vertical estilo "Suscríbete".
export default function FloatingContact() {
  return (
    <a
      href="https://wa.me/573103780786?text=Hola%2C%20quiero%20asesor%C3%ADa%20sobre%20los%20planes%20exequiales"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl bg-gradient-to-b from-gold-400 to-gold-600 py-5 px-2.5 text-brand-950 shadow-lg transition hover:px-3.5 hover:shadow-xl"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-gold-400 shadow-inner">
        <BenefitIcon name="soporte" className="h-5 w-5" />
      </span>
      <span
        className="text-xs font-bold tracking-wide"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        Asesoría personalizada
      </span>
    </a>
  )
}
