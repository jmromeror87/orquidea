/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios — personal asignado al servicio            ║
 * ║  Archivo         : components/servicios/PersonalServicio.jsx            ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Quién atendió el servicio, agrupado por función (dama de cortejo, cafetería,
 * última noche, conductor…), con su turno y lo que se le paga. Se puede asignar
 * personal de la funeraria (terceros con rol Empleado, que no son usuarios del
 * sistema) o usuarios del sistema. Abajo, el total a pagar al personal.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Plus, Trash2, Pencil, Check, X, Search, UserPlus, ExternalLink, Loader2, Clock, Wallet, ChevronLeft, ShieldCheck } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const CSS = `
.ps-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:16px; }
.ps-kpi { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:12px; }
.ps-kpi-ic { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ps-kpi small { display:block; font-size:10.5px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:#6B7280; }
.ps-kpi b { font-size:19px; font-weight:900; color:#111827; font-variant-numeric:tabular-nums; }
.ps-grupo { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; margin-bottom:12px; overflow:hidden; }
.ps-grupo-h { display:flex; align-items:center; gap:10px; padding:10px 14px; background:#FAFAFF; border-bottom:1px solid #ECEDF8; }
.ps-grupo-h b { font-size:13px; color:#1F2937; }
.ps-grupo-h .ps-sub { margin-left:auto; font-size:12px; font-weight:800; color:#065F46; font-variant-numeric:tabular-nums; }
.ps-fila { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 110px 70px; gap:12px; align-items:center; padding:10px 14px; border-bottom:1px solid #F3F4F6; }
.ps-fila:last-child { border-bottom:none; }
.ps-av { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12.5px; color:#fff; flex-shrink:0; }
.ps-nom { font-weight:700; font-size:13px; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ps-link { background:none; border:none; padding:0; font:inherit; color:#111827; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; max-width:100%; }
.ps-link:hover { color:#6D28D9; text-decoration:underline; }
.ps-meta { font-size:11px; color:#9CA3AF; margin-top:1px; }
.ps-tag { display:inline-block; font-size:10px; font-weight:800; padding:1px 7px; border-radius:6px; margin-left:6px; vertical-align:middle; }
.ps-turno { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:#4338CA; background:#EEF2FF; border-radius:8px; padding:3px 9px; max-width:100%; }
.ps-valor { text-align:right; font-weight:900; color:#065F46; font-variant-numeric:tabular-nums; font-size:13.5px; }
.ps-acc { display:flex; gap:5px; justify-content:flex-end; }
.ps-ib { width:28px; height:28px; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#6B7280; }
.ps-ib:hover { border-color:#C4B5FD; color:#6D28D9; }
.ps-ib.del:hover { border-color:#FECACA; color:#DC2626; background:#FEF2F2; }
.ps-in { width:100%; box-sizing:border-box; padding:7px 10px; border:1.5px solid #E5E7EB; border-radius:9px; font-size:12.5px; font-family:inherit; outline:none; }
.ps-in:focus { border-color:#8B5CF6; box-shadow:0 0 0 3px #EDE9FE; }
.ps-total { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; border-radius:14px; background:linear-gradient(135deg,#ECFDF5,#D1FAE5); border:1.5px solid #A7F3D0; }
.ps-total small { font-size:11px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#047857; }
.ps-total b { font-size:22px; font-weight:900; color:#065F46; font-variant-numeric:tabular-nums; }
.ps-panel { background:#fff; border:1.5px solid #DDD6FE; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:0 8px 24px rgba(109,40,217,.08); }
.ps-tabs { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
.ps-tab { border:1.5px solid #E5E7EB; background:#fff; color:#4B5563; border-radius:20px; padding:5px 13px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
.ps-tab.on { background:#F5F3FF; border-color:#C4B5FD; color:#6D28D9; }
.ps-pers { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:8px; max-height:300px; overflow:auto; padding:2px; }
.ps-per { display:flex; align-items:center; gap:10px; padding:9px 11px; border:1.5px solid #E5E7EB; border-radius:11px; background:#fff; cursor:pointer; text-align:left; font-family:inherit; }
.ps-per:hover { border-color:#8B5CF6; box-shadow:0 0 0 3px #EDE9FE; }
.ps-roles { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; margin-bottom:12px; }
.ps-rol { border:1.5px solid #E5E7EB; background:#fff; border-radius:12px; padding:10px; cursor:pointer; text-align:left; font-family:inherit; }
.ps-rol.on { border-color:#8B5CF6; box-shadow:0 0 0 3px #EDE9FE; background:#FAF5FF; }
.ps-rol b { display:block; font-size:12.5px; color:#1F2937; }
.ps-rol span { font-size:11px; color:#6B7280; }
.ps-btn { display:inline-flex; align-items:center; gap:6px; border-radius:10px; padding:8px 14px; font-size:12.5px; font-weight:800; cursor:pointer; font-family:inherit; border:1.5px solid transparent; }
.ps-btn.pri { background:linear-gradient(135deg,#6D28D9,#8B5CF6); color:#fff; }
.ps-btn.pri:disabled { opacity:.5; cursor:default; }
.ps-btn.sec { background:#fff; border-color:#E5E7EB; color:#374151; }
.ps-vacio { text-align:center; padding:44px 20px; background:#FAFAFA; border-radius:14px; border:1.5px dashed #E5E7EB; color:#6B7280; font-size:13px; }
@media (max-width:720px) { .ps-fila { grid-template-columns:1fr 1fr; } }
`

const pesos = n => '$' + Math.round(+n || 0).toLocaleString('es-CO')
const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
const COLORES = ['#6D28D9','#0891B2','#DB2777','#059669','#D97706','#2563EB','#7C3AED','#DC2626']
const colorDe = s => COLORES[[...String(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length]
const abrirTercero = doc => window.open(`/terceros?buscar=${encodeURIComponent(doc)}`, '_blank', 'noopener')
const TD_CC = '04368d7a-71ce-4b35-9e7d-b5da4b638b09'

export default function PersonalServicio({ servicioId, esEditor }) {
  const [lista, setLista] = useState([])
  const [roles, setRoles] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [panel, setPanel] = useState(null)          // null | 'persona' | 'detalle' | 'nueva'
  const [fuente, setFuente] = useState('EXTERNO')   // EXTERNO | USUARIO
  const [q, setQ] = useState('')
  const [externos, setExternos] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [persona, setPersona] = useState(null)      // { tipo, id, nombre, documento }
  const [rol, setRol] = useState(null)
  const [turno, setTurno] = useState('')
  const [valor, setValor] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editId, setEditId] = useState(null)
  const [edit, setEdit] = useState({ turno:'', valor:'' })
  const [nueva, setNueva] = useState({ nombres:'', apellidos:'', documento:'', telefono:'' })

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [p, r, u] = await Promise.all([
        api.get(`/servicios/${servicioId}/personal`),
        api.get('/roles-personal/select'),
        api.get('/servicios/operadores'),
      ])
      setLista(p.data.data || []); setRoles(r.data.data || []); setUsuarios(u.data.data || [])
    } catch { toast.error('No se pudo cargar el personal') }
    finally { setCargando(false) }
  }, [servicioId])
  useEffect(() => { cargar() }, [cargar])

  // Personal de la funeraria: terceros con rol Empleado (búsqueda en el servidor)
  useEffect(() => {
    if (panel !== 'persona' || fuente !== 'EXTERNO') return
    let vivo = true
    setBuscando(true)
    const t = setTimeout(() => {
      api.get('/terceros', { params: { rol: 'EMPLEADO', q: q.trim() || undefined, limit: 60, page: 1 } })
        .then(r => { if (vivo) setExternos(r.data.data || []) })
        .catch(() => {})
        .finally(() => { if (vivo) setBuscando(false) })
    }, 250)
    return () => { vivo = false; clearTimeout(t) }
  }, [panel, fuente, q])

  const grupos = useMemo(() => {
    const g = {}
    for (const p of lista) (g[p.rol_servicio] ||= []).push(p)
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]))
  }, [lista])
  const total = lista.reduce((s, p) => s + (+p.valor || 0), 0)
  const personas = new Set(lista.map(p => p.tercero_id || p.usuario_id)).size

  const cerrar = () => { setPanel(null); setPersona(null); setRol(null); setTurno(''); setValor(''); setNotas(''); setQ('') }
  const elegirPersona = p => { setPersona(p); setPanel('detalle') }
  const elegirRol = r => { setRol(r); if (valor === '' || valor === String(rol?.costo_interno ?? '')) setValor(String(Math.round(+r.costo_interno || 0))) }

  const guardar = async () => {
    if (!persona || !rol) return
    setGuardando(true)
    try {
      await api.post(`/servicios/${servicioId}/personal`, {
        [persona.tipo === 'USUARIO' ? 'usuario_id' : 'tercero_id']: persona.id,
        rol_servicio: rol.etiqueta, turno: turno || null, valor: valor === '' ? 0 : Number(valor), notas: notas || null,
      })
      toast.success(`${persona.nombre} asignado como ${rol.etiqueta}`)
      cerrar(); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo asignar') }
    finally { setGuardando(false) }
  }

  const crearPersona = async () => {
    const { nombres, apellidos, documento, telefono } = nueva
    if (!nombres.trim() || !apellidos.trim() || !/^\d{6,11}$/.test(documento.trim()))
      return toast.error('Escriba nombres, apellidos y una cédula válida (solo números)')
    setGuardando(true)
    try {
      const r = await api.post('/terceros', { tipo_documento_id: TD_CC, numero_documento: documento.trim(), tipo_persona: 'NATURAL',
        nombres: nombres.trim(), apellidos: apellidos.trim(), telefono: telefono.trim() || null, roles: ['EMPLEADO'] })
      const t = r.data.data
      toast.success('Persona registrada como personal de la funeraria')
      setNueva({ nombres:'', apellidos:'', documento:'', telefono:'' })
      elegirPersona({ tipo:'EXTERNO', id: t.id, nombre: `${t.nombres} ${t.apellidos}`, documento: t.numero_documento })
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo registrar') }
    finally { setGuardando(false) }
  }

  const guardarEdicion = async p => {
    try {
      await api.patch(`/servicios/${servicioId}/personal/${p.id}`, { turno: edit.turno, valor: edit.valor === '' ? 0 : Number(edit.valor), notas: p.notas })
      toast.success('Turno y valor actualizados'); setEditId(null); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo actualizar') }
  }
  const quitar = async p => {
    if (!window.confirm(`¿Quitar a ${p.nombre} (${p.rol_servicio}) de este servicio?`)) return
    try { await api.delete(`/servicios/${servicioId}/personal/${p.id}`); toast.success('Personal retirado del servicio'); cargar() }
    catch { toast.error('No se pudo retirar') }
  }

  if (cargando) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Loader2 size={24} className="spin" color="#8B5CF6"/></div>

  return (
    <div>
      <style>{CSS}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:'#111827' }}>Personal del servicio</div>
          <div style={{ fontSize:12, color:'#6B7280' }}>Quién atendió el servicio, en qué turno y cuánto se le paga.</div>
        </div>
        {esEditor && !panel && <button className="ps-btn pri" onClick={() => setPanel('persona')}><Plus size={14}/> Asignar personal</button>}
      </div>

      <div className="ps-kpis">
        <div className="ps-kpi"><div className="ps-kpi-ic" style={{ background:'#F5F3FF', color:'#6D28D9' }}><Users size={18}/></div><div><small>Personas</small><b>{personas}</b></div></div>
        <div className="ps-kpi"><div className="ps-kpi-ic" style={{ background:'#EEF2FF', color:'#4338CA' }}><ShieldCheck size={18}/></div><div><small>Funciones</small><b>{lista.length}</b></div></div>
        <div className="ps-kpi"><div className="ps-kpi-ic" style={{ background:'#ECFDF5', color:'#047857' }}><Wallet size={18}/></div><div><small>A pagar al personal</small><b>{pesos(total)}</b></div></div>
      </div>

      {panel && (
        <div className="ps-panel">
          {panel === 'persona' && (<>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <b style={{ fontSize:14 }}>¿A quién asigna?</b>
              <button className="ps-ib" style={{ marginLeft:'auto' }} title="Cerrar" onClick={cerrar}><X size={14}/></button>
            </div>
            <div className="ps-tabs">
              <button className={`ps-tab${fuente === 'EXTERNO' ? ' on' : ''}`} onClick={() => setFuente('EXTERNO')}>Personal de la funeraria</button>
              <button className={`ps-tab${fuente === 'USUARIO' ? ' on' : ''}`} onClick={() => setFuente('USUARIO')}>Usuarios del sistema</button>
              {fuente === 'EXTERNO' && <button className="ps-tab" style={{ marginLeft:'auto' }} onClick={() => setPanel('nueva')}><UserPlus size={12} style={{ verticalAlign:'-2px' }}/> Registrar persona nueva</button>}
            </div>
            {fuente === 'EXTERNO' && (
              <div style={{ position:'relative', marginBottom:10 }}>
                <Search size={14} style={{ position:'absolute', left:10, top:9, color:'#9CA3AF' }}/>
                <input className="ps-in" style={{ paddingLeft:30 }} placeholder="Buscar por nombre o documento…" value={q} onChange={e => setQ(e.target.value)} autoFocus/>
              </div>
            )}
            <div className="ps-pers">
              {fuente === 'EXTERNO' && (buscando ? <div style={{ color:'#9CA3AF', fontSize:12.5 }}>Buscando…</div>
                : externos.length === 0 ? <div style={{ color:'#9CA3AF', fontSize:12.5 }}>Nadie coincide. Puede registrar a la persona como nueva.</div>
                : externos.map(t => {
                  const nombre = t.razon_social || `${t.nombres || ''} ${t.apellidos || ''}`.trim()
                  return (
                    <button key={t.id} className="ps-per" onClick={() => elegirPersona({ tipo:'EXTERNO', id:t.id, nombre, documento:t.numero_documento })}>
                      <div className="ps-av" style={{ background:colorDe(nombre) }}>{ini(nombre)}</div>
                      <div style={{ minWidth:0 }}><div className="ps-nom">{nombre}</div><div className="ps-meta">{t.numero_documento ? `CC ${t.numero_documento}` : 'Sin documento'}{t.telefono ? ` · ${t.telefono}` : ''}</div></div>
                    </button>
                  )
                }))}
              {fuente === 'USUARIO' && usuarios.map(u => (
                <button key={u.id} className="ps-per" onClick={() => elegirPersona({ tipo:'USUARIO', id:u.id, nombre:u.nombre })}>
                  <div className="ps-av" style={{ background:colorDe(u.nombre) }}>{ini(u.nombre)}</div>
                  <div style={{ minWidth:0 }}><div className="ps-nom">{u.nombre}</div><div className="ps-meta">{u.email}</div></div>
                </button>
              ))}
            </div>
          </>)}

          {panel === 'nueva' && (<>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <button className="ps-ib" onClick={() => setPanel('persona')} title="Volver"><ChevronLeft size={14}/></button>
              <b style={{ fontSize:14 }}>Registrar persona del equipo</b>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:12 }}>
              <input className="ps-in" placeholder="Nombres *" value={nueva.nombres} onChange={e => setNueva(n => ({ ...n, nombres:e.target.value }))}/>
              <input className="ps-in" placeholder="Apellidos *" value={nueva.apellidos} onChange={e => setNueva(n => ({ ...n, apellidos:e.target.value }))}/>
              <input className="ps-in" placeholder="Cédula *" inputMode="numeric" value={nueva.documento} onChange={e => setNueva(n => ({ ...n, documento:e.target.value.replace(/\D/g, '') }))}/>
              <input className="ps-in" placeholder="Teléfono" inputMode="tel" value={nueva.telefono} onChange={e => setNueva(n => ({ ...n, telefono:e.target.value }))}/>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="ps-btn sec" onClick={() => setPanel('persona')}>Cancelar</button>
              <button className="ps-btn pri" onClick={crearPersona} disabled={guardando}>{guardando ? <Loader2 size={14} className="spin"/> : <UserPlus size={14}/>} Registrar y continuar</button>
            </div>
          </>)}

          {panel === 'detalle' && persona && (<>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <button className="ps-ib" onClick={() => setPanel('persona')} title="Cambiar persona"><ChevronLeft size={14}/></button>
              <div className="ps-av" style={{ background:colorDe(persona.nombre) }}>{ini(persona.nombre)}</div>
              <div><b style={{ fontSize:14 }}>{persona.nombre}</b><div className="ps-meta">Elija su función, el turno y el valor que se le paga</div></div>
            </div>
            <div className="ps-roles">
              {roles.map(r => (
                <button key={r.id} className={`ps-rol${rol?.id === r.id ? ' on' : ''}`} onClick={() => elegirRol(r)}>
                  <b>{r.etiqueta}</b><span>{+r.costo_interno ? pesos(r.costo_interno) : 'Sin valor por defecto'}</span>
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:12 }}>
              <input className="ps-in" placeholder="Turno (ej. Dos horas, 10 p. m. a 6 a. m.)" value={turno} onChange={e => setTurno(e.target.value)}/>
              <input className="ps-in" placeholder="Valor a pagar" inputMode="numeric" value={valor === '' ? '' : Number(valor).toLocaleString('es-CO')} onChange={e => setValor(e.target.value.replace(/\D/g, ''))}/>
              <input className="ps-in" placeholder="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)}/>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="ps-btn sec" onClick={cerrar}>Cancelar</button>
              <button className="ps-btn pri" onClick={guardar} disabled={!rol || guardando}>{guardando ? <Loader2 size={14} className="spin"/> : <Check size={14}/>} Asignar</button>
            </div>
          </>)}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="ps-vacio">
          <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
          <b style={{ color:'#374151' }}>Sin personal asignado</b>
          <div style={{ marginTop:4 }}>Asigne damas de cortejo, auxiliares, conductores y demás personal con su turno y valor.</div>
        </div>
      ) : (<>
        {grupos.map(([nombreRol, ps]) => (
          <div key={nombreRol} className="ps-grupo">
            <div className="ps-grupo-h">
              <b>{nombreRol}</b><span style={{ fontSize:12, color:'#6B7280' }}>{ps.length} {ps.length === 1 ? 'persona' : 'personas'}</span>
              <span className="ps-sub">{pesos(ps.reduce((s, p) => s + (+p.valor || 0), 0))}</span>
            </div>
            {ps.map(p => (
              <div key={p.id} className="ps-fila">
                <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                  <div className="ps-av" style={{ background:colorDe(p.nombre) }}>{ini(p.nombre)}</div>
                  <div style={{ minWidth:0 }}>
                    <div className="ps-nom">
                      {p.tipo === 'EXTERNO' && p.documento
                        ? <button className="ps-link" title="Abrir su ficha en Terceros" onClick={() => abrirTercero(p.documento)}>{p.nombre}<ExternalLink size={11}/></button>
                        : p.nombre}
                      <span className="ps-tag" style={p.tipo === 'USUARIO' ? { background:'#DBEAFE', color:'#1D4ED8' } : { background:'#F3E8FF', color:'#7E22CE' }}>{p.tipo === 'USUARIO' ? 'Usuario' : 'Personal'}</span>
                      {p.migrado_pisco && <span className="ps-tag" style={{ background:'#FEF3C7', color:'#B45309' }}>Pisco</span>}
                    </div>
                    <div className="ps-meta">{p.documento ? `CC ${p.documento}` : p.email || 'Sin documento'}{p.telefono ? ` · ${p.telefono}` : ''}{p.notas ? ` · ${p.notas}` : ''}</div>
                  </div>
                </div>
                {editId === p.id ? (<>
                  <input className="ps-in" value={edit.turno} placeholder="Turno" onChange={e => setEdit(x => ({ ...x, turno:e.target.value }))}/>
                  <input className="ps-in" style={{ textAlign:'right' }} inputMode="numeric" value={edit.valor === '' ? '' : Number(edit.valor).toLocaleString('es-CO')} onChange={e => setEdit(x => ({ ...x, valor:e.target.value.replace(/\D/g, '') }))}/>
                  <div className="ps-acc">
                    <button className="ps-ib" title="Guardar" onClick={() => guardarEdicion(p)}><Check size={13}/></button>
                    <button className="ps-ib" title="Cancelar" onClick={() => setEditId(null)}><X size={13}/></button>
                  </div>
                </>) : (<>
                  <div style={{ minWidth:0 }}>{p.turno ? <span className="ps-turno"><Clock size={11}/><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.turno}</span></span> : <span style={{ fontSize:12, color:'#D1D5DB' }}>Sin turno</span>}</div>
                  <div className="ps-valor">{pesos(p.valor)}</div>
                  <div className="ps-acc">
                    {esEditor && <button className="ps-ib" title="Editar turno y valor" onClick={() => { setEditId(p.id); setEdit({ turno: p.turno || '', valor: String(Math.round(+p.valor || 0)) }) }}><Pencil size={13}/></button>}
                    {esEditor && <button className="ps-ib del" title="Quitar del servicio" onClick={() => quitar(p)}><Trash2 size={13}/></button>}
                  </div>
                </>)}
              </div>
            ))}
          </div>
        ))}
        <div className="ps-total">
          <div><small>Total a pagar al personal</small><div style={{ fontSize:12, color:'#047857' }}>{personas} {personas === 1 ? 'persona' : 'personas'} · {lista.length} {lista.length === 1 ? 'función' : 'funciones'}</div></div>
          <b>{pesos(total)}</b>
        </div>
      </>)}
    </div>
  )
}
