/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública — interruptor "sitio en desarrollo"  ║
 * ║  Archivo         : proxy.js                                            ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-10-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Con SITIO_EN_DESARROLLO=true (en .env.local) TODA la página pública muestra
 * el aviso "en desarrollo" (/en-desarrollo), sin importar a qué ruta entren.
 * Para volver a publicar el sitio: SITIO_EN_DESARROLLO=false y reiniciar
 * (`pm2 restart orquidea-landing`) — no hace falta recompilar.
 */
import { NextResponse } from 'next/server'

export function proxy(request) {
  if (process.env.SITIO_EN_DESARROLLO !== 'true') return NextResponse.next()
  if (request.nextUrl.pathname === '/en-desarrollo') return NextResponse.next()

  const res = NextResponse.rewrite(new URL('/en-desarrollo', request.url))
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')   // que Google no indexe el aviso
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export const config = {
  // Todo excepto: /api (aviso del ERP), archivos internos de Next, robots/sitemap
  // y archivos con extensión (logo, imágenes, íconos) que usa el propio aviso.
  matcher: ['/((?!api|_next/static|_next/image|robots.txt|sitemap.xml|.*\\..*).*)'],
}
