/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — mayúsculas automáticas al escribir              ║
 * ║  Archivo         : utils/capitalizarEnVivo.js                           ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Formatea el texto MIENTRAS se escribe en TODOS los campos del sistema, sin
 * tocar cada formulario: un solo escuchador global (instalado en main.jsx).
 *
 * Qué regla aplica a cada campo (por su etiqueta / placeholder / nombre):
 *   · persona  → nombrePropio      Nombres, apellidos, cónyuge, padre, madre…
 *   · lugar    → tituloRespetando  Razón social, iglesia, lugar, vereda… (respeta siglas)
 *   · frase    → frase             Todo lo demás: observaciones, notas, motivos…
 *   · ninguna  → buscadores, correos, contraseñas, códigos, documentos,
 *                números, teléfonos, valores, tokens, URLs…
 * Se puede forzar en un campo con data-cap="persona|lugar|frase|no".
 *
 * Técnica: el texto cambia solo de mayúsculas/minúsculas (misma longitud),
 * así que el cursor no se mueve. Se usa el "setter" nativo del input para que
 * React reciba el valor ya formateado en su onChange.
 */
import { nombrePropio, tituloRespetando, frase } from './textoFormato.js'

const NO = /busc|filtr|e-?mail|correo|usuario|contrase|password|clave|token|smtp|servidor|puerto|phone|\burl\b|enlace|link|sitio web|web\b|sku|c[oó]digo|referencia|\bnit\b|documento|c[eé]dula|n[uú]mero|n\.?\s?°|\bnro\b|\bno\.\s|placa|cuenta|\bpuc\b|tel[eé]f|celular|whatsapp|sigla|prefijo|registro|permiso|licencia|[ií]cono|color|hora|fecha|valor|precio|costo|cantidad|stock|tasa|porcentaje|monto|abono|cuota|orden\b|plantilla|@|aprobaci|autorizaci[oó]n n|serial|lote n|factura/i
const PERSONA = /apellido|nombres\b|barrio|vereda|nombre completo|primer nombre|segundo nombre|c[oó]nyuge|esposa?\b|padre\b|madre\b|nombre del (titular|contacto|responsable|difunto|fallecido|beneficiario|familiar|conductor|sacerdote|m[eé]dico|declarante)|sacerdote|m[eé]dico tratante|declarante|acompañante|contacto de emergencia/i
const LUGAR = /raz[oó]n social|iglesia|parroquia|cementerio|lugar|hospital|cl[ií]nica|coro\b|empresa|entidad|aseguradora|eps\b|ocupaci|profesi|cargo\b/i

const TIPOS_TEXTO = new Set(['text', '', 'textarea'])

// La ETIQUETA visible manda; el placeholder (que suele traer ejemplos como
// "Ej.: Hospital Regional") solo se usa si el campo no tiene etiqueta.
function etiquetaDe(el) {
  let label = el.labels?.length ? el.labels[0].textContent : ''
  if (!label) {
    // Patrón común: <div><label>Nombres</label><input/></div>
    let p = el.parentElement
    for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
      const campos = p.querySelectorAll('input, textarea, select')
      const lab = p.querySelector(':scope > label, :scope > span.pld-label, :scope > .lbl')
      if (lab && campos.length === 1) { label = lab.textContent; break }
      if (campos.length > 1) break
    }
  }
  const nombreTecnico = [el.getAttribute('aria-label'), el.name, el.id].filter(Boolean).join(' · ')
  return label ? `${label} · ${nombreTecnico}` : [nombreTecnico, el.placeholder, el.title].filter(Boolean).join(' · ')
}

function reglaDe(el) {
  if (el.readOnly || el.disabled) return null
  if (el.closest('[contenteditable="true"], .tiptap')) return null
  const tipo = el.tagName === 'TEXTAREA' ? 'textarea' : (el.getAttribute('type') || '').toLowerCase()
  if (!TIPOS_TEXTO.has(tipo)) return null
  if (['numeric', 'decimal', 'tel', 'email', 'url', 'search'].includes(el.inputMode)) return null
  const forzada = el.dataset?.cap
  if (forzada) return forzada === 'no' ? null : forzada
  const desc = etiquetaDe(el)
  if (/busc|filtr/i.test(desc) || el.type === 'search') return null   // los buscadores nunca
  if (PERSONA.test(desc)) return 'persona'
  if (NO.test(desc)) return null
  if (LUGAR.test(desc)) return 'lugar'
  return 'frase'
}

const FORMATOS = { persona: nombrePropio, lugar: tituloRespetando, frase }

const setterInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
const setterArea = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set

function alEscribir(e) {
  const el = e.target
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
  if (e.isComposing) return
  const regla = reglaDe(el)
  const fmt = regla && FORMATOS[regla]
  if (!fmt) return
  const antes = el.value
  const despues = fmt(antes)
  if (despues === antes || despues.length !== antes.length) return
  const { selectionStart: a, selectionEnd: b } = el
  ;(el instanceof HTMLTextAreaElement ? setterArea : setterInput).call(el, despues)
  try { el.setSelectionRange(a, b) } catch { /* algunos tipos no admiten selección */ }
}

let instalado = false
export function instalarCapitalizacion() {
  if (instalado || typeof document === 'undefined') return
  instalado = true
  // Fase de captura en document: corre ANTES que el onChange de React
  document.addEventListener('input', alEscribir, true)
  document.addEventListener('compositionend', alEscribir, true)
}
