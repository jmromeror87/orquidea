/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contabilidad — Flujo de Caja                         ║
 * ║  Archivo         : FlujoCajaTab.jsx                                     ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Movimiento de caja/bancos en el tiempo: entradas vs. salidas por período
 * (área/barras) + saldo acumulado (línea), y el desglose de qué operación
 * generó cada entrada/salida (barras horizontales) — el mismo lenguaje
 * visual que usan los ERP financieros grandes (tesorería a simple vista).
 */
import { useState, useEffect } from 'react'
import {
  ComposedChart, Bar, Line, BarChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtCorto = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n}`
}
const hoyISO = () => new Date().toISOString().slice(0, 10)
const inicioAnio = () => `${new Date().getFullYear()}-01-01`

const COLOR_ENTRADA = '#059669'
const COLOR_SALIDA  = '#DC2626'
const COLOR_SALDO   = '#2E3192'
const PALETA_CONCEPTOS = ['#4338CA', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DB2777', '#0EA5E9', '#64748B']

function TooltipPersonalizado({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #ECEDF8', borderRadius: 10, padding: '10px 14px', boxShadow: '0 6px 20px rgba(0,0,0,.08)' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9CA3AF', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12.5, color: p.color, fontWeight: 700 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function FlujoCajaTab() {
  const [desde, setDesde] = useState(inicioAnio())
  const [hasta, setHasta] = useState(hoyISO())
  const [granularidad, setGranularidad] = useState('dia')
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    setLoading(true)
    try {
      const r = await api.get('/contabilidad/reportes/flujo-caja', { params: { desde, hasta, granularidad } })
      setData(r.data.data)
      setMeta(r.data.meta)
    } catch {
      toast.error('No se pudo generar el flujo de caja')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [desde, hasta, granularidad])

  const fmtEjeFecha = (iso) => {
    const d = new Date(iso)
    if (granularidad === 'mes') return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

  const serie = (data?.serie || []).map(s => ({ ...s, fechaLabel: fmtEjeFecha(s.periodo) }))

  return (
    <div>
      <div className="ctb-head-row">
        <div>
          <div className="ctb-title" style={{ fontSize: 20 }}>Flujo de Caja</div>
          <div className="ctb-sub">Movimiento de caja y bancos — entradas, salidas y saldo acumulado</div>
        </div>
        <button className="btn-icon" onClick={cargar} title="Actualizar"><RefreshCw size={15} /></button>
      </div>

      <div className="ctb-toolbar" style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 700 }}>Desde</span>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="select-filter" style={{ fontFamily: 'inherit' }} />
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 700 }}>Hasta</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="select-filter" style={{ fontFamily: 'inherit' }} />
        <select className="select-filter" value={granularidad} onChange={e => setGranularidad(e.target.value)}>
          <option value="dia">Por día</option>
          <option value="semana">Por semana</option>
          <option value="mes">Por mes</option>
        </select>
      </div>

      {meta && (
        <div className="ctb-kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="ctb-kpi" style={{ background: '#EEF2FF', color: '#2E3192' }}>
            <div className="ctb-kpi-label"><Wallet size={11} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />Saldo inicial</div>
            <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.saldo_inicial)}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#ECFDF5', color: COLOR_ENTRADA }}>
            <div className="ctb-kpi-label"><TrendingUp size={11} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />Entradas</div>
            <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.total_entradas)}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#FEF2F2', color: COLOR_SALIDA }}>
            <div className="ctb-kpi-label"><TrendingDown size={11} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />Salidas</div>
            <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.total_salidas)}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
            <div className="ctb-kpi-label">Saldo final</div>
            <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.saldo_final)}</div>
          </div>
        </div>
      )}

      <div className="sec-card" style={{ marginBottom: 16 }}>
        <div className="sec-body">
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F1035', marginBottom: 14 }}>Entradas, salidas y saldo acumulado</div>
          {loading ? (
            <div className="ctb-empty">Generando gráfica…</div>
          ) : serie.length === 0 ? (
            <div className="ctb-empty">Sin movimientos de caja/bancos en este rango todavía.</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap={serie.length <= 3 ? '35%' : '20%'}>
                <defs>
                  <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_ENTRADA} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLOR_ENTRADA} stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="gradSalidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_SALIDA} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLOR_SALIDA} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F1FA" vertical={false} />
                <XAxis dataKey="fechaLabel" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#ECEDF8' }} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={fmtCorto} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={fmtCorto} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: '#FAFBFF' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar yAxisId="left" dataKey="entradas" name="Entradas" fill="url(#gradEntradas)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Bar yAxisId="left" dataKey="salidas" name="Salidas" fill="url(#gradSalidas)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Line yAxisId="right" type="monotone" dataKey="saldo_acumulado" name="Saldo acumulado"
                  stroke={COLOR_SALDO} strokeWidth={3}
                  dot={{ r: 4, fill: COLOR_SALDO, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="sec-card">
          <div className="sec-body">
            <div style={{ fontSize: 13, fontWeight: 800, color: COLOR_ENTRADA, marginBottom: 14 }}>¿De dónde entró el dinero?</div>
            {!data?.entradas?.length ? (
              <div className="ctb-empty" style={{ padding: 24 }}>Sin entradas en el rango</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(150, data.entradas.length * 50)}>
                <BarChart data={data.entradas} layout="vertical" margin={{ left: 8, right: 48 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1FA" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10.5, fill: '#9CA3AF' }} tickFormatter={fmtCorto} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="concepto" width={170} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: '#FAFBFF' }} />
                  <Bar dataKey="total" name="Entrada" radius={[0, 8, 8, 0]} maxBarSize={26}>
                    {data.entradas.map((_, i) => <Cell key={i} fill={PALETA_CONCEPTOS[i % PALETA_CONCEPTOS.length]} />)}
                    <LabelList dataKey="total" position="right" formatter={fmtCorto} style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="sec-card">
          <div className="sec-body">
            <div style={{ fontSize: 13, fontWeight: 800, color: COLOR_SALIDA, marginBottom: 14 }}>¿En qué salió el dinero?</div>
            {!data?.salidas?.length ? (
              <div className="ctb-empty" style={{ padding: 24 }}>Sin salidas en el rango</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(150, data.salidas.length * 50)}>
                <BarChart data={data.salidas} layout="vertical" margin={{ left: 8, right: 48 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1FA" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10.5, fill: '#9CA3AF' }} tickFormatter={fmtCorto} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="concepto" width={170} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: '#FAFBFF' }} />
                  <Bar dataKey="total" name="Salida" radius={[0, 8, 8, 0]} maxBarSize={26}>
                    {data.salidas.map((_, i) => <Cell key={i} fill={PALETA_CONCEPTOS[(i + 3) % PALETA_CONCEPTOS.length]} />)}
                    <LabelList dataKey="total" position="right" formatter={fmtCorto} style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
