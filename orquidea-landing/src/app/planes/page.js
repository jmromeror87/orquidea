/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/planes/page.js                                  ║
 * ║  Versión         : v2.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getPlanes } from '@/lib/api'
import Watermark from '@/components/Watermark'
import PlanCard from '@/components/PlanCard'

export const metadata = {
  title: 'Planes exequiales',
  description: 'Conoce nuestros planes exequiales individuales, familiares y empresariales.',
}

export default async function PlanesPage() {
  const planes = await getPlanes()

  return (
    <div className="relative isolate mx-auto max-w-6xl overflow-hidden px-5 py-16">
      <Watermark className="-left-10 bottom-0" />
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Planes exequiales</p>
      <h1 className="mt-2 font-serif text-4xl text-brand-900">Protege a tu familia hoy</h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Elige el plan que mejor se adapte a tu familia. Todos incluyen atención inmediata,
        acompañamiento y respaldo en el momento que más se necesita.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {planes.map((plan) => (
          <PlanCard key={plan.codigo} plan={plan} />
        ))}
        {planes.length === 0 && (
          <p className="text-stone-500">Pronto publicaremos aquí nuestros planes disponibles.</p>
        )}
      </div>
    </div>
  )
}
