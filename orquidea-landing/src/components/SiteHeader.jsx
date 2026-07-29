/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/SiteHeader.jsx                           ║
 * ║  Versión         : v1.2.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from './NavLinks'
import MobileMenu from './MobileMenu'
import SedeSelector from './SedeSelector'
import AuthLinks from './AuthLinks'
import BenefitIcon from './BenefitIcons'
import { getSedes } from '@/lib/api'

export default async function SiteHeader() {
  const sedes = await getSedes()

  return (
    <div className="sticky top-0 z-50">
      {/* Barra de contacto */}
      <div className="hidden bg-brand-900 text-xs text-stone-200 sm:block">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-6 px-5 py-1.5">
          <a href="mailto:fsj.gerencia@funerariasanjoseabrego.com" className="flex items-center gap-1.5 transition hover:text-gold-400">
            <BenefitIcon name="sobre" className="h-3.5 w-3.5 text-gold-400" />
            fsj.gerencia@funerariasanjoseabrego.com
          </a>
          <a href="tel:+573158786701" className="flex items-center gap-1.5 transition hover:text-gold-400">
            <BenefitIcon name="telefono" className="h-3.5 w-3.5 text-gold-400" />
            315 878 6701
          </a>
          <span className="font-semibold text-gold-400">Línea de emergencia 24h</span>
        </div>
      </div>

      {/* Header blanco */}
      <header className="border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.jpg"
              alt="Funeraria San José de Ábrego"
              width={96}
              height={96}
              quality={100}
              className="rounded-full"
              priority
            />
          </Link>
          <NavLinks />
          <div className="flex items-center gap-6">
            <SedeSelector sedes={sedes} />
            <AuthLinks />
            <a
              href="tel:+573158786701"
              className="hidden rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-950 transition hover:bg-gold-400 sm:inline-block"
            >
              Llámanos ahora
            </a>
            <MobileMenu sedes={sedes} />
          </div>
        </div>
      </header>
    </div>
  )
}
