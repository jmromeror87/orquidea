/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Componentes UI — entrada de porcentaje               ║
 * ║  Archivo         : PercentInput.jsx                                     ║
 * ║  Fecha           : 2026-08-14                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Input de porcentaje: el usuario escribe "19" y ve "19 %". Acepta un
 * decimal (ej. 19.5). value/onChange trabajan con el número limpio.
 */
export default function PercentInput({
  value, onChange, placeholder = '0', disabled, style, inputStyle, className,
  min = 0, max = 100, id, name, required,
}) {
  const handleChange = e => {
    let v = e.target.value.replace(/[^\d.]/g, '')
    const partes = v.split('.')
    if (partes.length > 2) v = partes[0] + '.' + partes.slice(1).join('')
    if (v !== '' && max != null && Number(v) > max) v = String(max)
    onChange(v)
  }

  return (
    <div className={className} style={{
      display:'flex', alignItems:'center', gap:2,
      border:'1.5px solid #E2E5F0', borderRadius:10,
      background: disabled ? '#F4F5FA' : '#fff',
      padding:'0 12px', boxSizing:'border-box',
      ...style,
    }}>
      <input
        id={id} name={name} required={required}
        type="text" inputMode="decimal" autoComplete="off"
        value={value ?? ''} placeholder={placeholder} disabled={disabled}
        onChange={handleChange}
        style={{
          flex:1, border:'none', outline:'none', background:'transparent',
          padding:'9px 0', fontSize:13, color:'#0F1035', fontWeight:600,
          minWidth:0, boxSizing:'border-box',
          ...inputStyle,
        }}
      />
      <span style={{ color:'#9CA3AF', fontSize:13, fontWeight:700, flexShrink:0 }}>%</span>
    </div>
  )
}
