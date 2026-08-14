/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Recaudo                                             ║
 * ║  Archivo         : RecaudoPage.jsx                                     ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-03                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Wallet, Calendar, MapPin, Users, TrendingUp, CheckCircle2,
  Clock, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Phone, Home, FileText, Loader2, BarChart2, History,
  DollarSign, Target, Award, RefreshCw, UserCheck, Printer,
  MoreHorizontal, Route,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import api from '../../services/api.js'
import CurrencyInput from '../../components/ui/CurrencyInput.jsx'
import { toast } from '../../store/toast.store.js'
import './RecaudoPage.css'

/* ─── Helpers ─── */
const hoy = () => new Date().toISOString().slice(0, 10)

const fmtCOP = v =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)

const fmtFecha = iso => {
  if (!iso) return '—'
  const d = String(iso).slice(0, 10)
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtHora = iso => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

const iniciales = nombre => {
  if (!nombre) return '?'
  const p = nombre.trim().split(' ')
  return (p[0]?.[0] || '') + (p[1]?.[0] || p[0]?.[1] || '')
}

const RESULTADO_LABELS = {
  COBRADO: 'Cobrado', AUSENTE: 'Ausente', PROMESA: 'Promesa',
  PARCIAL: 'Parcial', NO_PAGA: 'No Paga', APLAZADO: 'Aplazado',
}
const RESULTADO_ICONS = {
  COBRADO: '✓', AUSENTE: '—', PROMESA: '◷', PARCIAL: '½', NO_PAGA: '✗', APLAZADO: '↷',
}
const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'OTRO']

/* ─── Componente Badge resultado ─── */
function BadgeResultado({ resultado }) {
  if (!resultado) return null
  return (
    <span className={`rc-badge ${resultado}`}>
      {RESULTADO_ICONS[resultado]} {RESULTADO_LABELS[resultado]}
    </span>
  )
}

/* ─── Componente Badge estado orden ─── */
function BadgeEstado({ estado }) {
  const icons = { PENDIENTE: <Clock size={11}/>, EN_CURSO: <AlertCircle size={11}/>, COMPLETADA: <CheckCircle2 size={11}/>, CANCELADA: <XCircle size={11}/> }
  return (
    <span className={`rc-orden-badge ${estado}`}>
      {icons[estado]} {estado.replace('_', ' ')}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1 — ORDEN DEL DÍA
   ═══════════════════════════════════════════════════════════════════════════ */
function TabOrden() {
  const [fecha, setFecha] = useState(hoy())
  const [rutasDisponibles, setRutasDisponibles] = useState([])
  const [rutaId, setRutaId] = useState('')
  const [orden, setOrden] = useState(null)
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(false)
  const [cargandoRutas, setCargandoRutas] = useState(false)
  const [visitaActiva, setVisitaActiva] = useState(null)
  const [formVisita, setFormVisita] = useState({
    resultado: '', valor_cobrado: '', metodo_pago: 'EFECTIVO', observaciones: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [msgGuardado, setMsgGuardado] = useState('')

  // Cargar rutas del día cuando cambia la fecha
  const cargarRutasDelDia = useCallback(async f => {
    setCargandoRutas(true)
    try {
      const r = await api.get(`/recaudo/rutas-del-dia?fecha=${f}`)
      setRutasDisponibles(r.data.data || [])
      setRutaId('')
      setOrden(null)
      setVisitas([])
    } catch { /* silencioso */ }
    finally { setCargandoRutas(false) }
  }, [])

  useEffect(() => { cargarRutasDelDia(fecha) }, [fecha, cargarRutasDelDia])

  // Cargar orden del día al seleccionar ruta
  const cargarOrden = useCallback(async (rid, f) => {
    if (!rid) return
    setLoading(true)
    try {
      const r = await api.get(`/recaudo/orden-del-dia?ruta_id=${rid}&fecha=${f}`)
      setOrden(r.data.data.orden)
      setVisitas(r.data.data.visitas || [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  const handleSelectRuta = async id => {
    setRutaId(id)
    setVisitaActiva(null)
    await cargarOrden(id, fecha)
  }

  // Guardar visita
  const guardarVisita = async polizaId => {
    if (!formVisita.resultado) return
    setGuardando(true)
    try {
      await api.post('/recaudo/visitas', {
        orden_id: orden.id,
        poliza_id: polizaId,
        resultado: formVisita.resultado,
        valor_cobrado: parseFloat(formVisita.valor_cobrado) || 0,
        metodo_pago: formVisita.metodo_pago || 'EFECTIVO',
        observaciones: formVisita.observaciones,
      })
      toast.success('Visita registrada correctamente')
      setMsgGuardado('Guardado')
      setTimeout(() => setMsgGuardado(''), 2000)
      setVisitaActiva(null)
      setFormVisita({ resultado: '', valor_cobrado: '', metodo_pago: 'EFECTIVO', observaciones: '' })
      await cargarOrden(rutaId, fecha)
    } catch { toast.error('Error al guardar la visita') }
    finally { setGuardando(false) }
  }

  const abrirPanel = (polizaId, visitaExistente) => {
    if (visitaActiva === polizaId) { setVisitaActiva(null); return }
    setVisitaActiva(polizaId)
    setFormVisita({
      resultado: visitaExistente?.resultado || '',
      valor_cobrado: visitaExistente?.valor_cobrado || '',
      metodo_pago: visitaExistente?.metodo_pago || 'EFECTIVO',
      observaciones: visitaExistente?.observaciones || '',
    })
  }

  // Cerrar orden
  const cerrarOrden = async () => {
    if (!orden) return
    try {
      await api.patch(`/recaudo/ordenes/${orden.id}/estado`, { estado: 'COMPLETADA' })
      toast.success('Orden cerrada correctamente')
      await cargarOrden(rutaId, fecha)
    } catch { toast.error('Error al cerrar la orden') }
  }

  // Estadísticas
  const total = visitas.length
  const cobradas = visitas.filter(v => v.resultado === 'COBRADO').length
  const parciales = visitas.filter(v => v.resultado === 'PARCIAL').length
  const pendientes = visitas.filter(v => !v.resultado).length
  const pct = total ? Math.round(((cobradas + parciales) / total) * 100) : 0
  const totalRecaudado = Number(orden?.total_recaudado || 0)
  const totalEsperado = Number(orden?.total_esperado || 0)

  const todasGestionadas = total > 0 && pendientes === 0
  const puedesCerrar = todasGestionadas && orden?.estado !== 'COMPLETADA'

  return (
    <div className="rc-body">
      {/* Controles */}
      <div className="rc-controls">
        <div className="rc-field">
          <label className="rc-label">Fecha</label>
          <input
            type="date" className="rc-input"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
          />
        </div>

        <div className="rc-field" style={{ flex: 1 }}>
          <label className="rc-label">
            Rutas disponibles {cargandoRutas && <span className="rc-spin" style={{ width: 12, height: 12 }} />}
          </label>
          <select
            className="rc-select"
            value={rutaId}
            onChange={e => handleSelectRuta(e.target.value)}
          >
            <option value="">— Selecciona una ruta —</option>
            {rutasDisponibles.map(r => (
              <option key={r.id} value={r.id}>
                [{r.zona_nombre}] {r.ruta_nombre} — {r.total_polizas} pólizas
              </option>
            ))}
          </select>
        </div>

        {rutaId && (
          <button className="rc-btn rc-btn-ghost" onClick={() => cargarOrden(rutaId, fecha)} title="Recargar">
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Chips de rutas disponibles */}
      {rutasDisponibles.length > 0 && (
        <div className="rc-rutas-chips">
          {rutasDisponibles.map(r => (
            <button
              key={r.id}
              className={`rc-ruta-chip${rutaId === r.id ? ' sel' : ''}`}
              onClick={() => handleSelectRuta(r.id)}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: r.zona_color || '#6366F1', display: 'inline-block',
              }} />
              {r.ruta_nombre}
              {r.orden_estado === 'COMPLETADA' && <CheckCircle2 size={12} />}
            </button>
          ))}
        </div>
      )}

      {/* Estado vacío: sin fecha con rutas */}
      {!cargandoRutas && rutasDisponibles.length === 0 && (
        <div className="rc-empty">
          <div className="rc-empty-icon"><Calendar size={24} color="#9CA3AF" /></div>
          <div className="rc-empty-title">Sin rutas programadas</div>
          <div className="rc-empty-sub">No hay rutas de recaudo configuradas para el día {fmtFecha(fecha)}.</div>
        </div>
      )}

      {/* Sin ruta seleccionada */}
      {rutasDisponibles.length > 0 && !rutaId && !loading && (
        <div className="rc-info-box">
          <Wallet size={18} />
          Selecciona una ruta arriba para cargar la orden del día.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rc-empty">
          <Loader2 size={28} color="#6366F1" style={{ animation: 'rc-spin 0.7s linear infinite' }} />
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>Cargando orden…</div>
        </div>
      )}

      {/* Contenido de orden */}
      {!loading && orden && (
        <>
          {/* Header de la orden */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F1035' }}>
                {orden.ruta_nombre}
                <span style={{ marginLeft: 10 }}><BadgeEstado estado={orden.estado} /></span>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                Zona: {orden.zona_nombre} · Recaudador: {orden.recaudador_nombre || 'Sin asignar'} · {fmtFecha(fecha)}
              </div>
            </div>
            {puedesCerrar && (
              <button className="rc-btn rc-btn-success" onClick={cerrarOrden}>
                <CheckCircle2 size={15} /> Cerrar Orden
              </button>
            )}
            {msgGuardado && (
              <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={14} /> {msgGuardado}
              </span>
            )}
          </div>

          {/* Resumen */}
          <div className="rc-resumen">
            <div className="rc-resumen-card">
              <div className="rc-resumen-label">Pólizas</div>
              <div className="rc-resumen-value">{total}</div>
              <div className="rc-resumen-sub">{pendientes} pendientes</div>
            </div>
            <div className="rc-resumen-card">
              <div className="rc-resumen-label">Cobradas</div>
              <div className="rc-resumen-value" style={{ color: '#10B981' }}>{cobradas}</div>
              <div className="rc-resumen-sub">{parciales > 0 ? `+ ${parciales} parciales` : 'completas'}</div>
            </div>
            <div className="rc-resumen-card" style={{ flex: 2 }}>
              <div className="rc-resumen-label">Efectividad</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="rc-resumen-value" style={{ color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }}>
                  {pct}%
                </div>
                <div className="rc-resumen-sub">{fmtCOP(totalRecaudado)} / {fmtCOP(totalEsperado)}</div>
              </div>
              <div className="rc-progress-bar">
                <div className="rc-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Lista de visitas */}
          {visitas.length === 0 ? (
            <div className="rc-empty">
              <div className="rc-empty-icon"><Users size={22} color="#9CA3AF" /></div>
              <div className="rc-empty-title">Sin pólizas en esta ruta</div>
            </div>
          ) : (
            visitas.map(v => {
              const panelAbierto = visitaActiva === v.poliza_id
              const tieneResult  = !!v.resultado
              const cardClass    = tieneResult ? v.resultado.toLowerCase().replace('_', '') : ''

              return (
                <div key={v.poliza_id} className={`rc-visita-card ${cardClass}`}>
                  <div className="rc-visita-header">
                    <div className={`rc-avatar${v.meses_mora > 0 ? ' mora' : ''}`}>
                      {iniciales(v.titular_nombre)}
                    </div>

                    <div className="rc-visita-info">
                      <div className="rc-titular-nombre">{v.titular_nombre}</div>
                      <div className="rc-visita-meta">
                        <span className="rc-meta-item">
                          <FileText size={12} /> Póliza <strong>#{v.poliza_numero}</strong>
                        </span>
                        <span className="rc-meta-item">
                          <DollarSign size={12} /> <strong>{fmtCOP(v.valor_cuota)}/mes</strong>
                        </span>
                        {v.meses_mora > 0 && (
                          <span className="rc-meta-item">
                            <span className="rc-badge mora">Mora: {v.meses_mora} m</span>
                          </span>
                        )}
                        {v.titular_cel && (
                          <span className="rc-meta-item">
                            <Phone size={12} /> {v.titular_cel}
                          </span>
                        )}
                        {v.titular_dir && (
                          <span className="rc-meta-item">
                            <Home size={12} /> {v.titular_dir}
                          </span>
                        )}
                      </div>

                      {/* Resultado actual */}
                      {tieneResult && (
                        <div className="rc-visita-badges" style={{ marginTop: 6 }}>
                          <BadgeResultado resultado={v.resultado} />
                          {v.valor_cobrado > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                              {fmtCOP(v.valor_cobrado)}
                            </span>
                          )}
                          {v.metodo_pago && (
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{v.metodo_pago}</span>
                          )}
                          {v.visitado_en && (
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                              <Clock size={10} style={{ display: 'inline' }} /> {fmtHora(v.visitado_en)}
                            </span>
                          )}
                          {v.observaciones && (
                            <span style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>
                              "{v.observaciones}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botón abrir panel */}
                    <button
                      className="rc-btn rc-btn-ghost"
                      onClick={() => abrirPanel(v.poliza_id, v)}
                      style={{ fontSize: 12, padding: '0 12px', height: 32 }}
                    >
                      {tieneResult ? 'Editar' : 'Registrar'}
                      {panelAbierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Panel inline */}
                  {panelAbierto && (
                    <div className="rc-panel">
                      <div className="rc-panel-title">Resultado de la visita</div>

                      {/* Botones de resultado */}
                      <div className="rc-resultado-btns">
                        {Object.keys(RESULTADO_LABELS).map(res => (
                          <button
                            key={res}
                            className={`rc-res-btn ${res}${formVisita.resultado === res ? ' sel' : ''}`}
                            onClick={() => setFormVisita(f => ({ ...f, resultado: res }))}
                          >
                            {RESULTADO_ICONS[res]} {RESULTADO_LABELS[res]}
                          </button>
                        ))}
                      </div>

                      {/* Campos adicionales si hay pago */}
                      {(formVisita.resultado === 'COBRADO' || formVisita.resultado === 'PARCIAL') && (
                        <div className="rc-panel-row">
                          <div className="rc-panel-field">
                            <label className="rc-panel-label">Valor cobrado</label>
                            <CurrencyInput
                              placeholder={fmtCOP(v.valor_cuota)}
                              value={formVisita.valor_cobrado}
                              onChange={v => setFormVisita(f => ({ ...f, valor_cobrado: v }))}
                            />
                          </div>
                          <div className="rc-panel-field">
                            <label className="rc-panel-label">Método de pago</label>
                            <select
                              className="rc-panel-input"
                              value={formVisita.metodo_pago}
                              onChange={e => setFormVisita(f => ({ ...f, metodo_pago: e.target.value }))}
                            >
                              {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Observaciones */}
                      <textarea
                        className="rc-panel-textarea"
                        placeholder="Observaciones (opcional)…"
                        value={formVisita.observaciones}
                        onChange={e => setFormVisita(f => ({ ...f, observaciones: e.target.value }))}
                        rows={2}
                      />

                      {/* Acciones */}
                      <div className="rc-panel-actions">
                        <button
                          className="rc-btn rc-btn-primary"
                          disabled={!formVisita.resultado || guardando}
                          onClick={() => guardarVisita(v.poliza_id)}
                        >
                          {guardando
                            ? <><Loader2 size={13} style={{ animation: 'rc-spin .6s linear infinite' }} /> Guardando…</>
                            : <><CheckCircle2 size={13} /> Guardar</>
                          }
                        </button>
                        <button
                          className="rc-btn rc-btn-ghost"
                          onClick={() => setVisitaActiva(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2 — HISTORIAL
   ═══════════════════════════════════════════════════════════════════════════ */
function TabHistorial() {
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', ruta_id: '' })
  const [rutas, setRutas] = useState([])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [detalleVisitas, setDetalleVisitas] = useState({})
  const [cargandoDetalle, setCargandoDetalle] = useState(null)

  useEffect(() => {
    // Cargar rutas para filtro
    api.get('/zonas-recaudo/rutas').then(r => setRutas(r.data.data || [])).catch(() => {})
    cargarHistorial()
  }, [])

  const cargarHistorial = async (f = filtros) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.ruta_id) params.append('ruta_id', f.ruta_id)
      if (f.desde)   params.append('desde', f.desde)
      if (f.hasta)   params.append('hasta', f.hasta)
      const r = await api.get(`/recaudo/historial?${params}`)
      setData(r.data.data || [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  const toggleDetalle = async (orden) => {
    if (expanded === orden.id) { setExpanded(null); return }
    setExpanded(orden.id)
    if (!detalleVisitas[orden.id]) {
      setCargandoDetalle(orden.id)
      try {
        const r = await api.get(`/recaudo/historial/${orden.id}/visitas`)
        setDetalleVisitas(prev => ({ ...prev, [orden.id]: r.data.data }))
      } catch { /* silencioso */ }
      finally { setCargandoDetalle(null) }
    }
  }

  const pctColor = p => p >= 80 ? '#10B981' : p >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="rc-body">
      {/* Filtros */}
      <div className="rc-hist-filters">
        <div className="rc-field">
          <label className="rc-label">Desde</label>
          <input type="date" className="rc-input" value={filtros.desde}
            onChange={e => setFiltros(f => ({ ...f, desde: e.target.value }))} />
        </div>
        <div className="rc-field">
          <label className="rc-label">Hasta</label>
          <input type="date" className="rc-input" value={filtros.hasta}
            onChange={e => setFiltros(f => ({ ...f, hasta: e.target.value }))} />
        </div>
        <div className="rc-field">
          <label className="rc-label">Ruta</label>
          <select className="rc-select" value={filtros.ruta_id}
            onChange={e => setFiltros(f => ({ ...f, ruta_id: e.target.value }))}>
            <option value="">Todas las rutas</option>
            {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <button className="rc-btn rc-btn-primary" onClick={() => cargarHistorial(filtros)}>
          <RefreshCw size={14} /> Buscar
        </button>
      </div>

      {loading ? (
        <div className="rc-empty">
          <Loader2 size={26} color="#6366F1" style={{ animation: 'rc-spin .7s linear infinite' }} />
        </div>
      ) : data.length === 0 ? (
        <div className="rc-empty">
          <div className="rc-empty-icon"><History size={22} color="#9CA3AF" /></div>
          <div className="rc-empty-title">Sin órdenes en el período</div>
          <div className="rc-empty-sub">Ajusta los filtros de fecha para ver el historial de recaudo.</div>
        </div>
      ) : (
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Ruta / Zona</th>
                <th>Recaudador</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Esperado</th>
                <th style={{ textAlign: 'right' }}>Recaudado</th>
                <th>Efectividad</th>
                <th>Visitas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map(o => (
                <>
                  <tr key={o.id} className="clickable" onClick={() => toggleDetalle(o)}>
                    <td>{fmtFecha(o.fecha)}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{o.ruta_nombre}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className="rc-zona-dot" style={{ background: o.zona_color || '#6366F1' }} />
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{o.zona_nombre}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748B' }}>{o.recaudador_nombre || '—'}</td>
                    <td><BadgeEstado estado={o.estado} /></td>
                    <td style={{ textAlign: 'right', fontSize: 12 }}>{fmtCOP(o.total_esperado)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981' }}>{fmtCOP(o.total_recaudado)}</td>
                    <td>
                      <div className="rc-pct-bar">
                        <span className="rc-pct-num" style={{ color: pctColor(o.total_esperado > 0 ? Math.round(o.total_recaudado * 100 / o.total_esperado) : 0) }}>
                          {o.total_esperado > 0 ? Math.round(Number(o.total_recaudado) * 100 / Number(o.total_esperado)) : 0}%
                        </span>
                        <div className="rc-progress-bar" style={{ flex: 1, height: 6 }}>
                          <div className="rc-progress-fill" style={{
                            width: `${o.total_esperado > 0 ? Math.min(Math.round(Number(o.total_recaudado) * 100 / Number(o.total_esperado)), 100) : 0}%`,
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#374151' }}>
                        <span style={{ color: '#10B981', fontWeight: 700 }}>{o.cobradas}</span>
                        /{o.total_visitas}
                        {Number(o.promesas) > 0 && <span style={{ color: '#F59E0B' }}> · {o.promesas}p</span>}
                        {Number(o.ausentes) > 0 && <span style={{ color: '#9CA3AF' }}> · {o.ausentes}a</span>}
                      </span>
                    </td>
                    <td>
                      {expanded === o.id ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                    </td>
                  </tr>

                  {/* Detalle expandido */}
                  {expanded === o.id && (
                    <tr key={`det-${o.id}`}>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <div className="rc-hist-detail">
                          <div className="rc-hist-detail-title">Detalle de visitas</div>
                          {cargandoDetalle === o.id ? (
                            <div style={{ color: '#9CA3AF', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Loader2 size={14} style={{ animation: 'rc-spin .6s linear infinite' }} /> Cargando…
                            </div>
                          ) : (
                            <div className="rc-visitas-mini">
                              {(detalleVisitas[o.id] || []).map(v => (
                                <div key={v.id} className="rc-visita-mini">
                                  <div className="rc-visita-mini-nombre">{v.titular_nombre}</div>
                                  <div className="rc-visita-mini-info">
                                    Póliza #{v.poliza_numero}
                                    {v.resultado
                                      ? <span style={{ marginLeft: 6 }}><BadgeResultado resultado={v.resultado} /></span>
                                      : <span style={{ marginLeft: 6, color: '#9CA3AF' }}>Pendiente</span>
                                    }
                                  </div>
                                  {v.valor_cobrado > 0 && (
                                    <div className="rc-visita-mini-info" style={{ color: '#10B981', fontWeight: 700 }}>
                                      {fmtCOP(v.valor_cobrado)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {(!detalleVisitas[o.id] || detalleVisitas[o.id].length === 0) && (
                                <span style={{ fontSize: 12, color: '#9CA3AF' }}>Sin visitas registradas.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3 — INDICADORES
   ═══════════════════════════════════════════════════════════════════════════ */
function TabIndicadores() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/recaudo/indicadores')
      setData(r.data.data)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return (
    <div className="rc-body">
      <div className="rc-empty">
        <Loader2 size={28} color="#6366F1" style={{ animation: 'rc-spin .7s linear infinite' }} />
      </div>
    </div>
  )

  if (!data) return (
    <div className="rc-body">
      <div className="rc-empty">
        <div className="rc-empty-title">Sin datos disponibles</div>
      </div>
    </div>
  )

  const resumen = data.resumen || {}
  const porZona = (data.por_zona || []).filter(z => z.recaudado > 0)
  const porRecaudador = data.por_recaudador || []

  const kpis = [
    {
      label: 'Recaudado este mes',
      value: fmtCOP(resumen.recaudado_total),
      sub: `de ${fmtCOP(resumen.esperado_total)} esperado`,
      icon: <DollarSign size={20} color="#fff" />,
      bg: 'linear-gradient(135deg,#6366F1,#4338CA)',
    },
    {
      label: 'Efectividad',
      value: `${resumen.pct_recaudo || 0}%`,
      sub: 'cobrado / esperado',
      icon: <Target size={20} color="#fff" />,
      bg: Number(resumen.pct_recaudo) >= 80
        ? 'linear-gradient(135deg,#10B981,#059669)'
        : Number(resumen.pct_recaudo) >= 50
          ? 'linear-gradient(135deg,#F59E0B,#D97706)'
          : 'linear-gradient(135deg,#EF4444,#DC2626)',
    },
    {
      label: 'Órdenes este mes',
      value: resumen.total_ordenes || 0,
      sub: 'rutas trabajadas',
      icon: <Wallet size={20} color="#fff" />,
      bg: 'linear-gradient(135deg,#0EA5E9,#0284C7)',
    },
    {
      label: 'Visitas realizadas',
      value: resumen.total_visitas || 0,
      sub: `${resumen.visitas_cobradas || 0} cobradas · ${resumen.visitas_ausentes || 0} ausentes`,
      icon: <Users size={20} color="#fff" />,
      bg: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
    },
  ]

  return (
    <div className="rc-body">
      {/* KPIs */}
      <div className="rc-kpi-row">
        {kpis.map(k => (
          <div key={k.label} className="rc-kpi">
            <div className="rc-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
            <div className="rc-kpi-label">{k.label}</div>
            <div className="rc-kpi-value">{k.value}</div>
            <div className="rc-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráfico por zona */}
      {porZona.length > 0 && (
        <div className="rc-chart-card">
          <div className="rc-chart-title">
            <BarChart2 size={18} color="#6366F1" />
            Recaudo por zona — mes actual
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porZona} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <XAxis dataKey="zona" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <Tooltip
                formatter={(v, n) => [fmtCOP(v), n === 'recaudado' ? 'Recaudado' : 'Esperado']}
                contentStyle={{ borderRadius: 10, border: '1px solid #ECEDF8', fontSize: 12 }}
              />
              <Bar dataKey="esperado" name="Esperado" fill="#E0E7FF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recaudado" name="Recaudado" radius={[4, 4, 0, 0]}>
                {porZona.map((entry, i) => (
                  <Cell key={i} fill={entry.color || '#6366F1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla por recaudador */}
      {porRecaudador.length > 0 && (
        <div className="rc-chart-card">
          <div className="rc-chart-title">
            <Award size={18} color="#6366F1" />
            Eficiencia por recaudador — mes actual
          </div>
          <table className="rc-rec-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Recaudador</th>
                <th style={{ textAlign: 'right' }}>Órdenes</th>
                <th style={{ textAlign: 'right' }}>Recaudado</th>
                <th>Efectividad</th>
              </tr>
            </thead>
            <tbody>
              {porRecaudador.map((r, i) => {
                const pct = Number(r.pct) || 0
                return (
                  <tr key={r.recaudador}>
                    <td style={{ color: '#9CA3AF', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.recaudador}</td>
                    <td style={{ textAlign: 'right', color: '#64748B' }}>{r.ordenes}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981' }}>{fmtCOP(r.recaudado)}</td>
                    <td>
                      <div className="rc-pct-bar">
                        <span className="rc-pct-num" style={{ color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }}>
                          {pct}%
                        </span>
                        <div className="rc-progress-bar" style={{ flex: 1, height: 6 }}>
                          <div className="rc-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {porZona.length === 0 && porRecaudador.length === 0 && (
        <div className="rc-empty">
          <div className="rc-empty-icon"><TrendingUp size={22} color="#9CA3AF" /></div>
          <div className="rc-empty-title">Sin datos este mes</div>
          <div className="rc-empty-sub">Los indicadores se calcularán a medida que se registren órdenes y visitas de recaudo.</div>
        </div>
      )}

      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <button className="rc-btn rc-btn-ghost" onClick={cargar} style={{ fontSize: 12 }}>
          <RefreshCw size={13} /> Actualizar indicadores
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 0 — MI PANEL (panel operativo del recaudador en campo)
   ═══════════════════════════════════════════════════════════════════════════ */
function TabMiPanel() {
  const usuario = useAuthStore(s => s.usuario)

  // Estado principal
  const [misFecha,        setMisFecha]        = useState(hoy())
  const [misRutasData,    setMisRutasData]     = useState([])
  const [loadingMisRutas, setLoadingMisRutas]  = useState(false)
  const [rutaActiva,      setRutaActiva]       = useState(null)
  const [visitasPan,      setVisitasPan]       = useState([])
  const [ordenActiva,     setOrdenActiva]      = useState(null)
  const [panelVisita,     setPanelVisita]      = useState(null)
  const [accionVisita,    setAccionVisita]     = useState('')
  const [mostrarMas,      setMostrarMas]       = useState(null)
  const [formPago,        setFormPago]         = useState({
    valor: '', metodo_pago: 'EFECTIVO', fecha_promesa: '', observaciones: '',
  })
  const [guardandoVisita, setGuardandoVisita]  = useState(false)
  const [errorVisita,     setErrorVisita]      = useState('')
  const [reciboModal,     setReciboModal]      = useState(null)
  const [reporteRuta,     setReporteRuta]      = useState(null)
  const [cerrandoRuta,    setCerrandoRuta]     = useState(false)
  const [inicioRutaAt,    setInicioRutaAt]     = useState(null)

  // Saludo dinámico
  const hora    = new Date().getHours()
  const saludo  = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const nombreUsuario = usuario?.nombre || 'Recaudador'

  // Fecha formateada para el header
  const fechaDisplay = new Date(misFecha + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  })

  // ── Cargar rutas del recaudador
  const cargarMisRutas = useCallback(async (f) => {
    setLoadingMisRutas(true)
    try {
      const r = await api.get(`/recaudo/mis-rutas?fecha=${f}`)
      setMisRutasData(r.data.data || [])
    } catch { /* silencioso */ }
    finally { setLoadingMisRutas(false) }
  }, [])

  // Restaurar ruta activa tras refresco
  useEffect(() => {
    cargarMisRutas(misFecha)
    // Limpiar sessionStorage si es de otro día
    const savedFecha = sessionStorage.getItem('recaudo_fecha')
    if (savedFecha && savedFecha !== misFecha) {
      sessionStorage.removeItem('recaudo_ruta_activa')
      sessionStorage.removeItem('recaudo_fecha')
      setRutaActiva(null)
      setVisitasPan([])
      setOrdenActiva(null)
    } else {
      const saved = sessionStorage.getItem('recaudo_ruta_activa')
      if (saved) {
        const ruta = JSON.parse(saved)
        iniciarRutaSilencioso(ruta)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misFecha])

  const sortVisitas = (vs) => vs.sort((a, b) => {
    // Pendientes primero, luego por dirección
    if (!a.resultado && b.resultado) return -1
    if (a.resultado && !b.resultado) return 1
    return (a.titular_dir || '').localeCompare(b.titular_dir || '')
  })

  const iniciarRutaSilencioso = async (ruta) => {
    setRutaActiva(ruta)
    setPanelVisita(null)
    setAccionVisita('')
    try {
      const r = await api.get(`/recaudo/orden-del-dia?ruta_id=${ruta.id}&fecha=${misFecha}`)
      setOrdenActiva(r.data.data.orden)
      setVisitasPan(sortVisitas(r.data.data.visitas || []))
      if (!inicioRutaAt) setInicioRutaAt(new Date())
    } catch { /* silencioso */ }
  }

  // ── Iniciar / continuar ruta
  const iniciarRuta = async (ruta) => {
    sessionStorage.setItem('recaudo_ruta_activa', JSON.stringify(ruta))
    sessionStorage.setItem('recaudo_fecha', misFecha)
    setRutaActiva(ruta)
    setPanelVisita(null)
    setAccionVisita('')
    setInicioRutaAt(new Date())
    try {
      const r = await api.get(`/recaudo/orden-del-dia?ruta_id=${ruta.id}&fecha=${misFecha}`)
      setOrdenActiva(r.data.data.orden)
      // Ordenar: pendientes primero
      const visitas = (r.data.data.visitas || []).sort((a, b) => {
        if (!a.resultado && b.resultado) return -1
        if (a.resultado && !b.resultado) return 1
        return 0
      })
      setVisitasPan(visitas)
    } catch { /* silencioso */ }
  }

  // ── Abrir panel de acción para una visita
  const abrirAccion = (polizaId, accion, visitaData) => {
    setMostrarMas(null)
    setErrorVisita('')
    if (accion === 'AUSENTE') {
      ejecutarAccion(polizaId, accion, 0, visitaData)
      return
    }
    setPanelVisita(panelVisita === polizaId && accionVisita === accion ? null : polizaId)
    setAccionVisita(accion)
    setFormPago({
      valor: accion !== 'PROMESA' ? String(visitaData?.valor_cuota || '') : '',
      metodo_pago: 'EFECTIVO',
      fecha_promesa: '',
      observaciones: '',
    })
  }

  // ── Ejecutar y guardar visita
  const ejecutarAccion = async (polizaId, resultado, valorOverride, visitaData) => {
    setGuardandoVisita(true)
    setErrorVisita('')
    // Valor cobrado: override > input del form > valor_cuota de la póliza
    const valorCobrado = valorOverride !== undefined
      ? valorOverride
      : (Number(formPago.valor) || Number(visitaData?.valor_cuota) || 0)
    try {
      const r = await api.post('/recaudo/visitas/detalle', {
        orden_id:       ordenActiva.id,
        poliza_id:      polizaId,
        resultado,
        valor_cobrado:  valorCobrado,
        metodo_pago:    formPago.metodo_pago || 'EFECTIVO',
        fecha_promesa:  formPago.fecha_promesa || undefined,
        observaciones:  formPago.observaciones || undefined,
      })
      setPanelVisita(null)
      setAccionVisita('')
      // Recargar visitas de la orden activa
      const ord = await api.get(`/recaudo/orden-del-dia?ruta_id=${rutaActiva.id}&fecha=${misFecha}`)
      const vsNueva = sortVisitas(ord.data.data.visitas || [])
      setVisitasPan(vsNueva)
      const nuevaOrden = ord.data.data.orden
      setOrdenActiva(nuevaOrden)
      cargarMisRutas(misFecha)
      toast.success('Visita registrada correctamente')
      // Mostrar recibo solo si hubo cobro real
      if (r.data.datos_recibo && ['COBRADO','PARCIAL'].includes(resultado)) {
        setReciboModal(r.data.datos_recibo)
      }
      if (r.data.ruta_agendada) {
        toast.success(`Agendado automáticamente en ${r.data.ruta_agendada}`)
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Error al guardar. Intenta de nuevo.'
      setErrorVisita(msg)
      toast.error(msg)
    } finally {
      setGuardandoVisita(false)
    }
  }

  // ── Cerrar ruta y generar reporte
  const cerrarRuta = async () => {
    if (!ordenActiva) return
    setCerrandoRuta(true)
    try {
      await api.patch(`/recaudo/ordenes/${ordenActiva.id}/estado`, { estado: 'COMPLETADA' })
      const finAt   = new Date()
      const minutos = inicioRutaAt ? Math.round((finAt - inicioRutaAt) / 60000) : 0
      const cobradas  = visitasPan.filter(v => v.resultado === 'COBRADO' || v.resultado === 'PARCIAL')
      const ausentes  = visitasPan.filter(v => v.resultado === 'AUSENTE')
      const promesas  = visitasPan.filter(v => v.resultado === 'PROMESA')
      const noPaga    = visitasPan.filter(v => v.resultado === 'NO_PAGA' || v.resultado === 'APLAZADO')
      const totalCobrado = cobradas.reduce((s, v) => s + Number(v.valor_cobrado || 0), 0)
      const totalEsperado = visitasPan.reduce((s, v) => s + Number(v.valor_cuota || 0), 0)
      setReporteRuta({
        ruta:          rutaActiva.ruta_nombre,
        zona:          rutaActiva.zona_nombre,
        fecha:         misFecha,
        minutos,
        horas:         Math.floor(minutos / 60),
        mins:          minutos % 60,
        total:         visitasPan.length,
        cobradas:      cobradas.length,
        ausentes:      ausentes.length,
        promesas:      promesas.length,
        noPaga:        noPaga.length,
        totalCobrado,
        totalEsperado,
        efectividad:   totalEsperado > 0 ? Math.round((totalCobrado / totalEsperado) * 100) : 0,
        minPorVisita:  visitasPan.length > 0 ? Math.round(minutos / visitasPan.length) : 0,
        visitas:       visitasPan,
      })
      toast.success('Ruta cerrada correctamente')
      cargarMisRutas(misFecha)
    } catch { toast.error('Error al cerrar la ruta') }
    finally { setCerrandoRuta(false) }
  }

  // ── Badge resultado para panel
  const resultadoBadgeClass = (res) => {
    const map = {
      COBRADO: 'cobrada', PARCIAL: 'parcial', PROMESA: 'promesa',
      AUSENTE: 'ausente', NO_PAGA: 'no_paga', APLAZADO: 'ausente',
    }
    return map[res] || ''
  }

  // ── Colores acción
  const METODO_LABELS = {
    EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia',
    NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', OTRO: 'Otro',
  }

  // ── Progreso de ruta
  const pctRuta = (ruta) => {
    const total = Number(ruta.total_visitas) || 0
    const gest  = Number(ruta.visitas_gestionadas) || 0
    return total ? Math.round((gest / total) * 100) : 0
  }

  return (
    <div className="rc-body">
      {/* ── Saludo ── */}
      <div className="rp-greeting">
        <div className="rp-greeting-left">
          <div className="rp-avatar">{iniciales(nombreUsuario)}</div>
          <div>
            <div className="rp-greeting-name">{saludo}, {nombreUsuario.split(' ')[0]}</div>
            <div className="rp-greeting-sub">Panel de recaudo en campo</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>
            {fechaDisplay}
          </span>
          <input
            type="date"
            className="rp-fecha-input"
            value={misFecha}
            onChange={e => { setMisFecha(e.target.value); setRutaActiva(null); setVisitasPan([]); setOrdenActiva(null) }}
          />
        </div>
      </div>

      {/* ── Sección: Mis rutas ── */}
      <div className="rp-visitas-header">
        <Route size={16} color="#6366F1" />
        MIS RUTAS DE HOY
        {loadingMisRutas && <span className="rc-spin" style={{ width: 13, height: 13, marginLeft: 4 }} />}
      </div>

      {/* Sin rutas */}
      {!loadingMisRutas && misRutasData.length === 0 && (
        <div className="rc-empty">
          <div className="rc-empty-icon"><Calendar size={24} color="#9CA3AF" /></div>
          <div className="rc-empty-title">Sin rutas programadas</div>
          <div className="rc-empty-sub">
            No tienes rutas asignadas para el {new Date(misFecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}.
          </div>
        </div>
      )}

      {/* Cards de rutas */}
      {misRutasData.map(ruta => {
        const pct      = pctRuta(ruta)
        const esActiva = rutaActiva?.id === ruta.id
        const iniciada = ruta.orden_id && ruta.orden_estado !== 'PENDIENTE'
        return (
          <div key={ruta.id} className={`rp-ruta-card${esActiva ? ' activa' : ''}`}>
            <div className="rp-ruta-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rp-ruta-zona">
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: ruta.zona_color || '#6366F1', marginRight: 5,
                  }} />
                  {ruta.zona_nombre} {ruta.zona_tipo ? `· ${ruta.zona_tipo}` : ''}
                </div>
                <div className="rp-ruta-nombre">{ruta.ruta_nombre}</div>
                <div className="rp-ruta-stats">
                  <span><Users size={11} style={{ display: 'inline', marginRight: 3 }} />{ruta.total_polizas} clientes</span>
                  <span><DollarSign size={11} style={{ display: 'inline', marginRight: 3 }} />{fmtCOP(ruta.total_esperado)} esperados</span>
                  {ruta.orden_estado === 'COMPLETADA' && (
                    <span style={{ color: '#10B981', fontWeight: 700 }}>
                      <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 3 }} />Completada
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Barra de progreso (solo si hay orden en curso) */}
            {ruta.orden_id && (
              <>
                <div className="rp-progress-bar">
                  <div className="rp-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ruta.visitas_gestionadas}/{ruta.total_visitas} gestionadas</span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>{fmtCOP(ruta.total_recaudado || 0)} cobrado</span>
                </div>
              </>
            )}

            <div className="rp-ruta-footer">
              <div />
              <button
                className={`rp-iniciar-btn${iniciada ? ' continuar' : ''}`}
                onClick={() => iniciarRuta(ruta)}
              >
                {esActiva
                  ? <><CheckCircle2 size={14} /> Ruta activa</>
                  : iniciada
                    ? <><RefreshCw size={14} /> Continuar ruta →</>
                    : <><Route size={14} /> Iniciar ruta →</>
                }
              </button>
            </div>
          </div>
        )
      })}

      {/* ── Lista de visitas (cuando hay ruta activa) ── */}
      {rutaActiva && (
        <>
          <div className="rp-visitas-header" style={{ marginTop: 28 }}>
            <Users size={16} color="#6366F1" />
            LISTA DE VISITAS — {rutaActiva.ruta_nombre}
            {ordenActiva && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>
                Orden: <strong style={{ color: '#6366F1' }}>{ordenActiva.estado?.replace('_', ' ')}</strong>
              </span>
            )}
          </div>

          {visitasPan.length === 0 && (
            <div className="rc-empty">
              <div className="rc-empty-icon"><Users size={22} color="#9CA3AF" /></div>
              <div className="rc-empty-title">Sin pólizas en esta ruta</div>
            </div>
          )}

          {/* Barra de progreso global */}
          {visitasPan.length > 0 && (() => {
            const gestionadas = visitasPan.filter(v => v.resultado).length
            const pct = Math.round((gestionadas / visitasPan.length) * 100)
            const cobradas = visitasPan.filter(v => v.resultado === 'COBRADO' || v.resultado === 'PARCIAL').length
            const totalCob = visitasPan.filter(v => v.resultado === 'COBRADO' || v.resultado === 'PARCIAL')
                                       .reduce((s, v) => s + Number(v.valor_cobrado || 0), 0)
            const todasListas = gestionadas === visitasPan.length
            return (
              <div className="rp-progreso-barra-wrap">
                <div className="rp-progreso-stats">
                  <span><strong>{gestionadas}</strong>/{visitasPan.length} visitas</span>
                  <span style={{ color:'#10B981', fontWeight:700 }}>{cobradas} cobradas — {fmtCOP(totalCob)}</span>
                  <span style={{ marginLeft:'auto', fontWeight:800, color: pct===100?'#10B981':'#6366F1' }}>{pct}%</span>
                </div>
                <div className="rp-progreso-track">
                  <div className="rp-progreso-fill" style={{ width:`${pct}%`, background: pct===100?'#10B981':'#6366F1' }} />
                </div>
                {todasListas && ordenActiva?.estado !== 'COMPLETADA' && (
                  <button className="rp-cerrar-btn" onClick={cerrarRuta} disabled={cerrandoRuta}>
                    {cerrandoRuta
                      ? <><Loader2 size={14} style={{animation:'rc-spin .6s linear infinite'}}/> Cerrando…</>
                      : <><CheckCircle2 size={14}/> Cerrar ruta y ver reporte</>}
                  </button>
                )}
                {ordenActiva?.estado === 'COMPLETADA' && (
                  <div className="rp-ruta-completada-badge">
                    <CheckCircle2 size={14}/> Ruta completada
                  </div>
                )}
              </div>
            )
          })()}

          {visitasPan.map((v, idx) => {
            const panelAb  = panelVisita === v.poliza_id
            const masAb    = mostrarMas  === v.poliza_id
            const resClass = v.resultado ? resultadoBadgeClass(v.resultado) : 'pendiente'
            const yaGestionada = !!v.resultado

            return (
              <div key={v.poliza_id} className={`rp-visita-item ${resClass}${yaGestionada ? ' gestionada' : ''}`}>
                {/* Info principal */}
                <div className="rp-visita-main">
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className={`rc-avatar${v.meses_mora > 0 ? ' mora' : ''}`} style={{ width: 40, height: 40, fontSize: 13 }}>
                      {iniciales(v.titular_nombre)}
                    </div>
                    {!yaGestionada && (
                      <div style={{
                        position: 'absolute', bottom: -4, right: -4,
                        width: 18, height: 18, borderRadius: '99px',
                        background: 'linear-gradient(135deg,#6366F1,#4338CA)',
                        color: '#fff', fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #fff', boxShadow: '0 1px 4px rgba(99,102,241,.4)',
                      }}>{idx + 1}</div>
                    )}
                  </div>

                  <div className="rp-visita-info">
                    <div className="rp-visita-nombre">{v.titular_nombre}</div>
                    <div className="rp-visita-meta">
                      <span>Póliza <strong>#{v.poliza_numero}</strong></span>
                      {v.titular_dir && <span><Home size={10} style={{ display: 'inline' }} /> {v.titular_dir}</span>}
                      {v.titular_cel && <span><Phone size={10} style={{ display: 'inline' }} /> {v.titular_cel}</span>}
                      {v.meses_mora > 0 && (
                        <span className="rp-mora-badge">{v.meses_mora} m mora</span>
                      )}
                    </div>
                    {/* Badge resultado ya gestionado */}
                    {v.resultado && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Fila 1: badge + valor + método + hora */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`rp-result-badge rc-badge ${v.resultado}`}>
                            {RESULTADO_ICONS[v.resultado]} {RESULTADO_LABELS[v.resultado]}
                          </span>
                          {v.valor_cobrado > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#10B981' }}>
                              {fmtCOP(v.valor_cobrado)}
                            </span>
                          )}
                          {v.metodo_pago && (
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{METODO_LABELS[v.metodo_pago] || v.metodo_pago}</span>
                          )}
                          {v.visitado_en && (
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                              <Clock size={10} style={{ display: 'inline' }} /> {fmtHora(v.visitado_en)}
                            </span>
                          )}
                        </div>

                        {/* Fila 2: info extra para PARCIAL */}
                        {v.resultado === 'PARCIAL' && v.valor_cobrado > 0 && (
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap', fontSize:11 }}>
                            <span style={{ color:'#D97706', fontWeight:700 }}>
                              Saldo pendiente: {fmtCOP(Number(v.valor_cuota) - Number(v.valor_cobrado))}
                            </span>
                            {v.fecha_promesa && (
                              <span style={{ color:'#6366F1', fontWeight:700 }}>
                                📅 Completa el {fmtFecha(v.fecha_promesa)} — agendado en ruta
                              </span>
                            )}
                          </div>
                        )}

                        {/* Fila 2: info extra para APLAZADO */}
                        {v.resultado === 'APLAZADO' && v.fecha_promesa && (
                          <div style={{ fontSize:11, color:'#6366F1', fontWeight:700 }}>
                            ↷ Volver el {fmtFecha(v.fecha_promesa)} — agendado automáticamente en ruta
                          </div>
                        )}

                        {/* Fila 2: info extra para PROMESA */}
                        {v.resultado === 'PROMESA' && v.fecha_promesa && (
                          <div style={{ fontSize:11, color:'#6366F1', fontWeight:700 }}>
                            ◷ Promete pagar el {fmtFecha(v.fecha_promesa)} — agendado en ruta
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rp-visita-cuota-wrap">
                    <div className="rp-visita-cuota">{fmtCOP(v.valor_cuota)}</div>
                    <div className="rp-visita-cuota-lbl">cuota</div>
                  </div>
                </div>

                {/* Botones de acción + panel de pago — solo si NO está gestionada */}
                {!yaGestionada && (
                  <>
                  <div className="rp-acciones">
                    <button
                      className="rp-accion-btn cobrar"
                      onClick={() => abrirAccion(v.poliza_id, 'COBRADO', v)}
                      disabled={guardandoVisita}
                    >
                      ✓ COBRAR
                    </button>
                    <button
                      className="rp-accion-btn parcial"
                      onClick={() => abrirAccion(v.poliza_id, 'PARCIAL', v)}
                      disabled={guardandoVisita}
                    >
                      ½ PARCIAL
                    </button>
                    <button
                      className="rp-accion-btn promesa"
                      onClick={() => abrirAccion(v.poliza_id, 'PROMESA', v)}
                      disabled={guardandoVisita}
                    >
                      ◷ PROMESA
                    </button>
                    <button
                      className="rp-accion-btn ausente"
                      onClick={() => abrirAccion(v.poliza_id, 'AUSENTE', v)}
                      disabled={guardandoVisita}
                    >
                      — AUSENTE
                    </button>
                    <button
                      className="rp-accion-btn mas"
                      onClick={() => setMostrarMas(masAb ? null : v.poliza_id)}
                      disabled={guardandoVisita}
                    >
                      <MoreHorizontal size={14} /> MÁS
                    </button>
                  </div>

                  {/* Opciones extra (NO_PAGA, APLAZADO) */}
                  {masAb && (
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap', background: '#FAFBFF' }}>
                      <button
                        className="rp-accion-btn"
                        style={{ background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA', border: '1.5px solid' }}
                        onClick={() => { setMostrarMas(null); abrirAccion(v.poliza_id, 'NO_PAGA', v) }}
                      >
                        ✗ NO PAGA
                      </button>
                      <button
                        className="rp-accion-btn"
                        style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE', border: '1.5px solid' }}
                        onClick={() => { setMostrarMas(null); abrirAccion(v.poliza_id, 'APLAZADO', v) }}
                      >
                        ↷ APLAZADO
                      </button>
                    </div>
                  )}

                {/* Panel inline de pago */}
                {panelAb && (
                  <div className="rp-pago-panel">
                    <div className="rp-pago-title">
                      {accionVisita === 'COBRADO' && '✓ Registrar cobro completo'}
                      {accionVisita === 'PARCIAL' && '½ Registrar pago parcial'}
                      {accionVisita === 'PROMESA' && '◷ Registrar promesa de pago'}
                      {accionVisita === 'NO_PAGA' && '✗ Registrar negativa de pago'}
                      {accionVisita === 'APLAZADO' && '↷ Registrar aplazamiento'}
                    </div>

                    {/* Valor y método (para cobros) */}
                    {(accionVisita === 'COBRADO' || accionVisita === 'PARCIAL') && (
                      <div className="rp-pago-row">
                        <div className="rp-pago-field">
                          <label>Valor cobrado</label>
                          <CurrencyInput
                            value={formPago.valor}
                            placeholder={String(v.valor_cuota || 0)}
                            onChange={v => setFormPago(f => ({ ...f, valor: v }))}
                          />
                        </div>
                        <div className="rp-pago-field">
                          <label>Método de pago</label>
                          <select
                            value={formPago.metodo_pago}
                            onChange={e => setFormPago(f => ({ ...f, metodo_pago: e.target.value }))}
                          >
                            {METODOS_PAGO.map(m => <option key={m} value={m}>{METODO_LABELS[m]}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Fecha de promesa */}
                    {accionVisita === 'PROMESA' && (
                      <div className="rp-pago-row">
                        <div className="rp-pago-field">
                          <label>Fecha comprometida</label>
                          <input
                            type="date"
                            value={formPago.fecha_promesa}
                            min={hoy()}
                            onChange={e => setFormPago(f => ({ ...f, fecha_promesa: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}

                    {/* Fecha de aplazamiento */}
                    {accionVisita === 'APLAZADO' && (
                      <div className="rp-pago-row">
                        <div className="rp-pago-field">
                          <label>Regresar el día</label>
                          <input
                            type="date"
                            value={formPago.fecha_promesa}
                            min={hoy()}
                            onChange={e => setFormPago(f => ({ ...f, fecha_promesa: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}

                    {/* Observaciones */}
                    <div className="rp-pago-row">
                      <div className="rp-pago-field" style={{ flex: 1 }}>
                        <label>Observaciones</label>
                        <textarea
                          rows={2}
                          value={formPago.observaciones}
                          placeholder="Opcional…"
                          onChange={e => setFormPago(f => ({ ...f, observaciones: e.target.value }))}
                        />
                      </div>
                    </div>

                    {errorVisita && (
                      <div style={{
                        background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8,
                        padding:'8px 12px', fontSize:12, color:'#DC2626', marginBottom:8,
                        display:'flex', gap:6, alignItems:'center'
                      }}>
                        <AlertCircle size={13}/> {errorVisita}
                      </div>
                    )}
                    <div className="rp-pago-btns">
                      <button className="rp-cancel-btn" onClick={() => { setPanelVisita(null); setAccionVisita(''); setErrorVisita('') }}>
                        Cancelar
                      </button>
                      <button
                        className="rp-guardar-btn"
                        disabled={guardandoVisita}
                        onClick={() => ejecutarAccion(v.poliza_id, accionVisita, undefined, v)}
                      >
                        {guardandoVisita
                          ? <><Loader2 size={13} style={{ animation: 'rc-spin .6s linear infinite' }} /> Guardando…</>
                          : <><CheckCircle2 size={13} /> Guardar</>
                        }
                      </button>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* ── Modal de recibo POS-80 ── */}
      {reciboModal && (
        <div className="rp-recibo-overlay" onClick={e => { if (e.target === e.currentTarget) setReciboModal(null) }}>
          <div className="rp-recibo-box">

            {/* Ticket POS */}
            <div className="rp-ticket" id="rp-ticket-print">

              {/* Encabezado empresa */}
              <div className="rp-ticket-head">
                <div className="rp-ticket-empresa">{reciboModal.empresa_nombre || 'FUNERARIA SAN JOSÉ DE ÁBREGO'}</div>
                <div className="rp-ticket-sub">NIT {reciboModal.empresa_nit}-{reciboModal.empresa_dv}</div>
                {reciboModal.empresa_dir && <div className="rp-ticket-sub">{reciboModal.empresa_dir}</div>}
                {reciboModal.empresa_ciudad && <div className="rp-ticket-sub">{reciboModal.empresa_ciudad}</div>}
                {reciboModal.empresa_tel && <div className="rp-ticket-sub">Tel: {reciboModal.empresa_tel}</div>}
                {reciboModal.empresa_email && <div className="rp-ticket-sub">{reciboModal.empresa_email}</div>}
              </div>

              <div className="rp-ticket-sep">{'- '.repeat(24)}</div>

              {/* Tipo y número */}
              <div className="rp-ticket-tipo">
                {reciboModal.resultado === 'PROMESA' ? 'COMPROBANTE DE PROMESA' : 'RECIBO DE RECAUDO'}
              </div>
              <div className="rp-ticket-num">N° {reciboModal.numero}</div>
              <div className="rp-ticket-fecha">{reciboModal.fecha_hora}</div>

              <div className="rp-ticket-sep">{'- '.repeat(24)}</div>

              {/* Datos del titular */}
              <div className="rp-ticket-section">TITULAR</div>
              <div className="rp-ticket-row">
                <span>{reciboModal.tipo_documento || 'CC'}</span>
                <span>{reciboModal.documento}</span>
              </div>
              <div className="rp-ticket-nombre">{reciboModal.titular}</div>
              {reciboModal.titular_tel && (
                <div className="rp-ticket-row"><span>Tel</span><span>{reciboModal.titular_tel}</span></div>
              )}

              <div className="rp-ticket-sep">{'- '.repeat(24)}</div>

              {/* Datos de la póliza */}
              <div className="rp-ticket-section">PÓLIZA</div>
              <div className="rp-ticket-row">
                <span>Número</span>
                <span>#{reciboModal.poliza_numero}</span>
              </div>
              <div className="rp-ticket-row">
                <span>Plan</span>
                <span>{reciboModal.plan_nombre}</span>
              </div>
              <div className="rp-ticket-row">
                <span>Cuota mensual</span>
                <span>{fmtCOP(reciboModal.valor_cuota)}</span>
              </div>
              {reciboModal.meses_mora_antes > 0 && (
                <div className="rp-ticket-row mora">
                  <span>Meses en mora</span>
                  <span>{reciboModal.meses_mora_antes} mes{reciboModal.meses_mora_antes > 1 ? 'es' : ''}</span>
                </div>
              )}

              <div className="rp-ticket-sep">{'- '.repeat(24)}</div>

              {/* Detalle del pago */}
              <div className="rp-ticket-section">DETALLE DE PAGO</div>

              {reciboModal.resultado === 'PROMESA' ? (
                <>
                  <div className="rp-ticket-row">
                    <span>Concepto</span>
                    <span>Promesa de pago</span>
                  </div>
                  <div className="rp-ticket-row">
                    <span>Fecha comprometida</span>
                    <span style={{ fontWeight: 700 }}>{fmtFecha(reciboModal.fecha_promesa)}</span>
                  </div>
                  <div className="rp-ticket-row">
                    <span>Valor prometido</span>
                    <span>{fmtCOP(reciboModal.valor_cuota)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="rp-ticket-row">
                    <span>Concepto</span>
                    <span>Cuota póliza prepago</span>
                  </div>
                  {reciboModal.saldo_anterior > 0 && (
                    <div className="rp-ticket-row">
                      <span>Saldo anterior</span>
                      <span>{fmtCOP(reciboModal.saldo_anterior)}</span>
                    </div>
                  )}
                  <div className="rp-ticket-row">
                    <span>Valor recibido</span>
                    <span>{fmtCOP(reciboModal.valor_cobrado)}</span>
                  </div>
                  <div className="rp-ticket-row">
                    <span>Forma de pago</span>
                    <span>{METODO_LABELS[reciboModal.metodo_pago] || reciboModal.metodo_pago}</span>
                  </div>
                  {reciboModal.pago_hasta_nuevo && (
                    <div className="rp-ticket-row">
                      <span>Póliza vigente hasta</span>
                      <span style={{ fontWeight: 700 }}>{fmtFecha(reciboModal.pago_hasta_nuevo)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="rp-ticket-sep rp-ticket-sep-doble">{'= '.repeat(24)}</div>

              {/* Total */}
              <div className="rp-ticket-total-row">
                <span>{reciboModal.resultado === 'PROMESA' ? 'VALOR PROMETIDO' : 'TOTAL RECIBIDO'}</span>
                <span>{fmtCOP(reciboModal.resultado === 'PROMESA' ? reciboModal.valor_cuota : reciboModal.valor_cobrado)}</span>
              </div>

              <div className="rp-ticket-sep rp-ticket-sep-doble">{'= '.repeat(24)}</div>

              {/* Observaciones */}
              {reciboModal.observaciones && (
                <div className="rp-ticket-obs">Obs: {reciboModal.observaciones}</div>
              )}

              {/* Recaudador */}
              <div className="rp-ticket-sep">{'- '.repeat(24)}</div>
              <div className="rp-ticket-row">
                <span>Recaudador</span>
                <span>{reciboModal.recaudador || nombreUsuario}</span>
              </div>

              {/* Firma */}
              <div className="rp-ticket-firma-wrap">
                <div className="rp-ticket-firma-line" />
                <div className="rp-ticket-firma-lbl">Firma del titular</div>
              </div>

              {/* Pie DIAN */}
              <div className="rp-ticket-sep">{'- '.repeat(24)}</div>
              <div className="rp-ticket-dian">
                {reciboModal.resultado === 'PROMESA'
                  ? 'Comprobante de compromiso de pago. No es soporte de pago efectivo.'
                  : 'Documento equivalente a factura según Art. 616-1 E.T. Resolución DIAN.'}
              </div>
              {reciboModal.empresa_pie && (
                <div className="rp-ticket-pie">{reciboModal.empresa_pie}</div>
              )}
              <div className="rp-ticket-agradece">¡Gracias por su pago!</div>
            </div>

            {/* Botones fuera del área de impresión */}
            <div className="rp-recibo-actions rp-no-print">
              <button className="rp-cerrar" onClick={() => setReciboModal(null)}>Cerrar</button>
              <button className="rp-imprimir" onClick={() => window.print()}>
                <Printer size={14} style={{ display: 'inline', marginRight: 6 }} />
                Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Reporte de Ruta ── */}
      {reporteRuta && (
        <div className="rp-modal-overlay" onClick={() => setReporteRuta(null)}>
          <div className="rp-reporte-modal" onClick={e => e.stopPropagation()}>
            <div className="rp-reporte-head">
              <div>
                <div className="rp-reporte-title">Reporte de Ruta</div>
                <div className="rp-reporte-sub">{reporteRuta.ruta} · {reporteRuta.zona} · {fmtFecha(reporteRuta.fecha)}</div>
              </div>
              <button className="rp-cerrar" onClick={() => setReporteRuta(null)}>✕</button>
            </div>

            {/* KPIs */}
            <div className="rp-reporte-kpis">
              <div className="rp-reporte-kpi green">
                <div className="rp-reporte-kpi-val">{fmtCOP(reporteRuta.totalCobrado)}</div>
                <div className="rp-reporte-kpi-lbl">Total cobrado</div>
              </div>
              <div className="rp-reporte-kpi blue">
                <div className="rp-reporte-kpi-val">{reporteRuta.efectividad}%</div>
                <div className="rp-reporte-kpi-lbl">Efectividad</div>
              </div>
              <div className="rp-reporte-kpi purple">
                <div className="rp-reporte-kpi-val">{reporteRuta.horas}h {reporteRuta.mins}m</div>
                <div className="rp-reporte-kpi-lbl">Tiempo total</div>
              </div>
              <div className="rp-reporte-kpi gray">
                <div className="rp-reporte-kpi-val">~{reporteRuta.minPorVisita} min</div>
                <div className="rp-reporte-kpi-lbl">Por visita</div>
              </div>
            </div>

            {/* Desglose */}
            <div className="rp-reporte-desglose">
              <div className="rp-reporte-row">
                <span>Visitas realizadas</span><strong>{reporteRuta.total}</strong>
              </div>
              <div className="rp-reporte-row cobrado">
                <span>✓ Cobradas</span><strong>{reporteRuta.cobradas}</strong>
              </div>
              <div className="rp-reporte-row promesa">
                <span>◷ Promesas</span><strong>{reporteRuta.promesas}</strong>
              </div>
              <div className="rp-reporte-row ausente">
                <span>— Ausentes</span><strong>{reporteRuta.ausentes}</strong>
              </div>
              <div className="rp-reporte-row nopaga">
                <span>✗ No paga / Aplazado</span><strong>{reporteRuta.noPaga}</strong>
              </div>
            </div>

            {/* Lista detalle */}
            <div className="rp-reporte-lista-title">Detalle por cliente</div>
            <div className="rp-reporte-lista">
              {reporteRuta.visitas.map((v, i) => (
                <div key={v.poliza_id} className="rp-reporte-lista-item">
                  <span className="rp-reporte-idx">{i+1}</span>
                  <div className="rp-reporte-lista-info">
                    <span className="rp-reporte-lista-nombre">{v.titular_nombre}</span>
                    <span className="rp-reporte-lista-dir">{v.titular_dir}</span>
                  </div>
                  <span className={`rc-badge ${v.resultado || 'pendiente'}`} style={{fontSize:10}}>
                    {RESULTADO_ICONS[v.resultado] || '?'} {RESULTADO_LABELS[v.resultado] || 'Pendiente'}
                  </span>
                  {v.valor_cobrado > 0 && (
                    <span style={{fontWeight:800,color:'#10B981',fontSize:12,marginLeft:6}}>
                      {fmtCOP(v.valor_cobrado)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="rp-reporte-footer">
              <button className="rp-imprimir" onClick={() => window.print()}>
                <Printer size={14} style={{display:'inline',marginRight:6}}/>Imprimir reporte
              </button>
              <button className="rp-cerrar" onClick={() => setReporteRuta(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 5 — CALENDARIO DE RECAUDOS
   ═══════════════════════════════════════════════════════════════════════════ */
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function TabCalendario() {
  const hoyDate = new Date()
  const [anio, setAnio]  = useState(hoyDate.getFullYear())
  const [mes,  setMes]   = useState(hoyDate.getMonth() + 1)
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(false)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [rutaFiltro, setRutaFiltro] = useState('todas')

  const cargar = useCallback(async (a, m) => {
    setLoading(true)
    setDiaSeleccionado(null)
    try {
      const r = await api.get(`/recaudo/calendario?anio=${a}&mes=${m}`)
      setDatos(r.data)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar(anio, mes) }, [anio, mes, cargar])

  const navMes = delta => {
    let nm = mes + delta
    let na = anio
    if (nm < 1) { nm = 12; na-- }
    if (nm > 12) { nm = 1; na++ }
    setMes(nm); setAnio(na)
  }

  // Construir grilla del calendario
  const primerDia = new Date(anio, mes - 1, 1).getDay() // 0=Dom
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)
  while (celdas.length % 7 !== 0) celdas.push(null)

  const calendario = datos?.calendario || {}

  // Todas las rutas únicas para leyenda
  const todasRutas = []
  const rutasSet = new Set()
  Object.values(calendario).forEach(rutas =>
    rutas.forEach(r => {
      if (!rutasSet.has(r.ruta_id)) {
        rutasSet.add(r.ruta_id)
        todasRutas.push({ id: r.ruta_id, nombre: r.ruta_nombre, color: r.color })
      }
    })
  )

  const diaData = diaSeleccionado ? (calendario[diaSeleccionado] || []) : []
  const diaDataFiltrado = rutaFiltro === 'todas'
    ? diaData
    : diaData.filter(r => r.ruta_id === rutaFiltro)

  const esHoy = d => d === hoyDate.getDate() && mes === hoyDate.getMonth() + 1 && anio === hoyDate.getFullYear()

  return (
    <div className="cal-wrap">
      {/* Header calendario */}
      <div className="cal-header">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => navMes(-1)}>‹</button>
          <span className="cal-mes-label">{MESES_ES[mes-1]} {anio}</span>
          <button className="cal-nav-btn" onClick={() => navMes(1)}>›</button>
        </div>
        <div className="cal-leyenda">
          {todasRutas.map(r => (
            <span key={r.id} className="cal-leyenda-item">
              <span className="cal-dot" style={{ background: r.color }} />
              {r.nombre}
            </span>
          ))}
        </div>
        <button className="cal-hoy-btn" onClick={() => { setAnio(hoyDate.getFullYear()); setMes(hoyDate.getMonth()+1) }}>
          Hoy
        </button>
      </div>

      {loading ? (
        <div className="cal-loading"><Loader2 size={28} className="spin" /> Cargando calendario…</div>
      ) : (
        <div className="cal-layout">
          {/* Grilla */}
          <div className="cal-grid-wrap">
            {/* Días de la semana */}
            <div className="cal-dias-semana">
              {DIAS_SEMANA.map(d => <div key={d} className="cal-ds">{d}</div>)}
            </div>
            {/* Celdas */}
            <div className="cal-grid">
              {celdas.map((dia, i) => {
                if (!dia) return <div key={`e${i}`} className="cal-celda vacia" />
                const rutasDia = calendario[dia] || []
                const rutasFiltradas = rutaFiltro === 'todas' ? rutasDia : rutasDia.filter(r => r.ruta_id === rutaFiltro)
                const totalPolizas = rutasFiltradas.reduce((s, r) => s + r.total, 0)
                const totalCobradas = rutasFiltradas.reduce((s, r) => s + r.cobradas, 0)
                const activa = diaSeleccionado === dia
                return (
                  <div
                    key={dia}
                    className={`cal-celda${activa ? ' seleccionada' : ''}${esHoy(dia) ? ' hoy' : ''}`}
                    onClick={() => setDiaSeleccionado(activa ? null : dia)}
                  >
                    <div className="cal-dia-num">{dia}</div>
                    {rutasFiltradas.map(r => (
                      <div key={r.ruta_id} className="cal-chip" style={{ background: r.color + '22', borderLeft: `3px solid ${r.color}`, color: r.color }}>
                        <span className="cal-chip-nombre">{r.ruta_nombre}</span>
                        <span className="cal-chip-count">{r.cobradas}/{r.total}</span>
                      </div>
                    ))}
                    {totalPolizas > 0 && (
                      <div className="cal-celda-total">{totalCobradas}/{totalPolizas} cobros</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel detalle día */}
          {diaSeleccionado && (
            <div className="cal-detalle">
              <div className="cal-detalle-header">
                <span className="cal-detalle-titulo">
                  {diaSeleccionado} de {MESES_ES[mes-1]}
                </span>
                <button className="cal-detalle-close" onClick={() => setDiaSeleccionado(null)}>✕</button>
              </div>
              {/* Filtro por ruta */}
              {todasRutas.length > 1 && (
                <div className="cal-filtro-rutas">
                  <button
                    className={`cal-filtro-btn${rutaFiltro === 'todas' ? ' activo' : ''}`}
                    onClick={() => setRutaFiltro('todas')}
                  >Todas</button>
                  {todasRutas.map(r => (
                    <button
                      key={r.id}
                      className={`cal-filtro-btn${rutaFiltro === r.id ? ' activo' : ''}`}
                      style={rutaFiltro === r.id ? { background: r.color, borderColor: r.color, color: '#fff' } : { borderColor: r.color, color: r.color }}
                      onClick={() => setRutaFiltro(rutaFiltro === r.id ? 'todas' : r.id)}
                    >{r.nombre}</button>
                  ))}
                </div>
              )}
              {diaDataFiltrado.length === 0 ? (
                <div className="cal-detalle-vacio">Sin cobros para este día</div>
              ) : (
                diaDataFiltrado.map(ruta => (
                  <div key={ruta.ruta_id} className="cal-ruta-bloque">
                    <div className="cal-ruta-header" style={{ borderLeft: `4px solid ${ruta.color}` }}>
                      <div>
                        <span className="cal-ruta-nombre" style={{ color: ruta.color }}>{ruta.ruta_nombre}</span>
                        <span className="cal-ruta-recaudador">{ruta.recaudador}</span>
                      </div>
                      <div className="cal-ruta-kpis">
                        <span className="cal-kpi-pill cobradas">{ruta.cobradas} cobradas</span>
                        <span className="cal-kpi-pill pendientes">{ruta.total - ruta.cobradas} pendientes</span>
                      </div>
                    </div>
                    <div className="cal-polizas-list">
                      {ruta.polizas.map(p => (
                        <div key={p.poliza_id} className={`cal-poliza-item${p.visita ? ' gestionada' : ''}`}>
                          <div className="cal-poliza-avatar" style={{ background: p.visita ? '#10b98122' : ruta.color + '22', color: p.visita ? '#10b981' : ruta.color }}>
                            {iniciales(p.titular_nombre)}
                          </div>
                          <div className="cal-poliza-info">
                            <span className="cal-poliza-nombre">{p.titular_nombre}</span>
                            <span className="cal-poliza-sub">Póliza #{p.numero} · Cuota {fmtCOP(p.valor_cuota)}</span>
                            {p.meses_mora > 0 && (
                              <span className="cal-poliza-mora">{p.meses_mora} mes{p.meses_mora > 1 ? 'es' : ''} mora · {fmtCOP(p.saldo_mora)}</span>
                            )}
                          </div>
                          <div className="cal-poliza-estado">
                            {p.visita
                              ? <span className={`rc-badge ${p.visita.resultado}`}>{RESULTADO_ICONS[p.visita.resultado]} {RESULTADO_LABELS[p.visita.resultado]}</span>
                              : <span className="cal-pendiente-badge">Pendiente</span>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'mipanel',    label: 'Mi Panel',       Icon: UserCheck  },
  { id: 'orden',      label: 'Orden del Día',  Icon: Wallet     },
  { id: 'calendario', label: 'Calendario',     Icon: Calendar   },
  { id: 'historial',  label: 'Historial',      Icon: History    },
  { id: 'indicadores',label: 'Indicadores',    Icon: BarChart2  },
]

export default function RecaudoPage() {
  const [tab, setTab] = useState('mipanel')

  return (
    <div className="rc">
      {/* Header */}
      <div className="rc-head">
        <div className="rc-head-left">
          <div className="rc-cat">Módulo</div>
          <div className="rc-title">
            <Wallet size={22} color="#6366F1" style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle' }} />
            Recaudo por Zonas
          </div>
          <div className="rc-sub">Gestión operativa de cobro en ruta — Funeraria San José de Abrego</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rc-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`rc-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.Icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'mipanel'     && <TabMiPanel />}
      {tab === 'orden'       && <TabOrden />}
      {tab === 'calendario'  && <TabCalendario />}
      {tab === 'historial'   && <TabHistorial />}
      {tab === 'indicadores' && <TabIndicadores />}
    </div>
  )
}
