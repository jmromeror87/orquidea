/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Bitácora — estilos del texto enriquecido             ║
 * ║  Archivo         : components/bitacora/prosa.js                         ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Mismo aspecto del texto en el editor, en la línea de tiempo y al imprimir.
 */
import { ARCHIVOS_ORIGIN } from '../../utils/archivoUrl.js'

export const CSS_PROSA = `
.bt-prosa { font-size:13.5px; line-height:1.6; color:#1f2937; overflow-wrap:anywhere; }
.bt-prosa > :first-child, .bt-prosa .tiptap > :first-child { margin-top:0; }
.bt-prosa > :last-child, .bt-prosa .tiptap > :last-child { margin-bottom:0; }
.bt-prosa p { margin:0 0 8px; }
.bt-prosa h1 { font-size:20px; font-weight:800; margin:14px 0 8px; color:#0f172a; }
.bt-prosa h2 { font-size:17px; font-weight:800; margin:12px 0 6px; color:#0f172a; }
.bt-prosa h3 { font-size:15px; font-weight:700; margin:10px 0 6px; color:#0f172a; }
.bt-prosa ul, .bt-prosa ol { padding-left:24px; margin:0 0 8px; }
.bt-prosa li > p { margin:0 0 2px; }
.bt-prosa ul[data-type="taskList"] { list-style:none; padding-left:2px; }
.bt-prosa ul[data-type="taskList"] li { display:flex; gap:8px; align-items:flex-start; }
.bt-prosa ul[data-type="taskList"] li > label { margin-top:3px; flex-shrink:0; }
.bt-prosa ul[data-type="taskList"] li > div { flex:1; }
.bt-prosa ul[data-type="taskList"] li[data-checked="true"] > div { color:#94a3b8; text-decoration:line-through; }
.bt-prosa input[type="checkbox"] { accent-color:#059669; width:14px; height:14px; }
.bt-prosa blockquote { margin:0 0 8px; padding:8px 14px; border-left:4px solid #10b981; background:#f0fdf4; border-radius:0 8px 8px 0; color:#065f46; }
.bt-prosa hr { border:none; border-top:2px solid #e5e7eb; margin:14px 0; }
.bt-prosa a { color:#2563eb; text-decoration:underline; }
.bt-prosa mark { border-radius:3px; padding:0 2px; }
.bt-prosa img { max-width:100%; height:auto; border-radius:8px; margin:6px 0; display:block; }
.bt-prosa table { border-collapse:collapse; width:100%; margin:6px 0 10px; table-layout:fixed; }
.bt-prosa th, .bt-prosa td { border:1px solid #d1d5db; padding:6px 8px; vertical-align:top; }
.bt-prosa th { background:#f1f5f9; font-weight:700; text-align:left; }
.bt-prosa code { background:#f1f5f9; border-radius:4px; padding:1px 4px; font-size:12.5px; }
`

// Las imágenes se guardan con ruta relativa (/uploads/bitacora/…); para
// mostrarlas se les pone el dominio de la API (local o producción).
export const conImagenesAbsolutas = html =>
  String(html || '').replace(/(<img\b[^>]*\bsrc=")(\/uploads\/)/g, `$1${ARCHIVOS_ORIGIN}$2`)
