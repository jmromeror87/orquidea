/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/page.js                                         ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Link from 'next/link'
import { getPlanes, getMemoriales } from '@/lib/api'
import Watermark from '@/components/Watermark'
import BannerPlanes from '@/components/BannerPlanes'
import BannerPlanesV2 from '@/components/BannerPlanesV2'
import HeroSlider from '@/components/HeroSlider'
import ComoFunciona from '@/components/ComoFunciona'
import PlanCard from '@/components/PlanCard'
import MemorialSlider from '@/components/MemorialSlider'
import AfiliacionBanner from '@/components/AfiliacionBanner'
import ConfianzaSection from '@/components/ConfianzaSection'

export default async function HomePage() {
  const [planes, memoriales] = await Promise.all([getPlanes(), getMemoriales()])
  const destacados = planes.slice(0, 3)

  return (
    <>
      <HeroSlider>
        <BannerPlanes />
        <BannerPlanesV2 />
      </HeroSlider>

      {/* Planes destacados */}
      {destacados.length > 0 && (
        <section className="relative isolate mx-auto max-w-6xl overflow-hidden px-5 py-20">
          <Watermark className="-left-10 bottom-0" />
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-3xl text-brand-900">Planes exequiales</h2>
            <Link href="/planes" className="text-sm font-semibold text-gold-700 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destacados.map((plan) => (
              <PlanCard key={plan.codigo} plan={plan} />
            ))}
          </div>
        </section>
      )}

      <AfiliacionBanner />

      <ConfianzaSection />

      <ComoFunciona />

      <MemorialSlider memoriales={memoriales} />
    </>
  )
}
