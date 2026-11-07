/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios — ficha de un servicio migrado de Pisco    ║
 * ║  Archivo         : components/servicios/InfoPisco.jsx                   ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Muestra con orden lo que Pisco guardaba del servicio (servicios_funerarios.
 * datos_pisco): valores y abonos, responsable, personal por rol, velación,
 * exequias y destino final. Las personas que existen en Orquídea son enlaces
 * que abren su ficha en Terceros.
 */
import { ExternalLink, Phone } from 'lucide-react'

const CSS = `
.ip-banner { display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:16px 18px; border-radius:16px; margin-bottom:14px;
  background:linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%); border:1.5px solid #FCD34D; }
.ip-banner-ic { width:48px; height:48px; border-radius:14px; background:#F59E0B; color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0; }
.ip-kicker { font-size:10.5px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; color:#B45309; }
.ip-num { font-size:22px; font-weight:900; color:#78350F; line-height:1.15; }
.ip-chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
.ip-chip { font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:20px; background:#fff; border:1px solid #FDE68A; color:#92400E; }
.ip-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; margin-bottom:14px; }
.ip-card { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; padding:14px 16px; }
.ip-card h4 { margin:0 0 10px; font-size:12px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#6B7280; display:flex; align-items:center; gap:6px; }
.ip-vals { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:8px; }
.ip-val { background:#F9FAFB; border-radius:10px; padding:8px 10px; }
.ip-val small { display:block; font-size:10.5px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:.4px; }
.ip-val b { font-size:15px; font-weight:900; color:#111827; font-variant-numeric:tabular-nums; }
.ip-val.total b { color:#065F46; } .ip-val.abono b { color:#1D4ED8; } .ip-val.desc b { color:#B91C1C; }
.ip-fila { display:flex; gap:8px; font-size:13px; color:#374151; padding:4px 0; line-height:1.45; }
.ip-fila span:first-child { min-width:96px; color:#6B7280; font-size:12px; font-weight:700; }
.ip-link { background:none; border:none; padding:0; font:inherit; color:#6D28D9; font-weight:700; cursor:pointer; text-decoration:underline; text-decoration-color:#C4B5FD; text-underline-offset:3px; display:inline-flex; align-items:center; gap:3px; }
.ip-link:hover { color:#4C1D95; }
.ip-rol { margin-bottom:10px; }
.ip-rol-t { font-size:11.5px; font-weight:800; color:#4338CA; margin-bottom:5px; }
.ip-pers { display:flex; flex-wrap:wrap; gap:6px; }
.ip-per { font-size:12px; padding:3px 10px; border-radius:20px; background:#EEF2FF; color:#3730A3; border:1px solid #C7D2FE; }
.ip-per.link { cursor:pointer; background:#F5F3FF; color:#6D28D9; border-color:#C4B5FD; font-weight:700; }
.ip-per.link:hover { background:#EDE9FE; }
.ip-abonos { margin-top:8px; font-size:12px; color:#4B5563; }
.ip-obs { font-size:13px; color:#374151; line-height:1.65; white-space:pre-wrap; }
`

const pesos = n => '$' + Math.round(+n || 0).toLocaleString('es-CO')
const fFecha = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }) : ''
const TIPOS = { AfiliadoCD:'Afiliado con derecho', AfiliadoSD:'Afiliado sin derecho', Particular:'Particular', Convenio:'Convenio' }
const VALORES = [['servicio','Valor servicio'],['comercial','Valor comercial'],['total','Total','total'],['abonos','Abonos','abono'],
  ['excedente','Excedente'],['descuento','Descuento','desc'],['traslado','Traslado'],['adicionales','Adicionales'],['destino_final','Destino final']]

// Abre la ficha del tercero en el módulo Terceros (pestaña nueva, para no perder el servicio)
const abrirTercero = doc => window.open(`/terceros?buscar=${encodeURIComponent(doc)}`, '_blank', 'noopener')

function Persona({ nombre, doc, terceroId }) {
  if (terceroId && doc) return (
    <button type="button" className="ip-link" title="Abrir su ficha en Terceros" onClick={() => abrirTercero(doc)}>
      {nombre}<ExternalLink size={11}/>
    </button>
  )
  return <span>{nombre}</span>
}

const Fila = ({ label, children }) => children ? <div className="ip-fila"><span>{label}</span><span>{children}</span></div> : null

export default function InfoPisco({ datos, observaciones, onVerFallecido }) {
  const d = datos || {}
  const v = d.valores || {}
  const resp = d.responsable
  const roles = {}
  for (const p of d.personal || []) (roles[p.rol] ||= []).push(p)

  return (
    <div>
      <style>{CSS}</style>
      <div className="ip-banner">
        <div className="ip-banner-ic">🗂️</div>
        <div style={{ minWidth:0 }}>
          <div className="ip-kicker">Servicio migrado desde Pisco</div>
          <div className="ip-num">Servicio N° {d.numero}</div>
          <div className="ip-chips">
            {d.tipo && <span className="ip-chip">{TIPOS[d.tipo] || d.tipo}</span>}
            {d.plan && <span className="ip-chip">{d.plan}</span>}
            {d.fecha && <span className="ip-chip">Prestado el {fFecha(d.fecha)}</span>}
          </div>
        </div>
        {onVerFallecido && (
          <button type="button" className="ip-link" style={{ marginLeft:'auto' }} onClick={onVerFallecido}>Ver datos del fallecido →</button>
        )}
      </div>

      {Object.keys(v).length > 0 && (
        <div className="ip-card" style={{ marginBottom:14 }}>
          <h4>💰 Valores en Pisco</h4>
          <div className="ip-vals">
            {VALORES.filter(([k]) => v[k]).map(([k, l, cls]) => (
              <div key={k} className={`ip-val ${cls || ''}`}><small>{l}</small><b>{pesos(v[k])}</b></div>
            ))}
          </div>
          {d.abonos?.length > 0 && (
            <div className="ip-abonos">
              Abonos: {d.abonos.map((a, i) => <span key={i}>{i ? ' · ' : ''}{fFecha(a.fecha)} {pesos(a.valor)}{a.recibo ? ` (rec. ${a.recibo})` : ''}</span>)}
            </div>
          )}
          {d.autorizado_por && <div className="ip-abonos">Autorizado por <b>{d.autorizado_por}</b></div>}
        </div>
      )}

      <div className="ip-grid">
        {resp && (
          <div className="ip-card">
            <h4>👤 Responsable del servicio</h4>
            <Fila label="Nombre"><Persona nombre={resp.nombre || '—'} doc={resp.doc} terceroId={resp.tercero_id}/></Fila>
            <Fila label="Documento">{resp.doc}</Fila>
            <Fila label="Teléfono">{resp.telefono && <a href={`tel:${resp.telefono}`} className="ip-link"><Phone size={11}/>{resp.telefono}</a>}</Fila>
            <Fila label="Ciudad">{resp.ciudad}</Fila>
            <Fila label="Dirección">{resp.direccion}</Fila>
          </div>
        )}
        {(d.velacion || d.exequias || d.destino) && (
          <div className="ip-card">
            <h4>🕯️ Velación y destino final</h4>
            <Fila label="Velación">{d.velacion?.lugar}</Fila>
            <Fila label="Dirección">{d.velacion?.direccion}</Fila>
            <Fila label="Iglesia">{d.exequias?.iglesia}</Fila>
            <Fila label="Sepelio">{[d.exequias?.dia, d.exequias?.hora].filter(Boolean).join(' · ')}</Fila>
            <Fila label="Cementerio">{[d.destino?.cementerio, d.destino?.ciudad].filter(Boolean).join(' · ')}</Fila>
            <Fila label="Destino">{[d.destino?.tipo, d.destino?.lugar].filter(Boolean).join(' · ')}</Fila>
          </div>
        )}
        {(d.cofre || d.preservacion || d.servicio_por || d.familia || d.invitan) && (
          <div className="ip-card">
            <h4>📋 Otros datos</h4>
            <Fila label="Cofre">{d.cofre}</Fila>
            <Fila label="Preservación">{d.preservacion}</Fila>
            <Fila label="Servicio por">{d.servicio_por}</Fila>
            <Fila label="Familia">{d.familia}</Fila>
            <Fila label="Invitan">{d.invitan}</Fila>
          </div>
        )}
      </div>

      {Object.keys(roles).length > 0 && (
        <div className="ip-card" style={{ marginBottom:14 }}>
          <h4>👥 Personal que atendió el servicio</h4>
          {Object.entries(roles).map(([rol, ps]) => (
            <div key={rol} className="ip-rol">
              <div className="ip-rol-t">{rol}</div>
              <div className="ip-pers">
                {ps.map((p, i) => p.tercero_id && p.doc
                  ? <button key={i} type="button" className="ip-per link" title="Abrir su ficha en Terceros" onClick={() => abrirTercero(p.doc)}>{p.nombre} ↗</button>
                  : <span key={i} className="ip-per">{p.nombre}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ip-card">
        <h4>📝 Observaciones de Pisco</h4>
        {observaciones?.trim()
          ? <div className="ip-obs">{observaciones}</div>
          : <div style={{ fontSize:12.5, color:'#9CA3AF', fontStyle:'italic' }}>Pisco no tenía observaciones para este servicio.</div>}
      </div>
    </div>
  )
}
