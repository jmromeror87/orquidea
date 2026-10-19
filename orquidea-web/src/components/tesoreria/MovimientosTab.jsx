/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — movimientos de caja y bancos             ║
 * ║  Archivo         : components/tesoreria/MovimientosTab.jsx              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Todo lo que entra y sale de cada cuenta (sale de la contabilidad: pólizas,
 * contratos, POS, compras, comprobantes, traslados), con saldo corrido.
 */
import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, CheckCircle2 } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { fmt, fFecha, hoyISO, primerDiaMes, origenMovimiento } from './comun.js'

export default function MovimientosTab({ cuentas, cuentaInicial }) {
  const [cuentaId, setCuentaId] = useState(cuentaInicial || '')
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoyISO())
  const [tipo, setTipo] = useState('')
  const [conc, setConc] = useState('')
  const [q, setQ] = useState('')
  const [d, setD] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => { if (cuentaInicial) setCuentaId(cuentaInicial) }, [cuentaInicial])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await api.get('/tesoreria/movimientos', { params: { cuenta_id: cuentaId || undefined, desde, hasta, tipo, conciliado: conc, q } })
      setD(r.data)
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudieron cargar los movimientos') }
    finally { setCargando(false) }
  }, [cuentaId, desde, hasta, tipo, conc, q])
  useEffect(() => { const t = setTimeout(cargar, q ? 300 : 0); return () => clearTimeout(t) }, [cargar])

  const filas = d?.data || []
  const varias = !cuentaId

  return (
    <div className="ts-card">
      <div className="ts-toolbar">
        <select className="ts-select" value={cuentaId} onChange={e => setCuentaId(e.target.value)}>
          <option value="">Todas las cuentas</option>
          {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="date" className="ts-input" value={desde} onChange={e => setDesde(e.target.value)}/>
        <span style={{ fontSize:12, color:'#94A3B8' }}>a</span>
        <input type="date" className="ts-input" value={hasta} onChange={e => setHasta(e.target.value)}/>
        <select className="ts-select" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">Entradas y salidas</option><option value="entrada">Solo entradas</option><option value="salida">Solo salidas</option>
        </select>
        <select className="ts-select" value={conc} onChange={e => setConc(e.target.value)}>
          <option value="">Conciliados o no</option><option value="no">Sin conciliar</option><option value="si">Conciliados</option>
        </select>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:11, color:'#94A3B8' }}/>
          <input className="ts-input" style={{ width:'100%', paddingLeft:30, boxSizing:'border-box' }} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar comprobante, concepto, tercero…"/>
        </div>
      </div>

      {d && (
        <div style={{ display:'flex', gap:22, flexWrap:'wrap', padding:'12px 16px', borderBottom:'1px solid #F1F5F9', fontSize:12.5 }}>
          <span>Saldo al {fFecha(d.desde)}: <b>{fmt(d.saldo_inicial)}</b></span>
          <span style={{ color:'#047857' }}>Entradas: <b>{fmt(d.totales.entradas)}</b></span>
          <span style={{ color:'#B91C1C' }}>Salidas: <b>{fmt(d.totales.salidas)}</b></span>
          {d.saldo_final != null && <span>Saldo al {fFecha(d.hasta)}: <b style={{ color: d.saldo_final < 0 ? '#DC2626' : '#065F46' }}>{fmt(d.saldo_final)}</b></span>}
          <span style={{ marginLeft:'auto', color:'#94A3B8' }}>{filas.length} movimiento{filas.length === 1 ? '' : 's'}</span>
        </div>
      )}

      <div style={{ overflow:'auto', maxHeight:'62vh' }}>
        <table className="ts-tabla">
          <thead><tr>
            <th>Fecha</th><th>Comprobante</th><th>Concepto</th>{varias && <th>Cuenta</th>}
            <th className="num">Entrada</th><th className="num">Salida</th>{!varias && <th className="num">Saldo</th>}<th title="Conciliado con el extracto">Conc.</th>
          </tr></thead>
          <tbody>
            {cargando && !filas.length ? <tr><td colSpan={8} className="ts-vacio"><Loader2 size={20} className="pl-spin"/></td></tr>
              : !filas.length ? <tr><td colSpan={8} className="ts-vacio">Sin movimientos en este rango.</td></tr>
              : filas.map(m => {
                const o = origenMovimiento(m)
                return (
                  <tr key={m.id} style={m.estado === 'ANULADO' ? { opacity:.6 } : undefined}>
                    <td style={{ whiteSpace:'nowrap' }}>{fFecha(m.fecha)}</td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      <b style={{ color:'#047857', fontFamily:'ui-monospace,Menlo,monospace', fontSize:12 }}>{m.numero}</b>
                      <div><span className="ts-badge" style={{ background:o.bg, color:o.color }}>{o.label}</span>
                        {m.estado === 'ANULADO' && <span className="ts-badge" style={{ background:'#FEE2E2', color:'#B91C1C', marginLeft:4 }}>Anulado</span>}</div>
                    </td>
                    <td style={{ maxWidth:360 }}>
                      <div style={{ fontWeight:600 }}>{m.concepto}</div>
                      <div style={{ fontSize:11.5, color:'#64748B' }}>{[m.tercero, m.referencia && `Ref. ${m.referencia}`, m.usuario].filter(Boolean).join(' · ')}</div>
                    </td>
                    {varias && <td style={{ fontSize:12 }}>{m.cuenta_nombre}</td>}
                    <td className="num" style={{ color:'#047857', fontWeight:800 }}>{m.entrada ? fmt(m.entrada) : ''}</td>
                    <td className="num" style={{ color:'#B91C1C', fontWeight:800 }}>{m.salida ? fmt(m.salida) : ''}</td>
                    {!varias && <td className="num" style={{ fontWeight:700, color: m.saldo < 0 ? '#DC2626' : '#0F172A' }}>{m.saldo != null ? fmt(m.saldo) : '—'}</td>}
                    <td style={{ textAlign:'center' }}>{m.conciliado ? <CheckCircle2 size={15} color="#059669"/> : <span style={{ color:'#CBD5E1' }}>—</span>}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
