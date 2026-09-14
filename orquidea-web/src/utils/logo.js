/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Logo de empresa — carga para PDF (jsPDF)             ║
 * ║  Archivo         : logo.js                                             ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-12                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * jsPDF necesita la imagen ya en base64 (o un elemento Image cargado) para
 * poder dibujarla con doc.addImage() — no acepta una URL directamente. Los
 * documentos impresos vía window.print() (HTML) no necesitan esto: ahí basta
 * un <img src="..."> normal, el navegador la carga solo.
 */
const cache = new Map()

export async function getLogoDataUrl(logoUrl) {
  if (!logoUrl) return null
  if (cache.has(logoUrl)) return cache.get(logoUrl)

  try {
    const url = logoUrl.startsWith('http') ? logoUrl : `http://localhost:3001${logoUrl}`
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    cache.set(logoUrl, dataUrl)
    return dataUrl
  } catch {
    return null // sin logo, el documento sigue generándose igual (solo texto)
  }
}

// Dibuja el logo en la esquina superior izquierda del PDF, manteniendo su
// proporción original dentro de un cuadro máximo de maxW x maxH (mm).
export function dibujarLogoPDF(doc, dataUrl, x, y, maxW, maxH) {
  if (!dataUrl) return null
  try {
    const props = doc.getImageProperties(dataUrl)
    const ratio = Math.min(maxW / props.width, maxH / props.height)
    const w = props.width * ratio
    const h = props.height * ratio
    doc.addImage(dataUrl, props.fileType || 'PNG', x, y, w, h)
    return { w, h }
  } catch {
    return null
  }
}
