/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — asesor y recaudador                        ║
 * ║  Archivo         : components/polizas/ResponsablesPoliza.jsx            ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Tres personas distintas de una póliza:
 *   · Registrada por — quien la digitó (no se cambia)
 *   · Asesor         — quien la vendió (a él va la comisión de venta)
 *   · Recaudador     — quien cobra las cuotas (varios recaudadores se reparten
 *                      las pólizas; se sugiere el de la ruta de la zona del titular)
 * Asesor y recaudador se cambian ahí mismo y se guardan al elegir.
 */
import { useEffect, useState } from 'react'
import { Loader2, UserCheck, Wand2 } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const CSS = `
.rp-grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:14px; align-items:start; }
.rp-box { border:1.5px solid #e5f7ee; border-radius:12px; padding:12px 14px; background:#fbfefc; min-width:0; }
.rp-label { font-size:10px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; }
.rp-ayuda { font-size:11px; color:#94a3b8; margin-top:2px; }
.rp-valor { font-size:13.5px; font-weight:700; color:#111827; margin-top:8px; }
.rp-select { width:100%; margin-top:8px; border:1.5px solid #d1fae5; border-radius:9px; padding:7px 9px; font-size:13px; font-weight:600; color:#111827; background:#fff; font-family:inherit; outline:none; }
.rp-select:focus { border-color:#10b981; }
.rp-sug { margin-top:8px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:11.5px; color:#92400e; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:6px 8px; }
.rp-sug button { display:flex; align-items:center; gap:4px; border:none; background:#b45309; color:#fff; font-weight:700; font-size:11px; border-radius:6px; padding:3px 8px; cursor:pointer; font-family:inherit; }
@media (max-width:820px) { .rp-grid { grid-template-columns:1fr; } }
`

const ROLES = { superadmin:'Superadmin', administrador:'Administrador', operador:'Operador', asesor_comercial:'Asesor comercial', contador:'Contador', consultor:'Consultor' }
const fFecha = d => d ? new Date(d).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' }) : ''

export default function ResponsablesPoliza({ data, puedeEditar, onCambio }) {
  const [usuarios, setUsuarios] = useState([])
  const [guardando, setGuardando] = useState(null)   // 'asesor_id' | 'recaudador_id'

  useEffect(() => {
    if (!puedeEditar) return
    api.get('/polizas/responsables').then(r => setUsuarios(r.data.data || [])).catch(() => {})
  }, [puedeEditar])

  const guardar = async (campo, valor, nombre) => {
    setGuardando(campo)
    try {
      await api.patch(`/polizas/${data.id}/responsables`, { [campo]: valor || null })
      const que = campo === 'asesor_id' ? 'Asesor' : 'Recaudador'
      toast.success(valor ? `${que} actualizado: ${nombre}` : `${que} quitado de la póliza`)
      onCambio?.()
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo guardar el cambio')
    } finally { setGuardando(null) }
  }

  const nombreDe = id => usuarios.find(u => u.id === id)?.nombre || ''
  const sug = data.recaudador_sugerido
  const mostrarSug = puedeEditar && sug?.id && sug.id !== data.recaudador_id

  const Selector = ({ campo, valor, placeholder, detalle }) => (
    <div style={{ position:'relative' }}>
      <select className="rp-select" value={valor || ''} disabled={guardando === campo}
        onChange={e => guardar(campo, e.target.value, nombreDe(e.target.value))}>
        <option value="">{placeholder}</option>
        {usuarios.map(u => (
          <option key={u.id} value={u.id}>{u.nombre} — {detalle(u)}</option>
        ))}
      </select>
      {guardando === campo && <Loader2 size={14} className="pl-spin" style={{ position:'absolute', right:28, top:17, color:'#059669' }}/>}
    </div>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="rp-grid">
        <div className="rp-box">
          <div className="rp-label">Registrada por</div>
          <div className="rp-ayuda">Quien la digitó en el sistema</div>
          <div className="rp-valor">{data.registrado_por_nombre || '—'}</div>
          {data.creado_en && <div className="rp-ayuda">el {fFecha(data.creado_en)}</div>}
        </div>

        <div className="rp-box">
          <div className="rp-label">Asesor</div>
          <div className="rp-ayuda">Quien vendió la póliza · recibe la comisión de venta</div>
          {puedeEditar
            ? <Selector campo="asesor_id" valor={data.asesor_id} placeholder="— Sin asesor asignado —"
                detalle={u => ROLES[u.rol] || u.rol}/>
            : <div className="rp-valor">{data.asesor_nombre || 'Sin asesor asignado'}</div>}
        </div>

        <div className="rp-box">
          <div className="rp-label">Recaudador</div>
          <div className="rp-ayuda">Quien cobra las cuotas de esta póliza</div>
          {puedeEditar
            ? <Selector campo="recaudador_id" valor={data.recaudador_id} placeholder="— Sin recaudador asignado —"
                detalle={u => u.rutas ? `${u.rutas} · ${u.polizas_recaudo} pólizas` : `${u.polizas_recaudo} pólizas`}/>
            : <div className="rp-valor">{data.recaudador_nombre || 'Sin recaudador asignado'}</div>}
          {mostrarSug && (
            <div className="rp-sug">
              <UserCheck size={13}/>
              <span>Según la zona del titular{data.titular_zona_recaudo ? ` (${data.titular_zona_recaudo})` : ''}: <strong>{sug.nombre}</strong>{sug.ruta ? ` · ${sug.ruta}` : ''}</span>
              <button type="button" onClick={() => guardar('recaudador_id', sug.id, sug.nombre)} disabled={!!guardando}>
                <Wand2 size={11}/> Usar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
