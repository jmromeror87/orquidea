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
  if (!res.ok) return []
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
export const getPlanes = () => get('/planes')
export const getServicios = () => get('/servicios')
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
