/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/planes/[codigo]/page.js                         ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlanes, getEmpresa } from '@/lib/api'

export async function generateStaticParams() {
  const planes = await getPlanes()
  return planes.map((p) => ({ codigo: p.codigo }))
}

export async function generateMetadata({ params }) {
  const { codigo } = await params
  const planes = await getPlanes()
  const plan = planes.find((p) => p.codigo === codigo)
  if (!plan) return { title: 'Plan no encontrado' }
  return { title: plan.nombre, description: plan.descripcion }
}

export default async function PlanDetallePage({ params }) {
  const { codigo } = await params
  const [planes, empresaRaw] = await Promise.all([getPlanes(), getEmpresa()])
  const plan = planes.find((p) => p.codigo === codigo)
  if (!plan) notFound()
  const empresa = Array.isArray(empresaRaw) ? null : empresaRaw
  const telHref = (empresa?.telefono_1 || '3158786701').replace(/\D/g, '')

  const incluidos = Array.isArray(plan.servicios_incluidos) ? plan.servicios_incluidos : []

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/planes" className="text-sm font-semibold text-gold-700 hover:underline">
        ← Volver a planes
      </Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-gold-700">{plan.tipo}</p>
      <h1 className="mt-2 font-serif text-4xl text-brand-900">{plan.nombre}</h1>
      <p className="mt-4 text-stone-600">{plan.descripcion}</p>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-stone-500">Beneficiarios</dt>
            <dd className="font-semibold text-brand-900">{plan.num_beneficiarios || 1}</dd>
          </div>
          {plan.edad_max_titular && (
            <div>
              <dt className="text-stone-500">Edad máx. titular</dt>
              <dd className="font-semibold text-brand-900">{plan.edad_max_titular} años</dd>
            </div>
          )}
          <div>
            <dt className="text-stone-500">Vigencia</dt>
            <dd className="font-semibold text-brand-900">{plan.meses_vigencia} meses</dd>
          </div>
        </dl>
      </div>

      {incluidos.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif text-2xl text-brand-900">¿Qué incluye?</h2>
          <ul className="mt-4 space-y-2">
            {incluidos.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="mt-0.5 text-gold-600">✓</span>
                {item.nombre || item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={`tel:+57${telHref}`}
        className="mt-10 inline-block rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
      >
        Quiero afiliarme — llamar ahora
      </a>
    </div>
  )
}
