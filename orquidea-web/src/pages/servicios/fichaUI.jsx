/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios — piezas visuales de la ficha              ║
 * ║  Archivo         : pages/servicios/fichaUI.jsx                          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-20                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Secciones, datos, encabezado de persona, avance y ayudas con el mismo
 * aspecto en Información, Fallecido y Contratante del servicio funerario.
 */
import { CheckCircle2, Circle, Info } from 'lucide-react'

export const CSS_FICHA = `
.fx-hero { display:flex; gap:16px; align-items:center; padding:18px 20px; border-radius:16px; margin-bottom:16px;
  background:linear-gradient(135deg,#F5F3FF 0%,#FFFFFF 70%); border:1.5px solid #E9E5FB; }
.fx-hero-av { width:58px; height:58px; border-radius:16px; display:flex; align-items:center; justify-content:center;
  font-size:20px; font-weight:900; color:#fff; flex-shrink:0; background:linear-gradient(135deg,#7C3AED,#4C1D95);
  box-shadow:0 6px 16px rgba(109,40,217,.25); }
.fx-hero-txt { flex:1; min-width:0; }
.fx-hero-kicker { font-size:10.5px; font-weight:800; color:#7C3AED; letter-spacing:.08em; text-transform:uppercase; }
.fx-hero-nom { font-size:19px; font-weight:900; color:#0F1035; line-height:1.2; margin-top:2px; }
.fx-hero-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.fx-chip { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700;
  background:#fff; border:1px solid #E5E7EB; color:#374151; white-space:nowrap; }
.fx-hero-side { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }

.fx-prog { min-width:190px; }
.fx-prog-top { display:flex; justify-content:space-between; gap:10px; font-size:11px; font-weight:800; color:#475569; margin-bottom:5px; }
.fx-prog-bar { height:7px; border-radius:7px; background:#EEF0F6; overflow:hidden; }
.fx-prog-bar > div { height:100%; border-radius:7px; transition:width .3s; }

.fx-sec { background:#fff; border:1.5px solid #ECEEF5; border-radius:14px; margin-bottom:14px; overflow:hidden; }
.fx-sec-head { display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-bottom:1px solid #F1F2F8; background:#FBFBFE; }
.fx-sec-ic { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px;
  background:#F3F0FF; flex-shrink:0; }
.fx-sec-tit { font-size:13px; font-weight:800; color:#1F2937; }
.fx-sec-sub { font-size:11.5px; color:#6B7280; margin-top:1px; line-height:1.4; }
.fx-sec-acc { margin-left:auto; display:flex; gap:6px; align-items:center; flex-shrink:0; }
.fx-sec-body { padding:14px 16px; }
.fx-grid { display:grid; gap:14px 20px; }

.fx-dato { display:flex; flex-direction:column; gap:3px; min-width:0; }
.fx-dato-l { font-size:10.5px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.05em; }
.fx-dato-v { font-size:13.5px; font-weight:700; color:#111827; line-height:1.35; overflow-wrap:anywhere; }
.fx-dato-v.vacio { color:#CBD5E1; font-weight:600; }
.fx-dato-a { font-size:11px; color:#9CA3AF; }

.fx-ayuda { display:flex; gap:10px; padding:11px 14px; border-radius:12px; font-size:12.5px; line-height:1.5; margin-bottom:14px; }
.fx-ayuda b { font-weight:800; }

.fx-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:9px; font-size:12px; font-weight:700;
  cursor:pointer; font-family:inherit; border:1.5px solid #E4E6F0; background:#fff; color:#374151; white-space:nowrap; }
.fx-btn:hover { background:#F8F9FF; }
.fx-btn.pri { background:linear-gradient(135deg,#7C3AED,#6D28D9); color:#fff; border-color:transparent; box-shadow:0 2px 8px rgba(124,58,237,.25); }
.fx-btn.pri:disabled { opacity:.6; cursor:not-allowed; }

.fx-pasos { display:flex; flex-direction:column; }
.fx-paso { display:flex; gap:12px; position:relative; padding-bottom:16px; }
.fx-paso:last-child { padding-bottom:0; }
.fx-paso:not(:last-child)::before { content:''; position:absolute; left:17px; top:38px; bottom:2px; width:2px; background:#ECEEF5; }
.fx-paso-ic { width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; border:1.5px solid; }
.fx-paso-tit { font-size:13px; font-weight:800; color:#1F2937; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.fx-paso-est { font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:6px; }
.fx-paso-det { font-size:12.5px; color:#475569; margin-top:3px; line-height:1.5; }

.fx-falta { display:flex; flex-direction:column; gap:6px; }
.fx-falta-it { display:flex; align-items:center; gap:8px; font-size:12.5px; color:#374151; }
.fx-falta-it button { margin-left:auto; white-space:nowrap; flex-shrink:0; border:none; background:none; color:#6D28D9; font-weight:800; font-size:11.5px; cursor:pointer; font-family:inherit; }

@media (max-width:900px) {
  .fx-hero { flex-wrap:wrap; }
  .fx-hero-side { align-items:flex-start; width:100%; }
  .fx-grid { grid-template-columns:1fr 1fr !important; }
}
`

/** Sección con ícono, título, ayuda corta y acciones a la derecha. */
export function Seccion({ icon, titulo, ayuda, acciones, cols = 2, children, color }) {
  return (
    <div className="fx-sec">
      <div className="fx-sec-head">
        <div className="fx-sec-ic" style={color ? { background: color + '18' } : undefined}>{icon}</div>
        <div style={{ minWidth:0 }}>
          <div className="fx-sec-tit" style={color ? { color } : undefined}>{titulo}</div>
          {ayuda && <div className="fx-sec-sub">{ayuda}</div>}
        </div>
        {acciones && <div className="fx-sec-acc">{acciones}</div>}
      </div>
      <div className="fx-sec-body">
        {cols ? <div className="fx-grid" style={{ gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))` }}>{children}</div> : children}
      </div>
    </div>
  )
}

/** Un dato de solo lectura: etiqueta + valor (gris si está vacío) + nota opcional. */
export function Dato({ label, valor, nota, ancho, color }) {
  const vacio = valor === null || valor === undefined || valor === '' || valor === '—'
  return (
    <div className="fx-dato" style={ancho ? { gridColumn:'1 / -1' } : undefined}>
      <span className="fx-dato-l">{label}</span>
      <span className={`fx-dato-v${vacio ? ' vacio' : ''}`} style={!vacio && color ? { color } : undefined}>{vacio ? 'Sin registrar' : valor}</span>
      {nota && <span className="fx-dato-a">{nota}</span>}
    </div>
  )
}

/** Barra de avance: "Datos completos 12 de 18". */
export function Progreso({ hechos, total, titulo = 'Datos completos' }) {
  const pct = total ? Math.round(hechos / total * 100) : 0
  const color = pct >= 100 ? '#059669' : pct >= 60 ? '#7C3AED' : '#D97706'
  return (
    <div className="fx-prog">
      <div className="fx-prog-top"><span>{titulo}</span><span style={{ color }}>{hechos} de {total}</span></div>
      <div className="fx-prog-bar"><div style={{ width:`${pct}%`, background:color }}/></div>
    </div>
  )
}

/** Recuadro de ayuda (info, aviso u ok). */
export function Ayuda({ tipo = 'info', children }) {
  const t = { info:['#EEF2FF','#C7D2FE','#3730A3'], aviso:['#FFFBEB','#FDE68A','#92400E'], ok:['#ECFDF5','#A7F3D0','#065F46'] }[tipo]
  return (
    <div className="fx-ayuda" style={{ background:t[0], border:`1px solid ${t[1]}`, color:t[2] }}>
      <Info size={16} style={{ flexShrink:0, marginTop:1 }}/>
      <div>{children}</div>
    </div>
  )
}

/** Lista de lo que falta, con atajo a la pestaña donde se completa. */
export function ListaFaltantes({ items }) {
  return (
    <div className="fx-falta">
      {items.map(it => (
        <div key={it.label} className="fx-falta-it">
          {it.ok ? <CheckCircle2 size={15} color="#059669"/> : <Circle size={15} color="#D97706"/>}
          <span style={{ color: it.ok ? '#6B7280' : '#1F2937', textDecoration: it.ok ? 'line-through' : 'none' }}>{it.label}</span>
          {!it.ok && it.ir && <button onClick={it.ir}>{it.accion || 'Completar'} →</button>}
        </div>
      ))}
    </div>
  )
}

export const iniciales = nombre => String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
