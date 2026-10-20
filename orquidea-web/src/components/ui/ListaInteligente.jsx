/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — lista inteligente                               ║
 * ║  Archivo         : components/ui/ListaInteligente.jsx                   ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-20                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Campo de texto que busca en una lista de valores (hospitales, médicos,
 * iglesias, cementerios, EPS…, Configuración → Listas de valores):
 *  · filtra mientras se escribe, sin importar tildes, mayúsculas ni orden;
 *  · si no existe, se agrega a la lista con un clic (queda para todos);
 *  · guarda el NOMBRE (texto), así los datos viejos siguen funcionando.
 *
 *   <ListaInteligente tipo="MEDICO" titulo="médicos" value={v} onChange={setV}
 *     onElegir={item => …item.detalle…}/>
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { coincide, sinTildes } from '../../utils/textoFormato.js'

// Caché por tipo compartida entre todos los campos de la pantalla
const cache = new Map()        // tipo → { items, promesa }
const oyentes = new Map()      // tipo → Set(fn)
function cargarTipo(tipo, forzar = false) {
  const c = cache.get(tipo)
  if (c && !forzar) return c.promesa
  const promesa = api.get('/listas-valores/select', { params: { tipo } })
    .then(r => { const items = r.data.data || []; cache.set(tipo, { items, promesa }); (oyentes.get(tipo) || []).forEach(f => f(items)); return items })
    .catch(() => [])
  cache.set(tipo, { items: c?.items || [], promesa })
  return promesa
}

const CSS = `
.li-wrap { position:relative; }
.li-wrap .li-input { width:100%; box-sizing:border-box; padding:9px 34px 9px 12px; border:1.5px solid #E2E5F0; border-radius:10px; font-size:13px;
  outline:none; font-family:inherit; background:#fff; color:#111827; }
.li-wrap .li-input:focus { border-color:#8B5CF6; box-shadow:0 0 0 3px rgba(139,92,246,.12); }
.li-caret { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#9CA3AF; pointer-events:none; }
.li-pop { position:fixed; z-index:3000; background:#fff; border:1.5px solid #E5E7EB; border-radius:12px; box-shadow:0 14px 40px rgba(15,16,53,.18);
  overflow:hidden; display:flex; flex-direction:column; }
.li-lista { overflow-y:auto; max-height:240px; padding:4px; }
.li-op { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:13px; color:#1F2937; }
.li-op.act { background:#F3F0FF; }
.li-op small { display:block; font-size:11px; color:#9CA3AF; }
.li-vacio { padding:12px; font-size:12.5px; color:#9CA3AF; text-align:center; }
.li-add { display:flex; align-items:center; gap:8px; padding:10px 12px; border-top:1px solid #F1F2F8; font-size:12.5px; font-weight:700; color:#6D28D9; cursor:pointer; background:#FBFAFF; }
.li-add.act { background:#EDE9FE; }
.li-pie { padding:6px 12px; font-size:10.5px; color:#9CA3AF; border-top:1px solid #F5F5F9; }
.li-nota { font-size:11px; margin-top:4px; display:flex; align-items:center; gap:6px; color:#B45309; }
.li-nota button { border:none; background:none; color:#6D28D9; font-weight:800; cursor:pointer; font-size:11px; padding:0; font-family:inherit; }
`

export default function ListaInteligente({ tipo, titulo = 'la lista', value = '', onChange, onElegir, placeholder, cap = 'lugar', disabled }) {
  const [items, setItems] = useState(() => cache.get(tipo)?.items || [])
  const [abierta, setAbierta] = useState(false)
  const [activo, setActivo] = useState(0)
  const [creando, setCreando] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const texto = String(value || '')

  useEffect(() => {
    const f = l => setItems(l)
    if (!oyentes.has(tipo)) oyentes.set(tipo, new Set())
    oyentes.get(tipo).add(f)
    cargarTipo(tipo).then(setItems)
    return () => oyentes.get(tipo)?.delete(f)
  }, [tipo])

  const exacto = items.find(i => sinTildes(i.etiqueta) === sinTildes(texto.trim()))
  const lista = useMemo(() => {
    const q = texto.trim()
    // Con el valor ya elegido se muestra toda la lista (para cambiarlo)
    const base = !q || exacto ? items : items.filter(i => coincide(q, i.etiqueta, i.detalle))
    const ini = sinTildes(q)
    return [...base].sort((a, b) => (sinTildes(b.etiqueta).startsWith(ini) - sinTildes(a.etiqueta).startsWith(ini))).slice(0, 80)
  }, [items, texto, exacto])
  const puedeAgregar = texto.trim().length >= 2 && !exacto
  const total = lista.length + (puedeAgregar ? 1 : 0)

  // Posición fija bajo el campo (las tarjetas recortan lo que sobresale)
  const ubicar = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const abajo = window.innerHeight - r.bottom
    setPos(abajo < 300 && r.top > abajo
      ? { left:r.left, width:r.width, bottom: window.innerHeight - r.top + 4 }
      : { left:r.left, width:r.width, top: r.bottom + 4 })
  }
  useLayoutEffect(() => {
    if (!abierta) return
    ubicar()
    const f = () => ubicar()
    window.addEventListener('scroll', f, true); window.addEventListener('resize', f)
    return () => { window.removeEventListener('scroll', f, true); window.removeEventListener('resize', f) }
  }, [abierta])

  const elegir = it => {
    onChange(it.etiqueta)
    onElegir?.(it)
    setAbierta(false)
  }
  const agregar = async () => {
    const etiqueta = texto.trim()
    if (etiqueta.length < 2) return
    setCreando(true)
    try {
      const r = await api.post('/listas-valores', { tipo, etiqueta })
      await cargarTipo(tipo, true)
      elegir(r.data.data)
      toast.success(r.data.existente ? `"${r.data.data.etiqueta}" ya estaba en la lista` : `"${r.data.data.etiqueta}" se agregó a ${titulo}`)
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo agregar a la lista') }
    finally { setCreando(false) }
  }

  const tecla = e => {
    if (!abierta && ['ArrowDown', 'ArrowUp'].includes(e.key)) { setAbierta(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, total - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && abierta && total) {
      e.preventDefault()
      if (activo < lista.length) elegir(lista[activo]); else agregar()
    } else if (e.key === 'Escape' && abierta) { e.stopPropagation(); setAbierta(false) }
  }

  return (
    <div className="li-wrap" ref={ref}>
      <style>{CSS}</style>
      <input className="li-input" value={texto} disabled={disabled} placeholder={placeholder || `Buscar o escribir…`} data-cap={cap}
        onChange={e => { onChange(e.target.value); setAbierta(true); setActivo(0) }}
        onFocus={() => { setAbierta(true); setActivo(0) }}
        onBlur={() => setTimeout(() => setAbierta(false), 120)}
        onKeyDown={tecla} autoComplete="off"/>
      <ChevronDown size={15} className="li-caret"/>
      {texto.trim() && !exacto && !abierta && items.length > 0 && (
        <div className="li-nota">No está en la lista · <button type="button" onMouseDown={e => e.preventDefault()} onClick={agregar}>Agregar a {titulo}</button></div>
      )}
      {abierta && pos && createPortal(
        <div className="li-pop" style={pos} onMouseDown={e => e.preventDefault()}>
          <div className="li-lista">
            {lista.length ? lista.map((it, i) => (
              <div key={it.id} className={`li-op${i === activo ? ' act' : ''}`} onMouseEnter={() => setActivo(i)} onClick={() => elegir(it)}>
                <span style={{ flex:1, minWidth:0 }}>{it.etiqueta}{it.detalle && <small>{it.detalle}</small>}</span>
                {exacto?.id === it.id && <Check size={14} color="#059669"/>}
              </div>
            )) : <div className="li-vacio">{items.length ? 'Sin coincidencias' : 'La lista está vacía'}</div>}
          </div>
          {puedeAgregar && (
            <div className={`li-add${activo === lista.length ? ' act' : ''}`} onMouseEnter={() => setActivo(lista.length)} onClick={agregar}>
              {creando ? <Loader2 size={14} className="spin"/> : <Plus size={14}/>} Agregar «{texto.trim()}» a {titulo}
            </div>
          )}
          <div className="li-pie">↑↓ para moverse · Enter para elegir · se administra en Configuración → Listas de valores</div>
        </div>, document.body)}
    </div>
  )
}
