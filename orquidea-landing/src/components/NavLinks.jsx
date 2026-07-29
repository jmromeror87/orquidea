/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/NavLinks.jsx                             ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/planes', label: 'Planes' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/consultar', label: 'Consultar mi póliza' },
  { href: '/contacto', label: 'Contacto' },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="hidden gap-8 md:flex">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative py-1 text-sm font-semibold transition-colors ${
              active ? 'text-gold-700' : 'text-brand-900 hover:text-gold-700'
            }`}
          >
            {item.label}
            <span
              className={`absolute -bottom-0.5 left-0 h-0.5 w-full origin-left rounded-full bg-gold-500 transition-transform duration-300 ${
                active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}
