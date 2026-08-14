/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Componentes UI — entrada de dinero (COP)             ║
 * ║  Archivo         : CurrencyInput.jsx                                    ║
 * ║  Fecha           : 2026-08-14                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useRef } from 'react'

const fmtMiles = n => (n === '' || n == null ? '' : Number(n).toLocaleString('es-CO'))
const soloDigitos = s => (s || '').replace(/[^\d]/g, '')

/**
 * Input de dinero en pesos colombianos. El usuario solo escribe números —
 * el componente se encarga de mostrar "$1.000.000" mientras escribe, borra
 * o pega. `value`/`onChange` siempre trabajan con el número limpio (sin
 * puntos ni "$"), listo para guardar tal cual en la base de datos.
 *
 * Uso: <CurrencyInput value={form.precio} onChange={v => set('precio')(v)} />
 */
export default function CurrencyInput({
  value, onChange, placeholder = '0', disabled, style, inputStyle, className,
  ayuda = true, min, id, name, required, autoFocus, onBlur,
}) {
  const [display, setDisplay] = useState(fmtMiles(soloDigitos(String(value ?? ''))))
  const inputRef = useRef(null)

  useEffect(() => {
    const limpio = soloDigitos(String(value ?? ''))
    if (limpio !== soloDigitos(display)) setDisplay(fmtMiles(limpio))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = e => {
    const limpio = soloDigitos(e.target.value)
    setDisplay(fmtMiles(limpio))
    onChange(limpio === '' ? '' : Number(limpio))
  }

  const numero = Number(soloDigitos(display)) || 0

  return (
    <div className={className} style={{
      display:'flex', alignItems:'center', gap:2,
      border:'1.5px solid #E2E5F0', borderRadius:10,
      background: disabled ? '#F4F5FA' : '#fff',
      padding:'0 12px', boxSizing:'border-box', transition:'border-color .15s',
      ...style,
    }}>
      <span style={{ color:'#9CA3AF', fontSize:13, fontWeight:700, flexShrink:0 }}>$</span>
      <input
        ref={inputRef} id={id} name={name} required={required} autoFocus={autoFocus}
        type="text" inputMode="numeric" autoComplete="off"
        value={display} placeholder={placeholder} disabled={disabled}
        onChange={handleChange}
        onBlur={onBlur}
        style={{
          flex:1, border:'none', outline:'none', background:'transparent',
          padding:'9px 0', fontSize:13, color:'#0F1035', fontWeight:600,
          minWidth:0, boxSizing:'border-box',
          ...inputStyle,
        }}
      />
    </div>
  )
}

/** Texto de ayuda contextual bajo el campo — "Valor ingresado: $1.500.000 COP" */
export function AyudaMonto({ value }) {
  const n = Number(value) || 0
  if (!n) return null
  return (
    <div style={{ fontSize:10.5, color:'#9CA3AF', marginTop:4 }}>
      Valor ingresado: <strong style={{ color:'#6B7280' }}>${n.toLocaleString('es-CO')} COP</strong>
    </div>
  )
}
