/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/ComoFunciona.jsx                         ║
 * ║  Versión         : v3.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import { useState } from 'react'
import BenefitIcon from './BenefitIcons'
import LeadForm from './LeadForm'

const PUNTOS = [
  {
    icon: 'familia',
    titulo: 'Cobertura para toda la familia',
    texto:
      'Un solo plan puede proteger a tu núcleo familiar completo — titular, cónyuge, hijos y en algunos casos padres o hermanos. Tú eliges cuántos beneficiarios necesitas, y todos quedan amparados bajo las mismas condiciones, sin tener que contratar pólizas separadas para cada persona.',
  },
  {
    icon: 'corazon',
    titulo: 'Tranquilidad y respaldo en los momentos más difíciles',
    texto:
      'Cuando ocurre una pérdida, lo último que una familia debería preocuparse es la logística. Con tu plan activo, nuestro equipo se encarga de coordinar el servicio exequial de principio a fin — sala de velación, traslado, documentación — para que ustedes puedan enfocarse en despedirse y acompañarse.',
  },
  {
    icon: 'documento',
    titulo: 'Sin trámites engorrosos, fácil y accesible',
    texto:
      'Afiliarte toma minutos, no días. No pedimos exámenes médicos ni largos formularios: con tus datos básicos y los de tus beneficiarios puedes quedar cubierto el mismo día. Y si en algún momento necesitas actualizar información o beneficiarios, lo resolvemos con una simple llamada.',
  },
  {
    icon: 'moneda',
    titulo: 'Planes desde cuotas cómodas',
    texto:
      'Diseñamos planes para que proteger a tu familia no sea una carga financiera. Las cuotas mensuales se ajustan al tipo de plan que elijas — individual, familiar o empresarial — y pueden pagarse de forma mensual, trimestral, semestral o anual, según lo que mejor se acomode a tu bolsillo.',
  },
  {
    icon: 'soporte',
    titulo: 'Asesoría personalizada siempre',
    texto:
      'No estás solo en esta decisión. Nuestras asesoras te acompañan desde el primer contacto — resolviendo dudas sobre coberturas, ayudándote a elegir el plan correcto para tu familia — y siguen disponibles después de la afiliación, cada vez que nos necesites.',
  },
]

export default function ComoFunciona() {
  const [abierto, setAbierto] = useState(0)

  return (
    <section className="relative isolate bg-white py-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2 lg:items-start">
        {/* Columna izquierda — acordeón */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Cómo te protege</p>
          <h2 className="mt-2 font-serif text-3xl text-brand-900 sm:text-4xl">
            Cada beneficio, explicado con calma
          </h2>
          <p className="mt-4 text-stone-600">
            Sabemos que estas decisiones se toman con cabeza fría, pero también con el corazón.
            Toca cada punto para ver el detalle.
          </p>

          <div className="mt-10 divide-y divide-stone-200 rounded-2xl border border-stone-200">
            {PUNTOS.map((p, i) => {
              const open = abierto === i
              return (
                <div key={p.titulo}>
                  <button
                    type="button"
                    onClick={() => setAbierto(open ? -1 : i)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-stone-50"
                    aria-expanded={open}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-400/50 bg-brand-900 text-gold-400">
                      <BenefitIcon name={p.icon} className="h-4 w-4" />
                    </span>
                    <span className="flex-1 font-serif text-base text-brand-900 sm:text-lg">{p.titulo}</span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 shrink-0 text-gold-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div
                    className="grid overflow-hidden transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 pl-[3.75rem] text-sm leading-relaxed text-stone-600">
                        {p.texto}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Columna derecha — formulario de solicitud */}
        <div className="lg:sticky lg:top-28">
          <LeadForm origen="como-funciona" />
        </div>
      </div>
    </section>
  )
}
