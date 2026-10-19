/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — conciliación bancaria                    ║
 * ║  Archivo         : components/tesoreria/ConciliacionTab.jsx             ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Por cuenta y mes: se escribe el saldo del extracto del banco y se marcan
 * los movimientos que el banco ya reporta. Lo no marcado son partidas en
 * tránsito. Saldo en libros − en tránsito = saldo según banco → diferencia 0.
 */
import { useCallback, useEffect, useState } from 'react'
import { X, Loader2, Plus, Lock, CheckCircle2, ChevronLeft, Save } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import CurrencyInput from '../ui/CurrencyInput.jsx'
import { fmt, fFecha } from './comun.js'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const periodoTxt = p => `${MESES[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`

function Detalle({ id, volver, recargarCuentas }) {
  const [d, setD] = useState(null)
  const [extracto, setExtracto] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const cargar = useCallback(async () => {
    try { const r = await api.get(`/tesoreria/conciliaciones/${id}`); setD(r.data.data); setExtracto(Number(r.data.data.saldo_extracto)) }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudo cargar la conciliación') }
  }, [id])
  useEffect(() => { cargar() }, [cargar])
  if (!d) return <div className="ts-vacio"><Loader2 size={20} className="pl-spin"/></div>
  const cerrada = d.estado === 'CERRADA'

  const marcar = async (ids, conciliado) => {
    setTrabajando(true)
    try { await api.post(`/tesoreria/conciliaciones/${id}/marcar`, { asiento_ids: ids, conciliado }); await cargar(); recargarCuentas() }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudo marcar') }
    finally { setTrabajando(false) }
  }
  const guardarExtracto = async () => {
    try { await api.put(`/tesoreria/conciliaciones/${id}`, { saldo_extracto: extracto }); toast.success('Saldo del extracto guardado'); cargar() }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudo guardar') }
  }
  const cerrar = async () => {
    if (Math.abs(d.diferencia) > 0.5 && !window.confirm(`Hay una diferencia de ${fmt(d.diferencia)}. ¿Cerrar de todas formas?`)) return
    try { await api.post(`/tesoreria/conciliaciones/${id}/cerrar`); toast.success('Conciliación cerrada'); cargar() }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudo cerrar') }
  }
  const pendientes = d.movimientos.filter(m => !m.marcado)
  const cuadra = Math.abs(d.diferencia) < 0.5

  return (
    <div className="ts-card">
      <div className="ts-toolbar">
        <button className="ts-btn sec" onClick={volver}><ChevronLeft size={14}/> Volver</button>
        <div style={{ flex:1 }}>
          <b style={{ fontSize:15 }}>{d.cuenta_nombre} · {periodoTxt(d.periodo)}</b>
          <div style={{ fontSize:12, color:'#64748B' }}>Corte al {fFecha(d.fecha_corte)} · {cerrada ? '🔒 Cerrada' : 'Abierta'}</div>
        </div>
        {!cerrada && <button className="ts-btn pri" onClick={cerrar}><Lock size={14}/> Cerrar conciliación</button>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, padding:16, borderBottom:'1px solid #F1F5F9' }}>
        <div className="ts-kpi" style={{ padding:12 }}><div><small>Saldo en libros</small><b style={{ fontSize:18 }}>{fmt(d.saldo_libros_calc)}</b></div></div>
        <div className="ts-kpi" style={{ padding:12 }}><div><small>En tránsito (no en extracto)</small>
          <div style={{ fontSize:13, fontWeight:800, color:'#047857', marginTop:2 }}>Entradas +{fmt(d.transito_entradas)}</div>
          <div style={{ fontSize:13, fontWeight:800, color:'#B91C1C' }}>Salidas −{fmt(d.transito_salidas)}</div></div></div>
        <div className="ts-kpi" style={{ padding:12 }}><div><small>Libros ajustado</small><b style={{ fontSize:18 }}>{fmt(d.saldo_libros_ajustado)}</b></div></div>
        <div className="ts-kpi" style={{ padding:12 }}><div style={{ width:'100%' }}><small>Saldo según extracto</small>
          {cerrada ? <b style={{ fontSize:18 }}>{fmt(d.saldo_extracto)}</b> : (
            <div style={{ display:'flex', gap:6, marginTop:4 }}><div style={{ flex:1 }}><CurrencyInput value={extracto} onChange={setExtracto}/></div>
              <button className="ts-btn sec" style={{ padding:'6px 9px' }} onClick={guardarExtracto} title="Guardar"><Save size={13}/></button></div>
          )}</div></div>
        <div className="ts-kpi" style={{ padding:12, background: cuadra ? '#ECFDF5' : '#FEF2F2' }}><div><small>Diferencia</small>
          <b style={{ fontSize:18, color: cuadra ? '#047857' : '#B91C1C' }}>{cuadra ? '✓ Cuadra' : fmt(d.diferencia)}</b></div></div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', fontSize:12.5, color:'#475569' }}>
        Marque los movimientos que aparecen en el extracto del banco. {pendientes.length} en tránsito.
        {!cerrada && pendientes.length > 0 && <button className="ts-btn sec" style={{ marginLeft:'auto', padding:'6px 10px' }} disabled={trabajando}
          onClick={() => marcar(pendientes.map(m => m.id), true)}><CheckCircle2 size={13}/> Marcar todos</button>}
      </div>
      <div style={{ overflow:'auto', maxHeight:'52vh' }}>
        <table className="ts-tabla">
          <thead><tr><th style={{ width:40 }}>✓</th><th>Fecha</th><th>Comprobante</th><th>Concepto</th><th className="num">Entrada</th><th className="num">Salida</th></tr></thead>
          <tbody>
            {!d.movimientos.length ? <tr><td colSpan={6} className="ts-vacio">No hay movimientos hasta el corte.</td></tr>
              : d.movimientos.map(m => (
                <tr key={m.id} style={{ background: m.marcado ? '#F0FDF4' : undefined, cursor: cerrada ? 'default' : 'pointer' }}
                  onClick={() => !cerrada && !trabajando && marcar([m.id], !m.marcado)}>
                  <td style={{ textAlign:'center' }}><input type="checkbox" checked={!!m.marcado} readOnly disabled={cerrada} style={{ accentColor:'#059669' }}/></td>
                  <td style={{ whiteSpace:'nowrap' }}>{fFecha(m.fecha)}</td>
                  <td><b style={{ fontFamily:'ui-monospace,Menlo,monospace', fontSize:12, color:'#047857' }}>{m.numero}</b></td>
                  <td>{m.concepto}<div style={{ fontSize:11.5, color:'#64748B' }}>{[m.tercero, m.referencia && `Ref. ${m.referencia}`].filter(Boolean).join(' · ')}</div></td>
                  <td className="num" style={{ color:'#047857', fontWeight:700 }}>{m.entrada ? fmt(m.entrada) : ''}</td>
                  <td className="num" style={{ color:'#B91C1C', fontWeight:700 }}>{m.salida ? fmt(m.salida) : ''}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ConciliacionTab({ cuentas, recargarCuentas }) {
  const [lista, setLista] = useState([])
  const [abierta, setAbierta] = useState(null)
  const [nueva, setNueva] = useState(false)
  const hoy = new Date()
  const [f, setF] = useState({ cuenta_id: '', periodo: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`, saldo_extracto: '' })
  const cargar = useCallback(async () => {
    try { const r = await api.get('/tesoreria/conciliaciones'); setLista(r.data.data || []) }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudieron cargar las conciliaciones') }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const crear = async () => {
    if (!f.cuenta_id) return toast.error('Seleccione la cuenta')
    try {
      const r = await api.post('/tesoreria/conciliaciones', f)
      toast.success('Conciliación creada'); setNueva(false); cargar(); setAbierta(r.data.data.id)
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo crear') }
  }

  if (abierta) return <Detalle id={abierta} volver={() => { setAbierta(null); cargar() }} recargarCuentas={recargarCuentas}/>

  return (
    <div className="ts-card">
      <div className="ts-toolbar">
        <div style={{ flex:1, fontSize:13, color:'#475569' }}>Cuadre cada cuenta con el extracto del banco, mes a mes.</div>
        <button className="ts-btn pri" onClick={() => setNueva(true)}><Plus size={14}/> Nueva conciliación</button>
      </div>
      <table className="ts-tabla">
        <thead><tr><th>Cuenta</th><th>Mes</th><th className="num">Saldo extracto</th><th className="num">Saldo libros</th><th>Marcados</th><th>Estado</th></tr></thead>
        <tbody>
          {!lista.length ? <tr><td colSpan={6} className="ts-vacio">Aún no hay conciliaciones.</td></tr>
            : lista.map(c => (
              <tr key={c.id} style={{ cursor:'pointer' }} onClick={() => setAbierta(c.id)}>
                <td><b>{c.cuenta_nombre}</b></td><td>{periodoTxt(c.periodo)}</td>
                <td className="num">{fmt(c.saldo_extracto)}</td><td className="num">{c.saldo_libros != null ? fmt(c.saldo_libros) : '—'}</td>
                <td>{c.marcados}</td>
                <td>{c.estado === 'CERRADA' ? <span className="ts-badge" style={{ background:'#D1FAE5', color:'#047857' }}>🔒 Cerrada</span> : <span className="ts-badge" style={{ background:'#FEF3C7', color:'#B45309' }}>Abierta</span>}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {nueva && (
        <div className="ts-ov">
          <div className="ts-modal">
            <div className="ts-mhead"><b>Nueva conciliación bancaria</b><button onClick={() => setNueva(false)} title="Cerrar"><X size={16}/></button></div>
            <div className="ts-mbody">
              <div className="ts-campo"><label>Cuenta *</label>
                <select className="ts-select" value={f.cuenta_id} onChange={e => setF(p => ({ ...p, cuenta_id: e.target.value }))}>
                  <option value="">— Seleccione —</option>{cuentas.filter(c => c.activa).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select></div>
              <div className="ts-g2">
                <div className="ts-campo"><label>Mes *</label><input type="month" className="ts-input" value={f.periodo} onChange={e => setF(p => ({ ...p, periodo: e.target.value }))}/></div>
                <div className="ts-campo"><label>Saldo del extracto</label><CurrencyInput value={f.saldo_extracto} onChange={v => setF(p => ({ ...p, saldo_extracto: v }))}/>
                  <small>El saldo final que muestra el banco a fin de mes.</small></div>
              </div>
            </div>
            <div className="ts-mpie">
              <button className="ts-btn sec" onClick={() => setNueva(false)}>Cancelar</button>
              <button className="ts-btn pri" onClick={crear}><Plus size={14}/> Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
