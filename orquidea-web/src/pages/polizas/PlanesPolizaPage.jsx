/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Planes de Póliza — Administración                   ║
 * ║  Archivo         : PlanesPolizaPage.jsx                                ║
 * ║  Fecha           : 2026-07-01                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, ShieldCheck, Users, Clock, DollarSign, ToggleLeft, ToggleRight, PlusCircle, Search, Package } from 'lucide-react'
import api from '../../services/api.js'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'
import { toast } from '../../store/toast.store.js'

const CATEGORIAS_SERVICIO = [
  'ATAUD','URNA','TRASLADO','SALA_VELACION','DOCUMENTOS',
  'CREMACION','INHUMACION','PREPARACION','FLORES','ADICIONAL','GENERAL',
]

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const TIPOS = ['INDIVIDUAL', 'FAMILIAR', 'AMPLIADO', 'COLECTIVO']
const BLANK = {
  nombre: '', descripcion: '', tipo: 'FAMILIAR',
  max_beneficiarios: 1, valor_mensual: '', meses_carencia: 3,
  cubre_ataud: 'BASICO', cubre_velacion_h: 4,
  cubre_traslado_local: false, cubre_traslado_nacional: false,
  cubre_flores: false, cubre_cremacion: false,
  cubre_tramites: false, cubre_lapida: false,
  valor_excedente: 0,
  coberturas_extra: [],
  servicios_ids: [],
  valor_afiliacion: 20000,
  valor_beneficiario_adicional: 0,
  edad_min_beneficiario: 0,
  edad_max_beneficiario: 65,
}

const CSS = `
.pp-wrap { padding: 24px; background: #f8fafc; min-height: 100vh; }
.pp-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
.pp-title { font-size:22px; font-weight:700; color:#0f172a; margin:0; }
.pp-sub { font-size:13px; color:#64748b; margin:4px 0 0; }
.pp-btn-new { display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none; border-radius:8px; padding:10px 18px; font-size:14px; font-weight:600; cursor:pointer; transition:.15s; }
.pp-btn-new:hover { opacity:.9; }

/* Grid de tarjetas */
.pp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:20px; }
.pp-card { background:#fff; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 1px 4px rgba(0,0,0,.06); overflow:hidden; transition:box-shadow .15s; position:relative; }
.pp-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); }
.pp-card.inactivo { opacity:.55; }
.pp-card-head { padding:18px 18px 14px; border-bottom:1px solid #f1f5f9; }
.pp-card-tipo { display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; margin-bottom:8px; background:#dbeafe; color:#1d4ed8; letter-spacing:.5px; }
.pp-card-tipo.FAMILIAR  { background:#d1fae5; color:#065f46; }
.pp-card-tipo.AMPLIADO  { background:#ede9fe; color:#5b21b6; }
.pp-card-tipo.COLECTIVO { background:#fef3c7; color:#92400e; }
.pp-card-nombre { font-size:17px; font-weight:700; color:#0f172a; margin:0 0 4px; }
.pp-card-desc { font-size:13px; color:#64748b; margin:0; line-height:1.4; }
.pp-card-body { padding:14px 18px; }
.pp-kpis { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
.pp-kpi { background:#f8fafc; border-radius:8px; padding:8px 10px; }
.pp-kpi-label { font-size:11px; color:#94a3b8; margin-bottom:2px; display:flex; align-items:center; gap:4px; }
.pp-kpi-val { font-size:15px; font-weight:700; color:#0f172a; }
.pp-coberturas { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
.pp-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:3px 8px; border-radius:20px; }
.pp-chip.si { background:#d1fae5; color:#065f46; }
.pp-chip.no { background:#f1f5f9; color:#94a3b8; text-decoration:line-through; }
.pp-card-foot { display:flex; justify-content:flex-end; gap:8px; padding:10px 18px; border-top:1px solid #f1f5f9; }
.pp-btn-ic { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; border:none; border-radius:7px; padding:6px 12px; cursor:pointer; transition:.15s; }
.pp-btn-ic:hover { opacity:.85; }
.pp-btn-edit { background:#eff6ff; color:#1d4ed8; }
.pp-btn-del  { background:#fef2f2; color:#dc2626; }
.pp-btn-tog  { background:#f0fdf4; color:#059669; }
.pp-badge-inact { position:absolute; top:12px; right:12px; background:#ef4444; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; }

/* Modal */
.pp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.pp-modal { background:#fff; border-radius:16px; width:100%; max-width:680px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); }
.pp-modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:3px solid #059669; position:sticky; top:0; background:#fff; z-index:1; }
.pp-modal-title { font-size:18px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px; }
.pp-modal-close { background:none; border:none; font-size:22px; cursor:pointer; color:#94a3b8; line-height:1; }
.pp-modal-body { padding:20px 24px; }
.pp-section { margin-bottom:20px; }
.pp-section-title { font-size:12px; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:.8px; margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid #d1fae5; }
.pp-row { display:grid; gap:12px; margin-bottom:12px; }
.pp-row.cols2 { grid-template-columns:1fr 1fr; }
.pp-row.cols3 { grid-template-columns:1fr 1fr 1fr; }
.pp-field label { display:block; font-size:12px; font-weight:600; color:#374151; margin-bottom:5px; }
.pp-field input, .pp-field select, .pp-field textarea {
  width:100%; border:1.5px solid #e2e8f0; border-radius:8px; padding:9px 12px;
  font-size:14px; color:#0f172a; background:#fafafa; outline:none; box-sizing:border-box;
  transition:border-color .15s;
}
.pp-field input:focus, .pp-field select:focus, .pp-field textarea:focus { border-color:#059669; background:#fff; }
.pp-field textarea { resize:vertical; min-height:60px; }
.pp-checks { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.pp-check-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; border:1.5px solid #e2e8f0; cursor:pointer; transition:.15s; }
.pp-check-item:hover { border-color:#059669; background:#f0fdf4; }
.pp-check-item.active { border-color:#059669; background:#f0fdf4; }
.pp-check-item input { width:auto; }
.pp-check-label { font-size:12px; font-weight:600; color:#374151; }
.pp-modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1px solid #f1f5f9; position:sticky; bottom:0; background:#fff; }
.pp-btn-cancel { padding:10px 20px; border:1.5px solid #e2e8f0; border-radius:8px; background:#fff; color:#374151; font-size:14px; font-weight:600; cursor:pointer; }
.pp-btn-save { padding:10px 24px; border:none; border-radius:8px; background:linear-gradient(135deg,#059669,#047857); color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
.pp-btn-save:disabled { opacity:.6; cursor:not-allowed; }
.pp-error { color:#dc2626; font-size:13px; margin-top:8px; padding:8px 12px; background:#fef2f2; border-radius:8px; }
.pp-empty { text-align:center; padding:60px 20px; color:#94a3b8; }
.pp-empty svg { margin-bottom:16px; opacity:.4; }

/* Editor coberturas extra */
.pp-extra-list { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; }
.pp-extra-item { display:flex; align-items:center; gap:8px; }
.pp-extra-item input[type=text] { flex:1; }
.pp-extra-item input[type=text]:focus { border-color:#059669; background:#fff; }
.pp-extra-toggle { display:flex; align-items:center; gap:4px; background:none; border:1.5px solid #e2e8f0; border-radius:7px; padding:6px 10px; cursor:pointer; font-size:12px; font-weight:600; color:#64748b; white-space:nowrap; transition:.15s; }
.pp-extra-toggle.on { border-color:#059669; background:#f0fdf4; color:#059669; }
.pp-extra-del { background:none; border:none; cursor:pointer; color:#ef4444; padding:4px; border-radius:6px; display:flex; align-items:center; }
.pp-extra-del:hover { background:#fef2f2; }
.pp-add-extra { display:flex; align-items:center; gap:6px; background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:8px; padding:8px 14px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; width:100%; justify-content:center; transition:.15s; }
.pp-add-extra:hover { border-color:#059669; color:#059669; background:#f0fdf4; }
.pp-card-extra { margin-top:4px; padding-top:4px; border-top:1px dashed #e2e8f0; display:flex; flex-wrap:wrap; gap:4px; }
.pp-checklist { margin-top:6px; padding-top:6px; border-top:1px dashed #e2e8f0; }
.pp-check-item { display:flex; align-items:flex-start; gap:6px; font-size:11.5px; color:#4b5563;
  line-height:1.35; margin-bottom:4px; }
.pp-check-item svg { color:#059669; flex-shrink:0; margin-top:2px; }
.pp-check-more { font-size:11px; color:#059669; font-weight:700; margin-top:2px; }
`

function Toggle({ label, checked, onChange }) {
  return (
    <div
      className={`pp-check-item${checked ? ' active' : ''}`}
      onClick={() => onChange(!checked)}
    >
      {checked
        ? <CheckCircle size={15} color="#059669" />
        : <XCircle size={15} color="#94a3b8" />}
      <span className="pp-check-label">{label}</span>
    </div>
  )
}

function CoberturaChip({ label, activo }) {
  return <span className={`pp-chip ${activo ? 'si' : 'no'}`}>{activo ? '✓' : '×'} {label}</span>
}

export default function PlanesPolizaPage() {
  const [planes, setPlanes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'nuevo' | plan-objeto
  const [form, setForm]       = useState(BLANK)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [catalogo, setCatalogo] = useState([])
  const [buscarServ, setBuscarServ] = useState('')
  const [nuevoServ, setNuevoServ] = useState(null) // null | { nombre, categoria, precio_base }
  const [creandoServ, setCreandoServ] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/polizas/planes?todos=${mostrarInactivos ? '1' : '0'}`)
      setPlanes(data.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [mostrarInactivos])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    api.get('/empresa/servicios').then(({ data }) => setCatalogo(data.data || [])).catch(() => {})
  }, [])

  const abrirNuevo = () => { setForm(BLANK); setError(''); setModal('nuevo') }
  const abrirEditar = (p) => {
    setForm({
      ...p,
      coberturas_extra: Array.isArray(p.coberturas_extra) ? p.coberturas_extra : [],
      servicios_ids: Array.isArray(p.servicios) ? p.servicios.map(s => s.id) : [],
    })
    setError('')
    setModal(p)
  }

  const toggleServicio = (id) => setForm(f => ({
    ...f,
    servicios_ids: f.servicios_ids.includes(id)
      ? f.servicios_ids.filter(x => x !== id)
      : [...f.servicios_ids, id],
  }))

  const crearServicioRapido = async () => {
    if (!nuevoServ?.nombre?.trim()) return
    setCreandoServ(true)
    try {
      const { data } = await api.post('/empresa/servicios', {
        nombre: nuevoServ.nombre.trim(),
        categoria: nuevoServ.categoria || 'GENERAL',
        precio_base: +nuevoServ.precio_base || 0,
      })
      const creado = data.data
      setCatalogo(c => [...c, creado])
      setForm(f => ({ ...f, servicios_ids: [...f.servicios_ids, creado.id] }))
      setNuevoServ(null)
      toast.success('Servicio creado y agregado al plan')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al crear el servicio')
    } finally { setCreandoServ(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Coberturas extra helpers
  const addExtra = () => setForm(f => ({
    ...f, coberturas_extra: [...(f.coberturas_extra || []), { nombre: '', incluido: true }]
  }))
  const setExtra = (i, key, val) => setForm(f => {
    const list = [...(f.coberturas_extra || [])]
    list[i] = { ...list[i], [key]: val }
    return { ...f, coberturas_extra: list }
  })
  const removeExtra = (i) => setForm(f => ({
    ...f, coberturas_extra: (f.coberturas_extra || []).filter((_, j) => j !== i)
  }))

  const guardar = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'nuevo') {
        await api.post('/polizas/planes', form)
        toast.success('Plan de póliza creado')
      } else {
        await api.put(`/polizas/planes/${modal.id}`, form)
        toast.success('Plan de póliza actualizado')
      }
      setModal(null)
      cargar()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar')
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const toggleActivo = async (p) => {
    if (p.activo) {
      if (!confirm(`¿Desactivar el plan "${p.nombre}"? Ya no aparecerá al crear pólizas nuevas.`)) return
      try { await api.delete(`/polizas/planes/${p.id}`); toast.success('Plan de póliza desactivado'); cargar() }
      catch (e) { toast.error(e.response?.data?.error || 'Error') }
    } else {
      try { await api.put(`/polizas/planes/${p.id}`, { activo: true }); toast.success('Plan de póliza activado'); cargar() }
      catch (e) { toast.error(e.response?.data?.error || 'Error') }
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="pp-wrap">
        <div className="pp-top">
          <div>
            <h1 className="pp-title">Planes de Póliza</h1>
            <p className="pp-sub">Configure los planes que ofrece la funeraria · {planes.length} plan(es)</p>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#64748b', cursor:'pointer' }}>
              <input type="checkbox" checked={mostrarInactivos} onChange={e => setMostrarInactivos(e.target.checked)} />
              Mostrar inactivos
            </label>
            <button className="pp-btn-new" onClick={abrirNuevo}>
              <Plus size={16} /> Nuevo plan
            </button>
          </div>
        </div>

        {loading ? (
          <div className="pp-empty"><p>Cargando planes…</p></div>
        ) : planes.length === 0 ? (
          <div className="pp-empty">
            <ShieldCheck size={48} />
            <p>No hay planes configurados aún.</p>
            <button className="pp-btn-new" onClick={abrirNuevo} style={{ margin:'0 auto' }}>
              <Plus size={16} /> Crear primer plan
            </button>
          </div>
        ) : (
          <div className="pp-grid">
            {planes.map(p => (
              <div key={p.id} className={`pp-card${p.activo ? '' : ' inactivo'}`}>
                {!p.activo && <span className="pp-badge-inact">INACTIVO</span>}
                <div className="pp-card-head">
                  <div className={`pp-card-tipo ${p.tipo}`}>{p.tipo}</div>
                  <h3 className="pp-card-nombre">{p.nombre}</h3>
                  {p.descripcion && <p className="pp-card-desc">{p.descripcion}</p>}
                </div>
                <div className="pp-card-body">
                  <div className="pp-kpis">
                    <div className="pp-kpi">
                      <div className="pp-kpi-label"><DollarSign size={11} /> Cuota mensual</div>
                      <div className="pp-kpi-val">{fmt(p.valor_mensual)}</div>
                    </div>
                    <div className="pp-kpi">
                      <div className="pp-kpi-label"><Users size={11} /> Beneficiarios</div>
                      <div className="pp-kpi-val">Máx. {p.max_beneficiarios} ({p.edad_min_beneficiario}-{p.edad_max_beneficiario} años)</div>
                    </div>
                    <div className="pp-kpi">
                      <div className="pp-kpi-label"><Clock size={11} /> Carencia</div>
                      <div className="pp-kpi-val">{p.meses_carencia} meses</div>
                    </div>
                    <div className="pp-kpi">
                      <div className="pp-kpi-label"><ShieldCheck size={11} /> Velación</div>
                      <div className="pp-kpi-val">{p.cubre_velacion_h}h</div>
                    </div>
                  </div>
                  <div className="pp-coberturas">
                    <span className="pp-chip si">Afiliación {fmt(p.valor_afiliacion)}</span>
                    {+p.valor_beneficiario_adicional > 0 &&
                      <span className="pp-chip si">+{fmt(p.valor_beneficiario_adicional)}/benef. adicional</span>}
                    {+p.valor_excedente > 0 &&
                      <span className="pp-chip si">Excedente {fmt(p.valor_excedente)}</span>}
                    {Array.isArray(p.coberturas_extra) && p.coberturas_extra.length > 0 && (
                      <div className="pp-card-extra">
                        {p.coberturas_extra.map((c, i) => (
                          <CoberturaChip key={i} label={c.nombre} activo={c.incluido !== false} />
                        ))}
                      </div>
                    )}
                    {Array.isArray(p.servicios) && p.servicios.length > 0 && (
                      <div className="pp-checklist">
                        {p.servicios.slice(0,5).map(s => (
                          <div key={s.id} className="pp-check-item">
                            <CheckCircle size={12}/> <span>{s.nombre}</span>
                          </div>
                        ))}
                        {p.servicios.length > 5 && (
                          <div className="pp-check-more">+{p.servicios.length - 5} más incluidos</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pp-card-foot">
                  <button className="pp-btn-ic pp-btn-tog" onClick={() => toggleActivo(p)}>
                    {p.activo
                      ? <><ToggleRight size={14} /> Desactivar</>
                      : <><ToggleLeft size={14} /> Activar</>}
                  </button>
                  <button className="pp-btn-ic pp-btn-edit" onClick={() => abrirEditar(p)}>
                    <Pencil size={13} /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="pp-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="pp-modal">
            <div className="pp-modal-head">
              <div className="pp-modal-title">
                <ShieldCheck size={20} color="#059669" />
                {modal === 'nuevo' ? 'Nuevo plan de póliza' : `Editar: ${modal.nombre}`}
              </div>
              <button className="pp-modal-close" onClick={() => setModal(null)}>×</button>
            </div>

            <div className="pp-modal-body">
              {/* Información básica */}
              <div className="pp-section">
                <div className="pp-section-title">Información básica</div>
                <div className="pp-row">
                  <div className="pp-field">
                    <label>Nombre del plan *</label>
                    <input
                      value={form.nombre}
                      onChange={e => set('nombre', e.target.value)}
                      placeholder="Ej: Familiar Clásico"
                    />
                  </div>
                </div>
                <div className="pp-row cols2">
                  <div className="pp-field">
                    <label>Tipo</label>
                    <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                      {TIPOS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="pp-field">
                    <label>Máx. beneficiarios</label>
                    <input
                      type="number" min={1} max={20}
                      value={form.max_beneficiarios}
                      onChange={e => set('max_beneficiarios', e.target.value)}
                    />
                  </div>
                </div>
                <div className="pp-row cols2">
                  <div className="pp-field">
                    <label>Edad mínima beneficiario</label>
                    <input
                      type="number" min={0} max={100}
                      value={form.edad_min_beneficiario}
                      onChange={e => set('edad_min_beneficiario', e.target.value)}
                    />
                  </div>
                  <div className="pp-field">
                    <label>Edad máxima beneficiario</label>
                    <input
                      type="number" min={0} max={100}
                      value={form.edad_max_beneficiario}
                      onChange={e => set('edad_max_beneficiario', e.target.value)}
                    />
                  </div>
                </div>
                <div className="pp-row">
                  <div className="pp-field">
                    <label>Descripción</label>
                    <textarea
                      value={form.descripcion || ''}
                      onChange={e => set('descripcion', e.target.value)}
                      placeholder="Breve descripción del plan…"
                    />
                  </div>
                </div>
              </div>

              {/* Tarifas */}
              <div className="pp-section">
                <div className="pp-section-title">Tarifas y carencia</div>
                <div className="pp-row cols3">
                  <div className="pp-field">
                    <label>Cuota mensual (COP) *</label>
                    <CurrencyInput
                      value={form.valor_mensual}
                      onChange={v => set('valor_mensual', v)}
                      placeholder="58000"
                    />
                  </div>
                  <div className="pp-field">
                    <label>Meses de carencia</label>
                    <input
                      type="number" min={0} max={12}
                      value={form.meses_carencia}
                      onChange={e => set('meses_carencia', e.target.value)}
                    />
                  </div>
                  <div className="pp-field">
                    <label>Cobro por excedente (COP)</label>
                    <CurrencyInput
                      value={form.valor_excedente}
                      onChange={v => set('valor_excedente', v)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="pp-row cols2">
                  <div className="pp-field">
                    <label>Valor de afiliación (COP)</label>
                    <CurrencyInput
                      value={form.valor_afiliacion}
                      onChange={v => set('valor_afiliacion', v)}
                      placeholder="20000"
                    />
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                      Solo se cobra una vez, en la primera póliza del titular.
                    </div>
                  </div>
                  <div className="pp-field">
                    <label>Valor por beneficiario adicional (COP)</label>
                    <CurrencyInput
                      value={form.valor_beneficiario_adicional}
                      onChange={v => set('valor_beneficiario_adicional', v)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Tiempo de velación */}
              <div className="pp-section">
                <div className="pp-section-title">Tiempo de velación</div>
                <div className="pp-row cols2" style={{ marginBottom:4 }}>
                  <div className="pp-field">
                    <label>Horas de velación</label>
                    <input
                      type="number" min={0} max={72} step={4}
                      value={form.cubre_velacion_h}
                      onChange={e => set('cubre_velacion_h', e.target.value)}
                    />
                    <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:4 }}>
                      Cuántas horas dura el cuerpo en sala de velación con este plan.
                    </div>
                  </div>
                </div>
              </div>

              {/* Servicios del catálogo (Configuración > Servicios) */}
              <div className="pp-section">
                <div className="pp-section-title">Servicios del catálogo</div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>
                  Asigne a este plan los servicios reales configurados en Configuración → Servicios.
                  Si el servicio que necesita no existe, créelo aquí mismo sin salir del formulario.
                </div>

                <div style={{ position:'relative', marginBottom:10 }}>
                  <Search size={14} style={{ position:'absolute', left:10, top:10, color:'#94a3b8' }} />
                  <input
                    type="text"
                    value={buscarServ}
                    onChange={e => setBuscarServ(e.target.value)}
                    placeholder="Buscar servicio del catálogo…"
                    style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 12px 8px 32px', fontSize:13, outline:'none', boxSizing:'border-box' }}
                  />
                </div>

                <div style={{ display:'flex', flexWrap:'wrap', gap:8, maxHeight:180, overflowY:'auto', padding:'2px 2px 4px' }}>
                  {catalogo
                    .filter(s => s.nombre.toLowerCase().includes(buscarServ.toLowerCase()))
                    .map(s => {
                      const activo = form.servicios_ids.includes(s.id)
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleServicio(s.id)}
                          style={{
                            display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                            border:`1.5px solid ${activo ? '#059669' : '#e2e8f0'}`, borderRadius:20,
                            background: activo ? '#d1fae5' : '#fff', color: activo ? '#065f46' : '#475569',
                            fontSize:12.5, fontWeight:600, cursor:'pointer',
                          }}
                        >
                          {activo && <CheckCircle size={12}/>} {s.nombre}
                          <span style={{ opacity:.7 }}>· {fmt(s.precio_base)}</span>
                        </button>
                      )
                    })}
                  {catalogo.length === 0 && (
                    <span style={{ fontSize:12.5, color:'#94a3b8' }}>Aún no hay servicios configurados.</span>
                  )}
                </div>

                {form.servicios_ids.length > 0 && (
                  <div style={{ fontSize:11.5, color:'#059669', fontWeight:600, marginTop:8 }}>
                    {form.servicios_ids.length} servicio(s) asignado(s) a este plan
                  </div>
                )}

                {!nuevoServ ? (
                  <button
                    type="button"
                    onClick={() => setNuevoServ({ nombre: buscarServ, categoria: 'GENERAL', precio_base: '' })}
                    className="pp-add-extra"
                    style={{ marginTop:10 }}
                  >
                    <Package size={15}/> Crear servicio nuevo en el catálogo
                  </button>
                ) : (
                  <div style={{ marginTop:10, padding:12, border:'1.5px dashed #cbd5e1', borderRadius:10, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
                    <input
                      type="text" placeholder="Nombre del servicio"
                      value={nuevoServ.nombre}
                      onChange={e => setNuevoServ(n => ({ ...n, nombre: e.target.value }))}
                      style={{ flex:'2 1 160px', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none' }}
                    />
                    <select
                      value={nuevoServ.categoria}
                      onChange={e => setNuevoServ(n => ({ ...n, categoria: e.target.value }))}
                      style={{ flex:'1 1 120px', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'7px 10px', fontSize:13 }}
                    >
                      {CATEGORIAS_SERVICIO.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <CurrencyInput
                      placeholder="Precio"
                      value={nuevoServ.precio_base}
                      onChange={v => setNuevoServ(n => ({ ...n, precio_base: v }))}
                      style={{ flex:'1 1 100px' }}
                    />
                    <button type="button" onClick={crearServicioRapido} disabled={creandoServ}
                      className="pp-btn-save" style={{ padding:'7px 14px', fontSize:12.5 }}>
                      {creandoServ ? 'Creando…' : 'Crear y agregar'}
                    </button>
                    <button type="button" onClick={() => setNuevoServ(null)}
                      className="pp-btn-cancel" style={{ padding:'7px 14px', fontSize:12.5 }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Coberturas adicionales personalizadas */}
              <div className="pp-section">
                <div className="pp-section-title">Coberturas adicionales personalizadas</div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>
                  Agregue servicios extra que este plan incluye o excluye — aparecerán junto a la cobertura estándar.
                </div>
                {(form.coberturas_extra || []).length > 0 && (
                  <div className="pp-extra-list">
                    {(form.coberturas_extra || []).map((c, i) => (
                      <div key={i} className="pp-extra-item">
                        <input
                          type="text"
                          className="pp-field"
                          style={{ border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, flex:1, outline:'none' }}
                          value={c.nombre}
                          onChange={e => setExtra(i, 'nombre', e.target.value)}
                          placeholder="Ej: Música en vivo, Asesoría psicológica…"
                        />
                        <button
                          className={`pp-extra-toggle${c.incluido !== false ? ' on' : ''}`}
                          onClick={() => setExtra(i, 'incluido', c.incluido === false ? true : false)}
                          type="button"
                        >
                          {c.incluido !== false
                            ? <><CheckCircle size={13}/> Incluido</>
                            : <><XCircle size={13}/> No incluido</>}
                        </button>
                        <button className="pp-extra-del" onClick={() => removeExtra(i)} type="button">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="pp-add-extra" onClick={addExtra} type="button">
                  <PlusCircle size={15}/> Agregar cobertura personalizada
                </button>
              </div>

              {error && <div className="pp-error">{error}</div>}
            </div>

            <div className="pp-modal-foot">
              <button className="pp-btn-cancel" onClick={() => setModal(null)}>Cancelar</button>
              <button className="pp-btn-save" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : modal === 'nuevo' ? 'Crear plan' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
