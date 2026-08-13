/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Convenios                                       ║
 * ║  Archivo         : ConveniosPage.jsx                                ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Handshake, Plus, X, Loader2, Edit2, ChevronDown, ChevronUp,
  Trash2, RefreshCw, ShieldCheck, Building2, Landmark, Briefcase, HelpCircle,
  Power,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { useAuthStore } from '../../store/auth.store.js'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)

const TIPO_META = {
  EPS:               { label:'EPS',                Icon: ShieldCheck, color:'#0891B2', bg:'#CFFAFE' },
  ASEGURADORA:       { label:'Aseguradora',         Icon: Building2,   color:'#7C3AED', bg:'#F5F3FF' },
  ALCALDIA:          { label:'Alcaldía',            Icon: Landmark,    color:'#059669', bg:'#D1FAE5' },
  EMPRESA:           { label:'Empresa',             Icon: Briefcase,   color:'#F59E0B', bg:'#FEF3C7' },
  CAJA_COMPENSACION: { label:'Caja de compensación',Icon: Handshake,   color:'#DB2777', bg:'#FCE7F3' },
  OTRO:              { label:'Otro',                Icon: HelpCircle,  color:'#6B7280', bg:'#F3F4F6' },
}

const BLANK = {
  nombre:'', tipo_entidad:'OTRO', nit:'', contacto_nombre:'', contacto_telefono:'', contacto_email:'',
  cobertura_tipo:'PORCENTAJE', cobertura_valor:100, tope_maximo:'', absorbe_resto:'FAMILIA', observaciones:'',
  sede_id:'',
}
const ABSORBE_META = {
  FAMILIA:   { label:'La familia paga el resto', short:'Familia' },
  FUNERARIA: { label:'La funeraria absorbe el resto (familia no paga)', short:'Funeraria' },
}

const CSS = `
  .cv-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
  .cv-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px; flex-shrink:0;
    display:flex; align-items:center; justify-content:space-between; }
  .cv-head-icon { width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#0891B2,#0E7490);
    display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(8,145,178,.3); flex-shrink:0; }
  .cv-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
  .cv-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .cv-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px;
    font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .15s; }
  .cv-btn-primary { background:linear-gradient(135deg,#0891B2,#0E7490); color:#fff; box-shadow:0 3px 10px rgba(8,145,178,.3); }
  .cv-btn-primary:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(8,145,178,.4); }
  .cv-btn-ghost { background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0; }
  .cv-btn-ghost:hover { background:#ECEDF8; }
  .cv-list { flex:1; overflow-y:auto; padding:20px 24px; }
  .cv-card { background:#fff; border:1.5px solid #ECEDF8; border-radius:16px; margin-bottom:14px; overflow:hidden; }
  .cv-card-head { display:flex; align-items:center; gap:12px; padding:16px 18px; cursor:pointer; }
  .cv-card-head:hover { background:#FAFBFF; }
  .cv-card-body { padding:0 18px 18px; border-top:1px solid #F4F5FA; }
  .cv-spin { animation:cv-spin .7s linear infinite; }
  @keyframes cv-spin { to{transform:rotate(360deg)} }
  .cv-overlay { position:fixed; inset:0; background:rgba(15,16,53,.55); backdrop-filter:blur(4px);
    z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .cv-modal { background:#fff; border-radius:20px; width:100%; max-width:560px;
    box-shadow:0 24px 60px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:90vh; overflow:hidden; }
  .cv-mhead { padding:22px 24px 18px; border-bottom:1.5px solid #ECEDF8;
    display:flex; align-items:center; justify-content:space-between; }
  .cv-mtitle { font-size:17px; font-weight:900; color:#0F1035; }
  .cv-msub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .cv-mclose { width:32px; height:32px; border-radius:10px; border:1.5px solid #ECEDF8;
    background:#F7F8FC; display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; flex-shrink:0; transition:all .15s; }
  .cv-mclose:hover { background:#FEE2E2; border-color:#FECACA; color:#EF4444; }
  .cv-mbody { padding:22px 24px; overflow-y:auto; overflow-x:hidden; flex:1; }
  .cv-grid2 { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; }
  .cv-field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; min-width:0; }
  .cv-field label { font-size:11.5px; font-weight:700; color:#374151; }
  .cv-field input, .cv-field select, .cv-field textarea {
    padding:9px 12px; border:1.5px solid #E2E5F0; border-radius:10px; font-size:13px;
    outline:none; background:#FAFBFF; color:#0F1035; transition:all .15s; font-family:inherit;
    width:100%; box-sizing:border-box; }
  .cv-field input:focus, .cv-field select:focus, .cv-field textarea:focus {
    border-color:#0891B2; box-shadow:0 0 0 3px rgba(8,145,178,.1); background:#fff; }
  .cv-req { color:#EF4444; }
  .cv-empty { display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:60px 20px; color:#9CA3AF; gap:10px; }
  .cv-empty p { font-size:15px; font-weight:800; color:#374151; margin:0; }
  @media (max-width:560px) {
    .cv-grid2 { grid-template-columns:1fr; }
    .cv-modal { max-width:100% !important; }
  }
`

function TipoBadge({ tipo }) {
  const m = TIPO_META[tipo] || TIPO_META.OTRO
  const { Icon } = m
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:m.bg, color:m.color,
      borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
      <Icon size={11}/> {m.label}
    </span>
  )
}

function fmtCobertura(tipo, valor) {
  return tipo === 'PORCENTAJE' ? `${(+valor).toFixed(0)}%` : fmt(valor)
}

// ── Modal crear/editar convenio ───────────────────────────────────────────
function ModalConvenio({ convenio, onClose, onSaved }) {
  const usuario = useAuthStore(s => s.usuario)
  const esAdmin = ['superadmin', 'administrador'].includes(usuario?.rol)

  const [form, setForm] = useState(convenio ? {
    nombre: convenio.nombre, tipo_entidad: convenio.tipo_entidad, nit: convenio.nit || '',
    contacto_nombre: convenio.contacto_nombre || '', contacto_telefono: convenio.contacto_telefono || '',
    contacto_email: convenio.contacto_email || '', cobertura_tipo: convenio.cobertura_tipo,
    cobertura_valor: convenio.cobertura_valor, tope_maximo: convenio.tope_maximo ?? '',
    absorbe_resto: convenio.absorbe_resto || 'FAMILIA',
    observaciones: convenio.observaciones || '',
    sede_id: convenio.sede_id || '',
  } : { ...BLANK, sede_id: usuario?.sede_id || '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [sedes, setSedes] = useState([])

  useEffect(() => {
    if (esAdmin) api.get('/usuarios/sedes').then(r => setSedes(r.data?.data || [])).catch(() => {})
  }, [esAdmin])

  const guardar = async () => {
    setErr('')
    if (!form.nombre.trim()) return setErr('El nombre es obligatorio')
    if (esAdmin && !form.sede_id) return setErr('Selecciona a qué sede pertenece este convenio')
    setSaving(true)
    try {
      if (convenio) await api.put(`/convenios/${convenio.id}`, form)
      else          await api.post('/convenios', form)
      toast.success(convenio ? 'Convenio actualizado con éxito' : 'Convenio creado con éxito')
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al guardar'
      setErr(msg); toast.error(msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="cv-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cv-modal">
        <div className="cv-mhead">
          <div>
            <div className="cv-mtitle">{convenio ? 'Editar convenio' : 'Nuevo convenio'}</div>
            <div className="cv-msub">EPS, aseguradora, alcaldía, empresa u otra entidad externa</div>
          </div>
          <button className="cv-mclose" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="cv-mbody">
          {err && <div style={{ background:'#FEE2E2', color:'#DC2626', border:'1px solid #FECACA',
            borderRadius:10, padding:'10px 14px', fontSize:12.5, marginBottom:16 }}>{err}</div>}

          <div className="cv-field">
            <label>Nombre de la entidad <span className="cv-req">*</span></label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre:e.target.value}))}
              placeholder="Ej: Alcaldía de Ábrego, Nueva EPS…"/>
          </div>

          <div className="cv-grid2">
            <div className="cv-field">
              <label>Tipo de entidad</label>
              <select value={form.tipo_entidad} onChange={e => setForm(p => ({...p, tipo_entidad:e.target.value}))}>
                {Object.entries(TIPO_META).map(([v,m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </div>
            <div className="cv-field">
              <label>NIT</label>
              <input value={form.nit} onChange={e => setForm(p => ({...p, nit:e.target.value}))} placeholder="900123456-7"/>
            </div>
          </div>

          {esAdmin && (
            <div className="cv-field">
              <label>Sede <span className="cv-req">*</span></label>
              <select value={form.sede_id} onChange={e => setForm(p => ({...p, sede_id:e.target.value}))}>
                <option value="">Selecciona una sede…</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>
                Este convenio solo será visible y usable para los usuarios asignados a esta sede.
              </div>
            </div>
          )}

          <div className="cv-grid2">
            <div className="cv-field">
              <label>Contacto</label>
              <input value={form.contacto_nombre} onChange={e => setForm(p => ({...p, contacto_nombre:e.target.value}))}/>
            </div>
            <div className="cv-field">
              <label>Teléfono</label>
              <input value={form.contacto_telefono} onChange={e => setForm(p => ({...p, contacto_telefono:e.target.value}))}/>
            </div>
          </div>

          <div className="cv-field">
            <label>Email de contacto</label>
            <input value={form.contacto_email} onChange={e => setForm(p => ({...p, contacto_email:e.target.value}))}/>
          </div>

          <div className="cv-grid2">
            <div className="cv-field">
              <label>Cobertura por defecto</label>
              <select value={form.cobertura_tipo} onChange={e => setForm(p => ({...p, cobertura_tipo:e.target.value}))}>
                <option value="PORCENTAJE">Porcentaje del servicio</option>
                <option value="MONTO_FIJO">Monto fijo en pesos</option>
              </select>
            </div>
            <div className="cv-field">
              <label>Valor {form.cobertura_tipo === 'PORCENTAJE' ? '(%)' : '($)'}</label>
              <input type="number" min="0" max={form.cobertura_tipo === 'PORCENTAJE' ? 100 : undefined}
                value={form.cobertura_valor} onChange={e => setForm(p => ({...p, cobertura_valor:e.target.value}))}/>
            </div>
          </div>
          <div style={{ fontSize:11, color:'#9CA3AF', marginTop:-8, marginBottom:14 }}>
            Se usa si el servicio no especifica un tipo de autorización con su propia cobertura.
          </div>

          <div className="cv-field">
            <label>Tope máximo de cobertura <span style={{color:'#9CA3AF',fontWeight:400}}>(opcional, en $)</span></label>
            <input type="number" min="0" value={form.tope_maximo}
              onChange={e => setForm(p => ({...p, tope_maximo:e.target.value}))}
              placeholder="Ej: 3000000 — déjelo vacío si no hay límite"/>
            <div style={{ fontSize:11, color:'#9CA3AF' }}>
              Aunque la cobertura sea 100% o un monto alto, nunca cubrirá más de este tope. Protege contra servicios
              inflados que intenten hacer pasar todo el costo por el convenio.
            </div>
          </div>

          <div className="cv-field">
            <label>¿Quién asume lo que el convenio NO cubre?</label>
            <select value={form.absorbe_resto} onChange={e => setForm(p => ({...p, absorbe_resto:e.target.value}))}>
              <option value="FAMILIA">{ABSORBE_META.FAMILIA.label}</option>
              <option value="FUNERARIA">{ABSORBE_META.FUNERARIA.label}</option>
            </select>
            <div style={{ fontSize:11, color:'#9CA3AF' }}>
              Ej: si el convenio cubre 50% y esto está en "Funeraria", el otro 50% lo absorbe la funeraria y la
              familia no paga nada. Si está en "Familia" (lo normal), la familia paga el resto.
            </div>
          </div>

          <div className="cv-field">
            <label>Observaciones</label>
            <textarea value={form.observaciones} onChange={e => setForm(p => ({...p, observaciones:e.target.value}))}
              placeholder="Condiciones especiales, vigencia del convenio…" style={{ minHeight:60, resize:'vertical' }}/>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
            <button className="cv-btn cv-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="cv-btn cv-btn-primary" onClick={guardar} disabled={saving}>
              {saving ? <Loader2 size={14} className="cv-spin"/> : <Handshake size={14}/>}
              {convenio ? 'Guardar cambios' : 'Crear convenio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Fila de autorización (editable inline) ────────────────────────────────
function FilaAutorizacion({ aut, convenioId, onChange }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ nombre: aut.nombre, cobertura_tipo: aut.cobertura_tipo,
    cobertura_valor: aut.cobertura_valor, tope_maximo: aut.tope_maximo ?? '',
    absorbe_resto: aut.absorbe_resto || '' })
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    setSaving(true)
    try {
      await api.put(`/convenios/autorizaciones/${aut.id}`, form)
      toast.success('Autorización actualizada con éxito')
      setEditando(false); onChange()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') } finally { setSaving(false) }
  }

  const eliminar = async () => {
    try {
      const r = await api.delete(`/convenios/autorizaciones/${aut.id}`)
      toast.success(r.data.desactivada ? 'Autorización desactivada (tenía servicios vinculados)' : 'Autorización eliminada')
      onChange()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  if (editando) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 80px 90px 130px auto', gap:8, alignItems:'center',
        padding:'8px 0' }}>
        <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre:e.target.value}))}
          style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}/>
        <select value={form.cobertura_tipo} onChange={e => setForm(p => ({...p, cobertura_tipo:e.target.value}))}
          style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}>
          <option value="PORCENTAJE">%</option>
          <option value="MONTO_FIJO">$ fijo</option>
        </select>
        <input type="number" value={form.cobertura_valor} onChange={e => setForm(p => ({...p, cobertura_valor:e.target.value}))}
          style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}/>
        <input type="number" placeholder="Tope $" value={form.tope_maximo}
          onChange={e => setForm(p => ({...p, tope_maximo:e.target.value}))}
          style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}/>
        <select value={form.absorbe_resto} onChange={e => setForm(p => ({...p, absorbe_resto:e.target.value}))}
          style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}>
          <option value="">Resto: hereda convenio</option>
          <option value="FAMILIA">Resto: Familia</option>
          <option value="FUNERARIA">Resto: Funeraria</option>
        </select>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={guardar} disabled={saving} style={{ background:'#D1FAE5', color:'#059669', border:'none',
            borderRadius:7, padding:'6px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            {saving ? <Loader2 size={12} className="cv-spin"/> : 'Guardar'}
          </button>
          <button onClick={() => setEditando(false)} style={{ background:'#F3F4F6', color:'#6B7280', border:'none',
            borderRadius:7, padding:'6px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0',
      borderBottom:'1px solid #F4F5FA' }}>
      <span style={{ flex:1, fontSize:12.5, fontWeight:700, color: aut.activo ? '#0F1035' : '#D1D5DB' }}>
        {aut.nombre} {!aut.activo && <span style={{ fontSize:10, fontWeight:600 }}>(inactiva)</span>}
      </span>
      {aut.absorbe_resto === 'FUNERARIA' && (
        <span style={{ fontSize:10.5, fontWeight:700, color:'#7C3AED', background:'#F5F3FF',
          padding:'2px 7px', borderRadius:20 }}>
          Resto: Funeraria
        </span>
      )}
      {aut.tope_maximo != null && (
        <span style={{ fontSize:10.5, fontWeight:700, color:'#9A3412', background:'#FFF7ED',
          padding:'2px 7px', borderRadius:20 }}>
          Tope {fmt(aut.tope_maximo)}
        </span>
      )}
      <span style={{ fontSize:12, fontWeight:700, color:'#0891B2', background:'#CFFAFE',
        padding:'2px 8px', borderRadius:20 }}>
        {fmtCobertura(aut.cobertura_tipo, aut.cobertura_valor)}
      </span>
      <button onClick={() => setEditando(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280' }}>
        <Edit2 size={13}/>
      </button>
      <button onClick={eliminar} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444' }}>
        <Trash2 size={13}/>
      </button>
    </div>
  )
}

// ── Tarjeta expandible de convenio ─────────────────────────────────────────
function TarjetaConvenio({ convenio, onEditar, onRecargar }) {
  const [abierto, setAbierto] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [nuevaAut, setNuevaAut] = useState({ nombre:'', cobertura_tipo:'PORCENTAJE', cobertura_valor:100, tope_maximo:'', absorbe_resto:'' })
  const [addingAut, setAddingAut] = useState(false)
  const [savingAut, setSavingAut] = useState(false)
  const [itemsPermitidos, setItemsPermitidos] = useState([])
  const [busqCatalogo, setBusqCatalogo] = useState('')
  const [candCatalogo, setCandCatalogo] = useState([])
  const [paquetesVinculados, setPaquetesVinculados] = useState([])
  const [paquetesDisponibles, setPaquetesDisponibles] = useState([])
  const [busqPaquete, setBusqPaquete] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [r, ri, rp] = await Promise.all([
        api.get(`/convenios/${convenio.id}`),
        api.get(`/convenios/${convenio.id}/items`),
        api.get(`/convenios/${convenio.id}/paquetes`),
      ])
      setDetalle(r.data.data)
      setItemsPermitidos(ri.data.data || [])
      setPaquetesVinculados(rp.data.data || [])
    } finally { setLoading(false) }
  }, [convenio.id])

  useEffect(() => {
    if (!abierto) return
    api.get('/contratos/paquetes').then(r => setPaquetesDisponibles(r.data.data || [])).catch(() => {})
  }, [abierto])

  const candPaquetes = busqPaquete.length < 2 ? [] : paquetesDisponibles.filter(p =>
    p.nombre.toLowerCase().includes(busqPaquete.toLowerCase()) &&
    !paquetesVinculados.some(pv => pv.paquete_id === p.id))

  const agregarPaqueteVinculado = async (p) => {
    try {
      await api.post(`/convenios/${convenio.id}/paquetes`, { paquete_id: p.id })
      toast.success('Paquete vinculado con éxito')
      setBusqPaquete(''); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const quitarPaqueteVinculado = async (vinculoId) => {
    try {
      await api.delete(`/convenios/paquetes/${vinculoId}`)
      toast.success('Paquete desvinculado')
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  useEffect(() => { if (abierto) cargar() }, [abierto, cargar])

  useEffect(() => {
    if (busqCatalogo.length < 2) return setCandCatalogo([])
    const t = setTimeout(async () => {
      const r = await api.get(`/servicios/catalogo?q=${encodeURIComponent(busqCatalogo)}&limit=8`)
      setCandCatalogo((r.data.data || []).filter(c => !itemsPermitidos.some(ip => ip.catalogo_id === c.id)))
    }, 300)
    return () => clearTimeout(t)
  }, [busqCatalogo, itemsPermitidos])

  const agregarItemPermitido = async (item) => {
    try {
      await api.post(`/convenios/${convenio.id}/items`, { catalogo_id: item.id })
      toast.success('Ítem agregado a la lista permitida')
      setBusqCatalogo(''); setCandCatalogo([]); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const quitarItemPermitido = async (itemId) => {
    try {
      await api.delete(`/convenios/items/${itemId}`)
      toast.success('Ítem quitado de la lista permitida')
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const toggleActivo = async (e) => {
    e.stopPropagation()
    try {
      await api.patch(`/convenios/${convenio.id}/toggle`)
      toast.success('Estado actualizado con éxito')
      onRecargar()
    } catch (er) { toast.error(er.response?.data?.error || 'Error') }
  }

  const agregarAutorizacion = async () => {
    if (!nuevaAut.nombre.trim()) return toast.error('El nombre de la autorización es obligatorio')
    setSavingAut(true)
    try {
      await api.post(`/convenios/${convenio.id}/autorizaciones`, nuevaAut)
      toast.success('Autorización agregada con éxito')
      setNuevaAut({ nombre:'', cobertura_tipo:'PORCENTAJE', cobertura_valor:100, tope_maximo:'', absorbe_resto:'' })
      setAddingAut(false); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') } finally { setSavingAut(false) }
  }

  const m = TIPO_META[convenio.tipo_entidad] || TIPO_META.OTRO
  const { Icon } = m

  return (
    <div className="cv-card">
      <div className="cv-card-head" onClick={() => setAbierto(a => !a)}>
        <div style={{ width:40, height:40, borderRadius:11, flexShrink:0, background:m.bg,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={18} color={m.color}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:14, fontWeight:800, color:'#0F1035' }}>{convenio.nombre}</span>
            <TipoBadge tipo={convenio.tipo_entidad}/>
            {convenio.sede_nombre && (
              <span style={{ fontSize:10, fontWeight:700, color:'#4338CA', background:'#EEF2FF',
                padding:'2px 8px', borderRadius:20 }}>{convenio.sede_nombre}</span>
            )}
            {!convenio.activo && (
              <span style={{ fontSize:10, fontWeight:700, color:'#EF4444', background:'#FEE2E2',
                padding:'2px 8px', borderRadius:20 }}>INACTIVO</span>
            )}
          </div>
          <div style={{ fontSize:11.5, color:'#9CA3AF', marginTop:2 }}>
            Cobertura por defecto: {fmtCobertura(convenio.cobertura_tipo, convenio.cobertura_valor)}
            {' · '}{convenio.total_autorizaciones} tipo(s) de autorización · {convenio.total_servicios} servicio(s) usados
          </div>
        </div>
        <button onClick={toggleActivo} title={convenio.activo ? 'Desactivar' : 'Activar'}
          style={{ width:30, height:30, borderRadius:8, border:'1.5px solid #E2E5F0', background:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
            color: convenio.activo ? '#059669' : '#9CA3AF' }}>
          <Power size={13}/>
        </button>
        <button onClick={e => { e.stopPropagation(); onEditar(convenio) }}
          style={{ width:30, height:30, borderRadius:8, border:'1.5px solid #E2E5F0', background:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280' }}>
          <Edit2 size={13}/>
        </button>
        {abierto ? <ChevronUp size={16} color="#9CA3AF"/> : <ChevronDown size={16} color="#9CA3AF"/>}
      </div>

      {abierto && (
        <div className="cv-card-body">
          {loading ? (
            <div style={{ padding:'16px 0', textAlign:'center', color:'#9CA3AF' }}>
              <Loader2 size={18} className="cv-spin"/>
            </div>
          ) : (
            <>
              {(convenio.contacto_nombre || convenio.nit) && (
                <div style={{ fontSize:12, color:'#6B7280', padding:'12px 0 4px' }}>
                  {convenio.nit && <span>NIT: {convenio.nit} · </span>}
                  {convenio.contacto_nombre && <span>Contacto: {convenio.contacto_nombre}</span>}
                  {convenio.contacto_telefono && <span> · {convenio.contacto_telefono}</span>}
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', letterSpacing:.6, textTransform:'uppercase' }}>
                  Tipos de autorización
                </span>
                <button onClick={() => setAddingAut(a => !a)}
                  style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none',
                    color:'#0891B2', fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
                  <Plus size={13}/> Agregar
                </button>
              </div>

              {addingAut && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 90px 130px auto', gap:8, alignItems:'center',
                  padding:'8px 10px', background:'#F0FDFF', borderRadius:10, marginBottom:8 }}>
                  <input placeholder="Ej: Completa, Inicial, Final…" value={nuevaAut.nombre}
                    onChange={e => setNuevaAut(p => ({...p, nombre:e.target.value}))}
                    style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}/>
                  <select value={nuevaAut.cobertura_tipo} onChange={e => setNuevaAut(p => ({...p, cobertura_tipo:e.target.value}))}
                    style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}>
                    <option value="PORCENTAJE">%</option>
                    <option value="MONTO_FIJO">$ fijo</option>
                  </select>
                  <input type="number" value={nuevaAut.cobertura_valor}
                    onChange={e => setNuevaAut(p => ({...p, cobertura_valor:e.target.value}))}
                    style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}/>
                  <input type="number" placeholder="Tope $" value={nuevaAut.tope_maximo}
                    onChange={e => setNuevaAut(p => ({...p, tope_maximo:e.target.value}))}
                    style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}/>
                  <select value={nuevaAut.absorbe_resto} onChange={e => setNuevaAut(p => ({...p, absorbe_resto:e.target.value}))}
                    style={{ padding:'7px 10px', border:'1.5px solid #E2E5F0', borderRadius:8, fontSize:12.5 }}>
                    <option value="">Resto: hereda convenio</option>
                    <option value="FAMILIA">Resto: Familia</option>
                    <option value="FUNERARIA">Resto: Funeraria</option>
                  </select>
                  <button onClick={agregarAutorizacion} disabled={savingAut}
                    style={{ background:'#0891B2', color:'#fff', border:'none', borderRadius:7,
                      padding:'6px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    {savingAut ? <Loader2 size={12} className="cv-spin"/> : 'Crear'}
                  </button>
                </div>
              )}

              {(detalle?.autorizaciones || []).length === 0 ? (
                <div style={{ fontSize:12, color:'#D1D5DB', padding:'8px 0' }}>
                  Sin tipos de autorización — se usará la cobertura por defecto del convenio.
                </div>
              ) : (
                detalle.autorizaciones.map(a => (
                  <FilaAutorizacion key={a.id} aut={a} convenioId={convenio.id} onChange={cargar}/>
                ))
              )}

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18, marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', letterSpacing:.6, textTransform:'uppercase' }}>
                  Servicios permitidos
                </span>
              </div>
              <div style={{ position:'relative', marginBottom:8 }}>
                <input value={busqCatalogo} onChange={e => setBusqCatalogo(e.target.value)}
                  placeholder="Buscar en el catálogo para restringir qué se puede prestar…"
                  style={{ width:'100%', boxSizing:'border-box', padding:'8px 12px', border:'1.5px solid #E2E5F0',
                    borderRadius:8, fontSize:12.5 }}/>
                {candCatalogo.length > 0 && (
                  <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                    maxHeight:160, overflowY:'auto', background:'#fff', marginTop:4, position:'absolute',
                    left:0, right:0, zIndex:5, boxShadow:'0 8px 20px rgba(0,0,0,.1)' }}>
                    {candCatalogo.map(c => (
                      <div key={c.id} onClick={() => agregarItemPermitido(c)}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F4F5FA' }}
                        onMouseEnter={e => e.currentTarget.style.background='#F0FDFF'}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <span style={{ fontSize:12.5 }}>{c.nombre}</span>
                        <span style={{ fontSize:11, color:'#9CA3AF' }}>{fmt(c.precio_base)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {itemsPermitidos.length === 0 ? (
                <div style={{ fontSize:12, color:'#059669', background:'#F0FDF4', border:'1px solid #BBF7D0',
                  borderRadius:8, padding:'8px 10px' }}>
                  Sin restricción — se puede prestar cualquier ítem del catálogo bajo este convenio.
                </div>
              ) : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {itemsPermitidos.map(it => (
                    <span key={it.id} style={{ display:'inline-flex', alignItems:'center', gap:6,
                      background:'#ECFEFF', border:'1px solid #A5F3FC', color:'#0E7490',
                      borderRadius:20, padding:'4px 6px 4px 10px', fontSize:11.5, fontWeight:600 }}>
                      {it.nombre}
                      <button onClick={() => quitarItemPermitido(it.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#0891B2',
                          display:'flex', alignItems:'center' }}>
                        <X size={11}/>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18, marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', letterSpacing:.6, textTransform:'uppercase' }}>
                  Paquetes vinculados
                </span>
              </div>
              <div style={{ position:'relative', marginBottom:8 }}>
                <input value={busqPaquete} onChange={e => setBusqPaquete(e.target.value)}
                  placeholder="Buscar paquete (ej: Servicio Inicial, Servicio Final)…"
                  style={{ width:'100%', boxSizing:'border-box', padding:'8px 12px', border:'1.5px solid #E2E5F0',
                    borderRadius:8, fontSize:12.5 }}/>
                {candPaquetes.length > 0 && (
                  <div style={{ border:'1.5px solid #ECEDF8', borderRadius:10, overflow:'hidden',
                    maxHeight:160, overflowY:'auto', background:'#fff', marginTop:4, position:'absolute',
                    left:0, right:0, zIndex:5, boxShadow:'0 8px 20px rgba(0,0,0,.1)' }}>
                    {candPaquetes.map(p => (
                      <div key={p.id} onClick={() => agregarPaqueteVinculado(p)}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F4F5FA' }}
                        onMouseEnter={e => e.currentTarget.style.background='#F0FDFF'}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <span style={{ fontSize:12.5 }}>{p.nombre}</span>
                        <span style={{ fontSize:11, color:'#9CA3AF' }}>{fmt(p.precio_base)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {paquetesVinculados.length === 0 ? (
                <div style={{ fontSize:12, color:'#D1D5DB', padding:'8px 0' }}>
                  Sin paquetes vinculados a este convenio todavía.
                </div>
              ) : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {paquetesVinculados.map(pv => (
                    <span key={pv.id} style={{ display:'inline-flex', alignItems:'center', gap:6,
                      background:'#F5F3FF', border:'1px solid #DDD6FE', color:'#6D28D9',
                      borderRadius:20, padding:'4px 6px 4px 10px', fontSize:11.5, fontWeight:600 }}>
                      {pv.nombre} · {fmt(pv.precio_base)}
                      <button onClick={() => quitarPaqueteVinculado(pv.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#7C3AED',
                          display:'flex', alignItems:'center' }}>
                        <X size={11}/>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {convenio.observaciones && (
                <div style={{ marginTop:14, fontSize:12, color:'#6B7280', background:'#F8F9FF',
                  padding:'10px 12px', borderRadius:10 }}>
                  {convenio.observaciones}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ConveniosPage() {
  const [convenios, setConvenios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/convenios'); setConvenios(r.data.data || []) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return (
    <>
      <style>{CSS}</style>
      <div className="cv-page">
        <div className="cv-head">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className="cv-head-icon"><Handshake size={22} color="#fff"/></div>
            <div>
              <div className="cv-titulo">Convenios</div>
              <div className="cv-sub">
                EPS, aseguradoras, alcaldías y empresas · {convenios.length} convenio{convenios.length!==1?'s':''}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="cv-btn cv-btn-ghost" onClick={cargar} title="Recargar">
              <RefreshCw size={14} className={loading ? 'cv-spin' : ''}/>
            </button>
            <button className="cv-btn cv-btn-primary" onClick={() => { setSeleccionado(null); setModal(true) }}>
              <Plus size={15}/> Nuevo convenio
            </button>
          </div>
        </div>

        <div className="cv-list">
          {loading && convenios.length === 0 ? (
            <div className="cv-empty"><Loader2 size={32} className="cv-spin" color="#0891B2"/><p>Cargando convenios…</p></div>
          ) : convenios.length === 0 ? (
            <div className="cv-empty">
              <div style={{ width:64, height:64, borderRadius:18, background:'#CFFAFE',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Handshake size={28} color="#0891B2"/>
              </div>
              <p>Sin convenios registrados</p>
              <span>Registra una EPS, alcaldía o empresa con la que tengan acuerdo</span>
            </div>
          ) : (
            convenios.map(c => (
              <TarjetaConvenio key={c.id} convenio={c}
                onEditar={(cv) => { setSeleccionado(cv); setModal(true) }}
                onRecargar={cargar}/>
            ))
          )}
        </div>
      </div>

      {modal && (
        <ModalConvenio convenio={seleccionado}
          onClose={() => { setModal(false); setSeleccionado(null) }}
          onSaved={() => { setModal(false); setSeleccionado(null); cargar() }}/>
      )}
    </>
  )
}
