/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — incremento anual (salario mínimo)          ║
 * ║  Archivo         : components/polizas/IncrementoAnual.jsx               ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Panel de gerencia (Planes de póliza):
 *  · Cuándo sube la cuota: aniversario de cada póliza o 1 de enero.
 *  · Redondeo de la cuota nueva.
 *  · Salario mínimo por año (decretado) o % proyectado (aún sin decreto),
 *    y el % que realmente se aplica (la gerencia puede decidir otro).
 *  · Próximas renovaciones y aplicar las vencidas ahora.
 *  · Subir también la tarifa de los planes (pólizas nuevas).
 */
import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, Loader2, Save, RefreshCw, AlertTriangle, CalendarClock, Pencil, X } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import CurrencyInput from '../ui/CurrencyInput.jsx'

const CSS = `
.ia { background:#fff; border:1.5px solid #e2e8f0; border-radius:16px; margin-top:22px; overflow:hidden; }
.ia-head { display:flex; align-items:center; gap:12px; padding:16px 20px; background:linear-gradient(90deg,#ecfdf5,#f0fdf4); border-bottom:1px solid #d1fae5; flex-wrap:wrap; }
.ia-head h2 { margin:0; font-size:16px; font-weight:900; color:#065f46; }
.ia-head p { margin:2px 0 0; font-size:12px; color:#64748b; }
.ia-body { padding:18px 20px; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.25fr); gap:20px; }
.ia-sec { font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#475569; margin:0 0 8px; }
.ia-op { display:flex; gap:8px; margin-bottom:14px; }
.ia-op button { flex:1; text-align:left; border:1.5px solid #e2e8f0; background:#fff; border-radius:12px; padding:10px 12px; cursor:pointer; font-family:inherit; }
.ia-op button b { display:block; font-size:13px; color:#0f172a; }
.ia-op button span { font-size:11.5px; color:#64748b; line-height:1.35; display:block; margin-top:2px; }
.ia-op button.on { border-color:#10b981; background:#ecfdf5; box-shadow:0 0 0 3px rgba(16,185,129,.12); }
.ia-sel { border:1.5px solid #e2e8f0; border-radius:9px; padding:7px 10px; font-size:13px; font-family:inherit; background:#fff; }
.ia-tabla { width:100%; border-collapse:collapse; font-size:12.5px; }
.ia-tabla th { text-align:left; font-size:10.5px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.04em; padding:7px 8px; border-bottom:1.5px solid #e2e8f0; background:#f8fafc; }
.ia-tabla td { padding:7px 8px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
.ia-tabla .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ia-badge { font-size:10.5px; font-weight:800; border-radius:20px; padding:2px 8px; white-space:nowrap; }
.ia-alerta { display:flex; gap:8px; align-items:flex-start; padding:10px 12px; border-radius:10px; background:#fffbeb; border:1px solid #fde68a; color:#92400e; font-size:12.5px; margin-bottom:12px; line-height:1.45; }
.ia-form { display:grid; grid-template-columns:90px 1fr 1fr; gap:8px; align-items:end; padding:12px; border:1.5px dashed #a7f3d0; border-radius:12px; background:#f0fdf4; margin-top:10px; }
.ia-form label { display:block; font-size:10.5px; font-weight:800; color:#065f46; margin-bottom:3px; text-transform:uppercase; letter-spacing:.04em; }
.ia-form input, .ia-form select { width:100%; box-sizing:border-box; border:1.5px solid #d1d5db; border-radius:8px; padding:7px 9px; font-size:13px; font-family:inherit; background:#fff; }
.ia-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; font-size:12.5px; font-weight:800; cursor:pointer; font-family:inherit; border:1.5px solid transparent; white-space:nowrap; }
.ia-btn.pri { background:linear-gradient(135deg,#059669,#047857); color:#fff; }
.ia-btn.sec { background:#fff; color:#334155; border-color:#e2e8f0; }
.ia-btn:disabled { opacity:.55; cursor:not-allowed; }
.ia-ib { border:none; background:none; color:#64748b; cursor:pointer; padding:3px; border-radius:6px; }
.ia-ib:hover { background:#f1f5f9; color:#0f172a; }
.ia-prox { max-height:300px; overflow-y:auto; border:1px solid #eef2f7; border-radius:10px; }
@media (max-width:980px) { .ia-body { grid-template-columns:1fr; } .ia-form { grid-template-columns:1fr 1fr; } }
`

const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const pct = n => n == null ? '—' : `${String(+(+n).toFixed(3)).replace('.', ',')} %`
const fFecha = iso => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })
const VACIO = { anio: new Date().getFullYear() + 1, tipo: 'proyectado', valor: '', porcentaje_aplicar: '', decreto: '' }

export default function IncrementoAnual({ onPlanesActualizados }) {
  const [d, setD] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [renovando, setRenovando] = useState(false)

  const cargar = useCallback(async () => {
    try { const r = await api.get('/polizas/incremento?dias=90'); setD(r.data.data) }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudo cargar el incremento anual') }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const config = async cambios => {
    try { await api.put('/polizas/incremento/config', cambios); toast.success('Configuración del incremento guardada'); cargar() }
    catch (e) { toast.error(e.response?.data?.error || 'No se pudo guardar') }
  }
  const guardarAnio = async () => {
    setGuardando(true)
    try {
      await api.put(`/polizas/incremento/anio/${form.anio}`, {
        proyectado: form.tipo === 'proyectado', valor: form.valor || null,
        porcentaje_aplicar: form.porcentaje_aplicar === '' ? null : form.porcentaje_aplicar, decreto: form.decreto,
      })
      toast.success(`Año ${form.anio} guardado`)
      setForm(VACIO); cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo guardar el año') }
    finally { setGuardando(false) }
  }
  const editar = a => setForm({
    anio: a.anio, tipo: a.proyectado ? 'proyectado' : 'decretado', valor: a.valor ? +a.valor : '',
    porcentaje_aplicar: a.porcentaje_aplicar != null ? +a.porcentaje_aplicar : '', decreto: a.decreto || '',
  })
  const renovarAhora = async () => {
    setRenovando(true)
    try {
      const r = await api.post('/polizas/incremento/renovar')
      const { aplicadas, pendientes } = r.data.data
      toast.success(aplicadas.length ? `${aplicadas.length} póliza(s) renovada(s) con la cuota nueva` : 'No había renovaciones por aplicar hoy')
      if (pendientes.length) toast.warning(`${pendientes.length} póliza(s) esperan el % del salario mínimo de ${[...new Set(pendientes.map(p => p.anio))].join(', ')}`, 8000)
      cargar()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo renovar') }
    finally { setRenovando(false) }
  }
  const subirPlanes = async anio => {
    const a = d.anios.find(x => x.anio === anio)
    const p = a?.porcentaje_aplicar ?? a?.porcentaje_smmlv
    if (!window.confirm(`¿Subir la cuota de TODOS los planes activos ${pct(p)} (año ${anio})?\nAfecta solo a las pólizas nuevas que se vendan.`)) return
    try {
      const r = await api.post('/polizas/incremento/planes', { anio })
      toast.success(`Tarifas de ${r.data.data.cambios.length} plan(es) actualizadas (+${pct(r.data.data.porcentaje)})`)
      onPlanesActualizados?.()
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudieron actualizar los planes') }
  }

  if (!d) return <div className="ia" style={{ padding:20, textAlign:'center' }}><style>{CSS}</style><Loader2 size={20} className="pl-spin"/></div>
  const vencidas = d.proximas.filter(p => p.vencida && !p.pendiente).length
  const anioActual = new Date().getFullYear()

  return (
    <div className="ia">
      <style>{CSS}</style>
      <div className="ia-head">
        <TrendingUp size={22} color="#059669"/>
        <div style={{ flex:1, minWidth:220 }}>
          <h2>Renovación anual — incremento por salario mínimo</h2>
          <p>Las pólizas se renuevan solas cada año y la cuota sube con el % del salario mínimo (o el que defina la gerencia).</p>
        </div>
        <button className="ia-btn sec" onClick={() => subirPlanes(anioActual)} title="Sube la tarifa de los planes para las pólizas nuevas">
          <TrendingUp size={14}/> Subir tarifa de los planes ({anioActual})
        </button>
      </div>

      <div className="ia-body">
        <div>
          <div className="ia-sec">¿Cuándo sube la cuota?</div>
          <div className="ia-op">
            <button className={d.modo === 'ANIVERSARIO' ? 'on' : ''} onClick={() => d.modo !== 'ANIVERSARIO' && config({ modo: 'ANIVERSARIO' })}>
              <b>🎂 En el aniversario</b><span>Cada póliza sube el día que cumple un año de afiliada.</span>
            </button>
            <button className={d.modo === 'ENERO' ? 'on' : ''} onClick={() => d.modo !== 'ENERO' && config({ modo: 'ENERO' })}>
              <b>🎆 El 1 de enero</b><span>Todas suben al empezar el año. Los periodos que empiezan en enero ya van con la tarifa nueva.</span>
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <span className="ia-sec" style={{ margin:0 }}>Redondeo</span>
            <select className="ia-sel" value={d.redondeo} onChange={e => config({ redondeo: +e.target.value })}>
              <option value={1}>Al peso</option>
              <option value={100}>A la centena ($100)</option>
              <option value={1000}>Al mil ($1.000)</option>
            </select>
          </div>

          <div className="ia-sec">Salario mínimo por año</div>
          {d.falta_anio_siguiente && (
            <div className="ia-alerta"><AlertTriangle size={15} style={{ flexShrink:0, marginTop:1 }}/>
              <span>No hay % registrado para <b>{d.anio_siguiente}</b>. Registre un % <b>proyectado</b> para poder cobrar por adelantado periodos de ese año; cuando salga el decreto, regístrelo como decretado.</span>
            </div>
          )}
          <table className="ia-tabla">
            <thead><tr><th>Año</th><th className="num">SMMLV</th><th className="num">% SMMLV</th><th className="num">% a pólizas</th><th></th><th></th></tr></thead>
            <tbody>
              {[...d.anios].reverse().map(a => (
                <tr key={a.anio}>
                  <td><b>{a.anio}</b></td>
                  <td className="num">{a.valor ? fmt(a.valor) : '—'}</td>
                  <td className="num">{pct(a.porcentaje_smmlv)}</td>
                  <td className="num"><b style={{ color: a.porcentaje_aplicar != null ? '#b45309' : '#047857' }}>{pct(a.porcentaje_aplicar ?? a.porcentaje_smmlv)}</b></td>
                  <td>{a.proyectado
                    ? <span className="ia-badge" style={{ background:'#fef3c7', color:'#b45309' }}>Proyectado</span>
                    : <span className="ia-badge" style={{ background:'#d1fae5', color:'#047857' }} title={a.decreto || ''}>Decretado</span>}</td>
                  <td><button className="ia-ib" title="Editar" onClick={() => editar(a)}><Pencil size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ia-form">
            <div><label>Año</label><input type="number" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: +e.target.value }))}/></div>
            <div><label>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="proyectado">Proyectado (sin decreto)</option>
                <option value="decretado">Decretado</option>
              </select>
            </div>
            {form.tipo === 'decretado'
              ? <div><label>Salario mínimo</label><CurrencyInput value={form.valor} onChange={v => setForm(f => ({ ...f, valor: v }))} placeholder="0"/></div>
              : <div><label>% proyectado</label><input type="number" step="0.01" value={form.porcentaje_aplicar} onChange={e => setForm(f => ({ ...f, porcentaje_aplicar: e.target.value }))} placeholder="Ej: 9,5"/></div>}
            {form.tipo === 'decretado' && <>
              <div style={{ gridColumn:'span 2' }}><label>Decreto</label><input value={form.decreto} data-cap="no" onChange={e => setForm(f => ({ ...f, decreto: e.target.value }))} placeholder="Ej: Decreto 1469 de 2025"/></div>
              <div><label>% a pólizas (opcional)</label><input type="number" step="0.01" value={form.porcentaje_aplicar} onChange={e => setForm(f => ({ ...f, porcentaje_aplicar: e.target.value }))} placeholder="= % SMMLV" title="Déjelo vacío para usar el % del salario mínimo; escriba otro si la gerencia decide un incremento distinto"/></div>
            </>}
            <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'flex-end', gap:8 }}>
              {(form.anio !== VACIO.anio || form.valor || form.porcentaje_aplicar) && <button className="ia-btn sec" onClick={() => setForm(VACIO)}><X size={13}/> Limpiar</button>}
              <button className="ia-btn pri" onClick={guardarAnio} disabled={guardando}>{guardando ? <Loader2 size={13} className="pl-spin"/> : <Save size={13}/>} Guardar año {form.anio}</button>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div className="ia-sec" style={{ margin:0, flex:1 }}><CalendarClock size={12} style={{ verticalAlign:-1 }}/> Próximas renovaciones (90 días)</div>
            <button className="ia-btn sec" onClick={renovarAhora} disabled={renovando} title="El sistema lo hace solo cada noche; use esto para aplicarlas ya">
              {renovando ? <Loader2 size={13} className="pl-spin"/> : <RefreshCw size={13}/>} Aplicar vencidas{vencidas ? ` (${vencidas})` : ''}
            </button>
          </div>
          {d.proximas.length === 0 ? (
            <div style={{ fontSize:12.5, color:'#94a3b8', padding:'24px 10px', textAlign:'center', border:'1px dashed #e2e8f0', borderRadius:10 }}>
              Ninguna póliza se renueva en los próximos 90 días.
            </div>
          ) : (
            <div className="ia-prox">
              <table className="ia-tabla">
                <thead><tr><th>Póliza</th><th>Fecha</th><th className="num">Cuota actual</th><th className="num">Cuota nueva</th><th className="num">%</th></tr></thead>
                <tbody>
                  {d.proximas.map(p => (
                    <tr key={p.id}>
                      <td><b>{p.numero_legado || `#${p.numero}`}</b><div style={{ fontSize:11, color:'#64748b' }}>{p.titular}</div></td>
                      <td style={{ whiteSpace:'nowrap' }}>{fFecha(p.fecha)}{p.vencida && <div><span className="ia-badge" style={{ background:'#fee2e2', color:'#b91c1c' }}>Por aplicar</span></div>}</td>
                      <td className="num">{fmt(p.cuota_actual)}</td>
                      <td className="num"><b style={{ color: p.pendiente ? '#94a3b8' : '#047857' }}>{p.pendiente ? '—' : fmt(p.cuota_nueva)}</b></td>
                      <td className="num">{p.pendiente
                        ? <span className="ia-badge" style={{ background:'#fef3c7', color:'#b45309' }}>Sin % {p.anio}</span>
                        : <>{pct(p.porcentaje)}{p.proyectado && <div><span className="ia-badge" style={{ background:'#fef3c7', color:'#b45309' }}>proyectado</span></div>}</>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ fontSize:11.5, color:'#64748b', marginTop:10, lineHeight:1.5 }}>
            El sistema aplica las renovaciones solo, cada noche. Los periodos que un cliente pague por adelantado se liquidan con la tarifa del año en que empieza cada periodo (con el % proyectado si aún no hay decreto); lo pagado queda pagado.
          </p>
        </div>
      </div>
    </div>
  )
}
