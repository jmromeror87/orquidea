/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — cobertura del plan agrupada                ║
 * ║  Archivo         : components/polizas/CoberturaPlan.jsx                 ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Lo que cubre la póliza, ordenado por el MOMENTO del servicio funerario
 * (trámites → cuidado del ser querido → velación → … → cementerio) en vez de
 * una sopa de etiquetas. La categoría del catálogo no sirve para esto (casi
 * todo es "ADICIONAL"), así que se clasifica por el nombre; lo que no encaje
 * queda en "Otros servicios", nunca se pierde.
 */
import { useState } from 'react'
import { Search, Check, X, ChevronDown, Package, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'

const CSS = `
.cp-resumen { display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; margin-bottom:14px; }
.cp-total { display:flex; align-items:baseline; gap:6px; }
.cp-total strong { font-size:26px; font-weight:900; color:#047857; line-height:1; }
.cp-total span { font-size:12.5px; font-weight:700; color:#065f46; }
.cp-dato { font-size:12px; font-weight:700; color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:20px; padding:4px 11px; white-space:nowrap; }
.cp-buscar { position:relative; margin-left:auto; }
.cp-buscar svg { position:absolute; left:9px; top:8px; color:#94a3b8; }
.cp-buscar input { border:1.5px solid #e2e8f0; border-radius:8px; padding:6px 10px 6px 28px; font-size:12.5px; outline:none; font-family:inherit; width:220px; }
.cp-buscar input:focus { border-color:#10b981; }
.cp-grupos { column-width:290px; column-gap:14px; }
.cp-grupo { break-inside:avoid; border:1.5px solid #e5f7ee; border-radius:12px; background:#fff; margin-bottom:14px; overflow:hidden; display:inline-block; width:100%; }
.cp-ghead { display:flex; align-items:center; gap:8px; padding:9px 12px; background:#f6fdf9; border-bottom:1px solid #e5f7ee; }
.cp-gicon { font-size:16px; line-height:1; }
.cp-gtit { font-size:11.5px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:#065f46; flex:1; }
.cp-gnum { font-size:11px; font-weight:800; color:#047857; background:#d1fae5; border-radius:20px; padding:1px 8px; }
.cp-item { display:flex; gap:9px; align-items:flex-start; padding:7px 12px; font-size:12.5px; color:#1f2937; line-height:1.4; }
.cp-item + .cp-item { border-top:1px dashed #eef2f7; }
.cp-check { flex-shrink:0; width:17px; height:17px; border-radius:50%; background:#10b981; color:#fff; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.cp-item.no { color:#9ca3af; text-decoration:line-through; }
.cp-item.no .cp-check { background:#e5e7eb; color:#9ca3af; }
.cp-item mark { background:#fef08a; border-radius:3px; padding:0 1px; }
.cp-ghead { cursor:pointer; user-select:none; width:100%; border:none; font-family:inherit; text-align:left; }
.cp-ghead:hover { background:#ecfdf5; }
.cp-grupo.cerrado .cp-ghead { border-bottom:none; }
.cp-chev { color:#059669; transition:transform .18s; flex-shrink:0; }
.cp-grupo.cerrado .cp-chev { transform:rotate(-90deg); }
.cp-ginv { font-size:10.5px; font-weight:700; color:#1d4ed8; background:#eff6ff; border-radius:20px; padding:1px 7px; display:flex; align-items:center; gap:3px; }
.cp-acc { display:flex; gap:6px; }
.cp-accbtn { display:flex; align-items:center; gap:4px; border:1.5px solid #d1fae5; background:#fff; color:#047857; border-radius:8px; padding:5px 9px; font-size:11.5px; font-weight:700; cursor:pointer; font-family:inherit; }
.cp-accbtn:hover { background:#ecfdf5; }
.cp-inv { display:inline-flex; align-items:center; gap:4px; margin-top:4px; font-size:10.5px; font-weight:700; border-radius:6px; padding:2px 7px; text-decoration:none; }
.cp-inv.ok   { color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe; }
.cp-inv.bajo { color:#b45309; background:#fffbeb; border:1px solid #fde68a; }
.cp-inv.cero { color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; }
.cp-dato.inv { color:#1d4ed8; background:#eff6ff; border-color:#bfdbfe; }
.cp-vacio { font-size:12.5px; color:#94a3b8; padding:18px; text-align:center; }
@media (max-width:640px) { .cp-buscar { margin-left:0; width:100%; } .cp-buscar input { width:100%; box-sizing:border-box; } }
`

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Orden = orden en que ocurre el servicio. La primera regla que coincide gana
// (comunicación va antes que cementerio: "carteles (…cementerio…)" es aviso).
const GRUPOS = [
  { k:'tramites',   icon:'📄', titulo:'Trámites y documentos',      re:/diligencia|registradur|certificado|tramite|documento/ },
  { k:'cuidado',    icon:'🕊️', titulo:'Cuidado del ser querido',    re:/preserv|asepsia|tanatopraxia|cofre|ataud|cenizario|cremacion/ },
  { k:'velacion',   icon:'🕯️', titulo:'Velación',                   re:/^velacion|velacion en|kit de velacion|sala|alumbrado|simbolo de duelo|telefonico/ },
  { k:'novenario',  icon:'🙏', titulo:'Novenario y última noche',   re:/novenario|ultima noche|veladora/ },
  { k:'flores',     icon:'🌸', titulo:'Flores',                     re:/flor|arreglo/ },
  { k:'cafeteria',  icon:'☕', titulo:'Cafetería y atención',       re:/cafeteria|auxiliar/ },
  { k:'religioso',  icon:'⛪', titulo:'Ceremonia religiosa',        re:/misa|coro|oracion|parroquia|eucarist/ },
  { k:'traslados',  icon:'🚐', titulo:'Traslados y cortejo',        re:/traslado|carroza|cortejo|transporte/ },
  { k:'homenaje',   icon:'📣', titulo:'Comunicación y homenaje',    re:/tarjeta|cartel|cuna|radial|homenaje|cinta|aviso|recordatorio/ },
  { k:'cementerio', icon:'⚱️', titulo:'Cementerio',                 re:/lote|boveda|tierra|inhumacion|exhumacion|osario|lapida|tumba|cementerio|campo santo/ },
  { k:'seguros',    icon:'🛡️', titulo:'Seguros y beneficios',       re:/seguro|auxilio|beneficio/ },
]
const OTROS = { k:'otros', icon:'➕', titulo:'Otros servicios' }

const grupoDe = nombre => GRUPOS.find(g => g.re.test(norm(nombre))) || OTROS

function Resaltar({ texto, q }) {
  if (!q) return texto
  const i = norm(texto).indexOf(norm(q))
  if (i < 0) return texto
  return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + q.length)}</mark>{texto.slice(i + q.length)}</>
}

export default function CoberturaPlan({ data }) {
  const [q, setQ] = useState('')
  const items = [
    ...(Array.isArray(data.servicios_incluidos) ? data.servicios_incluidos : []).map(s => ({ id: s.id, nombre: s.nombre, ok: true, inv: s.inventario || null })),
    ...(Array.isArray(data.coberturas_extra) ? data.coberturas_extra : []).map((c, i) => ({ id: `ex-${i}`, nombre: c.nombre, ok: c.incluido !== false })),
  ]
  const incluidos = items.filter(i => i.ok).length
  const conInventario = items.filter(i => i.inv).length
  const [cerrados, setCerrados] = useState(() => new Set())
  const buscando = !!q.trim()
  const toggle = k => setCerrados(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  const visibles = items.filter(i => !q.trim() || norm(i.nombre).includes(norm(q.trim())))

  const grupos = [...GRUPOS, OTROS].map(g => ({
    ...g,
    items: visibles.filter(i => grupoDe(i.nombre).k === g.k).sort((a, b) => (b.ok - a.ok) || a.nombre.localeCompare(b.nombre, 'es')),
  })).filter(g => g.items.length)

  return (
    <>
      <style>{CSS}</style>
      <div className="cp-resumen">
        <div className="cp-total"><strong>{incluidos}</strong><span>servicios incluidos</span></div>
        {+data.cubre_velacion_h > 0 && <span className="cp-dato">🕯️ Velación {data.cubre_velacion_h} horas</span>}
        {data.max_beneficiarios != null && <span className="cp-dato">👨‍👩‍👧 Hasta {data.max_beneficiarios} beneficiarios</span>}
        {data.meses_carencia != null && <span className="cp-dato">⏳ Carencia {data.meses_carencia} {+data.meses_carencia === 1 ? 'mes' : 'meses'}</span>}
        {conInventario > 0 && <span className="cp-dato inv" title="Al prestar el servicio se descuenta automáticamente del inventario">📦 {conInventario} descargan inventario</span>}
      </div>

      {items.length > 0 && (
        <div className="cp-acc" style={{ marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
          <button type="button" className="cp-accbtn" onClick={() => setCerrados(new Set())}><ChevronsUpDown size={13}/> Expandir todo</button>
          <button type="button" className="cp-accbtn" onClick={() => setCerrados(new Set([...GRUPOS, OTROS].map(g => g.k)))}><ChevronsDownUp size={13}/> Recoger todo</button>
          {items.length > 6 && (
            <div className="cp-buscar">
              <Search size={13}/>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar un servicio…"/>
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="cp-vacio">
          Esta póliza no tiene servicios congelados (el plan no tenía servicios asignados al momento de la venta).
        </div>
      ) : grupos.length === 0 ? (
        <div className="cp-vacio">Ningún servicio coincide con "{q}"</div>
      ) : (
        <div className="cp-grupos">
          {grupos.map(g => {
            // Al buscar se abren todos para mostrar lo encontrado
            const abierto = buscando || !cerrados.has(g.k)
            const nInv = g.items.filter(i => i.inv).length
            return (
            <div key={g.k} className={`cp-grupo${abierto ? '' : ' cerrado'}`}>
              <button type="button" className="cp-ghead" onClick={() => toggle(g.k)} aria-expanded={abierto}
                title={abierto ? 'Recoger' : 'Expandir'}>
                <span className="cp-gicon">{g.icon}</span>
                <span className="cp-gtit">{g.titulo}</span>
                {nInv > 0 && <span className="cp-ginv" title={`${nInv} servicio(s) de este grupo descargan inventario`}><Package size={10}/>{nInv}</span>}
                <span className="cp-gnum">{g.items.length}</span>
                <ChevronDown size={15} className="cp-chev"/>
              </button>
              {abierto && g.items.map(i => {
                const est = i.inv ? (i.inv.stock <= 0 ? 'cero' : i.inv.stock <= i.inv.stock_minimo ? 'bajo' : 'ok') : null
                return (
                <div key={i.id} className={`cp-item${i.ok ? '' : ' no'}`} title={i.ok ? 'Incluido en la póliza' : 'No incluido'}>
                  <span className="cp-check">{i.ok ? <Check size={11} strokeWidth={3.5}/> : <X size={11} strokeWidth={3.5}/>}</span>
                  <span>
                    <Resaltar texto={i.nombre} q={q.trim()}/>
                    {i.inv && (
                      <span style={{ display:'block' }}>
                        <span className={`cp-inv ${est}`}
                          title={`Producto: ${i.inv.producto}${i.inv.sku ? ` (${i.inv.sku})` : ''} — se descarga del inventario al prestar el servicio`}>
                          <Package size={11}/> Descarga inventario · {est === 'cero' ? 'sin existencias' : `${i.inv.stock} ${String(i.inv.unidad || 'und').toLowerCase()} disponibles`}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
              )})}
            </div>
          )})}
        </div>
      )}
    </>
  )
}
