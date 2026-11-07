/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes — rentabilidad de pólizas (por recaudo)     ║
 * ║  Archivo         : components/reportes/RentabilidadPolizas.jsx          ║
 * ║  Versión         : v2.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ¿Me conviene esta póliza? Se mide por RECAUDO (lo que paga y qué tan al día
 * está) frente al COSTO DEL PLAN y al riesgo de su grupo familiar por edad.
 * El costo de los servicios prestados va en su propio informe (servicios).
 */
import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { Search, FileSpreadsheet, X, TrendingUp, AlertTriangle, CheckCircle2, MinusCircle, XCircle, ChevronUp, ChevronDown, Info } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { RT_CSS, $, $c, pct, n0, sinTildes, fFecha, Chip } from './rentabilidadComun.jsx'

const C_REC = '#1baf7a'
const VEREDICTO = {
  CONVIENE:    { label: 'Conviene',    bg: '#ECFDF5', fg: '#047857', Icon: CheckCircle2 },
  REVISAR:     { label: 'Revisar',     bg: '#FFFBEB', fg: '#B45309', Icon: MinusCircle },
  NO_CONVIENE: { label: 'No conviene', bg: '#FEF2F2', fg: '#B91C1C', Icon: XCircle },
  CANCELADA:   { label: 'Cancelada',   bg: '#F1F5F9', fg: '#64748B', Icon: Info },
  EJECUTADA:   { label: 'Ejecutada',   bg: '#F5F3FF', fg: '#6D28D9', Icon: Info },
}
const RECAUDO = {
  AL_DIA:    { label: 'Al día',    bg: '#ECFDF5', fg: '#047857' },
  IRREGULAR: { label: 'Irregular', bg: '#FFFBEB', fg: '#B45309' },
  MALO:      { label: 'Malo',      bg: '#FEF2F2', fg: '#B91C1C' },
  NINGUNO:   { label: '—',         bg: 'transparent', fg: '#94A3B8' },
}
const ESTADOS = ['VIGENTE', 'SUSPENDIDA', 'VENCIDA', 'EJECUTADA', 'CANCELADA']

const COLS = [
  { k: 'numero',            l: 'Póliza' },
  { k: 'titular',           l: 'Titular' },
  { k: 'plan',              l: 'Plan' },
  { k: 'anios',             l: 'Años', n: 1 },
  { k: 'valor_cuota',       l: 'Cuota', n: 1 },
  { k: 'recaudo',           l: 'Recaudo total', n: 1 },
  { k: 'cumplimiento',      l: 'Últimos 12 meses', n: 1 },
  { k: 'veces_plan',        l: 'Costo del plan', n: 1 },
  { k: 'mayores_65',        l: 'Grupo', n: 1 },
  { k: 'cuota_recomendada', l: 'Cuota sugerida', n: 1 },
  { k: 'recaudo_n',         l: 'Recaudo' },
  { k: 'veredicto_n',       l: '¿Conviene?' },
]
const ORD_R = { MALO: 0, IRREGULAR: 1, AL_DIA: 2, NINGUNO: 3 }
const ORD_V = { NO_CONVIENE: 0, REVISAR: 1, CONVIENE: 2, EJECUTADA: 3, CANCELADA: 4 }

export default function RentabilidadPolizas({ sede }) {
  const [filas, setFilas] = useState(null)
  const [margen, setMargen] = useState(30)
  const [margenAplicado, setMargenAplicado] = useState(30)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('VIGENTE')
  const [veredicto, setVeredicto] = useState('')
  const [recaudo, setRecaudo] = useState('')
  const [plan, setPlan] = useState('')
  const [soloAjuste, setSoloAjuste] = useState(false)
  const [orden, setOrden] = useState({ k: 'veredicto_n', asc: true })
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
      (!recaudo || f.recaudo_nivel === recaudo) && (!plan || f.plan === plan) && (!soloAjuste || f.ajuste_sugerido > 0) &&
      (!b || sinTildes(`${f.titular} ${f.titular_doc} ${f.numero} ${f.numero_legado}`).includes(b)))
    const val = f => orden.k === 'recaudo_n' ? ORD_R[f.recaudo_nivel] : orden.k === 'veredicto_n' ? ORD_V[f.veredicto]
      : orden.k === 'numero' ? (+f.numero_legado || f.numero) : f[orden.k]
    return r.sort((x, y) => { const a = val(x), c = val(y); const d = typeof a === 'string' ? a.localeCompare(c) : (a ?? -1e18) - (c ?? -1e18); return orden.asc ? d : -d })
  }, [filas, q, estado, veredicto, recaudo, plan, soloAjuste, orden])

  useEffect(() => setPag(0), [q, estado, veredicto, recaudo, plan, soloAjuste, orden])

  const tot = useMemo(() => {
    const s = k => vista.reduce((a, f) => a + (+f[k] || 0), 0)
    const aj = vista.filter(f => f.ajuste_sugerido > 0)
    const r12 = s('recaudo_12m'), e12 = s('esperado_12m')
    return {
      n: vista.length, rec: s('recaudo'), r12, e12, cumpl: e12 ? r12 / e12 : null,
      alDia: vista.filter(f => f.recaudo_nivel === 'AL_DIA').length,
      irregular: vista.filter(f => f.recaudo_nivel === 'IRREGULAR' || f.recaudo_nivel === 'MALO').length,
      noConviene: vista.filter(f => f.veredicto === 'NO_CONVIENE').length,
      revisar: vista.filter(f => f.veredicto === 'REVISAR').length,
      ajusteN: aj.length, ajusteMes: aj.reduce((a, f) => a + f.ajuste_sugerido, 0),
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
      <style>{RT_CSS}</style>

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
        <div className="rt-f"><label>Recaudo</label>
          <select value={recaudo} onChange={e => setRecaudo(e.target.value)}>
            <option value="">Todos</option><option value="AL_DIA">Al día</option><option value="IRREGULAR">Irregular</option><option value="MALO">Malo</option>
          </select>
        </div>
        <div className="rt-f"><label>¿Conviene?</label>
          <select value={veredicto} onChange={e => setVeredicto(e.target.value)}>
            <option value="">Todas</option>{Object.entries(VEREDICTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
          <div className="rt-kpi" style={{ '--k': '#0369A1' }}><div className="rt-kpi-l">Pólizas analizadas</div><div className="rt-kpi-v">{n0(tot.n)}</div><div className="rt-kpi-s">Recaudo histórico {$c(tot.rec)}</div></div>
          <div className="rt-kpi" style={{ '--k': C_REC }}><div className="rt-kpi-l">Recaudo últimos 12 meses</div><div className="rt-kpi-v">{$c(tot.r12)}</div><div className="rt-kpi-s">{pct(tot.cumpl)} de lo esperado ({$c(tot.e12)})</div></div>
          <div className="rt-kpi" style={{ '--k': '#047857', cursor: 'pointer' }} onClick={() => setRecaudo(v => v === 'AL_DIA' ? '' : 'AL_DIA')} title="Ver solo las que pagan al día"><div className="rt-kpi-l">Pagan al día</div><div className="rt-kpi-v">{n0(tot.alDia)}</div><div className="rt-kpi-s">{n0(tot.irregular)} con pago irregular o malo</div></div>
          <div className="rt-kpi" style={{ '--k': '#B91C1C', cursor: 'pointer' }} onClick={() => setVeredicto(v => v === 'NO_CONVIENE' ? '' : 'NO_CONVIENE')} title="Ver solo las que no convienen"><div className="rt-kpi-l">No convienen</div><div className="rt-kpi-v">{n0(tot.noConviene)}</div><div className="rt-kpi-s">{n0(tot.revisar)} para revisar</div></div>
          <div className="rt-kpi" style={{ '--k': '#B45309', cursor: 'pointer' }} onClick={() => setSoloAjuste(v => !v)} title="Ver solo las que necesitan subir cuota"><div className="rt-kpi-l">Necesitan subir cuota</div><div className="rt-kpi-v">{n0(tot.ajusteN)}</div><div className="rt-kpi-s">+{$(tot.ajusteMes)} al mes en total</div></div>
        </div>

        <div className="rt-tw">
          <table className="rt-t">
            <thead><tr>{COLS.map(c => (
              <th key={c.k} className={c.n ? 'n' : ''} onClick={() => ordenar(c.k)}>
                {c.l}{orden.k === c.k && (orden.asc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>)}
              </th>))}</tr></thead>
            <tbody>
              {pagina.map(f => {
                const activa = !['CANCELADA', 'EJECUTADA'].includes(f.estado)
                return (
                  <tr key={f.id} className="clic" onClick={() => setFicha(f.id)}>
                    <td><b>{f.numero_legado || f.numero}</b></td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.titular}>{f.titular}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748B' }} title={f.plan}>{f.plan}</td>
                    <td className="n">{f.anios.toLocaleString('es-CO')}</td>
                    <td className="n">{$(f.valor_cuota)}{f.incremento > 0 && <div className="rt-sub">+{pct(f.incremento)} desde {$(f.cuota_inicial)}</div>}</td>
                    <td className="n">{$(f.recaudo)}<div className="rt-sub">{n0(f.pagos)} pagos</div></td>
                    <td className="n">{activa ? <>{$(f.recaudo_12m)}<div className="rt-sub">{pct(f.cumplimiento)} de {$(f.esperado_12m)}</div></> : '—'}</td>
                    <td className="n">{$(f.costo_plan)}{f.veces_plan != null && <div className="rt-sub">pagado {f.veces_plan.toLocaleString('es-CO', { maximumFractionDigits: 1 })} veces</div>}</td>
                    <td className="n">{f.vivos}{f.mayores_65 > 0 && <div className="rt-sub" style={{ color: '#B45309' }}>{f.mayores_65} mayor{f.mayores_65 > 1 ? 'es' : ''} de 65</div>}</td>
                    <td className="n">{activa ? <>{$(f.cuota_recomendada)}{f.ajuste_sugerido > 0 && <div className="rt-sub" style={{ color: '#B45309', fontWeight: 800 }}>subir {$(f.ajuste_sugerido)}</div>}</> : '—'}</td>
                    <td><Chip m={RECAUDO[f.recaudo_nivel]}/></td>
                    <td><Chip m={VEREDICTO[f.veredicto]}/></td>
                  </tr>
                )
              })}
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
          <b>Cómo se calcula.</b> La póliza se mide por su <i>recaudo</i>, no por los servicios prestados (esos tienen su propio informe).
          {' '}<i>Recaudo total</i>: todo lo pagado desde la afiliación (incluye el historial de Pisco). <i>Últimos 12 meses</i>: lo pagado frente a la cuota × 12 — al día ≥ 90%, irregular 50–90%, malo &lt; 50%.
          {' '}<i>Costo del plan</i>: lo que cuestan hoy los servicios del plan en el catálogo, y cuántas veces lo ha pagado la póliza.
          {' '}<i>Cuota sugerida</i>: con la edad de cada miembro vivo se estima la probabilidad de fallecer en un año (tabla referencial), por el costo del plan, más la utilidad deseada ({margenAplicado}%).
          {' '}<b>Conviene</b>: paga al día y su cuota alcanza la sugerida · <b>Revisar</b>: pago irregular o cuota por debajo de la sugerida · <b>No conviene</b>: la cuota no cubre ni el costo esperado, o casi no paga.
          {' '}Es una guía para decidir incrementos, no un cálculo actuarial; no incluye comisiones de cobro ni gastos administrativos.
        </div>
      </>)}

      {ficha && <FichaPoliza id={ficha} margen={margenAplicado} onClose={() => setFicha(null)}/>}
    </div>
  )
}

function FichaPoliza({ id, margen, onClose }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    setD(null)
    api.get(`/reportes/rentabilidad-polizas/${id}`, { params: { margen } })
      .then(r => setD(r.data.data))
      .catch(e => { toast.error(e?.response?.data?.error || 'No se pudo cargar la ficha de la póliza'); onClose() })
  }, [id, margen])

  const V = d && VEREDICTO[d.veredicto]
  const activa = d && !['CANCELADA', 'EJECUTADA'].includes(d.estado)
  const razones = d ? [
    d.recaudo_nivel === 'IRREGULAR' && `en el último año pagó el ${pct(d.cumplimiento)} de lo esperado`,
    d.recaudo_nivel === 'MALO' && `casi no paga: en el último año pagó solo el ${pct(d.cumplimiento)} de lo esperado`,
    d.cuota_nivel === 'AJUSTADA' && `la cuota cubre el costo esperado de su grupo pero no deja el ${margen}% de utilidad`,
    d.cuota_nivel === 'NO_CUBRE' && `la cuota (${$(d.valor_cuota)}) no alcanza a cubrir el costo esperado de su grupo (${$(d.cuota_equilibrio)} al mes)`,
  ].filter(Boolean) : []

  return (
    <div className="rt-ov">
      <div className="rt-dr">
        <div className="rt-dh">
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: .8, textTransform: 'uppercase', letterSpacing: .6 }}>Rentabilidad de la póliza · por recaudo</div>
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
                  {d.veredicto === 'CONVIENE' ? 'Sí conviene: paga al día y su cuota cubre su riesgo'
                    : d.veredicto === 'REVISAR' ? 'Conviene revisarla'
                    : d.veredicto === 'NO_CONVIENE' ? 'Así como está, no conviene'
                    : `Póliza ${d.estado.toLowerCase()}`}
                </div>
                {razones.length > 0 && <div>Porque {razones.join('; y ')}.</div>}
                <div style={{ marginTop: 4 }}>
                  En {d.anios.toLocaleString('es-CO')} años ha pagado <b>{$(d.recaudo)}</b>
                  {d.veces_plan != null && <> — <b>{d.veces_plan.toLocaleString('es-CO', { maximumFractionDigits: 1 })} veces</b> el costo de su plan ({$(d.costo_plan)})</>}.
                </div>
                {activa && <div style={{ marginTop: 4 }}>
                  {d.ajuste_sugerido > 0
                    ? <>Para dejar el {margen}% de utilidad con su grupo actual ({d.vivos} personas{d.mayores_65 ? `, ${d.mayores_65} mayores de 65` : ''}), la cuota debería ser <b>{$(d.cuota_recomendada)}</b>: <b style={{ color: '#B45309' }}>subir {$(d.ajuste_sugerido)} al mes</b> ({pct(d.ajuste_sugerido / d.valor_cuota)}).</>
                    : <>La cuota de <b>{$(d.valor_cuota)}</b> alcanza para su grupo de {d.vivos} personas: equilibrio {$(d.cuota_equilibrio)}, con {margen}% de utilidad {$(d.cuota_recomendada)}.</>}
                </div>}
                {d.fallecidos > 0 && <div style={{ marginTop: 4, fontSize: 12.5, color: '#475569' }}>Ha tenido {d.fallecidos} fallecido{d.fallecidos > 1 ? 's' : ''}; el costo de esos servicios se analiza en <b>Rentabilidad de servicios</b>.</div>}
              </div>
            </div>

            <div className="rt-g4">
              <div className="rt-kpi" style={{ '--k': C_REC }}><div className="rt-kpi-l">Recaudo total</div><div className="rt-kpi-v">{$(d.recaudo)}</div><div className="rt-kpi-s">{n0(d.pagos)} pagos · último {fFecha(d.ultimo_pago)}</div></div>
              <div className="rt-kpi" style={{ '--k': '#0369A1' }}><div className="rt-kpi-l">Últimos 12 meses</div><div className="rt-kpi-v">{$(d.recaudo_12m)}</div><div className="rt-kpi-s">{activa ? `${pct(d.cumplimiento)} de lo esperado · pagada hasta ${fFecha(d.pago_hasta)}` : '—'}</div></div>
              <div className="rt-kpi" style={{ '--k': '#7C3AED' }}><div className="rt-kpi-l">Costo del plan</div><div className="rt-kpi-v">{$(d.costo_plan)}</div><div className="rt-kpi-s">{d.meses_por_plan ? `Equivale a ${Math.round(d.meses_por_plan)} cuotas` : ''}</div></div>
              <div className="rt-kpi" style={{ '--k': '#6366F1' }}><div className="rt-kpi-l">Cuota</div><div className="rt-kpi-v">{$(d.valor_cuota)}</div>
                <div className="rt-kpi-s">{d.cuota_inicial ? <>Empezó en {$(d.cuota_inicial)}{d.incremento != null && <> · <TrendingUp size={11} style={{ verticalAlign: -1 }}/> {pct(d.incremento)}</>}</> : 'Sin primera cuota registrada'}</div></div>
            </div>

            {d.historia.length > 0 && (
              <div className="rt-card">
                <div className="rt-ct">Recaudo año por año</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.historia} margin={{ top: 16, right: 8, left: 6, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EEF0F6"/>
                      <XAxis dataKey="anio" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E5F0' }}/>
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={62} tickFormatter={v => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}k`}/>
                      <Tooltip formatter={v => [$(v), 'Recaudo']} labelFormatter={l => `Año ${l}`} cursor={{ fill: 'rgba(3,105,161,.06)' }}/>
                      {d.costo_plan > 0 && d.costo_plan < Math.max(...d.historia.map(h => h.recaudo)) * 3 &&
                        <ReferenceLine y={d.costo_plan} stroke="#7C3AED" strokeDasharray="5 4" label={{ value: `Costo del plan ${$(d.costo_plan)}`, position: 'insideTopRight', fontSize: 11, fill: '#6D28D9' }}/>}
                      <Bar dataKey="recaudo" name="Recaudo" fill={C_REC} radius={[4, 4, 0, 0]} maxBarSize={26}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="rt-mini" style={{ marginTop: 10 }}>
                  <thead><tr><th>Año</th><th className="n">Pagos</th><th className="n">Recaudo</th><th className="n">Acumulado</th><th className="n">Veces el plan</th></tr></thead>
                  <tbody>{[...d.historia].reverse().map(h => (
                    <tr key={h.anio}><td><b>{h.anio}</b></td><td className="n">{h.pagos}</td><td className="n">{$(h.recaudo)}</td>
                      <td className="n" style={{ fontWeight: 800 }}>{$(h.acumulado)}</td>
                      <td className="n">{d.costo_plan > 0 ? (h.acumulado / d.costo_plan).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—'}</td></tr>))}
                  </tbody>
                </table>
              </div>
            )}

            {activa && (
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
