/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/MemorialSlider.jsx                      ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import { useRef, useEffect } from 'react'
import { API_ORIGIN } from '@/lib/api'
import BenefitIcon from './BenefitIcons'

const TIPO_LABEL = {
  NOVENARIO: 'Novenario',
  ANIVERSARIO: 'Aniversario',
  MISA: 'Misa',
  OTRO: 'Conmemoración',
}

export default function MemorialSlider({ memoriales = [] }) {
  const trackRef = useRef(null)
  const pausadoRef = useRef(false)

  // Desplazamiento automático continuo — se pausa mientras el mouse está
  // encima o justo después de usar las flechas, y hace loop al llegar al final.
  useEffect(() => {
    const track = trackRef.current
    if (!track || memoriales.length < 2) return

    let frame
    const VELOCIDAD = 0.5 // px por frame (~30px/seg a 60fps): ni muy rápido ni muy lento

    const tick = () => {
      if (!pausadoRef.current) {
        const maxScroll = track.scrollWidth - track.clientWidth
        if (track.scrollLeft >= maxScroll - 1) {
          track.scrollLeft = 0
        } else {
          track.scrollLeft += VELOCIDAD
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    const pausar = () => { pausadoRef.current = true }
    const reanudar = () => { pausadoRef.current = false }
    track.addEventListener('mouseenter', pausar)
    track.addEventListener('mouseleave', reanudar)
    track.addEventListener('touchstart', pausar, { passive: true })
    track.addEventListener('touchend', reanudar)

    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('mouseenter', pausar)
      track.removeEventListener('mouseleave', reanudar)
      track.removeEventListener('touchstart', pausar)
      track.removeEventListener('touchend', reanudar)
    }
  }, [memoriales.length])

  if (!memoriales.length) return null

  const desplazar = (dir) => {
    pausadoRef.current = true
    trackRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
    setTimeout(() => { pausadoRef.current = false }, 2500)
  }

  return (
    <section className="bg-stone-50 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">En memoria</p>
            <h2 className="mt-2 font-serif text-3xl text-brand-900 sm:text-4xl">
              Novenarios, aniversarios y misas
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => desplazar(-1)}
              aria-label="Anterior"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-brand-900 transition hover:border-gold-500 hover:text-gold-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => desplazar(1)}
              aria-label="Siguiente"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-brand-900 transition hover:border-gold-500 hover:text-gold-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-8 flex gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {memoriales.map((m) => (
            <div
              key={`${m.nombre}-${m.fecha_evento}`}
              className="w-64 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="aspect-square w-full overflow-hidden bg-stone-100">
                {m.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_ORIGIN}${m.foto_url}`} alt={m.nombre} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-300">
                    <BenefitIcon name="corazon" className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <span className="inline-block rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-semibold text-gold-700">
                  {TIPO_LABEL[m.tipo] || 'Conmemoración'}
                </span>
                <p className="mt-2 font-serif text-base leading-snug text-brand-900">{m.nombre}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Q.E.P.D.</p>
                <p className="mt-2 text-xs text-stone-500">
                  {new Date(m.fecha_evento).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {m.mensaje && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-stone-600">{m.mensaje}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
