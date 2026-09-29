/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : URL de archivos subidos (/uploads)                  ║
 * ║  Archivo         : archivoUrl.js                                       ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Arma la URL absoluta de un archivo guardado por la API (logos, soportes,
 * fotos, documentos). NUNCA escribir "http://localhost:3001" a mano: en
 * producción VITE_API_URL es "/api" y los archivos se sirven desde el mismo
 * dominio. Se usa URL absoluta (con window.location.origin) para que también
 * funcione dentro de las ventanas de impresión abiertas con window.open().
 */
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '')

export const ARCHIVOS_ORIGIN = API_ORIGIN || window.location.origin

export function archivoUrl(ruta) {
  if (!ruta) return ''
  if (/^(https?:|data:|blob:)/.test(ruta)) return ruta
  return `${ARCHIVOS_ORIGIN}${ruta.startsWith('/') ? '' : '/'}${ruta}`
}
