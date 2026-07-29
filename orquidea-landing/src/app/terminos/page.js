/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/terminos/page.js                                ║
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
  title: 'Términos y condiciones',
  description: 'Términos y condiciones de uso del sitio de Funeraria San José de Ábrego.',
}

const SECCIONES = [
  {
    id: 'aceptacion',
    icon: 'doc',
    titulo: 'Aceptación de los términos',
    cuerpo: (
      <p>
        El acceso y uso de este sitio implica la aceptación plena de estos términos y
        condiciones. Si no estás de acuerdo con ellos, te pedimos no continuar usando el sitio.
      </p>
    ),
  },
  {
    id: 'informacion',
    icon: 'database',
    titulo: 'Información de planes y precios',
    cuerpo: (
      <p>
        La información sobre planes, servicios y precios publicada aquí es de carácter
        informativo y puede variar sin previo aviso. El valor y la cobertura definitivos de cada
        plan quedan formalizados únicamente en el contrato o póliza suscrita con la Funeraria.
      </p>
    ),
  },
  {
    id: 'consulta',
    icon: 'lock',
    titulo: 'Portal de consulta de pólizas',
    cuerpo: (
      <p>
        La consulta de estado de pólizas y contratos requiere el número de documento del titular
        junto con el número de póliza o contrato asociado. El resultado mostrado corresponde a la
        información registrada en nuestro sistema al momento exacto de la consulta.
      </p>
    ),
  },
  {
    id: 'propiedad',
    icon: 'shield',
    titulo: 'Propiedad intelectual',
    cuerpo: (
      <p>
        Todo el contenido, marcas, logotipos, textos e imágenes de este sitio son propiedad de
        Funeraria San José de Ábrego S.A.S. y no pueden ser reproducidos, distribuidos ni
        utilizados con fines comerciales sin autorización previa y escrita.
      </p>
    ),
  },
  {
    id: 'responsabilidad',
    icon: 'scale',
    titulo: 'Limitación de responsabilidad',
    cuerpo: (
      <p>
        Hacemos nuestro mejor esfuerzo para mantener la información de este sitio actualizada y
        disponible, pero no garantizamos la ausencia interrupciones técnicas. Ante cualquier
        discrepancia entre este sitio y tu contrato o póliza, prevalece lo firmado con nosotros.
      </p>
    ),
  },
  {
    id: 'contacto',
    icon: 'mail',
    titulo: 'Dudas sobre estos términos',
    cuerpo: (
      <p>
        Si tienes preguntas sobre estos términos y condiciones, escríbenos a través de los
        canales de la página de{' '}
        <Link href="/contacto" className="font-semibold text-gold-700 hover:underline">Contacto</Link>.
      </p>
    ),
  },
]

export default function TerminosPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <Watermark className="-left-10 bottom-0" />

      {/* Hero */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center fade-in-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <LegalIcon name="scale" className="h-8 w-8" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-gold-700">Legal</p>
          <h1 className="mt-2 font-serif text-4xl text-brand-900">Términos y condiciones</h1>
          <p className="mx-auto mt-4 max-w-xl text-stone-600">
            Reglas claras sobre el uso de este sitio, la información que publicamos y el alcance
            del portal de consulta de pólizas.
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
