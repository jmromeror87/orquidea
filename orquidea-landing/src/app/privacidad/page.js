/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/privacidad/page.js                              ║
 * ║  Versión         : v2.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Link from 'next/link'
import LegalIcon from '@/components/LegalIcons'
import Watermark from '@/components/Watermark'

export const metadata = {
  title: 'Política de privacidad',
  description: 'Política de tratamiento de datos personales de Funeraria San José de Ábrego.',
}

const SECCIONES = [
  {
    id: 'que-datos',
    icon: 'database',
    titulo: '¿Qué datos recolectamos?',
    cuerpo: (
      <>
        <p>
          Únicamente los datos que tú mismo nos entregas de forma voluntaria a través de los
          formularios de este sitio: nombres, número de documento, teléfono, correo electrónico y
          el número de póliza o contrato cuando usas el portal de consulta.
        </p>
        <p>
          No usamos cookies de rastreo publicitario ni compartimos esta información con redes de
          publicidad de terceros.
        </p>
      </>
    ),
  },
  {
    id: 'para-que',
    icon: 'shield',
    titulo: '¿Para qué los usamos?',
    cuerpo: (
      <p>
        Exclusivamente para prestar los servicios exequiales y funerarios solicitados, gestionar
        tu póliza o contrato, y responder tus solicitudes de contacto. No usamos tus datos para
        fines distintos a los aquí descritos sin tu autorización expresa.
      </p>
    ),
  },
  {
    id: 'con-quien',
    icon: 'users',
    titulo: '¿Con quién los compartimos?',
    cuerpo: (
      <p>
        Con nadie fuera de lo estrictamente necesario para prestarte el servicio — por ejemplo,
        aseguradoras aliadas en los planes exequiales que lo requieran. Nunca vendemos ni
        alquilamos tu información a terceros.
      </p>
    ),
  },
  {
    id: 'seguridad',
    icon: 'lock',
    titulo: 'Seguridad de la información',
    cuerpo: (
      <p>
        Tu información se conserva bajo medidas de seguridad razonables (control de acceso,
        cifrado en tránsito) mientras exista una relación contractual o legal vigente, y se
        elimina o anonimiza cuando ya no es necesaria para dichos fines.
      </p>
    ),
  },
  {
    id: 'derechos',
    icon: 'scale',
    titulo: 'Tus derechos como titular',
    cuerpo: (
      <>
        <p>De acuerdo con la Ley 1581 de 2012 y sus decretos reglamentarios, tienes derecho a:</p>
        <ul className="mt-3 space-y-2">
          {[
            'Conocer, actualizar y rectificar tus datos personales.',
            'Solicitar la supresión de tus datos cuando no exista un deber legal de conservarlos.',
            'Revocar en cualquier momento la autorización otorgada para su tratamiento.',
            'Presentar quejas ante la autoridad competente por infracciones a la ley de datos.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 text-gold-600">
                <LegalIcon name="refresh" className="h-4 w-4" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'contacto',
    icon: 'mail',
    titulo: 'Ejercer tus derechos',
    cuerpo: (
      <p>
        Para conocer, actualizar, rectificar o solicitar la supresión de tus datos, escríbenos a
        través de los canales de la página de{' '}
        <Link href="/contacto" className="font-semibold text-gold-700 hover:underline">Contacto</Link>.
      </p>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <Watermark className="-left-10 bottom-0" />

      {/* Hero */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center fade-in-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <LegalIcon name="shield" className="h-8 w-8" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-gold-700">Legal</p>
          <h1 className="mt-2 font-serif text-4xl text-brand-900">Política de tratamiento de datos</h1>
          <p className="mx-auto mt-4 max-w-xl text-stone-600">
            En Funeraria San José de Ábrego S.A.S. respetamos tu privacidad. Aquí te explicamos,
            de forma clara, qué información recolectamos y cómo la protegemos.
          </p>
        </div>
      </div>

      {/* Secciones */}
      <div className="mx-auto max-w-4xl px-5 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {SECCIONES.map((s, i) => (
            <div
              key={s.id}
              style={{ animationDelay: `${i * 70}ms` }}
              className="fade-in-up group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-gold-400 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-900 text-gold-400 transition group-hover:bg-gold-500 group-hover:text-brand-950">
                <LegalIcon name={s.icon} className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-serif text-lg text-brand-900">{s.titulo}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-stone-600">{s.cuerpo}</div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-stone-400">Última actualización: julio de 2026.</p>
      </div>
    </div>
  )
}
