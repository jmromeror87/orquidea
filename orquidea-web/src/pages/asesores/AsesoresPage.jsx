/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Asesores Comerciales                             ║
 * ║  Archivo         : AsesoresPage.jsx                                 ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-24                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Percent, Users, Wallet, CheckCircle2, Clock, X, Settings,
  Check, Ban, DollarSign, Search, RefreshCw, TrendingUp,
} from 'lucide-react'
import api from '../../services/api.js'
import PercentInput from '../../components/ui/PercentInput.jsx'
import { toast } from '../../store/toast.store.js'
import { useAuthStore } from '../../store/auth.store.js'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const ESTADO_META = {
  PENDIENTE: { label: 'Pendiente', color: '#D97706', bg: '#FEF3C7' },
  PAGADA:    { label: 'Pagada',    color: '#059669', bg: '#D1FAE5' },
  ANULADA:   { label: 'Anulada',   color: '#EF4444', bg: '#FEE2E2' },
}

const AVATAR_GRAD = ['linear-gradient(135deg,#EC4899,#BE185D)', 'linear-gradient(135deg,#6366F1,#4338CA)',
  'linear-gradient(135deg,#0EA5E9,#0369A1)', 'linear-gradient(135deg,#F59E0B,#D97706)',
  'linear-gradient(135deg,#059669,#047857)', 'linear-gradient(135deg,#8B5CF6,#6D28D9)']
const gradFor = (id) => AVATAR_GRAD[[...(id || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRAD.length]
const iniciales = (nombre) => (nombre || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

const CSS = `
.as-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
.as-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px 14px; flex-shrink:0; }
.as-head-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:12px; }
.as-head-left { display:flex; align-items:center; gap:12px; }
.as-head-icon { width:44px; height:44px; border-radius:14px;
  background:linear-gradient(135deg,#EC4899,#BE185D);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 12px rgba(190,24,93,.3); flex-shrink:0; }
.as-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
.as-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
.as-btn-cfg { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px;
  font-size:13px; font-weight:700; cursor:pointer; border:1.5px solid #E2E5F0; background:#fff; color:#374151; transition:all .15s; }
.as-btn-cfg:hover { border-color:#BE185D; color:#BE185D; background:#FDF2F8; }

.as-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.as-kpi { background:#fff; border-radius:16px; overflow:hidden; border:1.5px solid #ECEDF8; transition:all .2s; }
.as-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.08); }
.as-kpi-bar { height:3px; }
.as-kpi-body { padding:14px 16px 12px; }
.as-kpi-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
.as-kpi-val { font-size:24px; font-weight:900; color:#0F1035; line-height:1; letter-spacing:-.5px; }
.as-kpi-label { font-size:11px; color:#9CA3AF; font-weight:600; margin-top:4px; }

.as-body { flex:1; overflow:auto; padding:20px 24px; }
.as-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
.as-search { position:relative; flex:1; max-width:320px; }
.as-search input { width:100%; padding:9px 12px 9px 36px; border:1.5px solid #E2E5F0;
  border-radius:12px; font-size:13px; outline:none; background:#FAFBFF; transition:all .15s; box-sizing:border-box; }
.as-search input:focus { border-color:#BE185D; box-shadow:0 0 0 3px rgba(190,24,93,.1); background:#fff; }
.as-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; pointer-events:none; }
.as-refresh { width:36px; height:36px; border-radius:12px; border:1.5px solid #E2E5F0; background:#fff;
  display:flex; align-items:center; justify-content:center; cursor:pointer; color:#6B7280; transition:all .15s; flex-shrink:0; }
.as-refresh:hover { background:#EEF2FF; color:#2E3192; border-color:#C7CAE8; }

.as-table-wrap { background:#fff; border-radius:16px; border:1.5px solid #ECEDF8; overflow:hidden; }
.as-table { width:100%; border-collapse:collapse; }
.as-table th { text-align:left; font-size:10.5px; font-weight:800; color:#9CA3AF; letter-spacing:.6px; text-transform:uppercase; padding:12px 16px; background:#F7F8FC; }
.as-table tbody tr { transition:background .12s; }
.as-table tbody tr:hover { background:#FDF2F8; }
.as-table td { padding:13px 16px; font-size:13.5px; color:#374151; border-top:1px solid #F4F5FA; vertical-align:middle; }
.as-quien { display:flex; align-items:center; gap:10px; }
.as-avatar { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;
  color:#fff; font-weight:800; font-size:13px; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,.15); }
.as-nombre { font-weight:700; color:#0F1035; }
.as-email { font-size:11.5px; color:#9CA3AF; margin-top:1px; }
.as-pct { display:inline-flex; align-items:center; gap:6px; }
.as-pct input { width:64px; border:1.5px solid #E2E5F0; border-radius:8px; padding:5px 8px; font-size:13px; outline:none; }
.as-pct input:focus { border-color:#BE185D; }
.as-pct-save { width:26px; height:26px; border-radius:7px; border:none; background:#D1FAE5; color:#059669;
  display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
.as-pct-save:hover { background:#A7F3D0; }
.as-pct-badge { display:inline-flex; align-items:center; gap:4px; font-size:12.5px; font-weight:800; color:#BE185D;
  background:#FDF2F8; padding:3px 10px; border-radius:20px; }
.as-link { background:none; border:none; color:#BE185D; font-weight:700; font-size:12.5px; cursor:pointer; padding:0; }
.as-link:hover { text-decoration:underline; }
.as-empty { text-align:center; padding:60px 20px; color:#9CA3AF; }

.as-overlay { position:fixed; inset:0; background:rgba(15,16,53,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(2px); }
.as-modal { background:#fff; border-radius:18px; width:100%; max-width:640px; max-height:88vh; overflow-y:auto; box-shadow:0 24px 60px rgba(0,0,0,.28); }
.as-modal.sm { max-width:380px; }
.as-mhead { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1.5px solid #ECEDF8; }
.as-mtitle { font-size:16px; font-weight:800; color:#0F1035; display:flex; align-items:center; gap:10px; }
.as-mclose { background:#F4F5FA; border:none; width:30px; height:30px; border-radius:9px; cursor:pointer; color:#6B7280; display:flex; align-items:center; justify-content:center; }
.as-mclose:hover { background:#FEE2E2; color:#EF4444; }
.as-mbody { padding:20px 22px; }
.as-field label { display:block; font-size:12px; font-weight:700; color:#374151; margin-bottom:6px; }
.as-field input { width:100%; border:1.5px solid #E2E5F0; border-radius:10px; padding:10px 12px; font-size:14px; box-sizing:border-box; outline:none; }
.as-field input:focus { border-color:#BE185D; box-shadow:0 0 0 3px rgba(190,24,93,.1); }
.as-mfoot { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid #F4F5FA; }
.as-btn-cancel { padding:9px 18px; border:1.5px solid #E2E5F0; border-radius:10px; background:#fff; color:#374151; font-size:13px; font-weight:700; cursor:pointer; }
.as-btn-cancel:hover { background:#F4F5FA; }
.as-btn-save { padding:9px 20px; border:none; border-radius:10px; background:linear-gradient(135deg,#EC4899,#BE185D); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 10px rgba(190,24,93,.3); }
.as-btn-save:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(190,24,93,.4); }
.as-btn-save:disabled { opacity:.6; cursor:not-allowed; transform:none; }

.as-com-row { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid #F4F5FA; gap:10px; }
.as-com-row:last-child { border-bottom:none; }
.as-com-tipo { font-size:10.5px; font-weight:800; color:#9CA3AF; text-transform:uppercase; letter-spacing:.4px; }
.as-com-num { font-size:13.5px; font-weight:700; color:#0F1035; margin-top:2px; }
.as-com-val { font-size:15px; font-weight:900; color:#0F1035; }
.as-chip { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:20px; margin-top:4px; }
.as-com-acts { display:flex; gap:6px; }
.as-act { width:28px; height:28px; border-radius:8px; border:1.5px solid #E2E5F0; background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#6B7280; transition:all .15s; }
.as-act:hover { background:#F4F5FA; }
.as-act.pagar:hover { border-color:#059669; color:#059669; background:#F0FDF4; }
.as-act.anular:hover { border-color:#EF4444; color:#EF4444; background:#FEF2F2; }
`

export default function AsesoresPage() {
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin', 'administrador'].includes(usuario?.rol)

  const [asesores, setAsesores] = useState([])
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editPct, setEditPct] = useState({})
  const [modalConfig, setModalConfig] = useState(false)
  const [config, setConfig] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const asesoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return asesores
    return asesores.filter(a => a.nombre.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
  }, [asesores, busqueda])

  const cargar = useCallback(() => {
    setLoading(true)
    Promise.all([api.get('/asesores'), api.get('/asesores/kpis')])
      .then(([a, k]) => { setAsesores(a.data.data); setKpis(k.data.data) })
      .catch(() => toast.error('Error al cargar los asesores'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardarPct = async (id) => {
    const valor = editPct[id]
    try {
      await api.put(`/asesores/${id}/comision`, { porcentaje_comision: valor === '' ? null : valor })
      toast.success('Porcentaje de comisión actualizado con éxito')
      setEditPct(p => { const n = { ...p }; delete n[id]; return n })
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al actualizar el porcentaje')
    }
  }

  const abrirDetalle = async (asesor) => {
    try {
      const r = await api.get(`/asesores/${asesor.id}/comisiones`)
      setDetalle({ asesor, comisiones: r.data.data })
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al cargar las comisiones')
    }
  }

  const pagar = async (id) => {
    try {
      await api.patch(`/asesores/comisiones/${id}/pagar`)
      toast.success('Comisión marcada como pagada')
      const r = await api.get(`/asesores/${detalle.asesor.id}/comisiones`)
      setDetalle(d => ({ ...d, comisiones: r.data.data }))
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al pagar la comisión')
    }
  }

  const anular = async (id) => {
    try {
      await api.patch(`/asesores/comisiones/${id}/anular`)
      toast.success('Comisión anulada')
      const r = await api.get(`/asesores/${detalle.asesor.id}/comisiones`)
      setDetalle(d => ({ ...d, comisiones: r.data.data }))
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al anular la comisión')
    }
  }

  const abrirConfig = async () => {
    try {
      const r = await api.get('/asesores/config')
      setConfig(r.data.data)
      setModalConfig(true)
    } catch (e) {
      toast.error('Error al cargar la configuración')
    }
  }

  const guardarConfig = async () => {
    try {
      await api.put('/asesores/config', { porcentaje_default: config.porcentaje_default })
      toast.success('Configuración de comisiones actualizada con éxito')
      setModalConfig(false)
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar la configuración')
    }
  }

  return (
    <div className="as-page">
      <style>{CSS}</style>

      <div className="as-head">
        <div className="as-head-top">
          <div className="as-head-left">
            <div className="as-head-icon"><Percent size={22} color="#fff" /></div>
            <div>
              <div className="as-titulo">Asesores Comerciales</div>
              <div className="as-sub">Comisiones por venta de pólizas y contratos</div>
            </div>
          </div>
          {esAdmin && (
            <button className="as-btn-cfg" onClick={abrirConfig}>
              <Settings size={15} /> % comisión global
            </button>
          )}
        </div>

        {kpis && (
          <div className="as-kpis">
            <div className="as-kpi">
              <div className="as-kpi-bar" style={{ background: 'linear-gradient(90deg,#EC4899,#BE185D)' }} />
              <div className="as-kpi-body">
                <div className="as-kpi-icon" style={{ background: '#FCE7F3' }}><Users size={16} color="#BE185D" /></div>
                <div className="as-kpi-val">{kpis.asesores_activos}</div>
                <div className="as-kpi-label">Asesores activos</div>
              </div>
            </div>
            <div className="as-kpi">
              <div className="as-kpi-bar" style={{ background: 'linear-gradient(90deg,#6366F1,#4338CA)' }} />
              <div className="as-kpi-body">
                <div className="as-kpi-icon" style={{ background: '#EEF2FF' }}><TrendingUp size={16} color="#4338CA" /></div>
                <div className="as-kpi-val">{kpis.ventas_totales}</div>
                <div className="as-kpi-label">Ventas con comisión</div>
              </div>
            </div>
            <div className="as-kpi">
              <div className="as-kpi-bar" style={{ background: 'linear-gradient(90deg,#F59E0B,#D97706)' }} />
              <div className="as-kpi-body">
                <div className="as-kpi-icon" style={{ background: '#FEF3C7' }}><Clock size={16} color="#D97706" /></div>
                <div className="as-kpi-val">{fmt(kpis.comision_pendiente)}</div>
                <div className="as-kpi-label">Comisión pendiente</div>
              </div>
            </div>
            <div className="as-kpi">
              <div className="as-kpi-bar" style={{ background: 'linear-gradient(90deg,#10B981,#059669)' }} />
              <div className="as-kpi-body">
                <div className="as-kpi-icon" style={{ background: '#D1FAE5' }}><CheckCircle2 size={16} color="#059669" /></div>
                <div className="as-kpi-val">{fmt(kpis.comision_pagada)}</div>
                <div className="as-kpi-label">Comisión pagada</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="as-body">
        <div className="as-toolbar">
          <div className="as-search">
            <Search size={15} className="as-search-icon" />
            <input placeholder="Buscar asesor por nombre o correo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <button className="as-refresh" onClick={cargar} title="Refrescar"><RefreshCw size={15} /></button>
        </div>

        <div className="as-table-wrap">
          <table className="as-table">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>% Comisión</th>
                <th>Ventas</th>
                <th>Generada</th>
                <th>Pendiente</th>
                <th>Pagada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!loading && asesoresFiltrados.length === 0 && (
                <tr><td colSpan={7} className="as-empty">
                  {asesores.length === 0
                    ? 'No hay asesores comerciales registrados. Crea un usuario con rol "Asesor Comercial" en Usuarios.'
                    : 'Ningún asesor coincide con la búsqueda.'}
                </td></tr>
              )}
              {asesoresFiltrados.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="as-quien">
                      <div className="as-avatar" style={{ background: gradFor(a.id) }}>{iniciales(a.nombre)}</div>
                      <div>
                        <div className="as-nombre">{a.nombre}</div>
                        <div className="as-email">{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {esAdmin ? (
                      <div className="as-pct">
                        <PercentInput
                          placeholder={config?.porcentaje_default ?? '—'}
                          value={editPct[a.id] ?? a.porcentaje_comision ?? ''}
                          onChange={v => setEditPct(p => ({ ...p, [a.id]: v }))}
                        />
                        {editPct[a.id] !== undefined && (
                          <button className="as-pct-save" onClick={() => guardarPct(a.id)} title="Guardar"><Check size={14} /></button>
                        )}
                      </div>
                    ) : (
                      <span className="as-pct-badge">{a.porcentaje_comision ?? '—'}%</span>
                    )}
                  </td>
                  <td>{a.ventas_totales}</td>
                  <td>{fmt(a.comision_total)}</td>
                  <td>{fmt(a.comision_pendiente)}</td>
                  <td>{fmt(a.comision_pagada)}</td>
                  <td><button className="as-link" onClick={() => abrirDetalle(a)}>Ver comisiones</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalConfig && config && (
        <div className="as-overlay" onClick={e => { if (e.target === e.currentTarget) setModalConfig(false) }}>
          <div className="as-modal sm">
            <div className="as-mhead">
              <div className="as-mtitle"><Percent size={17} color="#BE185D" /> % de comisión global</div>
              <button className="as-mclose" onClick={() => setModalConfig(false)}><X size={16} /></button>
            </div>
            <div className="as-mbody">
              <div className="as-field">
                <label>Porcentaje por defecto (%)</label>
                <PercentInput
                  value={config.porcentaje_default}
                  onChange={v => setConfig(c => ({ ...c, porcentaje_default: v }))}
                />
              </div>
            </div>
            <div className="as-mfoot">
              <button className="as-btn-cancel" onClick={() => setModalConfig(false)}>Cancelar</button>
              <button className="as-btn-save" onClick={guardarConfig}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <div className="as-overlay" onClick={e => { if (e.target === e.currentTarget) setDetalle(null) }}>
          <div className="as-modal">
            <div className="as-mhead">
              <div className="as-mtitle">
                <div className="as-avatar" style={{ background: gradFor(detalle.asesor.id), width: 32, height: 32, fontSize: 12 }}>
                  {iniciales(detalle.asesor.nombre)}
                </div>
                Comisiones — {detalle.asesor.nombre}
              </div>
              <button className="as-mclose" onClick={() => setDetalle(null)}><X size={16} /></button>
            </div>
            <div className="as-mbody">
              {detalle.comisiones.length === 0 && <div className="as-empty">Sin comisiones registradas.</div>}
              {detalle.comisiones.map(c => {
                const m = ESTADO_META[c.estado]
                return (
                  <div className="as-com-row" key={c.id}>
                    <div>
                      <div className="as-com-tipo">{c.origen_tipo} #{c.numero_origen}</div>
                      <div className="as-com-num">{fmt(c.valor_base)} · {c.porcentaje}%</div>
                      <div className="as-email">{fmtDate(c.creado_en)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="as-com-val">{fmt(c.valor_comision)}</div>
                      <span className="as-chip" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                    </div>
                    {esAdmin && c.estado === 'PENDIENTE' && (
                      <div className="as-com-acts">
                        <button className="as-act pagar" title="Marcar pagada" onClick={() => pagar(c.id)}><DollarSign size={13} /></button>
                        <button className="as-act anular" title="Anular" onClick={() => anular(c.id)}><Ban size={13} /></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
