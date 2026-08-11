/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Geocodificación y ruteo (traslados) — OpenStreetMap  ║
 * ║  Archivo         : geo.controller.js                                    ║
 * ║  Fecha           : 2026-08-11                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
const NOMINATIM_UA = 'OrquideaERP/1.0 (funeraria san jose de abrego)'

async function geocode(direccion) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(direccion)}`
  const r = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } })
  if (!r.ok) return null
  const rows = await r.json()
  if (!rows.length) return null
  return { lat: +rows[0].lat, lon: +rows[0].lon, nombre: rows[0].display_name }
}

// GET /geo/ruta?origen=...&destino=...
export async function ruta(req, reply) {
  const { origen, destino } = req.query
  if (!origen || !destino)
    return reply.code(400).send({ data:null, error:'origen y destino son requeridos' })

  const [pOrigen, pDestino] = await Promise.all([geocode(origen), geocode(destino)])
  if (!pOrigen) return reply.code(404).send({ data:null, error:`No se pudo ubicar la dirección de origen: "${origen}"` })
  if (!pDestino) return reply.code(404).send({ data:null, error:`No se pudo ubicar la dirección de destino: "${destino}"` })

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pOrigen.lon},${pOrigen.lat};${pDestino.lon},${pDestino.lat}?overview=full&geometries=geojson`
  const rOsrm = await fetch(osrmUrl)
  if (!rOsrm.ok) return reply.code(502).send({ data:null, error:'No se pudo calcular la ruta' })
  const osrm = await rOsrm.json()
  const route = osrm.routes?.[0]
  if (!route) return reply.code(404).send({ data:null, error:'No se encontró una ruta entre esos puntos' })

  return reply.send({
    data: {
      origen:  { lat: pOrigen.lat,  lon: pOrigen.lon,  nombre: pOrigen.nombre },
      destino: { lat: pDestino.lat, lon: pDestino.lon, nombre: pDestino.nombre },
      geometria: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      distancia_km: +(route.distance / 1000).toFixed(1),
      duracion_min: Math.round(route.duration / 60),
    },
    error: null,
  })
}
