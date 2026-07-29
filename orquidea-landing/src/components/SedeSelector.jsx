/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/SedeSelector.jsx                         ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import BenefitIcon from './BenefitIcons'

export default function SedeSelector({ sedes = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const principal = sedes.find((s) => s.es_principal) || sedes[0]

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!principal) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-semibold text-brand-900 transition hover:text-gold-700"
      >
        <BenefitIcon name="pin" className="h-4 w-4" />
        {principal.nombre}
        <BenefitIcon name="chevronAbajo" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Nuestras sedes
          </p>
          {sedes.map((s) => (
            <Link
              key={s.nombre}
              href="/sedes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-gold-700"
            >
              <BenefitIcon name="pin" className="h-3.5 w-3.5 shrink-0 text-gold-600" />
              {s.nombre}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
