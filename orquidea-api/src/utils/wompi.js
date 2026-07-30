/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pagos en línea — integración Wompi                   ║
 * ║  Archivo         : utils/wompi.js                                       ║
 * ║  Fecha           : 2026-07-30                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import crypto from 'node:crypto'
import { env } from '../config/env.js'

export function wompiConfigurado() {
  return Boolean(env.wompi.publicKey && env.wompi.privateKey && env.wompi.integritySecret)
}

// Firma de integridad requerida por el Web Checkout de Wompi:
// SHA256("<referencia><monto_en_centavos><moneda><secreto_integridad>")
export function firmarIntegridad(referencia, montoEnCentavos, moneda = 'COP') {
  const cadena = `${referencia}${montoEnCentavos}${moneda}${env.wompi.integritySecret}`
  return crypto.createHash('sha256').update(cadena).digest('hex')
}

// Verifica la firma de un evento (webhook) de Wompi.
// Wompi envía: { event, data: { transaction: {...} }, signature: { properties, checksum }, timestamp }
// checksum = SHA256(concat(valores de cada "property" en orden) + timestamp + secreto_eventos)
export function verificarFirmaEvento(body) {
  if (!env.wompi.eventsSecret) return false
  const { signature, timestamp, data } = body || {}
  if (!signature?.properties?.length || !signature?.checksum) return false

  const valores = signature.properties.map(ruta => {
    const partes = ruta.split('.')
    let valor = { data }
    for (const p of partes) valor = valor?.[p]
    return valor
  })

  const cadena = valores.join('') + timestamp + env.wompi.eventsSecret
  const checksumCalculado = crypto.createHash('sha256').update(cadena).digest('hex').toUpperCase()
  return checksumCalculado === String(signature.checksum).toUpperCase()
}

export function construirUrlCheckout({ referencia, montoEnCentavos, redirectUrl, nombreCliente, emailCliente }) {
  const firma = firmarIntegridad(referencia, montoEnCentavos)
  const params = new URLSearchParams({
    'public-key': env.wompi.publicKey,
    currency: 'COP',
    'amount-in-cents': String(montoEnCentavos),
    reference: referencia,
    'signature:integrity': firma,
    'redirect-url': redirectUrl,
  })
  if (nombreCliente) params.set('customer-data:full-name', nombreCliente)
  if (emailCliente)  params.set('customer-data:email', emailCliente)
  return `${env.wompi.checkoutUrl}?${params.toString()}`
}
