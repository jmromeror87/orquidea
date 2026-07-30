/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/MobileMenu.jsx                           ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/planes', label: 'Planes' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/consultar', label: 'Consultar mi póliza' },
  { href: '/contacto', label: 'Contacto' },
]

export default function MobileMenu({ sedes = [], telefono = '315 878 6701', telHref = '573158786701' }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const panel = (
    <div className="fixed inset-0 z-[9999] bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="ml-auto flex h-full w-full max-w-xs flex-col bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-stone-400">Menú</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-900 transition hover:bg-stone-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2.5 text-base font-semibold transition ${
                      active ? 'bg-gold-50 text-gold-700' : 'text-brand-900 hover:bg-stone-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {sedes.length > 0 && (
              <div className="mt-6 border-t border-stone-200 pt-4">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  Nuestras sedes
                </p>
                {sedes.map((s) => (
                  <Link
                    key={s.nombre}
                    href="/sedes"
                    className="block rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-gold-700"
                  >
                    {s.nombre}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-3 border-t border-stone-200 pt-4">
              <a href="https://app.funerariasanjoseabrego.com/login" className="text-sm font-semibold text-brand-900">
                Inicia sesión
              </a>
              <a
                href={`tel:+57${telHref}`}
                className="rounded-full bg-gold-500 px-4 py-2.5 text-center text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
              >
                Llámanos ahora
              </a>
            </div>
          </div>
    </div>
  )

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-900 transition hover:bg-stone-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && mounted && createPortal(panel, document.body)}
    </div>
  )
}
