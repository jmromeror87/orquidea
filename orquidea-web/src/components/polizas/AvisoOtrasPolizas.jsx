/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — aviso de persona en otras pólizas          ║
 * ║  Archivo         : components/polizas/AvisoOtrasPolizas.jsx             ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-20                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Avisa (sin bloquear) cuando una persona ya está en otra póliza, como titular
 * o como beneficiaria: pasa mucho (el papá y la mamá con el mismo hijo, o
 * alguien titular de una y beneficiario de otra). Se muestra al elegirla como
 * titular, beneficiario o fallecido.
 *
 *   <AvisoOtrasPolizas terceroId={id} excluirPolizaId={polizaActual} contexto="beneficiario"/>
 */
import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import api from '../../services/api.js'

const TEXTO = {
  beneficiario: 'Puede inscribirla también aquí. Tenga en cuenta que, si fallece, el servicio se presta con una sola de las pólizas.',
  titular:      'Puede ser titular de esta póliza también. Revise que no se esté duplicando la misma cobertura.',
  fallecido:    'Antes de crear el servicio, confirme con la familia por cuál póliza se va a prestar.',
}

export default function AvisoOtrasPolizas({ terceroId, excluirPolizaId, contexto = 'beneficiario', style }) {
  const [lista, setLista] = useState([])
  useEffect(() => {
    if (!terceroId) { setLista([]); return }
    let vivo = true
    api.get(`/polizas/coberturas/${terceroId}`, { params: excluirPolizaId ? { excluir: excluirPolizaId } : {} })
      .then(r => { if (vivo) setLista(r.data.data || []) }).catch(() => { if (vivo) setLista([]) })
    return () => { vivo = false }
  }, [terceroId, excluirPolizaId])

  if (!lista.length) return null
  return (
    <div style={{ display:'flex', gap:10, padding:'10px 12px', borderRadius:10, background:'#FFFBEB', border:'1.5px solid #FDE68A',
      color:'#92400E', fontSize:12.5, lineHeight:1.5, ...style }}>
      <Info size={16} style={{ flexShrink:0, marginTop:1 }}/>
      <div>
        <b>Esta persona ya está en {lista.length === 1 ? 'otra póliza' : `${lista.length} pólizas más`}:</b>
        <ul style={{ margin:'4px 0 4px', paddingLeft:18 }}>
          {lista.map(p => (
            <li key={p.poliza_id + p.rol}>
              Póliza <b>{p.numero_legado || `#${p.numero}`}</b> · {p.plan_nombre} · {p.estado === 'VIGENTE' ? 'vigente' : p.estado.toLowerCase()} —{' '}
              {p.rol === 'TITULAR' ? <b>es el titular</b> : <>beneficiario ({p.parentesco}) de <b>{p.titular_nombre}</b></>}
            </li>
          ))}
        </ul>
        {TEXTO[contexto]}
      </div>
    </div>
  )
}
