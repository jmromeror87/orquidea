/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Dashboard                                            ║
 * ║  Archivo         : DashboardPage.jsx                                    ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-03                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../../services/api.js'

// ─── Utilidades ────────────────────────────────────────────────────────────────

const cop = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v ?? 0)

const num = (v) =>
  new Intl.NumberFormat('es-CO').format(v ?? 0)

const ESTADO_LABEL = {
  ACTIVO:     { label: 'Activo',     color: '#6366F1' },
  EN_CURSO:   { label: 'En curso',   color: '#10B981' },
  PENDIENTE:  { label: 'Pendiente',  color: '#F59E0B' },
  COMPLETADO: { label: 'Completado', color: '#64748B' },
  CANCELADO:  { label: 'Cancelado',  color: '#EF4444' },
}

const DISPOSICION_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h = 20, w = '100%', radius = 8 }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #E8E8F0 25%, #F4F4FA 50%, #E8E8F0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }}
    />
  )
}

function SkeletonCard() {
  return (
    <div style={styles.kpiCard}>
      <Skeleton h={44} w={44} radius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton h={12} w="60%" />
        <Skeleton h={24} w="45%" />
        <Skeleton h={11} w="80%" />
      </div>
    </div>
  )
}

function SkeletonChart({ h = 260 }) {
  return (
    <div style={{ ...styles.card, flex: 1 }}>
      <div style={{ marginBottom: 16 }}>
        <Skeleton h={18} w="40%" radius={6} />
      </div>
      <Skeleton h={h} radius={8} />
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, trend, trendLabel, color = '#6366F1' }) {
  const trendPositive = trend > 0
  const trendIcon = trendPositive ? '↑' : trend < 0 ? '↓' : '→'
  const trendColor = trendPositive ? '#10B981' : trend < 0 ? '#EF4444' : '#94A3B8'

  return (
    <div style={styles.kpiCard}>
      <div
        style={{
          ...styles.kpiIcon,
          background: `linear-gradient(135deg, ${color}1A, ${color}33)`,
          color,
        }}
      >
        {icon}
      </div>
      <div style={styles.kpiContent}>
        <p style={styles.kpiLabel}>{label}</p>
        <p style={styles.kpiValue}>{value}</p>
        <p style={styles.kpiSub}>{sub}</p>
        {trend !== undefined && trend !== null && (
          <span style={{ ...styles.kpiBadge, color: trendColor }}>
            {trendIcon} {Math.abs(trend).toFixed(1)}% {trendLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

function CopTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={styles.tooltip}>
      <p style={styles.tooltipLabel}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0', fontSize: 13 }}>
          {p.name}: {cop(p.value)}
        </p>
      ))}
    </div>
  )
}

function NumTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={styles.tooltip}>
      <p style={styles.tooltipLabel}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0', fontSize: 13 }}>
          {p.name}: {num(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Pie Label ────────────────────────────────────────────────────────────────

function PieLabelCustom({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [now, setNow]         = useState(new Date())
  const [vistaRecaudo, setVistaRecaudo] = useState('mensual') // 'mensual' | 'diario'

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/dashboard')
      setData(res.data.data)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const fechaStr = now.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const horaStr = now.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const trendRecaudo = data && data.kpis.recaudo_mes_anterior > 0
    ? ((data.kpis.recaudo_mes - data.kpis.recaudo_mes_anterior) / data.kpis.recaudo_mes_anterior) * 100
    : null

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorBox}>
          <span style={{ fontSize: 36 }}>⚠️</span>
          <p style={{ fontWeight: 700, color: '#0F1035', marginTop: 10, fontSize: 16 }}>
            Error al cargar el dashboard
          </p>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{error}</p>
          <button onClick={fetchDashboard} style={styles.retryBtn}>Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 99px; }
        ::-webkit-scrollbar-thumb { background: #C7D2FE; border-radius: 99px; }
      `}</style>

      <div style={styles.page}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>
              <span style={{ marginRight: 8 }}>🌸</span>Dashboard
            </h1>
            <p style={styles.headerSub}>
              {fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)}
            </p>
          </div>
          <div style={styles.clockBox}>
            <span style={styles.clock}>{horaStr}</span>
            <span style={styles.clockSub}>Hora local</span>
          </div>
        </div>

        {/* ── Fila 1: 6 KPIs ──────────────────────────────────────────── */}
        <div style={styles.kpiGrid}>
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KpiCard
                icon="⚗️"
                label="Servicios Activos"
                value={num(data.kpis.servicios_activos)}
                sub={`${num(data.kpis.en_curso)} en curso ahora`}
                color="#6366F1"
              />
              <KpiCard
                icon="📅"
                label="Servicios Hoy"
                value={num(data.kpis.hoy)}
                sub="Ingresados hoy"
                color="#8B5CF6"
              />
              <KpiCard
                icon="📋"
                label="Contratos del Mes"
                value={num(data.kpis.contratos_mes)}
                sub="Prevención este mes"
                color="#10B981"
              />
              <KpiCard
                icon="🛡️"
                label="Pólizas Vigentes"
                value={num(data.kpis.polizas_vigentes)}
                sub={`${num(data.kpis.polizas_mora)} con mora activa`}
                color="#F59E0B"
              />
              <KpiCard
                icon="💰"
                label="Recaudo del Mes"
                value={cop(data.kpis.recaudo_mes)}
                sub={`Mes anterior: ${cop(data.kpis.recaudo_mes_anterior)}`}
                trend={trendRecaudo}
                trendLabel="vs mes anterior"
                color="#10B981"
              />
              <KpiCard
                icon="🏛️"
                label="Salas Ocupadas"
                value={`${num(data.kpis.salas_ocupadas)} / ${num(data.kpis.total_salas)}`}
                sub={`${data.kpis.total_salas - data.kpis.salas_ocupadas} disponibles`}
                color="#6366F1"
              />
              <KpiCard
                icon="🛒"
                label="Ventas POS Hoy"
                value={cop(data.kpis.pos_total_hoy)}
                sub={`${num(data.kpis.pos_ventas_hoy)} venta${data.kpis.pos_ventas_hoy === 1 ? '' : 's'} de mostrador`}
                color="#16A34A"
              />
            </>
          )}
        </div>

        {/* ── Fila 2: Recaudo barras (2/3) + Pie disposición (1/3) ─── */}
        <div style={styles.row}>
          {loading ? (
            <>
              <SkeletonChart h={260} />
              <SkeletonChart h={260} />
            </>
          ) : (
            <>
              <div style={{ ...styles.card, flex: 2 }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>
                    {vistaRecaudo === 'mensual' ? 'Recaudo Mensual' : 'Recaudo del Mes por Día'}
                  </h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setVistaRecaudo('mensual')}
                      style={{
                        ...styles.badge, cursor: 'pointer', border: 'none',
                        opacity: vistaRecaudo === 'mensual' ? 1 : 0.5,
                      }}
                    >
                      Últimos 6 meses
                    </button>
                    <button
                      onClick={() => setVistaRecaudo('diario')}
                      style={{
                        ...styles.badge, cursor: 'pointer', border: 'none',
                        opacity: vistaRecaudo === 'diario' ? 1 : 0.5,
                      }}
                    >
                      Este mes por día
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={vistaRecaudo === 'mensual' ? data.recaudo_mensual : data.recaudo_diario}
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ECEDF8" vertical={false} />
                    <XAxis
                      dataKey={vistaRecaudo === 'mensual' ? 'mes' : 'dia'}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CopTooltip />} cursor={{ fill: '#F7F8FC' }} />
                    <Bar dataKey="total" name="Recaudo" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={52} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ ...styles.card, flex: 1, minWidth: 0 }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Tipo de Disposición</h3>
                </div>
                {data.disposicion.length === 0 ? (
                  <p style={styles.emptyText}>Sin datos de disposición</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.disposicion}
                        dataKey="total"
                        nameKey="tipo_disposicion"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        labelLine={false}
                        label={<PieLabelCustom />}
                      >
                        {data.disposicion.map((_, i) => (
                          <Cell key={i} fill={DISPOSICION_COLORS[i % DISPOSICION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [num(v), name]} />
                      <Legend
                        formatter={(v) => (
                          <span style={{ fontSize: 12, color: '#0F1035' }}>{v}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Fila 3: Líneas servicios (1/2) + Salas (1/2) ────────── */}
        <div style={styles.row}>
          {loading ? (
            <>
              <SkeletonChart h={220} />
              <SkeletonChart h={220} />
            </>
          ) : (
            <>
              <div style={{ ...styles.card, flex: 1 }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Servicios Registrados</h3>
                  <span style={styles.badge}>Últimos 6 meses</span>
                </div>
                {(data.servicios_mes?.length ?? 0) < 2 ? (
                  <div style={{ position: 'relative' }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={data.servicios_mes} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ECEDF8" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip content={<NumTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="total"
                          name="Servicios"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          dot={{ r: 7, fill: '#10B981', strokeWidth: 0 }}
                          activeDot={{ r: 9, strokeWidth: 0 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <span style={{
                      position: 'absolute', top: 4, right: 12,
                      fontSize: 11, color: '#94A3B8', fontStyle: 'italic',
                    }}>
                      Historial insuficiente para tendencia
                    </span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.servicios_mes} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ECEDF8" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip content={<NumTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Servicios"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={{ ...styles.card, flex: 1 }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Ocupación de Salas</h3>
                  <span style={styles.badgeOrange}>
                    {num(data.kpis.salas_ocupadas)}/{num(data.kpis.total_salas)} ocupadas
                  </span>
                </div>
                <div style={styles.salaList}>
                  {data.salas.length === 0 && (
                    <p style={styles.emptyText}>No hay salas registradas</p>
                  )}
                  {data.salas.map((sala, i) => {
                    const pct = sala.capacidad > 0
                      ? Math.min(100, (sala.servicios_activos / sala.capacidad) * 100)
                      : sala.ocupada ? 100 : 0
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1035' }}>{sala.nombre}</span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: 20,
                            padding: '2px 9px',
                            letterSpacing: '0.4px',
                            background: sala.ocupada ? '#FEF2F2' : '#F0FDF4',
                            color: sala.ocupada ? '#EF4444' : '#10B981',
                            border: `1px solid ${sala.ocupada ? '#FECACA' : '#BBF7D0'}`,
                          }}>
                            {sala.ocupada ? 'OCUPADA' : 'LIBRE'}
                          </span>
                        </div>
                        <div style={styles.progressBg}>
                          <div style={{
                            ...styles.progressFill,
                            width: `${pct}%`,
                            background: sala.ocupada
                              ? 'linear-gradient(90deg,#EF4444,#F87171)'
                              : 'linear-gradient(90deg,#10B981,#34D399)',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>
                          {sala.servicios_activos} activo(s)
                          {sala.capacidad ? ` · Capacidad: ${sala.capacidad}` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Fila 4: Oportunidades (1/2) + Últimos servicios (1/2) ── */}
        <div style={styles.row}>
          {loading ? (
            <>
              <SkeletonChart h={200} />
              <SkeletonChart h={200} />
            </>
          ) : (
            <>
              {/* Oportunidades de recaudo */}
              <div style={{ ...styles.card, flex: 1 }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Oportunidades de Recaudo</h3>
                  <span style={styles.badgeRed}>
                    {num(data.mora_stats?.total ?? 0)} en mora
                  </span>
                </div>

                {data.oportunidades.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0' }}>
                    <span style={{ fontSize: 28 }}>✅</span>
                    <p style={{ color: '#10B981', fontWeight: 700, marginTop: 8, fontSize: 15 }}>
                      Sin pólizas en mora
                    </p>
                    <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                      Todos los pagos están al día
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <div style={styles.moraStat}>
                        <span style={styles.moraStatVal}>
                          {num(data.mora_stats?.meses_acumulados ?? 0)}
                        </span>
                        <span style={styles.moraStatLbl}>Meses acumulados</span>
                      </div>
                      <div style={styles.moraStat}>
                        <span style={{ ...styles.moraStatVal, color: '#10B981' }}>
                          {cop(data.oportunidades.reduce((a, r) => a + +r.valor_estimado, 0))}
                        </span>
                        <span style={styles.moraStatLbl}>A recuperar</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
                      {data.oportunidades.map((o, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            background: '#FEF2F2',
                            color: '#EF4444',
                            borderRadius: 6,
                            padding: '3px 8px',
                            minWidth: 58,
                            textAlign: 'center',
                            flexShrink: 0,
                          }}>
                            {o.meses_mora} {o.meses_mora === 1 ? 'mes' : 'meses'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={styles.progressBg}>
                              <div style={{
                                ...styles.progressFill,
                                width: `${Math.min(100, (o.meses_mora / 12) * 100)}%`,
                                background: o.meses_mora >= 6
                                  ? 'linear-gradient(90deg,#EF4444,#F87171)'
                                  : o.meses_mora >= 3
                                    ? 'linear-gradient(90deg,#F59E0B,#FCD34D)'
                                    : 'linear-gradient(90deg,#6366F1,#818CF8)',
                              }} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: 100 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#0F1035', margin: 0 }}>
                              {num(o.cantidad)} póliza{o.cantidad !== 1 ? 's' : ''}
                            </p>
                            <p style={{ fontSize: 12, color: '#10B981', margin: 0 }}>
                              {cop(o.valor_estimado)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Últimos servicios */}
              <div style={{ ...styles.card, flex: 1 }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Últimos Servicios</h3>
                  <span style={styles.badge}>Recientes</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['N°', 'Difunto', 'Sala', 'Disposición', 'Estado'].map((h) => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.servicios_recientes.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#94A3B8', padding: '28px 0' }}>
                            Sin servicios registrados
                          </td>
                        </tr>
                      ) : (
                        data.servicios_recientes.map((s, i) => {
                          const est = ESTADO_LABEL[s.estado] ?? { label: s.estado, color: '#64748B' }
                          return (
                            <tr
                              key={i}
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                transition: 'background .15s',
                              }}
                            >
                              <td style={{ ...styles.td, fontWeight: 700, color: '#6366F1' }}>
                                {s.numero ?? `#${s.id}`}
                              </td>
                              <td style={styles.td}>{s.difunto ?? '—'}</td>
                              <td style={{ ...styles.td, color: '#64748B', fontSize: 13 }}>
                                {s.sala ?? '—'}
                              </td>
                              <td style={{ ...styles.td, fontSize: 13 }}>
                                {s.tipo_disposicion ?? '—'}
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  borderRadius: 20,
                                  padding: '2px 9px',
                                  background: `${est.color}18`,
                                  color: est.color,
                                  border: `1px solid ${est.color}44`,
                                }}>
                                  {est.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  )
}

// ─── Estilos ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    background: '#F7F8FC',
    minHeight: '100vh',
    padding: '24px 28px 48px',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#0F1035',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0F1035',
    margin: 0,
    letterSpacing: '-0.4px',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    margin: '4px 0 0',
    textTransform: 'capitalize',
  },
  clockBox: {
    textAlign: 'right',
    background: '#fff',
    border: '1px solid #ECEDF8',
    borderRadius: 12,
    padding: '10px 18px',
    boxShadow: '0 1px 6px rgba(99,102,241,.07)',
  },
  clock: {
    display: 'block',
    fontSize: 20,
    fontWeight: 700,
    color: '#6366F1',
    letterSpacing: '1px',
    fontVariantNumeric: 'tabular-nums',
  },
  clockSub: {
    fontSize: 11,
    color: '#94A3B8',
    display: 'block',
    textAlign: 'center',
    marginTop: 2,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 14,
    marginBottom: 18,
  },
  kpiCard: {
    background: '#fff',
    border: '1px solid #ECEDF8',
    borderRadius: 16,
    padding: '16px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    boxShadow: '0 1px 6px rgba(99,102,241,.05)',
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  kpiContent: {
    flex: 1,
    minWidth: 0,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    margin: 0,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0F1035',
    margin: '4px 0 2px',
    letterSpacing: '-0.3px',
    wordBreak: 'break-all',
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
    margin: 0,
  },
  kpiBadge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    marginTop: 4,
  },
  row: {
    display: 'flex',
    gap: 16,
    marginBottom: 18,
    alignItems: 'stretch',
  },
  card: {
    background: '#fff',
    border: '1px solid #ECEDF8',
    borderRadius: 16,
    padding: '18px 18px 14px',
    boxShadow: '0 1px 6px rgba(99,102,241,.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0F1035',
    margin: 0,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    background: '#EEF2FF',
    color: '#6366F1',
    borderRadius: 20,
    padding: '3px 10px',
    border: '1px solid #C7D2FE',
  },
  badgeOrange: {
    fontSize: 11,
    fontWeight: 600,
    background: '#FFF7ED',
    color: '#F59E0B',
    borderRadius: 20,
    padding: '3px 10px',
    border: '1px solid #FED7AA',
  },
  badgeRed: {
    fontSize: 11,
    fontWeight: 600,
    background: '#FEF2F2',
    color: '#EF4444',
    borderRadius: 20,
    padding: '3px 10px',
    border: '1px solid #FECACA',
  },
  salaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    maxHeight: 260,
    overflowY: 'auto',
  },
  progressBg: {
    background: '#F1F5F9',
    borderRadius: 99,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width .6s ease',
  },
  moraStat: {
    flex: 1,
    background: '#F7F8FC',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  moraStatVal: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0F1035',
  },
  moraStatLbl: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    fontSize: 10,
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '8px 10px',
    borderBottom: '2px solid #F1F5F9',
  },
  td: {
    padding: '10px 10px',
    fontSize: 13,
    color: '#0F1035',
    verticalAlign: 'middle',
  },
  tooltip: {
    background: '#0F1035',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    boxShadow: '0 4px 20px rgba(0,0,0,.25)',
  },
  tooltipLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: 600,
    margin: '0 0 6px',
  },
  errorBox: {
    background: '#fff',
    border: '1px solid #FECACA',
    borderRadius: 16,
    padding: 40,
    maxWidth: 420,
    margin: '80px auto',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(239,68,68,.08)',
  },
  retryBtn: {
    marginTop: 16,
    background: '#6366F1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    padding: '24px 0',
    margin: 0,
  },
}
