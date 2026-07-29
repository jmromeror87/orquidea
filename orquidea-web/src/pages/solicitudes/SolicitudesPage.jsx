/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Solicitudes (CRM de leads de la landing)            ║
 * ║  Archivo         : SolicitudesPage.jsx                                 ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Phone, Mail, MessageSquare, RefreshCw, Loader2, X,
  Trash2, Globe, Clock,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const ESTADOS = [
  { key: 'NUEVO',          label: 'Nuevo',          color: '#DB2777', bg: '#FCE7F3' },
  { key: 'CONTACTADO',     label: 'Contactado',     color: '#D97706', bg: '#FEF3C7' },
  { key: 'EN_NEGOCIACION', label: 'En negociación', color: '#0891B2', bg: '#CFFAFE' },
  { key: 'CONVERTIDO',     label: 'Convertido',     color: '#059669', bg: '#D1FAE5' },
  { key: 'DESCARTADO',     label: 'Descartado',     color: '#6B7280', bg: '#F3F4F6' },
]

const CSS = `
  .sl-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
  .sl-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px; flex-shrink:0;
    display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
  .sl-head-icon { width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#DB2777,#BE185D);
    display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(219,39,119,.3); flex-shrink:0; }
  .sl-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
  .sl-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
  .sl-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; border-radius:12px;
    font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .15s; background:#fff;
    color:#4B5563; border:1.5px solid #E5E7EB; }
  .sl-btn:hover { background:#F4F5FA; }
  .sl-spin { animation: sl-spin .8s linear infinite; }
  @keyframes sl-spin { to { transform:rotate(360deg); } }
  .sl-tabs { display:flex; gap:8px; padding:14px 24px 0; flex-shrink:0; overflow-x:auto; }
  .sl-tab { padding:7px 14px; border-radius:999px; font-size:12px; font-weight:700; cursor:pointer;
    border:1.5px solid #E5E7EB; background:#fff; color:#6B7280; white-space:nowrap; transition:all .15s; }
  .sl-tab.active { border-color:transparent; }
  .sl-list { flex:1; overflow-y:auto; padding:16px 24px 24px; display:flex; flex-direction:column; gap:10px; }
  .sl-empty { display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:10px; padding:60px 20px; color:#9CA3AF; font-size:13px; text-align:center; }
  .sl-card { background:#fff; border-radius:14px; border:1.5px solid #ECEDF8; padding:16px 18px;
    display:flex; align-items:center; gap:16px; transition:box-shadow .15s; cursor:pointer; }
  .sl-card:hover { box-shadow:0 6px 16px rgba(15,16,53,.06); }
  .sl-avatar { width:42px; height:42px; border-radius:12px; background:#FCE7F3; color:#DB2777;
    display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; flex-shrink:0; }
  .sl-info { flex:1; min-width:0; }
  .sl-nombre { font-size:14px; font-weight:800; color:#0F1035; }
  .sl-meta { display:flex; flex-wrap:wrap; gap:12px; margin-top:3px; font-size:12px; color:#9CA3AF; }
  .sl-meta span { display:flex; align-items:center; gap:4px; }
  .sl-badge { font-size:11px; font-weight:800; padding:4px 10px; border-radius:999px; flex-shrink:0; }
  .sl-overlay { position:fixed; inset:0; background:rgba(15,16,53,.45); display:flex; align-items:center;
    justify-content:center; z-index:100; padding:20px; }
  .sl-modal { background:#fff; border-radius:20px; width:100%; max-width:460px; max-height:88vh;
    overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); }
  .sl-modal-head { display:flex; align-items:center; justify-content:space-between; padding:18px 22px;
    border-bottom:1px solid #ECEDF8; }
  .sl-modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }
  .sl-row { display:flex; align-items:center; gap:10px; font-size:13px; color:#374151; }
  .sl-icon-btn { width:30px; height:30px; border-radius:9px; border:1.5px solid #E5E7EB; background:#fff;
    display:flex; align-items:center; justify-content:center; cursor:pointer; color:#6B7280; }
  .sl-estado-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .sl-estado-btn { padding:8px 10px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;
    border:1.5px solid transparent; text-align:center; }
  .sl-textarea { width:100%; padding:9px 12px; border-radius:10px; border:1.5px solid #E5E7EB;
    font-size:13px; font-family:inherit; min-height:70px; resize:vertical; }
`

export default function SolicitudesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [seleccionado, setSeleccionado] = useState(null)

  const cargar = useCallback(async (estado = filtro) => {
    setLoading(true)
    try {
      const res = await api.get('/leads', { params: estado ? { estado } : {} })
      setItems(res.data?.data || [])
    } catch (e) {
      toast.error('No se pudo cargar la lista')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { cargar() }, [cargar])

  const cambiarFiltro = (estado) => { setFiltro(estado); cargar(estado) }

  const actualizarEstado = async (id, estado) => {
    try {
      await api.patch(`/leads/${id}`, { estado })
      toast.success('Solicitud actualizada')
      setSeleccionado(null)
      cargar()
    } catch (e) {
      toast.error('No se pudo actualizar')
    }
  }

  const eliminar = async (item) => {
    if (!confirm(`¿Eliminar la solicitud de "${item.nombre}"?`)) return
    try {
      await api.delete(`/leads/${item.id}`)
      toast.success('Eliminada')
      setSeleccionado(null)
      cargar()
    } catch (e) {
      toast.error('No se pudo eliminar')
    }
  }

  const metaEstado = (key) => ESTADOS.find((e) => e.key === key) || ESTADOS[0]

  return (
    <>
      <style>{CSS}</style>
      <div className="sl-page">
        <div className="sl-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="sl-head-icon"><UserPlus size={22} color="#fff" /></div>
            <div>
              <div className="sl-titulo">Solicitudes</div>
              <div className="sl-sub">Prospectos que llegan desde el formulario de la página web</div>
            </div>
          </div>
          <button className="sl-btn" onClick={() => cargar()}>
            <RefreshCw size={14} className={loading ? 'sl-spin' : ''} /> Recargar
          </button>
        </div>

        <div className="sl-tabs">
          <div
            className="sl-tab"
            style={filtro === '' ? { background: '#0F1035', color: '#fff' } : {}}
            onClick={() => cambiarFiltro('')}
          >
            Todas
          </div>
          {ESTADOS.map((e) => (
            <div
              key={e.key}
              className="sl-tab"
              style={filtro === e.key ? { background: e.color, color: '#fff' } : {}}
              onClick={() => cambiarFiltro(e.key)}
            >
              {e.label}
            </div>
          ))}
        </div>

        <div className="sl-list">
          {loading && items.length === 0 ? (
            <div className="sl-empty"><Loader2 size={32} className="sl-spin" color="#DB2777" /><p>Cargando…</p></div>
          ) : items.length === 0 ? (
            <div className="sl-empty">
              <div style={{ width: 64, height: 64, borderRadius: 18, background: '#FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={28} color="#DB2777" />
              </div>
              <p>Sin solicitudes {filtro ? `en estado "${metaEstado(filtro).label}"` : ''}</p>
              <span>Aparecerán aquí automáticamente cuando alguien llene el formulario en la página web</span>
            </div>
          ) : (
            items.map((it) => {
              const meta = metaEstado(it.estado)
              return (
                <div key={it.id} className="sl-card" onClick={() => setSeleccionado(it)}>
                  <div className="sl-avatar">{it.nombre?.charAt(0)?.toUpperCase()}</div>
                  <div className="sl-info">
                    <div className="sl-nombre">{it.nombre}</div>
                    <div className="sl-meta">
                      <span><Phone size={12} /> {it.telefono}</span>
                      {it.correo && <span><Mail size={12} /> {it.correo}</span>}
                      <span><Globe size={12} /> {it.origen}</span>
                      <span><Clock size={12} /> {new Date(it.creado_en).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                  <span className="sl-badge" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {seleccionado && (
        <div className="sl-overlay" onClick={() => setSeleccionado(null)}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-modal-head">
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F1035' }}>{seleccionado.nombre}</div>
              <button className="sl-icon-btn" onClick={() => setSeleccionado(null)}><X size={16} /></button>
            </div>
            <div className="sl-modal-body">
              <div className="sl-row"><Phone size={14} color="#9CA3AF" /> <a href={`tel:${seleccionado.telefono}`}>{seleccionado.telefono}</a></div>
              {seleccionado.correo && <div className="sl-row"><Mail size={14} color="#9CA3AF" /> {seleccionado.correo}</div>}
              <div className="sl-row"><Globe size={14} color="#9CA3AF" /> Origen: {seleccionado.origen}</div>
              <div className="sl-row"><Clock size={14} color="#9CA3AF" /> {new Date(seleccionado.creado_en).toLocaleString('es-CO')}</div>
              {seleccionado.mensaje && (
                <div className="sl-row" style={{ alignItems: 'flex-start' }}>
                  <MessageSquare size={14} color="#9CA3AF" style={{ marginTop: 2 }} />
                  <span>{seleccionado.mensaje}</span>
                </div>
              )}

              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>Cambiar estado</p>
                <div className="sl-estado-grid">
                  {ESTADOS.map((e) => (
                    <button
                      key={e.key}
                      className="sl-estado-btn"
                      style={{
                        color: e.color, background: e.bg,
                        borderColor: seleccionado.estado === e.key ? e.color : 'transparent',
                      }}
                      onClick={() => actualizarEstado(seleccionado.id, e.key)}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <a
                href={`https://wa.me/57${seleccionado.telefono.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="sl-btn"
                style={{ justifyContent: 'center', background: '#25D366', color: '#fff', border: 'none' }}
              >
                <MessageSquare size={14} /> Escribir por WhatsApp
              </a>

              <button
                className="sl-btn"
                style={{ justifyContent: 'center', color: '#DC2626' }}
                onClick={() => eliminar(seleccionado)}
              >
                <Trash2 size={14} /> Eliminar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
