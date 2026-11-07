/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes — rentabilidad de servicios                 ║
 * ║  Archivo         : components/reportes/RentabilidadServicios.jsx        ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Cada servicio por separado: lo vendido (o cobrado aparte, si es de póliza)
 * frente a lo que costó. En los de póliza, además, su costo real frente al
 * costo del plan. Los totales de utilidad solo usan servicios con venta y
 * costo registrados, y se dice cuántos son.
 */
import { useEffect, useMemo, useState } from 'react'
import { Search, FileSpreadsheet, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import Angelito from '../ui/Angelito.jsx'
import { RT_CSS, $, $c, pct, n0, sinTildes, fFecha, Chip } from './rentabilidadComun.jsx'

const ORIGEN = {
  POLIZA:     { label: 'Póliza',     bg: '#EEF2FF', fg: '#4338CA' },
  PARTICULAR: { label: 'Particular', bg: '#F0F9FF', fg: '#0369A1' },
  CONVENIO:   { label: 'Convenio',   bg: '#FDF4FF', fg: '#A21CAF' },
  CONTRATO:   { label: 'Contrato',   bg: '#ECFDF5', fg: '#047857' },
}
const DATOS = {
  COMPLETO:  { label: 'Completo',     bg: '#ECFDF5', fg: '#047857' },
  SIN_COSTO: { label: 'Sin costo',    bg: '#FFFBEB', fg: '#B45309' },
  SIN_VENTA: { label: 'Sin venta',    bg: '#FFFBEB', fg: '#B45309' },
  SIN_DATOS: { label: 'Sin datos',    bg: '#F1F5F9', fg: '#64748B' },
}
const COLS = [
  { k: 'fecha',     l: 'Fecha' },
  { k: 'numero',    l: 'Servicio' },
  { k: 'fallecido', l: 'Fallecido' },
  { k: 'origen',    l: 'Origen' },
  { k: 'venta',     l: 'Venta / cobrado', n: 1 },
  { k: 'costo',     l: 'Costo', n: 1 },
  { k: 'utilidad',  l: 'Utilidad', n: 1 },
  { k: 'margen',    l: 'Margen', n: 1 },
  { k: 'dif_plan',  l: 'Costo vs. plan', n: 1 },
  { k: 'datos',     l: 'Datos' },
]

export default function RentabilidadServicios({ filtros }) {
  const [filas, setFilas] = useState(null)
  const [q, setQ] = useState('')
  const [origen, setOrigen] = useState('')
  const [datos, setDatos] = useState('')
  const [orden, setOrden] = useState({ k: 'fecha', asc: false })
  const [pag, setPag] = useState(0)

  useEffect(() => {
    setFilas(null)
    const params = { fecha_inicio: filtros.desde, fecha_fin: filtros.hasta }
    if (filtros.sede) params.sede_id = filtros.sede
    api.get('/reportes/rentabilidad-servicios', { params })
      .then(r => setFilas(r.data.data))
      .catch(e => { toast.error(e?.response?.data?.error || 'No se pudo cargar la rentabilidad de servicios'); setFilas([]) })
  }, [filtros.desde, filtros.hasta, filtros.sede])

  const vista = useMemo(() => {
    if (!filas) return []
    const b = sinTildes(q.trim())
    const r = filas.filter(f => (!origen || f.origen === origen) && (!datos || f.datos === datos) &&
      (!b || sinTildes(`${f.fallecido} ${f.codigo} ${f.numero} ${f.poliza} ${f.convenio} ${f.plan}`).includes(b)))
    const val = f => orden.k === 'fecha' ? new Date(f.fecha).getTime() : f[orden.k]
    return r.sort((x, y) => { const a = val(x), c = val(y); const d = typeof a === 'string' ? a.localeCompare(c) : (a ?? -1e18) - (c ?? -1e18); return orden.asc ? d : -d })
  }, [filas, q, origen, datos, orden])

  useEffect(() => setPag(0), [q, origen, datos, orden])

  const tot = useMemo(() => {
    const comp = vista.filter(f => f.datos === 'COMPLETO')
    const venta = comp.reduce((a, f) => a + f.venta, 0), costo = comp.reduce((a, f) => a + f.costo, 0)
    const pol = vista.filter(f => f.dif_plan != null)
    const porOrigen = Object.keys(ORIGEN).map(o => {
      const xs = vista.filter(f => f.origen === o), cs = xs.filter(f => f.datos === 'COMPLETO')
      const v = cs.reduce((a, f) => a + f.venta, 0), c = cs.reduce((a, f) => a + f.costo, 0)
      return { o, n: xs.length, completos: cs.length, venta: v, costo: c, utilidad: v - c, margen: v ? (v - c) / v : null }
    }).filter(x => x.n)
    return {
      n: vista.length, completos: comp.length, venta, costo, utilidad: venta - costo, margen: venta ? (venta - costo) / venta : null,
      polN: pol.length,
      polCosto: pol.length ? pol.reduce((a, f) => a + f.costo, 0) / pol.length : null,
      polPlan: pol.length ? pol.reduce((a, f) => a + f.costo_plan, 0) / pol.length : null,
      pisco: vista.filter(f => f.migrado_pisco).length,
      porOrigen,
    }
  }, [vista])

  const exportar = () => {
    const params = { fecha_inicio: filtros.desde, fecha_fin: filtros.hasta }
    if (filtros.sede) params.sede_id = filtros.sede
    api.get('/reportes/rentabilidad-servicios/export', { params, responseType: 'blob' })
      .then(r => {
        const url = URL.createObjectURL(new Blob([r.data]))
        const a = document.createElement('a'); a.href = url; a.download = 'rentabilidad-servicios.xlsx'; a.click()
        URL.revokeObjectURL(url)
        toast.success('Rentabilidad de servicios exportada a Excel')
      })
      .catch(() => toast.error('No se pudo exportar la rentabilidad de servicios'))
  }

  const POR_PAG = 50
  const pagina = vista.slice(pag * POR_PAG, (pag + 1) * POR_PAG)
  const ordenar = k => setOrden(o => ({ k, asc: o.k === k ? !o.asc : false }))

  return (
    <div>
      <style>{RT_CSS}</style>

      <div className="rt-bar">
        <div className="rt-f rt-search"><label>Buscar</label>
          <div style={{ position: 'relative' }}><Search size={14}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Fallecido, N° de servicio, póliza o plan"/></div>
        </div>
        <div className="rt-f"><label>Origen</label>
          <select value={origen} onChange={e => setOrigen(e.target.value)}>
            <option value="">Todos</option>{Object.entries(ORIGEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="rt-f"><label>Datos</label>
          <select value={datos} onChange={e => setDatos(e.target.value)}>
            <option value="">Todos</option>{Object.entries(DATOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}/>
        <button className="rp-btn-exp" onClick={exportar}><FileSpreadsheet size={14}/> Excel</button>
      </div>

      {!filas ? <div className="rp-loading">Analizando servicios…</div> : (<>
        {tot.pisco > 0 && (
          <div className="rt-aviso">
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }}/>
            <div>
              <b>{n0(tot.pisco)} de estos servicios vienen de Pisco</b>, que guardaba el valor y el costo de forma incompleta (muchos sin valor y con solo algunos ítems de costo), así que sus márgenes pueden salir más altos de lo real.
              {' '}Los totales de utilidad solo cuentan los servicios con venta y costo registrados ({n0(tot.completos)} de {n0(tot.n)}). Desde Orquídea cada ítem registra su costo real al agregarse.
            </div>
          </div>
        )}

        <div className="rt-kpis">
          <div className="rt-kpi" style={{ '--k': '#0369A1' }}><div className="rt-kpi-l">Servicios del período</div><div className="rt-kpi-v">{n0(tot.n)}</div><div className="rt-kpi-s">{n0(tot.completos)} con venta y costo ({pct(tot.n ? tot.completos / tot.n : null)})</div></div>
          <div className="rt-kpi" style={{ '--k': '#1baf7a' }}><div className="rt-kpi-l">Venta</div><div className="rt-kpi-v">{$c(tot.venta)}</div><div className="rt-kpi-s">De los servicios completos</div></div>
          <div className="rt-kpi" style={{ '--k': '#eb6834' }}><div className="rt-kpi-l">Costo</div><div className="rt-kpi-v">{$c(tot.costo)}</div><div className="rt-kpi-s">De los servicios completos</div></div>
          <div className="rt-kpi" style={{ '--k': tot.utilidad >= 0 ? '#047857' : '#B91C1C' }}><div className="rt-kpi-l">Utilidad</div><div className="rt-kpi-v" style={{ color: tot.utilidad >= 0 ? '#047857' : '#B91C1C' }}>{$c(tot.utilidad)}</div><div className="rt-kpi-s">Margen {pct(tot.margen)}</div></div>
          <div className="rt-kpi" style={{ '--k': '#7C3AED' }}><div className="rt-kpi-l">Servicios de póliza vs. plan</div>
            <div className="rt-kpi-v">{tot.polCosto != null ? $c(tot.polCosto) : '—'}</div>
            <div className="rt-kpi-s">{tot.polCosto != null ? `Costo promedio real (${n0(tot.polN)}) · plan ${$c(tot.polPlan)}` : 'Sin servicios de póliza con costo'}</div></div>
        </div>

        {tot.porOrigen.length > 1 && (
          <div className="rt-card">
            <div className="rt-ct">Por origen</div>
            <table className="rt-mini">
              <thead><tr><th>Origen</th><th className="n">Servicios</th><th className="n">Con datos</th><th className="n">Venta</th><th className="n">Costo</th><th className="n">Utilidad</th><th className="n">Margen</th></tr></thead>
              <tbody>{tot.porOrigen.map(x => (
                <tr key={x.o}><td><Chip m={ORIGEN[x.o]}/></td><td className="n">{n0(x.n)}</td><td className="n">{n0(x.completos)}</td>
                  <td className="n">{$(x.venta)}</td><td className="n">{$(x.costo)}</td>
                  <td className="n" style={{ fontWeight: 800, color: x.utilidad >= 0 ? '#047857' : '#B91C1C' }}>{$(x.utilidad)}</td><td className="n">{pct(x.margen)}</td></tr>))}
              </tbody>
            </table>
            <div className="rt-sub" style={{ marginTop: 8 }}>En los servicios de póliza, “venta” es lo que se cobró aparte a la familia; el plan se paga con las cuotas (ver Rentabilidad de pólizas).</div>
          </div>
        )}

        <div className="rt-tw">
          <table className="rt-t">
            <thead><tr>{COLS.map(c => (
              <th key={c.k} className={c.n ? 'n' : ''} onClick={() => ordenar(c.k)}>
                {c.l}{orden.k === c.k && (orden.asc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>)}
              </th>))}</tr></thead>
            <tbody>
              {pagina.map(f => (
                <tr key={f.id}>
                  <td>{fFecha(f.fecha)}</td>
                  <td><b>{f.migrado_pisco && f.codigo ? f.codigo.replace('PISCO-', 'Pisco N° ') : (f.codigo || `#${f.numero}`)}</b></td>
                  <td style={{ maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.fallecido}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Angelito size={14}/>{f.fallecido || '—'}</span>
                    {f.plan && <div className="rt-sub">{f.plan}</div>}
                  </td>
                  <td><Chip m={ORIGEN[f.origen]}/>{(f.poliza || f.convenio) && <div className="rt-sub">{f.poliza ? `Póliza ${f.poliza}` : f.convenio}</div>}</td>
                  <td className="n">{f.venta != null ? $(f.venta) : '—'}</td>
                  <td className="n">{f.costo != null ? $(f.costo) : '—'}</td>
                  <td className="n" style={{ fontWeight: 800, color: f.utilidad == null ? '#94A3B8' : f.utilidad >= 0 ? '#047857' : '#B91C1C' }}>{f.utilidad != null ? $(f.utilidad) : '—'}</td>
                  <td className="n">{pct(f.margen)}</td>
                  <td className="n">{f.dif_plan != null ? <span style={{ color: f.dif_plan > 0 ? '#B91C1C' : '#047857', fontWeight: 700 }}>{f.dif_plan > 0 ? '+' : ''}{$(f.dif_plan)}</span> : '—'}
                    {f.costo_plan ? <div className="rt-sub">plan {$(f.costo_plan)}</div> : null}</td>
                  <td><Chip m={DATOS[f.datos]}/></td>
                </tr>
              ))}
              {!pagina.length && <tr><td colSpan={COLS.length} className="rp-empty">No hay servicios en ese período con esos filtros.</td></tr>}
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
          <b>Cómo se calcula.</b> <i>Venta</i>: valor del contrato, valor del servicio del convenio, valor registrado en Pisco o, si no hay, lo cobrado en los ítems (sin los cubiertos por el plan). En los de póliza es lo cobrado aparte a la familia.
          {' '}<i>Costo</i>: costo de los ítems del servicio (cofre, flores, carroza, personal…). <i>Costo vs. plan</i>: en los de póliza, cuánto costó el servicio por encima (rojo) o por debajo (verde) del costo actual del plan. Los servicios cancelados no se cuentan.
        </div>
      </>)}
    </div>
  )
}
