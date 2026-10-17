/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — vigencia y renovación anual                ║
 * ║  Archivo         : components/polizas/RenovacionPoliza.jsx              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * En la ficha de la póliza: tarifa vigente, cuándo sube y a cuánto (según el
 * salario mínimo), tarifas de los próximos años e historial de renovaciones.
 */
const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const pct = n => `${String(+(+n).toFixed(3)).replace('.', ',')} %`
const fLarga = iso => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })

export default function RenovacionPoliza({ data }) {
  const tarifas = data.tarifas || []
  if (!tarifas.length) return null
  const actual = tarifas[0]
  const futuras = tarifas.slice(1, 4)
  const sig = futuras[0]
  const renov = data.renovaciones || []
  const modoTxt = data.incremento_modo === 'ENERO'
    ? 'sube cada 1 de enero'
    : `sube en cada aniversario (el ${fLarga(data.fecha_inicio).replace(/ de \d{4}$/, '')} de cada año)`

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:10, marginBottom:12 }}>
        <div style={{ padding:'12px 14px', borderRadius:12, background:'linear-gradient(135deg,#065f46,#059669)', color:'#fff' }}>
          <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', opacity:.85 }}>Cuota vigente</div>
          <div style={{ fontSize:24, fontWeight:900, lineHeight:1.2 }}>{fmt(actual.cuota)}</div>
          <div style={{ fontSize:11.5, opacity:.9 }}>desde el {fLarga(actual.desde)}</div>
        </div>
        {sig && (
          <div style={{ padding:'12px 14px', borderRadius:12, border:`1.5px solid ${sig.pendiente ? '#fde68a' : '#a7f3d0'}`, background: sig.pendiente ? '#fffbeb' : '#f0fdf4' }}>
            <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color: sig.pendiente ? '#b45309' : '#047857' }}>Próxima renovación</div>
            <div style={{ fontSize:15, fontWeight:900, color:'#0f172a', marginTop:2 }}>{fLarga(sig.desde)}</div>
            <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>
              {sig.pendiente
                ? <>Falta registrar el % del salario mínimo {sig.anio}</>
                : <>Sube a <b style={{ color:'#047857' }}>{fmt(sig.cuota)}</b> (+{pct(sig.porcentaje)}{sig.proyectado ? ' proyectado' : ''})</>}
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize:12, color:'#64748b', marginBottom: futuras.length > 1 || renov.length ? 10 : 0 }}>
        La póliza se renueva automáticamente cada año y la cuota {modoTxt}, según el incremento del salario mínimo.
        Los periodos pagados por adelantado se liquidan con la tarifa del año al que pertenecen.
      </div>
      {futuras.length > 1 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: renov.length ? 12 : 0 }}>
          {futuras.map(t => (
            <span key={t.desde} style={{ fontSize:11.5, fontWeight:700, padding:'4px 10px', borderRadius:20,
              background: t.pendiente ? '#f1f5f9' : '#ecfdf5', color: t.pendiente ? '#94a3b8' : '#047857', border:'1px solid #e2e8f0' }}>
              Desde {fLarga(t.desde)}: {t.pendiente ? 'sin % registrado' : `${fmt(t.cuota)}${t.proyectado ? ' (proy.)' : ''}`}
            </span>
          ))}
        </div>
      )}
      {renov.length > 0 && (
        <>
          <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:'#94a3b8', margin:'4px 0 6px' }}>Historial de renovaciones</div>
          {renov.map(r => (
            <div key={r.id} style={{ display:'flex', gap:10, alignItems:'center', fontSize:12.5, padding:'6px 0', borderTop:'1px dashed #e5e7eb' }}>
              <b style={{ minWidth:140 }}>{fLarga(r.fecha)}</b>
              <span>{fmt(r.cuota_anterior)} → <b style={{ color:'#047857' }}>{fmt(r.cuota_nueva)}</b></span>
              <span style={{ color:'#64748b' }}>+{pct(r.porcentaje)} · SMMLV {r.anio_smmlv}{r.proyectado ? ' (proyectado)' : ''}</span>
              <span style={{ marginLeft:'auto', color:'#94a3b8', fontSize:11.5 }}>{r.usuario_nombre || 'Automática'}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
