/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing pública — aviso de cambios                   ║
 * ║  Archivo         : landing.service.js                                   ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-06                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * La landing (Next.js) guarda en caché planes, servicios, sedes, empresa y
 * memoriales. Cuando el ERP cambia algo de eso, le avisa para que borre su
 * caché y la siguiente visita ya muestre el dato nuevo — sin esperar la hora
 * de revalidación.
 *
 * Fuego y olvido: si la landing no responde, el guardado en el ERP NO falla
 * (la caché de la landing igual se renueva sola cada hora).
 */
import { env } from '../config/env.js'

// Rutas del ERP cuyo cambio se ve en la página pública
const RUTAS_PUBLICAS = [
  '/api/polizas/planes',   // planes (y sus servicios incluidos)
  '/api/empresa',          // datos de empresa, sedes y catálogo de servicios
  '/api/memoriales',
]

export const afectaLanding = url => RUTAS_PUBLICAS.some(r => url.startsWith(r))

// Varios guardados seguidos (p. ej. plan + sus ítems) = un solo aviso
let pendiente = null
export function avisarLanding(log) {
  if (!env.landing.url || !env.landing.token) return
  clearTimeout(pendiente)
  pendiente = setTimeout(async () => {
    try {
      const res = await fetch(`${env.landing.url}/api/revalidar`, {
        method: 'POST',
        headers: { 'x-revalidar-token': env.landing.token },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) log?.warn(`Landing: revalidación respondió ${res.status}`)
    } catch (err) {
      log?.warn({ err: err.message }, 'Landing: no se pudo avisar el cambio')
    }
  }, 1500)
}
