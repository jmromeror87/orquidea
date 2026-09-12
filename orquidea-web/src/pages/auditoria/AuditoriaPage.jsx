/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Auditoría — actividad de usuarios                    ║
 * ║  Archivo         : AuditoriaPage.jsx                                    ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Registra acciones de negocio (login/logout, crear/actualizar/eliminar/
 * anular en cualquier módulo) con usuario, IP, navegador y sede — a
 * propósito NO registra clics sueltos ni navegación de solo-lectura, para
 * no convertir esto en vigilancia laboral. "En línea ahora" es una vista
 * de presencia (últimos 5 min de actividad), no un log histórico de
 * sesiones — con JWT no hay estado de sesión real en el servidor.
 */
import { useState, useEffect } from 'react'
import { ShieldAlert, Search, RefreshCw, ChevronLeft, ChevronRight, Circle, LogIn, LogOut, Plus, Pencil, Trash2, Ban } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const fmtFechaHora = (d) => d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
const hace = (d) => {
  const seg = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (seg < 60) return 'hace instantes'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  return `hace ${Math.floor(seg / 3600)} h`
}

const ACCION_INFO = {
  LOGIN:         { label: 'Inicio de sesión',   color: '#059669', bg: '#ECFDF5', Icon: LogIn },
  LOGIN_FALLIDO: { label: 'Intento fallido',    color: '#DC2626', bg: '#FEF2F2', Icon: LogIn },
  LOGOUT:        { label: 'Cierre de sesión',   color: '#6B7280', bg: '#F4F5FA', Icon: LogOut },
  CREAR:         { label: 'Creó',               color: '#2563EB', bg: '#EFF6FF', Icon: Plus },
  ACTUALIZAR:    { label: 'Actualizó',          color: '#D97706', bg: '#FFFBEB', Icon: Pencil },
  ELIMINAR:      { label: 'Eliminó',            color: '#DC2626', bg: '#FEF2F2', Icon: Trash2 },
  ANULAR:        { label: 'Anuló',              color: '#DC2626', bg: '#FEF2F2', Icon: Ban },
}

const CSS = `
  .aud-page { padding:28px 32px; }
  .aud-eyebrow { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:800;
    letter-spacing:1.2px; color:#7E22CE; background:#FAF5FF; padding:4px 12px; border-radius:20px; margin-bottom:10px; }
  .aud-head-row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; flex-wrap:wrap; }
  .aud-title { font-size:26px; font-weight:900; color:#0F1035; line-height:1.15; }
  .aud-sub   { font-size:13px; color:#9CA3AF; margin-top:5px; }

  .aud-tabs { display:flex; gap:6px; margin-bottom:18px; border-bottom:1.5px solid #ECEDF8; }
  .aud-tab { padding:9px 18px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:700;
    color:#9CA3AF; border-bottom:2.5px solid transparent; margin-bottom:-1.5px; }
  .aud-tab.active { color:#7E22CE; border-bottom-color:#7E22CE; }

  .btn-icon { background:#F4F5FA; border:1px solid #E8E9F8; border-radius:9px; width:34px; height:34px;
    display:inline-flex; align-items:center; justify-content:center; color:#7E22CE; cursor:pointer; flex-shrink:0; }
  .btn-icon:hover { background:#FAF5FF; }

  .sec-card { background:#fff; border-radius:20px; border:1px solid #ECEDF8; box-shadow:0 1px 4px rgba(0,0,0,.04); overflow:hidden; }
  .sec-body { padding:22px 24px 26px; }

  .aud-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:18px; flex-wrap:wrap; }
  .aud-search { position:relative; flex:1; min-width:220px; }
  .aud-search input { width:100%; padding:10px 14px 10px 34px; border:1.5px solid #E2E5F0;
    border-radius:11px; font-size:13.5px; outline:none; box-sizing:border-box; background:#FAFBFF; }
  .aud-search svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none; }
  .select-filter { padding:10px 14px; border:1.5px solid #E2E5F0; border-radius:11px;
    font-size:13.5px; font-family:inherit; outline:none; background:#FAFBFF; color:#374151; }

  .tbl-wrap { border:1px solid #ECEDF8; border-radius:14px; overflow:auto; }
  .tbl { width:100%; border-collapse:collapse; min-width:820px; }
  .tbl th { padding:11px 16px; background:#F8F9FF; font-size:10px; font-weight:800;
    color:#9CA3AF; text-transform:uppercase; letter-spacing:.8px; text-align:left; border-bottom:1px solid #ECEDF8; white-space:nowrap; }
  .tbl td { padding:11px 16px; font-size:13px; color:#374151; border-bottom:1px solid #F4F5FA; vertical-align:middle; }
  .tbl tr:last-child td { border-bottom:none; }
  .tbl tr:hover td { background:#FAFBFF; }
  .badge { display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .aud-ip { font-family:ui-monospace,monospace; font-size:12px; color:#6B7280; }

  .aud-empty { text-align:center; padding:50px 0; color:#9CA3AF; font-size:13px; }
  .aud-pager { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
  .aud-pager-info { font-size:11.5px; color:#9CA3AF; }

  .en-linea-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
  .en-linea-card { border:1.5px solid #ECEDF8; border-radius:14px; padding:14px 16px; background:#fff; }
  .pulso { display:inline-block; width:8px; height:8px; border-radius:50%; background:#059669; margin-right:6px;
    box-shadow:0 0 0 0 rgba(5,150,105,.5); animation:pulso 1.8s infinite; }
  @keyframes pulso { 0% { box-shadow:0 0 0 0 rgba(5,150,105,.4) } 70% { box-shadow:0 0 0 8px rgba(5,150,105,0) } 100% { box-shadow:0 0 0 0 rgba(5,150,105,0) } }
`

// ── Tab: quién está conectado ahora mismo ───────────────────────────────────
function TabEnLinea() {
  const [conectados, setConectados] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    try {
      const r = await api.get('/auditoria/en-linea')
      setConectados(r.data.data || [])
    } catch { toast.error('No se pudo cargar quién está en línea') } finally { setLoading(false) }
  }

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 10_000) // "tiempo real" vía sondeo cada 10s
    return () => clearInterval(t)
  }, [])

  return (
    <div className="sec-card">
      <div className="sec-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            <span className="pulso" /> Actividad en los últimos 5 minutos — se actualiza solo cada 10 segundos
          </div>
          <button className="btn-icon" onClick={cargar} title="Actualizar ahora"><RefreshCw size={15} /></button>
        </div>

        {loading ? (
          <div className="aud-empty">Cargando…</div>
        ) : conectados.length === 0 ? (
          <div className="aud-empty">Nadie ha tenido actividad en los últimos 5 minutos.</div>
        ) : (
          <div className="en-linea-grid">
            {conectados.map(c => (
              <div key={c.usuario_id} className="en-linea-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="pulso" />
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0F1035' }}>{c.nombre}</div>
                </div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 2 }}>{c.rol}</div>
                <div className="aud-ip" style={{ marginBottom: 2 }}>{c.ip}</div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{c.navegador_legible}</div>
                <div style={{ fontSize: 11, color: '#B0B4D0', marginTop: 6 }}>Visto {hace(c.ultima_actividad)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab: bitácora histórica de actividad ────────────────────────────────────
function TabBitacora() {
  const [registros, setRegistros] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [accion, setAccion] = useState('')
  const [modulo, setModulo] = useState('')
  const [modulosDisponibles, setModulosDisponibles] = useState([])
  const [pagina, setPagina] = useState(1)
  const LIMIT = 30

  useEffect(() => { api.get('/auditoria/opciones').then(r => setModulosDisponibles(r.data.data?.modulos || [])).catch(() => {}) }, [])

  const cargar = async (p = pagina) => {
    setLoading(true)
    try {
      const params = { page: p, limit: LIMIT }
      if (q.trim()) params.q = q.trim()
      if (accion) params.accion = accion
      if (modulo) params.modulo = modulo
      const r = await api.get('/auditoria/log', { params })
      setRegistros(r.data.data || [])
      setMeta(r.data.meta || null)
    } catch { toast.error('No se pudo cargar la bitácora de auditoría') } finally { setLoading(false) }
  }

  useEffect(() => { cargar(1); setPagina(1) }, [accion, modulo])
  useEffect(() => { const t = setTimeout(() => { cargar(1); setPagina(1) }, 300); return () => clearTimeout(t) }, [q])
  useEffect(() => { cargar(pagina) }, [pagina])

  const totalPaginas = Math.max(1, Math.ceil((meta?.total || 0) / LIMIT))

  return (
    <div className="sec-card">
      <div className="sec-body">
        <div className="aud-toolbar">
          <div className="aud-search">
            <Search size={14} color="#9CA3AF" />
            <input placeholder="Buscar por usuario, descripción o ruta…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="select-filter" value={accion} onChange={e => setAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {Object.entries(ACCION_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="select-filter" value={modulo} onChange={e => setModulo(e.target.value)}>
            <option value="">Todos los módulos</option>
            {modulosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn-icon" onClick={() => cargar()} title="Actualizar"><RefreshCw size={15} /></button>
        </div>

        {loading ? (
          <div className="aud-empty">Cargando bitácora…</div>
        ) : registros.length === 0 ? (
          <div className="aud-empty">Sin actividad registrada con estos filtros.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Descripción / ruta</th><th>IP</th><th>Navegador</th></tr>
              </thead>
              <tbody>
                {registros.map(r => {
                  const ai = ACCION_INFO[r.accion] || { label: r.accion, color: '#6B7280', bg: '#F4F5FA', Icon: Circle }
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(r.creado_en)}</td>
                      <td>{r.usuario_nombre || '—'}</td>
                      <td><span className="badge" style={{ background: ai.bg, color: ai.color }}><ai.Icon size={11} /> {ai.label}</span></td>
                      <td style={{ textTransform: 'capitalize' }}>{r.modulo || '—'}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6B7280' }}>
                        {r.descripcion || r.ruta || '—'}
                      </td>
                      <td className="aud-ip">{r.ip || '—'}</td>
                      <td style={{ fontSize: 12, color: '#9CA3AF' }}>{r.navegador_legible}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="aud-pager">
            <span className="aud-pager-info">Página {pagina} de {totalPaginas} · {meta?.total} registros</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-icon" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                style={{ opacity: pagina === 1 ? .4 : 1 }}><ChevronLeft size={14} /></button>
              <button className="btn-icon" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                style={{ opacity: pagina === totalPaginas ? .4 : 1 }}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuditoriaPage() {
  const [tab, setTab] = useState('linea')

  return (
    <div className="aud-page">
      <style>{CSS}</style>
      <div className="aud-eyebrow"><ShieldAlert size={12} /> AUDITORÍA</div>
      <div className="aud-head-row">
        <div>
          <div className="aud-title">Actividad de usuarios</div>
          <div className="aud-sub">Quién entró, desde dónde, y qué creó/editó/eliminó en el sistema</div>
        </div>
      </div>

      <div className="aud-tabs">
        <button className={`aud-tab${tab === 'linea' ? ' active' : ''}`} onClick={() => setTab('linea')}>En línea ahora</button>
        <button className={`aud-tab${tab === 'log' ? ' active' : ''}`} onClick={() => setTab('log')}>Bitácora de actividad</button>
      </div>

      {tab === 'linea' ? <TabEnLinea /> : <TabBitacora />}
    </div>
  )
}
