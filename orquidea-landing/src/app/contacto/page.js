/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/contacto/page.js                                ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getSedes, getEmpresa } from '@/lib/api'
import Watermark from '@/components/Watermark'

export const metadata = {
  title: 'Contacto',
  description: 'Comunícate con Funeraria San José de Abrego. Atención 24 horas.',
}

const soloDigitos = (s) => (s || '').replace(/\D/g, '')

export default async function ContactoPage() {
  const [sedes, empresaRaw] = await Promise.all([getSedes(), getEmpresa()])
  const empresa = Array.isArray(empresaRaw) ? null : empresaRaw
  const principal = sedes.find((s) => s.es_principal) || sedes[0]

  const telefono = empresa?.telefono_1 || principal?.telefono_1 || '3158786701'
  const telWa = soloDigitos(telefono)
  const telHref = telWa.length === 10 ? `57${telWa}` : telWa

  return (
    <div className="relative isolate mx-auto max-w-3xl overflow-hidden px-5 py-16">
      <Watermark className="-left-10 bottom-0" />
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Contacto</p>
      <h1 className="mt-2 font-serif text-4xl text-brand-900">Estamos para acompañarte</h1>
      <p className="mt-4 text-stone-600">
        Nuestra línea de atención funciona las 24 horas del día, todos los días del año.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <a
          href={`tel:+${telHref}`}
          className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-gold-400"
        >
          <p className="text-sm font-semibold text-stone-500">Línea de emergencia</p>
          <p className="mt-1 font-serif text-2xl text-brand-900">{telefono}</p>
        </a>
        <a
          href={`https://wa.me/${telHref}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-gold-400"
        >
          <p className="text-sm font-semibold text-stone-500">WhatsApp</p>
          <p className="mt-1 font-serif text-2xl text-brand-900">Escríbenos ahora</p>
        </a>

        {empresa?.email && (
          <a
            href={`mailto:${empresa.email}`}
            className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-gold-400"
          >
            <p className="text-sm font-semibold text-stone-500">Correo electrónico</p>
            <p className="mt-1 break-all font-serif text-xl text-brand-900">{empresa.email}</p>
          </a>
        )}

        {empresa?.sitio_web && (
          <a
            href={empresa.sitio_web}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-gold-400"
          >
            <p className="text-sm font-semibold text-stone-500">Página web</p>
            <p className="mt-1 break-all font-serif text-xl text-brand-900">
              {empresa.sitio_web.replace(/^https?:\/\//, '')}
            </p>
          </a>
        )}

        {empresa?.telefono_2 && (
          <a
            href={`tel:+57${soloDigitos(empresa.telefono_2)}`}
            className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-gold-400"
          >
            <p className="text-sm font-semibold text-stone-500">Teléfono alterno</p>
            <p className="mt-1 font-serif text-2xl text-brand-900">{empresa.telefono_2}</p>
          </a>
        )}
      </div>

      {principal && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
          <p className="text-sm font-semibold text-stone-500">Sede principal — {principal.nombre}</p>
          <p className="mt-1 text-stone-800">{principal.direccion}</p>
          {(principal.municipio || empresa?.municipio) && (
            <p className="mt-1 text-stone-600">
              {principal.municipio || empresa?.municipio}
              {(principal.departamento || empresa?.departamento) ? `, ${principal.departamento || empresa?.departamento}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
