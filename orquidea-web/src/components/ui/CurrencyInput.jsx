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

// La base de datos devuelve los montos NUMERIC como texto con decimales
// ("5000.00"). soloDigitos() borra el punto sin más, así que "5000.00"
// quedaría "500000" — un cero de más, el punto decimal pegado al entero.
// externoAEntero() en cambio interpreta el valor como número real antes de
// redondear, así que decimales en 0 (siempre lo son: los precios se
// guardan en pesos enteros) se descartan en vez de fusionarse. Se usa SOLO
// para sincronizar el `value` que llega de fuera — mientras el usuario
// escribe, el string del input nunca trae puntos decimales y soloDigitos
// es correcto ahí.
const externoAEntero = v => {
  if (v === '' || v == null) return ''
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? String(n) : ''
}

// ── Número a letras (español, pesos colombianos) ────────────────────────
// Blindaje contra el error clásico de "se me coló un cero": el usuario ve
// el monto escrito en palabras y puede confirmar de un vistazo que no
// escribió $5.000.000 cuando quería $500.000 — el mismo principio que un
// cheque bancario. Cubre hasta miles de millones, que es más que suficiente
// para cualquier monto real de la funeraria.
const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const DECENAS_10_19 = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function trescientosALetras(n) {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  let partes = []
  const c = Math.floor(n / 100), resto1 = n % 100
  if (c) partes.push(CENTENAS[c])
  if (resto1 >= 10 && resto1 <= 19) {
    partes.push(DECENAS_10_19[resto1 - 10])
  } else {
    const d = Math.floor(resto1 / 10), u = resto1 % 10
    if (d === 2 && u > 0) partes.push('veinti' + UNIDADES[u])
    else {
      if (d) partes.push(DECENAS[d])
      if (u) partes.push((d ? 'y ' : '') + UNIDADES[u])
    }
  }
  return partes.filter(Boolean).join(' ')
}

function numeroALetras(n) {
  n = Math.round(Math.abs(n))
  if (n === 0) return 'cero'
  if (n > 999_999_999_999) return null // fuera de rango razonable, no se muestra

  const grupos = { miles: Math.floor(n / 1000) % 1000, millones: Math.floor(n / 1_000_000) % 1000, milesDeMillon: Math.floor(n / 1_000_000_000) }
  const unidadesGrupo = n % 1000

  let piezas = []
  if (grupos.milesDeMillon) piezas.push(`${trescientosALetras(grupos.milesDeMillon)} mil millones`)
  if (grupos.millones) piezas.push(grupos.millones === 1 ? 'un millón' : `${trescientosALetras(grupos.millones)} millones`)
  if (grupos.miles) piezas.push(grupos.miles === 1 ? 'mil' : `${trescientosALetras(grupos.miles)} mil`)
  if (unidadesGrupo) piezas.push(trescientosALetras(unidadesGrupo))

  return piezas.join(' ').trim()
}

/**
 * Input de dinero en pesos colombianos. El usuario solo escribe números —
 * el componente se encarga de mostrar "$1.000.000" mientras escribe, borra
 * o pega. `value`/`onChange` siempre trabajan con el número limpio (sin
 * puntos ni "$"), listo para guardar tal cual en la base de datos.
 *
 * Conserva la posición del cursor al reformatear (editar en medio de un
 * número ya no lo manda al final sin avisar — así se evita el error típico
 * de colar o perder un dígito sin darse cuenta).
 *
 * Uso: <CurrencyInput value={form.precio} onChange={v => set('precio')(v)} />
 */
export default function CurrencyInput({
  value, onChange, placeholder = '0', disabled, style, inputStyle, className,
  ayuda = true, min, id, name, required, autoFocus, onBlur,
}) {
  const [display, setDisplay] = useState(fmtMiles(externoAEntero(value)))
  const inputRef = useRef(null)
  const restaurarCursorRef = useRef(null)

  useEffect(() => {
    const limpio = externoAEntero(value)
    if (limpio !== soloDigitos(display)) setDisplay(fmtMiles(limpio))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Después de cada re-render con un display nuevo, si quedó pendiente
  // restaurar el cursor (por una edición en medio del número), se aplica.
  useEffect(() => {
    if (restaurarCursorRef.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(restaurarCursorRef.current, restaurarCursorRef.current)
      restaurarCursorRef.current = null
    }
  }, [display])

  const handleChange = e => {
    const input = e.target
    const valorPrevio = input.value
    const cursorPrevio = input.selectionStart ?? valorPrevio.length

    // Cuántos dígitos había ANTES del cursor — es lo único que importa para
    // saber dónde debe quedar el cursor después de reformatear (los puntos
    // de miles no cuentan, solo se mueven).
    const digitosAntesDeCursor = soloDigitos(valorPrevio.slice(0, cursorPrevio)).length

    const limpio = soloDigitos(valorPrevio)
    const nuevoDisplay = fmtMiles(limpio)
    setDisplay(nuevoDisplay)
    onChange(limpio === '' ? '' : Number(limpio))

    // Recorre el nuevo texto formateado hasta acumular esa misma cantidad
    // de dígitos, y esa es la posición correcta del cursor.
    let digitos = 0, pos = 0
    for (; pos < nuevoDisplay.length; pos++) {
      if (digitos >= digitosAntesDeCursor) break
      if (/\d/.test(nuevoDisplay[pos])) digitos++
    }
    restaurarCursorRef.current = pos
  }

  const numero = Number(soloDigitos(display)) || 0
  const enLetras = ayuda && numero > 0 ? numeroALetras(numero) : null

  return (
    <div>
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
      {enLetras && (
        <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic', textTransform: 'capitalize' }}>
          {enLetras} pesos
        </div>
      )}
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
