/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/PlanCard.jsx                             ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Link from 'next/link'
import BenefitIcon from './BenefitIcons'

// Estilo por tipo de plan — todos derivados de la paleta de marca (sin
// inventar colores nuevos), asociados al campo real `tipo` de cada plan.
const ESTILO_TIPO = {
  INDIVIDUAL: { icon: 'corazon', header: 'from-gold-500 to-gold-600', tagline: 'Protección personal, sin complicaciones' },
  FAMILIAR: { icon: 'familia', header: 'from-brand-700 to-brand-900', tagline: 'Tranquilidad y respaldo para tu familia' },
  EMPRESARIAL: { icon: 'maletin', header: 'from-emerald-500 to-emerald-700', tagline: 'Bienestar exequial para tu equipo' },
  CONVENIO: { icon: 'estrella', header: 'from-gold-600 to-brand-900', tagline: 'Beneficio especial por convenio' },
}

export default function PlanCard({ plan }) {
  // "Premium" se distingue del resto de planes individuales con su propio color.
  const esPremium = plan.nombre?.toLowerCase().includes('premium')
  const estilo = esPremium
    ? { icon: 'estrella', header: 'from-sky-400 to-sky-600', tagline: 'La cobertura más completa' }
    : ESTILO_TIPO[plan.tipo] || ESTILO_TIPO.INDIVIDUAL
  const incluidos = Array.isArray(plan.servicios_incluidos) ? plan.servicios_incluidos : []

  return (
    <Link
      href={`/planes/${plan.codigo}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Encabezado de color */}
      <div className={`relative bg-gradient-to-br ${estilo.header} px-5 pb-6 pt-5 text-white`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/10">
            <BenefitIcon name={estilo.icon} className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">Plan</p>
            <p className="font-serif text-lg leading-tight">{plan.nombre}</p>
          </div>
        </div>
      </div>

      {/* Lista de servicios incluidos */}
      <div className="flex-1 px-5 py-5">
        {plan.descripcion && <p className="text-sm text-stone-600">{plan.descripcion}</p>}
        {incluidos.length > 0 && (
          <ul className="mt-4 space-y-2">
            {incluidos.slice(0, 6).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="mt-0.5 text-gold-600">
                  <BenefitIcon name="check" className="h-4 w-4" />
                </span>
                {item.nombre || item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Franja inferior */}
      <div className="flex items-center gap-2 border-t border-stone-100 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-500">
        <BenefitIcon name="corazon" className="h-3.5 w-3.5 text-gold-600" />
        {estilo.tagline}
      </div>
    </Link>
  )
}
