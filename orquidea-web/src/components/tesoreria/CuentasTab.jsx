/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — cuentas de caja y bancos                 ║
 * ║  Archivo         : components/tesoreria/CuentasTab.jsx                  ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Tarjetas de cuentas (caja, bancos, cooperativas, billeteras) con su saldo
 * real (sale de la contabilidad), movimiento del mes, formas de pago que
 * entran a cada una y pendientes de conciliar. Crear / editar cuenta.
 */
import { useEffect, useState } from 'react'
import { X, Loader2, Save, Pencil, ListChecks, ArrowLeftRight } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { fmt, fFecha, TIPOS_CUENTA } from './comun.js'
import { IconoFormaPago } from '../ui/FormaPago.jsx'
import { useFormasPago } from '../../hooks/useFormasPago.js'

const CSS = `
.tc-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(330px, 1fr)); gap:16px; }
.tc-card { background:#fff; border:1px solid #ECEDF8; border-radius:18px; padding:18px; box-shadow:0 1px 4px rgba(0,0,0,.04); display:flex; flex-direction:column; gap:12px; position:relative; overflow:hidden; }
.tc-card.inactiva { opacity:.6; }
.tc-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--c); }
.tc-top { display:flex; gap:12px; align-items:flex-start; }
.tc-ic { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
.tc-nom { font-size:14.5px; font-weight:800; color:#0F1035; line-height:1.25; }
.tc-sub { font-size:12px; color:#64748B; margin-top:2px; }
.tc-meta { font-size:12px; color:#64748B; display:flex; gap:10px; flex-wrap:wrap; }
.tc-meta code { font-family:ui-monospace,Menlo,monospace; background:#F1F5F9; border-radius:5px; padding:0 5px; color:#334155; }
.tc-saldo { background:#F8FAFC; border-radius:12px; padding:12px 14px; }
.tc-saldo small { font-size:10.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#64748B; }
.tc-saldo b { display:block; font-size:24px; font-weight:900; line-height:1.2; }
.tc-mes { display:flex; gap:14px; font-size:11.5px; margin-top:4px; }
.tc-formas { display:flex; gap:5px; flex-wrap:wrap; }
.tc-forma { font-size:11px; font-weight:700; background:#EEF2FF; color:#4338CA; border-radius:20px; padding:2px 9px 2px 4px; display:inline-flex; align-items:center; gap:5px; }
.tc-acc { display:flex; gap:8px; }
.tc-acc button { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; border:1.5px solid #E2E8F0; background:#fff; border-radius:10px; padding:8px; font-size:12.5px; font-weight:700; color:#334155; cursor:pointer; font-family:inherit; }
.tc-acc button:hover { background:#F8FAFC; }
.tc-formas-sel { display:flex; flex-wrap:wrap; gap:6px; }
.tc-formas-sel label { display:flex; align-items:center; gap:6px; border:1.5px solid #E2E8F0; border-radius:20px; padding:4px 11px; font-size:12px; font-weight:700; cursor:pointer; text-transform:none; letter-spacing:0; color:#334155; }
.tc-formas-sel label.on { border-color:#10B981; background:#ECFDF5; color:#047857; }
.tc-formas-sel input { accent-color:#059669; }
`

function ModalCuenta({ cuenta, cuentas = [], onClose, onGuardada }) {
  const { buscar } = useFormasPago()
  const [f, setF] = useState(cuenta ? {
    nombre: cuenta.nombre, banco: cuenta.banco || '', tipo: cuenta.tipo, numero_cuenta: cuenta.numero_cuenta || '',
    titular: cuenta.titular || '', cuenta_contable_codigo: cuenta.cuenta_contable_codigo, activa: cuenta.activa,
    formas_pago: (cuenta.formas_pago || []).map(x => x.codigo),
  } : { nombre:'', banco:'', tipo:'AHORROS', numero_cuenta:'', titular:'', cuenta_contable_codigo:'', activa:true, formas_pago:[] })
  const [puc, setPuc] = useState([]), [formas, setFormas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [reasignar, setReasignar] = useState({})   // forma quitada → cuenta a la que pasa
  const originales = (cuenta?.formas_pago || []).map(x => x.codigo)
  const quitadas = formas.filter(x => originales.includes(x.codigo) && !f.formas_pago.includes(x.codigo))
  const otras = cuentas.filter(c => c.activa && c.id !== cuenta?.id)
  const cuentaDeCodigo = cod => cuentas.find(c => c.cuenta_contable_codigo === cod)
  useEffect(() => {
    api.get('/tesoreria/cuentas/puc-disponibles').then(r => { setPuc(r.data.data || []); setFormas(r.data.formas_pago || []) })
      .catch(() => toast.error('No se pudo cargar el plan de cuentas'))
  }, [])
  const set = k => v => setF(p => ({ ...p, [k]: v }))
  const toggleForma = c => setF(p => ({ ...p, formas_pago: p.formas_pago.includes(c) ? p.formas_pago.filter(x => x !== c) : [...p.formas_pago, c] }))

  const guardar = async () => {
    if (!f.nombre.trim()) return toast.error('Escriba el nombre de la cuenta')
    const sinDestino = quitadas.filter(x => !reasignar[x.codigo])
    if (sinDestino.length) return toast.error(`Indique a qué cuenta pasan los pagos con: ${sinDestino.map(x => x.nombre).join(', ')}`)
    setGuardando(true)
    try {
      const body = { ...f, reasignar }
      if (cuenta) await api.put(`/tesoreria/cuentas/${cuenta.id}`, body)
      else await api.post('/tesoreria/cuentas', body)
      const movidas = quitadas.map(x => `${x.nombre} → ${otras.find(c => c.id === reasignar[x.codigo])?.nombre}`)
      toast.success(`${cuenta ? 'Cuenta actualizada' : 'Cuenta creada'}${movidas.length ? ` · ${movidas.join(' · ')}` : ''}`)
      onGuardada()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo guardar la cuenta') }
    finally { setGuardando(false) }
  }

  return (
    <div className="ts-ov">
      <div className="ts-modal">
        <div className="ts-mhead"><b>{cuenta ? 'Editar cuenta' : 'Nueva cuenta de caja o banco'}</b><button onClick={onClose} title="Cerrar"><X size={16}/></button></div>
        <div className="ts-mbody">
          <div className="ts-campo"><label>Nombre *</label>
            <input className="ts-input" value={f.nombre} onChange={e => set('nombre')(e.target.value)} placeholder="Ej.: Bancolombia ahorros funeraria"/></div>
          <div className="ts-g2">
            <div className="ts-campo"><label>Tipo</label>
              <select className="ts-select" value={f.tipo} onChange={e => set('tipo')(e.target.value)}>
                {Object.entries(TIPOS_CUENTA).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select></div>
            <div className="ts-campo"><label>Banco / entidad</label>
              <input className="ts-input" value={f.banco} onChange={e => set('banco')(e.target.value)} placeholder="Bancolombia, Crediservir…"/></div>
            <div className="ts-campo"><label>Número de cuenta</label>
              <input className="ts-input" value={f.numero_cuenta} data-cap="no" onChange={e => set('numero_cuenta')(e.target.value)} placeholder="Opcional"/></div>
            <div className="ts-campo"><label>Titular</label>
              <input className="ts-input" value={f.titular} onChange={e => set('titular')(e.target.value)} placeholder="Opcional"/></div>
          </div>
          <div className="ts-campo"><label>Cuenta contable (PUC)</label>
            {cuenta ? (
              <input className="ts-input" value={`${cuenta.cuenta_contable_codigo} — ${cuenta.puc_nombre}`} disabled/>
            ) : (
              <select className="ts-select" value={f.cuenta_contable_codigo} onChange={e => set('cuenta_contable_codigo')(e.target.value)}>
                <option value="">✨ Crear una subcuenta nueva automáticamente</option>
                {puc.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre}</option>)}
              </select>
            )}
            <small>El saldo y los movimientos de la cuenta salen de esta cuenta contable. {cuenta ? 'No se cambia después de creada.' : ''}</small>
          </div>
          <div className="ts-campo"><label>Formas de pago que entran a esta cuenta</label>
            <div className="tc-formas-sel">
              {formas.map(x => {
                const enOtra = x.cuenta_contable_codigo && x.cuenta_contable_codigo !== cuenta?.cuenta_contable_codigo ? cuentaDeCodigo(x.cuenta_contable_codigo) : null
                const marcada = f.formas_pago.includes(x.codigo)
                return (
                  <label key={x.codigo} className={marcada ? 'on' : ''} title={enOtra ? `Hoy entra a ${enOtra.nombre}` : ''}>
                    <input type="checkbox" checked={marcada} onChange={() => toggleForma(x.codigo)}/><IconoFormaPago forma={buscar(x.codigo) || x} size={18}/> {x.nombre}
                    {marcada && enOtra && <span style={{ fontSize:10.5, color:'#B45309', fontWeight:700 }}>· sale de {enOtra.nombre}</span>}
                  </label>
                )
              })}
            </div>
            <small>Ej.: si marca "Bancolombia", todo pago recibido por transferencia Bancolombia se suma a esta cuenta.</small>
            {quitadas.length > 0 && (
              <div style={{ marginTop:10, padding:'10px 12px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#92400E', marginBottom:6 }}>Quitó formas de pago de esta cuenta: ¿a qué cuenta pasan esos pagos?</div>
                {quitadas.map(x => (
                  <div key={x.codigo} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ minWidth:120, fontSize:12.5, fontWeight:700, color:'#334155', display:'flex', alignItems:'center', gap:6 }}><IconoFormaPago forma={buscar(x.codigo) || x} size={18}/> {x.nombre} →</span>
                    <select className="ts-select" style={{ flex:1 }} value={reasignar[x.codigo] || ''}
                      onChange={e => setReasignar(r => ({ ...r, [x.codigo]: e.target.value }))}>
                      <option value="">— Elija la cuenta —</option>
                      {otras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                ))}
                {!otras.length && <div style={{ fontSize:12, color:'#B91C1C' }}>No hay otra cuenta activa: cree primero la cuenta a la que deben pasar.</div>}
              </div>
            )}
          </div>
          {cuenta && (
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'#334155', cursor:'pointer' }}>
              <input type="checkbox" checked={f.activa} onChange={e => set('activa')(e.target.checked)} style={{ accentColor:'#059669' }}/> Cuenta activa
            </label>
          )}
        </div>
        <div className="ts-mpie">
          <button className="ts-btn sec" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button className="ts-btn pri" onClick={guardar} disabled={guardando}>{guardando ? <Loader2 size={14} className="pl-spin"/> : <Save size={14}/>} Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function CuentasTab({ cuentas, cargando, recargar, verMovimientos, trasladar, nueva, setNueva }) {
  const { buscar } = useFormasPago()
  const [editar, setEditar] = useState(null)
  const mask = n => n ? `•••• ${String(n).replace(/\D/g, '').slice(-4)}` : null

  return (
    <>
      <style>{CSS}</style>
      {cargando && !cuentas.length ? <div className="ts-vacio"><Loader2 size={22} className="pl-spin"/></div>
        : !cuentas.length ? <div className="ts-vacio">No hay cuentas. Cree la primera con "Nueva cuenta".</div> : (
        <div className="tc-grid">
          {cuentas.map(c => {
            const t = TIPOS_CUENTA[c.tipo] || TIPOS_CUENTA.OTRO
            return (
              <div key={c.id} className={`tc-card${c.activa ? '' : ' inactiva'}`} style={{ '--c': t.color }}>
                <div className="tc-top">
                  <div className="tc-ic" style={{ background:t.bg }}>{t.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="tc-nom">{c.nombre}</div>
                    <div className="tc-sub">{c.banco || t.label}</div>
                  </div>
                  <span className="ts-badge" style={{ background:t.bg, color:t.color }}>{c.activa ? t.label : 'Inactiva'}</span>
                </div>
                <div className="tc-meta">
                  {mask(c.numero_cuenta) && <span>{mask(c.numero_cuenta)}</span>}
                  {c.titular && <span>{c.titular}</span>}
                  <span title={c.puc_nombre}>PUC <code>{c.cuenta_contable_codigo}</code></span>
                </div>
                <div className="tc-saldo">
                  <small>Saldo actual</small>
                  <b style={{ color: c.saldo < 0 ? '#DC2626' : '#065F46' }}>{fmt(c.saldo)}</b>
                  <div className="tc-mes">
                    <span style={{ color:'#047857' }}>▲ {fmt(c.entradas_mes)} este mes</span>
                    <span style={{ color:'#B91C1C' }}>▼ {fmt(c.salidas_mes)}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>
                    {c.ultimo_movimiento ? `Último movimiento: ${fFecha(c.ultimo_movimiento)}` : 'Sin movimientos'}
                    {c.sin_conciliar > 0 && <> · <b style={{ display:'inline', fontSize:11, color:'#B45309' }}>{c.sin_conciliar} sin conciliar</b></>}
                  </div>
                </div>
                <div className="tc-formas">
                  {(c.formas_pago || []).length
                    ? c.formas_pago.map(x => <span key={x.codigo} className="tc-forma"><IconoFormaPago forma={buscar(x.codigo) || x} size={16}/> {x.nombre}</span>)
                    : <span style={{ fontSize:11.5, color:'#94A3B8' }}>Ninguna forma de pago entra aquí</span>}
                </div>
                <div className="tc-acc">
                  <button onClick={() => setEditar(c)}><Pencil size={13}/> Editar</button>
                  <button onClick={() => verMovimientos(c)}><ListChecks size={13}/> Movimientos</button>
                  {c.activa && <button onClick={() => trasladar(c)}><ArrowLeftRight size={13}/> Trasladar</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {(editar || nueva) && (
        <ModalCuenta cuenta={editar} cuentas={cuentas} onClose={() => { setEditar(null); setNueva(false) }}
          onGuardada={() => { setEditar(null); setNueva(false); recargar() }}/>
      )}
    </>
  )
}
