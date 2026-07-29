/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo  : Territorio — Departamentos / Municipios / Zonas              ║
 * ║  Archivo : TerritorioPage.jsx                                           ║
 * ║  Fecha   : 2026-06-30                                                   ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback } from 'react'
import {
  MapPin, Building2, Layers, Plus, Pencil, Trash2,
  Search, X, Loader2, CheckCircle2, XCircle, ChevronRight,
  Globe2, Map, Route, ArrowLeft, Users,
} from 'lucide-react'
import api from '../../services/api.js'
import { useAuthStore } from '../../store/auth.store.js'
import { toast } from '../../store/toast.store.js'

/* ─── Tipos de zona ─── */
const TIPOS = ['BARRIO','VEREDA','CORREGIMIENTO','SECTOR','COMUNA','INSPECCIÓN','URBANIZACIÓN']
const TIPO_COLOR = {
  BARRIO:         { bg:'#EEF2FF', color:'#4338CA' },
  VEREDA:         { bg:'#ECFDF5', color:'#047857' },
  CORREGIMIENTO:  { bg:'#FEF3C7', color:'#B45309' },
  SECTOR:         { bg:'#F0F9FF', color:'#0369A1' },
  COMUNA:         { bg:'#FDF4FF', color:'#7E22CE' },
  'INSPECCIÓN':   { bg:'#FFF7ED', color:'#C2410C' },
  URBANIZACIÓN:   { bg:'#F0FDF4', color:'#15803D' },
}
const tc = t => TIPO_COLOR[t] || { bg:'#F3F4F6', color:'#374151' }

/* ─── CSS ─── */
const CSS = `
  @keyframes fadeSlide { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes modalIn   { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
  @keyframes spin      { to{transform:rotate(360deg)} }

  .terr { display:flex; flex-direction:column; height:100%; overflow:hidden; }

  /* Page header */
  .terr-head {
    padding:20px 28px 16px; background:#fff; border-bottom:1px solid #ECEDF8;
    display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-shrink:0;
  }
  .terr-cat   { font-size:10px; font-weight:800; color:#64748B; letter-spacing:1.8px; text-transform:uppercase; margin-bottom:4px; }
  .terr-title { font-size:24px; font-weight:900; color:#0F1035; line-height:1; }
  .terr-sub   { font-size:12px; color:#9CA3AF; margin-top:4px; }

  /* Stats strip */
  .terr-stats {
    display:flex; gap:12px; padding:16px 28px; background:#FAFBFF;
    border-bottom:1px solid #ECEDF8; flex-shrink:0;
  }
  .stat-pill {
    display:flex; align-items:center; gap:7px;
    background:#fff; border:1px solid #ECEDF8; border-radius:20px;
    padding:5px 14px; font-size:12px; font-weight:700; color:#374151;
    box-shadow:0 1px 3px rgba(0,0,0,.04);
  }
  .stat-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

  /* 3-column layout */
  .terr-cols {
    display:grid; grid-template-columns:260px 260px 1fr;
    gap:0; flex:1; overflow:hidden;
  }

  /* Panel */
  .panel {
    display:flex; flex-direction:column; border-right:1px solid #ECEDF8;
    overflow:hidden; animation:fadeSlide .2s ease;
  }
  .panel:last-child { border-right:none; }
  .panel-head {
    padding:14px 16px 12px; border-bottom:1px solid #ECEDF8;
    background:#fff; flex-shrink:0;
  }
  .panel-title {
    display:flex; align-items:center; gap:8px;
    font-size:13px; font-weight:800; color:#0F1035; margin-bottom:10px;
  }
  .panel-title-icon {
    width:28px; height:28px; border-radius:8px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .panel-search {
    position:relative;
  }
  .panel-search svg { position:absolute; left:9px; top:50%; transform:translateY(-50%); color:#9CA3AF; pointer-events:none; }
  .panel-search input {
    width:100%; padding:7px 9px 7px 30px; border:1.5px solid #E8E9F8;
    border-radius:9px; font-size:12.5px; outline:none; background:#FAFBFF;
    transition:border-color .15s; box-sizing:border-box; font-family:inherit;
  }
  .panel-search input:focus { border-color:#6366F1; }

  .panel-body { flex:1; overflow-y:auto; }
  .panel-body::-webkit-scrollbar { width:3px; }
  .panel-body::-webkit-scrollbar-thumb { background:#DDE1F0; border-radius:3px; }

  /* Add btn panel */
  .panel-add {
    padding:10px 12px; border-top:1px solid #F0F1FA; flex-shrink:0;
  }
  .panel-add-btn {
    width:100%; padding:8px 12px; border:1.5px dashed #C7D2FE; border-radius:10px;
    background:#FAFBFF; color:#6366F1; font-size:12.5px; font-weight:700;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;
    transition:all .15s;
  }
  .panel-add-btn:hover { background:#EEF2FF; border-color:#818CF8; }

  /* List items */
  .list-item {
    display:flex; align-items:center; gap:10px;
    padding:11px 14px; cursor:pointer; transition:all .12s;
    border-bottom:1px solid #F4F5FA; user-select:none;
  }
  .list-item:hover   { background:#F8F9FF; }
  .list-item.active  { background:#EEF2FF; }
  .list-item.active .li-name { color:#4338CA; font-weight:800; }

  .li-avatar {
    width:34px; height:34px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px;
  }
  .li-info    { flex:1; min-width:0; }
  .li-name    { font-size:13px; font-weight:600; color:#1F2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .li-meta    { font-size:11px; color:#9CA3AF; margin-top:1px; }
  .li-chevron { color:#D1D5DB; flex-shrink:0; }
  .list-item.active .li-chevron { color:#6366F1; }

  /* Badge estado */
  .li-badge {
    width:6px; height:6px; border-radius:50%; flex-shrink:0;
  }

  /* Row acciones hover */
  .li-actions { display:none; gap:4px; }
  .list-item:hover .li-actions { display:flex; }
  .li-act-btn {
    width:26px; height:26px; border-radius:7px; border:1px solid transparent;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    transition:all .12s;
  }

  /* Empty */
  .panel-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:8px; padding:40px 20px; color:#D1D5DB;
  }
  .panel-empty p { font-size:12.5px; color:#9CA3AF; font-weight:600; text-align:center; }

  /* Tipo badge */
  .tipo-badge {
    display:inline-flex; align-items:center;
    padding:2px 8px; border-radius:20px; font-size:10px; font-weight:800;
  }

  /* Loading */
  .panel-loading { display:flex; justify-content:center; padding:32px; color:#6366F1; }

  /* ── Zona panel especial ── */
  .zona-filters {
    display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;
  }
  .tipo-filter {
    padding:3px 10px; border-radius:20px; font-size:10.5px; font-weight:700;
    cursor:pointer; border:1.5px solid transparent; transition:all .12s;
  }
  .tipo-filter.on  { border-color:currentColor; }
  .tipo-filter.off { background:#F4F5FA; color:#9CA3AF; border-color:#E8E9F8; }

  /* ── Modal ── */
  .modal-overlay {
    position:fixed; inset:0; background:rgba(15,16,53,.5);
    display:flex; align-items:center; justify-content:center;
    z-index:1000; padding:20px; backdrop-filter:blur(3px);
  }
  .modal-box {
    background:#fff; border-radius:20px; width:100%; max-width:420px;
    box-shadow:0 24px 60px rgba(0,0,0,.2); animation:modalIn .2s ease; overflow:hidden;
  }
  .modal-hdr {
    padding:20px 22px 16px; border-bottom:1px solid #F0F1FA;
    display:flex; align-items:center; gap:10px;
  }
  .modal-hdr-icon {
    width:38px; height:38px; border-radius:11px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .modal-title { font-size:15px; font-weight:800; color:#0F1035; flex:1; }
  .modal-close {
    width:30px; height:30px; border-radius:8px; border:none;
    background:#F4F5FA; color:#6B7280; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
  }
  .modal-close:hover { background:#FEE2E2; color:#EF4444; }
  .modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }
  .modal-ftr  { padding:14px 22px; border-top:1px solid #F0F1FA; display:flex; justify-content:flex-end; gap:10px; }

  .mf label {
    display:block; font-size:10px; font-weight:800; color:#6B7280;
    text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;
  }
  .mf input, .mf select {
    width:100%; padding:9px 12px; border:1.5px solid #E8E9F8; border-radius:10px;
    font-size:13.5px; color:#0F1035; background:#FAFBFF; outline:none;
    transition:border-color .15s; font-family:inherit; box-sizing:border-box;
  }
  .mf input:focus, .mf select:focus { border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
  .mf input:disabled { background:#F4F5FA; color:#9CA3AF; }

  .merror {
    background:#FFF1F2; border:1px solid #FECDD3; border-radius:9px;
    padding:9px 12px; font-size:12.5px; color:#BE123C;
    display:flex; align-items:center; gap:7px;
  }

  .mbtn-p {
    display:inline-flex; align-items:center; gap:6px;
    background:linear-gradient(135deg,#2E3192,#4338CA);
    color:#fff; border:none; border-radius:10px;
    padding:9px 20px; font-size:13px; font-weight:700; cursor:pointer;
    box-shadow:0 3px 10px rgba(46,49,146,.22); transition:opacity .15s;
  }
  .mbtn-p:disabled { opacity:.6; cursor:not-allowed; }
  .mbtn-s {
    display:inline-flex; align-items:center; gap:6px;
    background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0;
    border-radius:10px; padding:9px 16px; font-size:13px; font-weight:600; cursor:pointer;
  }

  /* Confirm danger */
  .del-confirm {
    background:#FFF1F2; border:1px solid #FECDD3; border-radius:12px; padding:16px;
    display:flex; flex-direction:column; gap:12px;
  }
  .del-confirm p { font-size:13.5px; color:#374151; line-height:1.5; margin:0; }

  /* Page-level tabs */
  .terr-page-tabs {
    display: flex;
    gap: 0;
    padding: 0 28px;
    background: #fff;
    border-bottom: 2px solid #ECEDF8;
    flex-shrink: 0;
  }
  .terr-page-tab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 12px 20px;
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 700;
    color: #6B7280;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all .15s;
  }
  .terr-page-tab:hover { color: #4338CA; }
  .terr-page-tab.active {
    color: #4338CA;
    border-bottom-color: #4338CA;
  }

  /* ══════════════════════════════════════
     ZONAS Y RUTAS DE RECAUDO — prefijo zr-
  ══════════════════════════════════════ */
  .zr-section {
    background:#fff;
  }
  .zr-section-head {
    padding:18px 28px 14px; background:#FAFBFF;
    display:flex; align-items:center; justify-content:space-between; gap:12px;
  }
  .zr-section-title {
    display:flex; align-items:center; gap:10px;
    font-size:16px; font-weight:900; color:#0F1035;
  }
  .zr-section-icon {
    width:36px; height:36px; border-radius:10px; background:#EEF2FF;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .zr-tabs {
    display:flex; gap:0; background:#F4F5FA; border-radius:10px; padding:3px;
  }
  .zr-tab {
    padding:6px 18px; border-radius:8px; border:none; background:transparent;
    font-size:12.5px; font-weight:700; color:#6B7280; cursor:pointer; transition:all .15s;
  }
  .zr-tab.active {
    background:#fff; color:#4338CA;
    box-shadow:0 1px 4px rgba(0,0,0,.08);
  }
  .zr-body {
    padding:20px 28px 28px;
  }

  /* Zona cards */
  .zr-grid {
    display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-bottom:16px;
  }
  .zr-card {
    border:1.5px solid #ECEDF8; border-radius:14px; padding:14px 16px;
    cursor:pointer; transition:all .15s; background:#fff;
    display:flex; flex-direction:column; gap:10px;
  }
  .zr-card:hover { border-color:#C7D2FE; box-shadow:0 4px 12px rgba(99,102,241,.1); }
  .zr-card-head {
    display:flex; align-items:flex-start; gap:10px;
  }
  .zr-color-dot {
    width:12px; height:12px; border-radius:50%; flex-shrink:0; margin-top:3px;
  }
  .zr-card-name { font-size:13.5px; font-weight:800; color:#0F1035; flex:1; line-height:1.3; }
  .zr-card-desc { font-size:11.5px; color:#9CA3AF; line-height:1.4; margin:0; }
  .zr-card-meta {
    display:flex; align-items:center; justify-content:space-between;
    font-size:11px; color:#6B7280;
  }
  .zr-card-stats { display:flex; gap:10px; }
  .zr-stat { display:flex; align-items:center; gap:4px; font-weight:700; }
  .zr-card-actions { display:flex; gap:6px; }

  /* Tipo badge recaudo */
  .zr-tipo-badge {
    display:inline-flex; align-items:center;
    padding:2px 9px; border-radius:20px; font-size:10px; font-weight:800;
  }

  /* Add btn */
  .zr-add-btn {
    display:inline-flex; align-items:center; gap:6px;
    background:linear-gradient(135deg,#2E3192,#4338CA);
    color:#fff; border:none; border-radius:10px;
    padding:9px 18px; font-size:13px; font-weight:700; cursor:pointer;
    box-shadow:0 3px 10px rgba(46,49,146,.2); transition:opacity .15s;
  }
  .zr-add-btn:hover { opacity:.88; }
  .zr-add-btn-sec {
    display:inline-flex; align-items:center; gap:6px;
    background:#F4F5FA; color:#374151; border:1.5px solid #E2E5F0;
    border-radius:10px; padding:8px 14px; font-size:12.5px; font-weight:600; cursor:pointer;
  }

  /* Panel de pólizas por ruta */
  .zr-pol-panel {
    background:#F8F9FF; border:1.5px solid #C7D2FE; border-radius:14px;
    padding:16px 18px; margin-bottom:16px; animation:fadeSlide .18s ease;
  }
  .zr-pol-head {
    display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#0F1035;
    margin-bottom:12px;
  }
  .zr-pol-close {
    margin-left:auto; background:none; border:none; cursor:pointer; color:#9CA3AF;
    display:flex; align-items:center; padding:2px;
  }
  .zr-pol-close:hover { color:#EF4444; }
  .zr-pol-search {
    display:flex; align-items:center; gap:7px;
    background:#fff; border:1.5px solid #E8E9F8; border-radius:9px;
    padding:7px 10px; margin-bottom:8px;
  }
  .zr-pol-search input {
    flex:1; border:none; outline:none; font-size:12.5px; background:transparent; font-family:inherit;
  }
  .zr-pol-cands {
    background:#fff; border:1.5px solid #C7D2FE; border-radius:10px;
    overflow:hidden; margin-bottom:10px;
  }
  .zr-pol-cand {
    display:flex; align-items:center; justify-content:space-between; gap:8px;
    padding:9px 12px; cursor:pointer; border-bottom:1px solid #F0F1FA; transition:background .12s;
  }
  .zr-pol-cand:last-child { border-bottom:none; }
  .zr-pol-cand:hover { background:#EEF2FF; }
  .zr-pol-list { display:flex; flex-direction:column; gap:6px; }
  .zr-pol-item {
    display:flex; align-items:center; gap:8px;
    background:#fff; border:1px solid #E8E9F8; border-radius:9px; padding:8px 12px;
  }
  .zr-pol-del {
    background:none; border:1px solid #FECACA; border-radius:6px; cursor:pointer;
    color:#DC2626; padding:3px 5px; display:flex; align-items:center; transition:all .12s;
  }
  .zr-pol-del:hover { background:#FEF2F2; }

  /* Tabs del panel de pólizas */
  .zr-pol-tabs {
    display:flex; gap:0; border-bottom:1.5px solid #E8E9F8; margin-bottom:12px;
  }
  .zr-pol-tab {
    padding:7px 14px; border:none; background:transparent;
    font-size:11.5px; font-weight:700; color:#9CA3AF; cursor:pointer;
    border-bottom:2px solid transparent; margin-bottom:-1.5px; transition:all .15s;
  }
  .zr-pol-tab.active { color:#4338CA; border-bottom-color:#4338CA; }
  .zr-pol-tab:hover { color:#4338CA; }

  /* Meta de sugeridas */
  .zr-sug-meta {
    display:flex; gap:16px; flex-wrap:wrap;
    background:#FAFBFF; border:1px solid #E8E9F8; border-radius:8px;
    padding:8px 12px; font-size:11px; color:#6B7280; margin-bottom:10px;
  }

  /* Inline form panel */
  .zr-form-panel {
    background:#F8F9FF; border:1.5px solid #C7D2FE; border-radius:14px;
    padding:16px 18px; margin-bottom:16px; animation:fadeSlide .18s ease;
  }
  .zr-form-title { font-size:13px; font-weight:800; color:#4338CA; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
  .zr-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .zr-form-grid .span2 { grid-column:1/-1; }
  .zr-field label {
    display:block; font-size:10px; font-weight:800; color:#6B7280;
    text-transform:uppercase; letter-spacing:.9px; margin-bottom:4px;
  }
  .zr-field input, .zr-field select, .zr-field textarea {
    width:100%; padding:8px 11px; border:1.5px solid #E8E9F8; border-radius:9px;
    font-size:13px; color:#0F1035; background:#fff; outline:none;
    transition:border-color .15s; font-family:inherit; box-sizing:border-box;
  }
  .zr-field textarea { min-height:64px; resize:vertical; }
  .zr-field input:focus, .zr-field select:focus, .zr-field textarea:focus { border-color:#6366F1; }
  .zr-form-ftr { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }

  /* Color preview */
  .zr-color-row { display:flex; align-items:center; gap:10px; }
  .zr-color-preview { width:32px; height:32px; border-radius:8px; border:2px solid #E8E9F8; flex-shrink:0; }
  .zr-color-row input[type=color] { width:44px; height:32px; padding:2px; border:1.5px solid #E8E9F8; border-radius:8px; cursor:pointer; background:#fff; }

  /* Rutas */
  .zr-ruta-zona-bar {
    display:flex; align-items:center; gap:10px; margin-bottom:14px;
    padding:10px 14px; background:#EEF2FF; border-radius:10px;
  }
  .zr-ruta-zona-name { font-size:13px; font-weight:800; color:#4338CA; flex:1; }
  .zr-ruta-list { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
  .zr-ruta-item {
    border:1.5px solid #ECEDF8; border-radius:12px; padding:12px 14px;
    display:flex; align-items:center; gap:12px; background:#fff; transition:border-color .12s;
  }
  .zr-ruta-item:hover { border-color:#C7D2FE; }
  .zr-ruta-icon {
    width:36px; height:36px; border-radius:10px; background:#EEF2FF;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .zr-ruta-info { flex:1; min-width:0; }
  .zr-ruta-name { font-size:13px; font-weight:700; color:#0F1035; }
  .zr-ruta-meta { font-size:11px; color:#9CA3AF; margin-top:3px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .zr-dias-chips { display:flex; gap:3px; flex-wrap:wrap; }
  .zr-dia-chip {
    padding:1px 6px; background:#EEF2FF; color:#4338CA;
    border-radius:20px; font-size:10px; font-weight:800;
  }
  .zr-ruta-actions { display:flex; gap:6px; flex-shrink:0; }
  .zr-act-btn {
    width:28px; height:28px; border-radius:8px; border:1.5px solid #E8E9F8;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    background:#fff; color:#6B7280; transition:all .12s;
  }
  .zr-act-btn:hover { background:#EEF2FF; border-color:#C7D2FE; color:#4338CA; }

  /* Dias checkboxes grid */
  .zr-dias-grid {
    display:grid; grid-template-columns:repeat(7,1fr); gap:6px;
  }
  .zr-dia-chk {
    display:flex; flex-direction:column; align-items:center; gap:2px;
    cursor:pointer;
  }
  .zr-dia-chk input { display:none; }
  .zr-dia-lbl {
    width:28px; height:28px; border-radius:7px; border:1.5px solid #E8E9F8;
    display:flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:700; color:#6B7280; cursor:pointer; transition:all .12s;
  }
  .zr-dia-chk input:checked + .zr-dia-lbl {
    background:#EEF2FF; border-color:#818CF8; color:#4338CA;
  }

  /* Empty rutas */
  .zr-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:8px; padding:40px 20px; color:#D1D5DB;
  }
  .zr-empty p { font-size:13px; color:#9CA3AF; font-weight:600; text-align:center; margin:0; }
`

/* ─── Mini Modal genérico ─── */
function Modal({ titulo, icono, iconoBg, onClose, onGuardar, guardando, error, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-hdr">
          <div className="modal-hdr-icon" style={{ background:iconoBg }}>{icono}</div>
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={onClose}><X size={14}/></button>
        </div>
        <div className="modal-body">
          {children}
          {error && <div className="merror"><XCircle size={14}/>{error}</div>}
        </div>
        <div className="modal-ftr">
          <button className="mbtn-s" onClick={onClose}>Cancelar</button>
          <button className="mbtn-p" onClick={onGuardar} disabled={guardando}>
            {guardando ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal confirmar eliminar ─── */
function ModalEliminar({ texto, onClose, onConfirm, guardando }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:360}}>
        <div className="modal-hdr">
          <div className="modal-hdr-icon" style={{background:'#FEF2F2'}}><Trash2 size={18} color="#EF4444"/></div>
          <div className="modal-title">Confirmar eliminación</div>
          <button className="modal-close" onClick={onClose}><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="del-confirm">
            <p>{texto}</p>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="mbtn-s" onClick={onClose}>Cancelar</button>
              <button onClick={onConfirm} disabled={guardando}
                style={{display:'inline-flex',alignItems:'center',gap:6,background:'#EF4444',color:'#fff',border:'none',borderRadius:10,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                {guardando ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> : <><Trash2 size={13}/>Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   PANEL 1 — DEPARTAMENTOS
═══════════════════════════════════════════ */
function PanelDepartamentos({ selId, onSel }) {
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin','administrador'].includes(usuario?.rol)
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')
  const [modal,   setModal]   = useState(null) // { tipo:'edit', item }
  const [form,    setForm]    = useState({ nombre:'', activo:true })
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/territorio?activo=true')
      setItems(r.data.data)
    } catch{}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = items.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase()))

  const guardar = async () => {
    setSaving(true); setErr('')
    try {
      await api.put(`/territorio/${modal.item.id}`, { nombre: form.nombre })
      toast.success('Departamento actualizado')
      setModal(null); cargar()
    } catch(e) { setErr(e.response?.data?.error || 'Error'); toast.error(e.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <div className="panel-title-icon" style={{background:'#EEF2FF'}}>
            <Globe2 size={15} color="#4338CA"/>
          </div>
          Departamentos
        </div>
        <div className="panel-search">
          <Search size={13}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..."/>
        </div>
      </div>

      <div className="panel-body">
        {loading ? (
          <div className="panel-loading"><Loader2 size={22} style={{animation:'spin 1s linear infinite'}}/></div>
        ) : filtrados.length === 0 ? (
          <div className="panel-empty"><Map size={32}/><p>Sin resultados</p></div>
        ) : filtrados.map(item => (
          <div key={item.id}
            className={`list-item${selId===item.id?' active':''}`}
            onClick={() => onSel(item)}
          >
            <div className="li-avatar" style={{background:'#EEF2FF',color:'#4338CA'}}>
              {item.nombre.charAt(0)}
            </div>
            <div className="li-info">
              <div className="li-name">{item.nombre}</div>
              <div className="li-meta">{item.total_municipios} municipios</div>
            </div>
            {esAdmin && (
              <div className="li-actions">
                <button className="li-act-btn"
                  style={{background:'#EEF2FF',color:'#4338CA',border:'1px solid #C7D2FE'}}
                  title="Editar"
                  onClick={e=>{e.stopPropagation();setForm({nombre:item.nombre});setModal({tipo:'edit',item})}}
                >
                  <Pencil size={11}/>
                </button>
              </div>
            )}
            <ChevronRight size={13} className="li-chevron"/>
          </div>
        ))}
      </div>

      {modal?.tipo==='edit' && (
        <Modal titulo={`Editar: ${modal.item.nombre}`}
          icono={<Globe2 size={18} color="#4338CA"/>} iconoBg="#EEF2FF"
          onClose={()=>{setModal(null);setErr('')}}
          onGuardar={guardar} guardando={saving} error={err}
        >
          <div className="mf">
            <label>Nombre del departamento</label>
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   PANEL 2 — MUNICIPIOS
═══════════════════════════════════════════ */
function PanelMunicipios({ departamento, selId, onSel }) {
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin','administrador'].includes(usuario?.rol)
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [q,       setQ]       = useState('')
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({ id:'', nombre:'' })
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const cargar = useCallback(async () => {
    if (!departamento) { setItems([]); return }
    setLoading(true)
    try {
      const r = await api.get(`/territorio/municipios?departamento_id=${departamento.id}`)
      setItems(r.data.data)
    } catch{}
    finally { setLoading(false) }
  }, [departamento])

  useEffect(() => { setQ(''); cargar() }, [cargar])

  const filtrados = items.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase()))

  const guardar = async () => {
    setSaving(true); setErr('')
    try {
      if (modal.tipo === 'create') {
        await api.post('/territorio/municipios', {
          id: form.id, departamento_id: departamento.id, nombre: form.nombre,
        })
        toast.success('Municipio creado')
      } else {
        await api.put(`/territorio/municipios/${modal.item.id}`, { nombre: form.nombre })
        toast.success('Municipio actualizado')
      }
      setModal(null); cargar()
    } catch(e) { setErr(e.response?.data?.error || 'Error'); toast.error(e.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const eliminar = async () => {
    setSaving(true)
    try { await api.delete(`/territorio/municipios/${modal.item.id}`); toast.success('Municipio eliminado'); setModal(null); cargar() }
    catch(e) { setErr(e.response?.data?.error || 'No se puede eliminar'); toast.error(e.response?.data?.error || 'No se puede eliminar') }
    finally { setSaving(false) }
  }

  if (!departamento) return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <div className="panel-title-icon" style={{background:'#F0FDF4'}}>
            <Building2 size={15} color="#047857"/>
          </div>
          Municipios
        </div>
      </div>
      <div className="panel-empty" style={{paddingTop:60}}>
        <Building2 size={36}/>
        <p>Selecciona un departamento</p>
      </div>
    </div>
  )

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <div className="panel-title-icon" style={{background:'#F0FDF4'}}>
            <Building2 size={15} color="#047857"/>
          </div>
          {departamento.nombre}
        </div>
        <div className="panel-search">
          <Search size={13}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar municipio..."/>
        </div>
      </div>

      <div className="panel-body">
        {loading ? (
          <div className="panel-loading"><Loader2 size={22} style={{animation:'spin 1s linear infinite'}}/></div>
        ) : filtrados.length === 0 ? (
          <div className="panel-empty"><Building2 size={32}/><p>Sin municipios</p></div>
        ) : filtrados.map(item => (
          <div key={item.id}
            className={`list-item${selId===item.id?' active':''}`}
            onClick={() => onSel(item)}
          >
            <div className="li-avatar" style={{background:'#F0FDF4',color:'#047857'}}>
              {item.nombre.charAt(0)}
            </div>
            <div className="li-info">
              <div className="li-name">{item.nombre}</div>
              <div className="li-meta">DANE: {item.id} · {item.total_zonas} zonas</div>
            </div>
            {esAdmin && (
              <div className="li-actions">
                <button className="li-act-btn"
                  style={{background:'#F0FDF4',color:'#047857',border:'1px solid #A7F3D0'}}
                  title="Editar"
                  onClick={e=>{e.stopPropagation();setForm({nombre:item.nombre});setModal({tipo:'edit',item})}}
                >
                  <Pencil size={11}/>
                </button>
                <button className="li-act-btn"
                  style={{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA'}}
                  title="Eliminar"
                  onClick={e=>{e.stopPropagation();setErr('');setModal({tipo:'delete',item})}}
                >
                  <Trash2 size={11}/>
                </button>
              </div>
            )}
            <ChevronRight size={13} className="li-chevron"/>
          </div>
        ))}
      </div>

      {esAdmin && (
        <div className="panel-add">
          <button className="panel-add-btn"
            onClick={()=>{setForm({id:'',nombre:''});setErr('');setModal({tipo:'create'})}}
          >
            <Plus size={14}/> Nuevo municipio
          </button>
        </div>
      )}

      {modal?.tipo==='create' && (
        <Modal titulo="Nuevo municipio"
          icono={<Building2 size={18} color="#047857"/>} iconoBg="#F0FDF4"
          onClose={()=>{setModal(null);setErr('')}}
          onGuardar={guardar} guardando={saving} error={err}
        >
          <div className="mf">
            <label>Código DANE (5 dígitos)</label>
            <input value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} placeholder="54001" maxLength={5}/>
          </div>
          <div className="mf">
            <label>Nombre del municipio</label>
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre"/>
          </div>
        </Modal>
      )}
      {modal?.tipo==='edit' && (
        <Modal titulo={`Editar: ${modal.item.nombre}`}
          icono={<Building2 size={18} color="#047857"/>} iconoBg="#F0FDF4"
          onClose={()=>{setModal(null);setErr('')}}
          onGuardar={guardar} guardando={saving} error={err}
        >
          <div className="mf">
            <label>Código DANE</label>
            <input value={modal.item.id} disabled/>
          </div>
          <div className="mf">
            <label>Nombre</label>
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/>
          </div>
        </Modal>
      )}
      {modal?.tipo==='delete' && (
        <ModalEliminar
          texto={`¿Eliminar el municipio "${modal.item.nombre}"? Se eliminarán también todas las zonas asociadas.`}
          onClose={()=>setModal(null)} onConfirm={eliminar} guardando={saving}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   PANEL 3 — ZONAS (barrios/veredas/etc.)
═══════════════════════════════════════════ */
function PanelZonas({ municipio }) {
  const { usuario } = useAuthStore()
  const esAdmin = ['superadmin','administrador'].includes(usuario?.rol)
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(false)
  const [q,        setQ]        = useState('')
  const [tipoFilt, setTipoFilt] = useState('')
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState({ nombre:'', tipo:'BARRIO' })
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  const cargar = useCallback(async () => {
    if (!municipio) { setItems([]); return }
    setLoading(true)
    try {
      const r = await api.get(`/territorio/zonas?municipio_id=${municipio.id}`)
      setItems(r.data.data)
    } catch{}
    finally { setLoading(false) }
  }, [municipio])

  useEffect(() => { setQ(''); setTipoFilt(''); cargar() }, [cargar])

  const filtrados = items.filter(i =>
    i.nombre.toLowerCase().includes(q.toLowerCase()) &&
    (tipoFilt ? i.tipo === tipoFilt : true)
  )

  const tiposPresentes = [...new Set(items.map(i=>i.tipo))]

  const guardar = async () => {
    setSaving(true); setErr('')
    try {
      if (modal.tipo === 'create') {
        await api.post('/territorio/zonas', { municipio_id: municipio.id, nombre: form.nombre, tipo: form.tipo })
        toast.success('Zona creada')
      } else if (modal.tipo === 'edit') {
        await api.put(`/territorio/zonas/${modal.item.id}`, { nombre: form.nombre, tipo: form.tipo })
        toast.success('Zona actualizada')
      }
      setModal(null); cargar()
    } catch(e) { setErr(e.response?.data?.error || 'Error'); toast.error(e.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const toggleActivo = async item => {
    try { await api.put(`/territorio/zonas/${item.id}`, { activo: !item.activo }); toast.success(item.activo ? 'Zona desactivada' : 'Zona activada'); cargar() } catch(e){ toast.error(e.response?.data?.error || 'Error') }
  }

  const eliminar = async () => {
    setSaving(true)
    try { await api.delete(`/territorio/zonas/${modal.item.id}`); toast.success('Zona eliminada'); setModal(null); cargar() }
    catch(e) { setErr(e.response?.data?.error || 'Error al eliminar'); toast.error(e.response?.data?.error || 'Error al eliminar') }
    finally { setSaving(false) }
  }

  if (!municipio) return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <div className="panel-title-icon" style={{background:'#F5F3FF'}}>
            <Layers size={15} color="#6D28D9"/>
          </div>
          Zonas / Barrios / Veredas
        </div>
      </div>
      <div className="panel-empty" style={{paddingTop:60}}>
        <Layers size={36}/>
        <p>Selecciona un municipio</p>
      </div>
    </div>
  )

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <div className="panel-title-icon" style={{background:'#F5F3FF'}}>
            <Layers size={15} color="#6D28D9"/>
          </div>
          {municipio.nombre}
          <span style={{fontSize:11,color:'#9CA3AF',fontWeight:500,marginLeft:4}}>
            ({items.length} zonas)
          </span>
        </div>
        <div className="panel-search">
          <Search size={13}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar zona..."/>
        </div>
        {tiposPresentes.length > 1 && (
          <div className="zona-filters" style={{marginTop:8}}>
            <button
              className={`tipo-filter ${!tipoFilt?'on':'off'}`}
              style={!tipoFilt?{background:'#F5F3FF',color:'#6D28D9',borderColor:'#C4B5FD'}:{}}
              onClick={()=>setTipoFilt('')}
            >Todos</button>
            {tiposPresentes.map(t=>(
              <button key={t}
                className={`tipo-filter ${tipoFilt===t?'on':'off'}`}
                style={tipoFilt===t?{background:tc(t).bg,color:tc(t).color,borderColor:tc(t).color}:{}}
                onClick={()=>setTipoFilt(f=>f===t?'':t)}
              >{t}</button>
            ))}
          </div>
        )}
      </div>

      <div className="panel-body">
        {loading ? (
          <div className="panel-loading"><Loader2 size={22} style={{animation:'spin 1s linear infinite'}}/></div>
        ) : filtrados.length === 0 ? (
          <div className="panel-empty"><Layers size={32}/><p>Sin zonas registradas</p></div>
        ) : filtrados.map(item => (
          <div key={item.id} className="list-item" style={!item.activo?{opacity:.5}:{}}>
            <div className="li-avatar" style={{background:tc(item.tipo).bg,color:tc(item.tipo).color}}>
              {item.nombre.charAt(0)}
            </div>
            <div className="li-info">
              <div className="li-name">{item.nombre}</div>
              <div className="li-meta">
                <span className="tipo-badge" style={{background:tc(item.tipo).bg,color:tc(item.tipo).color}}>
                  {item.tipo}
                </span>
                {' '}·{' '}
                <span style={{color: item.activo?'#10B981':'#DC2626'}}>
                  {item.activo?'Activa':'Inactiva'}
                </span>
              </div>
            </div>
            {esAdmin && (
              <div className="li-actions">
                <button className="li-act-btn"
                  style={{background:'#EEF2FF',color:'#4338CA',border:'1px solid #C7D2FE'}}
                  title="Editar"
                  onClick={e=>{e.stopPropagation();setForm({nombre:item.nombre,tipo:item.tipo});setErr('');setModal({tipo:'edit',item})}}
                >
                  <Pencil size={11}/>
                </button>
                <button className="li-act-btn"
                  title={item.activo?'Desactivar':'Activar'}
                  style={item.activo
                    ?{background:'#FEF3C7',color:'#B45309',border:'1px solid #FDE68A'}
                    :{background:'#ECFDF5',color:'#047857',border:'1px solid #A7F3D0'}
                  }
                  onClick={e=>{e.stopPropagation();toggleActivo(item)}}
                >
                  {item.activo?<XCircle size={11}/>:<CheckCircle2 size={11}/>}
                </button>
                <button className="li-act-btn"
                  style={{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA'}}
                  title="Eliminar"
                  onClick={e=>{e.stopPropagation();setErr('');setModal({tipo:'delete',item})}}
                >
                  <Trash2 size={11}/>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {esAdmin && (
        <div className="panel-add">
          <button className="panel-add-btn"
            onClick={()=>{setForm({nombre:'',tipo:'BARRIO'});setErr('');setModal({tipo:'create'})}}
          >
            <Plus size={14}/> Nueva zona / barrio / vereda
          </button>
        </div>
      )}

      {(modal?.tipo==='create'||modal?.tipo==='edit') && (
        <Modal
          titulo={modal.tipo==='create'?'Nueva zona':'Editar zona'}
          icono={<Layers size={18} color="#6D28D9"/>} iconoBg="#F5F3FF"
          onClose={()=>{setModal(null);setErr('')}}
          onGuardar={guardar} guardando={saving} error={err}
        >
          <div className="mf">
            <label>Tipo</label>
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
              {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mf">
            <label>Nombre</label>
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}
              placeholder={form.tipo==='BARRIO'?'Ej: La Victoria':form.tipo==='VEREDA'?'Ej: El Palmar':'Nombre'}/>
          </div>
        </Modal>
      )}
      {modal?.tipo==='delete' && (
        <ModalEliminar
          texto={`¿Eliminar la zona "${modal.item.nombre}" (${modal.item.tipo})?`}
          onClose={()=>setModal(null)} onConfirm={eliminar} guardando={saving}
        />
      )}
    </div>
  )
}

/* ─── Helpers badge tipo recaudo ─── */
const ZR_TIPO_STYLE = {
  URBANA: { bg:'#DBEAFE', color:'#1D4ED8' },
  RURAL:  { bg:'#D1FAE5', color:'#065F46' },
  MIXTA:  { bg:'#FEF3C7', color:'#92400E' },
}
const zrTc = t => ZR_TIPO_STYLE[t] || { bg:'#F3F4F6', color:'#374151' }

/* ════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════ */
export default function TerritorioPage() {
  const { usuario } = useAuthStore()
  const esAdminSede = ['superadmin', 'administrador'].includes(usuario?.rol)
  const [sedesDisponibles, setSedesDisponibles] = useState([])

  const [selDept, setSelDept] = useState(null)
  const [selMpio, setSelMpio] = useState(null)
  const [stats,   setStats]   = useState({ depts:0, mpios:0, zonas:0 })

  const [paginaTab,     setPaginaTab]     = useState('division') // 'division' | 'recaudo'

  /* ── Recaudo states ── */
  const [seccionTab,    setSeccionTab]    = useState('zonas')
  const [zonas,         setZonas]         = useState([])
  const [zonaSel,       setZonaSel]       = useState(null)
  const [rutas,         setRutas]         = useState([])
  const [recaudadores,  setRecaudadores]  = useState([])
  const [loadingZonas,  setLoadingZonas]  = useState(false)
  const [loadingRutas,  setLoadingRutas]  = useState(false)
  const [showFormZona,  setShowFormZona]  = useState(false)
  const [showFormRuta,  setShowFormRuta]  = useState(false)
  const [editZona,      setEditZona]      = useState(null)
  const [editRuta,      setEditRuta]      = useState(null)
  const [fZona,         setFZona]         = useState({ nombre:'', descripcion:'', tipo:'URBANA', color:'#6366F1', sede_id:'' })
  const [fRuta,         setFRuta]         = useState({ nombre:'', descripcion:'', dias_mes:[], recaudador_id:'' })
  const [savingZona,    setSavingZona]    = useState(false)
  const [savingRuta,    setSavingRuta]    = useState(false)
  const [errZona,       setErrZona]       = useState('')
  const [errRuta,       setErrRuta]       = useState('')
  // Panel de pólizas por ruta
  const [rutaPolizas,   setRutaPolizas]   = useState(null)   // ruta seleccionada para gestionar
  const [polizasRuta,   setPolizasRuta]   = useState([])
  const [loadingPol,    setLoadingPol]    = useState(false)
  const [busqPol,       setBusqPol]       = useState('')
  const [candsPol,      setCandsPol]      = useState([])
  const [buscandoPol,   setBuscandoPol]   = useState(false)
  const [panelPolTab,   setPanelPolTab]   = useState('asignadas') // 'asignadas' | 'sugeridas' | 'buscar'
  const [sugeridas,     setSugeridas]     = useState([])
  const [metaSuger,     setMetaSuger]     = useState(null)
  const [loadingSug,    setLoadingSug]    = useState(false)
  const [asignandoTodas,setAsignandoTodas] = useState(false)
  const [selSugeridas,  setSelSugeridas]  = useState(new Set())

  useEffect(() => {
    Promise.all([
      api.get('/territorio'),
      api.get('/territorio/municipios'),
      api.get('/territorio/zonas'),
    ]).then(([d,m,z]) => setStats({
      depts: d.data.meta.total,
      mpios: m.data.meta.total,
      zonas: z.data.meta.total,
    })).catch(()=>{})

    cargarZonas()
    cargarRecaudadores()
    if (esAdminSede) api.get('/usuarios/sedes').then(r => setSedesDisponibles(r.data?.data || [])).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cargarZonas = async () => {
    setLoadingZonas(true)
    try { const r = await api.get('/zonas-recaudo'); setZonas(r.data.data) } catch{}
    finally { setLoadingZonas(false) }
  }

  const cargarRutas = async (zonaId) => {
    setLoadingRutas(true)
    try { const r = await api.get(`/zonas-recaudo/${zonaId}/rutas`); setRutas(r.data.data) } catch{}
    finally { setLoadingRutas(false) }
  }

  const cargarRecaudadores = async () => {
    try { const r = await api.get('/zonas-recaudo/recaudadores'); setRecaudadores(r.data.data) } catch{}
  }

  const selZona = (z) => {
    setZonaSel(z)
    setSeccionTab('rutas')
    cargarRutas(z.id)
  }

  const abrirFormZona = (z = null) => {
    setEditZona(z)
    setFZona(z
      ? { nombre: z.nombre, descripcion: z.descripcion || '', tipo: z.tipo, color: z.color || '#6366F1', sede_id: z.sede_id || '' }
      : { nombre:'', descripcion:'', tipo:'URBANA', color:'#6366F1', sede_id: usuario?.sede_id || '' }
    )
    setErrZona('')
    setShowFormZona(true)
  }

  const guardarZona = async () => {
    if (!fZona.nombre.trim()) { setErrZona('El nombre es requerido'); return }
    if (esAdminSede && !fZona.sede_id) { setErrZona('Selecciona a qué sede pertenece esta zona'); return }
    setSavingZona(true); setErrZona('')
    try {
      if (editZona) {
        await api.put(`/zonas-recaudo/${editZona.id}`, { ...fZona, activa: editZona.activa })
        toast.success('Zona de recaudo actualizada')
      } else {
        await api.post('/zonas-recaudo', fZona)
        toast.success('Zona de recaudo creada')
      }
      setShowFormZona(false); setEditZona(null)
      await cargarZonas()
    } catch(e) { setErrZona(e.response?.data?.error || 'Error al guardar'); toast.error(e.response?.data?.error || 'Error al guardar') }
    finally { setSavingZona(false) }
  }

  const abrirFormRuta = (r = null) => {
    setEditRuta(r)
    setFRuta(r
      ? { nombre: r.nombre, descripcion: r.descripcion || '', dias_mes: r.dias_mes || [], recaudador_id: r.recaudador_id || '' }
      : { nombre:'', descripcion:'', dias_mes:[], recaudador_id:'' }
    )
    setErrRuta('')
    setShowFormRuta(true)
  }

  const guardarRuta = async () => {
    if (!fRuta.nombre.trim()) { setErrRuta('El nombre es requerido'); return }
    setSavingRuta(true); setErrRuta('')
    try {
      if (editRuta) {
        await api.put(`/zonas-recaudo/rutas/${editRuta.id}`, { ...fRuta, activa: editRuta.activa })
        toast.success('Ruta actualizada')
      } else {
        await api.post(`/zonas-recaudo/${zonaSel.id}/rutas`, fRuta)
        toast.success('Ruta creada')
      }
      setShowFormRuta(false); setEditRuta(null)
      await cargarRutas(zonaSel.id)
    } catch(e) { setErrRuta(e.response?.data?.error || 'Error al guardar'); toast.error(e.response?.data?.error || 'Error al guardar') }
    finally { setSavingRuta(false) }
  }

  const toggleDia = (dia) => {
    setFRuta(f => ({
      ...f,
      dias_mes: f.dias_mes.includes(dia)
        ? f.dias_mes.filter(d => d !== dia)
        : [...f.dias_mes, dia].sort((a,b) => a-b),
    }))
  }

  // ── Gestión de pólizas por ruta ──
  const abrirPanelPolizas = async (ruta) => {
    setRutaPolizas(ruta)
    setShowFormRuta(false)
    setBusqPol('')
    setCandsPol([])
    setPanelPolTab('asignadas')
    setSugeridas([])
    setMetaSuger(null)
    setLoadingPol(true)
    try {
      const [polQ, sugQ] = await Promise.all([
        api.get(`/zonas-recaudo/rutas/${ruta.id}/polizas`),
        api.get(`/zonas-recaudo/rutas/${ruta.id}/sugeridas`)
      ])
      setPolizasRuta(polQ.data.data)
      setSugeridas(sugQ.data.data)
      setMetaSuger(sugQ.data.meta)
      setSelSugeridas(new Set(sugQ.data.data.map(p => p.id)))
    } finally {
      setLoadingPol(false)
    }
  }

  const cargarSugeridas = async (rutaId) => {
    setLoadingSug(true)
    try {
      const r = await api.get(`/zonas-recaudo/rutas/${rutaId}/sugeridas`)
      setSugeridas(r.data.data)
      setMetaSuger(r.data.meta)
      setSelSugeridas(new Set(r.data.data.map(p => p.id)))
    } finally {
      setLoadingSug(false)
    }
  }

  const asignarSeleccionadas = async () => {
    if (!selSugeridas.size) return
    setAsignandoTodas(true)
    try {
      await api.post(`/zonas-recaudo/rutas/${rutaPolizas.id}/sugeridas/asignar-todas`, {
        poliza_ids: [...selSugeridas]
      })
      const [polQ, sugQ] = await Promise.all([
        api.get(`/zonas-recaudo/rutas/${rutaPolizas.id}/polizas`),
        api.get(`/zonas-recaudo/rutas/${rutaPolizas.id}/sugeridas`)
      ])
      setPolizasRuta(polQ.data.data)
      setSugeridas(sugQ.data.data)
      setMetaSuger(sugQ.data.meta)
      setSelSugeridas(new Set(sugQ.data.data.map(p => p.id)))
      cargarRutas(zonaSel.id)
      setPanelPolTab('asignadas')
      toast.success('Pólizas asignadas a la ruta')
    } finally {
      setAsignandoTodas(false)
    }
  }

  const buscarPolizas = async (q) => {
    setBusqPol(q)
    if (q.length < 2) { setCandsPol([]); return }
    setBuscandoPol(true)
    try {
      const r = await api.get(`/polizas?q=${encodeURIComponent(q)}&limit=10`)
      // Filtrar las que ya están asignadas
      const asignadas = new Set(polizasRuta.map(p => p.id || p.poliza_id))
      setCandsPol((r.data.data || []).filter(p => !asignadas.has(p.id)))
    } finally {
      setBuscandoPol(false)
    }
  }

  const asignarPoliza = async (polizaId) => {
    await api.post(`/zonas-recaudo/rutas/${rutaPolizas.id}/polizas`, { poliza_id: polizaId })
    setBusqPol('')
    setCandsPol([])
    const r = await api.get(`/zonas-recaudo/rutas/${rutaPolizas.id}/polizas`)
    setPolizasRuta(r.data.data)
    cargarRutas(zonaSel.id)
    toast.success('Póliza asignada a la ruta')
  }

  const quitarPolizaRuta = async (polizaId) => {
    await api.delete(`/zonas-recaudo/rutas/${rutaPolizas.id}/polizas/${polizaId}`)
    setPolizasRuta(p => p.filter(x => (x.id || x.poliza_id) !== polizaId))
    cargarRutas(zonaSel.id)
    toast.success('Póliza retirada de la ruta')
  }

  const onSelDept = dept => {
    setSelDept(d => d?.id===dept.id ? null : dept)
    setSelMpio(null)
  }
  const onSelMpio = mpio => {
    setSelMpio(m => m?.id===mpio.id ? null : mpio)
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="terr">

        {/* Header */}
        <div className="terr-head">
          <div>
            <div className="terr-cat">CONFIGURACIÓN · PARÁMETROS</div>
            <div className="terr-title">División Político-Administrativa</div>
            <div className="terr-sub">Colombia — Departamentos, municipios, barrios, veredas y zonas</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{fontSize:12,color:'#9CA3AF',textAlign:'right'}}>
              <div style={{fontWeight:700,color:'#374151'}}>🇨🇴 Colombia</div>
              <div>Datos DANE oficiales</div>
            </div>
          </div>
        </div>

        {/* Tabs de página */}
        <div className="terr-page-tabs">
          <button
            className={`terr-page-tab ${paginaTab==='division' ? 'active' : ''}`}
            onClick={() => setPaginaTab('division')}
          >
            <Globe2 size={15}/>
            División Política
          </button>
          <button
            className={`terr-page-tab ${paginaTab==='recaudo' ? 'active' : ''}`}
            onClick={() => setPaginaTab('recaudo')}
          >
            <Route size={15}/>
            Gestión de Recaudo
          </button>
        </div>

        {/* ══ TAB: División Política ══ */}
        {paginaTab === 'division' && (
          <>
            {/* Stats */}
            <div className="terr-stats">
              <div className="stat-pill">
                <div className="stat-dot" style={{background:'#6366F1'}}/>
                <Globe2 size={13} color="#6366F1"/>
                <strong>{stats.depts}</strong> Departamentos
              </div>
              <div className="stat-pill">
                <div className="stat-dot" style={{background:'#10B981'}}/>
                <Building2 size={13} color="#10B981"/>
                <strong>{stats.mpios}</strong> Municipios
              </div>
              <div className="stat-pill">
                <div className="stat-dot" style={{background:'#8B5CF6'}}/>
                <Layers size={13} color="#8B5CF6"/>
                <strong>{stats.zonas}</strong> Zonas registradas
              </div>
              {selDept && (
                <div className="stat-pill" style={{background:'#EEF2FF',borderColor:'#C7D2FE'}}>
                  <MapPin size={13} color="#4338CA"/>
                  <span style={{color:'#4338CA',fontWeight:700}}>{selDept.nombre}</span>
                  {selMpio && <><ChevronRight size={12} color="#9CA3AF"/><span style={{color:'#4338CA',fontWeight:700}}>{selMpio.nombre}</span></>}
                </div>
              )}
            </div>

            {/* 3 paneles */}
            <div className="terr-cols" style={{flex:1,overflow:'hidden',display:'grid'}}>
              <PanelDepartamentos selId={selDept?.id} onSel={onSelDept}/>
              <PanelMunicipios departamento={selDept} selId={selMpio?.id} onSel={onSelMpio}/>
              <PanelZonas municipio={selMpio}/>
            </div>
          </>
        )}

        {/* ══ TAB: Gestión de Recaudo ══ */}
        {paginaTab === 'recaudo' && (
        <div style={{flex:1, overflowY:'auto'}}>
          {/* Cabecera de sección */}
          <div className="zr-section-head">
            <div className="zr-section-title">
              <div className="zr-section-icon">
                <Route size={18} color="#4338CA"/>
              </div>
              Gestión de Recaudo
              <span style={{fontSize:12,color:'#9CA3AF',fontWeight:500}}>
                — Zonas y rutas de cobranza
              </span>
            </div>
            <div className="zr-tabs">
              <button
                className={`zr-tab${seccionTab==='zonas'?' active':''}`}
                onClick={()=>setSeccionTab('zonas')}
              >
                Zonas ({zonas.length})
              </button>
              <button
                className={`zr-tab${seccionTab==='rutas'?' active':''}`}
                onClick={()=>setSeccionTab('rutas')}
              >
                Rutas{zonaSel ? ` — ${zonaSel.nombre}` : ''}
              </button>
            </div>
          </div>

          {/* ── TAB ZONAS ── */}
          {seccionTab === 'zonas' && (
            <div className="zr-body">
              {/* Form inline nueva/editar zona */}
              {showFormZona && (
                <div className="zr-form-panel">
                  <div className="zr-form-title">
                    <Route size={14}/>
                    {editZona ? `Editar zona: ${editZona.nombre}` : 'Nueva zona de recaudo'}
                  </div>
                  <div className="zr-form-grid">
                    <div className="zr-field span2">
                      <label>Nombre *</label>
                      <input
                        value={fZona.nombre}
                        onChange={e=>setFZona(f=>({...f,nombre:e.target.value}))}
                        placeholder="Ej: Zona Urbana Centro"
                      />
                    </div>
                    <div className="zr-field span2">
                      <label>Descripción</label>
                      <textarea
                        value={fZona.descripcion}
                        onChange={e=>setFZona(f=>({...f,descripcion:e.target.value}))}
                        placeholder="Descripción opcional de la zona..."
                      />
                    </div>
                    <div className="zr-field">
                      <label>Tipo</label>
                      <select value={fZona.tipo} onChange={e=>setFZona(f=>({...f,tipo:e.target.value}))}>
                        <option value="URBANA">URBANA</option>
                        <option value="RURAL">RURAL</option>
                        <option value="MIXTA">MIXTA</option>
                      </select>
                    </div>
                    {esAdminSede && (
                      <div className="zr-field">
                        <label>Sede *</label>
                        <select value={fZona.sede_id} onChange={e=>setFZona(f=>({...f,sede_id:e.target.value}))}>
                          <option value="">Selecciona una sede…</option>
                          {sedesDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                        <span style={{fontSize:11,color:'#9CA3AF'}}>
                          Solo la verán los usuarios de esta sede.
                        </span>
                      </div>
                    )}
                    <div className="zr-field">
                      <label>Color identificador</label>
                      <div className="zr-color-row">
                        <input
                          type="color"
                          value={fZona.color}
                          onChange={e=>setFZona(f=>({...f,color:e.target.value}))}
                        />
                        <div className="zr-color-preview" style={{background:fZona.color}}/>
                        <span style={{fontSize:12,color:'#6B7280',fontWeight:600}}>{fZona.color}</span>
                      </div>
                    </div>
                  </div>
                  {errZona && (
                    <div style={{marginTop:10,padding:'8px 12px',background:'#FFF1F2',border:'1px solid #FECDD3',borderRadius:8,fontSize:12.5,color:'#BE123C',display:'flex',alignItems:'center',gap:6}}>
                      <XCircle size={13}/>{errZona}
                    </div>
                  )}
                  <div className="zr-form-ftr">
                    <button className="zr-add-btn-sec" onClick={()=>{setShowFormZona(false);setEditZona(null)}}>
                      Cancelar
                    </button>
                    <button className="zr-add-btn" onClick={guardarZona} disabled={savingZona}>
                      {savingZona ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> : <><CheckCircle2 size={13}/>Guardar zona</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Grid de zonas */}
              {loadingZonas ? (
                <div style={{display:'flex',justifyContent:'center',padding:32,color:'#6366F1'}}>
                  <Loader2 size={24} style={{animation:'spin 1s linear infinite'}}/>
                </div>
              ) : zonas.length === 0 ? (
                <div className="zr-empty">
                  <Route size={36}/>
                  <p>No hay zonas de recaudo registradas.<br/>Crea la primera zona.</p>
                </div>
              ) : (
                <div className="zr-grid">
                  {zonas.map(z => (
                    <div key={z.id} className="zr-card" onClick={()=>selZona(z)} style={!z.activa?{opacity:.55}:{}}>
                      <div className="zr-card-head">
                        <div className="zr-color-dot" style={{background:z.color || '#6366F1'}}/>
                        <div className="zr-card-name">{z.nombre}</div>
                      </div>
                      {z.descripcion && <p className="zr-card-desc">{z.descripcion}</p>}
                      <div className="zr-card-meta">
                        <span className="zr-tipo-badge" style={{background:zrTc(z.tipo).bg,color:zrTc(z.tipo).color}}>
                          {z.tipo}
                        </span>
                        {z.sede_nombre && (
                          <span className="zr-tipo-badge" style={{background:'#EEF2FF',color:'#4338CA'}}>
                            {z.sede_nombre}
                          </span>
                        )}
                        <div className="zr-card-stats">
                          <span className="zr-stat"><Route size={11}/>{z.total_rutas} rutas</span>
                          <span className="zr-stat" style={{color:'#6366F1'}}>{z.total_polizas} pólizas</span>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'flex-end',gap:6}} onClick={e=>e.stopPropagation()}>
                        <button className="zr-act-btn" title="Editar zona" onClick={()=>abrirFormZona(z)}>
                          <Pencil size={12}/>
                        </button>
                        <button className="zr-act-btn" title="Ver rutas" onClick={()=>selZona(z)}
                          style={{background:'#EEF2FF',borderColor:'#C7D2FE',color:'#4338CA'}}
                        >
                          <ChevronRight size={12}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showFormZona && (
                <button className="zr-add-btn" onClick={()=>abrirFormZona()}>
                  <Plus size={14}/> Nueva zona
                </button>
              )}
            </div>
          )}

          {/* ── TAB RUTAS ── */}
          {seccionTab === 'rutas' && (
            <div className="zr-body">
              {!zonaSel ? (
                <div className="zr-empty">
                  <Route size={36}/>
                  <p>Selecciona una zona para ver sus rutas.<br/>Ve al tab <strong>Zonas</strong> y haz clic en una.</p>
                </div>
              ) : (
                <>
                  {/* Barra de zona seleccionada */}
                  <div className="zr-ruta-zona-bar">
                    <div className="zr-color-dot" style={{background:zonaSel.color||'#6366F1'}}/>
                    <div className="zr-ruta-zona-name">{zonaSel.nombre}</div>
                    <span className="zr-tipo-badge" style={{background:zrTc(zonaSel.tipo).bg,color:zrTc(zonaSel.tipo).color}}>
                      {zonaSel.tipo}
                    </span>
                    <button className="zr-add-btn-sec" style={{fontSize:12}} onClick={()=>{setZonaSel(null);setSeccionTab('zonas')}}>
                      <ArrowLeft size={13}/> Volver
                    </button>
                  </div>

                  {/* Form nueva/editar ruta */}
                  {showFormRuta && (
                    <div className="zr-form-panel">
                      <div className="zr-form-title">
                        <Route size={14}/>
                        {editRuta ? `Editar ruta: ${editRuta.nombre}` : 'Nueva ruta de recaudo'}
                      </div>
                      <div className="zr-form-grid">
                        <div className="zr-field">
                          <label>Nombre *</label>
                          <input
                            value={fRuta.nombre}
                            onChange={e=>setFRuta(f=>({...f,nombre:e.target.value}))}
                            placeholder="Ej: Ruta Centro Lunes"
                          />
                        </div>
                        <div className="zr-field">
                          <label>Recaudador asignado</label>
                          <select value={fRuta.recaudador_id} onChange={e=>setFRuta(f=>({...f,recaudador_id:e.target.value}))}>
                            <option value="">— Sin asignar —</option>
                            {recaudadores.map(u=>(
                              <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="zr-field span2">
                          <label>Descripción</label>
                          <textarea
                            value={fRuta.descripcion}
                            onChange={e=>setFRuta(f=>({...f,descripcion:e.target.value}))}
                            placeholder="Descripción opcional..."
                          />
                        </div>
                        <div className="zr-field span2">
                          <label>Días del mes para cobro</label>
                          <div className="zr-dias-grid">
                            {Array.from({length:31},(_,i)=>i+1).map(dia=>(
                              <label key={dia} className="zr-dia-chk">
                                <input
                                  type="checkbox"
                                  checked={fRuta.dias_mes.includes(dia)}
                                  onChange={()=>toggleDia(dia)}
                                />
                                <span className="zr-dia-lbl">{dia}</span>
                              </label>
                            ))}
                          </div>
                          {fRuta.dias_mes.length > 0 && (
                            <div style={{marginTop:8,fontSize:11.5,color:'#6366F1',fontWeight:700}}>
                              Días seleccionados: {fRuta.dias_mes.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      {errRuta && (
                        <div style={{marginTop:10,padding:'8px 12px',background:'#FFF1F2',border:'1px solid #FECDD3',borderRadius:8,fontSize:12.5,color:'#BE123C',display:'flex',alignItems:'center',gap:6}}>
                          <XCircle size={13}/>{errRuta}
                        </div>
                      )}
                      <div className="zr-form-ftr">
                        <button className="zr-add-btn-sec" onClick={()=>{setShowFormRuta(false);setEditRuta(null)}}>
                          Cancelar
                        </button>
                        <button className="zr-add-btn" onClick={guardarRuta} disabled={savingRuta}>
                          {savingRuta ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> : <><CheckCircle2 size={13}/>Guardar ruta</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de rutas */}
                  {loadingRutas ? (
                    <div style={{display:'flex',justifyContent:'center',padding:24,color:'#6366F1'}}>
                      <Loader2 size={22} style={{animation:'spin 1s linear infinite'}}/>
                    </div>
                  ) : rutas.length === 0 ? (
                    <div className="zr-empty">
                      <Route size={32}/>
                      <p>No hay rutas en esta zona.<br/>Crea la primera ruta.</p>
                    </div>
                  ) : (
                    <div className="zr-ruta-list">
                      {rutas.map(r => (
                        <div key={r.id} className="zr-ruta-item" style={!r.activa?{opacity:.55}:{}}>
                          <div className="zr-ruta-icon">
                            <Route size={16} color="#4338CA"/>
                          </div>
                          <div className="zr-ruta-info">
                            <div className="zr-ruta-name">{r.nombre}</div>
                            <div className="zr-ruta-meta">
                              {r.dias_mes && r.dias_mes.length > 0 ? (
                                <div className="zr-dias-chips">
                                  {r.dias_mes.map(d=>(
                                    <span key={d} className="zr-dia-chip">día {d}</span>
                                  ))}
                                </div>
                              ) : (
                                <span>Sin días asignados</span>
                              )}
                              {r.recaudador_nombre && (
                                <span style={{display:'flex',alignItems:'center',gap:3}}>
                                  <Users size={10}/>{r.recaudador_nombre}
                                </span>
                              )}
                              <span style={{color:'#6366F1',fontWeight:700}}>{r.total_polizas} pólizas</span>
                              <span style={{color:r.activa?'#10B981':'#DC2626',fontWeight:700}}>
                                {r.activa?'Activa':'Inactiva'}
                              </span>
                            </div>
                          </div>
                          <div className="zr-ruta-actions">
                            <button className="zr-act-btn" title="Gestionar pólizas" onClick={()=>abrirPanelPolizas(r)}
                              style={{background:'#EEF2FF',border:'1px solid #C7D2FE',color:'#4338CA'}}>
                              <Users size={12}/>
                            </button>
                            <button className="zr-act-btn" title="Editar ruta" onClick={()=>abrirFormRuta(r)}>
                              <Pencil size={12}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Panel gestión de pólizas ── */}
                  {rutaPolizas && !showFormRuta && (
                    <div className="zr-pol-panel">
                      {/* Header del panel */}
                      <div className="zr-pol-head">
                        <Route size={14} color="#4338CA"/>
                        <span>Pólizas — <strong>{rutaPolizas.nombre}</strong></span>
                        {metaSuger && (
                          <span style={{fontSize:11,color:'#9CA3AF',fontWeight:500,marginLeft:4}}>
                            ~{metaSuger.tiempo_estimado_min} min estimados
                          </span>
                        )}
                        <button className="zr-pol-close" onClick={()=>setRutaPolizas(null)}>
                          <X size={14}/>
                        </button>
                      </div>

                      {/* Tabs del panel */}
                      <div className="zr-pol-tabs">
                        <button className={`zr-pol-tab ${panelPolTab==='asignadas'?'active':''}`}
                          onClick={()=>setPanelPolTab('asignadas')}>
                          Asignadas ({polizasRuta.length})
                        </button>
                        <button className={`zr-pol-tab ${panelPolTab==='sugeridas'?'active':''}`}
                          onClick={()=>setPanelPolTab('sugeridas')}>
                          ✨ Sugeridas ({sugeridas.length})
                        </button>
                        <button className={`zr-pol-tab ${panelPolTab==='buscar'?'active':''}`}
                          onClick={()=>setPanelPolTab('buscar')}>
                          Buscar
                        </button>
                      </div>

                      {/* Tab: Asignadas */}
                      {panelPolTab === 'asignadas' && (
                        loadingPol ? (
                          <div style={{textAlign:'center',padding:'16px',color:'#6366F1'}}>
                            <Loader2 size={18} style={{animation:'spin 1s linear infinite'}}/>
                          </div>
                        ) : polizasRuta.length === 0 ? (
                          <div style={{textAlign:'center',padding:'20px',color:'#9CA3AF',fontSize:12}}>
                            Sin pólizas asignadas.<br/>
                            <button style={{marginTop:8,color:'#4338CA',background:'none',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}
                              onClick={()=>setPanelPolTab('sugeridas')}>
                              Ver sugerencias inteligentes →
                            </button>
                          </div>
                        ) : (
                          <div className="zr-pol-list">
                            {polizasRuta.map(p => (
                              <div key={p.poliza_id||p.id} className="zr-pol-item">
                                <div style={{flex:1}}>
                                  <div style={{fontSize:12,fontWeight:700,color:'#0F1035'}}>
                                    #{p.poliza_numero} — {p.titular_nombre}
                                  </div>
                                  <div style={{fontSize:11,color:'#9CA3AF'}}>
                                    {p.titular_doc}
                                    {p.valor_cuota ? ` · $${Number(p.valor_cuota).toLocaleString('es-CO')}/mes` : ''}
                                    {p.meses_mora > 0 ? ` · ⚠ ${p.meses_mora} mes(es) mora` : ''}
                                  </div>
                                </div>
                                <button className="zr-pol-del" onClick={()=>quitarPolizaRuta(p.poliza_id||p.id)}>
                                  <X size={11}/>
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                      )}

                      {/* Tab: Sugeridas */}
                      {panelPolTab === 'sugeridas' && (
                        <div>
                          {metaSuger && (
                            <div className="zr-sug-meta">
                              <span>🔍 Palabras clave: <strong>{metaSuger.palabras_clave.join(', ') || 'ninguna'}</strong></span>
                              <span>⏱ Tiempo estimado: <strong>~{metaSuger.tiempo_estimado_min} min</strong></span>
                            </div>
                          )}

                          {loadingSug ? (
                            <div style={{textAlign:'center',padding:'16px',color:'#6366F1'}}>
                              <Loader2 size={18} style={{animation:'spin 1s linear infinite'}}/>
                            </div>
                          ) : sugeridas.length === 0 ? (
                            <div style={{textAlign:'center',padding:'20px',color:'#9CA3AF',fontSize:12}}>
                              No se encontraron sugerencias automáticas.<br/>Usa la pestaña "Buscar" para asignar manualmente.
                            </div>
                          ) : (
                            <>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                                <label style={{fontSize:12,color:'#374151',cursor:'pointer'}}>
                                  <input type="checkbox"
                                    checked={selSugeridas.size === sugeridas.length}
                                    onChange={e => setSelSugeridas(e.target.checked ? new Set(sugeridas.map(p=>p.id)) : new Set())}
                                    style={{marginRight:5}}
                                  />
                                  Seleccionar todas ({selSugeridas.size}/{sugeridas.length})
                                </label>
                                {selSugeridas.size > 0 && (
                                  <button className="zr-add-btn" style={{padding:'6px 12px',fontSize:11}}
                                    onClick={asignarSeleccionadas} disabled={asignandoTodas}>
                                    {asignandoTodas ? <Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/> : <Plus size={12}/>}
                                    Asignar {selSugeridas.size} pólizas
                                  </button>
                                )}
                              </div>

                              <div className="zr-pol-list">
                                {sugeridas.map(p => (
                                  <div key={p.id} className="zr-pol-item"
                                    style={{cursor:'pointer', background: selSugeridas.has(p.id) ? '#EEF2FF' : '#fff',
                                            borderColor: selSugeridas.has(p.id) ? '#C7D2FE' : '#E8E9F8'}}
                                    onClick={()=> {
                                      setSelSugeridas(prev => {
                                        const s = new Set(prev)
                                        s.has(p.id) ? s.delete(p.id) : s.add(p.id)
                                        return s
                                      })
                                    }}>
                                    <input type="checkbox" checked={selSugeridas.has(p.id)} readOnly style={{marginRight:6}}/>
                                    <div style={{flex:1}}>
                                      <div style={{fontSize:12,fontWeight:700,color:'#0F1035'}}>
                                        #{p.numero} — {p.titular_nombre}
                                      </div>
                                      <div style={{fontSize:11,color:'#9CA3AF'}}>
                                        📍 {p.titular_dir || 'Sin dirección'}
                                        {p.meses_mora > 0 ? <span style={{color:'#EF4444',fontWeight:700}}> · ⚠ {p.meses_mora} meses mora</span> : ''}
                                      </div>
                                    </div>
                                    {p.score > 0 && (
                                      <span style={{fontSize:10,background:'#ECFDF5',color:'#059669',padding:'2px 6px',borderRadius:6,fontWeight:700}}>
                                        {p.score === 1 ? '1 match' : `${p.score} matches`}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Tab: Buscar */}
                      {panelPolTab === 'buscar' && (
                        <div>
                          <div className="zr-pol-search">
                            <Search size={13} color="#9CA3AF"/>
                            <input
                              placeholder="Buscar por número de póliza o nombre del titular..."
                              value={busqPol}
                              onChange={e=>buscarPolizas(e.target.value)}
                              autoFocus
                            />
                            {buscandoPol && <Loader2 size={13} color="#6366F1" style={{animation:'spin 1s linear infinite'}}/>}
                          </div>
                          {candsPol.length > 0 && (
                            <div className="zr-pol-cands">
                              {candsPol.map(p => (
                                <div key={p.id} className="zr-pol-cand" onClick={()=>asignarPoliza(p.id)}>
                                  <div>
                                    <div style={{fontSize:12,fontWeight:700,color:'#0F1035'}}>#{p.numero} — {p.titular_nombre||p.titular}</div>
                                    <div style={{fontSize:11,color:'#9CA3AF'}}>{p.plan_nombre||p.estado} · 📍 {p.titular_dir||'Sin dirección'}</div>
                                  </div>
                                  <Plus size={13} color="#6366F1"/>
                                </div>
                              ))}
                            </div>
                          )}
                          {busqPol.length >= 2 && !buscandoPol && candsPol.length === 0 && (
                            <div style={{textAlign:'center',padding:'16px',color:'#9CA3AF',fontSize:12}}>Sin resultados para "{busqPol}"</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!showFormRuta && !rutaPolizas && (
                    <button className="zr-add-btn" onClick={()=>abrirFormRuta()}>
                      <Plus size={14}/> Nueva ruta
                    </button>
                  )}
                  {!showFormRuta && rutaPolizas && (
                    <button className="zr-add-btn-sec" onClick={()=>{ setRutaPolizas(null); abrirFormRuta() }}>
                      <Plus size={14}/> Nueva ruta
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        )}

      </div>
    </>
  )
}
