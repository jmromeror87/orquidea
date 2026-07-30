/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/BannerPlanes.jsx                         ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Image from 'next/image'
import Link from 'next/link'
import BenefitIcon from './BenefitIcons'
import { getWhatsappNumero } from '@/lib/api'

const BENEFICIOS = [
  { icon: 'familia', label: 'Cobertura para toda la familia' },
  { icon: 'corazon', label: 'Tranquilidad y respaldo en los momentos más difíciles' },
  { icon: 'documento', label: 'Sin trámites engorrosos, fácil y accesible' },
  { icon: 'moneda', label: 'Planes desde cuotas cómodas' },
  { icon: 'audifono', label: 'Asesoría personalizada siempre' },
]

const INCLUYE = [
  'Servicio funerario completo',
  'Sala de velación',
  'Traslados nacionales',
  'Asistencia 24/7',
  'Atención con respeto y calidez',
]

export default async function BannerPlanes() {
  const waNumero = await getWhatsappNumero()
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-stone-50 to-gold-100/40">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(320px,32%)_1fr]">
        {/* Foto de la asesora — a todo lo ancho, sin bordes */}
        <div className="fade-in-up relative w-full">
          <Image
            src="/asesora-lina.png"
            alt="Lina Arévalo, asesora de Planes Exequiales de Funeraria San José de Ábrego"
            width={709}
            height={782}
            quality={100}
            className="h-full w-full object-cover"
            priority
          />
          {/* Degradado en el borde derecho — funde la foto con el fondo */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 bg-gradient-to-r from-transparent to-stone-50 lg:block" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent lg:hidden" />
        </div>

        {/* Contenido */}
        <div className="fade-in-up px-5 py-16 lg:pr-10" style={{ animationDelay: '80ms' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">
              Planes exequiales
            </p>
            <div className="flex items-center gap-2 rounded-full bg-brand-900 px-4 py-2 text-xs font-semibold text-gold-100">
              <BenefitIcon name="escudo" className="h-5 w-5 text-gold-400" />
              Más de 20 años acompañando con respeto y compromiso
            </div>
          </div>

          <h2 className="mt-3 font-serif text-4xl text-brand-900 sm:text-5xl">Planes Exequiales</h2>
          <p className="mt-3 max-w-xl text-stone-600">
            Protege hoy a los que más amas, <strong className="text-brand-800">bríndales tranquilidad</strong> mañana.
          </p>

          {/* Beneficios */}
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {BENEFICIOS.map((b) => (
              <div key={b.icon} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-400/60 bg-white text-brand-800 shadow-sm">
                  <BenefitIcon name={b.icon} />
                </div>
                <p className="mt-2 text-xs font-medium text-stone-600">{b.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a
              href={`https://wa.me/${waNumero}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20los%20planes%20exequiales`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-full bg-brand-900 py-2.5 pl-3 pr-6 text-white shadow-md transition hover:bg-brand-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-brand-950">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.5 20.5l4.4-1.3A8.4 8.4 0 1 0 12 3.5zm4.9 11.9c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1a10 10 0 0 1-4.6-3.2 5.3 5.3 0 0 1-1.1-2.8c0-.8.4-1.2.6-1.4.2-.2.4-.2.6-.2h.4c.1 0 .3 0 .5.4l.7 1.6c.1.1.1.3 0 .4l-.4.5c-.1.1-.2.3-.1.4.3.6.8 1.2 1.3 1.6.5.4 1 .7 1.6.9.1.1.3 0 .4-.1l.5-.6c.1-.2.3-.2.4-.1l1.5.8c.2.1.2.1.2.3 0 .1 0 .3-.1.4z" />
                </svg>
              </span>
              <span className="text-left leading-tight">
                <span className="block text-sm font-bold">¡Contáctame hoy!</span>
                <span className="block text-xs text-gold-200">Estoy para ayudarte</span>
              </span>
            </a>

            <ul className="grid gap-1.5 text-sm text-stone-700">
              {INCLUYE.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-gold-600">
                    <BenefitIcon name="check" className="h-4 w-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-sm text-stone-500">
            <Link href="/planes" className="font-semibold text-gold-700 hover:underline">
              Conoce todos nuestros planes →
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
