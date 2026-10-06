/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : lib/api.js                                          ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function get(path, revalidate = 3600) {
  const res = await fetch(`${API_URL}/api/publico${path}`, { next: { revalidate } })
  if (!res.ok) throw new Error(`API ${path} respondió ${res.status}`)
  const json = await res.json()
  return json.data || []
}

export const getEmpresa = () => get('/empresa')

export async function getWhatsappNumero() {
  const empresa = await getEmpresa()
  const tel = (!Array.isArray(empresa) && empresa?.telefono_1) || '3158786701'
  const digitos = tel.replace(/\D/g, '')
  return digitos.length === 10 ? `57${digitos}` : digitos
}
// ── La página pública NO muestra valores en pesos (decisión de la funeraria) ──
// Los textos de planes/servicios se escriben en el ERP y a veces traen precios
// ("Valor total cubierto: $1.802.926. Cuota mensual sugerida…", "Bono de
// $500.000…"). Se limpian aquí, en el único punto donde la landing recibe esos
// datos, para que ninguna página ni el código fuente los exponga.
const RE_MONTO = /\s*(?:de\s+|por\s+)?\$\s?\d[\d.,]*(?:\s*(?:pesos|COP))?/gi
const RE_FRASE_CON_VALOR = /\$\s?\d|valor\s+total|cuota\s+mensual|precio|\bpesos\b|\bCOP\b/i

// Descripciones: se quitan las frases que hablan de valores
function descripcionSinValores(texto) {
  return texto
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡*])/)
    .filter(frase => !RE_FRASE_CON_VALOR.test(frase))
    .join(' ')
    .replace(RE_MONTO, '')
    .trim()
}

// Nombres y demás textos cortos: solo se quita el monto
const textoSinMontos = t => t.replace(RE_MONTO, '').replace(/\s{2,}/g, ' ').trim()

function sinValores(v, clave = '') {
  if (typeof v === 'string') return /descripcion/i.test(clave) ? descripcionSinValores(v) : textoSinMontos(v)
  if (Array.isArray(v)) return v.map(x => sinValores(x, clave))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sinValores(x, k)]))
  return v
}

export const getPlanes = async () => sinValores(await get('/planes'))
export const getServicios = async () => sinValores(await get('/servicios'))
export const getSedes = () => get('/sedes')
export const getMemoriales = () => get('/memoriales', 300)

export const API_ORIGIN = API_URL

export async function consultarEstado({ numero_documento, numero, tipo }) {
  const res = await fetch(`${API_URL}/api/publico/consultar-estado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero_documento, numero, tipo }),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'No se pudo consultar el estado')
  return json.data
}

export async function iniciarPago({ numero_documento, numero, tipo }) {
  const res = await fetch(`${API_URL}/api/publico/pagos/iniciar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero_documento, numero, tipo }),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'No se pudo iniciar el pago')
  return json.data
}

export async function consultarEstadoPago(referencia) {
  const res = await fetch(`${API_URL}/api/publico/pagos/${referencia}/estado`, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'No se pudo consultar el pago')
  return json.data
}

export async function crearLead({ nombre, correo, telefono, mensaje, origen }) {
  const res = await fetch(`${API_URL}/api/publico/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, correo, telefono, mensaje, origen }),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'No se pudo enviar tu solicitud')
  return json
}

export const cop = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
