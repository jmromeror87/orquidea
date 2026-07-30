/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/SocialIcons.jsx                          ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// TODO: reemplazar href="#" por las URLs reales de cada red social cuando
// el cliente las confirme (pendiente al momento de construir este footer).
const REDES_BASE = [
  {
    nombre: 'Facebook',
    href: '#',
    icon: (
      <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.5c0-.87.24-1.46 1.49-1.46H16.5V4.34C16.19 4.3 15.13 4.2 13.9 4.2c-2.55 0-4.3 1.56-4.3 4.42V10.5H7v3h2.6V21h3.9z"/>
    ),
  },
  {
    nombre: 'Instagram',
    href: '#',
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="7" r="1.1" />
      </>
    ),
  },
  {
    nombre: 'YouTube',
    href: '#',
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10.5 9.5l5 2.5-5 2.5v-5z" />
      </>
    ),
  },
]

const ICONO_WHATSAPP = (
  <path d="M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.5 20.5l4.4-1.3A8.4 8.4 0 1 0 12 3.5zm4.9 11.9c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1a10 10 0 0 1-4.6-3.2 5.3 5.3 0 0 1-1.1-2.8c0-.8.4-1.2.6-1.4.2-.2.4-.2.6-.2h.4c.1 0 .3 0 .5.4l.7 1.6c.1.1.1.3 0 .4l-.4.5c-.1.1-.2.3-.1.4.3.6.8 1.2 1.3 1.6.5.4 1 .7 1.6.9.1.1.3 0 .4-.1l.5-.6c.1-.2.3-.2.4-.1l1.5.8c.2.1.2.1.2.3 0 .1 0 .3-.1.4z" />
)

export default function SocialIcons({ className = '', whatsapp = '573158786701' }) {
  const REDES = [...REDES_BASE, { nombre: 'WhatsApp', href: `https://wa.me/${whatsapp}`, icon: ICONO_WHATSAPP }]
  return (
    <div className={`flex gap-3 ${className}`}>
      {REDES.map((r) => (
        <a
          key={r.nombre}
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={r.nombre}
          title={r.nombre}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-stone-200 transition hover:bg-gold-500 hover:text-brand-950"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            {r.icon}
          </svg>
        </a>
      ))}
    </div>
  )
}
