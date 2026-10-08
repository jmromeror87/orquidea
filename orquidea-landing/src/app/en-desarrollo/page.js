/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública — aviso "sitio en desarrollo"        ║
 * ║  Archivo         : app/en-desarrollo/page.js                           ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-10-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Lo que se ve mientras SITIO_EN_DESARROLLO=true (ver src/proxy.js). Cubre la
 * pantalla completa por encima del menú, el pie y los botones flotantes del
 * layout general, para que no quede ningún enlace al sitio en pruebas.
 */
import { getEmpresa } from '@/lib/api'

export const metadata = {
  title: { absolute: 'Funeraria San José de Ábrego — Sitio en desarrollo' },
  robots: { index: false, follow: false },
}

const soloDigitos = (s) => (s || '').replace(/\D/g, '')

export default async function EnDesarrolloPage() {
  const empresaRaw = await getEmpresa().catch(() => null)
  const empresa = empresaRaw && !Array.isArray(empresaRaw) ? empresaRaw : null
  const telefono = empresa?.telefono_1 || '3158786701'
  const tel = soloDigitos(telefono)
  const telIntl = tel.length === 10 ? `57${tel}` : tel
  const nombre = empresa?.nombre_comercial || 'Funeraria San José de Ábrego'

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-brand-950 text-white">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-6 py-14 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt={nombre} className="h-28 w-28 rounded-full border-4 border-gold-500 bg-white object-contain p-1" />

        <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold-500/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
          Sitio en desarrollo
        </span>

        <h1 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl">
          Estamos renovando nuestra página
        </h1>
        <p className="mt-5 max-w-lg text-base text-white/75">
          Muy pronto tendrás aquí una nueva experiencia para conocer nuestros planes exequiales y
          servicios. Mientras tanto, seguimos atendiéndote como siempre, las 24 horas del día.
        </p>

        <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <a
            href={`tel:+${telIntl}`}
            className="rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
          >
            Llámanos 24h · {telefono}
          </a>
          <a
            href={`https://wa.me/${telIntl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold transition hover:bg-white/10"
          >
            Escríbenos por WhatsApp
          </a>
        </div>

        {empresa?.email && <p className="mt-8 text-sm text-white/60">{empresa.email}</p>}

        <p className="mt-14 text-xs text-white/40">
          © {new Date().getFullYear()} {empresa?.razon_social || 'Funeraria San José de Ábrego S.A.S.'}
          {' · '}
          <a href="https://app.funerariasanjoseabrego.com/login" className="underline-offset-4 hover:text-white/70 hover:underline">
            Acceso colaboradores
          </a>
        </p>
      </div>
    </div>
  )
}
