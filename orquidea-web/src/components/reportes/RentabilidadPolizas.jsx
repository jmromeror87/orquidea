/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes — rentabilidad de pólizas                   ║
 * ║  Archivo         : components/reportes/RentabilidadPolizas.jsx          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ¿Me conviene esta póliza? Tabla de todas las pólizas con lo que han pagado
 * desde que se afiliaron, lo que han costado sus servicios, el resultado, el
 * riesgo de su grupo familiar y la cuota que dejaría la utilidad deseada.
 * Clic en una fila abre su ficha año por año.
 */
import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Search, FileSpreadsheet, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, MinusCircle, ChevronUp, ChevronDown, Info } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import Angelito from '../ui/Angelito.jsx'

const $ = n => '$' + Math.round(+n || 0).toLocaleString('es-CO')
const $c = n => { const v = Math.abs(+n || 0); const s = n < 0 ? '−' : ''; return v >= 1e9 ? `${s}$${(v / 1e9).toFixed(2).replace('.', ',')} mil M` : v >= 1e6 ? `${s}$${(v / 1e6).toFixed(1).replace('.', ',')} M` : s + $(v) }
const pct = v => v == null ? '—' : `${Math.round(v * 100)}%`
const n0 = v => Number(v || 0).toLocaleString('es-CO')
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const fFecha = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const C_ING = '#1baf7a', C_COS = '#eb6834'
const VEREDICTO = {
  RENTABLE:  { label: 'Rentable',  bg: '#ECFDF5', fg: '#047857', Icon: CheckCircle2 },
  AJUSTADA:  { label: 'Ajustada',  bg: '#FFFBEB', fg: '#B45309', Icon: MinusCircle },
  PERDIDA:   { label: 'Pérdida',   bg: '#FEF2F2', fg: '#B91C1C', Icon: TrendingDown },
  SIN_DATOS: { label: 'Sin datos', bg: '#F1F5F9', fg: '#64748B', Icon: Info },
}
const RIESGO = {
  ALTO:    { label: 'Alto',  bg: '#FEF2F2', fg: '#B91C1C' },
  MEDIO:   { label: 'Medio', bg: '#FFFBEB', fg: '#B45309' },
  BAJO:    { label: 'Bajo',  bg: '#ECFDF5', fg: '#047857' },
  NINGUNO: { label: '—',     bg: 'transparent', fg: '#94A3B8' },
}
const ESTADOS = ['VIGENTE', 'SUSPENDIDA', 'VENCIDA', 'EJECUTADA', 'CANCELADA']

const CSS = `
.rt-bar { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.rt-f label { display:block; font-size:10.5px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.4px; margin-bottom:4px; }
.rt-f input, .rt-f select { border:1.5px solid #E2E5F0; border-radius:10px; padding:8px 11px; font-size:13px; outline:none; background:#fff; font-family:inherit; }
.rt-f input:focus, .rt-f select:focus { border-color:#0369A1; }
.rt-search { position:relative; }
.rt-search svg { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#9CA3AF; }
.rt-search input { padding-left:32px; width:240px; }
.rt-chk { display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:#374151; padding:8px 4px; cursor:pointer; }
.rt-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:16px; }
.rt-kpi { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; padding:13px 15px; position:relative; overflow:hidden; }
.rt-kpi::before { content:''; position:absolute; inset:0 0 auto 0; height:3px; background:var(--k); }
.rt-kpi-l { font-size:10.5px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:.5px; }
.rt-kpi-v { font-size:22px; font-weight:900; color:#0F1035; margin-top:6px; font-variant-numeric:tabular-nums; letter-spacing:-.5px; }
.rt-kpi-s { font-size:11px; color:#94A3B8; margin-top:3px; }
.rt-tw { background:#fff; border:1.5px solid #ECEDF8; border-radius:16px; overflow:auto; }
.rt-t { width:100%; border-collapse:collapse; font-size:12.5px; }
.rt-t th { position:sticky; top:0; background:#F7F8FC; text-align:left; font-size:10.5px; font-weight:800; color:#64748B; letter-spacing:.4px; text-transform:uppercase; padding:10px 12px; white-space:nowrap; cursor:pointer; user-select:none; z-index:1; }
.rt-t th.n, .rt-t td.n { text-align:right; }
.rt-t td { padding:9px 12px; border-top:1px solid #F4F5FA; color:#374151; white-space:nowrap; font-variant-numeric:tabular-nums; }
.rt-t tbody tr { cursor:pointer; }
.rt-t tbody tr:hover { background:#F8F9FF; }
.rt-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:800; padding:3px 9px; border-radius:20px; }
.rt-pag { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; font-size:12px; color:#64748B; border-top:1px solid #F4F5FA; }
.rt-pag button { border:1.5px solid #E2E5F0; background:#fff; border-radius:8px; padding:5px 12px; font-weight:700; cursor:pointer; font-family:inherit; }
.rt-pag button:disabled { opacity:.4; cursor:default; }
.rt-nota { font-size:11.5px; color:#64748B; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:12px; padding:10px 14px; margin-top:14px; line-height:1.5; }
.rt-ov { position:fixed; inset:0; background:rgba(15,16,53,.45); z-index:1000; display:flex; justify-content:flex-end; }
.rt-dr { width:min(860px,100%); height:100%; background:#F7F8FC; display:flex; flex-direction:column; box-shadow:-10px 0 40px rgba(0,0,0,.2); }
.rt-dh { background:linear-gradient(135deg,#0369A1,#0EA5E9); color:#fff; padding:18px 22px; display:flex; align-items:flex-start; gap:12px; }
.rt-db { flex:1; min-height:0; overflow:auto; padding:18px 22px 30px; }
.rt-x { margin-left:auto; background:rgba(255,255,255,.18); border:none; color:#fff; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.rt-card { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; padding:14px 16px; margin-bottom:14px; }
.rt-ct { font-size:12px; font-weight:900; color:#0F1035; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
.rt-g4 { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:14px; }
.rt-ver { border-radius:14px; padding:14px 16px; margin-bottom:14px; display:flex; gap:12px; align-items:flex-start; font-size:13.5px; line-height:1.5; }
.rt-mini { width:100%; border-collapse:collapse; font-size:12.5px; }
.rt-mini th { text-align:left; font-size:10.5px; color:#64748B; font-weight:800; text-transform:uppercase; padding:6px 8px; border-bottom:1px solid #ECEDF8; }
.rt-mini td { padding:7px 8px; border-bottom:1px solid #F4F5FA; font-variant-numeric:tabular-nums; }
.rt-mini .n { text-align:right; }
`

const COLS = [
  { k: 'numero',          l: 'Póliza' },
  { k: 'titular',         l: 'Titular' },
  { k: 'plan',            l: 'Plan' },
  { k: 'anios',           l: 'Años', n: 1 },
  { k: 'valor_cuota',     l: 'Cuota', n: 1 },
  { k: 'ingresos',        l: 'Ha pagado', n: 1 },
  { k: 'fallecidos',      l: 'Fallecidos', n: 1 },
  { k: 'costo_servicios', l: 'Costo servicios', n: 1 },
  { k: 'resultado',       l: 'Resultado', n: 1 },
  { k: 'margen',          l: 'Margen', n: 1 },
  { k: 'riesgo_n',        l: 'Riesgo' },
  { k: 'cuota_recomendada', l: 'Cuota sugerida', n: 1 },
  { k: 'veredicto_n',     l: '¿Conviene?' },
]
const ORD_R = { ALTO: 3, MEDIO: 2, BAJO: 1, NINGUNO: 0 }
const ORD_V = { PERDIDA: 0, AJUSTADA: 1, RENTABLE: 2, SIN_DATOS: 3 }

function Chip({ m, children }) {
  return <span className="rt-chip" style={{ background: m.bg, color: m.fg }}>{m.Icon && <m.Icon size={12}/>}{children ?? m.label}</span>
}

export default function RentabilidadPolizas({ sede }) {
  const [filas, setFilas] = useState(null)
  const [margen, setMargen] = useState(30)
  const [margenAplicado, setMargenAplicado] = useState(30)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('VIGENTE')
  const [veredicto, setVeredicto] = useState('')
  const [riesgo, setRiesgo] = useState('')
  const [plan, setPlan] = useState('')
  const [soloAjuste, setSoloAjuste] = useState(false)
  const [orden, setOrden] = useState({ k: 'resultado', asc: true })
  const [pag, setPag] = useState(0)
  const [ficha, setFicha] = useState(null)

  // La utilidad deseada se aplica medio segundo después de dejar de escribir
  useEffect(() => { const t = setTimeout(() => setMargenAplicado(margen), 500); return () => clearTimeout(t) }, [margen])

  useEffect(() => {
    setFilas(null)
    const params = { margen: margenAplicado }
    if (sede) params.sede_id = sede
    api.get('/reportes/rentabilidad-polizas', { params })
      .then(r => setFilas(r.data.data))
      .catch(e => { toast.error(e?.response?.data?.error || 'No se pudo cargar la rentabilidad de pólizas'); setFilas([]) })
  }, [sede, margenAplicado])

  const planes = useMemo(() => [...new Set((filas || []).map(f => f.plan))].sort(), [filas])

  const vista = useMemo(() => {
    if (!filas) return []
    const b = sinTildes(q.trim())
    const r = filas.filter(f =>
      (!estado || f.estado === estado) && (!veredicto || f.veredicto === veredicto) &&
      (!riesgo || f.riesgo === riesgo) && (!plan || f.plan === plan) && (!soloAjuste || f.ajuste_sugerido > 0) &&
      (!b || sinTildes(`${f.titular} ${f.titular_doc} ${f.numero} ${f.numero_legado}`).includes(b)))
    const val = f => orden.k === 'riesgo_n' ? ORD_R[f.riesgo] : orden.k === 'veredicto_n' ? ORD_V[f.veredicto]
      : orden.k === 'numero' ? (+f.numero_legado || f.numero) : f[orden.k]
    return r.sort((x, y) => { const a = val(x), c = val(y); const d = typeof a === 'string' ? a.localeCompare(c) : (a ?? -1e18) - (c ?? -1e18); return orden.asc ? d : -d })
  }, [filas, q, estado, veredicto, riesgo, plan, soloAjuste, orden])

  useEffect(() => setPag(0), [q, estado, veredicto, riesgo, plan, soloAjuste, orden])

  const tot = useMemo(() => {
    const s = k => vista.reduce((a, f) => a + (+f[k] || 0), 0)
    const ing = s('ingresos'), cos = s('costo_servicios')
    const aj = vista.filter(f => f.ajuste_sugerido > 0)
    return {
      n: vista.length, ing, cos, res: ing - cos, margen: ing ? (ing - cos) / ing : null, fall: s('fallecidos'),
      perdida: vista.filter(f => f.veredicto === 'PERDIDA').length,
      ajusteN: aj.length, ajusteMes: aj.reduce((a, f) => a + f.ajuste_sugerido, 0),
      riesgoAlto: vista.filter(f => f.riesgo === 'ALTO').length,
    }
  }, [vista])

  const exportar = () => {
    const params = { margen: margenAplicado }
    if (sede) params.sede_id = sede
    api.get('/reportes/rentabilidad-polizas/export', { params, responseType: 'blob' })
      .then(r => {
        const url = URL.createObjectURL(new Blob([r.data]))
        const a = document.createElement('a'); a.href = url; a.download = 'rentabilidad-polizas.xlsx'; a.click()
        URL.revokeObjectURL(url)
        toast.success('Rentabilidad de pólizas exportada a Excel')
      })
      .catch(() => toast.error('No se pudo exportar la rentabilidad de pólizas'))
  }

  const POR_PAG = 50
  const pagina = vista.slice(pag * POR_PAG, (pag + 1) * POR_PAG)
  const ordenar = k => setOrden(o => ({ k, asc: o.k === k ? !o.asc : false }))

  return (
    <div>
      <style>{CSS}</style>

      <div className="rt-bar">
        <div className="rt-f rt-search"><label>Buscar</label>
          <div style={{ position: 'relative' }}><Search size={14}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Titular, cédula o N° de póliza"/></div>
        </div>
        <div className="rt-f"><label>Estado</label>
          <select value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="">Todos</option>{ESTADOS.map(e => <option key={e} value={e}>{e[0] + e.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <div className="rt-f"><label>Plan</label>
          <select value={plan} onChange={e => setPlan(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos</option>{planes.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="rt-f"><label>¿Conviene?</label>
          <select value={veredicto} onChange={e => setVeredicto(e.target.value)}>
            <option value="">Todas</option>{Object.entries(VEREDICTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="rt-f"><label>Riesgo futuro</label>
          <select value={riesgo} onChange={e => setRiesgo(e.target.value)}>
            <option value="">Todos</option><option value="ALTO">Alto</option><option value="MEDIO">Medio</option><option value="BAJO">Bajo</option>
          </select>
        </div>
        <div className="rt-f"><label>Utilidad deseada</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="number" min="0" max="90" step="5" value={margen} onChange={e => setMargen(Math.max(0, Math.min(90, +e.target.value || 0)))} style={{ width: 70 }}/> <b style={{ color: '#64748B' }}>%</b>
          </div>
        </div>
        <label className="rt-chk"><input type="checkbox" checked={soloAjuste} onChange={e => setSoloAjuste(e.target.checked)}/> Solo las que necesitan subir cuota</label>
        <div style={{ flex: 1 }}/>
        <button className="rp-btn-exp" onClick={exportar}><FileSpreadsheet size={14}/> Excel</button>
      </div>

      {!filas ? <div className="rp-loading">Analizando pólizas…</div> : (<>
        <div className="rt-kpis">
          <div className="rt-kpi" style={{ '--k': '#0369A1' }}><div className="rt-kpi-l">Pólizas analizadas</div><div className="rt-kpi-v">{n0(tot.n)}</div><div className="rt-kpi-s">{n0(tot.fall)} fallecidos atendidos</div></div>
          <div className="rt-kpi" style={{ '--k': C_ING }}><div className="rt-kpi-l">Han pagado</div><div className="rt-kpi-v">{$c(tot.ing)}</div><div className="rt-kpi-s">Desde que se afiliaron</div></div>
          <div className="rt-kpi" style={{ '--k': C_COS }}><div className="rt-kpi-l">Costo de sus servicios</div><div className="rt-kpi-v">{$c(tot.cos)}</div><div className="rt-kpi-s">Real o estimado por el plan</div></div>
          <div className="rt-kpi" style={{ '--k': tot.res >= 0 ? '#047857' : '#B91C1C' }}><div className="rt-kpi-l">Resultado</div><div className="rt-kpi-v" style={{ color: tot.res >= 0 ? '#047857' : '#B91C1C' }}>{$c(tot.res)}</div><div className="rt-kpi-s">Margen {pct(tot.margen)}</div></div>
          <div className="rt-kpi" style={{ '--k': '#B91C1C', cursor: 'pointer' }} onClick={() => setVeredicto(v => v === 'PERDIDA' ? '' : 'PERDIDA')} title="Ver solo las que dan pérdida"><div className="rt-kpi-l">En pérdida</div><div className="rt-kpi-v">{n0(tot.perdida)}</div><div className="rt-kpi-s">{n0(tot.riesgoAlto)} con riesgo futuro alto</div></div>
          <div className="rt-kpi" style={{ '--k': '#B45309', cursor: 'pointer' }} onClick={() => setSoloAjuste(v => !v)} title="Ver solo las que necesitan subir cuota"><div className="rt-kpi-l">Necesitan subir cuota</div><div className="rt-kpi-v">{n0(tot.ajusteN)}</div><div className="rt-kpi-s">+{$(tot.ajusteMes)} al mes en total</div></div>
        </div>

        <div className="rt-tw">
          <table className="rt-t">
            <thead><tr>{COLS.map(c => (
              <th key={c.k} className={c.n ? 'n' : ''} onClick={() => ordenar(c.k)}>
                {c.l}{orden.k === c.k && (orden.asc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>)}
              </th>))}</tr></thead>
            <tbody>
              {pagina.map(f => (
                <tr key={f.id} onClick={() => setFicha(f.id)}>
                  <td><b>{f.numero_legado || f.numero}</b></td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.titular}>{f.titular}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748B' }} title={f.plan}>{f.plan}</td>
                  <td className="n">{f.anios.toLocaleString('es-CO')}</td>
                  <td className="n">{$(f.valor_cuota)}{f.incremento > 0 && <div style={{ fontSize: 10.5, color: '#94A3B8' }}>+{pct(f.incremento)} desde {$(f.cuota_inicial)}</div>}</td>
                  <td className="n">{$(f.ingresos)}</td>
                  <td className="n">{f.fallecidos ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Angelito size={14}/>{f.fallecidos}</span> : '—'}</td>
                  <td className="n">{f.costo_servicios ? $(f.costo_servicios) : '—'}</td>
                  <td className="n" style={{ fontWeight: 800, color: f.resultado >= 0 ? '#047857' : '#B91C1C' }}>{$(f.resultado)}</td>
                  <td className="n">{f.ingresos || f.costo_servicios ? pct(f.margen) : '—'}</td>
                  <td><Chip m={RIESGO[f.riesgo]}/></td>
                  <td className="n">{f.estado === 'CANCELADA' ? '—' : <>
                    {$(f.cuota_recomendada)}
                    {f.ajuste_sugerido > 0 && <div style={{ fontSize: 10.5, color: '#B45309', fontWeight: 800 }}>+{$(f.ajuste_sugerido)}</div>}</>}
                  </td>
                  <td><Chip m={VEREDICTO[f.veredicto]}/></td>
                </tr>
              ))}
              {!pagina.length && <tr><td colSpan={COLS.length} className="rp-empty">No hay pólizas con esos filtros.</td></tr>}
            </tbody>
          </table>
          {vista.length > POR_PAG && (
            <div className="rt-pag">
              <span>{n0(pag * POR_PAG + 1)}–{n0(Math.min(vista.length, (pag + 1) * POR_PAG))} de {n0(vista.length)}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button disabled={!pag} onClick={() => setPag(p => p - 1)}>Anterior</button>
                <button disabled={(pag + 1) * POR_PAG >= vista.length} onClick={() => setPag(p => p + 1)}>Siguiente</button>
              </span>
            </div>
          )}
        </div>

        <div className="rt-nota">
          <b>Cómo se calcula.</b> <i>Ha pagado</i>: todas las cuotas recibidas (incluye el historial de Pisco). <i>Costo de servicios</i>: por cada fallecido de la póliza, el costo real de su servicio si está registrado; si no, el costo actual de los servicios del plan.
          {' '}<i>Riesgo futuro</i> y <i>cuota sugerida</i>: con la edad de cada miembro vivo se estima la probabilidad de que fallezca en un año (tabla de mortalidad referencial), se multiplica por el costo del plan y se le suma la utilidad deseada ({margenAplicado}%). Es una guía para comparar pólizas y decidir incrementos, no un cálculo actuarial; no incluye comisiones de cobro ni gastos administrativos.
        </div>
      </>)}

      {ficha && <FichaRentabilidad id={ficha} margen={margenAplicado} onClose={() => setFicha(null)}/>}
    </div>
  )
}

function FichaRentabilidad({ id, margen, onClose }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    setD(null)
    api.get(`/reportes/rentabilidad-polizas/${id}`, { params: { margen } })
      .then(r => setD(r.data.data))
      .catch(e => { toast.error(e?.response?.data?.error || 'No se pudo cargar la ficha de la póliza'); onClose() })
  }, [id, margen])

  const V = d && VEREDICTO[d.veredicto]
  return (
    <div className="rt-ov">
      <div className="rt-dr">
        <div className="rt-dh">
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: .8, textTransform: 'uppercase', letterSpacing: .6 }}>Rentabilidad de la póliza</div>
            <div style={{ fontSize: 21, fontWeight: 900 }}>{d ? `Póliza ${d.numero_legado || d.numero} · ${d.titular}` : 'Cargando…'}</div>
            {d && <div style={{ fontSize: 12.5, opacity: .9, marginTop: 3 }}>{d.plan} · {d.estado[0] + d.estado.slice(1).toLowerCase()} · afiliada desde {fFecha(d.fecha_inicio)} ({d.anios.toLocaleString('es-CO')} años)</div>}
          </div>
          <button className="rt-x" onClick={onClose} title="Cerrar"><X size={18}/></button>
        </div>

        {!d ? <div className="rp-loading">Cargando…</div> : (
          <div className="rt-db">
            <div className="rt-ver" style={{ background: V.bg, color: V.fg, border: `1.5px solid ${V.fg}33` }}>
              <V.Icon size={22} style={{ flexShrink: 0, marginTop: 2 }}/>
              <div style={{ color: '#1F2937' }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: V.fg }}>
                  {d.veredicto === 'RENTABLE' ? 'Sí conviene: es una póliza rentable'
                    : d.veredicto === 'AJUSTADA' ? 'Deja poca utilidad'
                    : d.veredicto === 'PERDIDA' ? 'Hasta hoy da pérdida' : 'Sin pagos registrados'}
                </div>
                {d.veredicto !== 'SIN_DATOS' && <div>
                  En {d.anios.toLocaleString('es-CO')} años ha pagado <b>{$(d.ingresos)}</b> y sus servicios han costado <b>{$(d.costo_servicios)}</b>
                  {d.fallecidos ? ` (${d.fallecidos} fallecido${d.fallecidos > 1 ? 's' : ''})` : ' (ningún fallecido)'}: {d.resultado >= 0 ? 'utilidad' : 'pérdida'} de <b>{$(Math.abs(d.resultado))}</b>{d.ingresos ? `, margen ${pct(d.margen)}` : ''}.
                </div>}
                {d.estado !== 'CANCELADA' && <div style={{ marginTop: 6 }}>
                  {d.ajuste_sugerido > 0
                    ? <>Con el grupo familiar de hoy ({d.vivos} personas{d.mayores_65 ? `, ${d.mayores_65} mayores de 65` : ''}), para dejar el {margen}% de utilidad la cuota debería ser <b>{$(d.cuota_recomendada)}</b> — hoy paga {$(d.valor_cuota)}: <b style={{ color: '#B45309' }}>subir {$(d.ajuste_sugerido)} al mes</b> ({pct(d.ajuste_sugerido / d.valor_cuota)}).</>
                    : <>La cuota actual de <b>{$(d.valor_cuota)}</b> cubre el riesgo de su grupo familiar ({d.vivos} personas): el punto de equilibrio es {$(d.cuota_equilibrio)} y con el {margen}% de utilidad sería {$(d.cuota_recomendada)}.</>}
                </div>}
              </div>
            </div>

            <div className="rt-g4">
              <div className="rt-kpi" style={{ '--k': C_ING }}><div className="rt-kpi-l">Ha pagado</div><div className="rt-kpi-v">{$(d.ingresos)}</div><div className="rt-kpi-s">{n0(d.pagos)} pagos · último {fFecha(d.ultimo_pago)}</div></div>
              <div className="rt-kpi" style={{ '--k': C_COS }}><div className="rt-kpi-l">Costo de servicios</div><div className="rt-kpi-v">{$(d.costo_servicios)}</div><div className="rt-kpi-s">{d.fallecidos} fallecido{d.fallecidos === 1 ? '' : 's'}{d.fallecidos ? ` · ${d.fallecidos_costo_real} con costo real` : ''}</div></div>
              <div className="rt-kpi" style={{ '--k': d.resultado >= 0 ? '#047857' : '#B91C1C' }}><div className="rt-kpi-l">Resultado</div><div className="rt-kpi-v" style={{ color: d.resultado >= 0 ? '#047857' : '#B91C1C' }}>{$(d.resultado)}</div><div className="rt-kpi-s">Margen {pct(d.margen)}</div></div>
              <div className="rt-kpi" style={{ '--k': '#6366F1' }}><div className="rt-kpi-l">Cuota</div><div className="rt-kpi-v">{$(d.valor_cuota)}</div>
                <div className="rt-kpi-s">{d.cuota_inicial ? <>Empezó en {$(d.cuota_inicial)}{d.incremento != null && <> · <TrendingUp size={11} style={{ verticalAlign: -1 }}/> {pct(d.incremento)}</>}</> : 'Sin primera cuota registrada'}</div></div>
            </div>

            {d.historia.length > 0 && (
              <div className="rt-card">
                <div className="rt-ct">Año por año: lo que pagó vs. lo que costó</div>
                <div style={{ height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.historia} barGap={2} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EEF0F6"/>
                      <XAxis dataKey="anio" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E5F0' }}/>
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={62} tickFormatter={v => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}k`}/>
                      <Tooltip formatter={(v, n) => [$(v), n]} labelFormatter={l => `Año ${l}`} cursor={{ fill: 'rgba(3,105,161,.06)' }}/>
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }}/>
                      <Bar dataKey="ingresos" name="Pagó" fill={C_ING} radius={[4, 4, 0, 0]} maxBarSize={22}/>
                      <Bar dataKey="costos" name="Costo servicios" fill={C_COS} radius={[4, 4, 0, 0]} maxBarSize={22}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="rt-mini" style={{ marginTop: 10 }}>
                  <thead><tr><th>Año</th><th className="n">Pagó</th><th className="n">Costo servicios</th><th className="n">Resultado acumulado</th></tr></thead>
                  <tbody>{[...d.historia].reverse().map(h => (
                    <tr key={h.anio}><td><b>{h.anio}</b></td><td className="n">{$(h.ingresos)}</td><td className="n">{h.costos ? $(h.costos) : '—'}</td>
                      <td className="n" style={{ fontWeight: 800, color: h.acumulado >= 0 ? '#047857' : '#B91C1C' }}>{$(h.acumulado)}</td></tr>))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rt-card">
              <div className="rt-ct">Servicios prestados ({d.servicios.length})</div>
              {!d.servicios.length ? <div style={{ fontSize: 13, color: '#94A3B8' }}>Ningún miembro de esta póliza ha fallecido.</div> : (
                <table className="rt-mini">
                  <thead><tr><th>Fallecido</th><th>Parentesco</th><th>Fecha</th><th>Servicio</th><th className="n">Costo</th></tr></thead>
                  <tbody>{d.servicios.map((s, i) => (
                    <tr key={i}><td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Angelito size={15}/>{s.nombre}</span></td>
                      <td style={{ textTransform: 'capitalize' }}>{s.parentesco || '—'}</td><td>{fFecha(s.fecha)}</td>
                      <td>{s.codigo ? s.codigo.replace('PISCO-', 'Pisco N° ') : '—'}</td>
                      <td className="n">{$(s.costo)} <span className="rt-chip" style={s.tipo_costo === 'REAL' ? { background: '#ECFDF5', color: '#047857' } : { background: '#F1F5F9', color: '#64748B' }}>{s.tipo_costo === 'REAL' ? 'Real' : 'Estimado'}</span></td></tr>))}
                  </tbody>
                </table>
              )}
            </div>

            {d.estado !== 'CANCELADA' && (
              <div className="rt-card">
                <div className="rt-ct">Riesgo del grupo familiar ({d.miembros.length} personas vivas)</div>
                <table className="rt-mini">
                  <thead><tr><th>Persona</th><th>Parentesco</th><th className="n">Edad</th><th className="n">Prob. al año</th><th className="n">Costo esperado / año</th></tr></thead>
                  <tbody>{[...d.miembros].sort((a, b) => b.costo_esperado - a.costo_esperado).map(m => (
                    <tr key={m.id}><td>{m.nombre}</td><td style={{ textTransform: 'capitalize' }}>{m.parentesco || '—'}</td>
                      <td className="n">{m.edad ?? 'Sin dato'}{m.edad > 65 && <AlertTriangle size={12} color="#B45309" style={{ marginLeft: 4, verticalAlign: -1 }}/>}</td>
                      <td className="n">{(m.probabilidad * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%</td>
                      <td className="n">{$(m.costo_esperado)}</td></tr>))}
                    <tr><td colSpan={4} style={{ fontWeight: 900 }}>Total al año (costo del plan {$(d.costo_plan)})</td><td className="n" style={{ fontWeight: 900 }}>{$(d.costo_anual_esperado)}</td></tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 10 }}>
                  Recibe al año <b>{$(d.ingreso_anual)}</b> ({$(d.valor_cuota)} × 12) frente a un costo esperado de <b>{$(d.costo_anual_esperado)}</b>.
                  {' '}Cuota de equilibrio: <b>{$(d.cuota_equilibrio)}</b> · con {margen}% de utilidad: <b>{$(d.cuota_recomendada)}</b>.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
