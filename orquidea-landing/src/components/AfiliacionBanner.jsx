/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/AfiliacionBanner.jsx                    ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import BenefitIcon from './BenefitIcons'
import { getWhatsappNumero } from '@/lib/api'

const PASOS = [
  { icon: 'mensaje',    titulo: 'Contáctanos',        texto: 'Comunícate con nuestra asesora y recibe información personalizada.' },
  { icon: 'documento',  titulo: 'Elige tu plan',      texto: 'Te ayudamos a elegir el plan exequial que mejor se adapte a tus necesidades.' },
  { icon: 'formulario', titulo: 'Diligencia tus datos', texto: 'Completa el formulario de afiliación con tus datos y los de tu grupo familiar.' },
  { icon: 'moneda',     titulo: 'Realiza tu pago',     texto: 'Efectúa el pago de acuerdo con las opciones que tenemos para ti.' },
  { icon: 'escudo',     titulo: '¡Ya estás afiliado!', texto: 'Recibe tu certificado y disfruta de la tranquilidad de estar protegido.' },
]

export default async function AfiliacionBanner() {
  const waNumero = await getWhatsappNumero()
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 py-14">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-gold-100 sm:text-3xl">¿Cómo afiliarte? <span className="text-gold-400">¡Es muy fácil!</span></h2>
          <a
            href={`https://wa.me/${waNumero}?text=Hola%2C%20quiero%20afiliarme%20a%20un%20plan%20exequial`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
          >
            Empezar ahora →
          </a>
        </div>

        <div className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Línea conectora (solo desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gold-500/30 lg:block" />

          {PASOS.map((p, i) => (
            <div key={p.titulo} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500 text-sm font-extrabold text-brand-950 shadow-md">
                {i + 1}
              </div>
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-gold-500/10 text-gold-400">
                <BenefitIcon name={p.icon} className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gold-100">{p.titulo}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-400">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
