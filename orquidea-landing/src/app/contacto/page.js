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
import { getSedes } from '@/lib/api'
import Watermark from '@/components/Watermark'

export const metadata = {
  title: 'Contacto',
  description: 'Comunícate con Funeraria San José de Abrego. Atención 24 horas.',
}

export default async function ContactoPage() {
  const sedes = await getSedes()
  const principal = sedes.find((s) => s.es_principal) || sedes[0]

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
          href="tel:+573158786701"
          className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-gold-400"
        >
          <p className="text-sm font-semibold text-stone-500">Línea de emergencia</p>
          <p className="mt-1 font-serif text-2xl text-brand-900">315 878 6701</p>
        </a>
        <a
          href="https://wa.me/573158786701"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-gold-400"
        >
          <p className="text-sm font-semibold text-stone-500">WhatsApp</p>
          <p className="mt-1 font-serif text-2xl text-brand-900">Escríbenos ahora</p>
        </a>
      </div>

      {principal && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
          <p className="text-sm font-semibold text-stone-500">Sede principal — {principal.nombre}</p>
          <p className="mt-1 text-stone-800">{principal.direccion}</p>
          {principal.email && <p className="mt-1 text-stone-600">{principal.email}</p>}
        </div>
      )}
    </div>
  )
}
