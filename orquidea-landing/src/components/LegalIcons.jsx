/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/LegalIcons.jsx                           ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// Set de íconos vectoriales (línea, stroke=currentColor) para las páginas
// legales — sin dependencias externas, coherentes con la paleta de marca.
const PATHS = {
  shield: 'M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5v-9z',
  users: 'M8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 20c.5-3.5 3-5.5 5.5-5.5s5 2 5.5 5.5M13.5 14.7c2 .2 4 2 4.5 5.3',
  database: 'M12 5c4 0 7 1.1 7 2.5S16 10 12 10 5 8.9 5 7.5 8 5 12 5zM5 7.5V17c0 1.4 3 2.5 7 2.5s7-1.1 7-2.5V7.5M5 12.2c0 1.4 3 2.5 7 2.5s7-1.1 7-2.5',
  mail: 'M4 6h16v12H4V6zm0 0l8 7 8-7',
  scale: 'M12 3v18M5 7l-3 6a3 3 0 0 0 6 0l-3-6zm14 0l-3 6a3 3 0 0 0 6 0l-3-6zM5 7h14M8 21h8',
  refresh: 'M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0 0 14.9 2.5M19.5 9A8 8 0 0 0 4.6 6.5',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.5 5.5l13 13',
  doc: 'M7 3h7l5 5v13H7V3zM14 3v5h5M9 12h6M9 16h6M9 8h2',
}

export default function LegalIcon({ name, className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={PATHS[name] || PATHS.doc} />
    </svg>
  )
}
