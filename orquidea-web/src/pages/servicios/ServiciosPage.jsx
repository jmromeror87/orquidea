/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios                                       ║
 * ║  Archivo         : ServiciosPage.jsx                               ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
mapboxgl.accessToken = MAPBOX_TOKEN
import {
  Package, PackagePlus, Search, RefreshCw, X, Loader2,
  ChevronLeft, ChevronRight, User, Phone, Calendar,
  AlertTriangle, CheckCircle2, Clock, Ban, Edit2, Eye,
  Truck, MapPin, FileText, ScrollText, Printer, Pencil, Trash2, Plus,
  UserSquare2, Stethoscope, Handshake, Briefcase, Landmark,
  Wrench, PackageSearch, ClipboardList, Users, UserPlus, UserMinus,
} from 'lucide-react'
import api from '../../services/api.js'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'
import PhoneInput from '../../components/ui/PhoneInput.jsx'
import { useAuthStore } from '../../store/auth.store.js'
import { toast } from '../../store/toast.store.js'

// ── Carroza fúnebre SVG ───────────────────────────────────────────────────────
const HearseIcon = ({ size = 22, color = '#374151' }) => (
  <svg width={size} height={size * 0.55} viewBox="0 0 64 35" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Carrocería principal */}
    <rect x="2" y="8" width="52" height="18" rx="3" fill={color}/>
    {/* Cabina conductor */}
    <rect x="46" y="11" width="14" height="15" rx="2" fill={color}/>
    {/* Ventana cabina */}
    <rect x="48" y="13" width="10" height="8" rx="1.5" fill="white" opacity="0.35"/>
    {/* Ventana lateral (ataúd visible) */}
    <rect x="6" y="11" width="36" height="10" rx="1.5" fill="white" opacity="0.18"/>
    {/* Cruz en ventana */}
    <rect x="22" y="12.5" width="1.8" height="7" rx=".9" fill="white" opacity="0.6"/>
    <rect x="19.5" y="15" width="6.5" height="1.8" rx=".9" fill="white" opacity="0.6"/>
    {/* Rueda trasera */}
    <circle cx="14" cy="28" r="6" fill={color}/>
    <circle cx="14" cy="28" r="3" fill="white" opacity="0.3"/>
    {/* Rueda delantera */}
    <circle cx="50" cy="28" r="6" fill={color}/>
    <circle cx="50" cy="28" r="3" fill="white" opacity="0.3"/>
    {/* Parachoque delantero */}
    <rect x="58" y="20" width="4" height="4" rx="1" fill={color} opacity="0.7"/>
    {/* Línea decorativa lateral */}
    <rect x="4" y="22" width="42" height="1.5" rx=".75" fill="white" opacity="0.25"/>
  </svg>
)

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('es-CO',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'})
  : '—'
const fmtDT = (d) => d
  ? new Date(d).toLocaleString('es-CO',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})
  : '—'

const ESTADO_META = {
  RECIBIDO:   { label:'Recibido',   color:'#6366F1', bg:'#EEF2FF', Icon: Clock },
  EN_CURSO:   { label:'En curso',   color:'#F59E0B', bg:'#FEF3C7', Icon: Loader2 },
  COMPLETADO: { label:'Completado', color:'#059669', bg:'#D1FAE5', Icon: CheckCircle2 },
  CANCELADO:  { label:'Cancelado',  color:'#EF4444', bg:'#FEE2E2', Icon: Ban },
}

const DISPOSICION_META = {
  INHUMACION: { label:'Inhumación', icon:'⚰️', color:'#64748B' },
  CREMACION:  { label:'Cremación',  icon:'🔥', color:'#EF4444' },
  OSARIO:     { label:'Osario',     icon:'🪦', color:'#78716C' },
}

// ── Origen del servicio (por cuál camino se creó) ─────────────────────────
const ORIGEN_META = {
  POLIZA:   { label:'Póliza',   icon:'🛡️', color:'#7C3AED', bg:'#F5F3FF', border:'#C4B5FD' },
  CONVENIO: { label:'Convenio', icon:'🤝', color:'#0891B2', bg:'#ECFEFF', border:'#A5F3FC' },
  CONTRATO: { label:'Contrato', icon:'📋', color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  DIRECTO:  { label:'Directo',  icon:'⚡', color:'#6B7280', bg:'#F3F4F6', border:'#D1D5DB' },
}
function origenServicio(s) {
  if (s?.poliza_id)   return 'POLIZA'
  if (s?.convenio_id) return 'CONVENIO'
  if (s?.contrato_id) return 'CONTRATO'
  return 'DIRECTO'
}
function OrigenChip({ servicio }) {
  const tipo = origenServicio(servicio)
  const m = ORIGEN_META[tipo]
  const detalle = tipo === 'POLIZA'   && servicio?.poliza_numero   ? `#${servicio.poliza_numero}`
    : tipo === 'CONTRATO' && servicio?.contrato_numero ? `#${servicio.contrato_numero}`
    : tipo === 'CONVENIO' && servicio?.convenio_nombre ? servicio.convenio_nombre
    : ''
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:m.bg,
      color:m.color, border:`1px solid ${m.border}`, borderRadius:20, padding:'3px 10px',
      fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      <span>{m.icon}</span> {m.label}{detalle ? ` ${detalle}` : ''}
    </span>
  )
}

const DURACION_TANATOPRAXIA_HORAS = { BASICA:2, EMBALSAMAMIENTO:5, RESTAURACION:8, ESPECIAL:10 }

const TRASLADO_TIPOS = ['RECOGIDA','SALA_VELACION','CEMENTERIO','CREMATORIO','OTRO']
const TRASLADO_LABEL = {
  RECOGIDA:'Recogida del cuerpo', SALA_VELACION:'A sala de velación',
  CEMENTERIO:'Al cementerio', CREMATORIO:'Al crematorio', OTRO:'Otro traslado',
}

// ── Autocompletar direcciones (Mapbox Geocoding) ────────────────────────────
// Sesgado a la zona de operación de la funeraria (Ábrego / Ocaña, Norte de Santander)
// para que las primeras sugerencias sean relevantes.
const MAPBOX_PROXIMITY = '-73.2264,8.0725' // Ábrego, N. de Santander
function MapboxAddressInput({ value, onSelect, placeholder }) {
  const [texto,   setTexto]   = useState(value || '')
  const [sugs,    setSugs]    = useState([])
  const [abierto, setAbierto] = useState(false)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => { setTexto(value || '') }, [value])

  useEffect(() => {
    if (!texto || texto.length < 3 || !MAPBOX_TOKEN) { setSugs([]); return }
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(() => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(texto)}.json` +
        `?access_token=${MAPBOX_TOKEN}&country=co&language=es&limit=5&proximity=${MAPBOX_PROXIMITY}`
      fetch(url).then(r => r.json()).then(d => {
        if (cancelado) return
        setSugs(d.features || [])
        setAbierto(true)
      }).catch(() => {}).finally(() => { if (!cancelado) setBuscando(false) })
    }, 350)
    return () => { cancelado = true; clearTimeout(t) }
  }, [texto])

  const elegir = (f) => {
    setTexto(f.place_name)
    setAbierto(false); setSugs([])
    onSelect({ texto: f.place_name, lat: f.center[1], lon: f.center[0] })
  }

  return (
    <div style={{ position:'relative' }}>
      <input value={texto}
        onChange={e => { setTexto(e.target.value); onSelect({ texto: e.target.value, lat:null, lon:null }) }}
        onFocus={() => sugs.length && setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder}/>
      {buscando && (
        <Loader2 size={13} className="sv-spin" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
      )}
      {abierto && sugs.length > 0 && (
        <div style={{ position:'absolute', zIndex:20, top:'100%', left:0, right:0, marginTop:4,
          background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:10, overflow:'hidden',
          boxShadow:'0 8px 20px rgba(0,0,0,.08)', maxHeight:220, overflowY:'auto' }}>
          {sugs.map(f => (
            <div key={f.id} onMouseDown={() => elegir(f)}
              style={{ padding:'9px 12px', fontSize:12.5, cursor:'pointer', borderBottom:'1px solid #F4F5FA' }}
              onMouseEnter={e => e.currentTarget.style.background='#F5F3FF'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
              {f.place_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Mapa 3D de ruta del traslado (Mapbox GL — tráfico en tiempo real) ──────────
const REFRESCO_TRAFICO_MS = 60_000 // recalcula tiempo/tráfico cada minuto, como Google Maps

function MapaRuta({ origen, destino, origenLat, origenLon, destinoLat, destinoLon, vehiculoPlaca, conductorNombre }) {
  const [ruta,     setRuta]     = useState(null)
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const mapRef  = useRef(null)
  const elRef   = useRef(null)
  const puntosRef = useRef(null) // {origen,destino} en coords, para refrescos sin re-geocodificar

  const calcularRuta = async (silencioso = false) => {
    if (!silencioso) { setCargando(true); setError('') }
    else setActualizando(true)
    try {
      let pOrigen = puntosRef.current?.origen
      let pDestino = puntosRef.current?.destino
      if (!pOrigen || !pDestino) {
        const geocode = async (texto) => {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(texto)}.json` +
            `?access_token=${MAPBOX_TOKEN}&country=co&language=es&limit=1&proximity=${MAPBOX_PROXIMITY}`
          const r = await fetch(url)
          const d = await r.json()
          if (!d.features?.length) throw new Error(`No se pudo ubicar: "${texto}"`)
          return { lat: d.features[0].center[1], lon: d.features[0].center[0] }
        }
        pOrigen  = (origenLat  && origenLon)  ? { lat:origenLat,  lon:origenLon }  : await geocode(origen)
        pDestino = (destinoLat && destinoLon) ? { lat:destinoLat, lon:destinoLon } : await geocode(destino)
        puntosRef.current = { origen:pOrigen, destino:pDestino }
      }
      const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${pOrigen.lon},${pOrigen.lat};${pDestino.lon},${pDestino.lat}` +
        `?geometries=geojson&overview=full&annotations=duration&access_token=${MAPBOX_TOKEN}`
      const rDir = await fetch(dirUrl)
      const dDir = await rDir.json()
      const route = dDir.routes?.[0]
      if (!route) throw new Error('No se encontró una ruta entre esos puntos')
      setRuta({
        origen: pOrigen, destino: pDestino, geometry: route.geometry,
        distancia_km: +(route.distance/1000).toFixed(1), duracion_min: Math.round(route.duration/60),
        actualizada: new Date(),
      })
    } catch (e) {
      setError(e.message || 'No se pudo calcular la ruta')
    } finally {
      setCargando(false); setActualizando(false)
    }
  }

  useEffect(() => {
    if (!MAPBOX_TOKEN) { setError('Falta configurar VITE_MAPBOX_TOKEN'); setCargando(false); return }
    puntosRef.current = null
    calcularRuta(false)
    const intervalo = setInterval(() => calcularRuta(true), REFRESCO_TRAFICO_MS)
    return () => clearInterval(intervalo)
  }, [origen, destino, origenLat, origenLon, destinoLat, destinoLon])

  useEffect(() => {
    if (!ruta || !elRef.current) return

    // Primera carga: crear el mapa. Refrescos posteriores: solo actualizar datos (no recrear).
    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: elRef.current,
        style: 'mapbox://styles/mapbox/navigation-day-v1', // incluye tráfico en tiempo real
        center: [ruta.origen.lon, ruta.origen.lat],
        zoom: 13, pitch: 55, bearing: -17, antialias: true,
      })
      mapRef.current = map
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch:true }), 'top-right')

      map.on('load', () => {
        map.addSource('ruta-linea', { type:'geojson', data:{ type:'Feature', geometry:ruta.geometry } })
        map.addLayer({
          id:'ruta-linea', type:'line', source:'ruta-linea',
          layout:{ 'line-join':'round', 'line-cap':'round' },
          paint:{ 'line-color':'#7C3AED', 'line-width':5, 'line-opacity':.9 },
        })

        // Edificios 3D
        map.addLayer({
          id:'edificios-3d', source:'composite', 'source-layer':'building',
          filter:['==','extrude','true'], type:'fill-extrusion', minzoom:14,
          paint:{
            'fill-extrusion-color':'#D8D8E8',
            'fill-extrusion-height':['get','height'],
            'fill-extrusion-base':['get','min_height'],
            'fill-extrusion-opacity':.75,
          },
        })

        // Marcador de origen: la carroza fúnebre (con placa si está asignada) — ícono SVG propio, sin emojis
        const svgVan = `<svg width="15" height="12" viewBox="0 0 64 35" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="8" width="52" height="18" rx="3" fill="#fff"/>
          <rect x="46" y="11" width="14" height="15" rx="2" fill="#fff"/>
          <rect x="48" y="13" width="10" height="8" rx="1.5" fill="#6D28D9" opacity=".45"/>
          <circle cx="14" cy="28" r="6" fill="#fff"/><circle cx="14" cy="28" r="3" fill="#6D28D9" opacity=".4"/>
          <circle cx="50" cy="28" r="6" fill="#fff"/><circle cx="50" cy="28" r="3" fill="#6D28D9" opacity=".4"/>
        </svg>`
        const elVehiculo = document.createElement('div')
        elVehiculo.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;'
        elVehiculo.innerHTML = `
          <div style="background:linear-gradient(135deg,#8B5CF6,#6D28D9);border-radius:10px;
            padding:6px 9px;box-shadow:0 3px 10px rgba(0,0,0,.3);display:flex;align-items:center;gap:6px;">
            ${svgVan}
            ${vehiculoPlaca ? `<span style="font-size:11px;font-weight:800;color:#fff;white-space:nowrap;letter-spacing:.3px;">${vehiculoPlaca}</span>` : ''}
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
            border-top:7px solid #6D28D9;margin-top:-1px;"></div>
        `
        const popupOrigen = (vehiculoPlaca || conductorNombre)
          ? `Origen: ${origen}<br/><strong>${vehiculoPlaca||''} ${conductorNombre?'· '+conductorNombre:''}</strong>`
          : 'Origen: ' + origen
        new mapboxgl.Marker({ element: elVehiculo, anchor:'bottom' })
          .setLngLat([ruta.origen.lon, ruta.origen.lat])
          .setPopup(new mapboxgl.Popup().setHTML(popupOrigen))
          .addTo(map)

        new mapboxgl.Marker({ color:'#DC2626' }).setLngLat([ruta.destino.lon, ruta.destino.lat])
          .setPopup(new mapboxgl.Popup().setText('Destino: ' + destino)).addTo(map)

        const bounds = ruta.geometry.coordinates.reduce(
          (b,c) => b.extend(c), new mapboxgl.LngLatBounds(ruta.geometry.coordinates[0], ruta.geometry.coordinates[0]))
        map.fitBounds(bounds, { padding:60, duration:0 })
      })
    } else {
      // Refresco: solo actualizar la geometría, sin recrear el mapa (evita parpadeo)
      const src = mapRef.current.getSource('ruta-linea')
      if (src) src.setData({ type:'Feature', geometry:ruta.geometry })
    }
  }, [ruta])

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null }, [])

  if (cargando) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 0', color:'#9CA3AF', fontSize:12.5 }}>
      <Loader2 size={14} className="sv-spin"/> Calculando ruta…
    </div>
  )
  if (error) return (
    <div style={{ padding:'10px 12px', background:'#FEF2F2', border:'1px solid #FECACA',
      borderRadius:10, color:'#B91C1C', fontSize:12 }}>{error}</div>
  )

  // Nivel de tráfico estimado (minutos por km) — colorea el ETA como en Uber/Google Maps
  const minPorKm = ruta ? ruta.duracion_min / Math.max(ruta.distancia_km, .1) : 0
  const trafico = minPorKm > 3 ? { label:'Tráfico pesado', color:'#DC2626', bg:'#FEF2F2' }
    : minPorKm > 1.8 ? { label:'Tráfico moderado', color:'#D97706', bg:'#FFFBEB' }
    : { label:'Fluido', color:'#059669', bg:'#F0FDF4' }

  return (
    <div>
      {ruta && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'#fff', border:'1.5px solid #E5E7EB', borderBottom:'none',
          borderRadius:'14px 14px 0 0', padding:'14px 18px' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:28, fontWeight:900, color:trafico.color, lineHeight:1 }}>{ruta.duracion_min}</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#6B7280' }}>min</span>
            <span style={{ fontSize:12.5, color:'#9CA3AF', marginLeft:6 }}>· {ruta.distancia_km} km</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:700,
              color:trafico.color, background:trafico.bg, padding:'5px 10px', borderRadius:20 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:trafico.color, flexShrink:0 }}/>
              {trafico.label}
            </span>
            {(vehiculoPlaca || conductorNombre) && (
              <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:700,
                color:'#374151', background:'#F3F4F6', padding:'5px 10px', borderRadius:20 }}>
                <Truck size={12}/> {vehiculoPlaca}{conductorNombre && ` · ${conductorNombre}`}
              </span>
            )}
          </div>
        </div>
      )}
      <div ref={elRef} style={{ height:340, overflow:'hidden', border:'1.5px solid #E5E7EB',
        borderRadius: ruta ? '0 0 14px 14px' : 14 }}/>
      {ruta && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5,
          marginTop:6, fontSize:11, color:'#9CA3AF' }}>
          {actualizando ? <Loader2 size={11} className="sv-spin"/> : <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981' }}/>}
          actualizado {ruta.actualizada.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}
        </div>
      )}
    </div>
  )
}

const BLANK = {
  contrato_id:'', difunto_id:'', tipo_disposicion:'INHUMACION',
  sala_id:'', fecha_velacion_ini:'', fecha_velacion_fin:'',
  lugar_recogida:'', fecha_recogida:'',
  lugar_disposicion:'', fecha_disposicion:'',
  acta_defuncion:'', permiso_inhumacion:'', observaciones:'',
}

// ── Chips ──────────────────────────────────────────────────────────────────

function EstadoChip({ estado }) {
  const m = ESTADO_META[estado] || { label:estado, color:'#9CA3AF', bg:'#F3F4F6', Icon:null }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:m.bg,
      color:m.color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
      {m.Icon && <m.Icon size={11}/>} {m.label}
    </span>
  )
}

// ── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  .sv-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
  .sv-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px 14px; flex-shrink:0; }
  .sv-head-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .sv-head-icon { width:44px; height:44px; border-radius:14px;
    background:linear-gradient(135deg,#8B5CF6,#6D28D9);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 12px rgba(139,92,246,.3); flex-shrink:0; }
  .sv-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
  .sv-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .sv-kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:22px; }
  .sv-kpi { background:#fff; border-radius:16px; overflow:hidden; border:1.5px solid #ECEDF8; transition:all .2s; }
  .sv-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.08); }
  .sv-kpi-bar { height:3px; }
  .sv-kpi-body { padding:14px 16px 12px; }
  .sv-kpi-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; font-size:18px; }
  .sv-kpi-val { font-size:28px; font-weight:900; color:#0F1035; line-height:1; letter-spacing:-1px; }
  .sv-kpi-label { font-size:11px; color:#9CA3AF; font-weight:600; margin-top:4px; }
  .sv-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .sv-search { position:relative; flex:1; min-width:200px; max-width:340px; }
  .sv-search input { width:100%; padding:9px 12px 9px 36px; border:1.5px solid #E2E5F0;
    border-radius:12px; font-size:13px; outline:none; background:#FAFBFF; transition:all .15s; box-sizing:border-box; }
  .sv-search input:focus { border-color:#8B5CF6; box-shadow:0 0 0 3px rgba(139,92,246,.1); background:#fff; }
  .sv-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; pointer-events:none; }
  .sv-select { padding:9px 12px; border:1.5px solid #E2E5F0; border-radius:12px; font-size:13px;
    background:#FAFBFF; color:#374151; outline:none; cursor:pointer; }
  .sv-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px;
    font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .15s; }
  .sv-btn-primary { background:linear-gradient(135deg,#8B5CF6,#6D28D9); color:#fff;
    box-shadow:0 3px 10px rgba(139,92,246,.3); }
  .sv-btn-primary:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(139,92,246,.4); }
  .sv-btn-ghost { background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0; }
  .sv-btn-ghost:hover { background:#ECEDF8; }
  .sv-table-wrap { flex:1; overflow:auto; padding:0 24px; }
  .sv-table { width:100%; border-collapse:separate; border-spacing:0; }
  .sv-table thead th { padding:10px 14px; text-align:left; font-size:10.5px; font-weight:800;
    color:#9CA3AF; letter-spacing:.6px; text-transform:uppercase; background:#F7F8FC;
    position:sticky; top:0; z-index:1; white-space:nowrap; }
  .sv-table thead th:first-child { border-radius:10px 0 0 10px; }
  .sv-table thead th:last-child  { border-radius:0 10px 10px 0; }
  .sv-table tbody tr { transition:all .12s; cursor:pointer; }
  .sv-table tbody tr:hover td { background:#F5F3FF; }
  .sv-table tbody tr:hover td:first-child { border-left:3px solid #8B5CF6; }
  .sv-table td { padding:13px 14px; font-size:13px; color:#374151; border-bottom:1px solid #F4F5FA; vertical-align:middle; }
  .sv-table td:first-child { border-left:3px solid transparent; transition:border-color .12s; }
  .sv-act { width:30px; height:30px; border-radius:8px; border:1.5px solid #E2E5F0;
    background:#fff; display:inline-flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; transition:all .15s; }
  .sv-act:hover { background:#F5F3FF; color:#7C3AED; border-color:#DDD6FE; }
  .sv-empty { display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:60px 20px; color:#9CA3AF; gap:10px; }
  .sv-empty p { font-size:15px; font-weight:800; color:#374151; margin:0; }
  .sv-pag { display:flex; align-items:center; justify-content:space-between; padding:14px 24px;
    border-top:1.5px solid #ECEDF8; background:#fff; flex-shrink:0; }
  .sv-pag-info { font-size:12.5px; color:#9CA3AF; font-weight:600; }
  .sv-pag-btns { display:flex; gap:6px; }
  .sv-pag-btn { width:32px; height:32px; border-radius:9px; border:1.5px solid #E2E5F0;
    background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;
    color:#6B7280; transition:all .15s; }
  .sv-pag-btn:hover:not(:disabled) { background:#F5F3FF; color:#7C3AED; border-color:#DDD6FE; }
  .sv-pag-btn:disabled { opacity:.4; cursor:not-allowed; }
  .sv-spin { animation:sv-spin .7s linear infinite; }
  @keyframes sv-spin { to{transform:rotate(360deg)} }
  .sv-overlay { position:fixed; inset:0; background:rgba(15,16,53,.55); backdrop-filter:blur(4px);
    z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .sv-modal { background:#fff; border-radius:20px; width:100%; max-width:660px;
    box-shadow:0 24px 60px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:92vh; overflow:hidden; }
  .sv-modal.lg { max-width:860px; }
  /* Drawer ficha de servicio */
  .sv-drawer-overlay { position:fixed; inset:0; background:rgba(10,10,30,.45); backdrop-filter:blur(3px);
    z-index:1000; display:flex; justify-content:flex-end; }
  .sv-drawer { background:#fff; width:88%; max-width:1100px; height:100vh;
    display:flex; flex-direction:column; box-shadow:-8px 0 40px rgba(0,0,0,.18);
    animation:sv-slide-in .22s ease; border-top-left-radius:18px; border-bottom-left-radius:18px;
    overflow:hidden; }
  @keyframes sv-slide-in { from{transform:translateX(100%)} to{transform:translateX(0)} }
  .sv-drawer-body { flex:1; overflow-y:auto; padding:24px 28px; }
  .sv-mhead { padding:22px 24px 18px; border-bottom:1.5px solid #ECEDF8;
    display:flex; align-items:center; justify-content:space-between; }
  .sv-mtitle { font-size:17px; font-weight:900; color:#0F1035; }
  .sv-msub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .sv-mclose { width:32px; height:32px; border-radius:10px; border:1.5px solid #ECEDF8;
    background:#F7F8FC; display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; flex-shrink:0; transition:all .15s; }
  .sv-mclose:hover { background:#FEE2E2; border-color:#FECACA; color:#EF4444; }
  .sv-mbody { padding:22px 24px; overflow-y:auto; overflow-x:hidden; flex:1; }
  .sv-grid2 { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; }
  .sv-field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; min-width:0; }
  .sv-field label { font-size:11.5px; font-weight:700; color:#374151; }
  .sv-field input, .sv-field select, .sv-field textarea {
    padding:9px 12px; border:1.5px solid #E2E5F0; border-radius:10px; font-size:13px;
    outline:none; background:#FAFBFF; color:#0F1035; transition:all .15s; font-family:inherit;
    width:100%; box-sizing:border-box; }
  .sv-field input:focus, .sv-field select:focus, .sv-field textarea:focus {
    border-color:#8B5CF6; box-shadow:0 0 0 3px rgba(139,92,246,.1); background:#fff; }
  .sv-field textarea { resize:vertical; min-height:60px; }
  @media (max-width:560px) {
    .sv-grid2 { grid-template-columns:1fr; }
    .sv-modal { max-width:100% !important; }
  }
  .sv-section { font-size:10px; font-weight:800; color:#9CA3AF; letter-spacing:1px;
    text-transform:uppercase; margin:6px 0 12px; }
  .sv-req { color:#EF4444; }
  .sv-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px;
    font-size:12.5px; font-weight:600; }
  .sv-alert.err { background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; }
  .sv-alert.ok  { background:#D1FAE5; color:#065F46; border:1px solid #A7F3D0; }
  .sv-ficha-block { background:#F8F9FF; border-radius:12px; padding:14px 16px; border:1.5px solid #ECEDF8; margin-bottom:14px; }
  .sv-ficha-tit { font-size:10px; font-weight:800; letter-spacing:.8px; color:#9CA3AF; text-transform:uppercase; margin-bottom:10px; }
  .sv-ficha-row { display:flex; gap:8px; margin-bottom:7px; align-items:flex-start; }
  .sv-ficha-key { font-size:11px; color:#9CA3AF; min-width:110px; flex-shrink:0; }
  .sv-ficha-val { font-size:12.5px; font-weight:700; color:#0F1035; }
  /* Sistema unificado para el interior del drawer */
  .tab-card { background:#fff; border:1.5px solid #E5E7EB; border-radius:10px; overflow:hidden; margin-bottom:14px; }
  .tab-card-head { display:flex; align-items:center; gap:8px; padding:11px 16px;
    border-bottom:1px solid #F0F0F5; background:#FAFBFF; }
  .tab-card-head-accent { background:linear-gradient(135deg,#6D28D908,#8B5CF608); }
  .tab-card-icon { font-size:17px; }
  .tab-card-title { font-size:11px; font-weight:800; color:#374151; text-transform:uppercase; letter-spacing:.7px; }
  .tab-card-body { padding:14px 16px; }
  .tab-grid { display:grid; gap:12px 20px; }
  .tab-grid-2 { grid-template-columns:1fr 1fr; }
  .tab-grid-3 { grid-template-columns:1fr 1fr 1fr; }
  .tab-grid-4 { grid-template-columns:1fr 1fr 1fr 1fr; }
  .tab-field { display:flex; flex-direction:column; gap:4px; }
  .tab-field-label { font-size:10.5px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:.5px; }
  .tab-field-value { font-size:13.5px; font-weight:700; color:#111827; line-height:1.3; }
  .tab-field-value.muted { color:#6B7280; font-weight:500; }
  .tab-section-title { font-size:10px; font-weight:800; color:#9CA3AF; text-transform:uppercase;
    letter-spacing:.8px; margin:18px 0 10px; padding-bottom:6px; border-bottom:1px solid #F0F0F5; }
  .sv-traslado-item { display:flex; align-items:center; gap:10px; padding:10px 14px;
    background:#F8F9FF; border-radius:10px; border:1.5px solid #ECEDF8; margin-bottom:8px; }
  .sv-check-item { display:flex; align-items:center; gap:10px; padding:10px 14px;
    background:#F8F9FF; border-radius:10px; border:1.5px solid #ECEDF8; margin-bottom:8px; cursor:pointer; transition:all .15s; }
  .sv-check-item:hover { background:#F5F3FF; border-color:#DDD6FE; }
`

// ── Modal Formulario ──────────────────────────────────────────────────────

function ModalForm({ servicio, salas, onClose, onSaved }) {
  const [form, setForm] = useState(servicio ? {
    tipo_disposicion:  servicio.tipo_disposicion  || 'INHUMACION',
    sala_id:           servicio.sala_id            || '',
    fecha_velacion_ini:servicio.fecha_velacion_ini?.slice(0,16) || '',
    fecha_velacion_fin:servicio.fecha_velacion_fin?.slice(0,16) || '',
    lugar_recogida:    servicio.lugar_recogida     || '',
    fecha_recogida:    servicio.fecha_recogida?.slice(0,16) || '',
    lugar_disposicion: servicio.lugar_disposicion  || '',
    fecha_disposicion: servicio.fecha_disposicion?.slice(0,16) || '',
    acta_defuncion:    servicio.acta_defuncion     || '',
    permiso_inhumacion:servicio.permiso_inhumacion || '',
    tramites_completos:servicio.tramites_completos || false,
    observaciones:     servicio.observaciones      || '',
  } : { ...BLANK })

  // ── Disponibilidad de salas de velación ────────────────────────────────────
  const [salasOcupadas, setSalasOcupadas] = useState(new Set())
  useEffect(() => {
    const { fecha_velacion_ini, fecha_velacion_fin } = form
    if (!fecha_velacion_ini || !fecha_velacion_fin) { setSalasOcupadas(new Set()); return }
    let cancelado = false
    api.get('/servicios/salas', { params: { ini: fecha_velacion_ini, fin: fecha_velacion_fin, excluir_id: servicio?.id } })
      .then(r => { if (!cancelado) setSalasOcupadas(new Set((r.data.data || []).filter(s => s.ocupada).map(s => s.id))) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [form.fecha_velacion_ini, form.fecha_velacion_fin, servicio?.id])
  const salasDisponibles = salas.filter(s => !salasOcupadas.has(s.id) || s.id === form.sala_id)

  // ── Soportes adjuntos (acta de defunción / permiso de inhumación) ─────────
  const [soporteActaUrl,    setSoporteActaUrl]    = useState(servicio?.acta_defuncion_soporte_url || '')
  const [soportePermisoUrl, setSoportePermisoUrl] = useState(servicio?.permiso_inhumacion_soporte_url || '')
  const [subiendoActa,      setSubiendoActa]      = useState(false)
  const [subiendoPermiso,   setSubiendoPermiso]   = useState(false)
  const fileActaRef    = useRef(null)
  const filePermisoRef = useRef(null)
  const EXTENSIONES_SOPORTE = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff'

  const subirDocumento = async (campo, file, setUrl, setSubiendo) => {
    if (!servicio?.id) { toast.error('Guarda el servicio primero para poder adjuntar documentos'); return }
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/servicios/${servicio.id}/documentos/soporte?campo=${campo}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUrl(res.data.url)
      toast.success('Documento adjuntado con éxito')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al subir el archivo')
    } finally { setSubiendo(false) }
  }

  // ── Estado vínculo ────────────────────────────────────────────────────────
  const [vinculoTipo,  setVinculoTipo]  = useState('CONTRATO')   // 'CONTRATO' | 'POLIZA'

  // PATH A — Contrato
  const [busqCont,   setBusqCont]   = useState(servicio?.contratante_nombre || '')
  const [candCont,   setCandCont]   = useState([])
  const [contratos,  setContratos]  = useState([])
  const [contratoId, setContratoId] = useState('')
  const [contratanteId, setContratanteId] = useState('')

  // PATH B — Póliza
  const [busqPoliza,        setBusqPoliza]        = useState('')
  const [candPoliza,        setCandPoliza]        = useState([])
  const [polizaSel,         setPolizaSel]         = useState(null)
  const [polizaId,          setPolizaId]          = useState('')
  const [beneficiariosList, setBeneficiariosList] = useState([])
  const [beneficiarioId,    setBeneficiarioId]    = useState('')
  const [elegibilidad,      setElegibilidad]      = useState(null)
  const [loadingBen,        setLoadingBen]        = useState(false)
  const [paso,              setPaso]              = useState(1)   // wizard: 1=buscar, 2=confirmar
  const [previewItems,      setPreviewItems]      = useState([])
  const [extrasItems,       setExtrasItems]       = useState([]) // ítems adicionales del operador
  const [catalogoBusq,      setCatalogoBusq]      = useState('')
  const [catalogoCands,     setCatalogoCands]     = useState([])

  // PATH C — Convenio
  const [convenios,          setConvenios]          = useState([])
  const [convenioId,         setConvenioId]         = useState('')
  const [convenioAutorizaciones, setConvenioAutorizaciones] = useState([])
  const [convenioAutorizacionId, setConvenioAutorizacionId] = useState('')
  const [convenioNumeroAut,  setConvenioNumeroAut]  = useState('')
  const [convenioObs,        setConvenioObs]        = useState('')
  const [valorServicioConv,  setValorServicioConv]  = useState('')
  const [coberturaCalc,      setCoberturaCalc]      = useState(null)
  const [calculandoCobertura, setCalculandoCobertura] = useState(false)
  const [busqContConv,      setBusqContConv]        = useState('')
  const [candContConv,      setCandContConv]        = useState([])
  const [contratanteConvenioId, setContratanteConvenioId] = useState('')
  const [paquetesConvenio,  setPaquetesConvenio]    = useState([])
  const [paqueteConvenioId, setPaqueteConvenioId]   = useState('')

  useEffect(() => {
    if (busqContConv.length < 2) return setCandContConv([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqContConv)}`)
      setCandContConv(r.data.data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [busqContConv])

  useEffect(() => {
    if (vinculoTipo !== 'CONVENIO') return
    api.get('/convenios?activo=1').then(r => setConvenios(r.data.data || [])).catch(() => {})
  }, [vinculoTipo])

  useEffect(() => {
    if (!convenioId) return setConvenioAutorizaciones([])
    api.get(`/convenios/${convenioId}`).then(r => setConvenioAutorizaciones(r.data.data?.autorizaciones || [])).catch(() => {})
  }, [convenioId])

  useEffect(() => {
    setPaqueteConvenioId('')
    if (!convenioId) return setPaquetesConvenio([])
    api.get(`/convenios/${convenioId}/paquetes`).then(r => setPaquetesConvenio(r.data.data || [])).catch(() => setPaquetesConvenio([]))
  }, [convenioId])

  useEffect(() => {
    if (!convenioId || !valorServicioConv || +valorServicioConv <= 0) return setCoberturaCalc(null)
    setCalculandoCobertura(true)
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ valor_servicio: valorServicioConv })
        if (convenioAutorizacionId) params.set('autorizacion_id', convenioAutorizacionId)
        const r = await api.get(`/convenios/${convenioId}/calcular?${params}`)
        setCoberturaCalc(r.data.data)
      } catch { setCoberturaCalc(null) } finally { setCalculandoCobertura(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [convenioId, convenioAutorizacionId, valorServicioConv])

  // Difunto (común)
  const [busqDif,   setBusqDif]   = useState(servicio?.difunto_nombre || '')
  const [candDif,   setCandDif]   = useState([])
  const [difuntoId, setDifuntoId] = useState(servicio?.difunto_id || '')
  const [difuntoDireccion, setDifuntoDireccion] = useState('') // dirección ya registrada en el tercero
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  // PATH A — Paquetes de servicio
  const [listaPaquetes, setListaPaquetes] = useState([])
  const [paqueteId,     setPaqueteId]     = useState('')
  const [valorContrato, setValorContrato] = useState('')

  useEffect(() => {
    api.get('/contratos/paquetes', { params: { tipo: 'CONTRATO' } }).then(r => setListaPaquetes(r.data.data || [])).catch(() => {})
  }, [])

  // Datos de fallecimiento — captura durante apertura
  const DEF_BLANK = {
    fecha_fallecimiento:'', hora_fallecimiento:'',
    tipo_lugar:'', lugar_fallecimiento:'', direccion_fallecimiento:'',
    causa_fallecimiento:'', tipo_muerte:'',
    medico_certifica:'', registro_medico:'',
  }
  const [defForm,     setDefForm]     = useState({ ...DEF_BLANK })
  const [defExistente, setDefExistente] = useState(false)

  const setDef = (k, v) => setDefForm(p => ({ ...p, [k]: v }))

  // ── Autocomplete contratante ──────────────────────────────────────────────
  useEffect(() => {
    if (busqCont.length < 2) return setCandCont([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqCont)}`)
      setCandCont(r.data.data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [busqCont])

  const seleccionarContratante = async (tercero) => {
    setBusqCont(`${tercero.nombres||''} ${tercero.apellidos||''}`.trim())
    setCandCont([])
    setContratanteId(tercero.id)
    setContratoId('')
    const r = await api.get(`/contratos?q=${tercero.numero_documento}&limit=50`)
    setContratos(r.data.data || [])
  }

  // ── Crear rápido (Contratante / Difunto no encontrados) ───────────────────
  const [tiposDocs,      setTiposDocs]      = useState([])
  const [quickCrear,     setQuickCrear]     = useState(null) // 'CONTRATANTE' | 'DIFUNTO' | null
  const [quickForm,      setQuickForm]      = useState({ tipo_documento_id:'', numero_documento:'', nombres:'', apellidos:'', telefono:'', email:'' })
  const [quickSaving,    setQuickSaving]    = useState(false)

  useEffect(() => {
    api.get('/tipos-documento/select').then(r => setTiposDocs(r.data.data || [])).catch(() => {})
  }, [])

  const abrirCrearRapido = (tipo) => {
    const busq = tipo === 'DIFUNTO' ? busqDif : busqCont
    const partes = busq.trim().split(/\s+/)
    setQuickForm({
      tipo_documento_id:'', numero_documento:'',
      nombres:   partes.slice(0, Math.ceil(partes.length/2)).join(' '),
      apellidos: partes.slice(Math.ceil(partes.length/2)).join(' '),
      telefono:'', email:'',
    })
    setQuickCrear(tipo)
  }

  const guardarCreacionRapida = async () => {
    if (!quickForm.tipo_documento_id || !quickForm.numero_documento)
      return toast.error('Tipo y número de documento son requeridos')
    if (!quickForm.nombres || !quickForm.apellidos)
      return toast.error('Nombres y apellidos son requeridos')
    setQuickSaving(true)
    try {
      const r = await api.post('/terceros', {
        tipo_documento_id: quickForm.tipo_documento_id,
        numero_documento:  quickForm.numero_documento,
        nombres:   quickForm.nombres,
        apellidos: quickForm.apellidos,
        telefono:  quickForm.telefono || undefined,
        email:     quickForm.email || undefined,
        roles: [quickCrear],
      })
      const nuevo = r.data.data
      const nombreCompleto = `${nuevo.nombres||''} ${nuevo.apellidos||''}`.trim()
      if (quickCrear === 'DIFUNTO') {
        setDifuntoId(nuevo.id)
        setBusqDif(nombreCompleto)
        setCandDif([])
        setDifuntoDireccion('') // el mini-formulario de creación rápida no captura dirección
        setDefForm({ ...DEF_BLANK })
        setDefExistente(false)
      } else if (quickCrear === 'CONTRATANTE') {
        await seleccionarContratante(nuevo)
      }
      toast.success('Tercero creado con éxito')
      setQuickCrear(null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al crear el tercero')
    } finally { setQuickSaving(false) }
  }

  // ── Autocomplete póliza ───────────────────────────────────────────────────
  useEffect(() => {
    if (busqPoliza.length < 2) return setCandPoliza([])
    const t = setTimeout(async () => {
      const r = await api.get(`/polizas/buscar?q=${encodeURIComponent(busqPoliza)}`)
      setCandPoliza(r.data.data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [busqPoliza])

  const seleccionarPoliza = async (pol) => {
    setBusqPoliza(`#${pol.numero} — ${pol.titular_nombre}`)
    setCandPoliza([])
    setPolizaSel(pol)
    setPolizaId(pol.id)
    setBeneficiarioId('')
    setBusqDif('')
    setDifuntoId('')
    setElegibilidad(null)
    setLoadingBen(true)
    try {
      const r = await api.get(`/polizas/${pol.id}/beneficiarios`)
      setBeneficiariosList(r.data.data || [])
    } finally { setLoadingBen(false) }
  }

  const seleccionarBeneficiario = async (ben) => {
    setBeneficiarioId(ben.tercero_id)
    setBusqDif(ben.nombre)
    setDifuntoId(ben.tercero_id)
    setDifuntoDireccion(ben.direccion || '')
    try {
      const r = await api.get(`/polizas/${polizaId}/elegibilidad?tercero_id=${ben.tercero_id}`)
      setElegibilidad(r.data.data)
    } catch { setElegibilidad(null) }
  }

  const avanzarPaso2 = async () => {
    try {
      const r = await api.get(`/servicios/poliza/${polizaId}/preview-plan`)
      setPreviewItems(r.data.data?.items || [])
    } catch { setPreviewItems([]) }
    setPaso(2)
  }

  const buscarCatalogo = async (q) => {
    setCatalogoBusq(q)
    if (q.length < 2) return setCatalogoCands([])
    const r = await api.get(`/servicios/catalogo?q=${encodeURIComponent(q)}&limit=8`)
    setCatalogoCands(r.data.data || [])
  }

  const agregarExtra = (item) => {
    setExtrasItems(prev => [...prev, { catalogo_id: item.id, descripcion: item.nombre, cantidad: 1, precio_unit: item.precio_base }])
    setCatalogoBusq('')
    setCatalogoCands([])
  }

  const quitarExtra = (idx) => setExtrasItems(prev => prev.filter((_,i) => i !== idx))

  const fmtCOP = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v)

  // ── Cargar defunción existente al seleccionar difunto ────────────────────
  const cargarDefuncion = async (terceroId) => {
    try {
      const r = await api.get(`/terceros/${terceroId}/defuncion`)
      const d = r.data.data
      if (d) {
        setDefExistente(true)
        setDefForm({
          fecha_fallecimiento:     d.fecha_fallecimiento?.slice(0,10) || '',
          hora_fallecimiento:      d.hora_fallecimiento  || '',
          tipo_lugar:              d.tipo_lugar           || '',
          lugar_fallecimiento:     d.lugar_fallecimiento  || '',
          direccion_fallecimiento: d.direccion_fallecimiento || '',
          causa_fallecimiento:     d.causa_fallecimiento  || '',
          tipo_muerte:             d.tipo_muerte          || '',
          medico_certifica:        d.medico_certifica     || '',
          registro_medico:         d.registro_medico      || '',
        })
      } else {
        setDefExistente(false)
        setDefForm({ ...DEF_BLANK })
      }
    } catch { setDefExistente(false) }
  }

  // ── Autocomplete difunto (solo PATH A o edición) ──────────────────────────
  useEffect(() => {
    if (vinculoTipo === 'POLIZA' && !servicio) return  // en póliza lo llena auto
    if (busqDif.length < 2) return setCandDif([])
    const t = setTimeout(async () => {
      const r = await api.get(`/terceros/select?q=${encodeURIComponent(busqDif)}`)
      setCandDif(r.data.data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [busqDif, vinculoTipo, servicio])

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async () => {
    setErr('')
    if (!servicio) {
      if (vinculoTipo === 'POLIZA') {
        if (!polizaId)       return setErr('Busque y seleccione una póliza.')
        if (!beneficiarioId) return setErr('Seleccione el beneficiario fallecido.')
        if (elegibilidad && !elegibilidad.elegible)
          return setErr('La póliza no es elegible. Revise las validaciones antes de continuar.')
      }
      if (vinculoTipo === 'CONVENIO' && !convenioId)
        return setErr('Seleccione el convenio que autoriza el servicio.')
      if (!difuntoId) return setErr('Seleccione el difunto.')
    }
    setSaving(true)
    try {
      if (servicio) {
        await api.put(`/servicios/${servicio.id}`, form)
      } else {
        await api.post('/servicios', {
          ...form,
          difunto_id:      difuntoId,
          contrato_id:     vinculoTipo === 'CONTRATO' ? (contratoId || null) : null,
          contratante_id:  vinculoTipo === 'CONTRATO' && !contratoId ? (contratanteId || null) : null,
          paquete_id:      vinculoTipo === 'CONTRATO' ? (paqueteId  || null) : vinculoTipo === 'CONVENIO' ? (paqueteConvenioId || null) : null,
          valor_total_override: vinculoTipo === 'CONTRATO' && paqueteId && !contratoId ? (valorContrato || null) : null,
          poliza_id:       vinculoTipo === 'POLIZA'   ? polizaId             : null,
          beneficiario_id: vinculoTipo === 'POLIZA'   ? beneficiarioId       : null,
          items_extras:    vinculoTipo === 'POLIZA'   ? extrasItems          : undefined,
          convenio_id:                  vinculoTipo === 'CONVENIO' ? convenioId : null,
          convenio_autorizacion_id:     vinculoTipo === 'CONVENIO' ? (convenioAutorizacionId || null) : null,
          convenio_numero_autorizacion: vinculoTipo === 'CONVENIO' ? (convenioNumeroAut || null) : null,
          convenio_valor_servicio:      vinculoTipo === 'CONVENIO' ? (valorServicioConv || null) : null,
          convenio_observaciones:       vinculoTipo === 'CONVENIO' ? (convenioObs || null) : null,
          contratante_convenio_id:      vinculoTipo === 'CONVENIO' ? (contratanteConvenioId || null) : null,
          defuncion:       defForm.fecha_fallecimiento ? defForm : undefined,
        })
      }
      toast.success(servicio ? 'Servicio actualizado' : 'Servicio creado')
      onSaved()
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al guardar')
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <>
    <div className="sv-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sv-modal">
        <div className="sv-mhead">
          <div>
            <div className="sv-mtitle">
              {servicio ? `Editar servicio #${servicio.numero}` : 'Nuevo servicio funerario'}
            </div>
            <div className="sv-msub">Registro del servicio · Velación · Disposición final</div>
          </div>
          <button className="sv-mclose" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="sv-mbody">
          {err && <div className="sv-alert err" style={{ marginBottom:16 }}><AlertTriangle size={13}/>{err}</div>}

          {!servicio && (
            <>
              {/* ── Selector de tipo de vínculo ── */}
              <div className="sv-section">Tipo de servicio</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18 }}>
                {[
                  { val:'CONTRATO', icon:'📋', title:'Contrato / Inmediato',
                    desc:'Servicio contratado directamente o sin previsión previa',
                    color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
                  { val:'POLIZA',   icon:'🛡️', title:'Póliza de previsión',
                    desc:'Beneficiario del grupo familiar de una póliza vigente',
                    color:'#7C3AED', bg:'#F5F3FF', border:'#C4B5FD' },
                  { val:'CONVENIO', icon:'🤝', title:'Convenio',
                    desc:'EPS, aseguradora, alcaldía o empresa autoriza el servicio',
                    color:'#0891B2', bg:'#ECFEFF', border:'#A5F3FC' },
                ].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => { setVinculoTipo(opt.val); setErr('') }}
                    style={{
                      border: `2px solid ${vinculoTipo===opt.val ? opt.color : '#E2E5F0'}`,
                      borderRadius:12, padding:'12px 14px', cursor:'pointer', textAlign:'left',
                      background: vinculoTipo===opt.val ? opt.bg : '#FAFBFF',
                      transition:'all .15s',
                    }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{opt.icon}</div>
                    <div style={{ fontSize:13, fontWeight:800, color: vinculoTipo===opt.val ? opt.color : '#374151' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize:11, color:'#6B7280', marginTop:2, lineHeight:1.4 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              {/* ══════════ PATH A — CONTRATO ══════════ */}
              {vinculoTipo === 'CONTRATO' && (
                <>
                  <div className="sv-section">Vincular al contrato</div>

                  {/* Buscar contratante */}
                  <div className="sv-field">
                    <label>Contratante <span style={{color:'#9CA3AF',fontWeight:400}}>(opcional — buscar para cargar contratos)</span></label>
                    <div style={{ position:'relative' }}>
                      <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                        top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                      <input value={busqCont} onChange={e => setBusqCont(e.target.value)}
                        placeholder="Nombre o documento del contratante…" style={{ paddingLeft:30 }}/>
                    </div>
                    {candCont.length > 0 && (
                      <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                        maxHeight:140, overflowY:'auto', background:'#fff', marginTop:4 }}>
                        {candCont.map((c,i) => (
                          <div key={c.id} onClick={() => seleccionarContratante(c)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                              cursor:'pointer', borderBottom:i<candCont.length-1?'1px solid #F4F5FA':'none',
                              transition:'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background='#F5F3FF'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                              background:'linear-gradient(135deg,#3B82F6,#2563EB)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:800, color:'#fff' }}>
                              {(c.nombres?.[0]||'?').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                              <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {busqCont.trim().length >= 2 && candCont.length === 0 && (
                      <button type="button" onClick={() => abrirCrearRapido('CONTRATANTE')}
                        style={{ display:'flex', alignItems:'center', gap:6, marginTop:6,
                          background:'#F5F3FF', border:'1.5px dashed #C4B5FD', borderRadius:10,
                          padding:'8px 12px', cursor:'pointer', fontSize:12, fontWeight:700, color:'#7C3AED' }}>
                        <UserPlus size={14}/> No se encontró "{busqCont}" — crear contratante nuevo
                      </button>
                    )}
                  </div>

                  {contratos.length > 0 && (
                    <div className="sv-field">
                      <label>Contrato vinculado <span style={{color:'#9CA3AF',fontWeight:400}}>(opcional)</span></label>
                      <select value={contratoId} onChange={e => setContratoId(e.target.value)}>
                        <option value="">— Sin contrato / servicio inmediato —</option>
                        {contratos.map(c => (
                          <option key={c.id} value={c.id}>
                            #{c.numero} · {c.paquete_nombre || 'Personalizado'} · {c.tipo_contrato}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* ── Paquetes de servicio ── */}
                  {listaPaquetes.length > 0 && (
                    <>
                      <div className="sv-section" style={{ marginTop:6 }}>Paquete de servicios <span style={{color:'#9CA3AF',fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:10}}>(opcional)</span></div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10, marginBottom:18 }}>
                        {listaPaquetes.map(p => {
                          const sel = paqueteId === p.id
                          const colorMap = { 0:'#2563EB', 1:'#059669', 2:'#7C3AED', 3:'#D97706', 4:'#DC2626', 5:'#0891B2' }
                          const idx = listaPaquetes.indexOf(p)
                          const col = colorMap[idx] || '#374151'
                          const bgLight = sel ? col + '15' : '#FAFBFF'
                          return (
                            <button key={p.id} type="button"
                              onClick={() => { setPaqueteId(sel ? '' : p.id); setValorContrato(sel ? '' : (p.precio_venta || p.precio_base)) }}
                              style={{
                                border: `2px solid ${sel ? col : '#E2E5F0'}`,
                                borderRadius:14, padding:'12px 13px', cursor:'pointer', textAlign:'left',
                                background: bgLight, transition:'all .15s', position:'relative',
                              }}>
                              {sel && (
                                <span style={{ position:'absolute', top:8, right:8, width:18, height:18,
                                  background:col, borderRadius:'50%', display:'flex', alignItems:'center',
                                  justifyContent:'center', fontSize:10, color:'#fff', fontWeight:900 }}>✓</span>
                              )}
                              <div style={{ fontSize:12, fontWeight:900, color: sel ? col : '#0F1035', marginBottom:4 }}>
                                {p.nombre}
                              </div>
                              <div style={{ fontSize:13, fontWeight:800, color: col, marginBottom:8 }}>
                                {new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(p.precio_venta || p.precio_base)}
                              </div>
                              <ul style={{ margin:0, padding:0, listStyle:'none' }}>
                                {(p.items||[]).slice(0,5).map((it,i) => (
                                  <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:5, fontSize:10.5,
                                    color:'#6B7280', marginBottom:2, lineHeight:1.3 }}>
                                    <span style={{ color:col, marginTop:1 }}>✔</span> {it.nombre}
                                  </li>
                                ))}
                                {(p.items||[]).length > 5 && (
                                  <li style={{ fontSize:10, color:'#9CA3AF', marginTop:3, fontStyle:'italic' }}>
                                    +{p.items.length - 5} más incluidos…
                                  </li>
                                )}
                              </ul>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {paqueteId && (
                    <div className="sv-field">
                      <label>Valor a cobrar <span style={{color:'#9CA3AF',fontWeight:400}}>(editable — por si hay descuento)</span></label>
                      <CurrencyInput value={valorContrato}
                        onChange={v => setValorContrato(v)} placeholder="0"/>
                    </div>
                  )}

                  {/* Difunto — búsqueda libre */}
                  <div className="sv-field">
                    <label>Difunto <span className="sv-req">*</span></label>
                    <div style={{ position:'relative' }}>
                      <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                        top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                      <input value={busqDif} onChange={e => { setBusqDif(e.target.value); setDifuntoId(''); setDifuntoDireccion(''); setDefForm({...DEF_BLANK}); setDefExistente(false) }}
                        placeholder="Nombre o documento del difunto…" style={{ paddingLeft:30 }}/>
                    </div>
                    {difuntoId && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4,
                        fontSize:11, color:'#059669', fontWeight:700 }}>
                        <CheckCircle2 size={12}/> Difunto seleccionado
                      </div>
                    )}
                    {candDif.length > 0 && !difuntoId && (
                      <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                        maxHeight:130, overflowY:'auto', background:'#fff', marginTop:4 }}>
                        {candDif.map((c,i) => (
                          <div key={c.id}
                            onClick={() => { setDifuntoId(c.id); setBusqDif(`${c.nombres||''} ${c.apellidos||''}`.trim()); setCandDif([]); setDifuntoDireccion(c.direccion || ''); cargarDefuncion(c.id) }}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                              cursor:'pointer', borderBottom:i<candDif.length-1?'1px solid #F4F5FA':'none',
                              transition:'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background='#F1F5F9'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                              background:'linear-gradient(135deg,#64748B,#475569)',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>👼</div>
                            <div>
                              <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                              <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {busqDif.trim().length >= 2 && candDif.length === 0 && !difuntoId && (
                      <button type="button" onClick={() => abrirCrearRapido('DIFUNTO')}
                        style={{ display:'flex', alignItems:'center', gap:6, marginTop:6,
                          background:'#F0FDF4', border:'1.5px dashed #6EE7B7', borderRadius:10,
                          padding:'8px 12px', cursor:'pointer', fontSize:12, fontWeight:700, color:'#059669' }}>
                        <UserPlus size={14}/> No se encontró "{busqDif}" — crear difunto nuevo
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ══════════ PATH C — CONVENIO ══════════ */}
              {vinculoTipo === 'CONVENIO' && (
                <>
                  <div className="sv-section">Convenio que autoriza el servicio</div>

                  <div className="sv-field">
                    <label>Convenio <span className="sv-req">*</span></label>
                    <select value={convenioId} onChange={e => { setConvenioId(e.target.value); setConvenioAutorizacionId('') }}>
                      <option value="">— Seleccionar convenio —</option>
                      {convenios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    {convenios.length === 0 && (
                      <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>
                        No hay convenios activos registrados — créalos primero en el módulo "Convenios".
                      </div>
                    )}
                  </div>

                  {convenioAutorizaciones.length > 0 && (
                    <div className="sv-field">
                      <label>Tipo de autorización</label>
                      <select value={convenioAutorizacionId} onChange={e => setConvenioAutorizacionId(e.target.value)}>
                        <option value="">— Usar cobertura por defecto del convenio —</option>
                        {convenioAutorizaciones.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} ({a.cobertura_tipo === 'PORCENTAJE' ? `${(+a.cobertura_valor).toFixed(0)}%` : fmtCOP(a.cobertura_valor)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {paquetesConvenio.length > 0 && (
                    <div className="sv-field">
                      <label>Servicio incluido <span style={{color:'#9CA3AF',fontWeight:400}}>(opcional — paquetes vinculados a este convenio)</span></label>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10, marginTop:6 }}>
                        {paquetesConvenio.map(p => {
                          const sel = paqueteConvenioId === p.paquete_id
                          const col = '#0891B2'
                          return (
                            <button key={p.paquete_id} type="button"
                              onClick={() => {
                                const next = sel ? '' : p.paquete_id
                                setPaqueteConvenioId(next)
                                if (!sel) setValorServicioConv(p.precio_base)
                              }}
                              style={{
                                border: `2px solid ${sel ? col : '#E2E5F0'}`,
                                borderRadius:14, padding:'12px 13px', cursor:'pointer', textAlign:'left',
                                background: sel ? col + '15' : '#FAFBFF', transition:'all .15s', position:'relative',
                              }}>
                              {sel && (
                                <span style={{ position:'absolute', top:8, right:8, width:18, height:18,
                                  background:col, borderRadius:'50%', display:'flex', alignItems:'center',
                                  justifyContent:'center', fontSize:10, color:'#fff', fontWeight:900 }}>✓</span>
                              )}
                              <div style={{ fontSize:12, fontWeight:900, color: sel ? col : '#0F1035', marginBottom:4 }}>
                                {p.nombre}
                              </div>
                              <div style={{ fontSize:13, fontWeight:800, color: col, marginBottom:8 }}>
                                {fmtCOP(p.precio_base)}
                              </div>
                              <ul style={{ margin:0, padding:0, listStyle:'none' }}>
                                {(p.items||[]).slice(0,5).map((it,i) => (
                                  <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:5, fontSize:10.5,
                                    color:'#6B7280', marginBottom:2, lineHeight:1.3 }}>
                                    <span style={{ color:col, marginTop:1 }}>✔</span> {it.nombre}
                                  </li>
                                ))}
                                {(p.items||[]).length > 5 && (
                                  <li style={{ fontSize:10, color:'#9CA3AF', marginTop:3, fontStyle:'italic' }}>
                                    +{p.items.length - 5} más incluidos…
                                  </li>
                                )}
                              </ul>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="sv-grid2">
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>N° de autorización / radicado</label>
                      <input value={convenioNumeroAut} onChange={e => setConvenioNumeroAut(e.target.value)}
                        placeholder="Ej: AUT-2026-00123"/>
                    </div>
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>Valor del servicio</label>
                      <CurrencyInput value={valorServicioConv}
                        onChange={v => setValorServicioConv(v)} placeholder="Ej: 5000000"/>
                    </div>
                  </div>

                  {valorServicioConv > 0 && (
                    <div style={{ marginTop:14, background:'#ECFEFF', border:'1.5px solid #A5F3FC', borderRadius:12,
                      padding:'12px 14px' }}>
                      {calculandoCobertura ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#0891B2' }}>
                          <Loader2 size={13} className="sv-spin"/> Calculando cobertura…
                        </div>
                      ) : coberturaCalc ? (
                        <>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                            <div>
                              <div style={{ fontSize:10, fontWeight:800, color:'#0E7490', textTransform:'uppercase', letterSpacing:.5 }}>
                                Cubre el convenio
                              </div>
                              <div style={{ fontSize:17, fontWeight:900, color:'#0891B2' }}>{fmtCOP(coberturaCalc.valor_cubierto)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, fontWeight:800, color:'#9A3412', textTransform:'uppercase', letterSpacing:.5 }}>
                                {coberturaCalc.absorbe_resto === 'FUNERARIA' ? 'Condonado por la empresa' : 'Cartera a cargo de la familia'}
                              </div>
                              <div style={{ fontSize:17, fontWeight:900, color:'#C2410C' }}>
                                {fmtCOP(coberturaCalc.absorbe_resto === 'FUNERARIA' ? coberturaCalc.valor_absorbido_funeraria : coberturaCalc.valor_a_cargo_familia)}
                              </div>
                            </div>
                          </div>
                          {coberturaCalc.absorbe_resto === 'FUNERARIA' ? (
                            <div style={{ fontSize:11, color:'#7C3AED', fontWeight:700, marginTop:8 }}>
                              🏢 Caso excepcional: la empresa condona esta diferencia, no queda en cartera de nadie.
                            </div>
                          ) : (
                            <div style={{ fontSize:11, color:'#9A3412', fontWeight:700, marginTop:8 }}>
                              📋 Lo que cubre el convenio y el excedente de la familia quedan en cartera (Módulo Cartera de Convenios) — la funeraria no lo pierde, lo cobra después.
                            </div>
                          )}
                          {coberturaCalc.tope_aplicado && (
                            <div style={{ fontSize:11, color:'#9A3412', fontWeight:700, marginTop:8 }}>
                              ⚠️ Se aplicó el tope máximo de cobertura ({fmtCOP(coberturaCalc.tope_maximo)}).
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}

                  <div className="sv-field" style={{ marginTop:14 }}>
                    <label>Observaciones del convenio</label>
                    <textarea value={convenioObs} onChange={e => setConvenioObs(e.target.value)}
                      placeholder="Notas sobre la autorización, condiciones especiales…"/>
                  </div>

                  <div className="sv-field">
                    <label>Responsable / contratante <span style={{color:'#9CA3AF',fontWeight:400}}>(opcional)</span></label>
                    <div style={{ position:'relative' }}>
                      <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                        top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                      <input value={busqContConv}
                        onChange={e => { setBusqContConv(e.target.value); setContratanteConvenioId('') }}
                        placeholder="Familiar responsable — déjelo vacío si no aplica…"
                        style={{ paddingLeft:30 }}/>
                    </div>
                    {contratanteConvenioId && (
                      <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>✓ Responsable seleccionado</span>
                    )}
                    {candContConv.length > 0 && !contratanteConvenioId && (
                      <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                        maxHeight:150, overflowY:'auto', background:'#fff', marginTop:4 }}>
                        {candContConv.map((c,i) => (
                          <div key={c.id}
                            onClick={() => { setContratanteConvenioId(c.id); setBusqContConv(`${c.nombres||''} ${c.apellidos||''}`.trim()); setCandContConv([]) }}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
                              borderBottom:i<candContConv.length-1?'1px solid #F4F5FA':'none', transition:'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background='#ECFEFF'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                              background:'linear-gradient(135deg,#0891B2,#0E7490)', display:'flex',
                              alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>
                              {(c.nombres?.[0]||'?').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                              <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="sv-section" style={{ marginTop:18 }}>Difunto</div>

                  {/* Difunto — búsqueda libre (igual que en Contrato / Inmediato) */}
                  <div className="sv-field">
                    <label>Difunto <span className="sv-req">*</span></label>
                    <div style={{ position:'relative' }}>
                      <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                        top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                      <input value={busqDif} onChange={e => { setBusqDif(e.target.value); setDifuntoId(''); setDifuntoDireccion(''); setDefForm({...DEF_BLANK}); setDefExistente(false) }}
                        placeholder="Nombre o documento del difunto…" style={{ paddingLeft:30 }}/>
                    </div>
                    {difuntoId && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4,
                        fontSize:11, color:'#059669', fontWeight:700 }}>
                        <CheckCircle2 size={12}/> Difunto seleccionado
                      </div>
                    )}
                    {candDif.length > 0 && !difuntoId && (
                      <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                        maxHeight:130, overflowY:'auto', background:'#fff', marginTop:4 }}>
                        {candDif.map((c,i) => (
                          <div key={c.id}
                            onClick={() => { setDifuntoId(c.id); setBusqDif(`${c.nombres||''} ${c.apellidos||''}`.trim()); setCandDif([]); setDifuntoDireccion(c.direccion || ''); cargarDefuncion(c.id) }}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                              cursor:'pointer', borderBottom:i<candDif.length-1?'1px solid #F4F5FA':'none',
                              transition:'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background='#F1F5F9'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                              background:'linear-gradient(135deg,#64748B,#475569)',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>👼</div>
                            <div>
                              <div style={{ fontSize:12.5, fontWeight:700 }}>{c.nombres} {c.apellidos}</div>
                              <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {busqDif.trim().length >= 2 && candDif.length === 0 && !difuntoId && (
                      <button type="button" onClick={() => abrirCrearRapido('DIFUNTO')}
                        style={{ display:'flex', alignItems:'center', gap:6, marginTop:6,
                          background:'#F0FDF4', border:'1.5px dashed #6EE7B7', borderRadius:10,
                          padding:'8px 12px', cursor:'pointer', fontSize:12, fontWeight:700, color:'#059669' }}>
                        <UserPlus size={14}/> No se encontró "{busqDif}" — crear difunto nuevo
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ══════════ PATH B — PÓLIZA ══════════ */}
              {vinculoTipo === 'POLIZA' && (
                <>
                  <div className="sv-section">Aplicar póliza de previsión</div>

                  {/* Buscar póliza */}
                  <div className="sv-field">
                    <label>Buscar póliza <span className="sv-req">*</span></label>
                    <div style={{ position:'relative' }}>
                      <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10,
                        top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                      <input value={busqPoliza}
                        onChange={e => { setBusqPoliza(e.target.value); setPolizaSel(null); setPolizaId(''); setBeneficiariosList([]); setBeneficiarioId(''); setDifuntoId(''); setBusqDif(''); setElegibilidad(null) }}
                        placeholder="Nombre del titular, cédula o número de póliza…"
                        style={{ paddingLeft:30 }}/>
                    </div>
                    {candPoliza.length > 0 && !polizaId && (
                      <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                        maxHeight:200, overflowY:'auto', background:'#fff', marginTop:4 }}>
                        {candPoliza.map((p,i) => {
                          const estadoColor = { VIGENTE:'#059669', SUSPENDIDA:'#F59E0B',
                            VENCIDA:'#EF4444', EJECUTADA:'#6B7280', CANCELADA:'#EF4444' }
                          const estadoBg    = { VIGENTE:'#D1FAE5', SUSPENDIDA:'#FEF3C7',
                            VENCIDA:'#FEE2E2', EJECUTADA:'#F3F4F6', CANCELADA:'#FEE2E2' }
                          return (
                            <div key={p.id} onClick={() => seleccionarPoliza(p)}
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                                cursor:'pointer', borderBottom:i<candPoliza.length-1?'1px solid #F4F5FA':'none',
                                transition:'background .1s' }}
                              onMouseEnter={e => e.currentTarget.style.background='#F5F3FF'}
                              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                              <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                                background:'linear-gradient(135deg,#7C3AED,#5B21B6)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:13, fontWeight:900, color:'#fff' }}>
                                #{p.numero}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                                  {p.titular_nombre}
                                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                                    color:estadoColor[p.estado]||'#6B7280', background:estadoBg[p.estado]||'#F3F4F6' }}>
                                    {p.estado}
                                  </span>
                                </div>
                                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>
                                  {p.plan_nombre} · Doc: {p.titular_doc}
                                  {+p.beneficiarios_disponibles > 0
                                    ? <span style={{ color:'#059669', marginLeft:6 }}>✓ {p.beneficiarios_disponibles} beneficiario(s) disponible(s)</span>
                                    : <span style={{ color:'#EF4444', marginLeft:6 }}>Sin beneficiarios disponibles</span>
                                  }
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Póliza seleccionada — resumen */}
                  {polizaSel && (
                    <div style={{ background:'#F5F3FF', border:'1.5px solid #C4B5FD', borderRadius:12,
                      padding:'12px 14px', marginBottom:14 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ fontWeight:800, fontSize:13, color:'#5B21B6' }}>
                          🛡️ Póliza #{polizaSel.numero} — {polizaSel.plan_nombre}
                        </div>
                        <span style={{ fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:20,
                          color: polizaSel.estado==='VIGENTE'?'#059669':'#EF4444',
                          background: polizaSel.estado==='VIGENTE'?'#D1FAE5':'#FEE2E2' }}>
                          {polizaSel.estado}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'#6B7280', display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                        <span>👤 Titular: <strong style={{color:'#374151'}}>{polizaSel.titular_nombre}</strong></span>
                        <span>📄 Doc: <strong style={{color:'#374151'}}>{polizaSel.titular_doc}</strong></span>
                        {polizaSel.meses_mora > 0 &&
                          <span style={{ color:'#EF4444', fontWeight:700, gridColumn:'1/-1' }}>
                            ⚠️ {polizaSel.meses_mora} mes(es) de mora
                          </span>
                        }
                      </div>
                    </div>
                  )}

                  {/* Lista de beneficiarios */}
                  {polizaId && (
                    <div className="sv-field">
                      <label>¿Quién del grupo familiar falleció? <span className="sv-req">*</span></label>
                      {loadingBen
                        ? <div style={{ padding:12, textAlign:'center', color:'#9CA3AF', fontSize:12 }}>
                            <Loader2 size={14} style={{ animation:'spin 1s linear infinite', marginRight:6 }}/>
                            Cargando beneficiarios…
                          </div>
                        : beneficiariosList.length === 0
                          ? <div style={{ padding:12, background:'#FEF3C7', borderRadius:10, fontSize:12, color:'#92400E' }}>
                              ⚠️ Esta póliza no tiene beneficiarios registrados.
                            </div>
                          : <div style={{ border:'1.5px solid #E2E5F0', borderRadius:10, overflow:'hidden' }}>
                              {beneficiariosList.map((b,i) => {
                                const sel = beneficiarioId === b.tercero_id
                                const usado = b.ejecutado
                                return (
                                  <div key={b.beneficiario_id}
                                    onClick={() => !usado && seleccionarBeneficiario(b)}
                                    style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                                      cursor: usado ? 'not-allowed' : 'pointer',
                                      borderBottom: i<beneficiariosList.length-1?'1px solid #F4F5FA':'none',
                                      background: sel ? '#F5F3FF' : usado ? '#FAFAFA' : '#fff',
                                      opacity: usado ? 0.6 : 1, transition:'all .15s',
                                      border: sel ? '0' : 'none',
                                      outline: sel ? '2px solid #7C3AED' : 'none',
                                    }}>
                                    <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                                      background: usado ? '#E5E7EB' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
                                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                                      {usado ? '✓' : '👤'}
                                    </div>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:13, fontWeight:700, color: usado?'#9CA3AF':'#111827' }}>
                                        {b.nombre}
                                      </div>
                                      <div style={{ fontSize:11, color:'#6B7280', marginTop:1 }}>
                                        {b.parentesco}{b.edad ? ` · ${b.edad} años` : ''}
                                        {b.numero_documento && ` · ${b.tipo_doc_sigla||'Doc'} ${b.numero_documento}`}
                                      </div>
                                    </div>
                                    <div>
                                      {usado
                                        ? <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px',
                                            borderRadius:20, background:'#F3F4F6', color:'#9CA3AF' }}>YA EJECUTADO</span>
                                        : sel
                                          ? <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px',
                                              borderRadius:20, background:'#EDE9FE', color:'#7C3AED' }}>SELECCIONADO</span>
                                          : <span style={{ fontSize:10, color:'#9CA3AF' }}>Seleccionar</span>
                                      }
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                      }
                    </div>
                  )}

                  {/* Panel de elegibilidad */}
                  {elegibilidad && (
                    <div style={{
                      border: `1.5px solid ${elegibilidad.elegible ? '#6EE7B7' : '#FCA5A5'}`,
                      borderRadius:12, padding:'12px 14px', marginBottom:14,
                      background: elegibilidad.elegible ? '#F0FDF4' : '#FFF5F5',
                    }}>
                      <div style={{ fontWeight:800, fontSize:12, marginBottom:8,
                        color: elegibilidad.elegible ? '#065F46' : '#991B1B' }}>
                        {elegibilidad.elegible ? '✅ Póliza elegible — puede crear el servicio' : '❌ Póliza NO elegible'}
                      </div>
                      {[
                        { key:'poliza_vigente',  label:'Póliza vigente' },
                        { key:'fuera_carencia',  label:'Fuera del período de carencia' },
                        { key:'es_beneficiario', label:'Beneficiario activo en la póliza' },
                        { key:'sin_mora',        label:'Sin mora pendiente' },
                      ].map(ch => (
                        <div key={ch.key} style={{ display:'flex', alignItems:'center', gap:8,
                          fontSize:12, color: elegibilidad.checks[ch.key] ? '#065F46' : '#991B1B',
                          marginBottom:3 }}>
                          {elegibilidad.checks[ch.key] ? '✓' : '✗'} {ch.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Difunto auto-llenado */}
                  {difuntoId && paso === 1 && (
                    <div className="sv-field">
                      <label>Difunto <span className="sv-req">*</span></label>
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                        background:'#F0FDF4', border:'1.5px solid #6EE7B7', borderRadius:10 }}>
                        <span style={{ fontSize:18 }}>👼</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:'#065F46' }}>{busqDif}</div>
                          <div style={{ fontSize:11, color:'#059669' }}>Registrado automáticamente desde el grupo familiar</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botón continuar — paso 1 → 2 */}
                  {paso === 1 && beneficiarioId && elegibilidad?.elegible && (
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                      <button className="sv-btn sv-btn-primary" onClick={avanzarPaso2}>
                        Ver cobertura del plan →
                      </button>
                    </div>
                  )}

                  {/* ═══════ PASO 2 — Confirmación de cobertura ═══════ */}
                  {paso === 2 && (
                    <>
                      {/* Encabezado paso 2 */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div>
                          <div className="sv-section" style={{ margin:0 }}>Cobertura del plan</div>
                          <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>
                            Ítems incluidos automáticamente según el plan de la póliza
                          </div>
                        </div>
                        <button onClick={() => setPaso(1)} style={{ fontSize:11, color:'#7C3AED',
                          background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>
                          ← Cambiar beneficiario
                        </button>
                      </div>

                      {/* Tabla de ítems del plan */}
                      <div style={{ border:'1.5px solid #C4B5FD', borderRadius:12, overflow:'hidden', marginBottom:14 }}>
                        <div style={{ background:'#F5F3FF', padding:'8px 14px', fontSize:10, fontWeight:800,
                          color:'#7C3AED', letterSpacing:.5, textTransform:'uppercase',
                          display:'grid', gridTemplateColumns:'1fr auto' }}>
                          <span>Ítem de cobertura</span>
                          <span>Valor</span>
                        </div>
                        {previewItems.map(item => (
                          <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr auto',
                            padding:'9px 14px', borderTop:'1px solid #EDE9FE',
                            background:'#FDFCFF', alignItems:'center' }}>
                            <div>
                              <span style={{ fontSize:11, fontWeight:800, color:'#2E1065',
                                background:'#EDE9FE', padding:'2px 7px', borderRadius:6, marginRight:8 }}>
                                {item.codigo}
                              </span>
                              <span style={{ fontSize:13, color:'#374151' }}>{item.nombre}</span>
                            </div>
                            <span style={{ fontSize:12.5, fontWeight:700, color:'#059669' }}>
                              {fmtCOP(item.precio_base)}
                            </span>
                          </div>
                        ))}
                        <div style={{ padding:'10px 14px', borderTop:'2px solid #C4B5FD',
                          background:'#F5F3FF', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:11, fontWeight:800, color:'#7C3AED' }}>TOTAL COBERTURA</span>
                          <span style={{ fontSize:15, fontWeight:900, color:'#6D28D9' }}>
                            {fmtCOP(previewItems.reduce((s,i) => s + Number(i.precio_base), 0))}
                          </span>
                        </div>
                      </div>

                      {/* Extras adicionales */}
                      <div className="sv-section">Servicios adicionales (opcional)</div>
                      <div style={{ marginBottom:10 }}>
                        <div style={{ position:'relative', marginBottom:6 }}>
                          <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10, top:'50%',
                            transform:'translateY(-50%)', pointerEvents:'none' }}/>
                          <input value={catalogoBusq} onChange={e => buscarCatalogo(e.target.value)}
                            placeholder="Buscar servicio adicional…" style={{ paddingLeft:30, width:'100%',
                              padding:'9px 12px 9px 30px', border:'1.5px solid #E2E5F0', borderRadius:10,
                              fontSize:13, outline:'none', background:'#FAFBFF', boxSizing:'border-box' }}/>
                        </div>
                        {catalogoCands.length > 0 && (
                          <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                            maxHeight:140, overflowY:'auto', background:'#fff' }}>
                            {catalogoCands.map((c,i) => (
                              <div key={c.id} onClick={() => agregarExtra(c)}
                                style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                  padding:'8px 12px', cursor:'pointer',
                                  borderBottom:i<catalogoCands.length-1?'1px solid #F4F5FA':'none',
                                  transition:'background .1s' }}
                                onMouseEnter={e => e.currentTarget.style.background='#F5F3FF'}
                                onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                                <span style={{ fontSize:12.5, fontWeight:600 }}>{c.nombre}</span>
                                <span style={{ fontSize:12, color:'#7C3AED', fontWeight:700 }}>{fmtCOP(c.precio_base)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {extrasItems.map((ex, idx) => (
                          <div key={idx} style={{ display:'flex', alignItems:'center', gap:8,
                            padding:'8px 12px', background:'#F8F9FF', borderRadius:10,
                            border:'1.5px solid #ECEDF8', marginTop:6 }}>
                            <span style={{ flex:1, fontSize:12.5, fontWeight:600, color:'#374151' }}>{ex.descripcion}</span>
                            <span style={{ fontSize:12, color:'#374151', fontWeight:700, minWidth:90, textAlign:'right' }}>
                              {fmtCOP(ex.precio_unit)}
                            </span>
                            <button onClick={() => quitarExtra(idx)} style={{ background:'none', border:'none',
                              cursor:'pointer', color:'#EF4444', display:'flex', alignItems:'center' }}>
                              <X size={14}/>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Difunto (solo lectura) */}
                      <div className="sv-field">
                        <label>Difunto</label>
                        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                          background:'#F0FDF4', border:'1.5px solid #6EE7B7', borderRadius:10 }}>
                          <span style={{ fontSize:18 }}>👼</span>
                          <span style={{ fontSize:13, fontWeight:700, color:'#065F46' }}>{busqDif}</span>
                        </div>
                      </div>

                      {/* Campos mínimos */}
                      <div className="sv-grid2">
                        <div className="sv-field" style={{ marginBottom:0 }}>
                          <label>Tipo de disposición</label>
                          <select value={form.tipo_disposicion}
                            onChange={e => setForm(p => ({...p, tipo_disposicion:e.target.value}))}>
                            <option value="INHUMACION">⚰️ Inhumación</option>
                            <option value="CREMACION">🔥 Cremación</option>
                            <option value="OSARIO">🪦 Osario</option>
                          </select>
                        </div>
                        <div className="sv-field" style={{ marginBottom:0 }}>
                          <label>Sala de velación</label>
                          <select value={form.sala_id} onChange={e => setForm(p => ({...p, sala_id:e.target.value}))}>
                            <option value="">— Sin sala —</option>
                            {salasDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="sv-grid2" style={{ marginTop:14 }}>
                        <div className="sv-field" style={{ marginBottom:0 }}>
                          <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span>Lugar de recogida</span>
                            {(defForm.direccion_fallecimiento || defForm.lugar_fallecimiento) && (
                              <button type="button"
                                onClick={() => setForm(p => ({...p, lugar_recogida: defForm.direccion_fallecimiento || defForm.lugar_fallecimiento}))}
                                style={{ fontSize:10, fontWeight:700, color:'#7C3AED', background:'#F5F3FF',
                                  border:'1px solid #DDD6FE', borderRadius:6, padding:'2px 7px', cursor:'pointer' }}>
                                📍 Usar dir. fallecimiento
                              </button>
                            )}
                          </label>
                          <input value={form.lugar_recogida} placeholder="Hospital, domicilio…"
                            onChange={e => setForm(p => ({...p, lugar_recogida:e.target.value}))}/>
                        </div>
                        <div className="sv-field" style={{ marginBottom:0 }}>
                          <label>Fecha / hora recogida</label>
                          <input type="datetime-local" value={form.fecha_recogida}
                            onChange={e => setForm(p => ({...p, fecha_recogida:e.target.value}))}/>
                        </div>
                      </div>
                      <div className="sv-field" style={{ marginTop:14 }}>
                        <label>Observaciones</label>
                        <textarea value={form.observaciones} placeholder="Notas del servicio…"
                          onChange={e => setForm(p => ({...p, observaciones:e.target.value}))}/>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ══════════ SECCIÓN FALLECIMIENTO (aparece cuando hay difunto, después de vincular contrato/póliza) ══════════ */}
              {difuntoId && (
                <div style={{ marginTop:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, margin:'6px 0 14px',
                    padding:'10px 14px', borderRadius:12,
                    background: defExistente ? '#FEF3C7' : '#F0FDF4',
                    border: `1.5px solid ${defExistente ? '#FDE68A' : '#BBF7D0'}` }}>
                    <span style={{ fontSize:16 }}>{defExistente ? '⚠️' : '✅'}</span>
                    <span style={{ fontSize:12, fontWeight:700, color: defExistente ? '#92400E' : '#166534' }}>
                      {defExistente
                        ? 'Este difunto ya tiene datos de fallecimiento registrados — verifique y actualice si es necesario.'
                        : 'Difunto seleccionado — complete los datos del fallecimiento a continuación.'}
                    </span>
                  </div>

                  <div className="sv-section">Datos del fallecimiento</div>

                  <div className="sv-grid2">
                    <div className="sv-field">
                      <label>Fecha de fallecimiento <span className="sv-req">*</span></label>
                      <input type="date" value={defForm.fecha_fallecimiento}
                        onChange={e => setDef('fecha_fallecimiento', e.target.value)}/>
                    </div>
                    <div className="sv-field">
                      <label>Hora de fallecimiento</label>
                      <input type="time" value={defForm.hora_fallecimiento}
                        onChange={e => setDef('hora_fallecimiento', e.target.value)}/>
                    </div>
                  </div>

                  <div className="sv-grid2">
                    <div className="sv-field">
                      <label>Tipo de lugar</label>
                      <select value={defForm.tipo_lugar}
                        onChange={e => {
                          const nuevoTipo = e.target.value
                          setDef('tipo_lugar', nuevoTipo)
                          // Si es domicilio y ya tenemos la dirección registrada del difunto, se autocompleta
                          if (nuevoTipo === 'DOMICILIO' && difuntoDireccion && !defForm.lugar_fallecimiento) {
                            setDef('lugar_fallecimiento', difuntoDireccion)
                          }
                        }}>
                        <option value="">— Seleccionar —</option>
                        {TIPO_LUGAR_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                    <div className="sv-field">
                      <label>Tipo de muerte</label>
                      <select value={defForm.tipo_muerte} onChange={e => setDef('tipo_muerte', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {TIPO_MUERTE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="sv-field">
                    <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span>Lugar / Nombre del establecimiento</span>
                      {defForm.tipo_lugar === 'DOMICILIO' && difuntoDireccion && defForm.lugar_fallecimiento !== difuntoDireccion && (
                        <button type="button" onClick={() => setDef('lugar_fallecimiento', difuntoDireccion)}
                          style={{ fontSize:10, fontWeight:700, color:'#059669', background:'#F0FDF4',
                            border:'1px solid #BBF7D0', borderRadius:6, padding:'2px 7px', cursor:'pointer' }}>
                          🏠 Usar dirección registrada
                        </button>
                      )}
                    </label>
                    <input value={defForm.lugar_fallecimiento}
                      onChange={e => setDef('lugar_fallecimiento', e.target.value)}
                      placeholder={defForm.tipo_lugar === 'HOSPITAL' || defForm.tipo_lugar === 'CLINICA'
                        ? 'Ej: Clínica Norte de Ábrego…'
                        : 'Ej: Barrio El Centro, casa 12…'}/>
                    {defForm.tipo_lugar === 'DOMICILIO' && difuntoDireccion && defForm.lugar_fallecimiento === difuntoDireccion && (
                      <div style={{ fontSize:10.5, color:'#059669', marginTop:3 }}>
                        ✓ Autocompletado con la dirección registrada del difunto
                      </div>
                    )}
                  </div>

                  {['HOSPITAL','CLINICA'].includes(defForm.tipo_lugar) && (
                    <div className="sv-field">
                      <label>Dirección del establecimiento</label>
                      <input value={defForm.direccion_fallecimiento}
                        onChange={e => setDef('direccion_fallecimiento', e.target.value)}
                        placeholder="Calle, carrera, barrio…"/>
                    </div>
                  )}

                  <div className="sv-field">
                    <label>Causa de fallecimiento</label>
                    <input value={defForm.causa_fallecimiento}
                      onChange={e => setDef('causa_fallecimiento', e.target.value)}
                      placeholder="Ej: Paro cardiorrespiratorio…"/>
                  </div>

                  <div className="sv-grid2">
                    <div className="sv-field">
                      <label>Médico que certifica</label>
                      <input value={defForm.medico_certifica}
                        onChange={e => setDef('medico_certifica', e.target.value)}
                        placeholder="Nombre del médico…"/>
                    </div>
                    <div className="sv-field">
                      <label>Registro médico</label>
                      <input value={defForm.registro_medico}
                        onChange={e => setDef('registro_medico', e.target.value)}
                        placeholder="N° registro…"/>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Full form — solo PATH A (CONTRATO) o edición */}
          {(servicio || vinculoTipo !== 'POLIZA') && (
            <>
              <div className="sv-section" style={{ marginTop: servicio ? 0 : 6 }}>Disposición final</div>

              <div className="sv-grid2">
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Tipo de disposición <span className="sv-req">*</span></label>
                  <select value={form.tipo_disposicion}
                    onChange={e => setForm(p => ({...p, tipo_disposicion:e.target.value}))}>
                    <option value="INHUMACION">⚰️ Inhumación</option>
                    <option value="CREMACION">🔥 Cremación</option>
                    <option value="OSARIO">🪦 Osario</option>
                  </select>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Sala de velación</label>
                  <select value={form.sala_id} onChange={e => setForm(p => ({...p, sala_id:e.target.value}))}>
                    <option value="">— Sin sala asignada —</option>
                    {salasDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre} (cap. {s.capacidad})</option>)}
                  </select>
                  {form.fecha_velacion_ini && form.fecha_velacion_fin && salasOcupadas.size > 0 && (
                    <span style={{ fontSize:11, color:'#B45309' }}>Se ocultan las salas ya reservadas en ese horario.</span>
                  )}
                </div>
              </div>

              <div className="sv-section" style={{ marginTop:14 }}>Velación</div>
              <div className="sv-grid2">
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Inicio de velación</label>
                  <input type="datetime-local" value={form.fecha_velacion_ini}
                    onChange={e => setForm(p => ({...p, fecha_velacion_ini:e.target.value}))}/>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Fin de velación</label>
                  <input type="datetime-local" value={form.fecha_velacion_fin}
                    onChange={e => setForm(p => ({...p, fecha_velacion_fin:e.target.value}))}/>
                </div>
              </div>

              <div className="sv-section" style={{ marginTop:14 }}>Recogida y disposición</div>
              <div className="sv-grid2">
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span>Lugar de recogida</span>
                    {defForm.direccion_fallecimiento && (
                      <button type="button"
                        onClick={() => setForm(p => ({...p, lugar_recogida: defForm.direccion_fallecimiento}))}
                        style={{ fontSize:10, fontWeight:700, color:'#7C3AED', background:'#F5F3FF',
                          border:'1px solid #DDD6FE', borderRadius:6, padding:'2px 7px', cursor:'pointer' }}>
                        📍 Usar dir. fallecimiento
                      </button>
                    )}
                  </label>
                  <input value={form.lugar_recogida} placeholder="Hospital, domicilio…"
                    onChange={e => setForm(p => ({...p, lugar_recogida:e.target.value}))}/>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Fecha / hora recogida</label>
                  <input type="datetime-local" value={form.fecha_recogida}
                    onChange={e => setForm(p => ({...p, fecha_recogida:e.target.value}))}/>
                </div>
              </div>
              <div className="sv-grid2" style={{ marginTop:14 }}>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Lugar de {form.tipo_disposicion === 'CREMACION' ? 'cremación' : 'inhumación'}</label>
                  <input value={form.lugar_disposicion} placeholder="Cementerio, crematorio…"
                    onChange={e => setForm(p => ({...p, lugar_disposicion:e.target.value}))}/>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Fecha / hora</label>
                  <input type="datetime-local" value={form.fecha_disposicion}
                    onChange={e => setForm(p => ({...p, fecha_disposicion:e.target.value}))}/>
                </div>
              </div>

              <div className="sv-section" style={{ marginTop:14 }}>Trámites legales</div>
              <div className="sv-grid2">
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>N° Acta de defunción</label>
                  <input value={form.acta_defuncion} placeholder="Número de acta…"
                    onChange={e => setForm(p => ({...p, acta_defuncion:e.target.value}))}/>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Permiso de inhumación</label>
                  <input value={form.permiso_inhumacion} placeholder="Número de permiso…"
                    onChange={e => setForm(p => ({...p, permiso_inhumacion:e.target.value}))}/>
                </div>
              </div>

              {servicio && (
                <div className="sv-grid2" style={{ marginTop:8 }}>
                  <div className="sv-field" style={{ marginBottom:0 }}>
                    <label>Documento del acta de defunción <span style={{ color:'#9CA3AF', fontWeight:400 }}>(PDF, JPG, PNG…)</span></label>
                    <input ref={fileActaRef} type="file" accept={EXTENSIONES_SOPORTE} style={{ display:'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumento('acta_defuncion', f, setSoporteActaUrl, setSubiendoActa); e.target.value = null }}/>
                    <div onClick={() => !subiendoActa && fileActaRef.current?.click()}
                      style={{ border:`2px dashed ${soporteActaUrl ? '#059669' : '#E2E5F0'}`, borderRadius:10,
                        padding:'10px 12px', cursor: subiendoActa ? 'default' : 'pointer',
                        background: soporteActaUrl ? '#F0FDF4' : '#FAFBFF',
                        display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                      {subiendoActa ? (
                        <span style={{ color:'#6B7280' }}>Subiendo…</span>
                      ) : soporteActaUrl ? (
                        <>
                          <span style={{ color:'#059669', fontWeight:700 }}>✓ Documento adjunto</span>
                          <a href={`http://localhost:3001${soporteActaUrl}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()} style={{ color:'#6366F1', marginLeft:'auto' }}>Ver</a>
                          <span style={{ color:'#9CA3AF' }}>· Reemplazar</span>
                        </>
                      ) : (
                        <span style={{ color:'#6B7280' }}>Haz clic para adjuntar el acta escaneada…</span>
                      )}
                    </div>
                  </div>
                  <div className="sv-field" style={{ marginBottom:0 }}>
                    <label>Documento del permiso de inhumación <span style={{ color:'#9CA3AF', fontWeight:400 }}>(PDF, JPG, PNG…)</span></label>
                    <input ref={filePermisoRef} type="file" accept={EXTENSIONES_SOPORTE} style={{ display:'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumento('permiso_inhumacion', f, setSoportePermisoUrl, setSubiendoPermiso); e.target.value = null }}/>
                    <div onClick={() => !subiendoPermiso && filePermisoRef.current?.click()}
                      style={{ border:`2px dashed ${soportePermisoUrl ? '#059669' : '#E2E5F0'}`, borderRadius:10,
                        padding:'10px 12px', cursor: subiendoPermiso ? 'default' : 'pointer',
                        background: soportePermisoUrl ? '#F0FDF4' : '#FAFBFF',
                        display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                      {subiendoPermiso ? (
                        <span style={{ color:'#6B7280' }}>Subiendo…</span>
                      ) : soportePermisoUrl ? (
                        <>
                          <span style={{ color:'#059669', fontWeight:700 }}>✓ Documento adjunto</span>
                          <a href={`http://localhost:3001${soportePermisoUrl}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()} style={{ color:'#6366F1', marginLeft:'auto' }}>Ver</a>
                          <span style={{ color:'#9CA3AF' }}>· Reemplazar</span>
                        </>
                      ) : (
                        <span style={{ color:'#6B7280' }}>Haz clic para adjuntar el permiso escaneado…</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!servicio && (
                <div style={{ fontSize:11.5, color:'#9CA3AF', marginTop:6 }}>
                  Podrás adjuntar el acta de defunción y el permiso de inhumación escaneados (PDF, JPG, PNG…) después de crear el servicio.
                </div>
              )}

              {servicio && (
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14,
                  background:'#F8F9FF', padding:'12px 14px', borderRadius:10, border:'1.5px solid #ECEDF8' }}>
                  <input type="checkbox" id="tramites" checked={form.tramites_completos}
                    onChange={e => setForm(p => ({...p, tramites_completos:e.target.checked}))}
                    style={{ width:16, height:16, cursor:'pointer' }}/>
                  <label htmlFor="tramites" style={{ fontSize:13, fontWeight:700, color:'#374151', cursor:'pointer' }}>
                    ✓ Todos los trámites legales están completos
                  </label>
                </div>
              )}

              <div className="sv-field" style={{ marginTop:14 }}>
                <label>Observaciones</label>
                <textarea value={form.observaciones} placeholder="Notas del servicio…"
                  onChange={e => setForm(p => ({...p, observaciones:e.target.value}))}/>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
                <button className="sv-btn sv-btn-ghost" onClick={onClose}>Cancelar</button>
                <button className="sv-btn sv-btn-primary" onClick={guardar} disabled={saving}>
                  {saving ? <Loader2 size={14} className="sv-spin"/> : <Package size={14}/>}
                  {servicio ? 'Guardar cambios' : 'Registrar servicio'}
                </button>
              </div>
            </>
          )}

          {/* Botones para PATH B paso 2 */}
          {!servicio && vinculoTipo === 'POLIZA' && paso === 2 && (
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
              <button className="sv-btn sv-btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="sv-btn sv-btn-primary" onClick={guardar} disabled={saving}>
                {saving ? <Loader2 size={14} className="sv-spin"/> : <Package size={14}/>}
                Registrar servicio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ══════════ Modal — Crear rápido (Contratante / Difunto), fuera del overlay principal ══════════ */}
      {quickCrear && (
        <div className="sv-overlay" style={{ zIndex:1001 }}
          onClick={e => { if (e.target === e.currentTarget) setQuickCrear(null) }}>
          <div className="sv-modal" style={{ maxWidth:460 }}>
            <div className="sv-mhead">
              <div>
                <div className="sv-mtitle">
                  {quickCrear === 'DIFUNTO' ? 'Crear difunto nuevo' : 'Crear contratante nuevo'}
                </div>
                <div className="sv-msub">Registro rápido de tercero — puedes completar más datos luego</div>
              </div>
              <button className="sv-mclose" onClick={() => setQuickCrear(null)}><X size={16}/></button>
            </div>
            <div className="sv-mbody">
              <div className="sv-grid2">
                <div className="sv-field">
                  <label>Tipo de documento <span className="sv-req">*</span></label>
                  <select value={quickForm.tipo_documento_id}
                    onChange={e => setQuickForm(p => ({...p, tipo_documento_id:e.target.value}))}>
                    <option value="">— Seleccionar —</option>
                    {tiposDocs.map(t => <option key={t.id} value={t.id}>{t.sigla} — {t.nombre}</option>)}
                  </select>
                </div>
                <div className="sv-field">
                  <label>Número de documento <span className="sv-req">*</span></label>
                  <input value={quickForm.numero_documento}
                    onChange={e => setQuickForm(p => ({...p, numero_documento:e.target.value}))}
                    placeholder="Ej: 1090512345"/>
                </div>
              </div>
              <div className="sv-grid2">
                <div className="sv-field">
                  <label>Nombres <span className="sv-req">*</span></label>
                  <input value={quickForm.nombres}
                    onChange={e => setQuickForm(p => ({...p, nombres:e.target.value}))}/>
                </div>
                <div className="sv-field">
                  <label>Apellidos <span className="sv-req">*</span></label>
                  <input value={quickForm.apellidos}
                    onChange={e => setQuickForm(p => ({...p, apellidos:e.target.value}))}/>
                </div>
              </div>
              <div className="sv-grid2">
                <div className="sv-field">
                  <label>Teléfono</label>
                  <PhoneInput value={quickForm.telefono}
                    onChange={v => setQuickForm(p => ({...p, telefono:v}))}/>
                </div>
                <div className="sv-field">
                  <label>Email</label>
                  <input value={quickForm.email}
                    onChange={e => setQuickForm(p => ({...p, email:e.target.value}))}/>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
                <button className="sv-btn sv-btn-ghost" onClick={() => setQuickCrear(null)}>Cancelar</button>
                <button className="sv-btn sv-btn-primary" onClick={guardarCreacionRapida} disabled={quickSaving}>
                  {quickSaving ? <Loader2 size={14} className="sv-spin"/> : <UserPlus size={14}/>}
                  Crear y usar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Modal Ficha ───────────────────────────────────────────────────────────

// ── TabFallecido ──────────────────────────────────────────────────────────────

const ESTADO_CIVIL_OPTS = [
  { v:'SOLTERO',    l:'Soltero/a' },
  { v:'CASADO',     l:'Casado/a' },
  { v:'DIVORCIADO', l:'Divorciado/a' },
  { v:'VIUDO',      l:'Viudo/a' },
  { v:'UNION_LIBRE',l:'Unión libre' },
]
const NIVEL_EST_OPTS = [
  { v:'NINGUNO',      l:'Ninguno' },
  { v:'PRIMARIA',     l:'Primaria' },
  { v:'SECUNDARIA',   l:'Secundaria' },
  { v:'TECNICO',      l:'Técnico/Tecnólogo' },
  { v:'UNIVERSITARIO',l:'Universitario' },
  { v:'POSGRADO',     l:'Posgrado' },
]
const TIPO_LUGAR_OPTS = [
  { v:'DOMICILIO',        l:'Domicilio' },
  { v:'VIA_PUBLICA',      l:'Vía pública' },
  { v:'HOGAR_GERIATRICO', l:'Hogar geriátrico' },
  { v:'HOSPITAL',         l:'Hospital' },
  { v:'CLINICA',          l:'Clínica' },
  { v:'OTRO',             l:'Otro' },
]
const TIPO_MUERTE_OPTS = [
  { v:'NATURAL',    l:'Natural' },
  { v:'EN_ESTUDIO', l:'En estudio' },
  { v:'VIOLENTA',   l:'Violenta' },
]
const MATRIMONIO_OPTS = [
  { v:'CIVIL',      l:'Civil' },
  { v:'RELIGIOSO',  l:'Religioso' },
  { v:'UNION_LIBRE',l:'Unión libre' },
]

function calcEdad(fechaNac, fechaMuerte) {
  if (!fechaNac) return null
  const nac  = new Date(fechaNac)
  const ref  = fechaMuerte ? new Date(fechaMuerte) : new Date()
  let edad = ref.getFullYear() - nac.getFullYear()
  const m = ref.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad--
  return edad
}

function FRow({ label, value, children }) {
  return (
    <div className="sv-ficha-row">
      <span className="sv-ficha-key">{label}</span>
      <span className="sv-ficha-val">{children || value || '—'}</span>
    </div>
  )
}

function FSec({ title }) {
  return (
    <div style={{ fontSize:10, fontWeight:800, color:'#7C3AED', letterSpacing:1,
      textTransform:'uppercase', margin:'16px 0 10px',
      paddingBottom:6, borderBottom:'1.5px solid #EDE9FE' }}>
      {title}
    </div>
  )
}

function FField({ label, campo, type, opts, form, onChange }) {
  return (
    <div className="sv-field" style={{ marginBottom:10 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{label}</label>
      {opts ? (
        <select value={form[campo] || ''} onChange={e => onChange(campo, e.target.value)}>
          <option value="">— Seleccionar —</option>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type || 'text'} value={form[campo] || ''} onChange={e => onChange(campo, e.target.value)} />
      )}
    </div>
  )
}

// ── Listas de valores paramétricas (Sexo, Estado civil, Ocupación, Parentesco) ──
// Se administran en Configuración → Listas de valores. Cualquier usuario puede
// crear un valor nuevo al vuelo desde el mismo campo, igual que al buscar un tercero.
function useListaValores(tipo) {
  const [opts, setOpts] = useState([])
  const cargar = () => api.get('/listas-valores/select', { params: { tipo } })
    .then(r => setOpts(r.data.data || [])).catch(() => {})
  useEffect(() => { cargar() }, [tipo])
  return [opts, cargar]
}

function FFieldLista({ label, tipo, value, onChange, required }) {
  const [opts, recargar] = useListaValores(tipo)
  const [creando, setCreando] = useState(false)
  const [nuevo, setNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const crear = async () => {
    if (!nuevo.trim()) return
    setGuardando(true)
    try {
      const r = await api.post('/listas-valores', { tipo, etiqueta: nuevo.trim() })
      recargar()
      onChange(r.data.data.codigo)
      setNuevo(''); setCreando(false)
    } catch (e) { toast.error(e.response?.data?.error || 'Error al crear el valor') }
    finally { setGuardando(false) }
  }

  return (
    <div className="sv-field" style={{ marginBottom:10 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{label}{required && <span className="sv-req"> *</span>}</label>
      {creando ? (
        <div style={{ display:'flex', gap:6 }}>
          <input autoFocus value={nuevo} onChange={e => setNuevo(e.target.value)}
            placeholder={`Nuevo valor de ${label.toLowerCase()}…`}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crear() } }}
            style={{ flex:1 }}/>
          <button type="button" onClick={crear} disabled={guardando || !nuevo.trim()}
            style={{ padding:'0 12px', background:'#7C3AED', border:'none', borderRadius:8,
              color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {guardando ? '…' : '✓'}
          </button>
          <button type="button" onClick={() => { setCreando(false); setNuevo('') }}
            style={{ padding:'0 10px', background:'#F3F4F6', border:'none', borderRadius:8,
              color:'#6B7280', fontSize:12, cursor:'pointer' }}>
            ✕
          </button>
        </div>
      ) : (
        <select value={value || ''} onChange={e => {
          if (e.target.value === '__nuevo__') { setCreando(true); return }
          onChange(e.target.value)
        }}>
          <option value="">— Seleccionar —</option>
          {opts.map(o => <option key={o.id} value={o.codigo}>{o.etiqueta}</option>)}
          <option value="__nuevo__">➕ Agregar nuevo…</option>
        </select>
      )}
    </div>
  )
}

function TabFallecido({ data, servicioId, onSaved }) {
  const def = data?.defuncion || {}
  const [editMode, setEditMode] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState(false)

  const [form, setForm] = useState(null)
  const [tiposDocs, setTiposDocs] = useState([])
  useEffect(() => {
    api.get('/tipos-documento/select').then(r => setTiposDocs(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setForm({
      // Tercero
      tipo_documento_id:   data?.difunto_tipo_documento_id || '',
      numero_documento:    data?.difunto_documento         || '',
      fecha_nacimiento:    data?.difunto_nacimiento?.slice(0,10) || '',
      sexo:                data?.difunto_sexo || '',
      lugar_exp_documento: data?.difunto_lugar_exp_doc || '',
      estado_civil:        data?.difunto_estado_civil  || '',
      tipo_matrimonio:     data?.difunto_tipo_matrimonio || '',
      num_hijos:           data?.difunto_num_hijos ?? '',
      nacionalidad:        data?.difunto_nacionalidad  || 'COLOMBIANA',
      religion:            data?.difunto_religion      || '',
      nivel_estudios:      data?.difunto_nivel_estudios || '',
      ocupacion:           data?.difunto_ocupacion     || '',
      seguridad_social:    data?.difunto_seguridad_social || '',
      nombre_conyuge:      data?.difunto_nombre_conyuge || '',
      nombre_padre:        data?.difunto_nombre_padre  || '',
      nombre_madre:        data?.difunto_nombre_madre  || '',
      // Defunción
      fecha_fallecimiento:     def.fecha_fallecimiento?.slice(0,10) || '',
      hora_fallecimiento:      def.hora_fallecimiento  || '',
      tipo_lugar:              def.tipo_lugar           || '',
      lugar_fallecimiento:     def.lugar_fallecimiento  || '',
      direccion_fallecimiento: def.direccion_fallecimiento || '',
      causa_fallecimiento:     def.causa_fallecimiento  || '',
      tipo_muerte:             def.tipo_muerte          || '',
      medico_certifica:        def.medico_certifica     || '',
      registro_medico:         def.registro_medico      || '',
      cert_defuncion_num:      def.cert_defuncion_num   || '',
      licencia_inhumacion:     def.licencia_inhumacion  || '',
      ciudad_registro:         def.ciudad_registro      || '',
      notaria:                 def.notaria              || '',
      serial_registro:         def.serial_registro      || '',
      fecha_registro:          def.fecha_registro?.slice(0,10) || '',
      fecha_llegada:           def.fecha_llegada?.slice(0,16)  || '',
    })
  }, [data, def])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    setSaving(true); setErr(''); setOk(false)
    try {
      await api.put(`/servicios/${servicioId}/fallecido`, form)
      setOk(true); setEditMode(false)
      toast.success('Datos del fallecido actualizados')
      onSaved()
      setTimeout(() => setOk(false), 3000)
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al guardar')
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const edad = calcEdad(data?.difunto_nacimiento, form?.fecha_fallecimiento || def.fecha_fallecimiento)

  if (!form) return null

  return (
    <div>
      {/* Cabecera identificación */}
      <div className="sv-ficha-block" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div className="sv-ficha-tit">👤 Identificación</div>
          {!editMode && (
            <button onClick={() => setEditMode(true)}
              style={{ fontSize:11, fontWeight:700, color:'#7C3AED', background:'#EDE9FE',
                border:'none', borderRadius:8, padding:'4px 12px', cursor:'pointer' }}>
              ✏️ Editar
            </button>
          )}
        </div>
        {editMode ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <div className="sv-field" style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151' }}>Tipo de documento</label>
              <select value={form.tipo_documento_id} onChange={e => set('tipo_documento_id', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {tiposDocs.map(t => <option key={t.id} value={t.id}>{t.sigla} — {t.nombre}</option>)}
              </select>
            </div>
            <FField label="Número de documento" campo="numero_documento" form={form} onChange={set} />
            <FField label="Fecha de nacimiento" campo="fecha_nacimiento" type="date" form={form} onChange={set} />
            <FFieldLista label="Sexo" tipo="SEXO" value={form.sexo} onChange={v => set('sexo', v)} />
          </div>
        ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
          <FRow label="Documento">{data?.difunto_tipo_doc} {data?.difunto_documento}</FRow>
          <FRow label="Fecha nacimiento">{data?.difunto_nacimiento ? new Date(data.difunto_nacimiento).toLocaleDateString('es-CO',{timeZone:'UTC'}) : '—'}</FRow>
          <FRow label="Sexo">{data?.difunto_sexo === 'M' ? 'Masculino' : data?.difunto_sexo === 'F' ? 'Femenino' : '—'}</FRow>
          {edad !== null && <FRow label="Edad (calculada)">
            <span style={{ fontWeight:900, color:'#7C3AED' }}>{edad} años</span>
          </FRow>}
        </div>
        )}
      </div>

      {ok && <div className="sv-alert ok" style={{ marginBottom:12 }}><CheckCircle2 size={13}/> Datos guardados correctamente</div>}
      {err && <div className="sv-alert err" style={{ marginBottom:12 }}><AlertTriangle size={13}/> {err}</div>}

      {editMode ? (
        <>
          <FSec title="Datos personales" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FField label="Lugar expedición documento" campo="lugar_exp_documento" form={form} onChange={set} />
            <FFieldLista label="Estado civil" tipo="ESTADO_CIVIL" value={form.estado_civil} onChange={v => set('estado_civil', v)} />
            <FField label="Tipo de matrimonio" campo="tipo_matrimonio" opts={MATRIMONIO_OPTS} form={form} onChange={set} />
            <FField label="Número de hijos" campo="num_hijos" type="number" form={form} onChange={set} />
            <FField label="Nacionalidad" campo="nacionalidad" form={form} onChange={set} />
            <FField label="Religión / Credo" campo="religion" form={form} onChange={set} />
            <FField label="Nivel de estudios" campo="nivel_estudios" opts={NIVEL_EST_OPTS} form={form} onChange={set} />
            <FFieldLista label="Ocupación" tipo="OCUPACION" value={form.ocupacion} onChange={v => set('ocupacion', v)} />
            <FField label="Seguridad social (EPS)" campo="seguridad_social" form={form} onChange={set} />
          </div>

          <FSec title="Familia" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FField label="Nombre del cónyuge" campo="nombre_conyuge" form={form} onChange={set} />
            <div/>
            <FField label="Nombre del padre" campo="nombre_padre" form={form} onChange={set} />
            <FField label="Nombre de la madre" campo="nombre_madre" form={form} onChange={set} />
          </div>

          <FSec title="Evento de fallecimiento" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FField label="Fecha de fallecimiento" campo="fecha_fallecimiento" type="date" form={form} onChange={set} />
            <FField label="Hora de fallecimiento" campo="hora_fallecimiento" type="time" form={form} onChange={set} />
            <FField label="Tipo de lugar" campo="tipo_lugar" opts={TIPO_LUGAR_OPTS} form={form} onChange={set} />
            <FField label="Tipo de muerte" campo="tipo_muerte" opts={TIPO_MUERTE_OPTS} form={form} onChange={set} />
            <FField label="Causa de muerte" campo="causa_fallecimiento" form={form} onChange={set} />
            <FField label="Médico que certifica" campo="medico_certifica" form={form} onChange={set} />
          </div>
          {['HOSPITAL','CLINICA'].includes(form.tipo_lugar) && (
            <FField label="Dirección del lugar de fallecimiento" campo="direccion_fallecimiento" form={form} onChange={set} />
          )}

          <FSec title="Documentos y registro legal" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FField label="Registro médico" campo="registro_medico" form={form} onChange={set} />
            <FField label="N° certificado de defunción" campo="cert_defuncion_num" form={form} onChange={set} />
            <FField label="Licencia de inhumación" campo="licencia_inhumacion" form={form} onChange={set} />
            <FField label="Ciudad de registro" campo="ciudad_registro" form={form} onChange={set} />
            <FField label="Notaría" campo="notaria" form={form} onChange={set} />
            <FField label="Serial de registro" campo="serial_registro" form={form} onChange={set} />
            <FField label="Fecha de registro" campo="fecha_registro" type="date" form={form} onChange={set} />
            <FField label="Fecha llegada a la funeraria" campo="fecha_llegada" type="datetime-local" form={form} onChange={set} />
          </div>

          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={guardar} disabled={saving}
              className="sv-btn sv-btn-primary" style={{ flex:1 }}>
              {saving ? <Loader2 size={14} className="sv-spin"/> : <CheckCircle2 size={14}/>}
              {saving ? 'Guardando…' : 'Guardar datos del fallecido'}
            </button>
            <button onClick={() => setEditMode(false)} className="sv-btn sv-btn-ghost">
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {/* Datos personales */}
            <div className="tab-card" style={{ marginBottom:0 }}>
              <div className="tab-card-head"><span className="tab-card-icon">👥</span><span className="tab-card-title">Datos personales</span></div>
              <div className="tab-card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  ['Lugar exp. doc.', data?.difunto_lugar_exp_doc],
                  ['Estado civil', ESTADO_CIVIL_OPTS.find(o=>o.v===data?.difunto_estado_civil)?.l],
                  ['Matrimonio', MATRIMONIO_OPTS.find(o=>o.v===data?.difunto_tipo_matrimonio)?.l],
                  ['N° hijos', data?.difunto_num_hijos],
                  ['Nacionalidad', data?.difunto_nacionalidad],
                  ['Religión', data?.difunto_religion],
                  ['Nivel estudios', NIVEL_EST_OPTS.find(o=>o.v===data?.difunto_nivel_estudios)?.l],
                  ['Ocupación', data?.difunto_ocupacion],
                  ['EPS', data?.difunto_seguridad_social],
                ].map(([l,v]) => (
                  <div key={l} className="tab-field">
                    <span className="tab-field-label">{l}</span>
                    <span className={`tab-field-value${v?'':' muted'}`}>{v||'—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Familia */}
              <div className="tab-card" style={{ marginBottom:0 }}>
                <div className="tab-card-head"><span className="tab-card-icon">👨‍👩‍👦</span><span className="tab-card-title">Familia</span></div>
                <div className="tab-card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[['Cónyuge',data?.difunto_nombre_conyuge],['Padre',data?.difunto_nombre_padre],['Madre',data?.difunto_nombre_madre]].map(([l,v])=>(
                    <div key={l} className="tab-field"><span className="tab-field-label">{l}</span><span className={`tab-field-value${v?'':' muted'}`}>{v||'—'}</span></div>
                  ))}
                </div>
              </div>
              {/* Fallecimiento */}
              <div className="tab-card" style={{ marginBottom:0 }}>
                <div className="tab-card-head"><span className="tab-card-icon">⚰️</span><span className="tab-card-title">Fallecimiento</span></div>
                <div className="tab-card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    ['Fecha', def.fecha_fallecimiento ? new Date(def.fecha_fallecimiento).toLocaleDateString('es-CO',{timeZone:'UTC'}) : '—'],
                    ['Hora', def.hora_fallecimiento||'—'],
                    ['Tipo lugar', TIPO_LUGAR_OPTS.find(o=>o.v===def.tipo_lugar)?.l],
                    ['Tipo muerte', TIPO_MUERTE_OPTS.find(o=>o.v===def.tipo_muerte)?.l],
                    ['Causa', def.causa_fallecimiento],
                    ['Médico', def.medico_certifica],
                    ...(def.direccion_fallecimiento?[['Dirección',def.direccion_fallecimiento]]:[]),
                  ].map(([l,v])=>(
                    <div key={l} className="tab-field"><span className="tab-field-label">{l}</span><span className={`tab-field-value${v?'':' muted'}`}>{v||'—'}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Documentos legales */}
          <div className="tab-card" style={{ marginTop:14 }}>
            <div className="tab-card-head"><span className="tab-card-icon">📋</span><span className="tab-card-title">Documentos legales</span></div>
            <div className="tab-card-body tab-grid tab-grid-3">
              {[
                ['Registro médico', def.registro_medico],
                ['Cert. defunción', def.cert_defuncion_num],
                ['Lic. inhumación', def.licencia_inhumacion],
                ['Ciudad registro', def.ciudad_registro],
                ['Notaría', def.notaria],
                ['Serial', def.serial_registro],
                ['Fecha registro', def.fecha_registro ? new Date(def.fecha_registro).toLocaleDateString('es-CO',{timeZone:'UTC'}) : '—'],
                ['Llegada funeraria', def.fecha_llegada ? new Date(def.fecha_llegada).toLocaleString('es-CO',{timeZone:'UTC'}) : '—'],
              ].map(([l,v])=>(
                <div key={l} className="tab-field"><span className="tab-field-label">{l}</span><span className={`tab-field-value${v?'':' muted'}`}>{v||'—'}</span></div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── TabInfoGeneral ────────────────────────────────────────────────────────────

function TabInfoGeneral({ data, servicioId, onSaved, onEstado, esEditor, esAdmin }) {
  const [editMode, setEditMode] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [salas,    setSalas]    = useState([])
  const [form,     setForm]     = useState({})

  const fmtDT = v => v ? new Date(v).toLocaleString('es-CO', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

  const iniciarEdicion = async () => {
    if (!salas.length) {
      const r = await api.get('/servicios/salas')
      setSalas(r.data.data || [])
    }
    setForm({
      tipo_disposicion:  data.tipo_disposicion || 'INHUMACION',
      sala_id:           data.sala_id           || '',
      fecha_velacion_ini:data.fecha_velacion_ini ? data.fecha_velacion_ini.slice(0,16) : '',
      fecha_velacion_fin:data.fecha_velacion_fin ? data.fecha_velacion_fin.slice(0,16) : '',
      lugar_recogida:    data.lugar_recogida    || '',
      fecha_recogida:    data.fecha_recogida    ? data.fecha_recogida.slice(0,16) : '',
      lugar_disposicion: data.lugar_disposicion || '',
      fecha_disposicion: data.fecha_disposicion ? data.fecha_disposicion.slice(0,16) : '',
      observaciones:     data.observaciones     || '',
    })
    setMsg('')
    setEditMode(true)
  }

  const guardar = async () => {
    setSaving(true); setMsg('')
    try {
      await api.put(`/servicios/${servicioId}`, form)
      toast.success('Información general actualizada')
      await onSaved()
      setEditMode(false)
    } catch (e) { setMsg(e.response?.data?.error || 'Error al guardar'); toast.error(e.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Disponibilidad de salas de velación ────────────────────────────────────
  const [salasOcupadas, setSalasOcupadas] = useState(new Set())
  useEffect(() => {
    const { fecha_velacion_ini, fecha_velacion_fin } = form
    if (!editMode || !fecha_velacion_ini || !fecha_velacion_fin) { setSalasOcupadas(new Set()); return }
    let cancelado = false
    api.get('/servicios/salas', { params: { ini: fecha_velacion_ini, fin: fecha_velacion_fin, excluir_id: servicioId } })
      .then(r => { if (!cancelado) setSalasOcupadas(new Set((r.data.data || []).filter(s => s.ocupada).map(s => s.id))) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [editMode, form.fecha_velacion_ini, form.fecha_velacion_fin, servicioId])
  const salasDisponibles = salas.filter(s => !salasOcupadas.has(s.id) || s.id === form.sala_id)

  const disp = DISPOSICION_META[data?.tipo_disposicion] || DISPOSICION_META.INHUMACION
  const dispForm = DISPOSICION_META[form.tipo_disposicion] || DISPOSICION_META.INHUMACION
  const bloqueado = ['COMPLETADO','CANCELADO'].includes(data?.estado)

  // ── helpers de lectura ──────────────────────────────────────────────────
  const DField = ({ label, value, wide, accent }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:4,
      gridColumn: wide ? '1/-1' : undefined }}>
      <span style={{ fontSize:10.5, fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:.5 }}>
        {label}
      </span>
      <span style={{ fontSize:13.5, fontWeight:700, color: accent || '#111827', lineHeight:1.3 }}>
        {value || '—'}
      </span>
    </div>
  )

  const Card = ({ icon, title, children, cols=2, accent }) => (
    <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:14,
      overflow:'hidden', marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 16px',
        borderBottom:'1px solid #F0F0F5',
        background: accent ? `linear-gradient(135deg,${accent}18,${accent}08)` : '#FAFBFF' }}>
        <span style={{ fontSize:17 }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:800, color: accent || '#374151',
          textTransform:'uppercase', letterSpacing:.7 }}>{title}</span>
      </div>
      <div style={{ padding:'14px 16px',
        display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:'12px 20px' }}>
        {children}
      </div>
    </div>
  )

  // ── Modo lectura ────────────────────────────────────────────────────────
  if (!editMode) return (
    <div>
      {/* Barra de estado + acciones */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {(() => { const m = ESTADO_META[data?.estado]; return m ? (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700,
              background: m.bg, color: m.color, border:`1.5px solid ${m.color}30`,
              padding:'4px 12px', borderRadius:20 }}>
              <m.Icon size={12}/> {m.label}
            </span>
          ) : null })()}
          <span style={{ fontSize:12, color:'#9CA3AF' }}>
            Creado {fmtDT(data?.creado_en)}
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {esEditor && !bloqueado && data?.estado === 'RECIBIDO' && (
            <button onClick={() => onEstado(data.id,'EN_CURSO')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
                background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:9,
                color:'#D97706', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <Clock size={13}/> Iniciar servicio
            </button>
          )}
          {esEditor && !bloqueado && data?.estado === 'EN_CURSO' && (
            <button onClick={() => onEstado(data.id,'COMPLETADO')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
                background:'#F0FDF4', border:'1.5px solid #A7F3D0', borderRadius:9,
                color:'#059669', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <CheckCircle2 size={13}/> Completar servicio
            </button>
          )}
          {esAdmin && !bloqueado && (
            <button onClick={() => onEstado(data.id,'CANCELADO')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
                background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:9,
                color:'#DC2626', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <Ban size={13}/> Cancelar
            </button>
          )}
          {esEditor && !bloqueado && (
            <button onClick={iniciarEdicion}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
                background:'linear-gradient(135deg,#7C3AED,#6D28D9)', border:'none', borderRadius:9,
                color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <Edit2 size={13}/> Editar
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta Difunto */}
      <Card icon="🕊️" title="Difunto" cols={3} accent="#6D28D9">
        <DField label="Nombre completo" value={data.difunto_nombre} wide/>
        <DField label="Grupo RH" value={data.difunto_rh} accent="#DC2626"/>
        <DField label="Disposición final" value={`${disp.icon} ${disp.label}`}/>
      </Card>

      {/* Velación y Recogida */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 16px',
            borderBottom:'1px solid #F0F0F5', background:'#FAFBFF' }}>
            <span style={{ fontSize:17 }}>🕯️</span>
            <span style={{ fontSize:11, fontWeight:800, color:'#374151', textTransform:'uppercase', letterSpacing:.7 }}>
              Velación
            </span>
          </div>
          <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            <DField label="Sala" value={data.sala_nombre}/>
            <DField label="Inicio" value={fmtDT(data.fecha_velacion_ini)}/>
            <DField label="Fin" value={fmtDT(data.fecha_velacion_fin)}/>
          </div>
        </div>
        <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 16px',
            borderBottom:'1px solid #F0F0F5', background:'#FAFBFF' }}>
            <span style={{ fontSize:17 }}>🚐</span>
            <span style={{ fontSize:11, fontWeight:800, color:'#374151', textTransform:'uppercase', letterSpacing:.7 }}>
              Recogida
            </span>
          </div>
          <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            <DField label="Lugar" value={data.lugar_recogida}/>
            <DField label="Fecha y hora" value={fmtDT(data.fecha_recogida)}/>
          </div>
        </div>
      </div>

      {/* Disposición final */}
      <Card icon={disp.icon} title={`Disposición final — ${disp.label}`} cols={2} accent={disp.color}>
        <DField label="Lugar" value={data.lugar_disposicion}/>
        <DField label="Fecha y hora" value={fmtDT(data.fecha_disposicion)}/>
      </Card>

      {/* Observaciones */}
      {data.observaciones && (
        <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:14,
          padding:'14px 16px' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#92400E', textTransform:'uppercase',
            letterSpacing:.7, marginBottom:8 }}>📝 Observaciones</div>
          <div style={{ fontSize:13, color:'#374151', lineHeight:1.7 }}>{data.observaciones}</div>
        </div>
      )}
    </div>
  )

  // ── Modo edición ────────────────────────────────────────────────────────
  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0',
    borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const lbl = { fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#6D28D9' }}>Editar información general</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setEditMode(false)}
            style={{ padding:'7px 14px', border:'1.5px solid #E4E6F0', borderRadius:9,
              background:'#F8F9FF', color:'#6B7280', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving}
            style={{ padding:'7px 18px', background:'linear-gradient(135deg,#7C3AED,#6D28D9)',
              border:'none', borderRadius:9, color:'#fff', fontSize:12, fontWeight:700,
              cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            {saving ? <Loader2 size={13} style={{ animation:'spin .7s linear infinite' }}/> : '💾'}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {msg && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'8px 12px',
        borderRadius:8, fontSize:12, fontWeight:600, marginBottom:14 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

        {/* Tipo disposición */}
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Tipo de disposición final</label>
          <div style={{ display:'flex', gap:10 }}>
            {Object.entries(DISPOSICION_META).map(([k,v]) => (
              <button key={k} onClick={() => set('tipo_disposicion', k)}
                style={{ flex:1, padding:'10px 0', border:`2px solid ${form.tipo_disposicion===k ? v.color : '#E2E5F0'}`,
                  borderRadius:11, background: form.tipo_disposicion===k ? v.color+'15' : '#F8F9FF',
                  color: form.tipo_disposicion===k ? v.color : '#6B7280',
                  fontSize:13, fontWeight:800, cursor:'pointer', transition:'all .15s' }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sala */}
        <div>
          <label style={lbl}>Sala de velación</label>
          <select value={form.sala_id} onChange={e => set('sala_id', e.target.value)} style={inp}>
            <option value=''>— Sin sala asignada —</option>
            {salasDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre} (cap. {s.capacidad})</option>)}
          </select>
          {form.fecha_velacion_ini && form.fecha_velacion_fin && salasOcupadas.size > 0 && (
            <span style={{ fontSize:11, color:'#B45309' }}>Se ocultan las salas ya reservadas en ese horario.</span>
          )}
        </div>

        {/* Fechas velación */}
        <div style={{ display:'contents' }}>
          <div>
            <label style={lbl}>Inicio velación</label>
            <input type="datetime-local" value={form.fecha_velacion_ini}
              onChange={e => set('fecha_velacion_ini', e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Fin velación</label>
            <input type="datetime-local" value={form.fecha_velacion_fin}
              onChange={e => set('fecha_velacion_fin', e.target.value)} style={inp}/>
          </div>
        </div>

        {/* Recogida */}
        <div>
          <label style={lbl}>Lugar de recogida</label>
          <input value={form.lugar_recogida} onChange={e => set('lugar_recogida', e.target.value)}
            placeholder="Hospital, domicilio, clínica…" style={inp}/>
        </div>
        <div>
          <label style={lbl}>Fecha y hora de recogida</label>
          <input type="datetime-local" value={form.fecha_recogida}
            onChange={e => set('fecha_recogida', e.target.value)} style={inp}/>
        </div>

        {/* Disposición final */}
        <div>
          <label style={lbl}>{dispForm.icon} Lugar de {dispForm.label.toLowerCase()}</label>
          <input value={form.lugar_disposicion} onChange={e => set('lugar_disposicion', e.target.value)}
            placeholder={form.tipo_disposicion === 'CREMACION' ? 'Nombre del crematorio…' : 'Nombre del cementerio…'}
            style={inp}/>
        </div>
        <div>
          <label style={lbl}>Fecha y hora de {dispForm.label.toLowerCase()}</label>
          <input type="datetime-local" value={form.fecha_disposicion}
            onChange={e => set('fecha_disposicion', e.target.value)} style={inp}/>
        </div>

        {/* Observaciones */}
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Observaciones</label>
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
            rows={3} placeholder="Notas adicionales del servicio…"
            style={{ ...inp, resize:'vertical' }}/>
        </div>
      </div>
    </div>
  )
}

// ── TabHistorial ──────────────────────────────────────────────────────────────
const MODULO_META = {
  estado:       { icon:'🔄', label:'Estado',       color:'#7C3AED', bg:'#EDE9FE' },
  info:         { icon:'📋', label:'Información',  color:'#1D4ED8', bg:'#DBEAFE' },
  fallecido:    { icon:'🕊️', label:'Fallecido',   color:'#374151', bg:'#F3F4F6' },
  contratante:  { icon:'👤', label:'Contratante',  color:'#0E7490', bg:'#CFFAFE' },
  items:        { icon:'📦', label:'Servicios',    color:'#065F46', bg:'#D1FAE5' },
  traslados:    { icon:'🚐', label:'Traslados',    color:'#92400E', bg:'#FEF3C7' },
  personal:     { icon:'👥', label:'Personal',     color:'#6B21A8', bg:'#F3E8FF' },
  tanatopraxia: { icon:'🩺', label:'Tanatopraxia', color:'#0F766E', bg:'#CCFBF1' },
  tramites:     { icon:'📝', label:'Trámites',     color:'#166534', bg:'#DCFCE7' },
}

function TabHistorial({ servicioId }) {
  const [lista,    setLista]    = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    api.get(`/servicios/${servicioId}/historial`)
      .then(r => setLista(r.data.data || []))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [servicioId])

  const fmtDT = d => new Date(d).toLocaleString('es-CO', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
  })

  if (cargando) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <Loader2 size={24} className="sv-spin" color="#8B5CF6"/>
    </div>
  )

  if (lista.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px',
      background:'#FAFAFA', borderRadius:14, border:'1.5px dashed #E5E7EB' }}>
      <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
      <div style={{ fontWeight:700, fontSize:14, color:'#374151', marginBottom:4 }}>Sin registros aún</div>
      <div style={{ fontSize:12, color:'#9CA3AF' }}>
        Los cambios en este servicio quedarán registrados aquí automáticamente
      </div>
    </div>
  )

  // Agrupar por fecha (día)
  const grupos = []
  let diaActual = null
  for (const e of lista) {
    const dia = new Date(e.creado_en).toLocaleDateString('es-CO',
      { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
    if (dia !== diaActual) { grupos.push({ dia, items:[] }); diaActual = dia }
    grupos[grupos.length-1].items.push(e)
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Historial de modificaciones</div>
          <div style={{ fontSize:12, color:'#6B7280', marginTop:1 }}>
            {lista.length} registro{lista.length!==1?'s':''} · actualización automática
          </div>
        </div>
      </div>

      <div style={{ position:'relative' }}>
        {/* Línea vertical de timeline */}
        <div style={{ position:'absolute', left:19, top:0, bottom:0, width:2,
          background:'linear-gradient(to bottom,#DDD6FE,#E5E7EB)', borderRadius:1 }}/>

        {grupos.map((g, gi) => (
          <div key={gi} style={{ marginBottom:24 }}>
            {/* Cabecera de día */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, position:'relative', zIndex:1 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'#6D28D9',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, flexShrink:0, boxShadow:'0 2px 8px #6D28D940' }}>
                📅
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:'#374151',
                background:'#F5F3FF', border:'1px solid #DDD6FE',
                padding:'3px 10px', borderRadius:20 }}>
                {g.dia.charAt(0).toUpperCase() + g.dia.slice(1)}
              </span>
            </div>

            {/* Eventos del día */}
            <div style={{ paddingLeft:56, display:'flex', flexDirection:'column', gap:6 }}>
              {g.items.map(e => {
                const m = MODULO_META[e.modulo] || { icon:'⚡', label:e.modulo, color:'#374151', bg:'#F3F4F6' }
                const ROL_LABEL = {
                  superadmin:'Superadmin', administrador:'Admin',
                  operador:'Operador', asesor_comercial:'Asesor',
                }
                return (
                  <div key={e.id} style={{ display:'flex', alignItems:'flex-start', gap:12,
                    background:'#fff', border:'1px solid #F0F0F5', borderRadius:11,
                    padding:'11px 14px', position:'relative' }}>
                    {/* Dot de módulo */}
                    <div style={{ position:'absolute', left:-37, top:14, width:10, height:10,
                      borderRadius:'50%', background: m.color,
                      border:'2px solid #fff', boxShadow:`0 0 0 2px ${m.color}40` }}/>
                    {/* Icono módulo */}
                    <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                      background: m.bg, display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:15 }}>
                      {m.icon}
                    </div>
                    {/* Contenido */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, fontWeight:700, background:m.bg,
                          color:m.color, borderRadius:5, padding:'1px 7px' }}>
                          {m.label}
                        </span>
                        <span style={{ fontSize:12.5, color:'#111827', fontWeight:500 }}>
                          {e.accion}
                        </span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {e.usuario_nombre && (
                          <span style={{ fontSize:11, color:'#6B7280', fontWeight:600 }}>
                            👤 {e.usuario_nombre}
                            {e.usuario_rol && (
                              <span style={{ fontWeight:400, color:'#9CA3AF' }}>
                                {' '}· {ROL_LABEL[e.usuario_rol] || e.usuario_rol}
                              </span>
                            )}
                          </span>
                        )}
                        <span style={{ fontSize:10, color:'#D1D5DB' }}>·</span>
                        <span style={{ fontSize:11, color:'#9CA3AF' }}>
                          {new Date(e.creado_en).toLocaleTimeString('es-CO',
                            { hour:'2-digit', minute:'2-digit', hour12:true })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── TabPersonal ───────────────────────────────────────────────────────────────
// Los roles se administran en Configuración → Roles de Personal (con costo interno
// y vínculo opcional a un ítem vendible del catálogo). Este mapa solo da ícono/color
// a los roles predefinidos; uno nuevo creado desde Parámetros usa el ícono genérico.
const ROLES_SERVICIO_ICONOS = {
  'Director de Servicios':    { Icon:UserSquare2,   color:'#5B21B6', bg:'#EDE9FE' },
  'Conductor / Traslado':     { Icon:Truck,         color:'#1D4ED8', bg:'#DBEAFE' },
  'Tanatopraxia':             { Icon:Stethoscope,   color:'#065F46', bg:'#D1FAE5' },
  'Recepción de Restos':      { Icon:Handshake,     color:'#92400E', bg:'#FEF3C7' },
  'Asesor Comercial':         { Icon:Briefcase,     color:'#0E7490', bg:'#CFFAFE' },
  'Operador de Sala':         { Icon:Landmark,      color:'#6B21A8', bg:'#F3E8FF' },
  'Auxiliar Funerario':       { Icon:Wrench,        color:'#374151', bg:'#F3F4F6' },
  'Apoyo Logístico':          { Icon:PackageSearch, color:'#B45309', bg:'#FEF9C3' },
  'Coordinador de Trámites':  { Icon:ClipboardList, color:'#166534', bg:'#DCFCE7' },
}
const ROL_ICONO_DEFECTO = { Icon:Users, color:'#6B7280', bg:'#F3F4F6' }

const ROL_SISTEMA = {
  superadmin:       { label:'Superadmin',   bg:'#EDE9FE', color:'#5B21B6' },
  administrador:    { label:'Admin',         bg:'#DBEAFE', color:'#1D4ED8' },
  operador:         { label:'Operador',      bg:'#D1FAE5', color:'#065F46' },
  asesor_comercial: { label:'Asesor',        bg:'#FEF3C7', color:'#92400E' },
}

function TabPersonal({ servicioId, esEditor, onItemAgregado }) {
  const [lista,     setLista]     = useState([])
  const [usuarios,  setUsuarios]  = useState([])
  const [roles,     setRoles]     = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [paso,      setPaso]      = useState(0) // 0=lista 1=elegir_persona 2=elegir_rol
  const [selUser,   setSelUser]   = useState(null)
  const [selRol,    setSelRol]    = useState('')
  const [selRolObj, setSelRolObj] = useState(null)
  const [cobrarItem, setCobrarItem] = useState(false)
  const [notas,     setNotas]     = useState('')
  const [buscar,    setBuscar]    = useState('') // eslint-disable-line
  const [guardando, setGuardando] = useState(false)
  const [quitando,  setQuitando]  = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [pRes, uRes, rRes] = await Promise.all([
        api.get(`/servicios/${servicioId}/personal`),
        api.get('/servicios/operadores'),
        api.get('/roles-personal/select'),
      ])
      setLista(pRes.data.data || [])
      setUsuarios(uRes.data.data || [])
      setRoles(rRes.data.data || [])
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }, [servicioId])

  useEffect(() => { cargar() }, [cargar])

  const asignados  = new Set(lista.map(p => p.usuario_id))
  const disponibles = usuarios.filter(u => !asignados.has(u.id))

  const cancelar = () => { setPaso(0); setSelUser(null); setSelRol(''); setSelRolObj(null); setCobrarItem(false); setNotas('') }

  const guardar = async () => {
    if (!selUser || !selRol) return
    setGuardando(true)
    try {
      await api.post(`/servicios/${servicioId}/personal`, {
        usuario_id: selUser.id, rol_servicio: selRol, notas: notas || null,
      })
      if (cobrarItem && selRolObj?.catalogo_id) {
        await api.post(`/servicios/${servicioId}/items`, { catalogo_id: selRolObj.catalogo_id })
        toast.success('Personal asignado y servicio agregado al cobro')
        onItemAgregado?.()
      } else {
        toast.success('Personal asignado')
      }
      cancelar()
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al asignar')
    } finally { setGuardando(false) }
  }

  const quitar = async (pid, nombre) => {
    if (!window.confirm(`¿Quitar a ${nombre} de este servicio?`)) return
    setQuitando(pid)
    try { await api.delete(`/servicios/${servicioId}/personal/${pid}`); toast.success('Personal removido'); cargar() }
    catch { toast.error('Error al remover personal') }
    finally { setQuitando(null) }
  }

  if (cargando) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <Loader2 size={24} className="spin" color="#8B5CF6"/>
    </div>
  )

  // ── Paso 1: elegir persona ──────────────────────────────────────────────────
  if (paso === 1) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={cancelar}
          style={{ border:'none', background:'#F3F4F6', borderRadius:8, padding:'6px 10px',
            cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#374151' }}>
          <ChevronLeft size={14}/> Volver
        </button>
        <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Seleccionar colaborador</span>
      </div>
      {disponibles.length === 0 ? (
        <div style={{ textAlign:'center', padding:'30px 0', color:'#9CA3AF', fontSize:13 }}>
          Todos los colaboradores ya están asignados
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {disponibles.map(u => {
            const rs = ROL_SISTEMA[u.rol] || { label:u.rol, bg:'#F3F4F6', color:'#374151' }
            return (
              <button key={u.id} onClick={() => { setSelUser(u); setPaso(2) }}
                style={{ display:'flex', alignItems:'center', gap:12, background:'#fff',
                  border:'1.5px solid #E5E7EB', borderRadius:10, padding:'11px 14px',
                  cursor:'pointer', textAlign:'left', transition:'border-color .15s,box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#8B5CF6'; e.currentTarget.style.boxShadow='0 0 0 3px #EDE9FE' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.boxShadow='none' }}>
                <div style={{ width:40, height:40, borderRadius:11, flexShrink:0, fontWeight:800,
                  background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
                  {(u.nombre || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{u.nombre}</div>
                  <div style={{ fontSize:11, color:'#6B7280' }}>{u.email}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, background:rs.bg, color:rs.color,
                  borderRadius:5, padding:'2px 8px' }}>{rs.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── Paso 2: elegir rol ──────────────────────────────────────────────────────
  if (paso === 2) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={() => { setPaso(1); setSelRol('') }}
          style={{ border:'none', background:'#F3F4F6', borderRadius:8, padding:'6px 10px',
            cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#374151' }}>
          <ChevronLeft size={14}/> Volver
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:14 }}>
            {(selUser?.nombre || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{selUser?.nombre}</div>
            <div style={{ fontSize:11, color:'#6B7280' }}>Selecciona su función en este servicio</div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        {roles.map(r => {
          const meta = ROLES_SERVICIO_ICONOS[r.etiqueta] || ROL_ICONO_DEFECTO
          const activo = selRol === r.etiqueta
          return (
            <button key={r.id} onClick={() => { setSelRol(r.etiqueta); setSelRolObj(r); setCobrarItem(false) }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                padding:'16px 10px', borderRadius:14, cursor:'pointer', transition:'all .15s', background:'#fff',
                border: activo ? `1.5px solid ${meta.color}` : '1.5px solid #E5E7EB',
                boxShadow: activo ? `0 0 0 3px ${meta.bg}, 0 4px 12px rgba(0,0,0,.06)` : 'none' }}
              onMouseEnter={e => { if (!activo) e.currentTarget.style.borderColor = '#C4B5FD' }}
              onMouseLeave={e => { if (!activo) e.currentTarget.style.borderColor = '#E5E7EB' }}>
              <div style={{ width:38, height:38, borderRadius:11, background:meta.bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: activo ? `0 3px 8px rgba(0,0,0,.12)` : 'none', transition:'all .15s' }}>
                <meta.Icon size={18} color={meta.color} strokeWidth={2.2}/>
              </div>
              <span style={{ fontSize:11, fontWeight: activo ? 700 : 600,
                color: activo ? meta.color : '#374151', textAlign:'center', lineHeight:1.3 }}>
                {r.etiqueta}
              </span>
            </button>
          )
        })}
      </div>

      {selRolObj?.catalogo_id && (
        <label style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#F0FDF4',
          border:'1.5px solid #BBF7D0', borderRadius:12, padding:'12px 14px', marginBottom:16, cursor:'pointer' }}>
          <input type="checkbox" checked={cobrarItem} onChange={e => setCobrarItem(e.target.checked)}
            style={{ width:16, height:16, marginTop:1, accentColor:'#059669' }}/>
          <span style={{ fontSize:12.5, color:'#065F46' }}>
            <strong>Agregar también como ítem cobrable del servicio</strong><br/>
            {selRolObj.etiqueta} se sumará al total como "{selRolObj.catalogo_nombre}" ({new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(selRolObj.catalogo_precio||0)})
          </span>
        </label>
      )}

      <div className="sv-field" style={{ marginBottom:16 }}>
        <label>Notas / instrucciones (opcional)</label>
        <textarea rows={2} placeholder="Ej: Turno mañana, llevar equipo de tanatopraxia…"
          value={notas} onChange={e => setNotas(e.target.value)}/>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="sv-btn sv-btn-ghost" style={{ fontSize:13 }} onClick={cancelar}>
          Cancelar
        </button>
        <button className="sv-btn sv-btn-primary" style={{ fontSize:13, minWidth:120 }}
          onClick={guardar} disabled={guardando || !selRol}>
          {guardando ? <Loader2 size={14} className="spin"/> : <Plus size={14}/>}
          {guardando ? 'Guardando…' : 'Confirmar asignación'}
        </button>
      </div>
    </div>
  )

  // ── Paso 0: lista principal ─────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>
            Personal del servicio
          </div>
          <div style={{ fontSize:12, color:'#6B7280', marginTop:1 }}>
            {lista.length === 0
              ? 'Ningún colaborador asignado aún'
              : `${lista.length} colaborador${lista.length !== 1 ? 'es' : ''} asignado${lista.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {esEditor && usuarios.length > asignados.size && (
          <button className="sv-btn sv-btn-primary" style={{ padding:'8px 16px', fontSize:13 }}
            onClick={() => setPaso(1)}>
            <Plus size={14}/> Asignar colaborador
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px',
          background:'#FAFAFA', borderRadius:14, border:'1.5px dashed #E5E7EB' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>👥</div>
          <div style={{ fontWeight:700, fontSize:14, color:'#374151', marginBottom:4 }}>
            Sin personal asignado
          </div>
          <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:16 }}>
            Asigna colaboradores con sus roles específicos para este servicio
          </div>
          {esEditor && (
            <button className="sv-btn sv-btn-primary" style={{ fontSize:13 }}
              onClick={() => setPaso(1)}>
              <Plus size={14}/> Asignar primer colaborador
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
          {lista.map(p => {
            const rs  = ROL_SISTEMA[p.rol] || { label:p.rol, bg:'#F3F4F6', color:'#374151' }
            const rsMeta = ROLES_SERVICIO_ICONOS[p.rol_servicio] || null
            return (
              <div key={p.id} style={{ background:'#fff', border:'1px solid #E5E7EB',
                borderRadius:12, overflow:'hidden', position:'relative' }}>
                {/* Banda color arriba */}
                <div style={{ height:4, background: rsMeta ? rsMeta.color : '#8B5CF6' }}/>
                <div style={{ padding:'13px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:40, height:40, borderRadius:11, flexShrink:0, fontWeight:800,
                      background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
                      {p.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#111827',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {p.nombre}
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, background:rs.bg, color:rs.color,
                        borderRadius:5, padding:'1px 7px' }}>{rs.label}</span>
                    </div>
                    {esEditor && (
                      <button onClick={() => quitar(p.id, p.nombre)} disabled={quitando===p.id}
                        style={{ border:'none', background:'#FEF2F2', borderRadius:7, padding:'5px 7px',
                          cursor:'pointer', color:'#EF4444', opacity: quitando===p.id ? .5 : 1,
                          flexShrink:0 }}>
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>
                  {/* Rol en el servicio */}
                  <div style={{ display:'flex', alignItems:'center', gap:6,
                    background: rsMeta ? rsMeta.bg : '#F5F3FF', borderRadius:8, padding:'6px 10px' }}>
                    <span style={{ fontSize:16 }}>{rsMeta?.icon || '👤'}</span>
                    <span style={{ fontSize:12, fontWeight:700,
                      color: rsMeta ? rsMeta.color : '#5B21B6' }}>{p.rol_servicio}</span>
                  </div>
                  {p.notas && (
                    <div style={{ marginTop:8, fontSize:11, color:'#6B7280', fontStyle:'italic',
                      background:'#FAFAFA', borderRadius:7, padding:'6px 8px' }}>
                      💬 {p.notas}
                    </div>
                  )}
                  <div style={{ marginTop:8, fontSize:10, color:'#D1D5DB', textAlign:'right' }}>
                    Asignado {new Date(p.asignado_en).toLocaleDateString('es-CO',
                      { day:'2-digit', month:'short', year:'numeric' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TabServicios ──────────────────────────────────────────────────────────────

const CAT_COL2 = {
  ATAUD:'#7C3AED', TRASLADO:'#2563EB', SALA_VELACION:'#0891B2',
  DOCUMENTOS:'#D97706', CREMACION:'#DC2626', PREPARACION:'#059669',
  FLORES:'#DB2777', ADICIONAL:'#64748B', INHUMACION:'#92400E',
  URNA:'#6D28D9', GENERAL:'#374151',
}
const catCol = cat => CAT_COL2[cat] || '#374151'

function TabServicios({ data, servicioId, onSaved, esEditor }) {
  const fmtCOP = v => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v||0)

  const [catalogo,  setCatalogo]  = useState([])
  const [busqueda,  setBusqueda]  = useState('')
  const [catSel,    setCatSel]    = useState(null)
  const [savingAdd, setSavingAdd] = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [editVals,  setEditVals]  = useState({})
  const [savingEd,  setSavingEd]  = useState(false)
  const [msg,       setMsg]       = useState('')

  const items       = data?.items || []
  const bloqueado   = data?.estado === 'CANCELADO'
  const total       = items.reduce((s, i) => s + Number(i.subtotal || 0), 0)
  const cobertura   = items.filter(i => i.es_cobertura)
  const adicionales = items.filter(i => !i.es_cobertura)
  const valorCobertura = cobertura.reduce((s, i) => s + Number(i.subtotal || 0), 0)

  const cargarCatalogo = async () => {
    if (catalogo.length) return
    const r = await api.get('/servicios/catalogo')
    setCatalogo(r.data.data || [])
  }

  const yaAgregados = new Set(items.map(i => i.catalogo_id).filter(Boolean))
  const catalogoFiltrado = catalogo.filter(c =>
    !yaAgregados.has(c.id) &&
    (busqueda.length < 2 ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.categoria||'').toLowerCase().includes(busqueda.toLowerCase()))
  )

  const agregar = async () => {
    if (!catSel) return
    setSavingAdd(true); setMsg('')
    try {
      await api.post(`/servicios/${servicioId}/items`, { catalogo_id: catSel.id })
      toast.success('Ítem agregado')
      await onSaved()
      setCatSel(null); setBusqueda('')
    } catch (e) { setMsg(e.response?.data?.error || 'Error al agregar'); toast.error(e.response?.data?.error || 'Error al agregar') }
    finally { setSavingAdd(false) }
  }

  const guardarEdicion = async (itemId) => {
    setSavingEd(true)
    try {
      await api.put(`/servicios/${servicioId}/items/${itemId}`, editVals)
      toast.success('Ítem actualizado')
      await onSaved()
      setEditId(null)
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar') }
    finally { setSavingEd(false) }
  }

  const eliminar = async (itemId) => {
    try {
      await api.delete(`/servicios/${servicioId}/items/${itemId}`)
      toast.success('Ítem eliminado')
      onSaved()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al eliminar') }
  }

  const inp = { padding:'6px 8px', border:'1.5px solid #DDD6FE', borderRadius:8, fontSize:12, outline:'none', background:'#fff' }

  const ItemRow = ({ it }) => {
    const col = catCol(it.categoria)
    const enEd = editId === it.id
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
        background: it.es_cobertura ? '#F0FDF4' : '#fff', borderRadius:11,
        border:`1.5px solid ${enEd ? '#DDD6FE' : it.es_cobertura ? '#BBF7D0' : '#ECEDF8'}` }}>

        <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
          background:`${col}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {it.es_cobertura ? <CheckCircle2 size={14} color="#059669"/> : <Plus size={14} color={col}/>}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          {enEd
            ? <input value={editVals.descripcion}
                onChange={e => setEditVals(p => ({ ...p, descripcion:e.target.value }))}
                style={{ ...inp, width:'100%', boxSizing:'border-box' }}/>
            : <>
                <div style={{ fontSize:13, fontWeight:700, color:'#0F1035',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {it.descripcion}
                </div>
                <div style={{ fontSize:10.5, color: col, fontWeight:700 }}>
                  {it.catalogo_codigo && <span style={{ marginRight:5 }}>{it.catalogo_codigo} ·</span>}
                  {it.categoria || '—'}
                  {it.es_cobertura && <span style={{ color:'#059669', marginLeft:5 }}>· Cobertura póliza</span>}
                </div>
              </>
          }
        </div>

        <div style={{ textAlign:'center', minWidth:56 }}>
          {enEd
            ? <input type="number" value={editVals.cantidad} min={1}
                onChange={e => setEditVals(p => ({ ...p, cantidad:e.target.value }))}
                style={{ ...inp, width:50, textAlign:'center' }}/>
            : <><div style={{ fontSize:10, color:'#9CA3AF' }}>Cant.</div>
               <div style={{ fontSize:13, fontWeight:700 }}>{Number(it.cantidad)}</div></>
          }
        </div>

        <div style={{ textAlign:'right', minWidth:96 }}>
          {enEd
            ? <CurrencyInput value={editVals.precio_unit}
                onChange={v => setEditVals(p => ({ ...p, precio_unit:v }))}
                style={{ width:86 }}/>
            : <><div style={{ fontSize:10, color:'#9CA3AF' }}>Precio</div>
               <div style={{ fontSize:12, fontWeight:700, color: col }}>{fmtCOP(it.precio_unit)}</div></>
          }
        </div>

        {!enEd && (
          <div style={{ textAlign:'right', minWidth:96 }}>
            <div style={{ fontSize:10, color:'#9CA3AF' }}>Subtotal</div>
            <div style={{ fontSize:13, fontWeight:900 }}>{fmtCOP(it.subtotal)}</div>
          </div>
        )}

        {esEditor && !bloqueado && (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            {enEd ? <>
              <button onClick={() => guardarEdicion(it.id)} disabled={savingEd}
                style={{ padding:'5px 10px', background:'#7C3AED', border:'none',
                  borderRadius:8, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {savingEd ? '…' : '✓'}
              </button>
              <button onClick={() => setEditId(null)}
                style={{ padding:'5px 8px', background:'#F1F5F9', border:'none',
                  borderRadius:8, color:'#64748B', fontSize:11, cursor:'pointer' }}>✕</button>
            </> : <>
              <button onClick={() => { setEditId(it.id); setEditVals({ descripcion:it.descripcion, cantidad:it.cantidad, precio_unit:it.precio_unit }) }}
                style={{ padding:'5px 8px', background:'#F5F3FF', border:'1px solid #DDD6FE',
                  borderRadius:8, color:'#7C3AED', cursor:'pointer', lineHeight:0 }}>
                <Pencil size={12}/>
              </button>
              <button onClick={() => eliminar(it.id)}
                style={{ padding:'5px 8px', background:'none', border:'none',
                  borderRadius:8, color:'#CBD5E1', cursor:'pointer', lineHeight:0 }}
                onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                onMouseLeave={e => e.currentTarget.style.color='#CBD5E1'}>
                <Trash2 size={13}/>
              </button>
            </>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>

      {/* Totalizador */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        <div style={{ background:'#F8F9FF', borderRadius:14, padding:'14px 16px',
          border:'1.5px solid #ECEDF8', textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase',
            letterSpacing:.7, marginBottom:6 }}>Total ítems</div>
          <div style={{ fontSize:24, fontWeight:900, color:'#7C3AED' }}>{items.length}</div>
        </div>

        <div style={{ background: data?.poliza_id ? '#F0FDF4' : '#F8F9FF', borderRadius:14,
          padding:'14px 16px', border:`1.5px solid ${data?.poliza_id ? '#BBF7D0' : '#ECEDF8'}`,
          textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase',
            letterSpacing:.7, marginBottom:4 }}>
            {data?.poliza_id ? `Cobertura · ${data?.poliza_plan || 'Póliza'}` : 'Cobertura póliza'}
          </div>
          {data?.poliza_id ? (
            <>
              <div style={{ fontSize:16, fontWeight:900, color:'#059669' }}>
                {valorCobertura > 0 ? fmtCOP(valorCobertura) : '—'}
              </div>
              {data?.poliza_valor_excedente > 0 && (
                <div style={{ fontSize:10, color:'#6B7280', marginTop:2 }}>
                  + excedente {fmtCOP(data.poliza_valor_excedente)}
                </div>
              )}
              <div style={{ fontSize:10, color:'#059669', marginTop:2 }}>
                {cobertura.length} ítem{cobertura.length !== 1 ? 's' : ''} cubierto{cobertura.length !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize:13, color:'#9CA3AF', fontWeight:600 }}>Sin póliza</div>
          )}
        </div>

        <div style={{ background:'#F8F9FF', borderRadius:14, padding:'14px 16px',
          border:'1.5px solid #ECEDF8', textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase',
            letterSpacing:.7, marginBottom:6 }}>Valor total</div>
          <div style={{ fontSize:18, fontWeight:900, color:'#0891B2' }}>{fmtCOP(total)}</div>
        </div>
      </div>

      {data?.convenio_id && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ECFEFF',
          border:'1px solid #A5F3FC', color:'#0E7490', borderRadius:10, padding:'9px 14px',
          fontSize:12, fontWeight:600, marginBottom:16 }}>
          🤝 Este valor total alimenta automáticamente la cobertura del convenio — cada vez que agregas,
          editas o quitas un ítem, se recalcula cuánto cubre el convenio y cuánto queda en cartera de {data.convenio_absorbe_resto === 'FUNERARIA' ? 'nadie (la empresa lo condona)' : 'la familia'} (pestaña Contratante).
        </div>
      )}

      {msg && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'8px 12px',
        borderRadius:8, fontSize:12, fontWeight:600, marginBottom:14 }}>{msg}</div>}

      {/* Agregar ítem */}
      {esEditor && !bloqueado && (
        <div style={{ background:'#F8F9FF', borderRadius:14, padding:'16px',
          border:'1.5px solid #ECEDF8', marginBottom:20 }}
          onClick={cargarCatalogo}>
          <div style={{ fontSize:10, fontWeight:800, color:'#7C3AED',
            letterSpacing:.8, textTransform:'uppercase', marginBottom:10 }}>
            Agregar servicio del catálogo
          </div>
          <div style={{ position:'relative', marginBottom:8 }}>
            <input value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setCatSel(null) }}
              placeholder="Buscar por nombre, código o categoría…"
              style={{ width:'100%', padding:'9px 12px 9px 34px',
                border:'1.5px solid #E2E5F0', borderRadius:10, fontSize:13,
                outline:'none', boxSizing:'border-box' }}/>
            <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
              color:'#9CA3AF', pointerEvents:'none' }}
              width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>

          {busqueda.length >= 1 && !catSel && (
            <div style={{ maxHeight:180, overflowY:'auto', border:'1.5px solid #E2E5F0',
              borderRadius:10, background:'#fff', marginBottom:10 }}>
              {catalogoFiltrado.length === 0
                ? <div style={{ padding:'12px 16px', fontSize:12, color:'#9CA3AF', textAlign:'center' }}>Sin coincidencias</div>
                : catalogoFiltrado.map(c => (
                  <button key={c.id}
                    onClick={() => { setCatSel(c); setBusqueda(c.nombre) }}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%',
                      padding:'9px 14px', border:'none', borderBottom:'1px solid #F4F5FA',
                      background:'none', cursor:'pointer', textAlign:'left' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F8F9FF'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}>
                    <span style={{ fontSize:10, fontWeight:800, padding:'2px 6px', borderRadius:5,
                      background:catCol(c.categoria)+'18', color:catCol(c.categoria), whiteSpace:'nowrap' }}>
                      {c.codigo}
                    </span>
                    <span style={{ flex:1, fontSize:12.5, fontWeight:600, color:'#0F1035' }}>{c.nombre}</span>
                    <span style={{ fontSize:12, color:'#6B7280', whiteSpace:'nowrap' }}>{fmtCOP(c.precio_base)}</span>
                  </button>
                ))
              }
            </div>
          )}

          {catSel && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
              background:`${catCol(catSel.categoria)}0E`,
              border:`1.5px solid ${catCol(catSel.categoria)}30`,
              borderRadius:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:800, color:catCol(catSel.categoria) }}>
                  {catSel.codigo} · {catSel.categoria}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0F1035' }}>{catSel.nombre}</div>
              </div>
              <div style={{ fontSize:15, fontWeight:900, color:catCol(catSel.categoria) }}>
                {fmtCOP(catSel.precio_base)}
              </div>
              <button onClick={() => { setCatSel(null); setBusqueda('') }}
                style={{ border:'none', background:'none', cursor:'pointer', color:'#9CA3AF', lineHeight:0 }}>
                <X size={14}/>
              </button>
            </div>
          )}

          <button onClick={agregar} disabled={!catSel || savingAdd}
            style={{ padding:'8px 18px',
              background: catSel ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : '#E4E6F0',
              color: catSel ? '#fff' : '#9CA3AF', border:'none', borderRadius:10,
              fontSize:12, fontWeight:700, cursor: catSel ? 'pointer' : 'default',
              display:'flex', alignItems:'center', gap:6 }}>
            {savingAdd ? <Loader2 size={13} style={{ animation:'spin .7s linear infinite' }}/> : <Plus size={13}/>}
            {savingAdd ? 'Agregando…' : 'Agregar al servicio'}
          </button>
        </div>
      )}

      {/* Lista */}
      {items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#CBD5E1' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📦</div>
          <div style={{ fontSize:13, fontWeight:700 }}>Sin servicios registrados</div>
          <div style={{ fontSize:12, marginTop:4 }}>Agrega ítems del catálogo arriba.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {cobertura.length > 0 && (
            <div style={{ fontSize:10, fontWeight:800, color:'#059669', letterSpacing:.7,
              textTransform:'uppercase', marginBottom:2 }}>Cobertura de póliza</div>
          )}
          {cobertura.map(it => <ItemRow key={it.id} it={it}/>)}

          {adicionales.length > 0 && (
            <div style={{ fontSize:10, fontWeight:800, color:'#7C3AED', letterSpacing:.7,
              textTransform:'uppercase', margin:'8px 0 2px' }}>Servicios adicionales</div>
          )}
          {adicionales.map(it => <ItemRow key={it.id} it={it}/>)}

          <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center',
            gap:12, marginTop:10, padding:'12px 16px',
            background:'linear-gradient(135deg,#6D28D9,#8B5CF6)',
            borderRadius:12, color:'#fff' }}>
            <span style={{ fontSize:13, fontWeight:700, opacity:.85 }}>Total del servicio</span>
            <span style={{ fontSize:20, fontWeight:900, letterSpacing:-.5 }}>{fmtCOP(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TabPoliza ─────────────────────────────────────────────────────────────────

const POLIZA_ESTADO_CFG = {
  VIGENTE:    { bg:'#ECFDF5', color:'#059669', label:'Vigente' },
  SUSPENDIDA: { bg:'#FEF3C7', color:'#D97706', label:'Suspendida' },
  VENCIDA:    { bg:'#FEF2F2', color:'#DC2626', label:'Vencida' },
  EJECUTADA:  { bg:'#F5F3FF', color:'#7C3AED', label:'Ejecutada' },
  CANCELADA:  { bg:'#F1F5F9', color:'#64748B', label:'Cancelada' },
}

function TabPoliza({ data }) {
  const fmtCOP = v => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v||0)
  const fmtF   = f => { if (!f) return '—'; const d = new Date(f.includes('T') ? f : f+'T12:00:00'); return isNaN(d) ? '—' : d.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}) }

  if (!data?.poliza_id) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
      <div style={{ fontSize:14, fontWeight:700, color:'#9CA3AF', marginBottom:6 }}>
        Sin póliza exequial vinculada
      </div>
      <div style={{ fontSize:12, color:'#CBD5E1' }}>
        Este servicio fue contratado de forma directa (inmediato).<br/>
        Los servicios vinculados a una póliza muestran aquí la cobertura del plan.
      </div>
    </div>
  )

  const est = POLIZA_ESTADO_CFG[data.poliza_estado] || POLIZA_ESTADO_CFG.VIGENTE
  const ben = data.poliza_beneficiario

  const coberturas = [
    { label:'Velación', val: data.poliza_cubre_velacion_h ? `${data.poliza_cubre_velacion_h} horas` : null, tipo:'text' },
    ...(Array.isArray(data.poliza_servicios) ? data.poliza_servicios.map(s => (
      { label: s.nombre, val: true, tipo:'bool' }
    )) : []),
  ]

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

        {/* Encabezado póliza */}
        <div style={{ gridColumn:'1/-1', background:'linear-gradient(135deg,#6D28D9,#8B5CF6)',
          borderRadius:14, padding:'18px 22px', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, opacity:.7, letterSpacing:.8, textTransform:'uppercase', marginBottom:4 }}>
              Póliza Exequial · {data.poliza_plan_tipo}
            </div>
            <div style={{ fontSize:24, fontWeight:900, letterSpacing:-.5 }}>
              #{data.poliza_numero} — {data.poliza_plan}
            </div>
            <div style={{ fontSize:12, opacity:.8, marginTop:4 }}>
              Titular: <strong>{data.poliza_titular}</strong>
              {data.poliza_titular_tel && <span> · {data.poliza_titular_tel}</span>}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'inline-block', padding:'5px 14px', borderRadius:20,
              background: est.bg, color: est.color, fontWeight:800, fontSize:13 }}>
              {est.label}
            </div>
            {data.poliza_meses_mora > 0 && (
              <div style={{ fontSize:11, marginTop:6, color:'#FCA5A5', fontWeight:700 }}>
                ⚠️ {data.poliza_meses_mora} mes(es) de mora · {fmtCOP(data.poliza_saldo_mora)}
              </div>
            )}
          </div>
        </div>

        {/* Datos financieros */}
        <div style={{ background:'#F8F9FF', borderRadius:14, padding:'16px 18px', border:'1.5px solid #ECEDF8' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#7C3AED', letterSpacing:.8,
            textTransform:'uppercase', marginBottom:12 }}>Información financiera</div>
          {[
            ['Cuota mensual',  fmtCOP(data.poliza_valor_cuota)],
            ['Vigente desde',  fmtF(data.poliza_fecha_inicio)],
            ['Pagado hasta',   fmtF(data.poliza_pago_hasta)],
            ['Excedente plan', fmtCOP(data.poliza_valor_excedente)],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between',
              padding:'5px 0', borderBottom:'1px solid #F0F1F8', fontSize:12 }}>
              <span style={{ color:'#6B7280' }}>{k}</span>
              <span style={{ fontWeight:700, color:'#0F1035' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Beneficiario ejecutado */}
        <div style={{ background: ben ? '#FDF4FF' : '#F8F9FF', borderRadius:14,
          padding:'16px 18px', border:`1.5px solid ${ben ? '#E9D5FF' : '#ECEDF8'}` }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#7C3AED', letterSpacing:.8,
            textTransform:'uppercase', marginBottom:12 }}>Beneficiario ejecutado</div>
          {ben ? (
            <>
              <div style={{ fontSize:15, fontWeight:900, color:'#0F1035', marginBottom:8 }}>
                {ben.beneficiario_nombre}
              </div>
              {[
                ['Documento',   ben.beneficiario_documento],
                ['Parentesco',  ben.parentesco],
                ['F. ejecución',fmtF(ben.fecha_ejecucion)],
              ].map(([k,v]) => v ? (
                <div key={k} style={{ display:'flex', justifyContent:'space-between',
                  padding:'4px 0', borderBottom:'1px solid #F0F1F8', fontSize:12 }}>
                  <span style={{ color:'#6B7280' }}>{k}</span>
                  <span style={{ fontWeight:700, color:'#7C3AED' }}>{v}</span>
                </div>
              ) : null)}
            </>
          ) : (
            <div style={{ fontSize:12, color:'#CBD5E1', fontStyle:'italic' }}>
              No se encontró beneficiario ejecutado registrado.
            </div>
          )}
        </div>

        {/* Coberturas del plan */}
        <div style={{ gridColumn:'1/-1', background:'#F8F9FF', borderRadius:14,
          padding:'16px 18px', border:'1.5px solid #ECEDF8' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#059669', letterSpacing:.8,
            textTransform:'uppercase', marginBottom:14 }}>Coberturas incluidas en el plan</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {coberturas.map(({ label, val, tipo }) => {
              const activo = tipo === 'bool' ? !!val : !!val
              return (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'9px 12px', borderRadius:10,
                  background: activo ? '#ECFDF5' : '#F1F5F9',
                  border:`1.5px solid ${activo ? '#A7F3D0' : '#E2E8F0'}` }}>
                  <span style={{ fontSize:14 }}>{activo ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700,
                      color: activo ? '#059669' : '#94A3B8' }}>{label}</div>
                    {tipo === 'text' && val && (
                      <div style={{ fontSize:10, color:'#6B7280' }}>{val}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── TabContratante ────────────────────────────────────────────────────────────

function ConvenioCoberturaBox({ data, servicioId, onSaved }) {
  const [recalculando, setRecalculando] = useState(false)

  if (!data?.convenio_id) return null
  const valorServicio  = +data.convenio_valor_servicio || 0
  const valorCubierto  = +data.convenio_valor_cubierto || 0
  const resto          = Math.max(0, valorServicio - valorCubierto)
  const absorbeFuneraria = data.convenio_absorbe_resto === 'FUNERARIA'
  const pctCubierto    = valorServicio > 0 ? Math.round((valorCubierto / valorServicio) * 100) : 0
  const pctResto       = 100 - pctCubierto
  const fmtCOPBox = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v)

  const recalcular = async () => {
    let valor = valorServicio
    if (!valor || valor <= 0) {
      const input = window.prompt('Este servicio no tiene un valor registrado. Ingresa el valor total del servicio para calcular la cobertura:')
      if (!input) return
      valor = +input.replace(/[^\d]/g, '')
      if (!valor || valor <= 0) return toast.error('Valor inválido')
    }
    setRecalculando(true)
    try {
      await api.patch(`/servicios/${servicioId}/convenio/recalcular`, { convenio_valor_servicio: valor })
      toast.success('Cobertura recalculada con la configuración actual del convenio')
      onSaved?.()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al recalcular')
    } finally { setRecalculando(false) }
  }

  return (
    <div className="tab-card" style={{ marginBottom:14 }}>
      <div className="tab-card-head" style={{ background:'linear-gradient(90deg,#ECFEFF,#CFFAFE)' }}>
        <span className="tab-card-icon">💰</span>
        <span className="tab-card-title" style={{ color:'#0E7490' }}>Cobertura del convenio</span>
        <button onClick={recalcular} disabled={recalculando}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
            background:'#fff', border:'1px solid #A5F3FC', borderRadius:7, color:'#0891B2',
            fontSize:11, fontWeight:700, cursor:'pointer' }}>
          {recalculando ? <Loader2 size={11} className="sv-spin"/> : <RefreshCw size={11}/>} Recalcular
        </button>
      </div>
      <div className="tab-card-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:'#0E7490', textTransform:'uppercase', letterSpacing:.5 }}>
              Cubre {data.convenio_nombre || 'el convenio'}
            </div>
            <div style={{ fontSize:20, fontWeight:900, color:'#0891B2' }}>{fmtCOPBox(valorCubierto)}</div>
            <div style={{ fontSize:11, color:'#0E7490', fontWeight:700 }}>{pctCubierto}% del servicio</div>
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color: absorbeFuneraria ? '#6D28D9' : '#9A3412', textTransform:'uppercase', letterSpacing:.5 }}>
              {absorbeFuneraria ? 'Condonado por la empresa' : 'Cartera a cargo de la familia'}
            </div>
            <div style={{ fontSize:20, fontWeight:900, color: absorbeFuneraria ? '#7C3AED' : '#C2410C' }}>{fmtCOPBox(resto)}</div>
            <div style={{ fontSize:11, color: absorbeFuneraria ? '#6D28D9' : '#9A3412', fontWeight:700 }}>{pctResto}% del servicio</div>
          </div>
        </div>
        <div style={{ height:8, borderRadius:20, background:'#FFF7ED', overflow:'hidden', display:'flex' }}>
          <div style={{ width:`${pctCubierto}%`, background:'linear-gradient(90deg,#06B6D4,#0891B2)' }}/>
        </div>
        {absorbeFuneraria && resto > 0 && (
          <div style={{ fontSize:11.5, color:'#7C3AED', fontWeight:700, marginTop:10 }}>
            🏢 La familia no paga nada por este servicio — la funeraria asume la diferencia.
          </div>
        )}
        <div style={{ fontSize:11, color:'#9CA3AF', marginTop:8 }}>
          Valor total del servicio: {fmtCOPBox(valorServicio)}
          {data.convenio_autorizacion_nombre && ` · Autorización: ${data.convenio_autorizacion_nombre}`}
        </div>
      </div>
    </div>
  )
}

function TabContratante({ data, servicioId, onSaved }) {
  const [editMode, setEditMode] = useState(false)
  const [parentesco, setParentesco] = useState(data?.contratante_parentesco || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setParentesco(data?.contratante_parentesco || '')
  }, [data])

  const guardar = async () => {
    setSaving(true); setMsg('')
    try {
      await api.put(`/servicios/${servicioId}/contratante`, { parentesco })
      toast.success('Contratante actualizado')
      onSaved()
      setEditMode(false)
    } catch { setMsg('Error al guardar'); toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  // ── Edición de datos personales del contratante (tercero) ─────────────────
  const [editDatos, setEditDatos] = useState(false)
  const [savingDatos, setSavingDatos] = useState(false)
  const [formDatos, setFormDatos] = useState({
    telefono: '', telefono_alt: '', email: '', direccion: '',
    departamento_id: '', municipio_id: '',
    fecha_nacimiento: '', sexo: '', estado_civil: '', ocupacion: '',
  })
  const [deptos, setDeptos] = useState([])
  const [munis,  setMunis]  = useState([])
  useEffect(() => {
    if (!editDatos) return
    api.get('/territorio/select/departamentos').then(r => setDeptos(r.data.data || [])).catch(() => {})
  }, [editDatos])
  useEffect(() => {
    if (!formDatos.departamento_id) { setMunis([]); return }
    api.get('/territorio/select/municipios', { params: { departamento_id: formDatos.departamento_id } })
      .then(r => setMunis(r.data.data || [])).catch(() => {})
  }, [formDatos.departamento_id])
  useEffect(() => {
    setFormDatos({
      telefono:         data?.contratante_tel || '',
      telefono_alt:     data?.contratante_tel_alt || '',
      email:            data?.contratante_email || '',
      direccion:        data?.contratante_direccion || '',
      departamento_id:  data?.contratante_departamento_id || '',
      municipio_id:     data?.contratante_municipio_id || '',
      fecha_nacimiento: data?.contratante_nacimiento ? data.contratante_nacimiento.slice(0,10) : '',
      sexo:             data?.contratante_sexo || '',
      estado_civil:     data?.contratante_estado_civil || '',
      ocupacion:        data?.contratante_ocupacion || '',
    })
  }, [data])
  const setDato = (k, v) => setFormDatos(p => ({
    ...p, [k]: v, ...(k === 'departamento_id' ? { municipio_id: '' } : {}),
  }))
  const guardarDatos = async () => {
    setSavingDatos(true)
    try {
      await api.put(`/terceros/${data.contratante_id}`, formDatos)
      toast.success('Datos del contratante actualizados')
      onSaved()
      setEditDatos(false)
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar') }
    finally { setSavingDatos(false) }
  }

  // Sin familiar responsable, pero el servicio es por convenio: el convenio ES la contraparte
  if (!data?.contratante_id && data?.convenio_id) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ECFEFF',
        border:'1px solid #A5F3FC', color:'#0E7490', borderRadius:10, padding:'9px 14px',
        fontSize:12.5, fontWeight:600, marginBottom:14 }}>
        🤝 Este servicio no tiene un familiar responsable registrado — la contraparte es directamente el convenio.
      </div>
      <ConvenioCoberturaBox data={data} servicioId={servicioId} onSaved={onSaved}/>
      <div className="tab-card">
        <div className="tab-card-head tab-card-head-accent">
          <span className="tab-card-icon">🤝</span>
          <span className="tab-card-title">Convenio (contraparte)</span>
        </div>
        <div className="tab-card-body tab-grid tab-grid-3">
          <div className="tab-field">
            <span className="tab-field-label">Entidad</span>
            <span className="tab-field-value">{data.convenio_nombre || '—'}</span>
          </div>
          <div className="tab-field">
            <span className="tab-field-label">Tipo</span>
            <span className="tab-field-value">{data.convenio_tipo_entidad || '—'}</span>
          </div>
          <div className="tab-field">
            <span className="tab-field-label">NIT</span>
            <span className={`tab-field-value${data.convenio_nit?'':' muted'}`}>{data.convenio_nit || '—'}</span>
          </div>
          <div className="tab-field">
            <span className="tab-field-label">Contacto</span>
            <span className={`tab-field-value${data.convenio_contacto_nombre?'':' muted'}`}>{data.convenio_contacto_nombre || '—'}</span>
          </div>
          <div className="tab-field">
            <span className="tab-field-label">Teléfono</span>
            <span className={`tab-field-value${data.convenio_contacto_telefono?'':' muted'}`}>{data.convenio_contacto_telefono || '—'}</span>
          </div>
          <div className="tab-field">
            <span className="tab-field-label">Email</span>
            <span className={`tab-field-value${data.convenio_contacto_email?'':' muted'}`}>{data.convenio_contacto_email || '—'}</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize:11.5, color:'#9CA3AF', marginTop:4 }}>
        Si hay un familiar responsable de este trámite, edita el servicio y agrégalo en la sección Convenio → "Responsable / contratante".
      </div>
    </div>
  )

  if (!data?.contratante_id) return (
    <div style={{ padding:32, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>
      Este servicio no tiene contratante registrado.<br/>
      <span style={{ fontSize:12 }}>Se registra al crear el servicio directo o vinculando un contrato.</span>
    </div>
  )

  const fmtFecha = f => f ? new Date(f).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const calcEdadC = fn => {
    if (!fn) return null
    const d = new Date(), n = new Date(fn)
    let e = d.getFullYear() - n.getFullYear()
    if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) e--
    return e
  }

  return (
    <div>
      {msg && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'8px 12px',
        borderRadius:8, fontSize:12, marginBottom:12 }}>{msg}</div>}

      {data.contratante_es_convenio && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ECFEFF',
          border:'1px solid #A5F3FC', color:'#0E7490', borderRadius:10, padding:'9px 14px',
          fontSize:12.5, fontWeight:600, marginBottom:14 }}>
          🤝 Este responsable se registró desde el convenio del servicio (no hay contrato de por medio).
        </div>
      )}

      <ConvenioCoberturaBox data={data} servicioId={servicioId} onSaved={onSaved}/>

      {/* Identidad */}
      <div className="tab-card">
        <div className="tab-card-head tab-card-head-accent">
          <span className="tab-card-icon">👤</span>
          <span className="tab-card-title">Identificación</span>
        </div>
        <div className="tab-card-body tab-grid tab-grid-3">
          <div className="tab-field">
            <span className="tab-field-label">Tipo doc.</span>
            <span className="tab-field-value">{data.contratante_tipo_doc||'—'}</span>
          </div>
          <div className="tab-field">
            <span className="tab-field-label">Número</span>
            <span className="tab-field-value">{data.contratante_documento||'—'}</span>
          </div>
          <div className="tab-field">
            <span className="tab-field-label">Nombre completo</span>
            <span className="tab-field-value">{data.contratante_nombre||'—'}</span>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'2px 2px 10px' }}>
        <div style={{ fontSize:12.5, fontWeight:800, color:'#6D28D9', textTransform:'uppercase', letterSpacing:'.06em' }}>
          Datos del contratante
        </div>
        {!editDatos && (
          <button onClick={() => setEditDatos(true)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px',
              background:'linear-gradient(135deg,#7C3AED,#6D28D9)', border:'none',
              borderRadius:8, color:'#fff', fontSize:11.5, fontWeight:700, cursor:'pointer',
              boxShadow:'0 2px 6px rgba(124,58,237,.25)' }}>
            <Edit2 size={11}/> Editar datos
          </button>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        {/* Contacto */}
        <div className="tab-card" style={{ marginBottom:0 }}>
          <div className="tab-card-head tab-card-head-accent">
            <span className="tab-card-icon">📱</span><span className="tab-card-title">Contacto</span>
          </div>
          <div className="tab-card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {editDatos ? (
              <>
                <FField label="Tel. principal" campo="telefono" form={formDatos} onChange={setDato} />
                <FField label="Tel. alterno" campo="telefono_alt" form={formDatos} onChange={setDato} />
                <FField label="Email" campo="email" form={formDatos} onChange={setDato} />
              </>
            ) : [['Tel. principal',data.contratante_tel],['Tel. alterno',data.contratante_tel_alt],['Email',data.contratante_email]].map(([l,v])=>(
              <div key={l} className="tab-field"><span className="tab-field-label">{l}</span><span className={`tab-field-value${v?'':' muted'}`}>{v||'—'}</span></div>
            ))}
          </div>
        </div>
        {/* Residencia */}
        <div className="tab-card" style={{ marginBottom:0 }}>
          <div className="tab-card-head tab-card-head-accent">
            <span className="tab-card-icon">🏠</span><span className="tab-card-title">Residencia</span>
          </div>
          <div className="tab-card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {editDatos ? (
              <>
                <FField label="Dirección" campo="direccion" form={formDatos} onChange={setDato} />
                <div className="sv-field" style={{ marginBottom:10 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#374151' }}>Departamento</label>
                  <select value={formDatos.departamento_id} onChange={e => setDato('departamento_id', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div className="sv-field" style={{ marginBottom:10 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#374151' }}>Municipio</label>
                  <select value={formDatos.municipio_id} onChange={e => setDato('municipio_id', e.target.value)}
                    disabled={!formDatos.departamento_id}>
                    <option value="">{formDatos.departamento_id ? '— Seleccionar —' : 'Elige un departamento primero'}</option>
                    {munis.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </>
            ) : [['Dirección',data.contratante_direccion],['Municipio',data.contratante_municipio],['Departamento',data.contratante_departamento]].map(([l,v])=>(
              <div key={l} className="tab-field"><span className="tab-field-label">{l}</span><span className={`tab-field-value${v?'':' muted'}`}>{v||'—'}</span></div>
            ))}
          </div>
        </div>
        {/* Datos personales */}
        <div className="tab-card" style={{ marginBottom:0, gridColumn:'1/-1' }}>
          <div className="tab-card-head tab-card-head-accent">
            <span className="tab-card-icon">🪪</span><span className="tab-card-title">Datos personales</span>
          </div>
          <div className="tab-card-body tab-grid tab-grid-4">
            {editDatos ? (
              <>
                <FField label="Fecha de nacimiento" campo="fecha_nacimiento" type="date" form={formDatos} onChange={setDato} />
                <FFieldLista label="Sexo" tipo="SEXO" value={formDatos.sexo} onChange={v => setDato('sexo', v)} />
                <FFieldLista label="Estado civil" tipo="ESTADO_CIVIL" value={formDatos.estado_civil} onChange={v => setDato('estado_civil', v)} />
                <FFieldLista label="Ocupación" tipo="OCUPACION" value={formDatos.ocupacion} onChange={v => setDato('ocupacion', v)} />
              </>
            ) : [
              ['F. nacimiento', data.contratante_nacimiento ? `${fmtFecha(data.contratante_nacimiento)} · ${calcEdadC(data.contratante_nacimiento)} años` : null],
              ['Sexo', data.contratante_sexo==='M'?'Masculino':data.contratante_sexo==='F'?'Femenino':null],
              ['Estado civil', data.contratante_estado_civil],
              ['Ocupación', data.contratante_ocupacion],
            ].map(([l,v])=>(
              <div key={l} className="tab-field"><span className="tab-field-label">{l}</span><span className={`tab-field-value${v?'':' muted'}`}>{v||'—'}</span></div>
            ))}
          </div>
        </div>
        {editDatos && (
          <div style={{ display:'flex', gap:10, gridColumn:'1/-1' }}>
            <button onClick={guardarDatos} disabled={savingDatos}
              className="sv-btn sv-btn-primary" style={{ flex:1 }}>
              {savingDatos ? 'Guardando…' : '✓ Guardar datos del contratante'}
            </button>
            <button onClick={() => setEditDatos(false)} className="sv-btn sv-btn-ghost">
              Cancelar
            </button>
          </div>
        )}
        {/* Parentesco */}
        <div className="tab-card" style={{ marginBottom:0, border:'1.5px solid #DDD6FE', background:'linear-gradient(135deg,#FAFAFF 0%,#F5F3FF 100%)' }}>
          <div className="tab-card-head" style={{ background:'linear-gradient(90deg,#7C3AED 0%,#6D28D9 100%)' }}>
            <span className="tab-card-icon" style={{ filter:'brightness(10)' }}>🤝</span>
            <span className="tab-card-title" style={{ color:'#fff' }}>Relación con el fallecido</span>
            {!editMode && (
              <button onClick={() => setEditMode(true)}
                style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4,
                  padding:'4px 12px', background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.35)',
                  borderRadius:7, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                <Edit2 size={10}/> Editar
              </button>
            )}
          </div>
          <div className="tab-card-body">
            {!editMode ? (
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'6px 0' }}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:'#EDE9FE',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                  🤝
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>
                    Parentesco
                  </div>
                  <div style={{ fontSize:20, fontWeight:800, color: data.contratante_parentesco ? '#6D28D9' : '#CBD5E1', lineHeight:1.2 }}>
                    {data.contratante_parentesco || 'No especificado'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <FFieldLista label="Parentesco" tipo="PARENTESCO" value={parentesco} onChange={setParentesco} />
                <div style={{ display:'flex', gap:8, paddingTop:2 }}>
                  <button onClick={guardar} disabled={saving} className="sv-btn sv-btn-primary" style={{ flex:1, justifyContent:'center' }}>
                    {saving ? 'Guardando…' : '✓  Guardar'}
                  </button>
                  <button onClick={() => { setEditMode(false); setParentesco(data?.contratante_parentesco || '') }}
                    className="sv-btn sv-btn-ghost">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function ModalFicha({ id, onClose, onEditar, onEstado }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('info')
  const [showTraslado, setShowTraslado] = useState(false)
  const [editandoTrasladoId, setEditandoTrasladoId] = useState(null)
  const [rutaAbierta, setRutaAbierta]   = useState(null) // id del traslado con el mapa expandido
  const [fTraslado, setFTraslado]       = useState({ tipo:'RECOGIDA', origen:'', destino:'', fecha_hora:'', vehiculo_id:'', conductor_id:'', origen_lat:null, origen_lon:null, destino_lat:null, destino_lon:null })
  const [savingTr, setSavingTr]         = useState(false)
  const [flotaVehiculos, setFlotaVehiculos]   = useState([])
  const [flotaConductores, setFlotaConductores] = useState([])
  const [tiposTrasladoConfig, setTiposTrasladoConfig] = useState([])
  const [cobrarTraslado, setCobrarTraslado] = useState(false)
  // Tanatopraxia
  const [tana, setTana] = useState({ tipo_servicio:'BASICA', estado:'PENDIENTE', responsable_id:'', hora_inicio:'', hora_fin:'', observaciones:'' })
  const [savingTana, setSavingTana] = useState(false)
  const [personalAsignado, setPersonalAsignado] = useState([])
  const [productosInv, setProductosInv] = useState([])
  const [matForm, setMatForm] = useState({ producto_id:'', cantidad:'' })
  const [savingMat, setSavingMat] = useState(false)
  const [sugerenciaIA, setSugerenciaIA] = useState(null)
  const [cargandoIA, setCargandoIA] = useState(false)
  const [aplicandoIA, setAplicandoIA] = useState(false)
  // Checklist
  const [checklist, setChecklist] = useState([])
  const [certMedico, setCertMedico] = useState('')
  const [regCivil, setRegCivil] = useState('')
  const [savingCheck, setSavingCheck] = useState(false)
  // Imprimir
  const [showPrint, setShowPrint] = useState(false)
  const [printData, setPrintData] = useState(null)

  const { usuario } = useAuthStore()
  const esEditor = ['superadmin','administrador','operador'].includes(usuario?.rol)
  const esAdmin  = ['superadmin','administrador'].includes(usuario?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/servicios/${id}`)
      const d = r.data.data
      setData(d)
      setChecklist(d.checklist || [])
      setCertMedico(d.certificado_medico || '')
      setRegCivil(d.registro_civil || '')
      if (d.tanatopraxia) {
        const t = d.tanatopraxia
        setTana({
          tipo_servicio: t.tipo_servicio || 'BASICA',
          estado:        t.estado || 'PENDIENTE',
          responsable_id: t.responsable_id || '',
          hora_inicio:   t.hora_inicio ? t.hora_inicio.slice(0,16) : '',
          hora_fin:      t.hora_fin ? t.hora_fin.slice(0,16) : '',
          observaciones: t.observaciones || '',
        })
      }
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    api.get(`/servicios/${id}/personal`).then(r => setPersonalAsignado(r.data.data || [])).catch(() => {})
    api.get('/inventario/productos', { params: { limit: 500 } }).then(r => setProductosInv(r.data.data || [])).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!showTraslado) return
    Promise.all([api.get('/flota/vehiculos'), api.get('/flota/conductores'), api.get('/tipos-traslado/select')])
      .then(([v, c, tt]) => {
        setFlotaVehiculos(v.data.data || []); setFlotaConductores(c.data.data || [])
        setTiposTrasladoConfig(tt.data.data || [])
      })
      .catch(() => toast.error('Error al cargar vehículos y conductores'))
  }, [showTraslado])

  // Config de precio sugerido para el tipo de traslado actual, y si ya está cobrado/incluido
  const trasladoConfigActual = tiposTrasladoConfig.find(t => t.tipo === fTraslado.tipo)
  const yaIncluidoEnServicio = trasladoConfigActual?.catalogo_id &&
    (data?.items || []).some(i => i.catalogo_id === trasladoConfigActual.catalogo_id)

  const elegirConductor = (conductorId) => {
    const cond = flotaConductores.find(c => c.id === conductorId)
    setFTraslado(p => {
      const next = { ...p, conductor_id: conductorId }
      if (cond?.vehiculo_predeterminado_id && !p.vehiculo_id) {
        const veh = flotaVehiculos.find(v => v.id === cond.vehiculo_predeterminado_id)
        if (veh?.disponible) next.vehiculo_id = veh.id
      }
      return next
    })
  }

  const agregarTraslado = async () => {
    setSavingTr(true)
    try {
      if (editandoTrasladoId) {
        await api.put(`/servicios/${id}/traslados/${editandoTrasladoId}`, fTraslado)
        toast.success('Traslado actualizado')
      } else {
        await api.post(`/servicios/${id}/traslados`, fTraslado)
        toast.success('Traslado agregado')
      }
      if (cobrarTraslado && trasladoConfigActual?.catalogo_id && !yaIncluidoEnServicio) {
        await api.post(`/servicios/${id}/items`, { catalogo_id: trasladoConfigActual.catalogo_id })
        toast.success('Traslado agregado al cobro del servicio')
      }
      setShowTraslado(false)
      setEditandoTrasladoId(null)
      setCobrarTraslado(false)
      setFTraslado({ tipo:'RECOGIDA', origen:'', destino:'', fecha_hora:'', vehiculo_id:'', conductor_id:'', origen_lat:null, origen_lon:null, destino_lat:null, destino_lon:null })
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar traslado') }
    finally { setSavingTr(false) }
  }

  const editarTraslado = (t) => {
    setEditandoTrasladoId(t.id)
    setFTraslado({
      tipo: t.tipo || 'RECOGIDA', origen: t.origen || '', destino: t.destino || '',
      fecha_hora: t.fecha_hora ? t.fecha_hora.slice(0,16) : '',
      vehiculo_id: t.vehiculo_id || '', conductor_id: t.conductor_id || '',
      origen_lat: t.origen_lat ?? null, origen_lon: t.origen_lon ?? null,
      destino_lat: t.destino_lat ?? null, destino_lon: t.destino_lon ?? null,
    })
    setShowTraslado(true)
  }

  const completarTraslado = async (trasId) => {
    try {
      await api.patch(`/servicios/${id}/traslados/${trasId}`)
      toast.success('Traslado completado')
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al completar traslado') }
  }

  const guardarTana = async () => {
    setSavingTana(true)
    try {
      await api.put(`/servicios/${id}/tanatopraxia`, { ...tana, responsable_id: tana.responsable_id || null })
      toast.success('Tanatopraxia guardada')
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar tanatopraxia') }
    finally { setSavingTana(false) }
  }

  const agregarMaterialTana = async () => {
    if (!matForm.producto_id || !matForm.cantidad || +matForm.cantidad <= 0) return
    setSavingMat(true)
    try {
      await api.post(`/servicios/${id}/tanatopraxia/materiales`, {
        producto_id: matForm.producto_id, cantidad: +matForm.cantidad,
      })
      toast.success('Material agregado y descargado del inventario')
      setMatForm({ producto_id:'', cantidad:'' })
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al agregar el material') }
    finally { setSavingMat(false) }
  }

  const quitarMaterialTana = async (materialId) => {
    if (!window.confirm('¿Quitar este material? Se repondrá al inventario.')) return
    try {
      await api.delete(`/servicios/${id}/tanatopraxia/materiales/${materialId}`)
      toast.success('Material eliminado y repuesto al inventario')
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al eliminar el material') }
  }

  const pedirSugerenciaIA = async () => {
    setCargandoIA(true)
    setSugerenciaIA(null)
    try {
      const r = await api.post(`/servicios/${id}/tanatopraxia/sugerencia-ia`, { tipo_servicio: tana.tipo_servicio })
      setSugerenciaIA(r.data.data)
    } catch (e) { toast.error(e.response?.data?.error || 'Error al generar la sugerencia con IA') }
    finally { setCargandoIA(false) }
  }

  const aplicarSugerenciaIA = async () => {
    if (!sugerenciaIA?.materiales?.length) return
    setAplicandoIA(true)
    try {
      for (const m of sugerenciaIA.materiales) {
        await api.post(`/servicios/${id}/tanatopraxia/materiales`, { producto_id: m.producto_id, cantidad: m.cantidad })
      }
      toast.success('Materiales sugeridos aplicados y descargados del inventario')
      setSugerenciaIA(null)
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al aplicar la sugerencia') }
    finally { setAplicandoIA(false) }
  }

  const guardarChecklist = async () => {
    setSavingCheck(true)
    try {
      await api.patch(`/servicios/${id}/checklist`, {
        checklist, certificado_medico: certMedico, registro_civil: regCivil,
        acta_defuncion: data?.acta_defuncion, permiso_inhumacion: data?.permiso_inhumacion,
      })
      toast.success('Checklist actualizado')
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar checklist') }
    finally { setSavingCheck(false) }
  }

  const abrirImprimir = async () => {
    try {
      const r = await api.get(`/servicios/${id}/orden-impresion`)
      generarPDF(r.data)
    } catch(e) {
      toast.error('Error al generar PDF: ' + (e.response?.data?.error || e.message))
    }
  }

  const TABS = [
    { key:'info',         icon:'📋', label:'Información' },
    { key:'fallecido',    icon:'🕊️', label:'Fallecido' },
    { key:'contratante',  icon:'👤', label:'Contratante' },
    { key:'poliza',       icon:'🛡️', label: data?.poliza_id ? 'Póliza' : 'Póliza' },
    { key:'items',        icon:'📦', label:`Servicios (${data?.items?.length||0})` },
    { key:'personal',     icon:'👥', label:'Personal' },
    { key:'traslados',    icon:'🚐', label:`Traslados (${data?.traslados?.length||0})` },
    { key:'tanatopraxia', icon:'🩺', label:'Tanatopraxia' },
    { key:'historial',    icon:'🕒', label:'Historial' },
    { key:'tramites',     icon: checklist.length > 0 && checklist.every(i=>i.done) ? '✅' : '📝',
      label: checklist.length > 0 ? `Trámites (${checklist.filter(i=>i.done).length}/${checklist.length})` : 'Trámites' },
  ]

  const disp = data ? DISPOSICION_META[data.tipo_disposicion] : {}

  return (
    <div className="sv-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sv-drawer">

        {/* ── Header morado ─────────────────────────────────────────────── */}
        <div style={{ background:'linear-gradient(135deg,#6D28D9 0%,#7C3AED 60%,#8B5CF6 100%)',
          padding:'18px 24px 16px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:46, height:46, borderRadius:13, background:'rgba(255,255,255,.2)',
                border:'2px solid rgba(255,255,255,.35)', display:'flex', alignItems:'center',
                justifyContent:'center', flexShrink:0, fontSize:22 }}>
                {disp.icon || '⚰️'}
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,.65)', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:.8 }}>Servicio Funerario</span>
                  {data?.codigo && (
                    <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:800,
                      background:'rgba(255,255,255,.22)', color:'#fff',
                      padding:'2px 8px', borderRadius:6 }}>{data.codigo}</span>
                  )}
                </div>
                <div style={{ fontSize:19, fontWeight:900, color:'#fff', lineHeight:1.2 }}>
                  {loading ? '…' : `#${data?.numero} — ${data?.difunto_nombre}`}
                </div>
                {!loading && (
                  <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
                    {(() => { const tipo = origenServicio(data); const om = ORIGEN_META[tipo]
                      const detalle = tipo === 'POLIZA'   && data?.poliza_numero   ? `#${data.poliza_numero}`
                        : tipo === 'CONTRATO' && data?.contrato_numero ? `#${data.contrato_numero}`
                        : tipo === 'CONVENIO' && data?.convenio_nombre ? data.convenio_nombre
                        : ''
                      return (
                        <span style={{ background:'rgba(255,255,255,.28)', border:'1px solid rgba(255,255,255,.4)',
                          padding:'2px 9px', borderRadius:10, fontSize:11, fontWeight:800, color:'#fff' }}>
                          {om.icon} {om.label}{detalle ? ` ${detalle}` : ''}
                        </span>
                      )
                    })()}
                    <span style={{ background:'rgba(255,255,255,.2)', padding:'2px 9px',
                      borderRadius:10, fontSize:11, fontWeight:700, color:'#fff' }}>
                      {disp.label}
                    </span>
                    {data?.sala_nombre && (
                      <span style={{ background:'rgba(255,255,255,.15)', padding:'2px 9px',
                        borderRadius:10, fontSize:11, fontWeight:700, color:'rgba(255,255,255,.9)' }}>
                        {data.sala_nombre}
                      </span>
                    )}
                    {data?.estado && (() => { const m=ESTADO_META[data.estado]; return m ? (
                      <span style={{ background:'rgba(255,255,255,.2)', padding:'2px 9px',
                        borderRadius:10, fontSize:11, fontWeight:700, color:'#fff' }}>{m.label}</span>
                    ) : null })()}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:7, alignItems:'center' }}>
              {!loading && (
                <button onClick={abrirImprimir}
                  style={{ display:'flex', alignItems:'center', gap:6,
                    background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.3)',
                    borderRadius:9, padding:'7px 13px', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  <Printer size={13}/> Imprimir
                </button>
              )}
              {!loading && data?.estado !== 'COMPLETADO' && data?.estado !== 'CANCELADO' && esEditor && (
                <button onClick={() => { onClose(); onEditar(data) }}
                  style={{ display:'flex', alignItems:'center', gap:6,
                    background:'rgba(255,255,255,.2)', border:'1.5px solid rgba(255,255,255,.3)',
                    borderRadius:9, padding:'7px 13px', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  <Edit2 size={13}/> Editar
                </button>
              )}
              <button onClick={onClose}
                style={{ width:33, height:33, borderRadius:9, border:'1.5px solid rgba(255,255,255,.3)',
                  background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center',
                  justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                <X size={16}/>
              </button>
            </div>
          </div>
        </div>

        {/* ── Layout: sidebar tabs + contenido ──────────────────────────── */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Sidebar de tabs */}
          <div style={{ width:190, flexShrink:0, borderRight:'1.5px solid #F0F0F5',
            background:'#FAFBFF', overflowY:'auto', padding:'12px 8px', display:'flex', flexDirection:'column', gap:2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'9px 12px', borderRadius:10, border:'none', cursor:'pointer',
                  textAlign:'left', fontSize:12.5, fontWeight: tab===t.key ? 700 : 500,
                  background: tab===t.key ? '#EDE9FE' : 'transparent',
                  color: tab===t.key ? '#6D28D9' : '#374151',
                  transition:'all .12s' }}
                onMouseEnter={e => { if(tab!==t.key) e.currentTarget.style.background='#F3F4F6' }}
                onMouseLeave={e => { if(tab!==t.key) e.currentTarget.style.background='transparent' }}>
                <span style={{ fontSize:15 }}>{t.icon}</span>
                <span style={{ lineHeight:1.25 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Área de contenido */}
          <div className="sv-drawer-body">
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60, flexDirection:'column',
              alignItems:'center', gap:12 }}>
              <Loader2 size={32} color="#8B5CF6" className="sv-spin"/>
              <span style={{ fontSize:13, color:'#9CA3AF' }}>Cargando servicio…</span>
            </div>
          ) : tab === 'info' ? (
            <TabInfoGeneral
              data={data} servicioId={id} onSaved={cargar}
              onEstado={onEstado} esEditor={esEditor} esAdmin={esAdmin}
            />
          ) : tab === 'fallecido' ? (
            <TabFallecido data={data} servicioId={id} onSaved={cargar} />
          ) : tab === 'contratante' ? (
            <TabContratante data={data} servicioId={id} onSaved={cargar} />
          ) : tab === 'poliza' ? (
            <TabPoliza data={data} />
          ) : tab === 'items' ? (
            <TabServicios data={data} servicioId={id} onSaved={cargar} esEditor={esEditor}/>
          ) : tab === 'personal' ? (
            <TabPersonal servicioId={id} esEditor={esEditor} onItemAgregado={cargar}/>
          ) : tab === 'historial' ? (
            <TabHistorial servicioId={id}/>
          ) : tab === 'traslados' ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>
                  {(data.traslados||[]).length} traslado{(data.traslados||[]).length !== 1 ? 's' : ''} registrado{(data.traslados||[]).length !== 1 ? 's' : ''}
                </span>
                {esEditor && !['COMPLETADO','CANCELADO'].includes(data.estado) && (
                  <button className="sv-btn sv-btn-ghost" style={{ padding:'7px 14px', fontSize:12 }}
                    onClick={() => {
                      setCobrarTraslado(false)
                      if (showTraslado) { setShowTraslado(false); setEditandoTrasladoId(null) }
                      else {
                        setFTraslado({ tipo:'RECOGIDA', origen:'', destino:'', fecha_hora:'', vehiculo_id:'', conductor_id:'', origen_lat:null, origen_lon:null, destino_lat:null, destino_lon:null })
                        setEditandoTrasladoId(null); setShowTraslado(true)
                      }
                    }}>
                    <Truck size={13}/> Agregar traslado
                  </button>
                )}
              </div>

              {showTraslado && (
                <div style={{ background:'#F8F9FF', border:'1.5px solid #ECEDF8', borderRadius:14,
                  padding:16, marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'#7C3AED', letterSpacing:.5,
                    textTransform:'uppercase', marginBottom:12 }}>
                    {editandoTrasladoId ? 'Editar traslado' : 'Nuevo traslado'}
                  </div>
                  <div className="sv-grid2">
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>Tipo</label>
                      <select value={fTraslado.tipo} onChange={e => setFTraslado(p=>({...p,tipo:e.target.value}))}>
                        {TRASLADO_TIPOS.map(t => <option key={t} value={t}>{TRASLADO_LABEL[t]}</option>)}
                      </select>
                    </div>
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>Fecha / hora</label>
                      <input type="datetime-local" value={fTraslado.fecha_hora}
                        onChange={e => setFTraslado(p=>({...p,fecha_hora:e.target.value}))}/>
                    </div>
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>Origen</label>
                      <MapboxAddressInput value={fTraslado.origen} placeholder="Dirección origen…"
                        onSelect={({ texto, lat, lon }) => setFTraslado(p=>({...p, origen:texto, origen_lat:lat, origen_lon:lon}))}/>
                    </div>
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>Destino</label>
                      <MapboxAddressInput value={fTraslado.destino} placeholder="Dirección destino…"
                        onSelect={({ texto, lat, lon }) => setFTraslado(p=>({...p, destino:texto, destino_lat:lat, destino_lon:lon}))}/>
                    </div>
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>Vehículo</label>
                      <select value={fTraslado.vehiculo_id}
                        onChange={e => setFTraslado(p=>({...p,vehiculo_id:e.target.value}))}>
                        <option value="">— Sin asignar —</option>
                        {flotaVehiculos.filter(v=>v.activo).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.placa} · {v.marca} {v.modelo} {v.disponible ? '' : `· en servicio #${v.servicio_actual_numero}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sv-field" style={{ marginBottom:0 }}>
                      <label>Conductor</label>
                      <select value={fTraslado.conductor_id}
                        onChange={e => elegirConductor(e.target.value)}>
                        <option value="">— Sin asignar —</option>
                        {flotaConductores.filter(c=>c.activo).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} {c.disponible ? '' : `· en servicio #${c.servicio_actual_numero}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {trasladoConfigActual && (trasladoConfigActual.costo_interno > 0 || trasladoConfigActual.catalogo_id) && (
                    <div style={{ marginTop:12, background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 14px' }}>
                      <div style={{ fontSize:10.5, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                        Costeo de este traslado
                      </div>
                      <div style={{ display:'flex', gap:20, marginBottom: trasladoConfigActual.catalogo_id ? 10 : 0 }}>
                        {trasladoConfigActual.costo_interno > 0 && (
                          <div>
                            <div style={{ fontSize:10.5, color:'#9CA3AF' }}>Le cuesta a la funeraria</div>
                            <div style={{ fontSize:15, fontWeight:800, color:'#374151' }}>
                              {new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(trasladoConfigActual.costo_interno)}
                            </div>
                          </div>
                        )}
                        {trasladoConfigActual.catalogo_id && (
                          <div>
                            <div style={{ fontSize:10.5, color:'#9CA3AF' }}>Precio sugerido de venta</div>
                            <div style={{ fontSize:15, fontWeight:800, color:'#7C3AED' }}>
                              {new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(trasladoConfigActual.catalogo_precio||0)}
                            </div>
                          </div>
                        )}
                      </div>
                      {trasladoConfigActual.catalogo_id && (
                        yaIncluidoEnServicio ? (
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#059669', fontWeight:700 }}>
                            <CheckCircle2 size={13}/> Ya está incluido/cobrado en este servicio — no se agrega de nuevo
                          </div>
                        ) : (
                          <label style={{ display:'flex', alignItems:'flex-start', gap:9, background:'#F0FDF4',
                            border:'1.5px solid #BBF7D0', borderRadius:10, padding:'10px 12px', cursor:'pointer' }}>
                            <input type="checkbox" checked={cobrarTraslado} onChange={e => setCobrarTraslado(e.target.checked)}
                              style={{ width:15, height:15, marginTop:1, accentColor:'#059669' }}/>
                            <span style={{ fontSize:12, color:'#065F46' }}>
                              <strong>Agregar como ítem cobrable del servicio</strong><br/>
                              Se sumará "{trasladoConfigActual.catalogo_nombre}" al total a cobrar.
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  )}

                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
                    {editandoTrasladoId && (
                      <button className="sv-btn sv-btn-ghost" style={{ padding:'8px 16px', fontSize:12 }}
                        onClick={() => { setShowTraslado(false); setEditandoTrasladoId(null); setCobrarTraslado(false) }}>
                        Cancelar
                      </button>
                    )}
                    <button className="sv-btn sv-btn-primary" style={{ padding:'8px 16px', fontSize:12 }}
                      onClick={agregarTraslado} disabled={savingTr}>
                      {savingTr ? <Loader2 size={13} className="sv-spin"/> : <Truck size={13}/>}
                      {editandoTrasladoId ? 'Guardar cambios' : 'Registrar traslado'}
                    </button>
                  </div>
                </div>
              )}

              {(data.traslados||[]).length === 0 ? (
                <div className="sv-empty" style={{ padding:40 }}>
                  <Truck size={28}/>
                  <p>Sin traslados registrados</p>
                </div>
              ) : (
                (data.traslados||[]).map(t => (
                  <div key={t.id}>
                    <div className="sv-traslado-item">
                      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                        background: t.completado
                          ? 'linear-gradient(135deg,#059669,#10B981)'
                          : 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Truck size={16} color="#fff"/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'#0F1035' }}>
                          {TRASLADO_LABEL[t.tipo]}
                        </div>
                        <div style={{ fontSize:11.5, color:'#6B7280', marginTop:2 }}>
                          {t.origen && `${t.origen}`}{t.destino && ` → ${t.destino}`}
                          {t.fecha_hora && ` · ${fmtDT(t.fecha_hora)}`}
                        </div>
                        {(t.vehiculo_placa || t.conductor_nombre) && (
                          <div style={{ fontSize:11, color:'#9CA3AF' }}>
                            {t.vehiculo_placa}{t.conductor_nombre && ` · ${t.conductor_nombre}`}
                          </div>
                        )}
                      </div>
                      {t.origen && t.destino && (
                        <button onClick={() => setRutaAbierta(v => v === t.id ? null : t.id)}
                          style={{ fontSize:11, fontWeight:700, color:'#2563EB',
                            background:'#EFF6FF', border:'1.5px solid #BFDBFE',
                            padding:'5px 10px', borderRadius:8, cursor:'pointer' }}>
                          {rutaAbierta === t.id ? 'Ocultar ruta' : '🗺️ Ver ruta'}
                        </button>
                      )}
                      {esEditor && !t.completado && (
                        <button onClick={() => editarTraslado(t)}
                          style={{ fontSize:11, fontWeight:700, color:'#374151',
                            background:'#F3F4F6', border:'1.5px solid #E5E7EB',
                            padding:'5px 10px', borderRadius:8, cursor:'pointer' }}>
                          ✏️ Editar
                        </button>
                      )}
                      {t.completado ? (
                        <span style={{ fontSize:10.5, fontWeight:700, color:'#059669',
                          background:'#D1FAE5', padding:'3px 9px', borderRadius:20 }}>✓ Completado</span>
                      ) : esEditor && (
                        <button onClick={() => completarTraslado(t.id)}
                          style={{ fontSize:11, fontWeight:700, color:'#7C3AED',
                            background:'#F5F3FF', border:'1.5px solid #DDD6FE',
                            padding:'5px 10px', borderRadius:8, cursor:'pointer' }}>
                          Marcar listo
                        </button>
                      )}
                    </div>
                    {rutaAbierta === t.id && (
                      <div style={{ padding:'0 0 14px' }}>
                        <MapaRuta origen={t.origen} destino={t.destino}
                          origenLat={t.origen_lat} origenLon={t.origen_lon}
                          destinoLat={t.destino_lat} destinoLon={t.destino_lon}
                          vehiculoPlaca={t.vehiculo_placa} conductorNombre={t.conductor_nombre}/>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          ) : tab === 'tanatopraxia' ? (
            /* ── Tab Tanatopraxia ── */
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16,
                padding:'10px 14px', background:'#F5F3FF', borderRadius:12, border:'1.5px solid #DDD6FE' }}>
                <span style={{ fontSize:20 }}>🧴</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#5B21B6' }}>Orden de Tanatopraxia</div>
                  <div style={{ fontSize:11, color:'#7C3AED' }}>Preparación, embalsamamiento y presentación del cuerpo</div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Tipo de servicio</label>
                  <select value={tana.tipo_servicio} onChange={e=>setTana(p=>({...p,tipo_servicio:e.target.value}))}>
                    <option value="BASICA">Básica (higienización)</option>
                    <option value="EMBALSAMAMIENTO">Embalsamamiento</option>
                    <option value="RESTAURACION">Restauración</option>
                    <option value="ESPECIAL">Especial</option>
                  </select>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Estado</label>
                  <select value={tana.estado} onChange={e=>setTana(p=>({...p,estado:e.target.value}))}>
                    <option value="PENDIENTE">⏳ Pendiente</option>
                    <option value="EN_PROCESO">🔄 En proceso</option>
                    <option value="COMPLETADO">✅ Completado</option>
                  </select>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Responsable</label>
                  <select value={tana.responsable_id} onChange={e=>setTana(p=>({...p,responsable_id:e.target.value}))}>
                    <option value="">— Seleccionar colaborador —</option>
                    {personalAsignado.map(p => (
                      <option key={p.usuario_id} value={p.usuario_id}>{p.nombre} · {p.rol_servicio}</option>
                    ))}
                  </select>
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Hora inicio</label>
                  <input type="datetime-local" value={tana.hora_inicio}
                    onChange={e => {
                      const nuevaInicio = e.target.value
                      setTana(p => {
                        if (nuevaInicio && !p.hora_fin) {
                          const horas = DURACION_TANATOPRAXIA_HORAS[p.tipo_servicio] || 3
                          const fin = new Date(new Date(nuevaInicio).getTime() + horas * 3600000)
                          const finStr = new Date(fin.getTime() - fin.getTimezoneOffset()*60000).toISOString().slice(0,16)
                          return { ...p, hora_inicio: nuevaInicio, hora_fin: finStr }
                        }
                        return { ...p, hora_inicio: nuevaInicio }
                      })
                    }}/>
                  {tana.hora_inicio && (
                    <div style={{ fontSize:10.5, color:'#9CA3AF', marginTop:3 }}>
                      Estimado ~{DURACION_TANATOPRAXIA_HORAS[tana.tipo_servicio] || 3}h según el tipo de servicio (ajustable)
                    </div>
                  )}
                </div>
                <div className="sv-field" style={{ marginBottom:0 }}>
                  <label>Hora fin</label>
                  <input type="datetime-local" value={tana.hora_fin}
                    onChange={e=>setTana(p=>({...p,hora_fin:e.target.value}))}/>
                </div>
              </div>
              <div className="sv-field" style={{ marginTop:14 }}>
                <label>Observaciones de tanatopraxia</label>
                <textarea value={tana.observaciones} placeholder="Estado del cuerpo, condiciones especiales…"
                  onChange={e=>setTana(p=>({...p,observaciones:e.target.value}))}/>
              </div>
              {esEditor && (
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                  <button className="sv-btn sv-btn-primary" onClick={guardarTana} disabled={savingTana}>
                    {savingTana ? <Loader2 size={14} className="sv-spin"/> : <CheckCircle2 size={14}/>}
                    Guardar orden de tanatopraxia
                  </button>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:24 }}>
                <div className="tab-section-title" style={{ marginTop:0, marginBottom:0, borderBottom:'none' }}>Materiales de preparación</div>
                {esEditor && (
                  <button onClick={pedirSugerenciaIA} disabled={cargandoIA}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10,
                      border:'1.5px solid #DDD6FE', background:'#F5F3FF', color:'#6D28D9',
                      fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {cargandoIA ? <Loader2 size={13} className="sv-spin"/> : <span>✨</span>}
                    {cargandoIA ? 'Analizando…' : 'Sugerir con IA'}
                  </button>
                )}
              </div>
              <div style={{ borderBottom:'1px solid #F0F0F5', margin:'10px 0 14px' }}/>

              {sugerenciaIA && (
                <div style={{ background:'linear-gradient(135deg,#F5F3FF,#EEF2FF)', border:'1.5px solid #DDD6FE',
                  borderRadius:14, padding:16, marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#6D28D9' }}>✨ SUGERENCIA DE IA</div>
                    <button onClick={() => setSugerenciaIA(null)}
                      style={{ border:'none', background:'none', cursor:'pointer', color:'#9CA3AF' }}><X size={14}/></button>
                  </div>
                  <p style={{ fontSize:13, color:'#374151', margin:'0 0 10px', lineHeight:1.5 }}>{sugerenciaIA.explicacion}</p>
                  <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:12 }}>
                    <span>⏱️ Duración estimada: <strong>{sugerenciaIA.duracion_estimada_horas}h</strong></span>
                    <span>💰 Costo mínimo estimado: <strong>{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(sugerenciaIA.costo_minimo_estimado)}</strong></span>
                  </div>
                  {sugerenciaIA.materiales.map((m,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, padding:'4px 0', color:'#374151' }}>
                      <span><strong>{m.producto_nombre}</strong> — {m.cantidad} {m.unidad}
                        {m.stock_disponible < m.cantidad && <span style={{ color:'#DC2626', fontWeight:700 }}> (stock insuficiente)</span>}
                      </span>
                      <span style={{ color:'#9CA3AF' }}>{m.motivo}</span>
                    </div>
                  ))}
                  {esEditor && (
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                      <button onClick={aplicarSugerenciaIA} disabled={aplicandoIA}
                        className="sv-btn sv-btn-primary" style={{ padding:'7px 16px', fontSize:12 }}>
                        {aplicandoIA ? <Loader2 size={13} className="sv-spin"/> : <Plus size={13}/>}
                        Aplicar todos los materiales
                      </button>
                    </div>
                  )}
                </div>
              )}

              {esEditor && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginBottom:14 }}>
                  <div className="sv-field" style={{ marginBottom:0, flex:2 }}>
                    <label>Producto del inventario</label>
                    <select value={matForm.producto_id} onChange={e=>setMatForm(p=>({...p,producto_id:e.target.value}))}>
                      <option value="">— Seleccionar producto —</option>
                      {productosInv.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.codigo_sku}) · stock: {p.total_stock} {p.unidad_medida}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sv-field" style={{ marginBottom:0, width:110 }}>
                    <label>Cantidad</label>
                    <input type="number" min="0" step="0.01" value={matForm.cantidad}
                      onChange={e=>setMatForm(p=>({...p,cantidad:e.target.value}))}/>
                  </div>
                  <button className="sv-btn sv-btn-primary" onClick={agregarMaterialTana} disabled={savingMat}>
                    {savingMat ? <Loader2 size={14} className="sv-spin"/> : <Plus size={14}/>}
                  </button>
                </div>
              )}

              {(data.tanatopraxia?.materiales || []).length === 0 ? (
                <div className="sv-empty" style={{ padding:24 }}>
                  <p style={{ fontSize:12.5 }}>Sin materiales registrados</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {data.tanatopraxia.materiales.map(m => (
                    <div key={m.id} className="sv-check-item" style={{ cursor:'default' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{m.producto_nombre}</div>
                        <div style={{ fontSize:11.5, color:'#6B7280' }}>
                          {m.cantidad} {m.unidad_medida} · {new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(m.cantidad * m.costo_unitario)}
                        </div>
                      </div>
                      {esEditor && (
                        <button onClick={() => quitarMaterialTana(m.id)}
                          style={{ border:'none', background:'none', cursor:'pointer', color:'#EF4444', padding:4 }}>
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          ) : (
            /* ── Tab Trámites ── */
            <div>
              {/* Resumen estado */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', marginBottom:16,
                borderRadius:12, border:'1.5px solid',
                borderColor: data.tramites_completos ? '#A7F3D0' : '#FDE68A',
                background: data.tramites_completos ? '#D1FAE5' : '#FFFBEB' }}>
                <div style={{ fontSize:22 }}>{data.tramites_completos ? '✅' : '⏳'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800, color: data.tramites_completos ? '#065F46' : '#92400E' }}>
                    {data.tramites_completos
                      ? 'Todos los trámites están completos'
                      : `${checklist.filter(i=>i.done).length} de ${checklist.length} trámites completados`}
                  </div>
                  <div style={{ fontSize:11, color: data.tramites_completos ? '#047857' : '#B45309', marginTop:2 }}>
                    {data.tramites_completos ? 'Documentos legales en orden' : 'Marca cada ítem al obtenerlo'}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div style={{ marginBottom:16 }}>
                {checklist.map((item, i) => (
                  <div key={item.id} onClick={() => {
                    const next = [...checklist]
                    next[i] = { ...item, done: !item.done }
                    setChecklist(next)
                  }} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                    background: item.done ? '#F0FDF4' : '#fff',
                    border:`1.5px solid ${item.done ? '#A7F3D0' : '#ECEDF8'}`,
                    borderRadius:10, marginBottom:8, cursor:'pointer', transition:'all .15s',
                    userSelect:'none' }}>
                    <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                      background: item.done ? '#059669' : '#F3F4F6',
                      border:`2px solid ${item.done ? '#059669' : '#D1D5DB'}`,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {item.done && <CheckCircle2 size={14} color="#fff"/>}
                    </div>
                    <span style={{ fontSize:13, fontWeight: item.done ? 700 : 500,
                      color: item.done ? '#065F46' : '#374151',
                      textDecoration: item.done ? 'none' : 'none' }}>
                      {item.label}
                    </span>
                    {item.done && <span style={{ marginLeft:'auto', fontSize:11, color:'#059669', fontWeight:700 }}>✓</span>}
                  </div>
                ))}
              </div>

              {/* Números de documentos */}
              <div style={{ background:'#F8F9FC', border:'1.5px solid #ECEDF8', borderRadius:12, padding:14, marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:800, color:'#6B7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>
                  Números de documento
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="sv-field" style={{ marginBottom:0 }}>
                    <label>Certificado médico</label>
                    <input value={certMedico} placeholder="N° certificado…" onChange={e=>setCertMedico(e.target.value)}/>
                  </div>
                  <div className="sv-field" style={{ marginBottom:0 }}>
                    <label>Registro civil defunción</label>
                    <input value={regCivil} placeholder="N° registro…" onChange={e=>setRegCivil(e.target.value)}/>
                  </div>
                </div>
              </div>

              {esEditor && (
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button className="sv-btn sv-btn-primary" onClick={guardarChecklist} disabled={savingCheck}>
                    {savingCheck ? <Loader2 size={14} className="sv-spin"/> : <CheckCircle2 size={14}/>}
                    Guardar trámites
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Generación PDF profesional (jsPDF) ───────────────────────────────────

function generarPDF(data) {
  const { servicio: s, traslados = [], tanatopraxia, empresa = {}, items = [], defuncion } = data
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })

  // ── Utilidades ──────────────────────────────────────────────────────────
  const W = 210, PL = 15, PR = 15, CW = W - PL - PR
  const BLACK = [0,0,0], DARK = [30,30,30], GRAY = [90,90,90], LGRAY = [180,180,180], WHITE = [255,255,255]
  const fmtD  = d => { if (!d) return '—'; const v = d.includes('T') ? d : d+'T12:00:00'; const dt = new Date(v); return isNaN(dt)?'—':dt.toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}) }
  const fmtDT = d => { if (!d) return '—'; const dt = new Date(d); return isNaN(dt)?'—':dt.toLocaleString('es-CO',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}) }
  const fmtCOP = v => v!=null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v)) : '—'
  const DISP = { INHUMACION:'Inhumación', CREMACION:'Cremación', OSARIO:'Osario' }
  const TANA = { BASICA:'Básica', EMBALSAMAMIENTO:'Embalsamamiento', RESTAURACION:'Restauración', ESPECIAL:'Especial' }

  let y = 14

  // ── ENCABEZADO ──────────────────────────────────────────────────────────
  // Línea superior gruesa
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(1.2)
  doc.line(PL, y, W-PR, y)
  y += 5

  // Nombre empresa — grande y bold
  doc.setFont('helvetica','bold')
  doc.setFontSize(16)
  doc.setTextColor(...BLACK)
  doc.text((empresa.nombre_empresa || 'Funeraria San José de Ábrego').toUpperCase(), PL, y)
  y += 5

  // Datos empresa — pequeño normal
  doc.setFont('helvetica','normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  const infoEmp = [
    empresa.nit && `NIT: ${empresa.nit}`,
    empresa.direccion,
    empresa.municipio,
    empresa.telefono && `Tel: ${empresa.telefono}`,
    empresa.email,
  ].filter(Boolean).join('   |   ')
  doc.text(infoEmp, PL, y)
  y += 3

  // Línea divisora
  doc.setLineWidth(0.3)
  doc.setDrawColor(...LGRAY)
  doc.line(PL, y, W-PR, y)
  y += 4

  // TÍTULO DOCUMENTO — centrado en mayúsculas
  doc.setFont('helvetica','bold')
  doc.setFontSize(13)
  doc.setTextColor(...BLACK)
  doc.text('ORDEN DE SERVICIO FUNERARIO', W/2, y, { align:'center' })
  y += 5

  // Nro servicio + fecha emisión (dos columnas)
  doc.setFont('helvetica','bold')
  doc.setFontSize(9)
  doc.text(`N° ${s.codigo||s.numero}`, PL, y)
  doc.setFont('helvetica','normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(`Fecha de emisión: ${fmtD(new Date().toISOString())}`, W-PR, y, { align:'right' })
  doc.text(`Estado: ${(s.estado||'').replace('_',' ')}`, PL + 40, y)
  y += 3

  // Línea gruesa
  doc.setLineWidth(0.8)
  doc.setDrawColor(...BLACK)
  doc.line(PL, y, W-PR, y)
  y += 5

  // ── Helpers ─────────────────────────────────────────────────────────────
  const titulo = (txt) => {
    doc.setFont('helvetica','bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLACK)
    doc.text(txt.toUpperCase(), PL, y)
    y += 1
    doc.setLineWidth(0.4)
    doc.setDrawColor(...BLACK)
    doc.line(PL, y, W-PR, y)
    y += 4
  }

  // par clave:valor en dos columnas
  const grid = (filas) => {
    const colW = CW / 2
    filas.forEach(fila => {
      let x = PL
      fila.forEach(([lbl, val]) => {
        doc.setFont('helvetica','normal')
        doc.setFontSize(8)
        doc.setTextColor(...GRAY)
        doc.text(`${lbl}:`, x, y)
        doc.setFont('helvetica','bold')
        doc.setTextColor(...DARK)
        const lw = doc.getTextWidth(`${lbl}: `)
        doc.text(String(val||'—'), x + lw, y)
        x += colW
      })
      y += 5
    })
    y += 1
  }

  // separador entre secciones
  const sep = () => {
    doc.setLineWidth(0.15)
    doc.setDrawColor(...LGRAY)
    doc.line(PL, y, W-PR, y)
    y += 5
  }

  // ── 1. DATOS DEL FALLECIDO ───────────────────────────────────────────────
  titulo('1. Datos del Fallecido')

  // Nombre en grande
  doc.setFont('helvetica','bold')
  doc.setFontSize(12)
  doc.setTextColor(...BLACK)
  doc.text(s.difunto_nombre || '—', PL, y)
  y += 5

  grid([
    [[`${s.difunto_tipo_doc||'CC'}`, s.difunto_documento], ['Fecha de nacimiento', fmtD(s.fecha_nacimiento)]],
    [['Grupo sanguíneo (RH)', s.rh||'—'], ['Tipo de disposición', DISP[s.tipo_disposicion]||'—']],
    ...(defuncion ? [
      [['Fecha de fallecimiento', `${fmtD(defuncion.fecha_fallecimiento)}${defuncion.hora_fallecimiento?' – '+defuncion.hora_fallecimiento:''}`], ['Tipo de lugar', defuncion.tipo_lugar||'—']],
      [['Causa de fallecimiento', defuncion.causa_fallecimiento||'—'], ['Tipo de muerte', defuncion.tipo_muerte||'—']],
      ...(defuncion.municipio_nombre ? [[['Municipio', `${defuncion.municipio_nombre}, ${defuncion.departamento_nombre||''}`], ['Dirección', defuncion.lugar_fallecimiento||'—']]] : []),
      ...(defuncion.medico_certifica ? [[['Médico que certifica', defuncion.medico_certifica], ['N° registro médico', defuncion.registro_medico||'—']]] : []),
    ] : []),
  ])
  sep()

  // ── 2. CONTRATANTE / RESPONSABLE ─────────────────────────────────────────
  titulo('2. Contratante / Responsable')
  grid([
    [['Nombre completo', s.contratante_nombre], [`${s.contratante_tipo_doc||'Documento'}`, s.contratante_cedula]],
    [['Teléfono', s.contratante_tel||'—'], ['Parentesco con el difunto', s.parentesco||'—']],
    ...(s.contratante_direccion ? [[['Dirección', s.contratante_direccion], ['N° de contrato', s.contrato_numero||'—']]] : []),
  ])
  sep()

  // ── 3. PÓLIZA (si aplica) ────────────────────────────────────────────────
  if (s.poliza_numero) {
    titulo('3. Póliza de Previsión')
    grid([
      [['N° de póliza', `#${s.poliza_numero}`], ['Plan', s.poliza_plan||'—']],
      [['Titular de la póliza', s.poliza_titular||'—'], ['Cuota mensual', fmtCOP(s.poliza_cuota)]],
    ])
    sep()
  }

  // ── 4. VELACIÓN Y LOGÍSTICA ──────────────────────────────────────────────
  const n = s.poliza_numero ? 4 : 3
  titulo(`${n}. Velación y Logística`)
  grid([
    [['Sala de velación', s.sala_nombre||'—'], ['Lugar de recogida', s.lugar_recogida||'—']],
    [['Fecha y hora de recogida', fmtDT(s.fecha_recogida)], ['Inicio de velación', fmtDT(s.fecha_velacion_ini)]],
    [['Fin de velación', fmtDT(s.fecha_velacion_fin)], ['Disposición final', DISP[s.tipo_disposicion]||'—']],
    ...(s.lugar_disposicion||s.fecha_disposicion ? [[['Lugar de disposición', s.lugar_disposicion||'—'], ['Fecha de disposición', fmtDT(s.fecha_disposicion)]]] : []),
  ])
  if (s.observaciones) {
    doc.setFont('helvetica','normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text('Observaciones:', PL, y)
    doc.setFont('helvetica','bold')
    doc.setTextColor(...DARK)
    doc.text(s.observaciones.substring(0,120), PL + doc.getTextWidth('Observaciones: '), y)
    y += 5
  }
  sep()

  // ── 5. DETALLE DE SERVICIOS ───────────────────────────────────────────────
  if (items.length > 0) {
    if (y > 160) { doc.addPage(); y = 14 }
    titulo(`${n+1}. Detalle de Servicios`)

    const cobertura   = items.filter(i => i.es_cobertura)
    const adicionales = items.filter(i => !i.es_cobertura)
    const totalCob    = cobertura.reduce((a,i)=>a+Number(i.subtotal||0),0)
    const totalAdi    = adicionales.reduce((a,i)=>a+Number(i.subtotal||0),0)
    const totalGen    = totalCob + totalAdi

    // Columnas: 8+65+22+13+28+28+16 = 180 = CW exacto
    const SEP_COB = [{ content:'— SERVICIOS DE COBERTURA PÓLIZA —', colSpan:7,
      styles:{ halign:'center', fontStyle:'italic', fontSize:7,
               fillColor:[248,248,248], textColor:[110,110,110], cellPadding:[2,2,2,2] } }]
    const SEP_ADI = [{ content:'— SERVICIOS ADICIONALES —', colSpan:7,
      styles:{ halign:'center', fontStyle:'italic', fontSize:7,
               fillColor:[248,248,248], textColor:[110,110,110], cellPadding:[2,2,2,2] } }]

    const fila = (it, idx, cob) => [
      { content:String(idx),
        styles:{ halign:'center', fontSize:7.5, textColor: cob ? [0,0,0] : [130,130,130] } },
      { content:it.descripcion,
        styles:{ fontStyle: cob ? 'bold' : 'normal', fontSize:8,
                 textColor: cob ? [0,0,0] : [50,50,50] } },
      { content:it.catalogo_codigo||'—',
        styles:{ halign:'center', fontSize:7.5, textColor:[90,90,90] } },
      { content:String(Number(it.cantidad||1)),
        styles:{ halign:'center', fontSize:8 } },
      { content:fmtCOP(it.precio_unit),
        styles:{ halign:'right', fontSize:8 } },
      { content:fmtCOP(it.subtotal),
        styles:{ halign:'right', fontSize:8, fontStyle: cob ? 'bold' : 'normal' } },
      { content: cob ? 'Cobertura' : 'Adicional',
        styles:{ halign:'center', fontSize:7, fontStyle: cob ? 'bold' : 'normal',
                 textColor: cob ? [10,110,60] : [140,70,0] } },
    ]

    const rows = []
    if (cobertura.length)   { rows.push(SEP_COB); cobertura.forEach((it,i)  => rows.push(fila(it,i+1,true))) }
    if (adicionales.length) { rows.push(SEP_ADI); adicionales.forEach((it,i) => rows.push(fila(it,cobertura.length+i+1,false))) }

    // Filas de totales — label colSpan:5, valor colSpan:2 (SUBTOTAL+TIPO = 44mm)
    const fTot = (lbl, val, bg, fg, fgVal, fw, fs) => ([
      { content: lbl, colSpan:5,
        styles:{ halign:'right', fontStyle: fw||'normal', fontSize: fs||8,
                 fillColor:bg, textColor:fg, cellPadding:[3,3,3,3] } },
      { content: val, colSpan:2,
        styles:{ halign:'right', fontStyle: fw||'bold', fontSize: fs||8,
                 fillColor:bg, textColor: fgVal||fg, cellPadding:[3,4,3,4] } },
    ])
    if (cobertura.length > 0)
      rows.push(fTot('Subtotal cobertura póliza:', fmtCOP(totalCob), [245,245,245], [90,90,90], [0,0,0]))
    if (adicionales.length > 0)
      rows.push(fTot('Subtotal servicios adicionales:', fmtCOP(totalAdi), [245,245,245], [90,90,90], [0,0,0]))
    rows.push(fTot('TOTAL DEL SERVICIO:', fmtCOP(totalGen), [0,0,0], [255,255,255], [255,255,255], 'bold', 10))

    autoTable(doc, {
      startY: y,
      margin: { left:PL, right:PR },
      tableWidth: CW,
      styles: { fontSize:8, cellPadding:[2.8,2,2.8,2], font:'helvetica',
                textColor:[30,30,30], lineColor:[215,215,215], lineWidth:0.15,
                overflow:'ellipsize' },
      headStyles: { fillColor:[0,0,0], textColor:[255,255,255],
                    fontStyle:'bold', fontSize:8, cellPadding:[3.5,2,3.5,2] },
      alternateRowStyles: { fillColor:[251,251,251] },
      columnStyles: {
        0: { cellWidth:8,  halign:'center' },
        1: { cellWidth:65 },
        2: { cellWidth:22, halign:'center' },
        3: { cellWidth:13, halign:'center' },
        4: { cellWidth:28, halign:'right'  },
        5: { cellWidth:28, halign:'right'  },
        6: { cellWidth:16, halign:'center' },
      },
      head: [['#','DESCRIPCIÓN DEL SERVICIO','CÓDIGO','CANT.','V. UNITARIO','SUBTOTAL','TIPO']],
      body: rows,
      didParseCell: d => {
        if (d.section !== 'body') return
        const row = rows[d.row.index]
        if (!row) return
        const first = row[0]
        // filas separadoras y de totales: desactivar alterno
        if (typeof first?.content === 'string' &&
            (first.content.startsWith('—') || first.content.includes('Subtotal') ||
             first.content.includes('TOTAL'))) {
          d.cell.styles.fillColor = d.cell.styles.fillColor  // keep own fill
        }
      },
    })
    y = doc.lastAutoTable.finalY + 5
    sep()
  }

  // ── 6. TRASLADOS ─────────────────────────────────────────────────────────
  if (traslados.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    titulo(`${n+2}. Traslados`)
    autoTable(doc, {
      startY: y,
      margin: { left:PL, right:PR },
      styles: { fontSize:8, cellPadding:2.5, textColor:DARK, lineColor:LGRAY, lineWidth:0.15 },
      headStyles: { fillColor:BLACK, textColor:WHITE, fontStyle:'bold', fontSize:7.5 },
      columnStyles: {
        0:{ fontStyle:'bold', cellWidth:40 },
        1:{ cellWidth:35 },
        2:{ cellWidth:35 },
        3:{ cellWidth:45 },
        4:{ cellWidth:22, halign:'center', fontStyle:'bold' },
      },
      head: [['TIPO DE TRASLADO','ORIGEN','DESTINO','FECHA Y HORA','ESTADO']],
      body: traslados.map(t => [
        t.tipo?.replace(/_/g,' ')||'—', t.origen||'—', t.destino||'—',
        fmtDT(t.fecha_hora), t.completado?'Completado':'Pendiente',
      ]),
    })
    y = doc.lastAutoTable.finalY + 5
    sep()
  }

  // ── TANATOPRAXIA ─────────────────────────────────────────────────────────
  if (tanatopraxia) {
    if (y > 230) { doc.addPage(); y = 14 }
    titulo('Tanatopraxia')
    grid([
      [['Tipo de servicio', TANA[tanatopraxia.tipo_servicio]||'—'], ['Responsable', tanatopraxia.responsable||'—']],
      [['Hora de inicio', fmtDT(tanatopraxia.hora_inicio)], ['Hora de fin', fmtDT(tanatopraxia.hora_fin)]],
      ...(tanatopraxia.materiales ? [[['Materiales utilizados', tanatopraxia.materiales.substring(0,70)], ['','']]]: []),
    ])
    sep()
  }

  // ── TRÁMITES LEGALES ─────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 14 }
  titulo('Trámites Legales')
  grid([
    [['Acta de defunción', s.acta_defuncion||'Pendiente'], ['Permiso de inhumación', s.permiso_inhumacion||'Pendiente']],
    [['Certificado médico', s.certificado_medico||'Pendiente'], ['Registro civil', s.registro_civil||'Pendiente']],
  ])

  // ── FIRMAS ───────────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 14 }
  y += 8
  doc.setLineWidth(0.2)
  doc.setDrawColor(...LGRAY)
  doc.line(PL, y, W-PR, y)
  y += 8

  const fw = CW / 3
  const firmantes = [
    { lbl:'Operador responsable', sub: s.operador_nombre||'' },
    { lbl:'Contratante / Familiar', sub: s.contratante_nombre||'' },
    { lbl:'Director de la Funeraria', sub: empresa.representante_legal||'' },
  ]
  firmantes.forEach(({ lbl, sub }, i) => {
    const fx = PL + i * fw + fw/2
    doc.setLineWidth(0.5)
    doc.setDrawColor(...BLACK)
    doc.line(fx - fw/2 + 6, y, fx + fw/2 - 6, y)
    doc.setFont('helvetica','bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(lbl, fx, y+4.5, { align:'center' })
    doc.setFont('helvetica','normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    if (sub) doc.text(sub.substring(0,32), fx, y+8.5, { align:'center' })
    doc.text('C.C. _________________________', fx, y+12.5, { align:'center' })
  })

  // ── PIE DE PÁGINA en todas las páginas ───────────────────────────────────
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setLineWidth(0.5)
    doc.setDrawColor(...BLACK)
    doc.line(PL, 286, W-PR, 286)
    doc.setFont('helvetica','normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.text(`${empresa.nombre_empresa||''}  ·  NIT ${empresa.nit||'—'}  ·  ${empresa.telefono||''}  ·  ${empresa.email||''}`, PL, 290)
    doc.text(`Página ${p} de ${total}`, W-PR, 290, { align:'right' })
  }

  doc.save(`OSF-${s.codigo||s.numero}.pdf`)
}

// ── Página principal ──────────────────────────────────────────────────────

export default function ServiciosPage() {
  const [rows, setRows]         = useState([])
  const [meta, setMeta]         = useState({ total:0, page:1, pages:1 })
  const [kpis, setKpis]         = useState({})
  const [salas, setSalas]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [q, setQ]               = useState('')
  const [estado, setEstado]     = useState('')
  const [page, setPage]         = useState(1)
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const { usuario } = useAuthStore()
  const esEditor = ['superadmin','administrador','operador','asesor_comercial'].includes(usuario?.rol)

  const cargar = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page:pg, limit:20 })
      if (q)      params.set('q', q)
      if (estado) params.set('estado', estado)
      const r = await api.get(`/servicios?${params}`)
      setRows(r.data.data)
      setMeta(r.data.meta)
    } finally { setLoading(false) }
  }, [q, estado, page])

  const cargarKpis = useCallback(async () => {
    const [kRes, salasRes] = await Promise.all([
      api.get('/servicios/stats'),
      api.get('/servicios/salas'),
    ])
    setKpis(kRes.data.data)
    setSalas(salasRes.data.data)
  }, [])

  useEffect(() => { cargarKpis() }, [cargarKpis])
  useEffect(() => { setPage(1); cargar(1) }, [q, estado])
  useEffect(() => { cargar() }, [page])

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/servicios/${id}/estado`, { estado: nuevoEstado })
      toast.success('Estado del servicio actualizado')
      cargar(); cargarKpis(); setModal(null)
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const KPI_LIST = [
    { key:'recibidos',          label:'Recibidos',          color:'#6366F1', bg:'#EEF2FF', emoji:'📋' },
    { key:'en_curso',           label:'En curso',           color:'#F59E0B', bg:'#FEF3C7', emoji:'⚙️' },
    { key:'completados',        label:'Completados',        color:'#059669', bg:'#D1FAE5', emoji:'✅' },
    { key:'tramites_pendientes',label:'Trámites pendientes',color:'#EF4444', bg:'#FEE2E2', emoji:'📄' },
    { key:'cremaciones',        label:'Cremaciones',        color:'#DC2626', bg:'#FEE2E2', emoji:'🔥' },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="sv-page">

        <div className="sv-head">
          <div className="sv-head-top">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="sv-head-icon"><Package size={22} color="#fff"/></div>
              <div>
                <div className="sv-titulo">Servicios Funerarios</div>
                <div className="sv-sub">
                  Velaciones · Traslados · Inhumaciones · Cremaciones · {meta.total} servicio{meta.total!==1?'s':''}
                </div>
              </div>
            </div>
            {esEditor && (
              <button className="sv-btn sv-btn-primary"
                onClick={() => { setSelected(null); setModal('form') }}>
                <PackagePlus size={15}/> Nuevo servicio
              </button>
            )}
          </div>

          <div className="sv-kpis">
            {KPI_LIST.map(k => (
              <div key={k.key} className="sv-kpi">
                <div className="sv-kpi-bar" style={{ background:k.color }}/>
                <div className="sv-kpi-body">
                  <div className="sv-kpi-icon" style={{ background:k.bg }}>{k.emoji}</div>
                  <div className="sv-kpi-val">{kpis[k.key] ?? 0}</div>
                  <div className="sv-kpi-label">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="sv-toolbar">
            <div className="sv-search">
              <Search size={14} className="sv-search-icon"/>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar por número, difunto, contratante…"/>
            </div>
            <select className="sv-select" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="RECIBIDO">Recibidos</option>
              <option value="EN_CURSO">En curso</option>
              <option value="COMPLETADO">Completados</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
            <button className="sv-btn sv-btn-ghost" onClick={() => cargar()}>
              <RefreshCw size={14} className={loading ? 'sv-spin' : ''}/>
            </button>
          </div>
        </div>

        <div className="sv-table-wrap">
          {loading && rows.length === 0 ? (
            <div className="sv-empty">
              <Loader2 size={32} className="sv-spin" color="#8B5CF6"/>
              <p>Cargando servicios…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="sv-empty">
              <div style={{ width:64, height:64, borderRadius:18, background:'#F0F1FA',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>⚰️</div>
              <p>Sin servicios registrados</p>
              <span>Use "Nuevo servicio" para registrar el primer servicio funerario</span>
            </div>
          ) : (
            <table className="sv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Código</th>
                  <th>Difunto</th>
                  <th>Contratante</th>
                  <th>Origen</th>
                  <th>Tipo</th>
                  <th>Sala</th>
                  <th>Velación</th>
                  <th>Disposición</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => {
                  const disp = DISPOSICION_META[s.tipo_disposicion] || {}
                  return (
                    <tr key={s.id} onClick={() => { setSelected(s); setModal('ficha') }}>
                      <td><span style={{ fontWeight:900, color:'#0F1035' }}>#{s.numero}</span></td>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700,
                          color:'#7C3AED', background:'#F5F3FF', padding:'3px 8px',
                          borderRadius:6, whiteSpace:'nowrap' }}>
                          {s.codigo || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ fontSize:16 }}>👼</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:800, color:'#0F1035' }}>{s.difunto_nombre}</div>
                            {s.difunto_rh && (
                              <span style={{ fontSize:10, fontWeight:800, color:'#DC2626',
                                background:'#FEE2E2', padding:'1px 6px', borderRadius:6 }}>
                                {s.difunto_rh}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>{s.contratante_nombre}</div>
                        {s.contratante_tel && <div style={{ fontSize:11, color:'#9CA3AF' }}>{s.contratante_tel}</div>}
                      </td>
                      <td><OrigenChip servicio={s}/></td>
                      <td>
                        <span style={{ fontSize:13 }}>{disp.icon}</span>{' '}
                        <span style={{ fontSize:12, color:disp.color, fontWeight:700 }}>{disp.label}</span>
                      </td>
                      <td style={{ fontSize:12.5, color:'#6B7280' }}>{s.sala_nombre || '—'}</td>
                      <td style={{ fontSize:11.5, color:'#6B7280' }}>{fmtDT(s.fecha_velacion_ini)}</td>
                      <td style={{ fontSize:11.5, color:'#6B7280' }}>{fmtDT(s.fecha_disposicion)}</td>
                      <td><EstadoChip estado={s.estado}/></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="sv-act" title="Ver"
                            onClick={() => { setSelected(s); setModal('ficha') }}>
                            <Eye size={13}/>
                          </button>
                          {esEditor && !['COMPLETADO','CANCELADO'].includes(s.estado) && (
                            <button className="sv-act" title="Editar"
                              onClick={() => { setSelected(s); setModal('form') }}>
                              <Edit2 size={13}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="sv-pag">
          <span className="sv-pag-info">
            {meta.total} servicio{meta.total!==1?'s':''} · Página {meta.page} de {meta.pages}
          </span>
          <div className="sv-pag-btns">
            <button className="sv-pag-btn" disabled={page<=1} onClick={() => setPage(p=>p-1)}>
              <ChevronLeft size={14}/>
            </button>
            <button className="sv-pag-btn" disabled={page>=meta.pages} onClick={() => setPage(p=>p+1)}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </div>

      {modal === 'form' && (
        <ModalForm
          servicio={selected}
          salas={salas}
          onClose={() => { setModal(null); setSelected(null) }}
          onSaved={() => { setModal(null); setSelected(null); cargar(); cargarKpis() }}
        />
      )}
      {modal === 'ficha' && selected && (
        <ModalFicha
          id={selected.id}
          onClose={() => { setModal(null); setSelected(null) }}
          onEditar={(s) => { setSelected(s); setModal('form') }}
          onEstado={(id, est) => cambiarEstado(id, est)}
        />
      )}
    </>
  )
}
