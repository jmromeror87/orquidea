/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública — renovar caché                     ║
 * ║  Archivo         : app/api/revalidar/route.js                          ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-10-06                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * El ERP llama aquí cuando cambia un plan, servicio, sede, dato de empresa o
 * memorial. Se vencen de inmediato los datos guardados (tag 'erp') y todas
 * las páginas, para que la siguiente visita ya muestre lo nuevo.
 */
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request) {
  const token = process.env.REVALIDAR_TOKEN
  if (!token || request.headers.get('x-revalidar-token') !== token) {
    return Response.json({ ok: false }, { status: 401 })
  }
  revalidateTag('erp', { expire: 0 })   // vence ya, sin servir la versión vieja
  revalidatePath('/', 'layout')         // y todas las páginas generadas
  return Response.json({ ok: true, ahora: Date.now() })
}
