/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Memoriales — conmemoraciones publicadas en el sitio ║
 * ║  Archivo         : MemorialesPage.jsx                                  ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Flower2, Plus, X, Loader2, Edit2, Trash2, RefreshCw, Image as ImageIcon,
  Power, Calendar, Church,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '')

const TIPO_META = {
  NOVENARIO:   { label: 'Novenario',   color: '#7C3AED', bg: '#F5F3FF' },
  ANIVERSARIO: { label: 'Aniversario', color: '#0891B2', bg: '#CFFAFE' },
  MISA:        { label: 'Misa',        color: '#B45309', bg: '#FEF3C7' },
  OTRO:        { label: 'Otro',        color: '#6B7280', bg: '#F3F4F6' },
}

const BLANK = { nombre: '', tipo: 'NOVENARIO', fecha_evento: '', mensaje: '', foto_url: '', activo: true }

const CSS = `
  .mm-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
  .mm-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px; flex-shrink:0;
    display:flex; align-items:center; justify-content:space-between; }
  .mm-head-icon { width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#312E81,#4C1D95);
    display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(76,29,149,.3); flex-shrink:0; }
  .mm-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
  .mm-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .mm-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px;
    font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .15s; }
  .mm-btn-primary { background:linear-gradient(135deg,#312E81,#4C1D95); color:#fff; box-shadow:0 3px 10px rgba(76,29,149,.3); }
  .mm-btn-ghost { background:#fff; color:#4B5563; border:1.5px solid #E5E7EB; }
  .mm-btn:hover { filter:brightness(1.06); }
  .mm-spin { animation: mm-spin .8s linear infinite; }
  @keyframes mm-spin { to { transform:rotate(360deg); } }
  .mm-list { flex:1; overflow-y:auto; padding:22px 24px; display:grid; gap:16px;
    grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); align-content:start; }
  .mm-empty { grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:10px; padding:60px 20px; color:#9CA3AF; font-size:13px; text-align:center; }
  .mm-card { background:#fff; border-radius:16px; border:1.5px solid #ECEDF8; overflow:hidden;
    display:flex; flex-direction:column; transition:box-shadow .15s, transform .15s; }
  .mm-card:hover { box-shadow:0 8px 20px rgba(15,16,53,.08); transform:translateY(-2px); }
  .mm-card-foto { width:100%; aspect-ratio:4/3; background:#EEF0FB linear-gradient(135deg,#EEF0FB,#E4E7FA);
    display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .mm-card-foto img { width:100%; height:100%; object-fit:cover; }
  .mm-card-body { padding:14px 16px; flex:1; display:flex; flex-direction:column; gap:6px; }
  .mm-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:800;
    padding:3px 9px; border-radius:999px; width:fit-content; }
  .mm-nombre { font-size:15px; font-weight:800; color:#0F1035; }
  .mm-fecha { font-size:12px; color:#9CA3AF; display:flex; align-items:center; gap:5px; }
  .mm-card-actions { display:flex; gap:6px; padding:10px 16px; border-top:1px solid #F3F4F6; }
  .mm-icon-btn { width:30px; height:30px; border-radius:9px; border:1.5px solid #E5E7EB; background:#fff;
    display:flex; align-items:center; justify-content:center; cursor:pointer; color:#6B7280; }
  .mm-icon-btn:hover { background:#F7F8FC; }
  .mm-icon-btn.off { opacity:.45; }
  .mm-overlay { position:fixed; inset:0; background:rgba(15,16,53,.45); display:flex; align-items:center;
    justify-content:center; z-index:100; padding:20px; }
  .mm-modal { background:#fff; border-radius:20px; width:100%; max-width:480px; max-height:90vh;
    overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); }
  .mm-modal-head { display:flex; align-items:center; justify-content:space-between; padding:18px 22px;
    border-bottom:1px solid #ECEDF8; position:sticky; top:0; background:#fff; }
  .mm-modal-titulo { font-size:16px; font-weight:800; color:#0F1035; }
  .mm-modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }
  .mm-field label { font-size:12px; font-weight:700; color:#6B7280; margin-bottom:5px; display:block; }
  .mm-field input, .mm-field select, .mm-field textarea { width:100%; padding:9px 12px; border-radius:10px;
    border:1.5px solid #E5E7EB; font-size:13px; font-family:inherit; }
  .mm-field textarea { resize:vertical; min-height:70px; }
  .mm-foto-drop { border:2px dashed #E5E7EB; border-radius:14px; padding:16px; text-align:center;
    cursor:pointer; color:#9CA3AF; font-size:12px; }
  .mm-foto-drop img { max-height:140px; border-radius:10px; margin-bottom:8px; }
  .mm-modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:16px 22px;
    border-top:1px solid #ECEDF8; position:sticky; bottom:0; background:#fff; }
  .mm-toggle-row { display:flex; align-items:center; justify-content:space-between; background:#F7F8FC;
    border-radius:12px; padding:10px 14px; }
`

export default function MemorialesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/memoriales')
      setItems(res.data?.data || [])
    } catch (e) {
      toast.error('No se pudo cargar la lista')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (item) => {
    try {
      await api.patch(`/memoriales/${item.id}`, { activo: !item.activo })
      toast.success(item.activo ? 'Oculto del sitio web' : 'Publicado en el sitio web')
      cargar()
    } catch (e) {
      toast.error('No se pudo actualizar')
    }
  }

  const eliminar = async (item) => {
    if (!confirm(`¿Eliminar el memorial de "${item.nombre}"?`)) return
    try {
      await api.delete(`/memoriales/${item.id}`)
      toast.success('Eliminado')
      cargar()
    } catch (e) {
      toast.error('No se pudo eliminar')
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="mm-page">
        <div className="mm-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="mm-head-icon"><Flower2 size={22} color="#fff" /></div>
            <div>
              <div className="mm-titulo">Memoriales</div>
              <div className="mm-sub">Novenarios, aniversarios y misas publicados en el sitio web</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="mm-btn mm-btn-ghost" onClick={cargar} title="Recargar">
              <RefreshCw size={14} className={loading ? 'mm-spin' : ''} />
            </button>
            <button className="mm-btn mm-btn-primary" onClick={() => { setSeleccionado(null); setModal(true) }}>
              <Plus size={15} /> Nuevo memorial
            </button>
          </div>
        </div>

        <div className="mm-list">
          {loading && items.length === 0 ? (
            <div className="mm-empty"><Loader2 size={32} className="mm-spin" color="#4C1D95" /><p>Cargando…</p></div>
          ) : items.length === 0 ? (
            <div className="mm-empty">
              <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flower2 size={28} color="#4C1D95" />
              </div>
              <p>Sin memoriales registrados</p>
              <span>Crea el primero para que aparezca en el slider del sitio web</span>
            </div>
          ) : (
            items.map((m) => {
              const meta = TIPO_META[m.tipo] || TIPO_META.OTRO
              return (
                <div key={m.id} className="mm-card">
                  <div className="mm-card-foto">
                    {m.foto_url
                      ? <img src={`${API_ORIGIN}${m.foto_url}`} alt={m.nombre} />
                      : <ImageIcon size={32} color="#C7CBEB" />}
                  </div>
                  <div className="mm-card-body">
                    <span className="mm-badge" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    <div className="mm-nombre">{m.nombre}</div>
                    <div className="mm-fecha"><Calendar size={12} /> {new Date(m.fecha_evento).toLocaleDateString('es-CO')}</div>
                  </div>
                  <div className="mm-card-actions">
                    <button className="mm-icon-btn" onClick={() => { setSeleccionado(m); setModal(true) }} title="Editar">
                      <Edit2 size={14} />
                    </button>
                    <button className={`mm-icon-btn ${m.activo ? '' : 'off'}`} onClick={() => toggleActivo(m)} title={m.activo ? 'Publicado — clic para ocultar' : 'Oculto — clic para publicar'}>
                      <Power size={14} color={m.activo ? '#059669' : '#9CA3AF'} />
                    </button>
                    <button className="mm-icon-btn" onClick={() => eliminar(m)} title="Eliminar">
                      <Trash2 size={14} color="#DC2626" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {modal && (
        <ModalMemorial
          memorial={seleccionado}
          onClose={() => { setModal(false); setSeleccionado(null) }}
          onSaved={() => { setModal(false); setSeleccionado(null); cargar() }}
        />
      )}
    </>
  )
}

function ModalMemorial({ memorial, onClose, onSaved }) {
  const [form, setForm] = useState(memorial
    ? { ...BLANK, ...memorial, fecha_evento: memorial.fecha_evento?.slice(0, 10) || '' }
    : BLANK)
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/memoriales/foto', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      set('foto_url', res.data.url)
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo subir la foto')
    } finally {
      setSubiendo(false)
    }
  }

  const guardar = async () => {
    if (!form.nombre.trim() || !form.fecha_evento) {
      toast.error('Nombre y fecha son requeridos')
      return
    }
    setGuardando(true)
    try {
      if (memorial) {
        await api.patch(`/memoriales/${memorial.id}`, form)
      } else {
        await api.post('/memoriales', form)
      }
      toast.success('Memorial guardado')
      onSaved()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mm-overlay" onClick={onClose}>
      <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mm-modal-head">
          <div className="mm-modal-titulo">{memorial ? 'Editar memorial' : 'Nuevo memorial'}</div>
          <button className="mm-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="mm-modal-body">
          <div className="mm-field">
            <label>Foto</label>
            <div className="mm-foto-drop" onClick={() => fileRef.current?.click()}>
              {form.foto_url
                ? <img src={`${API_ORIGIN}${form.foto_url}`} alt="" />
                : <div style={{ padding: '20px 0' }}><ImageIcon size={26} /><p>Clic para subir foto</p></div>}
              {subiendo && <p>Subiendo…</p>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFoto} />
          </div>

          <div className="mm-field">
            <label>Nombre completo</label>
            <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre del difunto" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="mm-field">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {Object.entries(TIPO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="mm-field">
              <label>Fecha del evento</label>
              <input type="date" value={form.fecha_evento} onChange={(e) => set('fecha_evento', e.target.value)} />
            </div>
          </div>

          <div className="mm-field">
            <label>Mensaje (opcional)</label>
            <textarea value={form.mensaje || ''} onChange={(e) => set('mensaje', e.target.value)} placeholder="La familia invita a orar por su eterno descanso…" />
          </div>

          <div className="mm-toggle-row">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
              <Church size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Publicado en el sitio web
            </span>
            <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} />
          </div>
        </div>
        <div className="mm-modal-foot">
          <button className="mm-btn mm-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="mm-btn mm-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? <Loader2 size={14} className="mm-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
