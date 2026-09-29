/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tesorería — Comprobantes de Ingreso y Egreso         ║
 * ║  Archivo         : TesoreriaPage.jsx                                    ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Vista de caja/bancos sobre el mismo libro contable que ya alimentan POS,
 * pólizas y contratos (comprobantes_contables/asientos_contables) — no
 * duplica tablas. "Comprobante de Ingreso" = tipo RECAUDO, "Comprobante de
 * Egreso" = tipo EGRESO. El asistente de partidas libres está inspirado en
 * el módulo de Tesorería de yarom-inmobiliaria (comprobantes CI/CE con
 * banco en una pata y N partidas del PUC en la otra, sin pedirle al
 * usuario cuadrar manualmente).
 */
import { useState, useEffect, Fragment } from 'react'
import {
  Landmark, Search, Plus, ChevronLeft, ChevronRight, X, Trash2, ArrowDownCircle, ArrowUpCircle, Ban, Loader2,
  UserPlus, AlertTriangle, Eye, Printer,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { archivoUrl } from '../../utils/archivoUrl.js'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const codFmt = (c) => (c || '').replace('.', '')
const hoyISO = () => new Date().toISOString().slice(0, 10)
const primerDiaMes = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

const ESTADO_INFO = {
  CONTABILIZADO: { label: 'Contabilizado', color: '#059669', bg: '#ECFDF5' },
  ANULADO:       { label: 'Anulado',       color: '#DC2626', bg: '#FEF2F2' },
}

// ── Impresión del comprobante — tamaño carta, para archivar en soportes ────
function imprimirComprobante(comp, empresa) {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  const esIngreso = comp.tipo === 'RECAUDO'
  const emp = empresa || {}

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <title>${comp.numero}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;padding:36px;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${esIngreso ? '#059669' : '#DC2626'};padding-bottom:14px;margin-bottom:18px}
    .emp{font-size:16px;font-weight:800}
    .emp-sub{font-size:11px;color:#666;margin-top:2px}
    .tit{text-align:right}
    .tit-tipo{font-size:14px;font-weight:800;color:${esIngreso ? '#059669' : '#DC2626'}}
    .tit-num{font-size:20px;font-weight:900;font-family:ui-monospace,monospace}
    .datos{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:18px;font-size:12.5px}
    .datos .lbl{color:#888;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse;margin-bottom:18px}
    th{background:#f4f5fa;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;padding:8px 10px;text-align:left;border-bottom:1px solid #e2e5f0}
    td{padding:8px 10px;font-size:12.5px;border-bottom:1px solid #f0f0f5}
    .r{text-align:right}
    .tot td{font-weight:800;border-top:2px solid #1a1a2e;border-bottom:none}
    .firmas{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px}
    .firma{border-top:1px solid #999;padding-top:6px;text-align:center;font-size:11px;color:#666}
    @media print{ body{padding:16px} }
  </style></head><body>
    <div class="head">
      <div>
        ${emp.logo_url ? `<img src="${archivoUrl(emp.logo_url)}" style="max-width:45mm;max-height:18mm;object-fit:contain;margin-bottom:6px;display:block">` : ''}
        <div class="emp">${emp.razon_social || 'Funeraria San José de Ábrego S.A.S'}</div>
        <div class="emp-sub">NIT ${emp.nit || ''}</div>
        <div class="emp-sub">${emp.direccion || ''}${emp.telefono_1 ? ' · Tel ' + emp.telefono_1 : ''}</div>
      </div>
      <div class="tit">
        <div class="tit-tipo">COMPROBANTE DE ${esIngreso ? 'INGRESO' : 'EGRESO'}</div>
        <div class="tit-num">${comp.numero}</div>
      </div>
    </div>
    <div class="datos">
      <div><span class="lbl">Fecha</span><br>${fmtFecha(comp.fecha_contable)}</div>
      <div><span class="lbl">Referencia</span><br>${comp.referencia || '—'}</div>
      <div><span class="lbl">Tercero</span><br>${comp.tercero_nombre?.trim() || '—'}</div>
      <div><span class="lbl">Elaborado por</span><br>${comp.usuario_nombre || '—'}</div>
      <div style="grid-column:1/-1"><span class="lbl">Concepto</span><br>${comp.concepto}</div>
    </div>
    <table>
      <thead><tr><th>Cuenta</th><th>Descripción</th><th class="r">Debe</th><th class="r">Haber</th></tr></thead>
      <tbody>
        ${comp.lineas.map(l => `<tr>
          <td>${codFmt(l.cuenta_codigo)} — ${l.cuenta_nombre}</td>
          <td>${l.descripcion || ''}</td>
          <td class="r">${+l.debe > 0 ? fmt(l.debe) : ''}</td>
          <td class="r">${+l.haber > 0 ? fmt(l.haber) : ''}</td>
        </tr>`).join('')}
        <tr class="tot"><td colspan="2">TOTAL</td><td class="r">${fmt(comp.total_debe)}</td><td class="r">${fmt(comp.total_haber)}</td></tr>
      </tbody>
    </table>
    <div class="firmas">
      <div class="firma">Elaboró<br>${comp.usuario_nombre || ''}</div>
      <div class="firma">${esIngreso ? 'Recibí conforme' : 'Recibí a satisfacción'}</div>
    </div>
  </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 350)
}

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  @keyframes modalIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }
  @keyframes posSpin { to { transform:rotate(360deg) } }
  .pos-spin { animation:posSpin .7s linear infinite; }

  .ctb-page { padding:28px 32px; }
  .ctb-eyebrow { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:800;
    letter-spacing:1.2px; color:#0D9488; background:#F0FDFA; padding:4px 12px; border-radius:20px; margin-bottom:10px; }
  .ctb-head-row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:22px; flex-wrap:wrap; }
  .ctb-title { font-size:26px; font-weight:900; color:#0F1035; line-height:1.15; display:flex; align-items:center; gap:10px; }
  .ctb-sub   { font-size:13px; color:#9CA3AF; margin-top:5px; }
  .ctb-actions { display:flex; gap:10px; align-items:center; }

  .btn-primary { display:inline-flex; align-items:center; gap:7px;
    background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none; border-radius:12px;
    padding:11px 20px; font-size:13.5px; font-weight:700; cursor:pointer;
    box-shadow:0 3px 14px rgba(5,150,105,.28); transition:all .15s; }
  .btn-primary:hover { box-shadow:0 5px 20px rgba(5,150,105,.38); transform:translateY(-1px); }
  .btn-primary:disabled { opacity:.65; cursor:not-allowed; }
  .btn-egreso { background:linear-gradient(135deg,#DC2626,#B91C1C); box-shadow:0 3px 14px rgba(220,38,38,.28); }
  .btn-egreso:hover { box-shadow:0 5px 20px rgba(220,38,38,.38); }
  .btn-secondary { display:inline-flex; align-items:center; gap:7px; background:#F4F5FA; color:#374151;
    border:1.5px solid #E2E5F0; border-radius:12px; padding:11px 18px; font-size:13.5px;
    font-weight:600; cursor:pointer; transition:all .15s; }
  .btn-secondary:hover { background:#ECEDF8; }
  .btn-icon { background:#F4F5FA; border:1px solid #E8E9F8; border-radius:9px; width:34px; height:34px;
    display:inline-flex; align-items:center; justify-content:center; color:#0D9488;
    cursor:pointer; transition:all .15s; flex-shrink:0; }
  .btn-icon:hover { background:#F0FDFA; }

  .sec-card { background:#fff; border-radius:20px; border:1px solid #ECEDF8;
    box-shadow:0 1px 4px rgba(0,0,0,.04); overflow:hidden; animation:fadeUp .2s ease; }
  .sec-body { padding:22px 24px 26px; }

  .ctb-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:18px; flex-wrap:wrap; }
  .ctb-search { position:relative; flex:1; min-width:240px; }
  .ctb-search input { width:100%; padding:10px 14px 10px 34px; border:1.5px solid #E2E5F0;
    border-radius:11px; font-size:13.5px; outline:none; box-sizing:border-box; background:#FAFBFF; }
  .ctb-search svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none; }
  .select-filter { padding:10px 14px; border:1.5px solid #E2E5F0; border-radius:11px;
    font-size:13.5px; font-family:inherit; outline:none; background:#FAFBFF; color:#374151; }

  .ctb-kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
  .ctb-kpi { border:1.5px solid #ECEDF8; border-radius:14px; padding:14px 16px; background:#fff; }
  .ctb-kpi-label { font-size:10px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; opacity:.85; }
  .ctb-kpi-value { font-size:22px; font-weight:900; margin-top:4px; }

  .tbl-wrap { border:1px solid #ECEDF8; border-radius:14px; overflow:auto; }
  .tbl { width:100%; border-collapse:collapse; min-width:860px; }
  .tbl th { padding:11px 16px; background:#F8F9FF; font-size:10px; font-weight:800;
    color:#9CA3AF; text-transform:uppercase; letter-spacing:.8px; text-align:left; border-bottom:1px solid #ECEDF8; white-space:nowrap; }
  .tbl td { padding:11px 16px; font-size:13px; color:#374151; border-bottom:1px solid #F4F5FA; vertical-align:middle; }
  .tbl tr:last-child td { border-bottom:none; }
  .tbl tr:hover td { background:#FAFBFF; }
  .ctb-codigo { font-family:ui-monospace,monospace; font-weight:800; color:#0D9488;
    background:#F0FDFA; padding:2px 8px; border-radius:6px; letter-spacing:.4px; }
  .badge { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:800;
    padding:3px 10px; border-radius:20px; white-space:nowrap; }

  .ctb-empty { text-align:center; padding:50px 0; color:#9CA3AF; font-size:13px; }
  .ctb-pager { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
  .ctb-pager-info { font-size:11.5px; color:#9CA3AF; }
  .ctb-pager-btns { display:flex; gap:6px; }

  .modal-overlay { position:fixed; inset:0; background:rgba(15,16,53,.45); z-index:8000;
    display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal-box { background:#fff; border-radius:20px; width:100%; max-width:620px;
    box-shadow:0 24px 60px rgba(0,0,0,.18); animation:modalIn .22s ease; padding:24px 26px 26px;
    max-height:90vh; overflow-y:auto; }
  .modal-box.wide { max-width:920px; }
  .modal-title { font-size:16px; font-weight:800; color:#0F1035; margin-bottom:4px; }
  .campo { margin-bottom:12px; }
  .campo label { display:block; font-size:10.5px; font-weight:800; color:#6B7280;
    text-transform:uppercase; letter-spacing:.9px; margin-bottom:6px; }
  .campo input, .campo select {
    width:100%; padding:10px 14px; border:1.5px solid #E8E9F8; border-radius:10px;
    font-size:13.5px; color:#0F1035; background:#FAFBFF; outline:none; box-sizing:border-box; font-family:inherit; }

  .mov-tabla { border:1.5px solid #ECEDF8; border-radius:12px; margin-top:4px; }
  .mov-row { display:grid; grid-template-columns:1.5fr 1.2fr 1.3fr 34px 110px 110px 26px;
    gap:8px; align-items:center; padding:8px 10px; border-bottom:1px solid #F3F4F6; position:relative; }
  .mov-row:last-child { border-bottom:none; }
  .mov-head { background:#F8F9FF; font-size:9.5px; font-weight:800; color:#9CA3AF;
    text-transform:uppercase; letter-spacing:.7px; padding:8px 10px; }
  .mov-row input { width:100%; padding:8px 10px; border:1.5px solid #E8E9F8; border-radius:8px;
    font-size:12.5px; color:#0F1035; background:#FAFBFF; outline:none; box-sizing:border-box; font-family:inherit; }
  .mov-row input:disabled { background:#F4F5FA; color:#9CA3AF; }
  .mov-monto { text-align:right; font-weight:800; font-size:13px; }
  .mov-auto-tag { font-size:8.5px; font-weight:800; color:#9CA3AF; letter-spacing:.5px; display:block; text-align:right; }
  .mov-dash { text-align:center; color:#D1D5DB; font-weight:700; }
  .mov-tercero-btn { width:30px; height:34px; border-radius:8px; border:1.5px solid #E2E5F0; background:#fff;
    color:#6B7280; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .mov-tercero-btn:hover { background:#F0FDFA; color:#0D9488; }
  .mov-sumas { display:grid; grid-template-columns:1.5fr 1.2fr 1.3fr 34px 110px 110px 26px;
    gap:8px; padding:10px; background:#FAFBFF; font-size:12.5px; font-weight:800; color:#0F1035; }
  .mov-agregar { padding:10px; text-align:center; border-top:1px dashed #ECEDF8; }
  .mov-warn { background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; border-radius:10px;
    padding:11px 14px; font-size:12.5px; font-weight:600; margin-top:14px; display:flex; align-items:center; gap:8px; }

  .buscador-pop { position:absolute; top:100%; left:0; right:0; z-index:40; background:#fff;
    border:1.5px solid #E2E5F0; border-radius:10px; margin-top:4px; max-height:220px; overflow-y:auto;
    box-shadow:0 8px 24px rgba(15,16,53,.12); }
  .buscador-pop-item { padding:8px 12px; cursor:pointer; font-size:12.5px; border-bottom:1px solid #F3F4F6; }
  .buscador-pop-item:hover { background:#F8F9FF; }

  .toggle-persona { display:flex; gap:8px; margin-bottom:14px; }
  .toggle-persona button { flex:1; padding:10px; border-radius:10px; border:1.5px solid #E2E5F0;
    background:#fff; font-size:12.5px; font-weight:700; color:#374151; cursor:pointer; }
  .toggle-persona button.active { border-color:#0D9488; color:#0D9488; background:#F0FDFA; }

  @media (max-width: 680px) { .ctb-kpis { grid-template-columns:1fr; } }
`

// ── Buscador genérico con dropdown (cuentas PUC o terceros) ────────────────
function Buscador({ placeholder, valorTexto, onBuscar, opciones, renderOpcion, onElegir, minWidth }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div style={{ position: 'relative', minWidth }}>
      <input placeholder={placeholder} value={valorTexto}
        onChange={e => { onBuscar(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)} />
      {abierto && opciones.length > 0 && (
        <div className="buscador-pop">
          {opciones.map((o, i) => (
            <div key={i} className="buscador-pop-item" onMouseDown={e => e.preventDefault()}
              onClick={() => { onElegir(o); setAbierto(false) }}>
              {renderOpcion(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const tercerNombre = (t) => t.razon_social || `${t.nombres || ''} ${t.apellidos || ''}`.trim()

// ── Modal: crear tercero rápido (proveedor) sin salir del comprobante ──────
function ModalTerceroRapido({ onClose, onCreado }) {
  const [tiposDoc, setTiposDoc] = useState([])
  const [tipoPersona, setTipoPersona] = useState('NATURAL')
  const [form, setForm] = useState({ tipo_documento_id: '', numero_documento: '', nombres: '', apellidos: '', razon_social: '', telefono: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/tipos-documento/select').then(r => {
      const lista = r.data?.data || []
      setTiposDoc(lista)
      const cc = lista.find(t => t.sigla === 'CC')
      if (cc) setForm(p => ({ ...p, tipo_documento_id: cc.id }))
    }).catch(() => {})
  }, [])

  const crear = async () => {
    if (!form.tipo_documento_id) return toast.error('Selecciona el tipo de documento')
    if (!form.numero_documento.trim()) return toast.error('El número de documento es obligatorio')
    if (tipoPersona === 'NATURAL' && (!form.nombres.trim() || !form.apellidos.trim()))
      return toast.error('Nombres y apellidos son obligatorios')
    if (tipoPersona === 'JURIDICA' && !form.razon_social.trim())
      return toast.error('La razón social es obligatoria')

    setSaving(true)
    try {
      const res = await api.post('/terceros', {
        tipo_documento_id: form.tipo_documento_id,
        numero_documento: form.numero_documento.trim(),
        tipo_persona: tipoPersona,
        nombres: tipoPersona === 'NATURAL' ? form.nombres.trim() : null,
        apellidos: tipoPersona === 'NATURAL' ? form.apellidos.trim() : null,
        razon_social: tipoPersona === 'JURIDICA' ? form.razon_social.trim() : null,
        telefono: form.telefono.trim() || null,
        roles: ['PROVEEDOR'],
      })
      toast.success('Proveedor creado con éxito')
      onCreado(res.data.data)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al crear el proveedor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9000 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>Nuevo proveedor</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div className="toggle-persona">
          <button className={tipoPersona === 'NATURAL' ? 'active' : ''} onClick={() => setTipoPersona('NATURAL')}>Persona natural</button>
          <button className={tipoPersona === 'JURIDICA' ? 'active' : ''} onClick={() => setTipoPersona('JURIDICA')}>Empresa</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="campo">
            <label>Tipo de documento</label>
            <select value={form.tipo_documento_id} onChange={e => setForm(p => ({ ...p, tipo_documento_id: e.target.value }))}>
              <option value="">Selecciona…</option>
              {tiposDoc.map(t => <option key={t.id} value={t.id}>{t.sigla}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Número</label>
            <input value={form.numero_documento} onChange={e => setForm(p => ({ ...p, numero_documento: e.target.value }))} />
          </div>
        </div>

        {tipoPersona === 'NATURAL' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="campo"><label>Nombres</label>
              <input value={form.nombres} onChange={e => setForm(p => ({ ...p, nombres: e.target.value }))} /></div>
            <div className="campo"><label>Apellidos</label>
              <input value={form.apellidos} onChange={e => setForm(p => ({ ...p, apellidos: e.target.value }))} /></div>
          </div>
        ) : (
          <div className="campo"><label>Razón social</label>
            <input value={form.razon_social} onChange={e => setForm(p => ({ ...p, razon_social: e.target.value }))} /></div>
        )}

        <div className="campo"><label>Teléfono</label>
          <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} /></div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={crear} disabled={saving}>
            {saving ? <Loader2 size={14} className="pos-spin" /> : 'Registrar proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lineaVacia = () => ({
  cuenta_codigo: '', buscCuenta: '', opcCuentas: [],
  descripcion: '', valor: '',
  tercero_id: '', tercero_nombre: '', buscTercero: '', opcTerceros: [],
})

// ── Modal: asistente de comprobante (Ingreso o Egreso) — tabla única con la
// cuenta de caja/banco como primera fila (monto automático = suma de las
// demás líneas) y N partidas libres, igual al flujo de yarom-inmobiliaria.
function ModalComprobante({ tipo, onClose, onCreado }) {
  const esIngreso = tipo === 'INGRESO'
  const [fecha, setFecha] = useState(hoyISO())
  const [concepto, setConcepto] = useState('')
  const [referencia, setReferencia] = useState('')
  const [principal, setPrincipal] = useState(lineaVacia())
  const [partidas, setPartidas] = useState([lineaVacia()])
  const [terceroRapidoPara, setTerceroRapidoPara] = useState(null) // null | 'principal' | índice de partida
  const [guardando, setGuardando] = useState(false)

  const buscarCuenta = (esPrincipal, idx, texto) => {
    const setLinea = (fn) => esPrincipal ? setPrincipal(prev => fn(prev)) : setPartidas(prev => prev.map((p, i) => i === idx ? fn(p) : p))
    setLinea(l => ({ ...l, buscCuenta: texto, cuenta_codigo: '' }))
    if (!texto.trim()) return
    api.get('/contabilidad/puc/select', { params: { q: texto.trim() } }).then(r => {
      setLinea(l => ({ ...l, opcCuentas: r.data.data || [] }))
    }).catch(() => {})
  }
  const elegirCuenta = (esPrincipal, idx, cuenta) => {
    const setLinea = (fn) => esPrincipal ? setPrincipal(prev => fn(prev)) : setPartidas(prev => prev.map((p, i) => i === idx ? fn(p) : p))
    setLinea(l => ({ ...l, cuenta_codigo: cuenta.codigo, buscCuenta: `${codFmt(cuenta.codigo)} ${cuenta.nombre}`, opcCuentas: [] }))
  }

  const buscarTercero = (esPrincipal, idx, texto) => {
    const setLinea = (fn) => esPrincipal ? setPrincipal(prev => fn(prev)) : setPartidas(prev => prev.map((p, i) => i === idx ? fn(p) : p))
    setLinea(l => ({ ...l, buscTercero: texto, tercero_id: '', tercero_nombre: '' }))
    if (!texto.trim()) return
    api.get('/terceros/select', { params: { q: texto.trim() } }).then(r => {
      setLinea(l => ({ ...l, opcTerceros: r.data.data || [] }))
    }).catch(() => {})
  }
  const elegirTercero = (esPrincipal, idx, t) => {
    const setLinea = (fn) => esPrincipal ? setPrincipal(prev => fn(prev)) : setPartidas(prev => prev.map((p, i) => i === idx ? fn(p) : p))
    setLinea(l => ({ ...l, tercero_id: t.id, tercero_nombre: tercerNombre(t), buscTercero: '', opcTerceros: [] }))
  }
  const onTerceroCreado = (t) => {
    const esPrincipal = terceroRapidoPara === 'principal'
    elegirTercero(esPrincipal, esPrincipal ? null : terceroRapidoPara, t)
    setTerceroRapidoPara(null)
  }

  const actualizarPartida = (idx, campo, val) => setPartidas(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: val } : p))
  const agregarPartida = () => setPartidas(prev => [...prev, lineaVacia()])
  const quitarPartida = (idx) => setPartidas(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  const total = partidas.reduce((a, p) => a + (+p.valor || 0), 0)
  const faltaCuentaPrincipal = !principal.cuenta_codigo

  const guardar = async () => {
    if (faltaCuentaPrincipal) return toast.error('Falta seleccionar la cuenta de caja o banco')
    if (!concepto.trim()) return toast.error('El concepto es obligatorio')
    const partidasValidas = partidas.filter(p => p.cuenta_codigo && +p.valor > 0)
    if (!partidasValidas.length) return toast.error('Agrega al menos una línea con cuenta y valor')

    setGuardando(true)
    try {
      await api.post('/tesoreria/comprobantes', {
        tipo,
        cuenta_principal_codigo: principal.cuenta_codigo,
        tercero_id: principal.tercero_id || null,
        fecha_contable: fecha,
        concepto: concepto.trim(),
        referencia: referencia.trim() || null,
        partidas: partidasValidas.map(p => ({
          cuenta_codigo: p.cuenta_codigo, descripcion: p.descripcion || null,
          tercero_id: p.tercero_id || null, valor: +p.valor,
        })),
      })
      toast.success(`Comprobante de ${esIngreso ? 'ingreso' : 'egreso'} registrado con éxito`)
      onCreado()
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo registrar el comprobante')
    } finally {
      setGuardando(false)
    }
  }

  // En INGRESO la cuenta principal recibe DÉBITO y las partidas van a HABER;
  // en EGRESO es al revés — la UI muestra "$0 AUTOMÁTICO" en la columna que
  // le corresponde a cada tipo y "–" en la que no aplica, como en la
  // referencia de yarom-inmobiliaria.
  const colPrincipalDebe = esIngreso
  const filaCuenta = (esPrincipal, idx, linea, placeholder) => (
    <Buscador placeholder={placeholder} minWidth="100%"
      valorTexto={linea.buscCuenta} onBuscar={(t) => buscarCuenta(esPrincipal, idx, t)}
      opciones={linea.opcCuentas}
      renderOpcion={(c) => <><span className="ctb-codigo" style={{ fontSize: 10 }}>{codFmt(c.codigo)}</span> {c.nombre}</>}
      onElegir={(c) => elegirCuenta(esPrincipal, idx, c)} />
  )
  const filaTercero = (esPrincipal, idx, linea) => (
    <div style={{ display: 'flex', gap: 4 }}>
      <Buscador placeholder={esPrincipal ? 'Opcional…' : 'Opcional…'} minWidth="100%"
        valorTexto={linea.tercero_nombre || linea.buscTercero} onBuscar={(t) => buscarTercero(esPrincipal, idx, t)}
        opciones={linea.opcTerceros}
        renderOpcion={(t) => <>{tercerNombre(t)} {t.numero_documento ? <span style={{ color: '#9CA3AF' }}>· {t.numero_documento}</span> : ''}</>}
        onElegir={(t) => elegirTercero(esPrincipal, idx, t)} />
      <button className="mov-tercero-btn" title="Nuevo proveedor" onClick={() => setTerceroRapidoPara(esPrincipal ? 'principal' : idx)}>
        <UserPlus size={14} />
      </button>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box wide">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: esIngreso ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#DC2626,#B91C1C)' }}>
            {esIngreso ? <ArrowDownCircle size={19} color="#fff" /> : <ArrowUpCircle size={19} color="#fff" />}
          </div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ marginBottom: 1 }}>Nuevo comprobante de {esIngreso ? 'ingreso' : 'egreso'}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{esIngreso ? 'Dinero que entra a caja o banco' : 'Dinero que sale de caja o banco'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: 12 }}>
          <div className="campo">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="campo">
            <label>Concepto <span style={{ color: '#EF4444' }}>*</span></label>
            <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej: Pago cuota del préstamo" />
          </div>
          <div className="campo">
            <label>Referencia <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
            <input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: REF-90001" />
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.9px', marginBottom: 6 }}>
          Detalle del movimiento
        </label>
        <div className="mov-tabla">
          <div className="mov-row mov-head">
            <span>Cuenta</span><span>Descripción</span><span>Tercero</span><span></span><span style={{ textAlign: 'right' }}>Debe</span><span style={{ textAlign: 'right' }}>Haber</span><span></span>
          </div>

          {/* Fila fija: cuenta de caja/banco — monto siempre automático */}
          <div className="mov-row">
            {filaCuenta(true, null, principal, 'Caja o banco…')}
            <input value={principal.descripcion} placeholder={concepto || 'Descripción'}
              onChange={e => setPrincipal(p => ({ ...p, descripcion: e.target.value }))} />
            {filaTercero(true, null, principal)}
            <span />
            <div>
              {colPrincipalDebe ? <><div className="mov-monto">{fmt(total)}</div><span className="mov-auto-tag">AUTOMÁTICO</span></> : <div className="mov-dash">–</div>}
            </div>
            <div>
              {!colPrincipalDebe ? <><div className="mov-monto">{fmt(total)}</div><span className="mov-auto-tag">AUTOMÁTICO</span></> : <div className="mov-dash">–</div>}
            </div>
            <span />
          </div>

          {/* Partidas libres */}
          {partidas.map((p, idx) => (
            <div key={idx} className="mov-row">
              {filaCuenta(false, idx, p, 'Cuenta contra la que cruza…')}
              <input value={p.descripcion} placeholder={concepto || 'Descripción'}
                onChange={e => actualizarPartida(idx, 'descripcion', e.target.value)} />
              {filaTercero(false, idx, p)}
              <span />
              <div>{!colPrincipalDebe ? <input type="number" min="0" placeholder="Valor" value={p.valor} onChange={e => actualizarPartida(idx, 'valor', e.target.value)} style={{ textAlign: 'right' }} /> : <div className="mov-dash">–</div>}</div>
              <div>{colPrincipalDebe ? <input type="number" min="0" placeholder="Valor" value={p.valor} onChange={e => actualizarPartida(idx, 'valor', e.target.value)} style={{ textAlign: 'right' }} /> : <div className="mov-dash">–</div>}</div>
              <button onClick={() => quitarPartida(idx)} style={{ background: 'none', border: 'none', cursor: partidas.length > 1 ? 'pointer' : 'default',
                color: partidas.length > 1 ? '#EF4444' : '#E5E7EB' }} disabled={partidas.length <= 1}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div className="mov-sumas">
            <span>SUMAS IGUALES</span><span /><span /><span />
            <span style={{ textAlign: 'right' }}>{fmt(total)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(total)}</span>
            <span />
          </div>

          <div className="mov-agregar">
            <button onClick={agregarPartida}
              style={{ background: 'none', border: 'none', color: esIngreso ? '#059669' : '#DC2626', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} /> Agregar línea
            </button>
          </div>
        </div>

        {faltaCuentaPrincipal && (
          <div className="mov-warn"><AlertTriangle size={14} /> Falta seleccionar la cuenta de caja o banco</div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
          <button className={`btn-primary ${esIngreso ? '' : 'btn-egreso'}`} style={{ flex: 1, justifyContent: 'center' }}
            onClick={guardar} disabled={guardando || total <= 0 || faltaCuentaPrincipal}>
            {guardando ? <Loader2 size={14} className="pos-spin" /> : (esIngreso ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />)}
            Registrar {esIngreso ? 'ingreso' : 'egreso'}
          </button>
        </div>
      </div>

      {terceroRapidoPara !== null && (
        <ModalTerceroRapido onClose={() => setTerceroRapidoPara(null)} onCreado={onTerceroCreado} />
      )}
    </div>
  )
}

// ── Modal: anular comprobante (pide motivo) ─────────────────────────────────
function ModalAnular({ comprobante, onClose, onAnulado }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const confirmar = async () => {
    if (!motivo.trim()) return toast.error('Escribe el motivo de la anulación')
    setEnviando(true)
    try {
      await api.post(`/tesoreria/comprobantes/${comprobante.id}/anular`, { motivo: motivo.trim() })
      toast.success('Comprobante anulado con éxito')
      onAnulado()
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo anular el comprobante')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-title" style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ban size={17} /> Anular {comprobante.numero}
        </div>
        <div style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 14 }}>
          Se creará un comprobante de reversión — el original no se borra, queda trazable para auditoría.
        </div>
        <div className="campo">
          <label>Motivo <span style={{ color: '#EF4444' }}>*</span></label>
          <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Se registró con la cuenta equivocada" autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
          <button className="btn-primary btn-egreso" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmar} disabled={enviando}>
            {enviando ? <Loader2 size={14} className="pos-spin" /> : <Ban size={14} />} Anular
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TesoreriaPage() {
  const [comprobantes, setComprobantes] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoyISO())
  const [pagina, setPagina] = useState(1)
  const [expandido, setExpandido] = useState(new Set())
  const [detalle, setDetalle] = useState({})
  const [modalTipo, setModalTipo] = useState(null)
  const [anulando, setAnulando] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const LIMIT = 20

  useEffect(() => { api.get('/empresa').then(r => setEmpresa(r.data.data)).catch(() => {}) }, [])

  const cargar = async (p = pagina) => {
    setLoading(true)
    try {
      const params = { page: p, limit: LIMIT, desde, hasta }
      if (q.trim()) params.q = q.trim()
      if (tipoFiltro) params.tipo = tipoFiltro
      const r = await api.get('/tesoreria/comprobantes', { params })
      setComprobantes(r.data.data || [])
      setMeta(r.data.meta || null)
    } catch {
      toast.error('No se pudieron cargar los comprobantes de tesorería')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar(1); setPagina(1) }, [desde, hasta, tipoFiltro])
  useEffect(() => { const t = setTimeout(() => { cargar(1); setPagina(1) }, 300); return () => clearTimeout(t) }, [q])
  useEffect(() => { cargar(pagina) }, [pagina])

  const toggle = async (c) => {
    setExpandido(prev => {
      const next = new Set(prev)
      next.has(c.id) ? next.delete(c.id) : next.add(c.id)
      return next
    })
    if (!detalle[c.id]) {
      try {
        const r = await api.get(`/tesoreria/comprobantes/${c.id}`)
        setDetalle(prev => ({ ...prev, [c.id]: r.data.data }))
      } catch { /* se puede reintentar al volver a expandir */ }
    }
  }

  const imprimir = async (c) => {
    let d = detalle[c.id]
    if (!d) {
      try {
        const r = await api.get(`/tesoreria/comprobantes/${c.id}`)
        d = r.data.data
        setDetalle(prev => ({ ...prev, [c.id]: d }))
      } catch {
        return toast.error('No se pudo cargar el comprobante para imprimir')
      }
    }
    imprimirComprobante(d, empresa)
  }

  const totalPaginas = Math.max(1, Math.ceil((meta?.total || 0) / LIMIT))

  return (
    <div className="ctb-page">
      <style>{CSS}</style>

      <div className="ctb-eyebrow"><Landmark size={12} /> TESORERÍA</div>

      <div className="ctb-head-row">
        <div>
          <div className="ctb-title">Comprobantes de Ingreso y Egreso</div>
          <div className="ctb-sub">Caja y bancos — se contabiliza automáticamente al registrarlos</div>
        </div>
        <div className="ctb-actions">
          <button className="btn-primary" onClick={() => setModalTipo('INGRESO')}>
            <ArrowDownCircle size={15} /> Nuevo ingreso
          </button>
          <button className="btn-primary btn-egreso" onClick={() => setModalTipo('EGRESO')}>
            <ArrowUpCircle size={15} /> Nuevo egreso
          </button>
        </div>
      </div>

      {meta && (
        <div className="ctb-kpis">
          <div className="ctb-kpi" style={{ background: '#ECFDF5' }}>
            <div className="ctb-kpi-label" style={{ color: '#059669' }}>Total ingresos</div>
            <div className="ctb-kpi-value" style={{ color: '#059669' }}>{fmt(meta.total_ingresos)}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#FEF2F2' }}>
            <div className="ctb-kpi-label" style={{ color: '#DC2626' }}>Total egresos</div>
            <div className="ctb-kpi-value" style={{ color: '#DC2626' }}>{fmt(meta.total_egresos)}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#EEF2FF' }}>
            <div className="ctb-kpi-label" style={{ color: '#2E3192' }}>Saldo neto del período</div>
            <div className="ctb-kpi-value" style={{ color: '#2E3192' }}>{fmt(meta.total_ingresos - meta.total_egresos)}</div>
          </div>
        </div>
      )}

      <div className="sec-card">
        <div className="sec-body">
          <div className="ctb-toolbar">
            <div className="ctb-search">
              <Search size={14} color="#9CA3AF" />
              <input placeholder="Buscar por número o concepto…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <select className="select-filter" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="INGRESO">Solo ingresos</option>
              <option value="EGRESO">Solo egresos</option>
            </select>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="select-filter" style={{ fontFamily: 'inherit' }} />
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>hasta</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="select-filter" style={{ fontFamily: 'inherit' }} />
          </div>

          {loading ? (
            <div className="ctb-empty">Cargando comprobantes…</div>
          ) : comprobantes.length === 0 ? (
            <div className="ctb-empty">No hay comprobantes de tesorería en este rango todavía.</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th></th><th>Comprobante</th><th>Fecha</th><th>Concepto</th>
                    <th>Tercero</th><th>Origen</th><th style={{ textAlign: 'right' }}>Monto</th>
                    <th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map(c => {
                    const abierto = expandido.has(c.id)
                    const ei = ESTADO_INFO[c.estado] || {}
                    const esIngreso = c.tipo === 'RECAUDO'
                    const d = detalle[c.id]
                    return (
                      <Fragment key={c.id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => toggle(c)}>
                          <td style={{ width: 24, color: '#9CA3AF' }}>
                            {abierto ? <ChevronLeft size={14} style={{ transform: 'rotate(-90deg)' }} /> : <ChevronRight size={14} />}
                          </td>
                          <td><span className="ctb-codigo">{c.numero}</span></td>
                          <td>{fmtFecha(c.fecha_contable)}</td>
                          <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.concepto}</td>
                          <td>{c.tercero_nombre?.trim() || '—'}</td>
                          <td>
                            <span className="badge" style={{ background: c.es_manual ? '#FFFBEB' : '#F4F5FA', color: c.es_manual ? '#D97706' : '#6B7280' }}>
                              {c.es_manual ? 'Manual' : 'Automático'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: esIngreso ? '#059669' : '#DC2626' }}>
                            {esIngreso ? '+' : '−'}{fmt(c.total_debe)}
                          </td>
                          <td><span className="badge" style={{ background: ei.bg, color: ei.color }}>{ei.label}</span></td>
                          <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-icon" title="Ver detalle" onClick={() => toggle(c)}>
                              <Eye size={14} />
                            </button>
                            <button className="btn-icon" title="Imprimir comprobante" onClick={() => imprimir(c)}>
                              <Printer size={14} />
                            </button>
                            {c.es_manual && c.estado === 'CONTABILIZADO' && (
                              <button className="btn-icon" style={{ color: '#DC2626' }} title="Anular" onClick={() => setAnulando(c)}>
                                <Ban size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                        {abierto && (
                          <tr>
                            <td></td>
                            <td colSpan={8} style={{ padding: '0 16px 14px' }}>
                              {!d ? (
                                <div style={{ padding: 12, fontSize: 12, color: '#9CA3AF' }}>Cargando líneas…</div>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FAFBFF', borderRadius: 10, overflow: 'hidden' }}>
                                  <thead>
                                    <tr style={{ fontSize: 10.5, color: '#9CA3AF', textTransform: 'uppercase' }}>
                                      <td style={{ padding: '6px 10px' }}>Cuenta</td>
                                      <td style={{ padding: '6px 10px' }}>Descripción</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#059669' }}>Débito</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#7C3AED' }}>Crédito</td>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {d.lineas.map(l => (
                                      <tr key={l.id} style={{ fontSize: 12.5 }}>
                                        <td style={{ padding: '6px 10px' }}><span className="ctb-codigo">{codFmt(l.cuenta_codigo)}</span> {l.cuenta_nombre}</td>
                                        <td style={{ padding: '6px 10px', color: '#6B7280' }}>{l.descripcion}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{+l.debe > 0 ? fmt(l.debe) : ''}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>{+l.haber > 0 ? fmt(l.haber) : ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="ctb-pager">
              <span className="ctb-pager-info">Página {pagina} de {totalPaginas} · {meta?.total} comprobantes</span>
              <div className="ctb-pager-btns">
                <button className="btn-icon" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  style={{ opacity: pagina === 1 ? .4 : 1 }}><ChevronLeft size={14} /></button>
                <button className="btn-icon" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  style={{ opacity: pagina === totalPaginas ? .4 : 1 }}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalTipo && (
        <ModalComprobante tipo={modalTipo} onClose={() => setModalTipo(null)}
          onCreado={() => { setModalTipo(null); cargar(1); setPagina(1) }} />
      )}
      {anulando && (
        <ModalAnular comprobante={anulando} onClose={() => setAnulando(null)}
          onAnulado={() => { setAnulando(null); setDetalle(prev => { const n = { ...prev }; delete n[anulando.id]; return n }); cargar(pagina) }} />
      )}
    </div>
  )
}
