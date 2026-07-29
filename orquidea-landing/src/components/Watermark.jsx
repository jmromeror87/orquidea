/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/Watermark.jsx                            ║
 * ║  Versión         : v2.0.0                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Image from 'next/image'

const VARIANTES = {
  sanjose: { src: '/watermark-sanjose.png', width: 486, height: 400 },
  orquidea: { src: '/watermark-orquidea.png', width: 408, height: 348 },
}

// Hoja de arce vectorial — dibujada a mano (limpia, sin artefactos de
// extracción), inspirada en la que acompaña el logo de la funeraria.
function HojaArce(props) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
      <path d="M50 3
        L56 20 L70 10 L65 26 L83 24 L70 36 L86 44 L68 47
        L74 62 L58 55 L60 74 L50 60 L40 74 L42 55 L26 62
        L32 47 L14 44 L30 36 L17 24 L35 26 L30 10 L44 20 Z
        M50 60 L46 96 L54 96 Z" />
    </svg>
  )
}

// Marca de agua decorativa para las secciones claras del sitio — San José,
// el ícono de la orquídea del logo, o la hoja vectorial de marca.
// pointer-events-none para que nunca interfiera con clics/selección de texto.
export default function Watermark({ className = '', variante = 'sanjose' }) {
  if (variante === 'hoja') {
    return (
      <HojaArce
        aria-hidden="true"
        className={`pointer-events-none absolute -z-10 h-[380px] w-[380px] text-brand-800 opacity-[0.05] select-none ${className}`}
      />
    )
  }

  const v = VARIANTES[variante] || VARIANTES.sanjose
  return (
    <Image
      src={v.src}
      alt=""
      aria-hidden="true"
      width={v.width}
      height={v.height}
      className={`pointer-events-none absolute -z-10 opacity-[0.06] select-none ${className}`}
    />
  )
}
