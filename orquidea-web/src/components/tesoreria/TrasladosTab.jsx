/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — traslados entre cuentas                  ║
 * ║  Archivo         : components/tesoreria/TrasladosTab.jsx                ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Pasar dinero entre cuentas (consignar la caja, retirar del banco…). Cada
 * traslado genera su comprobante contable TR; anular lo reversa.
 */
import { useCallback, useEffect, useState } from 'react'
import { X, Loader2, ArrowRight, Ban, Save } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import CurrencyInput from '../ui/CurrencyInput.jsx'
import { fmt, fFecha, hoyISO } from './comun.js'

export function ModalTraslado({ cuentas, origenInicial, onClose, onHecho }) {
  const activas = cuentas.filter(c => c.activa)
  const [f, setF] = useState({ cuenta_origen_id: origenInicial || '', cuenta_destino_id: '', monto: '', fecha: hoyISO(), descripcion: '', referencia: '' })
  const [guardando, setGuardando] = useState(false)
  const set = k => v => setF(p => ({ ...p, [k]: v }))
  const o = activas.find(c => c.id === f.cuenta_origen_id), de = activas.find(c => c.id === f.cuenta_destino_id)
  const guardar = async () => {
    if (!o || !de) return toast.error('Seleccione la cuenta de origen y la de destino')
    if (o.id === de.id) return toast.error('El origen y el destino deben ser cuentas distintas')
    if (!(Number(f.monto) > 0)) return toast.error('Indique el valor a trasladar')
    if (!f.descripcion.trim()) return toast.error('Escriba el motivo del traslado')
    setGuardando(true)
    try {
      const r = await api.post('/tesoreria/traslados', f)
      toast.success(`Traslado registrado (${r.data.data.comprobante_numero}): ${fmt(f.monto)} de ${o.nombre} a ${de.nombre}`)
      onHecho()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo registrar el traslado') }
    finally { setGuardando(false) }
  }
  const Op = ({ c }) => <option value={c.id}>{c.nombre} — {fmt(c.saldo)}</option>
  return (
    <div className="ts-ov">
      <div className="ts-modal">
        <div className="ts-mhead"><b>Traslado entre cuentas</b><button onClick={onClose} title="Cerrar"><X size={16}/></button></div>
        <div className="ts-mbody">
          <div className="ts-g2">
            <div className="ts-campo"><label>Sale de *</label>
              <select className="ts-select" value={f.cuenta_origen_id} onChange={e => set('cuenta_origen_id')(e.target.value)}>
                <option value="">— Cuenta de origen —</option>{activas.map(c => <Op key={c.id} c={c}/>)}
              </select></div>
            <div className="ts-campo"><label>Entra a *</label>
              <select className="ts-select" value={f.cuenta_destino_id} onChange={e => set('cuenta_destino_id')(e.target.value)}>
                <option value="">— Cuenta de destino —</option>{activas.filter(c => c.id !== f.cuenta_origen_id).map(c => <Op key={c.id} c={c}/>)}
              </select></div>
            <div className="ts-campo"><label>Valor *</label><CurrencyInput value={f.monto} onChange={set('monto')}/>
              {o && Number(f.monto) > o.saldo && <small style={{ color:'#B45309' }}>⚠ Supera el saldo de {o.nombre} ({fmt(o.saldo)})</small>}</div>
            <div className="ts-campo"><label>Fecha</label><input type="date" className="ts-input" value={f.fecha} onChange={e => set('fecha')(e.target.value)}/></div>
          </div>
          <div className="ts-campo"><label>Motivo *</label>
            <input className="ts-input" value={f.descripcion} onChange={e => set('descripcion')(e.target.value)} placeholder="Ej.: consignación del recaudo del día"/></div>
          <div className="ts-campo"><label>Referencia</label>
            <input className="ts-input" value={f.referencia} data-cap="no" onChange={e => set('referencia')(e.target.value)} placeholder="N.° de consignación, transferencia… (opcional)"/></div>
          {o && de && Number(f.monto) > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', padding:12, background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:12, fontSize:12.5 }}>
              <div style={{ textAlign:'center' }}><b>{o.nombre}</b><div style={{ color:'#B91C1C' }}>{fmt(o.saldo)} → {fmt(o.saldo - Number(f.monto))}</div></div>
              <ArrowRight size={18} color="#059669"/>
              <div style={{ textAlign:'center' }}><b>{de.nombre}</b><div style={{ color:'#047857' }}>{fmt(de.saldo)} → {fmt(de.saldo + Number(f.monto))}</div></div>
            </div>
          )}
        </div>
        <div className="ts-mpie">
          <button className="ts-btn sec" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button className="ts-btn pri" onClick={guardar} disabled={guardando}>{guardando ? <Loader2 size={14} className="pl-spin"/> : <Save size={14}/>} Registrar traslado</button>
        </div>
      </div>
    </div>
  )
}

export default function TrasladosTab({ cuentas, recargarCuentas, nuevo, setNuevo, origen }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [anular, setAnular] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)
  const cargar = useCallback(async () => {
    setCargando(true)
    try { const r = await api.get('/tesoreria/traslados'); setLista(r.data.data || []) }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudieron cargar los traslados') }
    finally { setCargando(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const confirmarAnular = async () => {
    if (motivo.trim().length < 5) return toast.error('Indique el motivo (mínimo 5 caracteres)')
    setAnulando(true)
    try {
      await api.post(`/tesoreria/traslados/${anular.id}/anular`, { motivo })
      toast.success('Traslado anulado — se generó el reverso contable')
      setAnular(null); setMotivo(''); cargar(); recargarCuentas()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo anular') }
    finally { setAnulando(false) }
  }

  return (
    <div className="ts-card">
      <div style={{ overflow:'auto', maxHeight:'66vh' }}>
        <table className="ts-tabla">
          <thead><tr><th>Fecha</th><th>Comprobante</th><th>De → A</th><th>Motivo</th><th className="num">Valor</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {cargando && !lista.length ? <tr><td colSpan={7} className="ts-vacio"><Loader2 size={20} className="pl-spin"/></td></tr>
              : !lista.length ? <tr><td colSpan={7} className="ts-vacio">No hay traslados. Use "Nuevo traslado" para consignar la caja o mover dinero entre cuentas.</td></tr>
              : lista.map(t => (
                <tr key={t.id} style={t.estado === 'ANULADO' ? { opacity:.6 } : undefined}>
                  <td style={{ whiteSpace:'nowrap' }}>{fFecha(t.fecha)}</td>
                  <td><b style={{ color:'#4338CA', fontFamily:'ui-monospace,Menlo,monospace', fontSize:12 }}>{t.comprobante_numero}</b></td>
                  <td><b>{t.origen_nombre}</b> <ArrowRight size={12} style={{ verticalAlign:-2, color:'#059669' }}/> <b>{t.destino_nombre}</b></td>
                  <td style={{ maxWidth:280 }}>{t.descripcion}<div style={{ fontSize:11.5, color:'#64748B' }}>{[t.referencia && `Ref. ${t.referencia}`, t.usuario_nombre].filter(Boolean).join(' · ')}</div>
                    {t.estado === 'ANULADO' && <div style={{ fontSize:11.5, color:'#B91C1C' }}>Anulado por {t.anulado_por_nombre} — {t.motivo_anulacion}</div>}</td>
                  <td className="num" style={{ fontWeight:800 }}>{fmt(t.monto)}</td>
                  <td>{t.estado === 'ANULADO' ? <span className="ts-badge" style={{ background:'#FEE2E2', color:'#B91C1C' }}>Anulado</span> : <span className="ts-badge" style={{ background:'#D1FAE5', color:'#047857' }}>Aplicado</span>}</td>
                  <td>{t.estado !== 'ANULADO' && <button className="ts-btn sec" style={{ padding:'6px 10px' }} onClick={() => { setAnular(t); setMotivo('') }}><Ban size={13}/> Anular</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {nuevo && <ModalTraslado cuentas={cuentas} origenInicial={origen} onClose={() => setNuevo(false)}
        onHecho={() => { setNuevo(false); cargar(); recargarCuentas() }}/>}

      {anular && (
        <div className="ts-ov">
          <div className="ts-modal">
            <div className="ts-mhead"><b>Anular traslado {anular.comprobante_numero}</b><button onClick={() => setAnular(null)} title="Cerrar"><X size={16}/></button></div>
            <div className="ts-mbody">
              <p style={{ margin:'0 0 10px', fontSize:13, color:'#475569' }}>Se genera el comprobante de reverso y los saldos vuelven a como estaban. Queda registrado quién lo anuló y por qué.</p>
              <div className="ts-campo"><label>Motivo *</label><textarea className="ts-input" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} autoFocus/></div>
            </div>
            <div className="ts-mpie">
              <button className="ts-btn sec" onClick={() => setAnular(null)} disabled={anulando}>Cancelar</button>
              <button className="ts-btn dan" onClick={confirmarAnular} disabled={anulando}>{anulando ? <Loader2 size={14} className="pl-spin"/> : <Ban size={14}/>} Anular traslado</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
