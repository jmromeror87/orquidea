/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/ConfianzaSection.jsx                     ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Image from 'next/image'
import { getPlanes, getSedes, getWhatsappNumero } from '@/lib/api'
import BenefitIcon from './BenefitIcons'

const EQUIPO = [
  { src: '/asesora-lina-avatar.png', alt: 'Asesora de Planes Exequiales' },
  { src: '/asesora-lina-ortiz.png', alt: 'Asesora de Planes Exequiales' },
  { src: '/equipo-asesora3.png', alt: 'Asesora de Planes Exequiales' },
]

export default async function ConfianzaSection() {
  const [planes, sedes, waNumero] = await Promise.all([getPlanes(), getSedes(), getWhatsappNumero()])

  const STATS = [
    { icon: 'escudo', valor: '20+', label: 'Años de experiencia' },
    { icon: 'pin', valor: String(sedes.length || 3), label: 'Sedes donde nos encuentras' },
    { icon: 'telefono', valor: '24/7', label: 'Disponibilidad' },
    { icon: 'documento', valor: String(planes.length || 4), label: 'Planes exequiales a tu medida' },
  ]

  return (
    <section className="relative isolate">
      {/* Foto de familia con degradado */}
      <div className="relative h-[380px] w-full overflow-hidden sm:h-[440px]">
        <Image
          src="/familia-hq.png"
          alt="Familias que confían en Funeraria San José de Ábrego"
          fill
          quality={100}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-950/50 to-brand-950/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-20 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">Nuestro compromiso</p>
          <h2 className="mt-2 max-w-2xl font-serif text-3xl sm:text-4xl">
            Familias que confían en nosotros
          </h2>
          <p className="mt-3 max-w-xl text-sm text-stone-200 sm:text-base">
            Acompañamos a generaciones enteras en los momentos más difíciles, con la misma cercanía
            de siempre.
          </p>
        </div>
      </div>

      {/* Estadísticas flotantes */}
      <div className="relative z-10 mx-auto -mt-12 max-w-5xl px-5">
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-6 shadow-xl sm:grid-cols-4 sm:p-8">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-900 text-gold-400">
                <BenefitIcon name={s.icon} className="h-5 w-5" />
              </span>
              <p className="mt-2 font-serif text-2xl text-brand-900">{s.valor}</p>
              <p className="text-xs text-stone-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Equipo de asesoras */}
      <div className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Nuestro equipo</p>
        <h3 className="mt-2 font-serif text-2xl text-brand-900 sm:text-3xl">
          Asesoras listas para acompañarte
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-stone-600">
          Un equipo humano, cercano y capacitado para resolver tus dudas sobre planes exequiales.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          {EQUIPO.map((a, i) => (
            <div
              key={a.src}
              className="h-24 w-24 overflow-hidden rounded-full border-4 border-gold-400/60 shadow-md transition hover:scale-105 hover:border-gold-500 sm:h-28 sm:w-28"
            >
              <Image
                src={a.src}
                alt={a.alt}
                width={160}
                height={160}
                quality={100}
                className="h-full w-full object-cover"
                style={{ objectPosition: i === 2 ? 'center 20%' : 'center' }}
              />
            </div>
          ))}
        </div>

        <a
          href={`https://wa.me/${waNumero}?text=Hola%2C%20quiero%20hablar%20con%20una%20asesora`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
        >
          Habla con una asesora ahora
        </a>
      </div>
    </section>
  )
}
