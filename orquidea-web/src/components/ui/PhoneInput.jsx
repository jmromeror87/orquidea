/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Componentes UI — entrada de teléfono (Colombia)      ║
 * ║  Archivo         : PhoneInput.jsx                                       ║
 * ║  Fecha           : 2026-08-14                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Input de teléfono colombiano: solo dígitos, agrupados "300 123 4567"
 * (celular, 10 dígitos) o "607 555 1234" (fijo). value/onChange trabajan
 * siempre con el número limpio (solo dígitos), listo para guardar.
 */
const soloDigitos = s => (s || '').replace(/\D/g, '').slice(0, 10)

const agrupar = digitos => {
  if (digitos.length <= 3) return digitos
  if (digitos.length <= 6) return `${digitos.slice(0,3)} ${digitos.slice(3)}`
  return `${digitos.slice(0,3)} ${digitos.slice(3,6)} ${digitos.slice(6,10)}`
}

export default function PhoneInput({
  value, onChange, placeholder = '300 123 4567', disabled, style, inputStyle, className,
  id, name, required,
}) {
  const digitos = soloDigitos(value)

  const handleChange = e => {
    const limpio = soloDigitos(e.target.value)
    onChange(limpio)
  }

  return (
    <input
      id={id} name={name} required={required}
      type="tel" inputMode="numeric" autoComplete="tel" maxLength={13}
      value={agrupar(digitos)} placeholder={placeholder} disabled={disabled}
      onChange={handleChange}
      className={className}
      style={{
        width:'100%', padding:'9px 12px', border:'1.5px solid #E2E5F0',
        borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box',
        background: disabled ? '#F4F5FA' : '#fff',
        ...style, ...inputStyle,
      }}
    />
  )
}
