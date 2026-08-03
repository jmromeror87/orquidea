/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/servicios/page.js                               ║
 * ║  Versión         : v2.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getServicios, getWhatsappNumero } from '@/lib/api'
import Watermark from '@/components/Watermark'
import BenefitIcon from '@/components/BenefitIcons'

export const metadata = {
  title: 'Servicios funerarios',
  description: 'Ataúdes, urnas, traslados, salas de velación, cremación y más.',
}

// Convierte una descripción larga (a veces con **negritas** o listas * tipo
// markdown escritas por el admin en Configuración→Servicios) en un resumen
// corto y limpio para la tarjeta pública — la gente no lee párrafos largos.
function resumen(texto, max = 110) {
  if (!texto) return ''
  const limpio = texto
    .replace(/\*\*/g, '')
    .replace(/\n?\*\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()
  if (limpio.length <= max) return limpio
  const corte = limpio.slice(0, max)
  const ultimoEspacio = corte.lastIndexOf(' ')
  return `${corte.slice(0, ultimoEspacio > 0 ? ultimoEspacio : max)}…`
}

const CATEGORIAS = {
  ATAUD:         { label: 'Ataúdes',              icon: 'ataud' },
  URNA:          { label: 'Urnas',                icon: 'urna' },
  TRASLADO:      { label: 'Traslados',            icon: 'auto' },
  SALA_VELACION: { label: 'Salas de velación',    icon: 'corazon' },
  DOCUMENTOS:    { label: 'Trámites y documentos', icon: 'documento' },
  CREMACION:     { label: 'Cremación',            icon: 'llama' },
  INHUMACION:    { label: 'Inhumación',           icon: 'pin' },
  PREPARACION:   { label: 'Preparación',          icon: 'soporte' },
  FLORES:        { label: 'Arreglos florales',    icon: 'flor' },
  ADICIONAL:     { label: 'Servicios adicionales', icon: 'estrella' },
  GENERAL:       { label: 'Generales',            icon: 'check' },
}

export default async function ServiciosPage() {
  const [servicios, waNumero] = await Promise.all([getServicios(), getWhatsappNumero()])
  const porCategoria = servicios.reduce((acc, s) => {
    (acc[s.categoria] ||= []).push(s)
    return acc
  }, {})

  return (
    <div className="relative isolate mx-auto max-w-6xl overflow-hidden px-5 py-16">
      <Watermark className="-left-10 bottom-0" />

      <div className="fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Servicios</p>
        <h1 className="mt-2 font-serif text-4xl text-brand-900">Todo lo que tu familia necesita</h1>
        <p className="mt-4 max-w-2xl text-stone-600">
          Contamos con todo lo necesario para acompañar a tu familia en cada detalle del servicio
          exequial. Escríbenos y te asesoramos según lo que necesites.
        </p>
      </div>

      <div className="relative mt-14 space-y-14">
        {Object.entries(porCategoria).map(([cat, items], gi) => {
          const meta = CATEGORIAS[cat] || CATEGORIAS.GENERAL
          return (
            <div key={cat} style={{ animationDelay: `${gi * 60}ms` }} className="fade-in-up">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-gold-400">
                  <BenefitIcon name={meta.icon} className="h-5 w-5" />
                </span>
                <h2 className="font-serif text-2xl text-brand-900">{meta.label}</h2>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <div
                    key={s.codigo}
                    className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-gold-400 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-brand-900">{s.nombre}</h3>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-brand-800 transition group-hover:bg-gold-100 group-hover:text-gold-700">
                        <BenefitIcon name={meta.icon} className="h-4 w-4" />
                      </span>
                    </div>
                    {s.descripcion && <p className="mt-1.5 flex-1 text-sm text-stone-600">{resumen(s.descripcion)}</p>}
                    <div className="mt-4 border-t border-stone-100 pt-3">
                      <a
                        href={`https://wa.me/${waNumero}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20este%20servicio`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-gold-700 hover:underline"
                      >
                        Preguntar por este servicio →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {servicios.length === 0 && <p className="text-stone-500">Pronto publicaremos nuestro catálogo aquí.</p>}
      </div>

      <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl bg-brand-950 px-8 py-10 text-center text-white sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-serif text-xl text-gold-100">¿No encuentras lo que buscas?</p>
          <p className="mt-1 text-sm text-stone-300">Escríbenos y te ayudamos a armar el servicio exacto que tu familia necesita.</p>
        </div>
        <a
          href={`https://wa.me/${waNumero}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20un%20servicio`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
        >
          Escribir por WhatsApp
        </a>
      </div>
    </div>
  )
}
