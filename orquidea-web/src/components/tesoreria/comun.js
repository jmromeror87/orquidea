/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — utilidades y estilos compartidos         ║
 * ║  Archivo         : components/tesoreria/comun.js                        ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
export const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
export const fFecha = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' }) : '—'
export const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const primerDiaMes = () => hoyISO().slice(0, 8) + '01'

export const TIPOS_CUENTA = {
  CAJA_GENERAL: { label:'Caja general', icon:'💵', color:'#059669', bg:'#ECFDF5' },
  CAJA_MENOR:   { label:'Caja menor',   icon:'🪙', color:'#B45309', bg:'#FFFBEB' },
  AHORROS:      { label:'Ahorros',      icon:'🏦', color:'#047857', bg:'#D1FAE5' },
  CORRIENTE:    { label:'Corriente',    icon:'🏛️', color:'#1D4ED8', bg:'#DBEAFE' },
  COOPERATIVA:  { label:'Cooperativa',  icon:'🤝', color:'#7C3AED', bg:'#EDE9FE' },
  BILLETERA:    { label:'Billetera digital', icon:'📱', color:'#BE185D', bg:'#FCE7F3' },
  OTRO:         { label:'Otra',         icon:'💼', color:'#475569', bg:'#F1F5F9' },
}

// De dónde viene cada movimiento (comprobante contable que lo originó)
export function origenMovimiento(m) {
  const d = m.documento_origen_tipo || ''
  if (m.comprobante_tipo === 'REVERSION') return { label:'Reverso', color:'#B91C1C', bg:'#FEE2E2' }
  if (m.comprobante_tipo === 'TRASLADO' || d === 'tesoreria_traslados') return { label:'Traslado', color:'#4338CA', bg:'#E0E7FF' }
  if (d.includes('poliza')) return { label:'Póliza', color:'#047857', bg:'#D1FAE5' }
  if (d.includes('contrato')) return { label:'Contrato', color:'#0E7490', bg:'#CFFAFE' }
  if (d.includes('pos') || d.includes('venta')) return { label:'Punto de venta', color:'#B45309', bg:'#FEF3C7' }
  if (d.includes('compra')) return { label:'Compra', color:'#9D174D', bg:'#FCE7F3' }
  if (d.includes('servicio')) return { label:'Servicio', color:'#6D28D9', bg:'#EDE9FE' }
  if (d === 'tesoreria_comprobantes') return { label: m.comprobante_tipo === 'EGRESO' ? 'Egreso' : 'Ingreso', color:'#334155', bg:'#E2E8F0' }
  return { label:'Contable', color:'#475569', bg:'#F1F5F9' }
}

export const CSS_TES = `
.ts-page { padding:24px 30px; }
.ts-head { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:20px; }
.ts-hicon { width:56px; height:56px; border-radius:16px; background:linear-gradient(135deg,#047857,#10B981); display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(5,150,105,.3); }
.ts-head h1 { margin:0; font-size:26px; font-weight:900; color:#0F1035; }
.ts-head p { margin:3px 0 0; font-size:13px; color:#94A3B8; }
.ts-head-acc { margin-left:auto; display:flex; gap:10px; flex-wrap:wrap; }
.ts-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 16px; border-radius:12px; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; border:1.5px solid transparent; white-space:nowrap; }
.ts-btn.pri { background:linear-gradient(135deg,#059669,#047857); color:#fff; box-shadow:0 3px 14px rgba(5,150,105,.28); }
.ts-btn.sec { background:#fff; color:#334155; border-color:#E2E8F0; }
.ts-btn.sec:hover { background:#F8FAFC; }
.ts-btn.dan { background:#DC2626; color:#fff; }
.ts-btn:disabled { opacity:.55; cursor:not-allowed; }
.ts-kpis { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:14px; margin-bottom:20px; }
.ts-kpi { background:#fff; border:1px solid #ECEDF8; border-radius:16px; padding:16px 18px; display:flex; gap:14px; align-items:center; box-shadow:0 1px 4px rgba(0,0,0,.04); }
.ts-kpi-ic { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ts-kpi small { display:block; font-size:12px; color:#64748B; font-weight:600; }
.ts-kpi b { display:block; font-size:22px; font-weight:900; line-height:1.2; }
.ts-kpi span { display:block; font-size:11px; color:#94A3B8; }
.ts-tabs { display:flex; gap:4px; background:#F1F5F9; padding:4px; border-radius:12px; width:fit-content; margin-bottom:18px; flex-wrap:wrap; }
.ts-tab { border:none; background:transparent; padding:8px 16px; border-radius:9px; font-size:13px; font-weight:700; color:#64748B; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:6px; }
.ts-tab.on { background:#fff; color:#047857; box-shadow:0 1px 4px rgba(0,0,0,.08); }
.ts-tab em { font-style:normal; font-size:11px; background:#FEE2E2; color:#B91C1C; border-radius:20px; padding:0 7px; }
.ts-card { background:#fff; border:1px solid #ECEDF8; border-radius:18px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
.ts-toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:14px 16px; border-bottom:1px solid #F1F5F9; }
.ts-input, .ts-select { border:1.5px solid #E2E8F0; border-radius:10px; padding:8px 11px; font-size:13px; font-family:inherit; background:#fff; outline:none; }
.ts-input:focus, .ts-select:focus { border-color:#10B981; }
.ts-tabla { width:100%; border-collapse:collapse; font-size:12.5px; }
.ts-tabla th { text-align:left; font-size:10.5px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:.05em; padding:10px 12px; background:#F8FAFC; border-bottom:1.5px solid #E2E8F0; position:sticky; top:0; z-index:1; white-space:nowrap; }
.ts-tabla td { padding:10px 12px; border-bottom:1px solid #F1F5F9; vertical-align:middle; color:#334155; }
.ts-tabla tr:hover td { background:#F8FFFB; }
.ts-tabla .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ts-badge { font-size:10.5px; font-weight:800; border-radius:20px; padding:2px 9px; white-space:nowrap; display:inline-block; }
.ts-vacio { text-align:center; padding:44px 20px; color:#94A3B8; font-size:13px; }
.ts-ov { position:fixed; inset:0; background:rgba(10,10,30,.45); backdrop-filter:blur(3px); z-index:1200; display:flex; align-items:center; justify-content:center; padding:16px; }
.ts-modal { background:#fff; border-radius:20px; width:100%; max-width:560px; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 24px 70px rgba(0,0,0,.28); }
.ts-modal.lg { max-width:760px; }
.ts-mhead { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid #F1F5F9; }
.ts-mhead b { font-size:16px; color:#0F1035; flex:1; }
.ts-mhead button { border:none; background:#F1F5F9; width:34px; height:34px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#475569; }
.ts-mbody { padding:16px 20px; overflow-y:auto; min-height:0; }
.ts-mpie { display:flex; justify-content:flex-end; gap:10px; padding:12px 20px; border-top:1px solid #F1F5F9; }
.ts-campo { margin-bottom:12px; }
.ts-campo label { display:block; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:.04em; margin-bottom:5px; }
.ts-campo .ts-input, .ts-campo .ts-select, .ts-campo textarea { width:100%; box-sizing:border-box; }
.ts-campo small { display:block; font-size:11px; color:#94A3B8; margin-top:4px; }
.ts-g2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (max-width:900px) { .ts-kpis { grid-template-columns:1fr 1fr; } .ts-page { padding:16px; } .ts-g2 { grid-template-columns:1fr; } }
`
