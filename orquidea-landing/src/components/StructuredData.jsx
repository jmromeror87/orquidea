/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública — SEO                               ║
 * ║  Archivo         : components/StructuredData.jsx                       ║
 * ║  Fecha           : 2026-08-14                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getEmpresa, getSedes } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'

// Ficha JSON-LD tipo FuneralHome — es lo que le permite a Google entender que
// este sitio es el mismo negocio que su Perfil de Negocio / Google Maps, y
// mostrar la ficha rica (dirección, horario, teléfono) en los resultados.
export default async function StructuredData() {
  const [empresa, sedes] = await Promise.all([getEmpresa(), getSedes()])
  if (Array.isArray(empresa) || !empresa?.nombre_comercial) return null

  const principal = Array.isArray(sedes) ? sedes.find(s => s.es_principal) || sedes[0] : null

  const data = {
    '@context': 'https://schema.org',
    '@type': 'FuneralHome',
    name: empresa.nombre_comercial,
    legalName: empresa.razon_social,
    url: SITE_URL,
    telephone: empresa.telefono_1 ? `+57${empresa.telefono_1}` : undefined,
    email: empresa.email,
    address: principal ? {
      '@type': 'PostalAddress',
      streetAddress: principal.direccion,
      addressLocality: principal.municipio,
      addressRegion: principal.departamento,
      addressCountry: 'CO',
    } : undefined,
    openingHoursSpecification: principal?.horario ? [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '08:00', closes: '18:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '08:00', closes: '14:00' },
    ] : undefined,
    priceRange: '$$',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
