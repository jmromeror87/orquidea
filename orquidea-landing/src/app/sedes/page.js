/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/sedes/page.js                                   ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getSedes } from '@/lib/api'
import Watermark from '@/components/Watermark'

export const metadata = {
  title: 'Nuestras sedes',
  description: 'Encuentra la sede más cercana de Funeraria San José de Abrego.',
}

export default async function SedesPage() {
  const sedes = await getSedes()

  return (
    <div className="relative isolate mx-auto max-w-6xl overflow-hidden px-5 py-16">
      <Watermark className="-left-10 bottom-0" />
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Sedes</p>
      <h1 className="mt-2 font-serif text-4xl text-brand-900">Estamos cerca de ti</h1>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sedes.map((sede) => (
          <div key={sede.nombre} className="rounded-2xl border border-stone-200 bg-white p-6">
            {sede.es_principal && (
              <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                Sede principal
              </span>
            )}
            <h2 className="mt-2 font-serif text-xl text-brand-900">{sede.nombre}</h2>
            <p className="mt-2 text-sm text-stone-600">{sede.direccion}</p>
            {(sede.municipio || sede.ciudad) && (
              <p className="text-sm text-stone-500">
                {sede.municipio || sede.ciudad}{sede.departamento ? `, ${sede.departamento}` : ''}
              </p>
            )}
            <div className="mt-4 space-y-1 text-sm">
              {sede.telefono_1 && (
                <a href={`tel:${sede.telefono_1}`} className="block font-semibold text-gold-700">
                  {sede.telefono_1}
                </a>
              )}
              {sede.telefono_2 && (
                <a href={`tel:${sede.telefono_2}`} className="block font-semibold text-gold-700">
                  {sede.telefono_2}
                </a>
              )}
              {sede.email && <p className="text-stone-500">{sede.email}</p>}
            </div>
          </div>
        ))}
        {sedes.length === 0 && <p className="text-stone-500">Información de sedes próximamente.</p>}
      </div>
    </div>
  )
}
