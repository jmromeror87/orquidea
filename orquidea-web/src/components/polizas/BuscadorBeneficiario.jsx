/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — agregar beneficiario                       ║
 * ║  Archivo         : components/polizas/BuscadorBeneficiario.jsx          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Paso 1: parentesco. Paso 2: buscar la persona. Paso 3: confirmar.
 * Corrige el buscador anterior: respuestas viejas que llegaban tarde pisaban
 * los resultados nuevos (parecía "bloqueado"), no avisaba si no había
 * resultados o si fallaba, y un solo clic agregaba sin confirmar.
 */
import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react'
import api from '../../services/api.js'

const EDAD_LIMITE = 75
const SIN_LIMITE_EDAD = ['padre', 'madre', 'suegro', 'suegra']
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
const nombreDe = t => (t.razon_social || `${t.nombres || ''} ${t.apellidos || ''}`).trim()

export default function BuscadorBeneficiario({ parentescos, excluidos = new Map(), onAgregar, disabled = false, disabledMsg }) {
  const [parentesco, setParentesco] = useState(parentescos.find(p => p === 'hijo') || parentescos[0])
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('idle')         // idle | cargando | ok | error
  const [resultados, setResultados] = useState([])
  const [activo, setActivo] = useState(-1)             // fila resaltada con el teclado
  const [elegido, setElegido] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const pedido = useRef(0)
  const inputRef = useRef(null)

  const buscar = async (texto) => {
    const mio = ++pedido.current
    setEstado('cargando')
    try {
      const r = await api.get('/terceros/select', { params: { q: texto } })
      if (mio !== pedido.current) return                 // llegó tarde: ya se escribió otra cosa
      setResultados(r.data.data || []); setActivo(-1); setEstado('ok')
    } catch {
      if (mio === pedido.current) setEstado('error')
    }
  }

  useEffect(() => {
    const texto = q.trim()
    if (texto.length < 2) { pedido.current++; setResultados([]); setEstado('idle'); return }
    const t = setTimeout(() => buscar(texto), 250)
    return () => clearTimeout(t)
  }, [q])

  const elegir = (t) => { if (!excluidos.has(t.id)) setElegido(t) }
  const limpiar = () => { setQ(''); setElegido(null); setResultados([]); setEstado('idle'); inputRef.current?.focus() }

  const confirmar = async () => {
    if (!elegido) return
    setAgregando(true)
    try {
      await onAgregar(elegido, parentesco)
      limpiar()
    } finally { setAgregando(false) }
  }

  const onKey = e => {
    if (!resultados.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(i => Math.min(resultados.length - 1, i + 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActivo(i => Math.max(0, i - 1)) }
    if (e.key === 'Enter' && activo >= 0) { e.preventDefault(); elegir(resultados[activo]) }
  }

  // Regla de edad (la valida el servidor; aquí se avisa antes)
  const edad = elegido?.edad
  const sinLimite = SIN_LIMITE_EDAD.includes(parentesco)
  const rechazoEdad = edad != null && edad > EDAD_LIMITE && !sinLimite
  const coberturaBasica = edad != null && edad > EDAD_LIMITE && sinLimite

  const lbl = { fontSize:11.5, fontWeight:700, color:'#374151', marginBottom:5, display:'flex', alignItems:'center', gap:6 }
  const paso = n => <span style={{ width:18, height:18, borderRadius:'50%', background:'#059669', color:'#fff', fontSize:10.5,
    fontWeight:800, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{n}</span>
  const ctrl = { width:'100%', boxSizing:'border-box', border:'1.5px solid #D1FAE5', borderRadius:10, padding:'9px 12px',
    fontSize:13, outline:'none', background: disabled ? '#F3F4F6' : '#fff', fontFamily:'inherit' }

  return (
    <div style={{ background:'#F0FDF4', border:'1.5px solid #A7F3D0', borderRadius:12, padding:14 }}>
      {disabled && disabledMsg && <div style={{ fontSize:12, color:'#92400E', marginBottom:10 }}>{disabledMsg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'minmax(140px, 1fr) minmax(0, 2fr)', gap:12 }}>
        <div>
          <label style={lbl}>{paso(1)} Parentesco</label>
          <select value={parentesco} onChange={e => setParentesco(e.target.value)} disabled={disabled} style={{ ...ctrl, cursor:'pointer' }}>
            {parentescos.map(p => <option key={p} value={p}>{cap(p)}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>{paso(2)} Buscar persona</label>
          <div style={{ position:'relative' }}>
            <Search size={14} color="#9CA3AF" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
            <input ref={inputRef} value={q} disabled={disabled}
              onChange={e => { setQ(e.target.value); setElegido(null) }} onKeyDown={onKey}
              placeholder="Nombre, apellido o documento…" style={{ ...ctrl, paddingLeft:32, paddingRight:32 }}/>
            {estado === 'cargando'
              ? <Loader2 size={14} color="#059669" style={{ position:'absolute', right:11, top:'50%', marginTop:-7, animation:'spin 1s linear infinite' }}/>
              : q && <button type="button" onClick={limpiar} title="Limpiar"
                  style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', display:'flex', padding:4 }}>
                  <X size={14}/></button>}
          </div>
        </div>
      </div>

      {/* Resultados */}
      {!elegido && q.trim().length > 0 && (
        <div style={{ marginTop:10, border:'1.5px solid #D1FAE5', borderRadius:10, background:'#fff', maxHeight:230, overflowY:'auto' }}>
          {q.trim().length < 2 && <div style={{ padding:'12px 14px', fontSize:12.5, color:'#6B7280' }}>Escribe al menos 2 letras o parte del documento…</div>}
          {estado === 'error' && (
            <div style={{ padding:'12px 14px', fontSize:12.5, color:'#B91C1C', display:'flex', alignItems:'center', gap:8 }}>
              <AlertTriangle size={14}/> No se pudo buscar.
              <button type="button" onClick={() => buscar(q.trim())} style={{ background:'none', border:'none', color:'#047857', fontWeight:700, cursor:'pointer' }}>Reintentar</button>
            </div>
          )}
          {estado === 'ok' && resultados.length === 0 && (
            <div style={{ padding:'12px 14px', fontSize:12.5, color:'#6B7280' }}>
              No encontramos a nadie con "<strong>{q.trim()}</strong>". Si es una persona nueva, regístrala primero en <a href="/terceros" target="_blank" rel="noreferrer" style={{ color:'#047857', fontWeight:700 }}>Terceros</a>.
            </div>
          )}
          {estado !== 'error' && resultados.map((t, i) => {
            const motivo = excluidos.get(t.id)
            return (
              <div key={t.id} onClick={() => elegir(t)} onMouseEnter={() => setActivo(i)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderBottom: i < resultados.length - 1 ? '1px solid #F1F5F9' : 'none',
                  cursor: motivo ? 'not-allowed' : 'pointer', opacity: motivo ? .55 : 1, background: !motivo && i === activo ? '#ECFDF5' : '#fff' }}>
                <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:'linear-gradient(135deg,#059669,#047857)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff' }}>
                  {(nombreDe(t)[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{nombreDe(t)}</div>
                  <div style={{ fontSize:11.5, color:'#6B7280' }}>
                    {t.tipo_doc_sigla} {t.numero_documento}{t.edad != null && ` · ${t.edad} años`}{t.telefono && ` · ${t.telefono}`}
                  </div>
                </div>
                {motivo && <span style={{ fontSize:10.5, fontWeight:700, color:'#475569', background:'#E2E8F0', borderRadius:6, padding:'2px 8px' }}>{motivo}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Paso 3: confirmar */}
      {elegido && (
        <div style={{ marginTop:10, background:'#fff', border:'1.5px solid #6EE7B7', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {paso(3)}
            <div style={{ flex:1, minWidth:200, fontSize:13, color:'#0F172A' }}>
              Agregar a <strong>{nombreDe(elegido)}</strong> ({elegido.tipo_doc_sigla} {elegido.numero_documento}{edad != null && `, ${edad} años`}) como <strong>{cap(parentesco)}</strong>
            </div>
            <button type="button" onClick={() => setElegido(null)} disabled={agregando}
              style={{ padding:'7px 14px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontWeight:700, fontSize:12.5, cursor:'pointer' }}>
              Cambiar
            </button>
            <button type="button" onClick={confirmar} disabled={agregando || rechazoEdad}
              style={{ padding:'7px 14px', borderRadius:9, border:'none', background: rechazoEdad ? '#9CA3AF' : '#059669', color:'#fff',
                fontWeight:700, fontSize:12.5, cursor: rechazoEdad ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:6 }}>
              {agregando ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> : <UserPlus size={13}/>} Agregar beneficiario
            </button>
          </div>
          {rechazoEdad && (
            <div style={{ marginTop:8, fontSize:12, color:'#B91C1C', display:'flex', gap:6, alignItems:'center' }}>
              <AlertTriangle size={13}/> Tiene {edad} años: con parentesco "{parentesco}" la edad máxima es {EDAD_LIMITE}. Solo padres o suegros pueden entrar sin límite de edad.
            </div>
          )}
          {coberturaBasica && (
            <div style={{ marginTop:8, fontSize:12, color:'#92400E', display:'flex', gap:6, alignItems:'center' }}>
              <AlertTriangle size={13}/> Tiene {edad} años: quedará con cobertura de servicio funerario básico y se debe imprimir el consentimiento.
            </div>
          )}
          {!rechazoEdad && !coberturaBasica && edad != null && (
            <div style={{ marginTop:8, fontSize:11.5, color:'#047857', display:'flex', gap:6, alignItems:'center' }}>
              <CheckCircle2 size={13}/> Cumple la regla de edad del plan.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
