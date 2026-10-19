/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — formas de pago con su ícono configurado         ║
 * ║  Archivo         : components/ui/FormaPago.jsx                          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Toda forma de pago se muestra con el ícono que se configuró en
 * Configuración → Formas de pago (imagen subida; si no tiene, el emoji).
 *
 *   <IconoFormaPago forma={f} size={18}/>
 *   <FormaPagoTag codigo="nequi"/>                      ← ícono + nombre (tablas)
 *   <SelectorFormaPago value={codigo} onChange={c => …}/> ← elegir con íconos
 *
 * Un <select> del navegador no puede mostrar imágenes: por eso el selector
 * es de botones.
 */
import { useFormasPago } from '../../hooks/useFormasPago.js'
import { archivoUrl } from '../../utils/archivoUrl.js'

export function IconoFormaPago({ forma, size = 18 }) {
  if (!forma) return null
  if (forma.icono_url) {
    return <img src={archivoUrl(forma.icono_url)} alt="" width={size} height={size}
      style={{ width:size, height:size, objectFit:'contain', borderRadius:4, flexShrink:0, verticalAlign:'middle' }}/>
  }
  return <span style={{ fontSize: size * 0.85, lineHeight:1, flexShrink:0 }}>{forma.icono || '💳'}</span>
}

export function FormaPagoTag({ codigo, size = 16, soloIcono = false, style }) {
  const { buscar } = useFormasPago()
  const f = buscar(codigo)
  if (!f) return <span style={style}>{codigo || '—'}</span>
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap', ...style }} title={f.nombre}>
      <IconoFormaPago forma={f} size={size}/>{!soloIcono && f.nombre}
    </span>
  )
}

const CSS = `
.sfp { display:grid; grid-template-columns:repeat(auto-fill, minmax(118px, 1fr)); gap:8px; }
.sfp button { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:11px; border:1.5px solid #E2E8F0; background:#fff; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:700; color:#334155; text-align:left; min-width:0; }
.sfp button span.n { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sfp button:hover:not(:disabled) { border-color:#A7F3D0; background:#F8FFFB; }
.sfp button.on { border-color:#10B981; background:#ECFDF5; color:#047857; box-shadow:0 0 0 3px rgba(16,185,129,.12); }
.sfp button:disabled { opacity:.5; cursor:not-allowed; }
`

export function SelectorFormaPago({ value, onChange, formas: lista, disabled = false, size = 22 }) {
  const { formas } = useFormasPago()
  const opciones = lista || formas
  return (
    <>
      <style>{CSS}</style>
      <div className="sfp" role="radiogroup">
        {opciones.map(f => (
          <button type="button" key={f.codigo} role="radio" aria-checked={value === f.codigo}
            className={value === f.codigo ? 'on' : ''} disabled={disabled} onClick={() => onChange(f.codigo)} title={f.nombre}>
            <IconoFormaPago forma={f} size={size}/><span className="n">{f.nombre}</span>
          </button>
        ))}
      </div>
    </>
  )
}
