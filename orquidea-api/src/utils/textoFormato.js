/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Utilidades — formato uniforme de textos              ║
 * ║  Archivo         : utils/textoFormato.js                                ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * MISMO ARCHIVO en la API (src/utils/textoFormato.js) y en el web: si se
 * cambia uno, copiar al otro. Las reglas:
 *
 *  · nombrePropio("jUAN DE LA cruz-PÉREZ")  → "Juan de la Cruz-Pérez"
 *      Cada palabra con mayúscula inicial y el resto en minúscula (aunque
 *      se haya escrito con BLOQ MAYÚS); partículas (de, del, la, y…) en
 *      minúscula salvo al inicio.
 *  · tituloRespetando("FUNERARIA san josé S.A.S") → "FUNERARIA San José S.A.S"
 *      Mayúscula inicial en cada palabra sin tocar lo demás (razón social,
 *      siglas).
 *  · frase("se recogió el cuerpo. la familia…") → "Se recogió el cuerpo. La familia…"
 *      Mayúscula al inicio y después de . ! ? o salto de línea; no cambia
 *      el resto (respeta siglas como EPS, NIT).
 *  · sinTildes / coincide: búsqueda que ignora mayúsculas, tildes y el
 *      orden de las palabras ("ana pena" encuentra "Peña Ana").
 */

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'con', 'por', 'para', 'da', 'das', 'do', 'dos', 'di', 'van', 'von', 'der'])

const LETRA = /\p{L}/u

const capInicial = w => w.charAt(0).toLocaleUpperCase('es-CO') + w.slice(1)

// Mayúscula en cada letra que inicia palabra (tras espacio, guion, apóstrofo,
// paréntesis o punto); minúscula en el resto.
function capPalabra(w) {
  let out = '', nueva = true
  for (const ch of w) {
    if (LETRA.test(ch)) { out += nueva ? ch.toLocaleUpperCase('es-CO') : ch.toLocaleLowerCase('es-CO'); nueva = false }
    else { out += ch; nueva = /[-'’(.\/]/.test(ch) }
  }
  return out
}

export function nombrePropio(texto) {
  if (texto == null) return texto
  const s = String(texto)
  let primera = true
  // Se conserva el espaciado tal cual (importante mientras se escribe)
  return s.split(/(\s+)/).map(tok => {
    if (!tok || /^\s+$/.test(tok)) return tok
    const bajo = tok.toLocaleLowerCase('es-CO')
    const r = (!primera && PARTICULAS.has(bajo)) ? bajo : capPalabra(tok)
    primera = false
    return r
  }).join('')
}

export function tituloRespetando(texto) {
  if (texto == null) return texto
  let primera = true
  return String(texto).split(/(\s+)/).map(tok => {
    if (!tok || /^\s+$/.test(tok)) return tok
    const r = (!primera && PARTICULAS.has(tok)) ? tok : capInicial(tok)
    primera = false
    return r
  }).join('')
}

export function frase(texto) {
  if (texto == null) return texto
  let out = '', subir = true, palabra = ''
  for (const ch of String(texto)) {
    if (LETRA.test(ch)) {
      out += subir ? ch.toLocaleUpperCase('es-CO') : ch
      subir = false; palabra += ch; continue
    }
    out += ch
    if (/\p{N}/u.test(ch)) { subir = false; palabra = ''; continue }
    if (ch === '\n' || ch === '!' || ch === '?') subir = true
    // Tras punto solo si cierra una palabra de 3+ letras: así "p. m.",
    // "Sr." o "No." no fuerzan mayúscula en lo que sigue.
    else if (ch === '.') subir = palabra.length >= 3
    palabra = ''
  }
  return out
}

// ── Búsqueda ────────────────────────────────────────────────────────────────
export const sinTildes = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// true si TODAS las palabras buscadas aparecen (en cualquier orden) en alguno de los textos
export function coincide(busqueda, ...textos) {
  const palabras = sinTildes(busqueda).trim().split(/\s+/).filter(Boolean)
  if (!palabras.length) return true
  const hay = sinTildes(textos.flat().filter(v => v != null).join(' '))
  return palabras.every(p => hay.includes(p))
}
