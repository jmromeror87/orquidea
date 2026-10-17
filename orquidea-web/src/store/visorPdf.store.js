/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — visor de documentos (PDF / impresión)           ║
 * ║  Archivo         : store/visorPdf.store.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Los documentos (recibos, contratos, formatos, reportes) NO se descargan:
 * se muestran en un visor dentro del sistema con botón Imprimir. Así no se
 * llena el computador de archivos. Descargar queda como opción secundaria.
 *
 *   verPDF(doc, 'Recibo N° 000086')     ← doc = instancia de jsPDF
 *   verHTML(html, 'Bitácora — Póliza 5') ← documento HTML completo
 */
import { create } from 'zustand'

export const useVisorPdf = create((set, get) => ({
  doc: null,   // { tipo:'pdf', url, nombre, titulo } | { tipo:'html', html, titulo }
  abrir(doc) {
    const prev = get().doc
    if (prev?.url) URL.revokeObjectURL(prev.url)
    set({ doc })
  },
  cerrar() {
    const prev = get().doc
    if (prev?.url) URL.revokeObjectURL(prev.url)
    set({ doc: null })
  },
}))

const limpiar = s => String(s || 'documento').replace(/[\\/:*?"<>|]+/g, '-').trim()

export function verPDF(doc, titulo, nombreArchivo) {
  const url = URL.createObjectURL(doc.output('blob'))
  useVisorPdf.getState().abrir({
    tipo: 'pdf', url, titulo: titulo || 'Documento',
    nombre: `${limpiar(nombreArchivo || titulo).replace(/\.pdf$/i, '')}.pdf`,
  })
}

export function verHTML(html, titulo) {
  useVisorPdf.getState().abrir({ tipo: 'html', html, titulo: titulo || 'Documento' })
}

// Sustituto de window.open('') para los documentos HTML que se armaban con
// w.document.write(…): junta el HTML y al cerrarlo lo muestra en el visor.
// print()/close()/focus() quedan sin efecto (imprime el usuario desde el visor).
export function ventanaDocumento(titulo) {
  let html = ''
  return {
    document: { write: s => { html += s }, close: () => verHTML(html, titulo) },
    print() {}, close() {}, focus() {},
  }
}
