/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Terceros — pólizas, grupo familiar y servicios       ║
 * ║  Archivo         : components/terceros/PolizasFamilia.jsx               ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * El grupo familiar de una persona sale de sus pólizas (titular o
 * beneficiaria): una sola fuente de verdad. Se muestra aquí y se cambia en la
 * póliza, con sus reglas (cupo, carencia, edad). Clic en un familiar abre su
 * ficha; "Abrir póliza" lleva al módulo de Pólizas.
 */
import { ExternalLink, Users } from 'lucide-react'
import Angelito from '../ui/Angelito.jsx'

const CSS = `
.pf-pol { background:#fff; border:1.5px solid #ECEDF8; border-radius:16px; margin-bottom:14px; overflow:hidden; }
.pf-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 16px; background:linear-gradient(135deg,#F8F9FF,#F1F3FF); border-bottom:1px solid #ECEDF8; }
.pf-num { font-size:15px; font-weight:900; color:#1E1B4B; }
.pf-chip { font-size:11px; font-weight:800; padding:3px 9px; border-radius:20px; }
.pf-meta { display:flex; gap:16px; flex-wrap:wrap; padding:10px 16px; font-size:12px; color:#64748B; border-bottom:1px solid #F3F4F6; }
.pf-meta b { color:#0F172A; font-variant-numeric:tabular-nums; }
.pf-row { display:flex; align-items:center; gap:12px; padding:9px 16px; border-bottom:1px solid #F5F6FA; }
.pf-row:last-child { border-bottom:none; }
.pf-row.click { cursor:pointer; }
.pf-row.click:hover { background:#F8F9FF; }
.pf-row.yo { background:#EEF2FF; }
.pf-av { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:12.5px; color:#fff; flex-shrink:0; }
.pf-nom { font-size:13px; font-weight:800; color:#111827; }
.pf-sub { font-size:11px; color:#94A3B8; margin-top:1px; }
.pf-par { font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:6px; text-transform:capitalize; white-space:nowrap; }
.pf-btn { display:inline-flex; align-items:center; gap:5px; margin-left:auto; padding:6px 12px; border-radius:9px; border:1.5px solid #C7D2FE; background:#fff; color:#4338CA; font-size:12px; font-weight:800; cursor:pointer; font-family:inherit; }
.pf-btn:hover { background:#EEF2FF; }
.pf-vacio { text-align:center; padding:40px 20px; color:#94A3B8; font-size:13px; }
`

const ESTADO = {
  VIGENTE:    ['#ECFDF5', '#047857'], SUSPENDIDA: ['#FFFBEB', '#B45309'], VENCIDA: ['#FEF2F2', '#B91C1C'],
  CANCELADA:  ['#F1F5F9', '#64748B'], EJECUTADA: ['#F5F3FF', '#6D28D9'],
}
const pesos = n => '$' + Math.round(+n || 0).toLocaleString('es-CO')
const fFecha = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' }) : ''
const edad = (nac, hasta) => {
  if (!nac) return null
  const a = new Date(String(nac).slice(0, 10)), b = hasta ? new Date(String(hasta).slice(0, 10)) : new Date()
  let e = b.getFullYear() - a.getFullYear(); if (b < new Date(b.getFullYear(), a.getMonth(), a.getDate())) e--
  return e >= 0 && e < 130 ? e : null
}
const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
const COLORES = ['#6D28D9','#0891B2','#DB2777','#059669','#D97706','#2563EB','#7C3AED']
const colorDe = s => COLORES[[...String(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length]

function Persona({ p, rolTxt, esYo, onAbrir, titular }) {
  const muerto = p.fallecido
  const e = edad(p.fecha_nacimiento, muerto ? p.fecha_fallecimiento : null)
  return (
    <div className={`pf-row${esYo ? ' yo' : ' click'}`} onClick={esYo ? undefined : () => onAbrir?.(p.id)} title={esYo ? 'Esta persona' : 'Abrir su ficha'}>
      <div className="pf-av" style={{ background: muerto ? 'linear-gradient(135deg,#64748B,#475569)' : colorDe(p.nombre) }}>
        {muerto ? <Angelito size={22}/> : ini(p.nombre)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="pf-nom">{p.nombre}{esYo && <span style={{ fontSize:10.5, color:'#4338CA', fontWeight:800, marginLeft:6 }}>· esta persona</span>}</div>
        <div className="pf-sub">
          {[p.sigla && p.documento ? `${p.sigla} ${p.documento}` : (p.documento || 'Sin documento'),
            e != null ? `${e} años` : null,
            muerto ? `Falleció${p.fecha_fallecimiento ? ' el ' + fFecha(p.fecha_fallecimiento) : ''}` : null,
            p.activo === false && !muerto ? 'Retirado' : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className="pf-par" style={titular ? { background:'#FEF3C7', color:'#B45309' } : { background:'#E0F2FE', color:'#0369A1' }}>{rolTxt}</span>
    </div>
  )
}

export function PolizasFamilia({ polizas = [], yoId, onAbrirTercero }) {
  if (!polizas.length) return (
    <div className="pf-vacio">
      <style>{CSS}</style>
      <Users size={30} color="#C7CAE8" style={{ marginBottom:8 }}/>
      <div style={{ fontWeight:800, color:'#374151' }}>No pertenece a ninguna póliza</div>
      <div>Su grupo familiar aparece aquí cuando sea titular o beneficiario de una póliza.</div>
    </div>
  )
  return (
    <div>
      <style>{CSS}</style>
      <div style={{ fontSize:12, color:'#64748B', marginBottom:12 }}>
        El grupo familiar sale de las pólizas. Para agregar, retirar o cambiar un beneficiario, abra la póliza: ahí se aplican el cupo, la carencia y la edad.
      </div>
      {polizas.map(p => {
        const [bg, fg] = ESTADO[p.estado] || ['#F1F5F9', '#475569']
        const vivos = p.miembros.filter(m => m.activo && !m.fallecido).length
        return (
          <div key={p.id} className="pf-pol">
            <div className="pf-head">
              <span className="pf-num">Póliza {p.numero_legado || p.numero}</span>
              <span className="pf-chip" style={{ background:bg, color:fg }}>{p.estado}</span>
              <span style={{ fontSize:12.5, fontWeight:700, color:'#4338CA' }}>{p.plan}</span>
              <span className="pf-chip" style={{ background:'#fff', color:'#475569', border:'1px solid #E2E8F0' }}>
                {p.rol === 'TITULAR' ? 'Es el titular' : `Es ${p.parentesco || 'beneficiario'}`}
              </span>
              <button type="button" className="pf-btn" onClick={() => window.open(`/polizas?buscar=${encodeURIComponent(p.numero)}`, '_blank', 'noopener')}>
                Abrir póliza <ExternalLink size={12}/>
              </button>
            </div>
            <div className="pf-meta">
              <span>Cuota <b>{pesos(p.valor_cuota)}</b></span>
              {p.pago_hasta && <span>Pagada hasta <b>{fFecha(p.pago_hasta)}</b></span>}
              <span>Afiliada desde <b>{fFecha(p.fecha_inicio)}</b></span>
              <span>Beneficiarios activos <b>{vivos}{p.max_beneficiarios ? ` de ${p.max_beneficiarios}` : ''}</b></span>
            </div>
            <Persona p={p.titular} rolTxt="Titular" titular esYo={p.titular.id === yoId} onAbrir={onAbrirTercero}/>
            {p.miembros.map(m => <Persona key={m.id} p={m} rolTxt={m.parentesco || 'beneficiario'} esYo={m.id === yoId} onAbrir={onAbrirTercero}/>)}
          </div>
        )
      })}
    </div>
  )
}

export function ServiciosTercero({ servicios = [] }) {
  if (!servicios.length) return <div className="pf-vacio"><style>{CSS}</style>No tiene servicios funerarios registrados.</div>
  return (
    <div>
      <style>{CSS}</style>
      {servicios.map(s => (
        <div key={s.id} className="pf-pol" style={{ marginBottom:10 }}>
          <div className="pf-head">
            <span className="pf-num">{s.migrado_pisco ? `Servicio Pisco N° ${String(s.codigo || '').replace('PISCO-', '')}` : (s.codigo || `#${s.numero}`)}</span>
            <span className="pf-chip" style={s.estado === 'COMPLETADO' ? { background:'#ECFDF5', color:'#047857' } : s.estado === 'CANCELADO' ? { background:'#FEF2F2', color:'#B91C1C' } : { background:'#EEF2FF', color:'#4338CA' }}>{s.estado}</span>
            <span className="pf-chip" style={{ background:'#fff', color:'#475569', border:'1px solid #E2E8F0' }}>{s.rol === 'FALLECIDO' ? 'Es el fallecido' : 'Es el responsable'}</span>
            {s.migrado_pisco && <span className="pf-chip" style={{ background:'#FEF3C7', color:'#B45309' }}>Pisco</span>}
          </div>
          <div className="pf-meta" style={{ borderBottom:'none' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><Angelito size={16}/> <b>{s.difunto}</b></span>
            <span>Fecha <b>{fFecha(s.creado_en)}</b></span>
            {s.poliza_legado || s.poliza_numero ? <span>Póliza <b>{s.poliza_legado || s.poliza_numero}</b></span> : s.convenio ? <span>Convenio <b>{s.convenio}</b></span> : <span>Particular</span>}
            {s.tipo_disposicion && <span style={{ textTransform:'capitalize' }}>{s.tipo_disposicion.toLowerCase()}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
