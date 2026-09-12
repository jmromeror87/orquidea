/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contabilidad — Plan de Cuentas (PUC)                 ║
 * ║  Archivo         : ContabilidadPage.jsx                                 ║
 * ║  Versión         : v2.0.0                                               ║
 * ║  Fecha           : 2026-09-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useMemo, Fragment } from 'react'
import {
  BookOpen, Search, Check, Pencil, Power, RefreshCw, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import ReportesFinancierosTab from './ReportesFinancierosTab.jsx'
import FlujoCajaTab from './FlujoCajaTab.jsx'

const TIPOS = [
  { key: 'ACTIVO',            label: 'Activo',      color: '#059669', bg: '#ECFDF5' },
  { key: 'PASIVO',             label: 'Pasivo',       color: '#DC2626', bg: '#FEF2F2' },
  { key: 'PATRIMONIO',        label: 'Patrimonio',  color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'INGRESO',           label: 'Ingreso',      color: '#2563EB', bg: '#EFF6FF' },
  { key: 'GASTO',             label: 'Gasto',        color: '#D97706', bg: '#FFFBEB' },
  { key: 'COSTO_VENTAS',      label: 'Costo Ventas', color: '#0891B2', bg: '#ECFEFF' },
  { key: 'COSTO_PRODUCCION',  label: 'Costo Prod.',  color: '#BE185D', bg: '#FDF2F8' },
]

const ORIGEN_INFO = {
  TNS_VERIFICADA:     { label: 'Verificada TNS',      color: '#059669', bg: '#ECFDF5' },
  PUC_ESTANDAR:       { label: 'PUC estándar',        color: '#2563EB', bg: '#EFF6FF' },
  PUC_COMPLEMENTARIO: { label: 'Por validar',          color: '#D97706', bg: '#FFFBEB' },
  ORQUIDEA:           { label: 'Propuesta Orquídea',  color: '#7C3AED', bg: '#F5F3FF' },
}

const PAGE_SIZE = 25
const NIVEL_LABEL = { 1: 'Clase', 2: 'Grupo', 3: 'Cuenta', 4: 'Subcuenta', 5: 'Auxiliar' }

// El punto (ej. "111005.01") es solo la forma en que Orquídea distingue el
// auxiliar internamente — los sistemas contables reales lo muestran como un
// único número corrido. Se oculta solo en pantalla; el dato en base sigue
// con el punto para no romper las relaciones con asientos y reglas.
const codFmt = (codigo) => (codigo || '').replace('.', '')

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  @keyframes modalIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }

  .ctb-page { padding:28px 32px; }
  .ctb-eyebrow { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:800;
    letter-spacing:1.2px; color:#4338CA; background:#EEF2FF; padding:4px 12px; border-radius:20px; margin-bottom:10px; }
  .ctb-head-row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:22px; flex-wrap:wrap; }
  .ctb-title { font-size:26px; font-weight:900; color:#0F1035; line-height:1.15; display:flex; align-items:center; gap:10px; }
  .ctb-sub   { font-size:13px; color:#9CA3AF; margin-top:5px; }
  .ctb-actions { display:flex; gap:10px; align-items:center; }

  .btn-primary { display:inline-flex; align-items:center; gap:7px;
    background:linear-gradient(135deg,#2E3192,#4338CA); color:#fff; border:none; border-radius:12px;
    padding:11px 20px; font-size:13.5px; font-weight:700; cursor:pointer;
    box-shadow:0 3px 14px rgba(46,49,146,.28); transition:all .15s; }
  .btn-primary:hover { box-shadow:0 5px 20px rgba(46,49,146,.38); transform:translateY(-1px); }
  .btn-primary:disabled { opacity:.65; cursor:not-allowed; }
  .btn-secondary { display:inline-flex; align-items:center; gap:7px; background:#F4F5FA; color:#374151;
    border:1.5px solid #E2E5F0; border-radius:12px; padding:11px 18px; font-size:13.5px;
    font-weight:600; cursor:pointer; transition:all .15s; }
  .btn-secondary:hover { background:#ECEDF8; }
  .btn-icon { background:#F4F5FA; border:1px solid #E8E9F8; border-radius:9px; width:34px; height:34px;
    display:inline-flex; align-items:center; justify-content:center; color:#6366F1;
    cursor:pointer; transition:all .15s; flex-shrink:0; }
  .btn-icon:hover { background:#EEF0FF; }

  .sec-card { background:#fff; border-radius:20px; border:1px solid #ECEDF8;
    box-shadow:0 1px 4px rgba(0,0,0,.04); overflow:hidden; animation:fadeUp .2s ease; }
  .sec-body { padding:22px 24px 26px; }

  .ctb-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:18px; flex-wrap:wrap; }
  .ctb-search { position:relative; flex:1; min-width:260px; }
  .ctb-search input { width:100%; padding:10px 14px 10px 34px; border:1.5px solid #E2E5F0;
    border-radius:11px; font-size:13.5px; outline:none; box-sizing:border-box; background:#FAFBFF; }
  .ctb-search svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none; }
  .select-filter { padding:10px 14px; border:1.5px solid #E2E5F0; border-radius:11px;
    font-size:13.5px; font-family:inherit; outline:none; background:#FAFBFF; color:#374151; }

  .ctb-kpis { display:grid; grid-template-columns:repeat(7,1fr); gap:10px; margin-bottom:20px; }
  .ctb-kpi { border:1.5px solid #ECEDF8; border-radius:14px; padding:14px 16px; cursor:pointer;
    transition:all .15s; background:#fff; text-align:left; }
  .ctb-kpi:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.06); }
  .ctb-kpi.active { border-color:currentColor; box-shadow:0 0 0 2px currentColor inset; }
  .ctb-kpi-label { font-size:10px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; opacity:.85; }
  .ctb-kpi-value { font-size:24px; font-weight:900; margin-top:4px; }

  .tbl-wrap { border:1px solid #ECEDF8; border-radius:14px; overflow:auto; }
  .tbl { width:100%; border-collapse:collapse; min-width:760px; }
  .tbl th { padding:11px 16px; background:#F8F9FF; font-size:10px; font-weight:800;
    color:#9CA3AF; text-transform:uppercase; letter-spacing:.8px; text-align:left; border-bottom:1px solid #ECEDF8; white-space:nowrap; }
  .tbl td { padding:11px 16px; font-size:13px; color:#374151; border-bottom:1px solid #F4F5FA; vertical-align:middle; }
  .tbl tr:last-child td { border-bottom:none; }
  .tbl tr:hover td { background:#FAFBFF; }
  .ctb-codigo { font-family:ui-monospace,monospace; font-weight:800; color:#2E3192;
    background:#EEF2FF; padding:2px 8px; border-radius:6px; letter-spacing:.4px; }
  .ctb-nombre-cell strong { display:block; color:#0F1035; }
  .ctb-ruta { font-size:10.5px; color:#B0B4D0; margin-bottom:1px; letter-spacing:.1px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:360px; }
  .badge { display:inline-flex; align-items:center; font-size:10.5px; font-weight:800;
    padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .nat-pill { width:26px; height:22px; border-radius:6px; display:inline-flex; align-items:center;
    justify-content:center; font-size:11px; font-weight:800; }
  .mov-yes { color:#059669; display:inline-flex; }

  .ctb-empty { text-align:center; padding:50px 0; color:#9CA3AF; font-size:13px; }
  .ctb-pager { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
  .ctb-pager-info { font-size:11.5px; color:#9CA3AF; }
  .ctb-pager-btns { display:flex; gap:6px; }

  .modal-overlay { position:fixed; inset:0; background:rgba(15,16,53,.45); z-index:8000;
    display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal-box { background:#fff; border-radius:20px; width:100%; max-width:460px;
    box-shadow:0 24px 60px rgba(0,0,0,.18); animation:modalIn .22s ease; padding:24px 26px 26px; }
  .modal-title { font-size:16px; font-weight:800; color:#0F1035; margin-bottom:18px; }
  .campo { margin-bottom:12px; }
  .campo label { display:block; font-size:10.5px; font-weight:800; color:#6B7280;
    text-transform:uppercase; letter-spacing:.9px; margin-bottom:6px; }
  .campo input[type=text], .campo input:not([type]) {
    width:100%; padding:10px 14px; border:1.5px solid #E8E9F8; border-radius:10px;
    font-size:13.5px; color:#0F1035; background:#FAFBFF; outline:none; box-sizing:border-box; }

  @media (max-width: 1100px) { .ctb-kpis { grid-template-columns:repeat(4,1fr); } }
  @media (max-width: 680px)  { .ctb-kpis { grid-template-columns:repeat(2,1fr); } }
`

function tipoInfo(tipo) {
  return TIPOS.find(t => t.key === tipo) || { label: tipo, color: '#6B7280', bg: '#F4F5FA' }
}

function TabPlanCuentas() {
  const [cuentas, setCuentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busq, setBusq] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)
  const [creando, setCreando] = useState(null)
  const [buscarPadre, setBuscarPadre] = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const r = await api.get('/contabilidad/puc')
      setCuentas(r.data.data || [])
    } catch {
      toast.error('No se pudo cargar el catálogo de cuentas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const cuentaPorCodigo = useMemo(() => {
    const m = new Map()
    cuentas.forEach(c => m.set(c.codigo, c))
    return m
  }, [cuentas])

  // Ruta completa desde la clase hasta el padre inmediato — así se ve la
  // jerarquía del PUC de un vistazo, igual que en un ERP contable
  // profesional (Activo › Disponible › Bancos › Moneda Nacional).
  const rutaPadre = (codigo) => {
    const partes = []
    let actual = cuentaPorCodigo.get(codigo)
    while (actual?.padre_codigo) {
      const padre = cuentaPorCodigo.get(actual.padre_codigo)
      if (!padre) break
      partes.unshift(padre.nombre)
      actual = padre
    }
    return partes
  }

  const kpis = useMemo(() => {
    const conteo = {}
    TIPOS.forEach(t => { conteo[t.key] = 0 })
    cuentas.forEach(c => { if (conteo[c.tipo] !== undefined) conteo[c.tipo]++ })
    return conteo
  }, [cuentas])

  const filtradas = useMemo(() => {
    const q = busq.trim().toLowerCase()
    return cuentas
      .filter(c => !tipoFiltro || c.tipo === tipoFiltro)
      .filter(c => !q || c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
  }, [cuentas, tipoFiltro, busq])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE))
  const paginaSeg = Math.min(pagina, totalPaginas)
  const pageItems = filtradas.slice((paginaSeg - 1) * PAGE_SIZE, paginaSeg * PAGE_SIZE)

  const cambiarTipoFiltro = (key) => { setTipoFiltro(cur => cur === key ? '' : key); setPagina(1) }
  const cambiarBusq = (e) => { setBusq(e.target.value); setPagina(1) }

  const onEditar = (nodo) => setEditando({ ...nodo })

  const guardarEdicion = async () => {
    if (!editando?.nombre?.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await api.put(`/contabilidad/puc/${editando.codigo}`, {
        nombre: editando.nombre,
        requiere_tercero: editando.requiere_tercero,
        requiere_centro_costo: editando.requiere_centro_costo,
      })
      toast.success('Cuenta actualizada con éxito')
      setEditando(null)
      await cargar()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'No se pudo actualizar la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const marcarValidada = async () => {
    setSaving(true)
    try {
      await api.patch(`/contabilidad/puc/${editando.codigo}/origen`, { origen: 'PUC_ESTANDAR' })
      toast.success('Cuenta marcada como validada por el contador')
      setEditando(null)
      await cargar()
    } catch {
      toast.error('No se pudo actualizar el origen de la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const abrirCrear = () => {
    setCreando({ padre_codigo: '', codigo: '', nombre: '', requiere_tercero: false, requiere_centro_costo: false })
    setBuscarPadre('')
  }

  const padreSeleccionado = creando?.padre_codigo ? cuentas.find(c => c.codigo === creando.padre_codigo) : null

  const opcionesPadre = useMemo(() => {
    if (!creando) return []
    const q = buscarPadre.trim().toLowerCase()
    if (!q) return []
    return cuentas
      .filter(c => c.nivel < 5)
      .filter(c => c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q))
      .slice(0, 8)
  }, [cuentas, buscarPadre, creando])

  const guardarCreacion = async () => {
    if (!creando.padre_codigo) { toast.error('Selecciona la cuenta padre'); return }
    if (!creando.codigo?.trim()) { toast.error('El código es requerido'); return }
    if (!creando.nombre?.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await api.post('/contabilidad/puc', {
        codigo: creando.codigo.trim(),
        nombre: creando.nombre.trim(),
        nivel: (padreSeleccionado?.nivel || 0) + 1,
        padre_codigo: creando.padre_codigo,
        naturaleza: padreSeleccionado?.naturaleza,
        tipo: padreSeleccionado?.tipo,
        requiere_tercero: creando.requiere_tercero,
        requiere_centro_costo: creando.requiere_centro_costo,
      })
      toast.success('Cuenta creada con éxito')
      setCreando(null)
      await cargar()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'No se pudo crear la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const toggleActiva = async (nodo) => {
    try {
      await api.patch(`/contabilidad/puc/${nodo.codigo}/toggle`)
      toast.success(nodo.activa ? 'Cuenta inactivada con éxito' : 'Cuenta activada con éxito')
      await cargar()
    } catch {
      toast.error('No se pudo cambiar el estado de la cuenta')
    }
  }

  return (
    <div>
      <div className="ctb-head-row">
        <div>
          <div className="ctb-title" style={{ fontSize: 20 }}>Plan de Cuentas</div>
          <div className="ctb-sub">PUC · Funeraria San José de Abrego — {cuentas.length} cuentas cargadas</div>
        </div>
        <div className="ctb-actions">
          <button className="btn-icon" onClick={cargar} title="Actualizar"><RefreshCw size={15} /></button>
          <button className="btn-primary" onClick={abrirCrear}><Plus size={15} /> Nueva Cuenta</button>
        </div>
      </div>

      <div className="ctb-kpis">
        {TIPOS.map(t => (
          <button key={t.key}
            className={`ctb-kpi${tipoFiltro === t.key ? ' active' : ''}`}
            style={{ background: t.bg, color: t.color }}
            onClick={() => cambiarTipoFiltro(t.key)}>
            <div className="ctb-kpi-label">{t.label}</div>
            <div className="ctb-kpi-value">{kpis[t.key]}</div>
          </button>
        ))}
      </div>

      <div className="sec-card">
        <div className="sec-body">
          <div className="ctb-toolbar">
            <div className="ctb-search">
              <Search size={14} color="#9CA3AF" />
              <input placeholder="Buscar por código o nombre…" value={busq} onChange={cambiarBusq} />
            </div>
            <select className="select-filter" value={tipoFiltro} onChange={e => { setTipoFiltro(e.target.value); setPagina(1) }}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="ctb-empty">Cargando catálogo…</div>
          ) : filtradas.length === 0 ? (
            <div className="ctb-empty">No se encontraron cuentas{busq ? ` para "${busq}"` : ''}.</div>
          ) : (
            <>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Código</th><th>Nombre</th><th>Tipo</th><th>Naturaleza</th>
                      <th>Nivel</th><th>Mov.</th><th>Origen</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(c => {
                      const ti = tipoInfo(c.tipo)
                      const oi = ORIGEN_INFO[c.origen] || {}
                      const ruta = rutaPadre(c.codigo)
                      return (
                        <tr key={c.codigo} style={{ opacity: c.activa ? 1 : .55 }}>
                          <td>
                            <span className="ctb-codigo" style={{
                              paddingLeft: (c.nivel - 1) * 10,
                              fontWeight: c.nivel <= 3 ? 800 : 600,
                              opacity: c.nivel <= 3 ? 1 : .85,
                            }}>{codFmt(c.codigo)}</span>
                          </td>
                          <td className="ctb-nombre-cell" style={{ paddingLeft: (c.nivel - 1) * 14 }}>
                            {ruta.length > 0 && (
                              <div className="ctb-ruta">{ruta.join(' › ')}</div>
                            )}
                            <strong style={{ fontWeight: c.nivel <= 2 ? 800 : c.nivel <= 3 ? 700 : 600 }}>
                              {c.nombre}
                            </strong>
                          </td>
                          <td><span className="badge" style={{ background: ti.bg, color: ti.color }}>{ti.label}</span></td>
                          <td>
                            <span className="nat-pill" style={{
                              background: c.naturaleza === 'D' ? '#EFF6FF' : '#FDF2F8',
                              color: c.naturaleza === 'D' ? '#2563EB' : '#DB2777',
                            }}>{c.naturaleza}</span>
                          </td>
                          <td style={{ fontSize: 12, color: '#9CA3AF' }}>{NIVEL_LABEL[c.nivel]}</td>
                          <td>{c.acepta_movimiento && <Check size={15} className="mov-yes" />}</td>
                          <td><span className="badge" style={{ background: oi.bg, color: oi.color }}>{oi.label}</span></td>
                          <td>
                            <button className="btn-icon" onClick={() => onEditar(c)} title="Editar">
                              <Pencil size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="ctb-pager">
                  <span className="ctb-pager-info">Página {paginaSeg} de {totalPaginas} · {filtradas.length} cuentas</span>
                  <div className="ctb-pager-btns">
                    <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaSeg === 1}
                      className="btn-icon" style={{ opacity: paginaSeg === 1 ? .4 : 1 }}>
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaSeg === totalPaginas}
                      className="btn-icon" style={{ opacity: paginaSeg === totalPaginas ? .4 : 1 }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {editando && (
        <div className="modal-overlay" onClick={() => !saving && setEditando(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Cuenta {editando.codigo}</div>

            <div className="campo">
              <label>Nombre</label>
              <input value={editando.nombre} onChange={e => setEditando(x => ({ ...x, nombre: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={!!editando.requiere_tercero}
                  onChange={e => setEditando(x => ({ ...x, requiere_tercero: e.target.checked }))} />
                Requiere tercero
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={!!editando.requiere_centro_costo}
                  onChange={e => setEditando(x => ({ ...x, requiere_centro_costo: e.target.checked }))} />
                Requiere centro de costo
              </label>
            </div>

            {editando.origen === 'PUC_COMPLEMENTARIO' && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 10, fontSize: 12, color: '#92400E', marginBottom: 12 }}>
                Esta cuenta fue propuesta por el sistema (no viene del balance de TNS). Confírmala con el contador
                externo antes de usarla en un asiento real.
                <button className="btn-icon" style={{ marginTop: 8, width: 'auto', padding: '0 10px' }} onClick={marcarValidada} disabled={saving}>
                  Marcar como validada
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button className="btn-icon" style={{ width: 'auto', padding: '0 10px', color: editando.activa ? '#DC2626' : '#059669' }}
                onClick={() => toggleActiva(editando)}>
                <Power size={13} /> {editando.activa ? 'Inactivar' : 'Activar'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={() => setEditando(null)} disabled={saving}>Cancelar</button>
                <button className="btn-primary" onClick={guardarEdicion} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {creando && (
        <div className="modal-overlay" onClick={() => !saving && setCreando(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nueva cuenta</div>

            <div className="campo">
              <label>Cuenta padre</label>
              {padreSeleccionado ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', border: '1.5px solid #E8E9F8', borderRadius: 10, background: '#FAFBFF' }}>
                  <span style={{ fontSize: 13 }}>
                    <span className="ctb-codigo">{codFmt(padreSeleccionado.codigo)}</span> — {padreSeleccionado.nombre}
                  </span>
                  <button className="btn-icon" style={{ width: 'auto', padding: '0 8px' }}
                    onClick={() => setCreando(c => ({ ...c, padre_codigo: '' }))}>Cambiar</button>
                </div>
              ) : (
                <>
                  <input placeholder="Buscar cuenta padre por código o nombre…" value={buscarPadre}
                    onChange={e => setBuscarPadre(e.target.value)} />
                  {opcionesPadre.length > 0 && (
                    <div style={{ border: '1.5px solid #E8E9F8', borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
                      {opcionesPadre.map(o => (
                        <div key={o.codigo}
                          onClick={() => { setCreando(c => ({ ...c, padre_codigo: o.codigo })); setBuscarPadre('') }}
                          style={{ padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', borderBottom: '1px solid #F4F5FA' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <span className="ctb-codigo">{codFmt(o.codigo)}</span> — {o.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {padreSeleccionado && (
              <>
                <div className="campo">
                  <label>Código</label>
                  <input value={creando.codigo} placeholder={`Ej: ${padreSeleccionado.codigo}01`}
                    onChange={e => setCreando(c => ({ ...c, codigo: e.target.value }))} />
                </div>
                <div className="campo">
                  <label>Nombre</label>
                  <input value={creando.nombre} onChange={e => setCreando(c => ({ ...c, nombre: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <span className="badge" style={{
                    background: creando.padre_codigo && padreSeleccionado.naturaleza === 'D' ? '#EFF6FF' : '#FDF2F8',
                    color: padreSeleccionado.naturaleza === 'D' ? '#2563EB' : '#DB2777',
                  }}>Naturaleza {padreSeleccionado.naturaleza}</span>
                  <span className="badge" style={{ background: tipoInfo(padreSeleccionado.tipo).bg, color: tipoInfo(padreSeleccionado.tipo).color }}>
                    {tipoInfo(padreSeleccionado.tipo).label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={!!creando.requiere_tercero}
                      onChange={e => setCreando(c => ({ ...c, requiere_tercero: e.target.checked }))} />
                    Requiere tercero
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={!!creando.requiere_centro_costo}
                      onChange={e => setCreando(c => ({ ...c, requiere_centro_costo: e.target.checked }))} />
                    Requiere centro de costo
                  </label>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setCreando(null)} disabled={saving}>Cancelar</button>
              <button className="btn-primary" onClick={guardarCreacion} disabled={saving || !padreSeleccionado}>
                {saving ? 'Creando…' : 'Crear cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: LIBRO DIARIO
// ═══════════════════════════════════════════════════════════════════════
const fmtMoney = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const ESTADO_INFO = {
  CONTABILIZADO: { label: 'Contabilizado', color: '#059669', bg: '#ECFDF5' },
  BORRADOR:      { label: 'Borrador',      color: '#D97706', bg: '#FFFBEB' },
  ANULADO:       { label: 'Anulado',       color: '#DC2626', bg: '#FEF2F2' },
}

function TabLibroDiario() {
  const [comprobantes, setComprobantes] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [expandido, setExpandido] = useState(new Set())
  const LIMIT = 20

  const cargar = async (p = pagina) => {
    setLoading(true)
    try {
      const params = { page: p, limit: LIMIT }
      if (q.trim()) params.q = q.trim()
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta
      const r = await api.get('/contabilidad/libro-diario', { params })
      setComprobantes(r.data.data || [])
      setTotalRegistros(r.data.meta?.total || 0)
    } catch {
      toast.error('No se pudo cargar el libro diario')
    } finally {
      setLoading(false)
    }
  }

  const cargarResumen = async () => {
    try {
      const params = {}
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta
      const r = await api.get('/contabilidad/libro-diario/resumen', { params })
      setResumen(r.data.data)
    } catch { /* no crítico */ }
  }

  useEffect(() => { cargar(1); cargarResumen(); setPagina(1) }, [desde, hasta])
  useEffect(() => { const t = setTimeout(() => { cargar(1); setPagina(1) }, 300); return () => clearTimeout(t) }, [q])
  useEffect(() => { cargar(pagina) }, [pagina])

  const toggle = (id) => setExpandido(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / LIMIT))

  return (
    <div>
      <div className="ctb-head-row">
        <div>
          <div className="ctb-title" style={{ fontSize: 20 }}>Libro Diario</div>
          <div className="ctb-sub">Todos los comprobantes contables, en orden cronológico</div>
        </div>
        <button className="btn-icon" onClick={() => { cargar(); cargarResumen() }} title="Actualizar"><RefreshCw size={15} /></button>
      </div>

      {resumen && (
        <div className="ctb-kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="ctb-kpi" style={{ background: '#EEF2FF', color: '#2E3192' }}>
            <div className="ctb-kpi-label">Comprobantes</div>
            <div className="ctb-kpi-value">{resumen.total_comprobantes}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#ECFDF5', color: '#059669' }}>
            <div className="ctb-kpi-label">Total débitos</div>
            <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmtMoney(resumen.total_debe)}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
            <div className="ctb-kpi-label">Total créditos</div>
            <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmtMoney(resumen.total_haber)}</div>
          </div>
          <div className="ctb-kpi" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            <div className="ctb-kpi-label">Anulados</div>
            <div className="ctb-kpi-value">{resumen.anulados}</div>
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
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="select-filter" style={{ fontFamily: 'inherit' }} />
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>hasta</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="select-filter" style={{ fontFamily: 'inherit' }} />
          </div>

          {loading ? (
            <div className="ctb-empty">Cargando comprobantes…</div>
          ) : comprobantes.length === 0 ? (
            <div className="ctb-empty">No hay comprobantes contabilizados{q ? ` para "${q}"` : ' todavía'}.</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th></th><th>Comprobante</th><th>Fecha</th><th>Concepto</th>
                    <th>Tercero</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map(c => {
                    const abierto = expandido.has(c.id)
                    const ei = ESTADO_INFO[c.estado] || {}
                    return (
                      <Fragment key={c.id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => toggle(c.id)}>
                          <td style={{ width: 24, color: '#9CA3AF' }}>
                            {abierto ? <ChevronLeft size={14} style={{ transform: 'rotate(-90deg)' }} /> : <ChevronRight size={14} />}
                          </td>
                          <td><span className="ctb-codigo">{c.numero}</span></td>
                          <td>{fmtFecha(c.fecha_contable)}</td>
                          <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.concepto}</td>
                          <td>{c.tercero_nombre?.trim() || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(c.total_debe)}</td>
                          <td><span className="badge" style={{ background: ei.bg, color: ei.color }}>{ei.label}</span></td>
                        </tr>
                        {abierto && (
                          <tr>
                            <td></td>
                            <td colSpan={6} style={{ padding: '0 16px 14px' }}>
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
                                  {c.lineas.map(l => (
                                    <tr key={l.id} style={{ fontSize: 12.5 }}>
                                      <td style={{ padding: '6px 10px' }}>
                                        <span className="ctb-codigo">{codFmt(l.cuenta_codigo)}</span> {l.cuenta_nombre}
                                      </td>
                                      <td style={{ padding: '6px 10px', color: '#6B7280' }}>{l.descripcion}</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                        {+l.debe > 0 ? fmtMoney(l.debe) : ''}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>
                                        {+l.haber > 0 ? fmtMoney(l.haber) : ''}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
              <span className="ctb-pager-info">Página {pagina} de {totalPaginas} · {totalRegistros} comprobantes</span>
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
    </div>
  )
}

// ── Libro Auxiliar: movimiento cronológico de UNA cuenta puntual, con saldo
// inicial y saldo corrido después de cada asiento — el detalle que sustenta
// el saldo que el Balance de Comprobación solo muestra totalizado.
function TabLibroAuxiliar() {
  const [opciones, setOpciones] = useState([])
  const [buscando, setBuscando] = useState('')
  const [cuenta, setCuenta] = useState(null)
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) })
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [filas, setFilas] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/contabilidad/puc/select', { params: buscando.trim() ? { q: buscando.trim() } : {} })
        .then(r => setOpciones(r.data.data || [])).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [buscando])

  const cargar = async () => {
    if (!cuenta) return
    setLoading(true)
    try {
      const r = await api.get('/contabilidad/libro-auxiliar', { params: { cuenta: cuenta.codigo, desde, hasta } })
      setFilas(r.data.data || [])
      setMeta(r.data.meta || null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo cargar el libro auxiliar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [cuenta, desde, hasta])

  return (
    <div>
      <div className="ctb-head-row">
        <div>
          <div className="ctb-title" style={{ fontSize: 20 }}>Libro Auxiliar</div>
          <div className="ctb-sub">Movimiento detallado de una cuenta, con saldo corrido</div>
        </div>
        {cuenta && <button className="btn-icon" onClick={cargar} title="Actualizar"><RefreshCw size={15} /></button>}
      </div>

      <div className="sec-card">
        <div className="sec-body">
          <div className="ctb-toolbar" style={{ flexWrap: 'wrap' }}>
            <div className="ctb-search" style={{ position: 'relative', minWidth: 280 }}>
              <Search size={14} color="#9CA3AF" />
              <input placeholder="Buscar cuenta por código o nombre…"
                value={cuenta ? `${codFmt(cuenta.codigo)} — ${cuenta.nombre}` : buscando}
                onChange={e => { setCuenta(null); setBuscando(e.target.value) }} />
              {!cuenta && buscando.trim() && opciones.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff',
                  border: '1.5px solid #E2E5F0', borderRadius: 10, marginTop: 4, maxHeight: 260, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(15,16,53,.1)' }}>
                  {opciones.map(o => (
                    <div key={o.codigo} onClick={() => { setCuenta(o); setBuscando('') }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12.5, borderBottom: '1px solid #F3F4F6' }}
                      onMouseDown={e => e.preventDefault()}>
                      <span className="ctb-codigo">{codFmt(o.codigo)}</span> {o.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="select-filter" style={{ fontFamily: 'inherit' }} />
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>hasta</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="select-filter" style={{ fontFamily: 'inherit' }} />
          </div>

          {!cuenta ? (
            <div className="ctb-empty">Selecciona una cuenta para ver su movimiento.</div>
          ) : (
            <>
              {meta && (
                <div className="ctb-kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                  <div className="ctb-kpi" style={{ background: '#F8F9FF', color: '#0F1035' }}>
                    <div className="ctb-kpi-label">Saldo inicial</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmtMoney(meta.saldo_inicial)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <div className="ctb-kpi-label">Total débitos</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmtMoney(meta.total_debe)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <div className="ctb-kpi-label">Total créditos</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmtMoney(meta.total_haber)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: '#EEF2FF', color: '#2E3192' }}>
                    <div className="ctb-kpi-label">Saldo final</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmtMoney(meta.saldo_final)}</div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="ctb-empty">Cargando movimientos…</div>
              ) : filas.length === 0 ? (
                <div className="ctb-empty">Sin movimientos en este rango para esta cuenta.</div>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Comprobante</th><th>Fecha</th><th>Concepto</th><th>Tercero</th>
                        <th style={{ textAlign: 'right', color: '#059669' }}>Débito</th>
                        <th style={{ textAlign: 'right', color: '#7C3AED' }}>Crédito</th>
                        <th style={{ textAlign: 'right' }}>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: '#FAFBFF' }}>
                        <td colSpan={6} style={{ fontWeight: 700, color: '#6B7280' }}>Saldo inicial</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{fmtMoney(meta.saldo_inicial)}</td>
                      </tr>
                      {filas.map(f => (
                        <tr key={f.comprobante_id + '-' + f.numero}>
                          <td><span className="ctb-codigo">{f.numero}</span></td>
                          <td>{fmtFecha(f.fecha_contable)}</td>
                          <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.descripcion || f.concepto}
                          </td>
                          <td>{f.tercero_nombre?.trim() || '—'}</td>
                          <td style={{ textAlign: 'right', color: '#059669' }}>{f.debe > 0 ? fmtMoney(f.debe) : ''}</td>
                          <td style={{ textAlign: 'right', color: '#7C3AED' }}>{f.haber > 0 ? fmtMoney(f.haber) : ''}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(f.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// SHELL: pestañas del módulo de Contabilidad
// ═══════════════════════════════════════════════════════════════════════
const SUBTABS = [
  { key: 'puc',      label: 'Plan de Cuentas' },
  { key: 'diario',   label: 'Libro Diario' },
  { key: 'auxiliar', label: 'Libro Auxiliar' },
  { key: 'reportes', label: 'Reportes Financieros' },
  { key: 'flujo',    label: 'Flujo de Caja' },
]

export default function ContabilidadPage() {
  const [tab, setTab] = useState('puc')

  return (
    <div className="ctb-page">
      <style>{CSS}</style>

      <div className="ctb-eyebrow"><BookOpen size={12} /> CONTABILIDAD</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1.5px solid #ECEDF8' }}>
        {SUBTABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: tab === t.key ? '#2E3192' : '#9CA3AF',
              borderBottom: tab === t.key ? '2.5px solid #2E3192' : '2.5px solid transparent',
              marginBottom: -1.5,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'puc'      && <TabPlanCuentas />}
      {tab === 'diario'   && <TabLibroDiario />}
      {tab === 'auxiliar' && <TabLibroAuxiliar />}
      {tab === 'reportes' && <ReportesFinancierosTab />}
      {tab === 'flujo'    && <FlujoCajaTab />}
    </div>
  )
}
