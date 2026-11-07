/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Reportes — piezas comunes de rentabilidad            ║
 * ║  Archivo         : components/reportes/rentabilidadComun.jsx            ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
export const $ = n => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(+n || 0)).toLocaleString('es-CO')
export const $c = n => { const v = Math.abs(+n || 0); const s = n < 0 ? '−' : ''; return v >= 1e9 ? `${s}$${(v / 1e9).toFixed(2).replace('.', ',')} mil M` : v >= 1e6 ? `${s}$${(v / 1e6).toFixed(1).replace('.', ',')} M` : $(n) }
export const pct = v => v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`
export const n0 = v => Number(v || 0).toLocaleString('es-CO')
export const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const fFecha = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function Chip({ m, children }) {
  return <span className="rt-chip" style={{ background: m.bg, color: m.fg }}>{m.Icon && <m.Icon size={12}/>}{children ?? m.label}</span>
}

export const RT_CSS = `
.rt-bar { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.rt-f label { display:block; font-size:10.5px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.4px; margin-bottom:4px; }
.rt-f input, .rt-f select { border:1.5px solid #E2E5F0; border-radius:10px; padding:8px 11px; font-size:13px; outline:none; background:#fff; font-family:inherit; }
.rt-f input:focus, .rt-f select:focus { border-color:#0369A1; }
.rt-search svg { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#9CA3AF; }
.rt-search input { padding-left:32px; width:240px; }
.rt-chk { display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:#374151; padding:8px 4px; cursor:pointer; }
.rt-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:16px; }
.rt-kpi { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; padding:13px 15px; position:relative; overflow:hidden; }
.rt-kpi::before { content:''; position:absolute; inset:0 0 auto 0; height:3px; background:var(--k); }
.rt-kpi-l { font-size:10.5px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:.5px; }
.rt-kpi-v { font-size:22px; font-weight:900; color:#0F1035; margin-top:6px; font-variant-numeric:tabular-nums; letter-spacing:-.5px; }
.rt-kpi-s { font-size:11px; color:#94A3B8; margin-top:3px; }
.rt-tw { background:#fff; border:1.5px solid #ECEDF8; border-radius:16px; overflow:auto; }
.rt-t { width:100%; border-collapse:collapse; font-size:12.5px; }
.rt-t th { position:sticky; top:0; background:#F7F8FC; text-align:left; font-size:10.5px; font-weight:800; color:#64748B; letter-spacing:.4px; text-transform:uppercase; padding:10px 12px; white-space:nowrap; cursor:pointer; user-select:none; z-index:1; }
.rt-t th.n, .rt-t td.n { text-align:right; }
.rt-t td { padding:9px 12px; border-top:1px solid #F4F5FA; color:#374151; white-space:nowrap; font-variant-numeric:tabular-nums; vertical-align:top; }
.rt-t tbody tr.clic { cursor:pointer; }
.rt-t tbody tr:hover { background:#F8F9FF; }
.rt-sub { font-size:10.5px; color:#94A3B8; }
.rt-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:800; padding:3px 9px; border-radius:20px; white-space:nowrap; }
.rt-pag { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; font-size:12px; color:#64748B; border-top:1px solid #F4F5FA; }
.rt-pag button { border:1.5px solid #E2E5F0; background:#fff; border-radius:8px; padding:5px 12px; font-weight:700; cursor:pointer; font-family:inherit; }
.rt-pag button:disabled { opacity:.4; cursor:default; }
.rt-nota { font-size:11.5px; color:#64748B; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:12px; padding:10px 14px; margin-top:14px; line-height:1.5; }
.rt-aviso { font-size:12.5px; color:#92400E; background:#FFFBEB; border:1.5px solid #FDE68A; border-radius:12px; padding:10px 14px; margin-bottom:14px; line-height:1.5; display:flex; gap:10px; align-items:flex-start; }
.rt-ov { position:fixed; inset:0; background:rgba(15,16,53,.45); z-index:1000; display:flex; justify-content:flex-end; }
.rt-dr { width:min(860px,100%); height:100%; background:#F7F8FC; display:flex; flex-direction:column; box-shadow:-10px 0 40px rgba(0,0,0,.2); }
.rt-dh { background:linear-gradient(135deg,#0369A1,#0EA5E9); color:#fff; padding:18px 22px; display:flex; align-items:flex-start; gap:12px; }
.rt-db { flex:1; min-height:0; overflow:auto; padding:18px 22px 30px; }
.rt-x { margin-left:auto; background:rgba(255,255,255,.18); border:none; color:#fff; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
.rt-card { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; padding:14px 16px; margin-bottom:14px; }
.rt-ct { font-size:12px; font-weight:900; color:#0F1035; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
.rt-g4 { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:14px; }
.rt-ver { border-radius:14px; padding:14px 16px; margin-bottom:14px; display:flex; gap:12px; align-items:flex-start; font-size:13.5px; line-height:1.5; }
.rt-mini { width:100%; border-collapse:collapse; font-size:12.5px; }
.rt-mini th { text-align:left; font-size:10.5px; color:#64748B; font-weight:800; text-transform:uppercase; padding:6px 8px; border-bottom:1px solid #ECEDF8; }
.rt-mini td { padding:7px 8px; border-bottom:1px solid #F4F5FA; font-variant-numeric:tabular-nums; }
.rt-mini .n { text-align:right; }
`
