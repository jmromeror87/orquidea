/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes y Analytics                            ║
 * ║  Archivo         : ReportesPage.jsx                                ║
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
  BarChart2, DollarSign, TrendingUp, ShieldCheck, Package,
  Download, FileSpreadsheet, FileText as FileIcon, Wallet, AlertTriangle,
  Sparkles, Syringe,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtNum = (n) => new Intl.NumberFormat('es-CO').format(n || 0)

const ESTADO_META = {
  VIGENTE:    { label: 'Vigente',    color: '#059669', bg: '#D1FAE5' },
  SUSPENDIDA: { label: 'Suspendida', color: '#D97706', bg: '#FEF3C7' },
  VENCIDA:    { label: 'Vencida',    color: '#EF4444', bg: '#FEE2E2' },
  EJECUTADA:  { label: 'Ejecutada',  color: '#6366F1', bg: '#EEF2FF' },
  CANCELADA:  { label: 'Cancelada',  color: '#9CA3AF', bg: '#F3F4F6' },
}

const TABS = [
  { key: 'financiero', label: 'Financiero', Icon: DollarSign },
  { key: 'ventas',     label: 'Ventas',     Icon: TrendingUp },
  { key: 'cartera',    label: 'Cartera',    Icon: ShieldCheck },
  { key: 'operativo',  label: 'Operativo',  Icon: Package },
  { key: 'tanatopraxia', label: 'Tanatopraxia', Icon: Syringe },
]

const CSS = `
.rp-page { display:flex; flex-direction:column; height:100%; background:#F7F8FC; overflow:hidden; }
.rp-head { background:#fff; border-bottom:1.5px solid #ECEDF8; padding:18px 24px 0; flex-shrink:0; }
.rp-head-top { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.rp-head-icon { width:44px; height:44px; border-radius:14px;
  background:linear-gradient(135deg,#0EA5E9,#0369A1);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 12px rgba(3,105,161,.3); flex-shrink:0; }
.rp-titulo { font-size:22px; font-weight:900; color:#0F1035; letter-spacing:-.5px; }
.rp-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }

.rp-tabs { display:flex; gap:4px; }
.rp-tab { display:flex; align-items:center; gap:7px; padding:10px 18px; font-size:13px; font-weight:700;
  color:#9CA3AF; cursor:pointer; border-bottom:3px solid transparent; transition:all .15s; }
.rp-tab:hover { color:#374151; }
.rp-tab.active { color:#0369A1; border-color:#0369A1; }

.rp-filters { display:flex; align-items:center; gap:10px; padding:16px 24px; background:#fff; border-bottom:1.5px solid #ECEDF8; flex-wrap:wrap; }
.rp-field label { display:block; font-size:10.5px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.4px; margin-bottom:4px; }
.rp-field input, .rp-field select { border:1.5px solid #E2E5F0; border-radius:10px; padding:8px 12px; font-size:13px; outline:none; background:#FAFBFF; }
.rp-field input:focus, .rp-field select:focus { border-color:#0369A1; background:#fff; }
.rp-spacer { flex:1; }
.rp-btn-exp { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px;
  font-size:12.5px; font-weight:700; cursor:pointer; border:1.5px solid #E2E5F0; background:#fff; color:#374151; transition:all .15s; }
.rp-btn-exp:hover { border-color:#0369A1; color:#0369A1; background:#EFF6FF; }

.rp-body { flex:1; overflow:auto; padding:20px 24px; }
.rp-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:20px; }
.rp-kpi { background:#fff; border-radius:16px; overflow:hidden; border:1.5px solid #ECEDF8; transition:all .2s; }
.rp-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.08); }
.rp-kpi-bar { height:3px; }
.rp-kpi-body { padding:14px 16px 12px; }
.rp-kpi-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
.rp-kpi-val { font-size:22px; font-weight:900; color:#0F1035; line-height:1; letter-spacing:-.5px; }
.rp-kpi-label { font-size:11px; color:#9CA3AF; font-weight:600; margin-top:4px; }

.rp-card { background:#fff; border-radius:16px; border:1.5px solid #ECEDF8; padding:18px 20px; margin-bottom:16px; }
.rp-card-title { font-size:13px; font-weight:800; color:#0F1035; margin-bottom:14px; display:flex; align-items:center; gap:8px; }

.rp-bars { display:flex; align-items:flex-end; gap:4px; height:120px; }
.rp-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
.rp-bar { width:100%; background:linear-gradient(180deg,#38BDF8,#0369A1); border-radius:4px 4px 0 0; min-height:2px; }
.rp-bar-label { font-size:9px; color:#9CA3AF; margin-top:4px; white-space:nowrap; }

.rp-table { width:100%; border-collapse:collapse; }
.rp-table th { text-align:left; font-size:10.5px; font-weight:800; color:#9CA3AF; letter-spacing:.5px; text-transform:uppercase; padding:10px 14px; background:#F7F8FC; }
.rp-table td { padding:11px 14px; font-size:13px; color:#374151; border-top:1px solid #F4F5FA; }
.rp-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
.rp-empty { text-align:center; padding:40px 20px; color:#9CA3AF; font-size:13px; }
.rp-loading { text-align:center; padding:60px 20px; color:#9CA3AF; }
`

function useReporte(tipo, filtros) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(() => {
    setLoading(true)
    const params = { fecha_inicio: filtros.desde, fecha_fin: filtros.hasta }
    if (filtros.sede) params.sede_id = filtros.sede
    api.get(`/reportes/${tipo}`, { params })
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Error al cargar el reporte'))
      .finally(() => setLoading(false))
  }, [tipo, filtros.desde, filtros.hasta, filtros.sede])

  useEffect(() => { cargar() }, [cargar])
  return { data, loading }
}

function Kpi({ grad, bg, color, Icon, val, label }) {
  return (
    <div className="rp-kpi">
      <div className="rp-kpi-bar" style={{ background: grad }} />
      <div className="rp-kpi-body">
        <div className="rp-kpi-icon" style={{ background: bg }}><Icon size={16} color={color} /></div>
        <div className="rp-kpi-val">{val}</div>
        <div className="rp-kpi-label">{label}</div>
      </div>
    </div>
  )
}

function TabFinanciero({ filtros }) {
  const { data, loading } = useReporte('financiero', filtros)
  if (loading) return <div className="rp-loading">Cargando…</div>
  if (!data) return null
  const maxSerie = Math.max(1, ...data.serie_diaria.map(s => +s.total))

  return (
    <>
      <div className="rp-kpis">
        <Kpi grad="linear-gradient(90deg,#10B981,#059669)" bg="#D1FAE5" color="#059669" Icon={Wallet}
          val={fmt(data.total_ingresos)} label="Total ingresos" />
        <Kpi grad="linear-gradient(90deg,#F59E0B,#D97706)" bg="#FEF3C7" color="#D97706" Icon={FileIcon}
          val={fmt(data.ingresos_contratos.total)} label={`Contratos (${fmtNum(data.ingresos_contratos.cantidad)} pagos)`} />
        <Kpi grad="linear-gradient(90deg,#6366F1,#4338CA)" bg="#EEF2FF" color="#4338CA" Icon={ShieldCheck}
          val={fmt(data.ingresos_polizas.total)} label={`Pólizas (${fmtNum(data.ingresos_polizas.cantidad)} pagos)`} />
      </div>
      <div className="rp-card">
        <div className="rp-card-title"><BarChart2 size={15} color="#0369A1" /> Ingresos por día ({data.rango.desde} — {data.rango.hasta})</div>
        {data.serie_diaria.length === 0 ? <div className="rp-empty">Sin pagos registrados en el rango seleccionado.</div> : (
          <div className="rp-bars">
            {data.serie_diaria.map(s => (
              <div className="rp-bar-col" key={s.fecha} title={`${s.fecha}: ${fmt(s.total)}`}>
                <div className="rp-bar" style={{ height: `${Math.max(3, (+s.total / maxSerie) * 100)}%` }} />
                <div className="rp-bar-label">{new Date(s.fecha).getUTCDate()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function TabVentas({ filtros }) {
  const { data, loading } = useReporte('ventas', filtros)
  if (loading) return <div className="rp-loading">Cargando…</div>
  if (!data) return null

  return (
    <div className="rp-card" style={{ padding: 0 }}>
      <table className="rp-table">
        <thead>
          <tr><th>Asesor</th><th>Rol</th><th>Ventas</th><th>Valor vendido</th><th>Comisión generada</th></tr>
        </thead>
        <tbody>
          {data.asesores.length === 0 && <tr><td colSpan={5} className="rp-empty">Sin ventas en el rango seleccionado.</td></tr>}
          {data.asesores.map(a => (
            <tr key={a.id}>
              <td style={{ fontWeight: 700, color: '#0F1035' }}>{a.nombre}</td>
              <td>{a.rol}</td>
              <td>{a.ventas}</td>
              <td>{fmt(a.valor_vendido)}</td>
              <td>{fmt(a.comision_generada)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabCartera({ filtros }) {
  const { data, loading } = useReporte('cartera', filtros)
  if (loading) return <div className="rp-loading">Cargando…</div>
  if (!data) return null

  return (
    <>
      <div className="rp-kpis">
        <Kpi grad="linear-gradient(90deg,#10B981,#059669)" bg="#D1FAE5" color="#059669" Icon={ShieldCheck}
          val={data.mora.al_dia} label="Pólizas al día" />
        <Kpi grad="linear-gradient(90deg,#F59E0B,#D97706)" bg="#FEF3C7" color="#D97706" Icon={AlertTriangle}
          val={data.mora.mora_leve} label="Mora 1-2 meses" />
        <Kpi grad="linear-gradient(90deg,#EF4444,#DC2626)" bg="#FEE2E2" color="#DC2626" Icon={AlertTriangle}
          val={data.mora.mora_alta} label="Mora +2 meses" />
        <Kpi grad="linear-gradient(90deg,#6366F1,#4338CA)" bg="#EEF2FF" color="#4338CA" Icon={Wallet}
          val={fmt(data.mora.valor_en_mora)} label="Valor en mora" />
      </div>

      <div className="rp-card" style={{ padding: 0 }}>
        <table className="rp-table">
          <thead><tr><th>Estado</th><th>Cantidad</th><th>Valor cuotas</th></tr></thead>
          <tbody>
            {data.por_estado.map(e => {
              const m = ESTADO_META[e.estado] || { label: e.estado, color: '#9CA3AF', bg: '#F3F4F6' }
              return (
                <tr key={e.estado}>
                  <td><span className="rp-chip" style={{ background: m.bg, color: m.color }}>{m.label}</span></td>
                  <td>{e.cantidad}</td>
                  <td>{fmt(e.valor_cuotas)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rp-card">
        <div className="rp-card-title"><FileIcon size={15} color="#0369A1" /> Cartera de contratos activos</div>
        <div className="rp-kpis" style={{ marginBottom: 0 }}>
          <Kpi grad="linear-gradient(90deg,#6366F1,#4338CA)" bg="#EEF2FF" color="#4338CA" Icon={FileIcon} val={data.contratos.cantidad} label="Contratos activos" />
          <Kpi grad="linear-gradient(90deg,#10B981,#059669)" bg="#D1FAE5" color="#059669" Icon={Wallet} val={fmt(data.contratos.valor_pagado)} label="Pagado" />
          <Kpi grad="linear-gradient(90deg,#EF4444,#DC2626)" bg="#FEE2E2" color="#DC2626" Icon={Wallet} val={fmt(data.contratos.saldo_pendiente)} label="Saldo pendiente" />
        </div>
      </div>
    </>
  )
}

function TabOperativo({ filtros }) {
  const { data, loading } = useReporte('operativo', filtros)
  if (loading) return <div className="rp-loading">Cargando…</div>
  if (!data) return null

  return (
    <>
      <div className="rp-kpis">
        <Kpi grad="linear-gradient(90deg,#6366F1,#4338CA)" bg="#EEF2FF" color="#4338CA" Icon={Wallet}
          val={fmt(data.recaudo.total_recaudado)} label="Recaudado en el período" />
        <Kpi grad="linear-gradient(90deg,#F59E0B,#D97706)" bg="#FEF3C7" color="#D97706" Icon={Wallet}
          val={fmt(data.recaudo.total_esperado)} label="Esperado en el período" />
        <Kpi grad="linear-gradient(90deg,#10B981,#059669)" bg="#D1FAE5" color="#059669" Icon={ShieldCheck}
          val={`${data.recaudo.ordenes_completadas}/${data.recaudo.ordenes_totales}`} label="Órdenes de recaudo completadas" />
      </div>

      <div className="rp-card" style={{ padding: 0 }}>
        <div className="rp-card-title" style={{ padding: '16px 20px 0' }}><Package size={15} color="#0369A1" /> Servicios funerarios por estado</div>
        <table className="rp-table">
          <thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
          <tbody>
            {data.servicios_por_estado.length === 0 && <tr><td colSpan={2} className="rp-empty">Sin servicios en el rango seleccionado.</td></tr>}
            {data.servicios_por_estado.map(s => <tr key={s.estado}><td>{s.estado}</td><td>{s.cantidad}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="rp-card" style={{ padding: 0 }}>
        <div className="rp-card-title" style={{ padding: '16px 20px 0' }}><AlertTriangle size={15} color="#D97706" /> Inventario bajo stock mínimo</div>
        <table className="rp-table">
          <thead><tr><th>SKU</th><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th></tr></thead>
          <tbody>
            {data.inventario_bajo_stock.length === 0 && <tr><td colSpan={4} className="rp-empty">Ningún producto por debajo del stock mínimo.</td></tr>}
            {data.inventario_bajo_stock.map(p => (
              <tr key={p.id}>
                <td>{p.codigo_sku}</td><td>{p.nombre}</td>
                <td style={{ color: '#DC2626', fontWeight: 700 }}>{p.stock_actual}</td><td>{p.stock_minimo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TabTanatopraxia({ filtros }) {
  const { data, loading } = useReporte('tanatopraxia-analisis', filtros)
  if (loading) return <div className="rp-loading">Generando análisis…</div>
  if (!data) return null

  const maxMes = Math.max(1, ...data.por_mes.map(m => +m.costo_total))

  return (
    <>
      <div className="rp-kpis">
        <Kpi grad="linear-gradient(90deg,#8B5CF6,#6D28D9)" bg="#F5F3FF" color="#6D28D9" Icon={Syringe}
          val={fmtNum(data.cuerpos_preparados)} label="Cuerpos preparados" />
        <Kpi grad="linear-gradient(90deg,#F59E0B,#D97706)" bg="#FEF3C7" color="#D97706" Icon={Wallet}
          val={fmt(data.costo_total)} label="Costo total en materiales" />
        <Kpi grad="linear-gradient(90deg,#0EA5E9,#0369A1)" bg="#E0F2FE" color="#0369A1" Icon={TrendingUp}
          val={fmt(data.costo_promedio_por_cuerpo)} label="Costo promedio por cuerpo" />
      </div>

      {data.narrativa && (
        <div className="rp-card" style={{ background: 'linear-gradient(135deg,#F5F3FF,#EEF2FF)', border: '1.5px solid #DDD6FE' }}>
          <div className="rp-card-title"><Sparkles size={15} color="#6D28D9" /> Análisis generado por IA</div>
          <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, margin: 0 }}>{data.narrativa}</p>
        </div>
      )}
      {!data.narrativa && data.narrativa_nota && (
        <div className="rp-card">
          <div className="rp-empty" style={{ padding: '20px 0' }}>{data.narrativa_nota}</div>
        </div>
      )}

      <div className="rp-card">
        <div className="rp-card-title"><BarChart2 size={15} color="#6D28D9" /> Costo de materiales por mes</div>
        {data.por_mes.length === 0 ? <div className="rp-empty">Sin consumo registrado en el rango seleccionado.</div> : (
          <div className="rp-bars">
            {data.por_mes.map(m => (
              <div className="rp-bar-col" key={m.mes} title={`${m.mes}: ${fmt(m.costo_total)}`}>
                <div className="rp-bar" style={{ height: `${Math.max(3, (+m.costo_total / maxMes) * 100)}%`, background: 'linear-gradient(180deg,#A78BFA,#6D28D9)' }} />
                <div className="rp-bar-label">{m.mes}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rp-card" style={{ padding: 0 }}>
        <div className="rp-card-title" style={{ padding: '16px 20px 0' }}><Package size={15} color="#6D28D9" /> Consumo por producto</div>
        <table className="rp-table">
          <thead><tr><th>Producto</th><th>Cantidad usada</th><th>Veces usado</th><th>Costo total</th></tr></thead>
          <tbody>
            {data.por_producto.length === 0 && <tr><td colSpan={4} className="rp-empty">Sin consumo registrado.</td></tr>}
            {data.por_producto.map(p => (
              <tr key={p.codigo_sku}>
                <td style={{ fontWeight: 700, color: '#0F1035' }}>{p.nombre}</td>
                <td>{p.cantidad_total}</td>
                <td>{p.veces_usado}</td>
                <td>{fmt(p.costo_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function ReportesPage() {
  const hoy = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [tab, setTab] = useState('financiero')
  const [desde, setDesde] = useState(inicioMes)
  const [hasta, setHasta] = useState(hoy)
  const [sede, setSede] = useState('')
  const [sedes, setSedes] = useState([])

  useEffect(() => {
    api.get('/usuarios/sedes').then(r => setSedes(r.data.data || [])).catch(() => {})
  }, [])

  const filtros = { desde, hasta, sede }

  const exportarExcel = () => {
    const params = new URLSearchParams({ fecha_inicio: desde, fecha_fin: hasta })
    if (sede) params.set('sede_id', sede)
    api.get(`/reportes/export/${tab}?${params}`, { responseType: 'blob' })
      .then(r => {
        const url = URL.createObjectURL(new Blob([r.data]))
        const a = document.createElement('a')
        a.href = url; a.download = `reporte-${tab}.xlsx`; a.click()
        URL.revokeObjectURL(url)
        toast.success('Reporte exportado a Excel con éxito')
      })
      .catch(() => toast.error('Error al exportar el reporte'))
  }

  const exportarPDF = async () => {
    try {
      const params = { fecha_inicio: desde, fecha_fin: hasta }
      if (sede) params.sede_id = sede
      const r = await api.get(`/reportes/${tab}`, { params })
      const data = r.data.data
      const doc = new jsPDF()
      const tabLabel = TABS.find(t => t.key === tab)?.label || tab
      doc.setFontSize(14)
      doc.text(`Orquídea ERP — Reporte ${tabLabel}`, 14, 16)
      doc.setFontSize(9)
      doc.text(`Período: ${desde} a ${hasta}`, 14, 22)

      let rows = []
      let head = []
      if (tab === 'financiero') {
        head = [['Concepto', 'Valor']]
        rows = [
          ['Ingresos por contratos', fmt(data.ingresos_contratos.total)],
          ['Ingresos por pólizas', fmt(data.ingresos_polizas.total)],
          ['Total ingresos', fmt(data.total_ingresos)],
        ]
      } else if (tab === 'ventas') {
        head = [['Asesor', 'Ventas', 'Valor vendido', 'Comisión']]
        rows = data.asesores.map(a => [a.nombre, a.ventas, fmt(a.valor_vendido), fmt(a.comision_generada)])
      } else if (tab === 'cartera') {
        head = [['Estado', 'Cantidad', 'Valor cuotas']]
        rows = data.por_estado.map(e => [e.estado, e.cantidad, fmt(e.valor_cuotas)])
      } else if (tab === 'operativo') {
        head = [['Estado servicio', 'Cantidad']]
        rows = data.servicios_por_estado.map(s => [s.estado, s.cantidad])
      }
      autoTable(doc, { startY: 28, head, body: rows, headStyles: { fillColor: [3, 105, 161] } })
      doc.save(`reporte-${tab}.pdf`)
      toast.success('Reporte exportado a PDF con éxito')
    } catch (e) {
      toast.error('Error al exportar el reporte')
    }
  }

  return (
    <div className="rp-page">
      <style>{CSS}</style>

      <div className="rp-head">
        <div className="rp-head-top">
          <div className="rp-head-icon"><BarChart2 size={22} color="#fff" /></div>
          <div>
            <div className="rp-titulo">Reportes y Analytics</div>
            <div className="rp-sub">Indicadores financieros, comerciales, de cartera y operativos</div>
          </div>
        </div>
        <div className="rp-tabs">
          {TABS.map(({ key, label, Icon }) => (
            <div key={key} className={`rp-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              <Icon size={15} /> {label}
            </div>
          ))}
        </div>
      </div>

      <div className="rp-filters">
        <div className="rp-field">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="rp-field">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div className="rp-field">
          <label>Sede</label>
          <select value={sede} onChange={e => setSede(e.target.value)}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="rp-spacer" />
        {tab !== 'tanatopraxia' && (
          <>
            <button className="rp-btn-exp" onClick={exportarExcel}><FileSpreadsheet size={14} /> Excel</button>
            <button className="rp-btn-exp" onClick={exportarPDF}><Download size={14} /> PDF</button>
          </>
        )}
      </div>

      <div className="rp-body">
        {tab === 'financiero' && <TabFinanciero filtros={filtros} />}
        {tab === 'ventas' && <TabVentas filtros={filtros} />}
        {tab === 'cartera' && <TabCartera filtros={filtros} />}
        {tab === 'operativo' && <TabOperativo filtros={filtros} />}
        {tab === 'tanatopraxia' && <TabTanatopraxia filtros={filtros} />}
      </div>
    </div>
  )
}
