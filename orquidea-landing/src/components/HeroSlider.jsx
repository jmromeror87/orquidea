/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/HeroSlider.jsx                           ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import { Children, useEffect, useRef, useState } from 'react'

// Slider automático de banners a pantalla completa — hace crossfade cada
// pocos segundos y se pausa mientras el mouse está encima. Los slides se
// pasan como children (cada uno un banner ya armado, ej. <BannerPlanes />).
export default function HeroSlider({ children, intervalo = 7000 }) {
  const slides = Children.toArray(children)
  const [activo, setActivo] = useState(0)
  const pausadoRef = useRef(false)

  useEffect(() => {
    if (slides.length < 2) return
    const id = setInterval(() => {
      if (!pausadoRef.current) {
        setActivo((i) => (i + 1) % slides.length)
      }
    }, intervalo)
    return () => clearInterval(id)
  }, [slides.length, intervalo])

  if (slides.length <= 1) return slides[0] || null

  return (
    <div
      className="relative isolate"
      onMouseEnter={() => { pausadoRef.current = true }}
      onMouseLeave={() => { pausadoRef.current = false }}
    >
      <div className="relative">
        {slides.map((slide, i) => (
          <div
            key={i}
            aria-hidden={i !== activo}
            className={`transition-opacity duration-700 ease-in-out ${
              i === activo ? 'relative z-10 opacity-100' : 'pointer-events-none absolute inset-0 z-0 opacity-0'
            }`}
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Indicadores */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActivo(i)}
            aria-label={`Ir a la diapositiva ${i + 1}`}
            className={`pointer-events-auto h-2 rounded-full transition-all ${
              i === activo ? 'w-6 bg-gold-500' : 'w-2 bg-brand-900/20 hover:bg-brand-900/40'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
