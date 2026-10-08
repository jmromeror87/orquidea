/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública — portal de clientes (en desarrollo) ║
 * ║  Archivo         : app/portal/page.js                                  ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-10-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * "Inicia sesión" y "Regístrate" de la landing llegan aquí mientras el portal
 * de clientes está en pruebas. Lo que el cliente ya puede hacer hoy (consultar
 * su póliza, escribirnos) queda a un clic. El personal de la funeraria entra
 * al ERP por el enlace discreto del final.
 */
import Link from 'next/link'
import BenefitIcon from '@/components/BenefitIcons'
import Watermark from '@/components/Watermark'
import { getWhatsappNumero } from '@/lib/api'

export const metadata = {
  title: 'Portal de clientes',
  description: 'El portal de clientes de Funeraria San José de Ábrego está en desarrollo.',
  robots: { index: false },
}

const PROXIMAMENTE = [
  { icon: 'documento', texto: 'Ver tu póliza y tus beneficiarios en cualquier momento' },
  { icon: 'moneda',    texto: 'Pagar tus cuotas en línea y descargar tus recibos' },
  { icon: 'familia',   texto: 'Solicitar cambios de beneficiarios sin ir a la oficina' },
  { icon: 'mensaje',   texto: 'Recibir avisos de pago y novedades de tu plan' },
]

export default async function PortalPage() {
  const waNumero = await getWhatsappNumero()

  return (
    <div className="relative isolate mx-auto max-w-3xl overflow-hidden px-5 py-16 text-center">
      <Watermark className="-right-10 top-0" />

      <span className="inline-flex items-center gap-2 rounded-full border border-gold-400 bg-gold-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-700">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
        En desarrollo
      </span>

      <h1 className="mt-6 font-serif text-4xl text-brand-900 sm:text-5xl">Portal de clientes</h1>
      <p className="mx-auto mt-4 max-w-xl text-stone-600">
        Estamos preparando un espacio para que gestiones tu plan exequial desde casa.
        Muy pronto podrás crear tu cuenta e iniciar sesión aquí.
      </p>

      <ul className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
        {PROXIMAMENTE.map((p) => (
          <li key={p.texto} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-brand-900">
              <BenefitIcon name={p.icon} className="h-5 w-5" />
            </span>
            <span className="text-sm text-stone-700">{p.texto}</span>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-12 max-w-xl rounded-2xl bg-brand-900 p-8 text-white">
        <p className="font-serif text-2xl">Mientras tanto, te atendemos así</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/consultar"
            className="rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
          >
            Consultar mi póliza
          </Link>
          <a
            href={`https://wa.me/${waNumero}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </div>

      <p className="mt-12 text-sm text-stone-500">
        ¿Eres colaborador de la funeraria?{' '}
        <a href="https://app.funerariasanjoseabrego.com/login" className="font-semibold text-brand-900 underline-offset-4 hover:underline">
          Ingresa al sistema
        </a>
      </p>
    </div>
  )
}
