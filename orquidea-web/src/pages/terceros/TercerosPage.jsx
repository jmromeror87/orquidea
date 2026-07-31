/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Terceros (Clientes / Difuntos / Núcleo Familiar)     ║
 * ║  Archivo         : TercerosPage.jsx                                     ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, UserPlus, Search, RefreshCw, Edit2, X, Loader2,
  ChevronLeft, ChevronRight, Phone, Mail, MapPin,
  Heart, Skull, Star, Briefcase, UserCheck, Tag,
  PlusCircle, Trash2, AlertTriangle, CheckCircle2,
  Building2, User, Info, Calendar, Droplets,
} from 'lucide-react'
import api from '../../services/api.js'
import { useAuthStore } from '../../store/auth.store.js'
import { toast } from '../../store/toast.store.js'

// ── Constantes ────────────────────────────────────────────────────────────

const ROLES_META = {
  CLIENTE:        { label: 'Cliente',          color: '#10B981', bg: '#D1FAE5', Icon: User },
  TITULAR_POLIZA: { label: 'Titular de Póliza', color: '#6366F1', bg: '#EEF2FF', Icon: Star },
  BENEFICIARIO:   { label: 'Beneficiario',      color: '#0891B2', bg: '#CFFAFE', Icon: Heart },
  DIFUNTO:        { label: 'Difunto',           color: '#64748B', bg: '#F1F5F9', Icon: () => <span style={{fontSize:18, lineHeight:1}}>👼</span> },
  CONTRATANTE:    { label: 'Contratante',       color: '#F59E0B', bg: '#FEF3C7', Icon: Briefcase },
  ACUDIENTE:      { label: 'Acudiente',         color: '#8B5CF6', bg: '#EDE9FE', Icon: UserCheck },
  EMPLEADO:       { label: 'Empleado',          color: '#374151', bg: '#F3F4F6', Icon: Briefcase },
  PROVEEDOR:      { label: 'Proveedor',         color: '#B45309', bg: '#FEF3C7', Icon: Building2 },
}

const PARENTESCOS = ['conyuge','hijo','hija','padre','madre','hermano','hermana',
                     'abuelo','abuela','nieto','nieta','tio','tia','otro']

const BLANK_FORM = {
  tipo_persona: 'NATURAL',
  tipo_documento_id: '',
  numero_documento: '', dv: '',
  nombres: '', apellidos: '', razon_social: '',
  fecha_nacimiento: '', sexo: '', rh: '',
  telefono: '', telefono_alt: '', email: '',
  direccion: '', barrio: '', vereda: '', departamento_id: '', municipio_id: '', zona_id: '',
  observaciones: '',
  roles: ['CLIENTE'],
}

const BLANK_DEF = { fecha_fallecimiento: '', hora_fallecimiento: '',
                    lugar_fallecimiento: '', causa_fallecimiento: '' }

// ── CSS ───────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes modalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
  @keyframes spin    { to{transform:rotate(360deg)} }

  /* ─ Layout principal ─ */
  .tp-page { display:flex; flex-direction:column; height:100%; background:#F8F9FC; }

  /* ─ Barra de stats ─ */
  .tp-stats { display:flex; gap:12px; padding:16px 20px 0; flex-shrink:0; flex-wrap:wrap; }
  .tp-stat  {
    flex:1; min-width:150px;
    background:#fff; border:1.5px solid #ECEDF8; border-radius:14px;
    padding:14px 18px; display:flex; align-items:center; gap:14px;
    cursor:pointer; transition:all .18s;
    box-shadow:0 2px 6px rgba(0,0,0,.04);
  }
  .tp-stat:hover  { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.09); border-color:var(--sc); }
  .tp-stat.active { border-color:var(--sc); box-shadow:0 4px 16px rgba(0,0,0,.1); background:#FAFBFF; }
  .tp-stat-icon {
    width:46px; height:46px; border-radius:13px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    background:var(--sbg);
  }
  .tp-stat-val   { font-size:26px; font-weight:900; color:#0F1035; line-height:1; letter-spacing:-1px; }
  .tp-stat-label { font-size:11px; color:#9CA3AF; font-weight:600; margin-top:3px; }
  .tp-stat-badge {
    margin-left:auto; font-size:9px; font-weight:800; letter-spacing:.4px;
    background:var(--sbg); color:var(--sc); padding:3px 8px; border-radius:20px;
  }

  /* ─ Barra filtros ─ */
  .tp-bar {
    display:flex; gap:10px; padding:14px 20px; flex-shrink:0; flex-wrap:wrap; align-items:center;
  }
  .tp-search-box {
    display:flex; align-items:center; gap:8px; background:#fff;
    border:1.5px solid #ECEDF8; border-radius:11px; padding:0 13px;
    flex:1; min-width:240px; height:38px; transition:border .15s;
    box-shadow:0 1px 4px rgba(0,0,0,.04);
  }
  .tp-search-box:focus-within { border-color:#2E3192; }
  .tp-search-box input { border:none; background:transparent; font-size:13px;
                         color:#0F1035; outline:none; width:100%; }
  .tp-search-box input::placeholder { color:#B0B5C9; }
  .tp-sel {
    height:38px; background:#fff; border:1.5px solid #ECEDF8; border-radius:11px;
    padding:0 13px; font-size:12.5px; color:#374151; cursor:pointer; outline:none;
    transition:border .15s; font-weight:500;
    box-shadow:0 1px 4px rgba(0,0,0,.04);
  }
  .tp-sel:focus { border-color:#2E3192; }
  .tp-icon-btn {
    width:38px; height:38px; background:#fff; border:1.5px solid #ECEDF8; border-radius:11px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280; transition:all .15s; flex-shrink:0;
    box-shadow:0 1px 4px rgba(0,0,0,.04);
  }
  .tp-icon-btn:hover { background:#2E3192; color:#fff; border-color:#2E3192; }

  /* ─ Cuerpo ─ */
  .tp-body { flex:1; overflow:auto; padding:0 20px 20px; }

  /* ─ Tabla ─ */
  .tp-table-wrap { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; overflow:hidden;
                   box-shadow:0 2px 10px rgba(0,0,0,.05); }
  .tp-table { width:100%; border-collapse:collapse; font-size:13px; }
  .tp-table th {
    background:#F8F9FC; font-size:10.5px; font-weight:800; color:#6B7280;
    letter-spacing:.8px; text-transform:uppercase; padding:11px 16px;
    text-align:left; border-bottom:1.5px solid #ECEDF8; white-space:nowrap;
  }
  .tp-table td { padding:0; border-bottom:1px solid #F0F1FA; vertical-align:middle; }
  .tp-table td > .tp-td-inner { padding:12px 16px; display:flex; align-items:center; }
  .tp-table td.tp-td-plain    { padding:12px 16px; }
  .tp-table tr:last-child td  { border-bottom:none; }
  .tp-table tbody tr { transition:background .1s; }
  .tp-table tbody tr:hover td { background:#F8F9FF; }
  .tp-table tbody tr:hover td:first-child { border-left:3px solid #2E3192; }
  .tp-table tbody tr td:first-child { border-left:3px solid transparent; transition:border-color .1s; }

  /* ─ Avatar ─ */
  .tp-ava  { width:40px; height:40px; border-radius:12px; display:flex; align-items:center;
             justify-content:center; font-weight:900; font-size:13px; flex-shrink:0;
             letter-spacing:-.5px; border:2px solid transparent; transition:transform .15s; }
  .tp-ava:hover { transform:scale(1.07); }
  .tp-nom { font-weight:800; color:#0F1035; font-size:13.5px; line-height:1.2; }
  .tp-doc { font-size:11px; color:#B0B5C9; margin-top:2px; font-weight:500; }

  /* ─ Roles chips ─ */
  .tp-roles { display:flex; flex-wrap:wrap; gap:5px; }
  .tp-chip  { font-size:10px; font-weight:800; padding:3px 9px; border-radius:20px;
              letter-spacing:.4px; white-space:nowrap; display:inline-flex; align-items:center; gap:3px; }

  /* ─ Estado badge ─ */
  .tp-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px;
              font-weight:700; padding:4px 10px; border-radius:20px; }

  /* ─ Acciones ─ */
  .tp-acts { display:flex; gap:7px; justify-content:flex-end; padding-right:4px; }
  .tp-act  { width:32px; height:32px; border-radius:9px; border:1.5px solid #ECEDF8;
             background:#F8F9FF; display:flex; align-items:center; justify-content:center;
             cursor:pointer; color:#9CA3AF; transition:all .15s; }
  .tp-act:hover      { background:#EEF2FF; border-color:#C7CAE8; color:#2E3192; }
  .tp-act.edit:hover { background:#FEF3C7; border-color:#F59E0B; color:#B45309; }

  /* ─ Paginación ─ */
  .tp-pag { display:flex; align-items:center; justify-content:space-between;
            padding:12px 18px; border-top:1.5px solid #ECEDF8;
            background:#F8F9FC; flex-wrap:wrap; gap:8px; }
  .tp-pag-info { font-size:12px; color:#9CA3AF; font-weight:500; }
  .tp-pag-btns { display:flex; gap:5px; }
  .tp-pag-btn  { min-width:32px; height:32px; border-radius:8px; border:1.5px solid #ECEDF8;
                 background:#fff; display:flex; align-items:center; justify-content:center;
                 cursor:pointer; color:#374151; transition:all .15s; font-size:12px;
                 font-weight:700; padding:0 8px; }
  .tp-pag-btn:hover:not(:disabled) { background:#EEF2FF; border-color:#C7CAE8; color:#2E3192; }
  .tp-pag-btn:disabled { opacity:.35; cursor:not-allowed; }
  .tp-pag-btn.active { background:#2E3192; color:#fff; border-color:#2E3192; }

  /* ─ Empty ─ */
  .tp-empty { text-align:center; padding:60px 20px; }
  .tp-empty-icon { width:68px; height:68px; border-radius:18px; background:#F0F1FA;
                   display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
  .tp-empty p    { font-size:15px; font-weight:800; margin:0 0 6px; color:#374151; }
  .tp-empty span { font-size:12.5px; color:#9CA3AF; }

  /* ─ Spinner ─ */
  .tp-spin { animation:spin 1s linear infinite; }

  /* ─ Btn primario ─ */
  .tp-btn-primary {
    display:flex; align-items:center; gap:8px;
    background:#2E3192; color:#fff; border:none; border-radius:11px;
    padding:0 20px; height:38px; font-size:13px; font-weight:700;
    cursor:pointer; transition:all .15s; white-space:nowrap;
    box-shadow:0 4px 14px rgba(46,49,146,.3);
  }
  .tp-btn-primary:hover { background:#252880; box-shadow:0 6px 18px rgba(46,49,146,.4); }

  /* ─ Modal ─ */
  .tp-overlay { position:fixed; inset:0; background:rgba(15,16,53,.55);
                display:flex; align-items:center; justify-content:center;
                z-index:9000; padding:16px; backdrop-filter:blur(3px); }
  .tp-modal  { background:#fff; border-radius:20px; width:100%; max-width:680px;
               max-height:92vh; display:flex; flex-direction:column;
               animation:modalIn .2s ease; box-shadow:0 24px 80px rgba(0,0,0,.22); }
  .tp-modal.lg { max-width:820px; }
  /* ─ Drawer Tercero ─ */
  .tp-drawer-overlay { position:fixed; inset:0; background:rgba(10,10,30,.45); backdrop-filter:blur(3px);
    z-index:9000; display:flex; justify-content:flex-end; }
  .tp-drawer { background:#fff; width:88%; max-width:1100px; height:100vh; display:flex;
    flex-direction:column; box-shadow:-8px 0 40px rgba(0,0,0,.18); animation:tp-slide-in .22s ease; }
  @keyframes tp-slide-in { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
  .tp-drawer-sidebar { width:190px; flex-shrink:0; border-right:1.5px solid #ECEDF8;
    background:#F8F9FF; display:flex; flex-direction:column; padding:16px 10px; gap:4px; overflow-y:auto; }
  .tp-drawer-stab { display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:10px;
    cursor:pointer; border:none; background:none; width:100%; text-align:left;
    font-size:12.5px; font-weight:600; color:#4B5563; transition:all .15s; }
  .tp-drawer-stab:hover { background:#EEF2FF; color:#2E3192; }
  .tp-drawer-stab.active { background:linear-gradient(135deg,#5B6EE8,#4A5DD4); color:#fff;
    font-weight:800; box-shadow:0 3px 10px rgba(91,110,232,.25); }
  .tp-drawer-stab .stab-icon { font-size:16px; line-height:1; flex-shrink:0; }
  .tp-drawer-content { flex:1; overflow-y:auto; padding:28px 32px; }
  /* Cards */
  .tpd-card { background:#fff; border:1.5px solid #ECEDF8; border-radius:14px; margin-bottom:16px; overflow:hidden; }
  .tpd-card-head { display:flex; align-items:center; gap:9px; padding:12px 16px;
    background:linear-gradient(90deg,#F0F1FA,#F8F9FF); border-bottom:1.5px solid #ECEDF8; }
  .tpd-card-icon { font-size:16px; line-height:1; }
  .tpd-card-title { font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#2E3192; }
  .tpd-card-body { padding:16px; }
  .tpd-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .tpd-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .tpd-field { display:flex; flex-direction:column; gap:3px; }
  .tpd-label { font-size:10px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.06em; }
  .tpd-value { font-size:13.5px; font-weight:700; color:#111827; }
  .tpd-value.muted { color:#D1D5DB; font-weight:500; }
  .tp-mhead  { display:flex; align-items:center; justify-content:space-between;
               padding:18px 22px 14px; border-bottom:1.5px solid #ECEDF8; }
  .tp-mtitle { font-size:16px; font-weight:900; color:#0F1035; }
  .tp-msub   { font-size:11px; color:#9CA3AF; margin-top:2px; }
  .tp-mclose { width:32px; height:32px; border-radius:10px; border:1.5px solid #ECEDF8;
               background:#F8F9FF; display:flex; align-items:center; justify-content:center;
               cursor:pointer; color:#6B7280; transition:all .15s; }
  .tp-mclose:hover { background:#FEE2E2; border-color:#FECACA; color:#EF4444; }
  .tp-mbody  { flex:1; overflow-y:auto; padding:20px 22px; }
  .tp-mbody::-webkit-scrollbar { width:4px; }
  .tp-mbody::-webkit-scrollbar-thumb { background:#E2E5F0; border-radius:4px; }
  .tp-mfoot  { padding:14px 22px; border-top:1.5px solid #ECEDF8; display:flex; gap:10px; justify-content:flex-end; }
  .tp-btn-mini { white-space:nowrap; font-size:11px; font-weight:700; padding:0 10px; border-radius:8px;
                 border:1.5px solid #ECEDF8; background:#F8F9FF; color:#2E3192; cursor:pointer; }
  .tp-btn-mini:hover { background:#EEF2FF; }
  .tp-btn-mini:disabled { opacity:.5; cursor:not-allowed; }

  /* ─ Form ─ */
  .tp-section { font-size:10px; font-weight:800; letter-spacing:1px; color:#9CA3AF;
                text-transform:uppercase; margin:0 0 10px; padding-bottom:6px;
                border-bottom:1px solid #F0F1FA; }
  .tp-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .tp-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px; }
  .tp-field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
  .tp-field label { font-size:11.5px; font-weight:700; color:#374151; }
  .tp-field input, .tp-field select, .tp-field textarea {
    border:1.5px solid #E2E5F0; border-radius:10px; padding:8px 12px;
    font-size:13px; color:#0F1035; outline:none; background:#fff;
    transition:border-color .15s; font-family:inherit; }
  .tp-field input:focus, .tp-field select:focus, .tp-field textarea:focus { border-color:#2E3192; }
  .tp-field textarea { min-height:72px; resize:vertical; }
  .tp-field .req { color:#EF4444; }

  /* ─ Rol checkboxes ─ */
  .tp-roles-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(145px,1fr)); gap:8px; }
  .tp-rol-check  { display:flex; align-items:center; gap:8px; padding:8px 10px;
                   border-radius:10px; border:1.5px solid #E2E5F0; cursor:pointer;
                   transition:all .15s; font-size:12px; font-weight:600; color:#374151; }
  .tp-rol-check:hover { border-color:#C7CAE8; background:#F8F9FF; }
  .tp-rol-check.on    { border-color:var(--rc); background:var(--rbg); color:var(--rc); }
  .tp-rol-check input { display:none; }

  /* ─ Ficha detalle ─ */
  .tp-ficha    { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .tp-ficha-block { background:#F8F9FF; border-radius:12px; padding:14px 16px; border:1.5px solid #ECEDF8; }
  .tp-ficha-tit { font-size:10px; font-weight:800; letter-spacing:.8px; color:#9CA3AF; text-transform:uppercase; margin-bottom:10px; }
  .tp-ficha-row { display:flex; gap:8px; margin-bottom:6px; align-items:flex-start; }
  .tp-ficha-key { font-size:11px; color:#9CA3AF; min-width:90px; flex-shrink:0; }
  .tp-ficha-val { font-size:12.5px; font-weight:600; color:#0F1035; }

  /* ─ Familiar item ─ */
  .tp-fam-item { display:flex; align-items:center; gap:10px; padding:10px 12px;
                 background:#F8F9FF; border-radius:10px; border:1.5px solid #ECEDF8; margin-bottom:8px; }
  .tp-fam-ava  { width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg,#0891B2,#0F5E7A);
                 display:flex; align-items:center; justify-content:center; color:#fff;
                 font-size:11px; font-weight:800; flex-shrink:0; }
  .tp-fam-info { flex:1; }
  .tp-fam-nom  { font-size:12.5px; font-weight:700; color:#0F1035; }
  .tp-fam-par  { font-size:11px; color:#9CA3AF; text-transform:capitalize; }

  /* ─ Botones form ─ */
  .tp-btn-save { display:flex; align-items:center; gap:7px;
                 background:linear-gradient(135deg,#2E3192,#1E2070); color:#fff;
                 border:none; border-radius:10px; padding:9px 20px; font-size:13px;
                 font-weight:700; cursor:pointer; transition:all .15s; }
  .tp-btn-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 12px rgba(46,49,146,.35); }
  .tp-btn-save:disabled { opacity:.6; cursor:not-allowed; }
  .tp-btn-ghost { display:flex; align-items:center; gap:7px; background:#F4F5FA;
                  border:1.5px solid #ECEDF8; border-radius:10px; padding:9px 18px;
                  font-size:13px; font-weight:600; color:#374151; cursor:pointer; transition:all .15s; }
  .tp-btn-ghost:hover { background:#EEF2FF; border-color:#C7CAE8; color:#2E3192; }
  .tp-btn-danger { background:#FEE2E2; border:1.5px solid #FECACA; border-radius:10px; padding:9px 18px;
                   font-size:13px; font-weight:700; color:#DC2626; cursor:pointer; transition:all .15s; }
  .tp-btn-danger:hover { background:#FCA5A5; }

  /* ─ Alerts ─ */
  .tp-alert { display:flex; gap:10px; padding:12px 14px; border-radius:10px; margin-bottom:14px;
              font-size:12.5px; font-weight:600; }
  .tp-alert.warn { background:#FEF3C7; border:1.5px solid #F59E0B; color:#92400E; }
  .tp-alert.err  { background:#FEE2E2; border:1.5px solid #FECACA; color:#991B1B; }
  .tp-alert.ok   { background:#D1FAE5; border:1.5px solid #6EE7B7; color:#065F46; }

  @media(max-width:680px) {
    .tp-ficha { grid-template-columns:1fr; }
    .tp-grid2 { grid-template-columns:1fr; }
    .tp-grid3 { grid-template-columns:1fr 1fr; }
    .tp-modal { max-width:100%; }
  }
`

// ── Helpers ───────────────────────────────────────────────────────────────

const AVATAR_PALETA = [
  { bg:'#EDE9FE', color:'#6D28D9', border:'#C4B5FD' }, // violeta
  { bg:'#D1FAE5', color:'#065F46', border:'#6EE7B7' }, // verde
  { bg:'#DBEAFE', color:'#1E40AF', border:'#93C5FD' }, // azul
  { bg:'#FEF3C7', color:'#92400E', border:'#FCD34D' }, // amarillo
  { bg:'#FCE7F3', color:'#9D174D', border:'#F9A8D4' }, // rosa
  { bg:'#CCFBF1', color:'#134E4A', border:'#5EEAD4' }, // teal
  { bg:'#FEE2E2', color:'#991B1B', border:'#FCA5A5' }, // rojo suave
  { bg:'#E0F2FE', color:'#0C4A6E', border:'#7DD3FC' }, // celeste
  { bg:'#F3E8FF', color:'#6B21A8', border:'#D8B4FE' }, // lila
  { bg:'#ECFDF5', color:'#064E3B', border:'#6EE7B7' }, // menta
]

function avatarPaleta(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETA[Math.abs(hash) % AVATAR_PALETA.length]
}

function iniciales(t) {
  if (t.tipo_persona === 'JURIDICA') return (t.razon_social || '?')[0].toUpperCase()
  return `${(t.nombres||'?')[0]}${(t.apellidos||'')[0]||''}`.toUpperCase()
}

function Avatar({ t, size = 40 }) {
  const ini = iniciales(t)
  const key = t.tipo_persona === 'JURIDICA' ? (t.razon_social||'?') : (t.nombres||'?')
  const p = t.tipo_persona === 'JURIDICA'
    ? { bg:'#E0F2FE', color:'#0C4A6E', border:'#7DD3FC' }
    : avatarPaleta(key)
  return (
    <div className="tp-ava" style={{
      width: size, height: size,
      background: p.bg, color: p.color,
      borderColor: p.border,
      fontSize: size > 40 ? 18 : 13,
      borderRadius: size > 40 ? 16 : 12,
      boxShadow: `0 2px 8px ${p.border}88`,
    }}>
      {t.tipo_persona === 'JURIDICA' ? '🏢' : ini}
    </div>
  )
}

function nombreCompleto(t) {
  if (t.tipo_persona === 'JURIDICA') return t.razon_social || '—'
  return [t.nombres, t.apellidos].filter(Boolean).join(' ') || '—'
}

function RolChip({ rol, activo = true }) {
  const m = ROLES_META[rol] || { label: rol, color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span className="tp-chip" style={{
      color: activo ? m.color : '#9CA3AF',
      background: activo ? m.bg : '#F3F4F6',
      opacity: activo ? 1 : .7,
    }}>{m.label}</span>
  )
}

// ── Hook geo cascada ──────────────────────────────────────────────────────

function useGeo() {
  const [depts, setDepts]   = useState([])
  const [mpios, setMpios]   = useState([])
  const [zonas, setZonas]   = useState([])

  useEffect(() => {
    api.get('/territorio/select/departamentos').then(r => setDepts(r.data.data || [])).catch(() => {})
  }, [])

  const cargarMpios = useCallback(async (deptId) => {
    setMpios([]); setZonas([])
    if (!deptId) return
    const r = await api.get(`/territorio/select/municipios?departamento_id=${deptId}`)
    setMpios(r.data.data || [])
  }, [])

  const cargarZonas = useCallback(async (mpioId) => {
    setZonas([])
    if (!mpioId) return
    const r = await api.get(`/territorio/select/zonas?municipio_id=${mpioId}`)
    setZonas(r.data.data || [])
  }, [])

  return { depts, mpios, zonas, cargarMpios, cargarZonas }
}

// ── Lógica de campos requeridos por rol ───────────────────────────────────

const ROL_HINTS = {
  CLIENTE:        { icon: '👤', texto: 'Requiere teléfono de contacto.' },
  TITULAR_POLIZA: { icon: '⭐', texto: 'Requiere fecha de nacimiento y teléfono (datos actuariales de la póliza).' },
  BENEFICIARIO:   { icon: '💙', texto: 'Requiere fecha de nacimiento para verificar elegibilidad.' },
  DIFUNTO:        { icon: '🕊️', texto: 'Requiere grupo sanguíneo (RH). Habilita el bloque de datos de fallecimiento.' },
  CONTRATANTE:    { icon: '📋', texto: 'Requiere teléfono. Se recomienda dirección completa para el contrato.' },
  ACUDIENTE:      { icon: '🤝', texto: 'Requiere teléfono de contacto directo.' },
  EMPLEADO:       { icon: '💼', texto: 'Se recomienda fecha de nacimiento y dirección de residencia.' },
  PROVEEDOR:      { icon: '🏢', texto: 'Requiere teléfono o email de contacto comercial.' },
}

function computeNeeds(roles) {
  const r = roles
  return {
    telefono:         r.some(x => ['CLIENTE','TITULAR_POLIZA','CONTRATANTE','ACUDIENTE'].includes(x)),
    fecha_nacimiento: r.some(x => ['TITULAR_POLIZA','BENEFICIARIO'].includes(x)),
    rh:               r.includes('DIFUNTO'),
    direccion:        r.some(x => ['CONTRATANTE','EMPLEADO'].includes(x)),
    defuncion:        r.includes('DIFUNTO'),
    contacto_o_email: r.includes('PROVEEDOR') && !r.some(x => ['CLIENTE','TITULAR_POLIZA','CONTRATANTE','ACUDIENTE'].includes(x)),
  }
}

// ── Modal Crear/Editar Tercero ────────────────────────────────────────────

const BLANK_FORM_DEF = { fecha_fallecimiento: '', hora_fallecimiento: '',
                         lugar_fallecimiento: '', causa_fallecimiento: '' }

function ModalTercero({ tercero, tiposDocs, onClose, onSaved }) {
  const { depts, mpios, zonas, cargarMpios, cargarZonas } = useGeo()
  const [form, setForm]   = useState(BLANK_FORM)
  const [formDef, setFormDef] = useState(BLANK_FORM_DEF)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [nuevaZonaTipo, setNuevaZonaTipo] = useState('') // 'BARRIO' | 'VEREDA' | ''
  const [nuevaZonaNombre, setNuevaZonaNombre] = useState('')
  const [creandoZona, setCreandoZona] = useState(false)
  const editing = !!tercero

  useEffect(() => {
    if (tercero) {
      const rolesActivos = (tercero.roles || []).filter(r => r.activo).map(r => r.rol)
      setForm({
        tipo_persona:      tercero.tipo_persona || 'NATURAL',
        tipo_documento_id: tercero.tipo_documento_id || '',
        numero_documento:  tercero.numero_documento || '',
        dv:                tercero.dv || '',
        nombres:           tercero.nombres || '',
        apellidos:         tercero.apellidos || '',
        razon_social:      tercero.razon_social || '',
        fecha_nacimiento:  tercero.fecha_nacimiento ? tercero.fecha_nacimiento.split('T')[0] : '',
        sexo:              tercero.sexo || '',
        rh:                tercero.rh || '',
        telefono:          tercero.telefono || '',
        telefono_alt:      tercero.telefono_alt || '',
        email:             tercero.email || '',
        direccion:         tercero.direccion || '',
        barrio:            tercero.barrio || '',
        vereda:            tercero.vereda || '',
        departamento_id:   tercero.departamento_id || '',
        municipio_id:      tercero.municipio_id || '',
        zona_id:           tercero.zona_id || '',
        observaciones:     tercero.observaciones || '',
        roles:             rolesActivos,
      })
      if (tercero.departamento_id) cargarMpios(tercero.departamento_id)
      if (tercero.municipio_id)    cargarZonas(tercero.municipio_id)
    }
  }, [tercero])

  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setDef = (k, v) => setFormDef(p => ({ ...p, [k]: v }))

  const crearZonaRapida = async (campo, tipo) => {
    if (!nuevaZonaNombre.trim()) return
    setCreandoZona(true)
    try {
      const r = await api.post('/territorio/zonas', {
        municipio_id: form.municipio_id, nombre: nuevaZonaNombre.trim(), tipo,
      })
      await cargarZonas(form.municipio_id)
      set(campo, r.data.data.nombre)
      setNuevaZonaTipo('')
      setNuevaZonaNombre('')
      toast.success(`${tipo === 'BARRIO' ? 'Barrio' : 'Vereda'} creado y asignado`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo crear')
    } finally {
      setCreandoZona(false)
    }
  }

  const toggleRol = (rol) => {
    setForm(p => ({
      ...p,
      roles: p.roles.includes(rol) ? p.roles.filter(r => r !== rol) : [...p.roles, rol],
    }))
  }

  const tdActual = tiposDocs.find(t => t.id === form.tipo_documento_id)
  const needs    = computeNeeds(form.roles)

  // Req(campo) devuelve el asterisco rojo o amarillo según severidad
  const Req = ({ campo, texto }) => {
    const isHard = {
      telefono: needs.telefono,
      fecha_nacimiento: needs.fecha_nacimiento,
      rh: needs.rh,
      direccion: needs.direccion,
    }[campo]
    if (!isHard) return null
    return <span className="req" title={texto || 'Requerido por el rol seleccionado'}>*</span>
  }

  const guardar = async () => {
    setErr('')
    if (!form.tipo_documento_id || !form.numero_documento)
      return setErr('Tipo y número de documento son obligatorios.')
    if (form.tipo_persona === 'NATURAL' && (!form.nombres || !form.apellidos))
      return setErr('Nombres y apellidos son obligatorios.')
    if (form.tipo_persona === 'JURIDICA' && !form.razon_social)
      return setErr('Razón social es obligatoria.')
    if (needs.telefono && !form.telefono && !form.email)
      return setErr('Este rol requiere teléfono de contacto.')
    if (needs.fecha_nacimiento && !form.fecha_nacimiento)
      return setErr('Fecha de nacimiento es requerida para el rol seleccionado.')
    if (needs.rh && !form.rh)
      return setErr('Grupo sanguíneo (RH) es requerido para registro de difunto.')
    if (needs.defuncion && !formDef.fecha_fallecimiento)
      return setErr('Fecha de fallecimiento es requerida.')

    setSaving(true)
    try {
      const body = { ...form }
      if (!body.dv) delete body.dv

      let terceroId
      if (editing) {
        await api.put(`/terceros/${tercero.id}`, body)
        terceroId = tercero.id
        const rolesActuales = (tercero.roles || []).filter(r => r.activo).map(r => r.rol)
        const nuevos = form.roles.filter(r => !rolesActuales.includes(r))
        await Promise.all(nuevos.map(r => api.post(`/terceros/${terceroId}/roles`, { rol: r })))
      } else {
        const res = await api.post('/terceros', body)
        terceroId = res.data.data.id
      }

      // Si tiene rol DIFUNTO y tiene datos de defunción, registrar en paralelo
      if (needs.defuncion && formDef.fecha_fallecimiento) {
        await api.post(`/terceros/${terceroId}/defuncion`, formDef)
      }

      toast.success(editing ? 'Tercero actualizado correctamente' : 'Tercero creado correctamente')
      onSaved()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar')
      setErr(e.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="tp-modal">
        <div className="tp-mhead">
          <div>
            <div className="tp-mtitle">{editing ? 'Editar Tercero' : 'Nuevo Tercero'}</div>
            <div className="tp-msub">
              {editing ? `${nombreCompleto(tercero)} — ${tercero.numero_documento}` : 'Registro unificado de personas'}
            </div>
          </div>
          <button className="tp-mclose" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="tp-mbody">
          {err && (
            <div className="tp-alert err" style={{ marginBottom: 14 }}>
              <AlertTriangle size={15}/> {err}
            </div>
          )}

          {/* ── PASO 1: Roles (primero, para que el form se adapte) ── */}
          <p className="tp-section">Rol(es) del Tercero <span style={{ color:'#9CA3AF', fontWeight:400, fontSize:10, letterSpacing:0 }}>— seleccione antes de llenar el formulario</span></p>
          <div className="tp-roles-grid" style={{ marginBottom: 10 }}>
            {Object.entries(ROLES_META).map(([rol, m]) => {
              const on = form.roles.includes(rol)
              return (
                <label key={rol}
                  className={`tp-rol-check${on ? ' on' : ''}`}
                  style={{ '--rc': m.color, '--rbg': m.bg }}
                  onClick={() => toggleRol(rol)}
                >
                  <m.Icon size={13}/> {m.label}
                </label>
              )
            })}
          </div>

          {/* Hints contextuales por rol activo */}
          {form.roles.length > 0 && (
            <div style={{ marginBottom: 16, display:'flex', flexDirection:'column', gap:6 }}>
              {form.roles.map(rol => ROL_HINTS[rol] && (
                <div key={rol} style={{ display:'flex', gap:8, alignItems:'flex-start',
                  background: ROLES_META[rol]?.bg || '#F8F9FF',
                  border: `1.5px solid ${ROLES_META[rol]?.color || '#E2E5F0'}22`,
                  borderRadius: 8, padding:'7px 10px', fontSize:11.5,
                  color: ROLES_META[rol]?.color || '#374151', fontWeight:600 }}>
                  <span style={{ fontSize:14, lineHeight:1.2 }}>{ROL_HINTS[rol].icon}</span>
                  <span><strong>{ROLES_META[rol].label}:</strong> {ROL_HINTS[rol].texto}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── PASO 2: Tipo de persona ── */}
          <p className="tp-section">Tipo de Persona</p>
          <div className="tp-grid2" style={{ marginBottom: 14 }}>
            {['NATURAL','JURIDICA'].map(tp => (
              <label key={tp}
                className={`tp-rol-check${form.tipo_persona === tp ? ' on' : ''}`}
                style={{ '--rc': '#2E3192', '--rbg': '#EEF2FF' }}
                onClick={() => set('tipo_persona', tp)}
              >
                {tp === 'NATURAL' ? <User size={14}/> : <Building2 size={14}/>}
                {tp === 'NATURAL' ? 'Persona Natural' : 'Persona Jurídica'}
              </label>
            ))}
          </div>

          {/* ── PASO 3: Identificación ── */}
          <p className="tp-section">Identificación</p>
          <div className="tp-grid2">
            <div className="tp-field">
              <label>Tipo de documento <span className="req">*</span></label>
              <select value={form.tipo_documento_id} onChange={e => set('tipo_documento_id', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {tiposDocs.filter(t =>
                  t.aplica_para === 'AMBOS' ||
                  (form.tipo_persona === 'NATURAL'  && t.aplica_para !== 'JURIDICA') ||
                  (form.tipo_persona === 'JURIDICA' && t.aplica_para !== 'NATURAL')
                ).map(t => (
                  <option key={t.id} value={t.id}>{t.sigla} — {t.nombre}</option>
                ))}
              </select>
            </div>
            <div className="tp-field">
              <label>Número de documento <span className="req">*</span></label>
              <div style={{ display:'flex', gap:6 }}>
                <input value={form.numero_documento}
                  onChange={e => set('numero_documento', e.target.value)}
                  placeholder="Ej: 1090512345" style={{ flex:1 }}/>
                {tdActual?.requiere_dv && (
                  <input value={form.dv} onChange={e => set('dv', e.target.value)}
                    placeholder="DV" style={{ width:50 }}/>
                )}
              </div>
            </div>
          </div>

          {/* ── PASO 4: Datos personales ── */}
          <p className="tp-section" style={{ marginTop:8 }}>
            {form.tipo_persona === 'NATURAL' ? 'Datos Personales' : 'Datos de la Empresa'}
          </p>
          {form.tipo_persona === 'NATURAL' ? (
            <>
              <div className="tp-grid2">
                <div className="tp-field">
                  <label>Nombres <span className="req">*</span></label>
                  <input value={form.nombres} onChange={e => set('nombres', e.target.value)} placeholder="Ej: Ana María"/>
                </div>
                <div className="tp-field">
                  <label>Apellidos <span className="req">*</span></label>
                  <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} placeholder="Ej: Gómez Pérez"/>
                </div>
              </div>
              <div className="tp-grid3">
                <div className="tp-field">
                  <label>
                    <Calendar size={11} style={{ marginRight:3 }}/>
                    Fecha de nacimiento <Req campo="fecha_nacimiento"/>
                  </label>
                  <input type="date" value={form.fecha_nacimiento}
                    onChange={e => set('fecha_nacimiento', e.target.value)}
                    style={{ borderColor: needs.fecha_nacimiento && !form.fecha_nacimiento ? '#F59E0B' : undefined }}/>
                </div>
                <div className="tp-field">
                  <label>Sexo</label>
                  <select value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                    <option value="">—</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div className="tp-field">
                  <label>
                    <Droplets size={11} style={{ marginRight:3, color: needs.rh ? '#DC2626' : undefined }}/>
                    RH / Grupo <Req campo="rh"/>
                  </label>
                  <select value={form.rh} onChange={e => set('rh', e.target.value)}
                    style={{ borderColor: needs.rh && !form.rh ? '#EF4444' : undefined }}>
                    <option value="">—</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div className="tp-field">
              <label>Razón Social <span className="req">*</span></label>
              <input value={form.razon_social} onChange={e => set('razon_social', e.target.value)} placeholder="Ej: Empresa S.A.S."/>
            </div>
          )}

          {/* ── PASO 5: Contacto ── */}
          <p className="tp-section" style={{ marginTop:8 }}>Contacto</p>
          <div className="tp-grid3">
            <div className="tp-field">
              <label>
                <Phone size={11} style={{ marginRight:3 }}/>
                Teléfono <Req campo="telefono"/>
              </label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                placeholder="3001234567"
                style={{ borderColor: needs.telefono && !form.telefono ? '#F59E0B' : undefined }}/>
            </div>
            <div className="tp-field">
              <label>Tel. alterno</label>
              <input value={form.telefono_alt} onChange={e => set('telefono_alt', e.target.value)} placeholder="Opcional"/>
            </div>
            <div className="tp-field">
              <label>
                <Mail size={11} style={{ marginRight:3 }}/>
                Email {needs.contacto_o_email && <span className="req">*</span>}
              </label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com"/>
            </div>
          </div>

          {/* ── PASO 6: Dirección ── */}
          <p className="tp-section" style={{ marginTop:8 }}>
            Dirección {needs.direccion && <span className="req" style={{ fontSize:11 }}>requerida</span>}
          </p>
          <div className="tp-field">
            <label>
              Dirección <Req campo="direccion"/>
            </label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
              placeholder="Calle, carrera, barrio…"
              style={{ borderColor: needs.direccion && !form.direccion ? '#F59E0B' : undefined }}/>
          </div>
          <div className="tp-grid3">
            <div className="tp-field">
              <label>Departamento</label>
              <select value={form.departamento_id} onChange={e => {
                set('departamento_id', e.target.value)
                set('municipio_id', ''); set('zona_id', ''); set('barrio', ''); set('vereda', '')
                cargarMpios(e.target.value)
              }}>
                <option value="">— Seleccionar —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div className="tp-field">
              <label>Municipio</label>
              <select value={form.municipio_id} onChange={e => {
                set('municipio_id', e.target.value); set('zona_id', ''); set('barrio', ''); set('vereda', '')
                cargarZonas(e.target.value)
              }} disabled={!mpios.length}>
                <option value="">— Seleccionar —</option>
                {mpios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="tp-field">
              <label>Zona</label>
              <select value={form.zona_id} onChange={e => set('zona_id', e.target.value)} disabled={!zonas.length}>
                <option value="">— Seleccionar —</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="tp-grid3">
            <div className="tp-field">
              <label>Barrio</label>
              {nuevaZonaTipo === 'BARRIO' ? (
                <div style={{ display:'flex', gap:6 }}>
                  <input autoFocus value={nuevaZonaNombre} onChange={e => setNuevaZonaNombre(e.target.value)}
                    placeholder="Nombre del barrio" style={{ flex:1 }}
                    onKeyDown={e => e.key === 'Enter' && crearZonaRapida('barrio', 'BARRIO')}/>
                  <button type="button" className="tp-btn-mini" disabled={creandoZona}
                    onClick={() => crearZonaRapida('barrio', 'BARRIO')}>Guardar</button>
                  <button type="button" className="tp-btn-mini" onClick={() => { setNuevaZonaTipo(''); setNuevaZonaNombre('') }}>✕</button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:6 }}>
                  <select style={{ flex:1 }} value={form.barrio}
                    onChange={e => set('barrio', e.target.value)}
                    disabled={!form.municipio_id}>
                    <option value="">— Seleccionar —</option>
                    {zonas.filter(z => z.tipo === 'BARRIO').map(z => (
                      <option key={z.id} value={z.nombre}>{z.nombre}</option>
                    ))}
                  </select>
                  <button type="button" className="tp-btn-mini" disabled={!form.municipio_id}
                    onClick={() => setNuevaZonaTipo('BARRIO')} title="Crear nuevo barrio">+ Nuevo</button>
                </div>
              )}
            </div>
            <div className="tp-field">
              <label>Vereda</label>
              {nuevaZonaTipo === 'VEREDA' ? (
                <div style={{ display:'flex', gap:6 }}>
                  <input autoFocus value={nuevaZonaNombre} onChange={e => setNuevaZonaNombre(e.target.value)}
                    placeholder="Nombre de la vereda" style={{ flex:1 }}
                    onKeyDown={e => e.key === 'Enter' && crearZonaRapida('vereda', 'VEREDA')}/>
                  <button type="button" className="tp-btn-mini" disabled={creandoZona}
                    onClick={() => crearZonaRapida('vereda', 'VEREDA')}>Guardar</button>
                  <button type="button" className="tp-btn-mini" onClick={() => { setNuevaZonaTipo(''); setNuevaZonaNombre('') }}>✕</button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:6 }}>
                  <select style={{ flex:1 }} value={form.vereda}
                    onChange={e => set('vereda', e.target.value)}
                    disabled={!form.municipio_id}>
                    <option value="">— Seleccionar —</option>
                    {zonas.filter(z => z.tipo === 'VEREDA').map(z => (
                      <option key={z.id} value={z.nombre}>{z.nombre}</option>
                    ))}
                  </select>
                  <button type="button" className="tp-btn-mini" disabled={!form.municipio_id}
                    onClick={() => setNuevaZonaTipo('VEREDA')} title="Crear nueva vereda">+ Nuevo</button>
                </div>
              )}
            </div>
          </div>

          {/* ── BLOQUE DIFUNTO: aparece solo si tiene rol DIFUNTO ── */}
          {needs.defuncion && (
            <div style={{ background:'#F8F9FF', border:'2px solid #E2E5F0', borderRadius:14,
              padding:'14px 16px', marginTop:4, marginBottom:4 }}>
              <p className="tp-section" style={{ margin:'0 0 12px', color:'#64748B' }}>
                🕊️ Datos de Fallecimiento
                <span style={{ color:'#EF4444', fontSize:10, marginLeft:6 }}>
                  — requeridos por rol DIFUNTO
                </span>
              </p>
              <div className="tp-grid2">
                <div className="tp-field">
                  <label>Fecha de fallecimiento <span className="req">*</span></label>
                  <input type="date" value={formDef.fecha_fallecimiento}
                    onChange={e => setDef('fecha_fallecimiento', e.target.value)}
                    style={{ borderColor: !formDef.fecha_fallecimiento ? '#EF4444' : undefined }}/>
                </div>
                <div className="tp-field">
                  <label>Hora de fallecimiento</label>
                  <input type="time" value={formDef.hora_fallecimiento}
                    onChange={e => setDef('hora_fallecimiento', e.target.value)}/>
                </div>
              </div>
              <div className="tp-field">
                <label>Lugar de fallecimiento</label>
                <input value={formDef.lugar_fallecimiento}
                  onChange={e => setDef('lugar_fallecimiento', e.target.value)}
                  placeholder="Hospital, clínica, residencia…"/>
              </div>
              <div className="tp-field" style={{ marginBottom:0 }}>
                <label>Causa de fallecimiento</label>
                <input value={formDef.causa_fallecimiento}
                  onChange={e => setDef('causa_fallecimiento', e.target.value)}
                  placeholder="Diagnóstico / causa de muerte"/>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <p className="tp-section" style={{ marginTop:12 }}>Observaciones</p>
          <div className="tp-field">
            <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
              placeholder="Notas internas sobre este tercero…"/>
          </div>
        </div>

        <div className="tp-mfoot">
          <button className="tp-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="tp-btn-save" onClick={guardar} disabled={saving}>
            {saving ? <Loader2 size={14} className="tp-spin"/> : <CheckCircle2 size={14}/>}
            {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear Tercero'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Ficha Detalle ───────────────────────────────────────────────────

function DataItem({ icon: Icon, label, value, accent }) {
  if (!value) return null
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0',
      borderBottom:'1px solid #F4F5FA' }}>
      <div style={{ width:32, height:32, borderRadius:9, background:'#F0F1FA', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={14} color="#6B7280"/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10.5, color:'#9CA3AF', fontWeight:700, letterSpacing:.4,
          textTransform:'uppercase', marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:13.5, fontWeight:700, color: accent || '#0F1035',
          lineHeight:1.3 }}>{value}</div>
      </div>
    </div>
  )
}

function ModalFicha({ id, onClose, onEditar, tiposDocs }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('datos')
  const [formDef, setFormDef] = useState(BLANK_DEF)
  const [savingDef, setSavingDef] = useState(false)
  const [errDef, setErrDef]   = useState('')
  const [okDef, setOkDef]     = useState('')
  const [showVinc, setShowVinc]     = useState(false)
  const [busq, setBusq]             = useState('')
  const [candidatos, setCandidatos] = useState([])
  const [parentesco, setParentesco] = useState('hijo')
  const [savingVinc, setSavingVinc] = useState(false)
  const [errVinc, setErrVinc]       = useState('')

  // ── Soportes adjuntos de la defunción (acta / permiso escaneados) ────────
  const [subiendoActaDef,    setSubiendoActaDef]    = useState(false)
  const [subiendoPermisoDef, setSubiendoPermisoDef] = useState(false)
  const fileActaDefRef    = useRef(null)
  const filePermisoDefRef = useRef(null)
  const EXTENSIONES_SOPORTE = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff'

  const subirDocumentoDefuncion = async (campo, file, setSubiendo) => {
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/terceros/${id}/defuncion/soporte?campo=${campo}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Documento adjuntado con éxito')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al subir el archivo')
    } finally { setSubiendo(false) }
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/terceros/${id}`)
      setData(r.data.data)
      if (r.data.data.defuncion) {
        const d = r.data.data.defuncion
        setFormDef({
          fecha_fallecimiento: d.fecha_fallecimiento?.split('T')[0] || '',
          hora_fallecimiento:  d.hora_fallecimiento  || '',
          lugar_fallecimiento: d.lugar_fallecimiento || '',
          causa_fallecimiento: d.causa_fallecimiento || '',
        })
      }
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const buscarCandidatos = useCallback(async (q) => {
    if (q.length < 1) return setCandidatos([])
    const r = await api.get(`/terceros/select?q=${encodeURIComponent(q)}`)
    setCandidatos((r.data.data || []).filter(t => t.id !== id))
  }, [id])

  useEffect(() => {
    const t = setTimeout(() => buscarCandidatos(busq), 300)
    return () => clearTimeout(t)
  }, [busq, buscarCandidatos])

  const guardarDefuncion = async () => {
    setErrDef(''); setOkDef('')
    if (!formDef.fecha_fallecimiento) return setErrDef('La fecha de fallecimiento es obligatoria.')
    setSavingDef(true)
    try {
      await api.post(`/terceros/${id}/defuncion`, formDef)
      setOkDef('Defunción registrada correctamente.')
      toast.success('Defunción registrada correctamente')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar defunción')
      setErrDef(e.response?.data?.error || 'Error al registrar defunción')
    } finally { setSavingDef(false) }
  }

  const vincularFamiliar = async (benId) => {
    setErrVinc(''); setSavingVinc(true)
    try {
      await api.post(`/terceros/${id}/familiares`, { beneficiario_id: benId, parentesco })
      toast.success('Familiar vinculado correctamente')
      setShowVinc(false); setBusq(''); setCandidatos([])
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al vincular')
      setErrVinc(e.response?.data?.error || 'Error al vincular')
    } finally { setSavingVinc(false) }
  }

  const desvincularFamiliar = async (famId) => {
    try {
      await api.delete(`/terceros/${id}/familiares/${famId}`)
      toast.success('Familiar desvinculado correctamente')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al desvincular')
    }
  }

  const isDifunto = !loading && (data?.roles || []).some(r => r.rol === 'DIFUNTO' && r.activo)
  const rolesActivos = !loading ? (data?.roles || []).filter(r => r.activo) : []
  const nucleo = !loading ? (data?.nucleo_familiar || []) : []

  const TABS = [
    { key:'datos',     icon:'👤', label:'Datos' },
    { key:'nucleo',    icon:'👨‍👩‍👧', label:`Familia (${nucleo.length})` },
    { key:'defuncion', icon:'🕊️', label:'Defunción', dot: isDifunto ? (data?.defuncion ? 'green' : 'amber') : null },
  ]

  const TpdCard = ({ icon, title, children, accentColor = '#2E3192', headerRight }) => (
    <div className="tpd-card">
      <div className="tpd-card-head">
        <span className="tpd-card-icon">{icon}</span>
        <span className="tpd-card-title" style={{ color: accentColor }}>{title}</span>
        {headerRight && <div style={{ marginLeft:'auto' }}>{headerRight}</div>}
      </div>
      <div className="tpd-card-body">{children}</div>
    </div>
  )

  const TpdField = ({ label, value, color }) => (
    <div className="tpd-field">
      <span className="tpd-label">{label}</span>
      <span className={`tpd-value${value ? '' : ' muted'}`} style={color ? { color } : {}}>{value || '—'}</span>
    </div>
  )

  const headerBg = isDifunto
    ? 'linear-gradient(135deg,#334155 0%,#475569 100%)'
    : 'linear-gradient(135deg,#5B6EE8 0%,#4A5DD4 50%,#6B8DD6 100%)'

  return (
    <div className="tp-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="tp-drawer">

        {/* Header */}
        <div style={{ background: headerBg, padding:'18px 24px',
          display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ width:54, height:54, borderRadius:16, flexShrink:0,
            background:'rgba(255,255,255,.18)', border:'2px solid rgba(255,255,255,.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-.5 }}>
            {loading ? '…' : iniciales(data)}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>
              Tercero
            </div>
            <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {loading ? 'Cargando…' : nombreCompleto(data)}
            </div>
            {!loading && (
              <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
                {data.tipo_doc_sigla && (
                  <span style={{ background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.3)',
                    padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff' }}>
                    {data.tipo_doc_sigla} {data.numero_documento}
                  </span>
                )}
                {data.rh && (
                  <span style={{ background:'#DC2626', border:'1px solid rgba(255,255,255,.2)',
                    padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:800, color:'#fff' }}>
                    🩸 {data.rh}
                  </span>
                )}
                {rolesActivos.map(r => {
                  const m = ROLES_META[r.rol] || {}
                  return (
                    <span key={r.rol} style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)',
                      padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff',
                      display:'inline-flex', alignItems:'center', gap:4 }}>
                      {m.Icon && <m.Icon size={10}/>} {m.label || r.rol}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {!loading && (
              <button onClick={() => { onClose(); onEditar(data) }}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
                  background:'rgba(255,255,255,.18)', border:'1.5px solid rgba(255,255,255,.35)',
                  borderRadius:10, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                <Edit2 size={13}/> Editar
              </button>
            )}
            <button onClick={onClose}
              style={{ width:36, height:36, borderRadius:10, border:'1.5px solid rgba(255,255,255,.3)',
                background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center',
                justifyContent:'center', cursor:'pointer', color:'#fff' }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Sidebar */}
          <div className="tp-drawer-sidebar">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`tp-drawer-stab${tab === t.key ? ' active' : ''}`}>
                <span className="stab-icon">{t.icon}</span>
                <span style={{ flex:1 }}>{t.label}</span>
                {t.dot && (
                  <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                    background: t.dot === 'green' ? '#10B981' : '#F59E0B' }}/>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="tp-drawer-content">
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', height:200, gap:12 }}>
                <Loader2 size={32} color="#2E3192" className="tp-spin"/>
                <span style={{ fontSize:13, color:'#9CA3AF' }}>Cargando ficha…</span>
              </div>

            ) : tab === 'datos' ? (
              <>
                <div className="tpd-grid2" style={{ marginBottom:16 }}>
                  <TpdCard icon="🪪" title="Identificación">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <TpdField label="Tipo de documento" value={`${data.tipo_doc_sigla} — ${data.tipo_doc_nombre || ''}`}/>
                      <TpdField label="Número" value={`${data.numero_documento}${data.dv?'-'+data.dv:''}`}/>
                      <TpdField label="Tipo de persona" value={data.tipo_persona}/>
                    </div>
                  </TpdCard>

                  <TpdCard icon="📋" title="Datos personales">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <TpdField label="Fecha de nacimiento" value={data.fecha_nacimiento
                        ? new Date(data.fecha_nacimiento).toLocaleDateString('es-CO',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'})
                        : null}/>
                      <TpdField label="Sexo" value={data.sexo === 'M' ? '♂ Masculino' : data.sexo === 'F' ? '♀ Femenino' : null}/>
                      {data.rh && (
                        <div className="tpd-field">
                          <span className="tpd-label">Grupo sanguíneo</span>
                          <span style={{ fontSize:22, fontWeight:900, color:'#DC2626', lineHeight:1 }}>{data.rh}</span>
                        </div>
                      )}
                    </div>
                  </TpdCard>
                </div>

                <div className="tpd-grid2" style={{ marginBottom:16 }}>
                  <TpdCard icon="📞" title="Contacto">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <TpdField label="Teléfono principal" value={data.telefono}/>
                      <TpdField label="Teléfono alternativo" value={data.telefono_alt}/>
                      <TpdField label="Correo electrónico" value={data.email}/>
                    </div>
                  </TpdCard>

                  <TpdCard icon="📍" title="Ubicación">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <TpdField label="Dirección" value={data.direccion}/>
                      <TpdField label="Barrio" value={data.barrio}/>
                      <TpdField label="Vereda" value={data.vereda}/>
                      <TpdField label="Municipio / Departamento"
                        value={[data.municipio_nombre, data.departamento_nombre].filter(Boolean).join(', ') || null}/>
                      <TpdField label="Zona" value={data.zona_nombre}/>
                    </div>
                  </TpdCard>
                </div>

                {data.observaciones && (
                  <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:'#92400E', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
                      Observaciones
                    </div>
                    <p style={{ fontSize:13.5, color:'#78350F', margin:0, lineHeight:1.6 }}>{data.observaciones}</p>
                  </div>
                )}
              </>

            ) : tab === 'nucleo' ? (
              <TpdCard icon="👨‍👩‍👧" title="Núcleo Familiar"
                headerRight={
                  <button onClick={() => setShowVinc(v => !v)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px',
                      background: showVinc ? '#EEF2FF' : 'linear-gradient(135deg,#5B6EE8,#4A5DD4)',
                      border:'none', borderRadius:8, fontSize:11.5, fontWeight:700,
                      color: showVinc ? '#2E3192' : '#fff', cursor:'pointer' }}>
                    <PlusCircle size={12}/> Vincular familiar
                  </button>
                }>
                <div style={{ fontSize:12, color:'#6B7280', fontWeight:600, marginBottom:14 }}>
                  {nucleo.length === 0 ? 'Sin miembros registrados' : `${nucleo.length} persona${nucleo.length>1?'s':''} vinculada${nucleo.length>1?'s':''}`}
                </div>

                {showVinc && (
                  <div style={{ background:'#F0F1FA', border:'1.5px solid #C7CAE8', borderRadius:12, padding:14, marginBottom:14 }}>
                    {errVinc && <div className="tp-alert err" style={{ marginBottom:10 }}><AlertTriangle size={13}/>{errVinc}</div>}
                    <div className="tp-grid2" style={{ marginBottom:10 }}>
                      <div className="tp-field" style={{ marginBottom:0 }}>
                        <label>Buscar persona</label>
                        <div style={{ position:'relative' }}>
                          <Search size={13} color="#9CA3AF" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                          <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Nombre, cédula…" style={{ paddingLeft:30 }}/>
                        </div>
                      </div>
                      <div className="tp-field" style={{ marginBottom:0 }}>
                        <label>Parentesco</label>
                        <select value={parentesco} onChange={e => setParentesco(e.target.value)}>
                          {PARENTESCOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    {candidatos.length > 0 && (
                      <div style={{ border:'1.5px solid #C7CAE8', borderRadius:10, overflow:'hidden', maxHeight:180, overflowY:'auto', background:'#fff' }}>
                        {candidatos.map((c, i) => (
                          <div key={c.id} onClick={() => vincularFamiliar(c.id)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                              cursor:'pointer', borderBottom:i<candidatos.length-1?'1px solid #F4F5FA':'none' }}
                            onMouseEnter={e => e.currentTarget.style.background='#EEF2FF'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <Avatar t={c} size={34}/>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:700 }}>{nombreCompleto(c)}</div>
                              <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.tipo_doc_sigla} {c.numero_documento}</div>
                            </div>
                            {savingVinc ? <Loader2 size={14} className="tp-spin" color="#2E3192"/> : <ChevronRight size={14} color="#9CA3AF"/>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {nucleo.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 20px' }}>
                    <div style={{ width:60, height:60, borderRadius:16, background:'#F0F1FA',
                      display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                      <Heart size={26} color="#C7CAE8"/>
                    </div>
                    <p style={{ fontSize:14, fontWeight:800, color:'#374151', margin:'0 0 6px' }}>Sin núcleo familiar</p>
                    <span style={{ fontSize:12.5, color:'#9CA3AF' }}>Use "Vincular familiar" para agregar miembros</span>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {nucleo.map(f => (
                      <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12,
                        background:'#F8F9FF', border:'1.5px solid #ECEDF8', borderRadius:12, padding:'12px 14px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='#C7CAE8'; e.currentTarget.style.background='#F0F1FA' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='#ECEDF8'; e.currentTarget.style.background='#F8F9FF' }}>
                        <div style={{ width:42, height:42, borderRadius:12, flexShrink:0,
                          background: f.relacion==='TITULAR' ? 'linear-gradient(135deg,#C9A020,#A37A10)' : 'linear-gradient(135deg,#0891B2,#0F5E7A)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:15, fontWeight:900, color:'#fff', boxShadow:'0 3px 10px rgba(0,0,0,.15)' }}>
                          {(f.nombres?.[0]||'?').toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13.5, fontWeight:800, color:'#0F1035' }}>{f.nombres} {f.apellidos}</div>
                          <div style={{ fontSize:11.5, color:'#6B7280', marginTop:2, display:'flex', gap:6 }}>
                            <span style={{ background: f.relacion==='TITULAR'?'#FEF3C7':'#CFFAFE',
                              color: f.relacion==='TITULAR'?'#B45309':'#0891B2',
                              fontWeight:700, fontSize:10, padding:'2px 7px', borderRadius:6 }}>
                              {f.relacion==='TITULAR' ? '🏠 Titular' : f.parentesco}
                            </span>
                            <span>{f.tipo_doc_sigla} {f.numero_documento}</span>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ background:f.activo?'#D1FAE5':'#F3F4F6', color:f.activo?'#065F46':'#6B7280',
                            fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>
                            {f.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          {f.relacion === 'BENEFICIARIO' && (
                            <button onClick={() => desvincularFamiliar(f.id)}
                              style={{ width:30, height:30, borderRadius:8, border:'1.5px solid #FECACA',
                                background:'#FEF2F2', display:'flex', alignItems:'center',
                                justifyContent:'center', cursor:'pointer', color:'#EF4444' }}>
                              <Trash2 size={13}/>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TpdCard>

            ) : (
              /* Tab Defunción */
              <>
                {data.defuncion ? (
                  <div style={{ background:'linear-gradient(135deg,#1E293B,#334155)',
                    borderRadius:14, padding:'16px 20px', marginBottom:16,
                    display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,.1)',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Skull size={20} color="rgba(255,255,255,.8)"/>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>Defunción registrada</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginTop:2 }}>
                        {new Date(data.defuncion.fecha_fallecimiento)
                          .toLocaleDateString('es-CO',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                        {data.defuncion.hora_fallecimiento && ` · ${data.defuncion.hora_fallecimiento}`}
                      </div>
                    </div>
                    <CheckCircle2 size={22} color="#34D399" style={{ marginLeft:'auto' }}/>
                  </div>
                ) : (
                  <div style={{ background:'#FFFBEB', border:'2px solid #FDE68A', borderRadius:14,
                    padding:'14px 18px', marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
                    <AlertTriangle size={20} color="#D97706"/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#92400E' }}>Sin registro de defunción</div>
                      <div style={{ fontSize:12, color:'#B45309', marginTop:2 }}>Complete el formulario si este tercero ha fallecido.</div>
                    </div>
                  </div>
                )}

                {errDef && <div className="tp-alert err" style={{ marginBottom:12 }}><AlertTriangle size={13}/>{errDef}</div>}
                {okDef  && <div className="tp-alert ok"  style={{ marginBottom:12 }}><CheckCircle2 size={13}/>{okDef}</div>}

                <TpdCard icon="🕊️" title="Datos del fallecimiento" accentColor="#334155">
                  <div className="tp-grid2" style={{ marginBottom:12 }}>
                    <div className="tp-field">
                      <label>Fecha de fallecimiento <span style={{ color:'#EF4444' }}>*</span></label>
                      <input type="date" value={formDef.fecha_fallecimiento}
                        onChange={e => setFormDef(p => ({...p, fecha_fallecimiento: e.target.value}))}/>
                    </div>
                    <div className="tp-field">
                      <label>Hora de fallecimiento</label>
                      <input type="time" value={formDef.hora_fallecimiento}
                        onChange={e => setFormDef(p => ({...p, hora_fallecimiento: e.target.value}))}/>
                    </div>
                  </div>
                  <div className="tp-field">
                    <label>Lugar de fallecimiento</label>
                    <input value={formDef.lugar_fallecimiento}
                      onChange={e => setFormDef(p => ({...p, lugar_fallecimiento: e.target.value}))}
                      placeholder="Hospital, clínica, domicilio, vía pública…"/>
                  </div>
                  <div className="tp-field" style={{ marginBottom:0 }}>
                    <label>Causa de fallecimiento</label>
                    <input value={formDef.causa_fallecimiento}
                      onChange={e => setFormDef(p => ({...p, causa_fallecimiento: e.target.value}))}
                      placeholder="Diagnóstico médico o causa certificada de muerte"/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                    <button className="tp-btn-save"
                      style={{ background:'linear-gradient(135deg,#1E293B,#334155)' }}
                      onClick={guardarDefuncion} disabled={savingDef}>
                      {savingDef ? <Loader2 size={14} className="tp-spin"/> : <span style={{fontSize:14}}>👼</span>}
                      {data.defuncion ? 'Actualizar defunción' : 'Registrar defunción'}
                    </button>
                  </div>
                </TpdCard>

                {data.defuncion && (
                  <TpdCard icon="📎" title="Documentos adjuntos" accentColor="#334155">
                    <div style={{ fontSize:11.5, color:'#9CA3AF', marginBottom:10 }}>
                      El mismo documento se ve reflejado en cualquier servicio funerario vinculado a esta persona.
                    </div>
                    <div className="tp-grid2">
                      <div className="tp-field" style={{ marginBottom:0 }}>
                        <label>Acta de defunción <span style={{ color:'#9CA3AF', fontWeight:400 }}>(PDF, JPG, PNG…)</span></label>
                        <input ref={fileActaDefRef} type="file" accept={EXTENSIONES_SOPORTE} style={{ display:'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumentoDefuncion('acta_defuncion', f, setSubiendoActaDef); e.target.value = null }}/>
                        <div onClick={() => !subiendoActaDef && fileActaDefRef.current?.click()}
                          style={{ border:`2px dashed ${data.defuncion.acta_defuncion_soporte_url ? '#059669' : '#E2E5F0'}`, borderRadius:10,
                            padding:'10px 12px', cursor: subiendoActaDef ? 'default' : 'pointer',
                            background: data.defuncion.acta_defuncion_soporte_url ? '#F0FDF4' : '#FAFBFF',
                            display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                          {subiendoActaDef ? (
                            <span style={{ color:'#6B7280' }}>Subiendo…</span>
                          ) : data.defuncion.acta_defuncion_soporte_url ? (
                            <>
                              <span style={{ color:'#059669', fontWeight:700 }}>✓ Documento adjunto</span>
                              <a href={`http://localhost:3001${data.defuncion.acta_defuncion_soporte_url}`} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()} style={{ color:'#6366F1', marginLeft:'auto' }}>Ver</a>
                              <span style={{ color:'#9CA3AF' }}>· Reemplazar</span>
                            </>
                          ) : (
                            <span style={{ color:'#6B7280' }}>Haz clic para adjuntar el acta escaneada…</span>
                          )}
                        </div>
                      </div>
                      <div className="tp-field" style={{ marginBottom:0 }}>
                        <label>Permiso de inhumación <span style={{ color:'#9CA3AF', fontWeight:400 }}>(PDF, JPG, PNG…)</span></label>
                        <input ref={filePermisoDefRef} type="file" accept={EXTENSIONES_SOPORTE} style={{ display:'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumentoDefuncion('permiso_inhumacion', f, setSubiendoPermisoDef); e.target.value = null }}/>
                        <div onClick={() => !subiendoPermisoDef && filePermisoDefRef.current?.click()}
                          style={{ border:`2px dashed ${data.defuncion.permiso_inhumacion_soporte_url ? '#059669' : '#E2E5F0'}`, borderRadius:10,
                            padding:'10px 12px', cursor: subiendoPermisoDef ? 'default' : 'pointer',
                            background: data.defuncion.permiso_inhumacion_soporte_url ? '#F0FDF4' : '#FAFBFF',
                            display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                          {subiendoPermisoDef ? (
                            <span style={{ color:'#6B7280' }}>Subiendo…</span>
                          ) : data.defuncion.permiso_inhumacion_soporte_url ? (
                            <>
                              <span style={{ color:'#059669', fontWeight:700 }}>✓ Documento adjunto</span>
                              <a href={`http://localhost:3001${data.defuncion.permiso_inhumacion_soporte_url}`} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()} style={{ color:'#6366F1', marginLeft:'auto' }}>Ver</a>
                              <span style={{ color:'#9CA3AF' }}>· Reemplazar</span>
                            </>
                          ) : (
                            <span style={{ color:'#6B7280' }}>Haz clic para adjuntar el permiso escaneado…</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TpdCard>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────

export default function TercerosPage() {
  const { usuario } = useAuthStore()
  const [rows, setRows]         = useState([])
  const [meta, setMeta]         = useState({ total: 0, page: 1, limit: 25 })
  const [kpis, setKpis]         = useState({})
  const [loading, setLoading]   = useState(true)
  const [tiposDocs, setTiposDocs] = useState([])

  // Filtros
  const [q, setQ]               = useState('')
  const [filtRol, setFiltRol]   = useState('')
  const [filtPersona, setFiltPersona] = useState('')
  const [filtActivo, setFiltActivo]   = useState('')
  const [page, setPage]         = useState(1)

  // Modales
  const [showForm, setShowForm]     = useState(false)
  const [editando, setEditando]     = useState(null)
  const [showFicha, setShowFicha]   = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 25 })
      if (q)          params.set('q', q)
      if (filtRol)    params.set('rol', filtRol)
      if (filtPersona) params.set('tipo_persona', filtPersona)
      if (filtActivo !== '') params.set('activo', filtActivo)

      const [rRows, rTd] = await Promise.all([
        api.get(`/terceros?${params}`),
        api.get('/tipos-documento/select'),
      ])
      setRows(rRows.data.data || [])
      setMeta(rRows.data.meta)
      setTiposDocs(rTd.data.data || [])

      // KPIs de roles
      const kpiMap = {}
      for (const t of (rRows.data.data || [])) {
        for (const r of (t.roles || [])) {
          if (r.activo) kpiMap[r.rol] = (kpiMap[r.rol] || 0) + 1
        }
      }
      kpiMap._total   = rRows.data.meta.total
      setKpis(kpiMap)
    } finally {
      setLoading(false)
    }
  }, [q, filtRol, filtPersona, filtActivo, page])

  useEffect(() => { cargar() }, [cargar])

  // Debounce búsqueda
  const qTimer = useRef(null)
  const onQ = (v) => {
    setQ(v)
    clearTimeout(qTimer.current)
    qTimer.current = setTimeout(() => setPage(1), 300)
  }

  const abrirNuevo = () => { setEditando(null); setShowForm(true) }
  const abrirEditar = (t) => { setEditando(t); setShowFicha(null); setShowForm(true) }

  const totalPag = Math.ceil(meta.total / meta.limit) || 1

  const KPI_ITEMS = [
    { key: '_total',        label: 'Total Terceros', color: '#2E3192', bg: '#EEF2FF', Icon: Users },
    { key: 'CLIENTE',       label: 'Clientes',       color: ROLES_META.CLIENTE.color,        bg: ROLES_META.CLIENTE.bg,        Icon: ROLES_META.CLIENTE.Icon },
    { key: 'TITULAR_POLIZA',label: 'Titulares',      color: ROLES_META.TITULAR_POLIZA.color, bg: ROLES_META.TITULAR_POLIZA.bg, Icon: ROLES_META.TITULAR_POLIZA.Icon },
    { key: 'BENEFICIARIO',  label: 'Beneficiarios',  color: ROLES_META.BENEFICIARIO.color,   bg: ROLES_META.BENEFICIARIO.bg,   Icon: ROLES_META.BENEFICIARIO.Icon },
    { key: 'DIFUNTO',       label: 'Difuntos',       color: ROLES_META.DIFUNTO.color,        bg: ROLES_META.DIFUNTO.bg,        Icon: ROLES_META.DIFUNTO.Icon },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="tp-page">

        {/* ── Stats ── */}
        <div className="tp-stats">
          {KPI_ITEMS.map(k => {
            const isActive = k.key === '_total' ? filtRol === '' : filtRol === k.key
            return (
              <div key={k.key}
                className={`tp-stat${isActive ? ' active' : ''}`}
                style={{ '--sc': k.color, '--sbg': k.bg }}
                onClick={() => { setFiltRol(k.key === '_total' ? '' : k.key); setPage(1) }}
              >
                <div className="tp-stat-icon">
                  <k.Icon size={20} color={k.color}/>
                </div>
                <div>
                  <div className="tp-stat-val">{kpis[k.key] ?? 0}</div>
                  <div className="tp-stat-label">{k.label}</div>
                </div>
                {isActive && <span className="tp-stat-badge">FILTRADO</span>}
              </div>
            )
          })}
        </div>

        {/* ── Filtros + botón nuevo ── */}
        <div className="tp-bar">
          <div className="tp-search-box" style={{ flex: 2 }}>
            <Search size={14} color="#B0B5C9"/>
            <input value={q} onChange={e => onQ(e.target.value)}
              placeholder="Buscar por nombre, documento, teléfono o email…"/>
            {q && (
              <button onClick={() => { setQ(''); setPage(1) }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#B0B5C9', padding:0, lineHeight:1 }}>
                <X size={14}/>
              </button>
            )}
          </div>
          <select className="tp-sel" value={filtRol} onChange={e => { setFiltRol(e.target.value); setPage(1) }}>
            <option value="">Todos los roles</option>
            {Object.entries(ROLES_META).map(([k,m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
          <select className="tp-sel" value={filtPersona} onChange={e => { setFiltPersona(e.target.value); setPage(1) }}>
            <option value="">Natural / Jurídica</option>
            <option value="NATURAL">Persona Natural</option>
            <option value="JURIDICA">Persona Jurídica</option>
          </select>
          <select className="tp-sel" value={filtActivo} onChange={e => { setFiltActivo(e.target.value); setPage(1) }}>
            <option value="">Todos los estados</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </select>
          <button className="tp-icon-btn" onClick={cargar} title="Actualizar">
            <RefreshCw size={14} className={loading ? 'tp-spin' : ''}/>
          </button>
          <button className="tp-btn-primary" onClick={abrirNuevo}>
            <UserPlus size={15}/> Nuevo Tercero
          </button>
        </div>

        {/* ── Cuerpo ── */}
        <div className="tp-body">
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th style={{ width:'30%' }}>Tercero</th>
                  <th style={{ width:'15%' }}>Documento</th>
                  <th style={{ width:'18%' }}>Contacto</th>
                  <th style={{ width:'22%' }}>Roles</th>
                  <th style={{ width:'9%'  }}>Estado</th>
                  <th style={{ width:'6%'  }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="tp-td-plain">
                    <div className="tp-empty">
                      <Loader2 size={28} color="#2E3192" className="tp-spin" style={{ opacity:.6 }}/>
                    </div>
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="tp-td-plain">
                    <div className="tp-empty">
                      <div className="tp-empty-icon"><Users size={30} color="#9CA3AF"/></div>
                      <p>Sin resultados</p>
                      <span>Intente con otros filtros o registre un nuevo tercero</span>
                    </div>
                  </td></tr>
                ) : rows.map(t => {
                  const rolesActivos = (t.roles || []).filter(r => r.activo)
                  const isDifunto = rolesActivos.some(r => r.rol === 'DIFUNTO')
                  return (
                  <tr key={t.id} style={{ opacity: t.activo ? 1 : .55 }}>
                    <td>
                      <div className="tp-td-inner" style={{ gap:12 }}>
                        <Avatar t={isDifunto ? {...t, _difunto: true} : t} />
                        <div>
                          <div className="tp-nom">{nombreCompleto(t)}</div>
                          <div className="tp-doc" style={{ display:'flex', alignItems:'center', gap:4 }}>
                            {t.tipo_persona === 'NATURAL' ? (
                              <>
                                {t.sexo === 'M' && <span style={{color:'#60A5FA'}}>♂</span>}
                                {t.sexo === 'F' && <span style={{color:'#F472B6'}}>♀</span>}
                                {t.rh && (
                                  <span style={{ background:'#FEE2E2', color:'#DC2626', fontWeight:800,
                                    fontSize:9, padding:'1px 5px', borderRadius:4 }}>{t.rh}</span>
                                )}
                                {!t.rh && !t.sexo && <span>Persona Natural</span>}
                              </>
                            ) : <span>🏢 Persona Jurídica</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="tp-td-plain">
                      <div style={{ fontWeight:700, fontSize:13, color:'#0F1035' }}>
                        <span style={{ color:'#9CA3AF', fontWeight:600, marginRight:3 }}>{t.tipo_doc_sigla}</span>
                        {t.numero_documento}
                      </div>
                      {t.municipio_nombre && (
                        <div style={{ fontSize:11, color:'#B0B5C9', marginTop:3, display:'flex', alignItems:'center', gap:3 }}>
                          <MapPin size={9}/> {t.municipio_nombre}
                        </div>
                      )}
                    </td>
                    <td className="tp-td-plain">
                      {t.telefono ? (
                        <div style={{ fontSize:12.5, fontWeight:600, color:'#374151',
                          display:'flex', alignItems:'center', gap:5 }}>
                          <Phone size={11} color="#10B981"/>{t.telefono}
                        </div>
                      ) : null}
                      {t.email ? (
                        <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3,
                          display:'flex', alignItems:'center', gap:4 }}>
                          <Mail size={10}/>{t.email}
                        </div>
                      ) : null}
                      {!t.telefono && !t.email && (
                        <span style={{ color:'#D1D5DB', fontSize:12 }}>Sin contacto</span>
                      )}
                    </td>
                    <td className="tp-td-plain">
                      <div className="tp-roles">
                        {rolesActivos.map(r => <RolChip key={r.rol} rol={r.rol}/>)}
                        {rolesActivos.length === 0 && (
                          <span style={{ color:'#D1D5DB', fontSize:11.5 }}>Sin rol asignado</span>
                        )}
                      </div>
                    </td>
                    <td className="tp-td-plain">
                      <span className="tp-badge" style={{
                        background: t.activo ? '#D1FAE5' : '#F3F4F6',
                        color:      t.activo ? '#065F46' : '#6B7280',
                      }}>
                        <span style={{ width:6, height:6, borderRadius:'50%',
                          background: t.activo ? '#10B981' : '#9CA3AF', display:'inline-block' }}/>
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="tp-td-plain">
                      <div className="tp-acts">
                        <button className="tp-act" title="Ver ficha completa" onClick={() => setShowFicha(t.id)}>
                          <Info size={14}/>
                        </button>
                        <button className="tp-act edit" title="Editar" onClick={() => abrirEditar(t)}>
                          <Edit2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>

            {/* ── Paginación ── */}
            <div className="tp-pag">
              <span className="tp-pag-info">
                <strong style={{ color:'#374151' }}>{meta.total}</strong> tercero(s) encontrado(s) · Página {page} de {totalPag}
              </span>
              <div className="tp-pag-btns">
                <button className="tp-pag-btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>
                  <ChevronLeft size={14}/>
                </button>
                {Array.from({ length: Math.min(5, totalPag) }, (_, i) => {
                  const pg = Math.max(1, Math.min(page - 2, totalPag - 4)) + i
                  return pg <= totalPag ? (
                    <button key={pg} className={`tp-pag-btn${pg===page?' active':''}`} onClick={() => setPage(pg)}>
                      {pg}
                    </button>
                  ) : null
                })}
                <button className="tp-pag-btn" disabled={page >= totalPag} onClick={() => setPage(p => p+1)}>
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal crear/editar */}
      {showForm && (
        <ModalTercero
          tercero={editando}
          tiposDocs={tiposDocs}
          onClose={() => { setShowForm(false); setEditando(null) }}
          onSaved={() => { setShowForm(false); setEditando(null); cargar() }}
        />
      )}

      {/* Modal ficha detalle */}
      {showFicha && (
        <ModalFicha
          id={showFicha}
          tiposDocs={tiposDocs}
          onClose={() => setShowFicha(null)}
          onEditar={(t) => { setShowFicha(null); abrirEditar(t) }}
        />
      )}
    </>
  )
}
