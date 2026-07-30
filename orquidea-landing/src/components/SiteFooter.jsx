/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/SiteFooter.jsx                           ║
 * ║  Versión         : v2.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Link from 'next/link'
import Image from 'next/image'
import { getPlanes, getServicios, getEmpresa, getWhatsappNumero } from '@/lib/api'
import SocialIcons from './SocialIcons'

export default async function SiteFooter() {
  const [planes, servicios, empresaRaw, waNumero] = await Promise.all([
    getPlanes(), getServicios(), getEmpresa(), getWhatsappNumero(),
  ])
  const empresa = Array.isArray(empresaRaw) ? null : empresaRaw
  const telefono = empresa?.telefono_1 || '3158786701'
  const telHref = telefono.replace(/\D/g, '')
  const categoriasServicio = [...new Set(servicios.map((s) => s.categoria))].slice(0, 6)

  const CATEGORIAS = {
    ATAUD: 'Ataúdes', URNA: 'Urnas', TRASLADO: 'Traslados', SALA_VELACION: 'Salas de velación',
    DOCUMENTOS: 'Trámites y documentos', CREMACION: 'Cremación', INHUMACION: 'Inhumación',
    PREPARACION: 'Preparación', FLORES: 'Arreglos florales', ADICIONAL: 'Servicios adicionales',
    GENERAL: 'Generales',
  }

  return (
    <footer className="mt-auto border-t border-stone-800 bg-brand-950 text-stone-400">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Marca */}
          <div className="lg:col-span-2">
            <Image src="/logo.jpg" alt="Funeraria San José de Ábrego" width={64} height={64} quality={100} className="rounded-full" />
            <p className="mt-3 font-serif text-xl text-gold-100">Funeraria San José de Ábrego</p>
            <p className="mt-2 max-w-sm text-sm">
              Acompañamos a las familias con respeto, cercanía y disponibilidad las 24 horas del
              día, los 365 días del año.
            </p>
            <SocialIcons className="mt-5" whatsapp={waNumero} />
            <a
              href={`tel:+57${telHref}`}
              className="mt-6 inline-block rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
            >
              📞 {telefono} — Línea 24h
            </a>
          </div>

          {/* Planes */}
          <div>
            <p className="text-sm font-semibold text-stone-200">Planes exequiales</p>
            <ul className="mt-3 space-y-2 text-sm">
              {planes.slice(0, 6).map((p) => (
                <li key={p.codigo}>
                  <Link href={`/planes/${p.codigo}`} className="hover:text-gold-400">{p.nombre}</Link>
                </li>
              ))}
              <li>
                <Link href="/planes" className="font-semibold text-gold-400 hover:underline">Ver todos →</Link>
              </li>
            </ul>
          </div>

          {/* Servicios */}
          <div>
            <p className="text-sm font-semibold text-stone-200">Servicios</p>
            <ul className="mt-3 space-y-2 text-sm">
              {categoriasServicio.map((cat) => (
                <li key={cat}>
                  <Link href="/servicios" className="hover:text-gold-400">{CATEGORIAS[cat] || cat}</Link>
                </li>
              ))}
              <li>
                <Link href="/servicios" className="font-semibold text-gold-400 hover:underline">Ver todos →</Link>
              </li>
            </ul>
          </div>

          {/* Enlaces de interés */}
          <div>
            <p className="text-sm font-semibold text-stone-200">Enlaces de interés</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/sedes" className="hover:text-gold-400">Nuestras sedes</Link></li>
              <li><Link href="/consultar" className="hover:text-gold-400">Consultar mi póliza</Link></li>
              <li><Link href="/contacto" className="hover:text-gold-400">Contacto</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-stone-800 pt-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Funeraria San José de Ábrego S.A.S. Todos los derechos reservados.</p>
          <div className="flex gap-5">
            <Link href="/privacidad" className="hover:text-gold-400">Política de privacidad</Link>
            <Link href="/terminos" className="hover:text-gold-400">Términos y condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
