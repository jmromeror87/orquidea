/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — lista doble (disponibles ⇄ asignados)           ║
 * ║  Archivo         : components/ui/ListaDoble.jsx                         ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Dos paneles: a la izquierda lo disponible, a la derecha lo asignado.
 *  - clic marca/desmarca, doble clic pasa ese elemento al otro lado
 *  - ›  pasa los marcados a la derecha     »  pasa todos
 *  - ‹  devuelve los marcados             «  devuelve todos
 * Cada panel tiene su buscador; "Marcar todos" marca lo que se ve filtrado.
 *
 *   <ListaDoble items={[{ id, label, detalle }]} seleccionados={ids} onChange={ids => …}
 *               tituloIzq="Disponibles" tituloDer="Asignados" pie={ids => '…'} />
 */
import { useState } from 'react'
import { Search, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react'

const CSS = `
.ld { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); gap:10px; align-items:stretch; }
.ld-panel { border:1.5px solid #e2e8f0; border-radius:12px; display:flex; flex-direction:column; min-width:0; background:#fff; overflow:hidden; }
.ld-head { padding:8px 10px; border-bottom:1px solid #eef2f7; background:#f8fafc; display:flex; align-items:center; justify-content:space-between; gap:6px; }
.ld-titulo { font-size:11px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#475569; }
.ld-cuenta { font-size:11px; font-weight:700; color:#64748b; background:#e2e8f0; border-radius:20px; padding:1px 8px; }
.ld-buscar { position:relative; padding:8px 10px 6px; }
.ld-buscar svg { position:absolute; left:19px; top:16px; color:#94a3b8; }
.ld-buscar input { width:100%; box-sizing:border-box; border:1.5px solid #e2e8f0; border-radius:8px; padding:6px 10px 6px 28px; font-size:12.5px; outline:none; font-family:inherit; }
.ld-buscar input:focus { border-color:#6366f1; }
.ld-lista { flex:none; height:260px; overflow-y:auto; padding:2px 6px 6px; }
.ld-item { display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:8px; cursor:pointer; user-select:none; font-size:12.5px; color:#334155; }
.ld-item:hover { background:#f1f5f9; }
.ld-item.sel { background:#e0e7ff; color:#3730a3; }
.ld-item input { margin:0; accent-color:#4f46e5; flex-shrink:0; }
.ld-item .ld-nom { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ld-item .ld-det { flex-shrink:0; font-size:11.5px; color:#64748b; }
.ld-vacio { font-size:12px; color:#94a3b8; text-align:center; padding:24px 8px; }
.ld-pie { padding:7px 10px; border-top:1px solid #eef2f7; font-size:11.5px; color:#475569; display:flex; justify-content:space-between; gap:6px; flex-wrap:wrap; }
.ld-total { color:#047857; font-weight:800; font-size:13px; }
.ld-pie button { background:none; border:none; color:#4f46e5; font-weight:700; font-size:11.5px; cursor:pointer; padding:0; font-family:inherit; }
.ld-botones { display:flex; flex-direction:column; justify-content:center; gap:8px; }
.ld-btn { width:36px; height:32px; border-radius:8px; border:1.5px solid #c7d2fe; background:#eef2ff; color:#4338ca; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.ld-btn:hover:not(:disabled) { background:#e0e7ff; }
.ld-btn:disabled { opacity:.35; cursor:not-allowed; }
@media (max-width:640px) {
  .ld { grid-template-columns:1fr; }
  .ld-botones { flex-direction:row; justify-content:center; }
  .ld-botones .ld-btn svg { transform:rotate(90deg); }
  .ld-lista { height:180px; }
}
`

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Panel({ titulo, items, marcados, setMarcados, onDoble, pie, pieDestacado = false }) {
  const [q, setQ] = useState('')
  const visibles = items.filter(i => norm(i.label).includes(norm(q)))
  const marcadosVisibles = visibles.filter(i => marcados.has(i.id))
  const toggle = id => setMarcados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const marcarTodos = () => setMarcados(prev => {
    const n = new Set(prev)
    const todos = marcadosVisibles.length === visibles.length
    visibles.forEach(i => todos ? n.delete(i.id) : n.add(i.id))
    return n
  })
  return (
    <div className="ld-panel">
      <div className="ld-head">
        <span className="ld-titulo">{titulo}</span>
        <span className="ld-cuenta">{items.length}</span>
      </div>
      <div className="ld-buscar">
        <Search size={13}/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…"/>
      </div>
      <div className="ld-lista">
        {visibles.length === 0
          ? <div className="ld-vacio">{items.length ? 'Nada coincide con la búsqueda' : 'Vacío'}</div>
          : visibles.map(i => (
            <div key={i.id} className={`ld-item${marcados.has(i.id) ? ' sel' : ''}`}
              onClick={() => toggle(i.id)} onDoubleClick={() => onDoble(i.id)}
              title="Clic para marcar · doble clic para pasar al otro lado">
              <input type="checkbox" checked={marcados.has(i.id)} readOnly tabIndex={-1}/>
              <span className="ld-nom">{i.label}</span>
              {i.detalle != null && <span className="ld-det">{i.detalle}</span>}
            </div>
          ))}
      </div>
      <div className="ld-pie">
        <button type="button" onClick={marcarTodos} disabled={!visibles.length}>
          {visibles.length && marcadosVisibles.length === visibles.length ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
        <span className={pieDestacado ? 'ld-total' : undefined}>{pie}</span>
      </div>
    </div>
  )
}

export default function ListaDoble({ items, seleccionados, onChange, tituloIzq = 'Disponibles', tituloDer = 'Asignados', pieIzq, pieDer }) {
  const [marcIzq, setMarcIzq] = useState(new Set())
  const [marcDer, setMarcDer] = useState(new Set())
  const sel = new Set(seleccionados)
  const izq = items.filter(i => !sel.has(i.id))
  const der = items.filter(i => sel.has(i.id))

  const pasarDer = ids => { if (!ids.length) return; onChange([...seleccionados, ...ids.filter(id => !sel.has(id))]); setMarcIzq(new Set()) }
  const pasarIzq = ids => { if (!ids.length) return; const quitar = new Set(ids); onChange(seleccionados.filter(id => !quitar.has(id))); setMarcDer(new Set()) }

  return (
    <>
      <style>{CSS}</style>
      <div className="ld">
        <Panel titulo={tituloIzq} items={izq} marcados={marcIzq} setMarcados={setMarcIzq}
          onDoble={id => pasarDer([id])} pie={typeof pieIzq === 'function' ? pieIzq(izq) : pieIzq}/>
        <div className="ld-botones">
          <button type="button" className="ld-btn" title="Pasar los marcados" disabled={!marcIzq.size}
            onClick={() => pasarDer(izq.filter(i => marcIzq.has(i.id)).map(i => i.id))}><ChevronRight size={16}/></button>
          <button type="button" className="ld-btn" title="Pasar todos" disabled={!izq.length}
            onClick={() => pasarDer(izq.map(i => i.id))}><ChevronsRight size={16}/></button>
          <button type="button" className="ld-btn" title="Devolver los marcados" disabled={!marcDer.size}
            onClick={() => pasarIzq(der.filter(i => marcDer.has(i.id)).map(i => i.id))}><ChevronLeft size={16}/></button>
          <button type="button" className="ld-btn" title="Devolver todos" disabled={!der.length}
            onClick={() => pasarIzq(der.map(i => i.id))}><ChevronsLeft size={16}/></button>
        </div>
        <Panel titulo={tituloDer} items={der} marcados={marcDer} setMarcados={setMarcDer}
          onDoble={id => pasarIzq([id])} pie={typeof pieDer === 'function' ? pieDer(der) : pieDer} pieDestacado/>
      </div>
    </>
  )
}
