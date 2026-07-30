/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/consultar/page.js                               ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { Suspense } from 'react'
import ConsultarForm from './ConsultarForm'
import Watermark from '@/components/Watermark'
import { getWhatsappNumero } from '@/lib/api'

export const metadata = {
  title: 'Consultar mi póliza',
  description: 'Consulta el estado de tu póliza o contrato exequial con tu cédula.',
}

export default async function ConsultarPage() {
  const waNumero = await getWhatsappNumero()
  return (
    <div className="relative isolate mx-auto max-w-6xl overflow-hidden px-5 py-16">
      <Watermark className="-left-10 bottom-0" />
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Portal de clientes</p>
      <h1 className="mt-2 font-serif text-4xl text-brand-900">Consulta el estado de tu póliza</h1>
      <p className="mt-4 text-stone-600">
        Ingresa tu número de cédula y el número de tu póliza o contrato para ver su estado actual.
      </p>
      <Suspense fallback={null}>
        <ConsultarForm waNumero={waNumero} />
      </Suspense>
    </div>
  )
}
