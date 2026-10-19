/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — historial de pagos (tabla)                 ║
 * ║  Archivo         : components/polizas/TablaPagosPoliza.jsx              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Historial de pagos de una póliza en forma de tabla: recibo, fecha, concepto,
 * periodo cubierto con sus fechas exactas (desde → hasta), forma de pago,
 * quién lo registró y valor. Abajo, el total pagado a la fecha (sin anulados)
 * y su desglose. Los anulados se ven tachados con quién, cuándo y por qué.
 */
import { useState } from 'react'
import { Printer, Ban, Eye, Search } from 'lucide-react'
import { diaAncla, normalizarInicio, diasQueCubre, addDias, iso } from '../../utils/periodosPoliza.js'
import { archivoUrl } from '../../utils/archivoUrl.js'
import { FormaPagoTag } from '../ui/FormaPago.jsx'

const CSS = `
.tp-filtros { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
.tp-chip { border:1.5px solid #e2e8f0; background:#fff; color:#475569; border-radius:20px; padding:4px 12px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
.tp-chip.on { background:#ecfdf5; border-color:#6ee7b7; color:#047857; }
.tp-chip span { margin-left:5px; font-weight:600; opacity:.7; }
.tp-buscar { position:relative; margin-left:auto; }
.tp-buscar svg { position:absolute; left:9px; top:8px; color:#94a3b8; }
.tp-buscar input { border:1.5px solid #e2e8f0; border-radius:8px; padding:6px 10px 6px 28px; font-size:12.5px; outline:none; font-family:inherit; width:200px; }
.tp-buscar input:focus { border-color:#10b981; }
.tp-wrap { border:1.5px solid #e2e8f0; border-radius:12px; overflow:hidden; background:#fff; }
.tp-scroll { overflow:auto; max-height:540px; }
.tp-tabla { width:100%; min-width:720px; border-collapse:separate; border-spacing:0; font-size:12.5px; }
.tp-tabla th { position:sticky; top:0; z-index:1; background:#f8fafc; color:#475569; font-size:10.5px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; text-align:left; padding:9px 8px; border-bottom:1.5px solid #e2e8f0; white-space:nowrap; }
.tp-tabla td { padding:8px 8px; border-bottom:1px solid #f1f5f9; color:#334155; vertical-align:middle; }
.tp-tabla tbody tr:nth-child(even) td { background:#fcfdfe; }
.tp-tabla tbody tr:hover td { background:#f0fdf4; }
.tp-tabla .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.tp-tabla tr.anul td { color:#94a3b8; background:#f8fafc !important; }
.tp-tabla tr.anul .tp-valor { text-decoration:line-through; }
.tp-recibo { font-weight:800; color:#047857; font-variant-numeric:tabular-nums; white-space:nowrap; }
.tp-concepto { display:inline-block; font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:6px; white-space:nowrap; }
.tp-per { font-weight:800; color:#4338ca; white-space:nowrap; }
.tp-rango { font-size:11.5px; color:#64748b; white-space:nowrap; }
.tp-valor { font-weight:800; color:#065f46; }
.tp-acc { display:flex; gap:6px; justify-content:flex-end; }
.tp-btn { display:flex; align-items:center; justify-content:center; gap:4px; font-size:11px; font-weight:700; border-radius:7px; width:30px; height:28px; padding:0; cursor:pointer; text-decoration:none; white-space:nowrap; font-family:inherit; }
.tp-anulnota { font-size:11px; color:#b91c1c; margin-top:3px; line-height:1.45; white-space:normal; }
.tp-pie { display:flex; flex-wrap:wrap; gap:10px 22px; align-items:center; justify-content:space-between; padding:12px 14px; background:#f0fdf4; border-top:1.5px solid #a7f3d0; }
.tp-desglose { flex:1; min-width:260px; display:flex; flex-wrap:wrap; gap:6px 18px; font-size:12px; color:#475569; }
.tp-desglose b { color:#0f172a; }
.tp-total { text-align:right; margin-left:auto; }
.tp-total small { display:block; font-size:10.5px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#047857; }
.tp-total strong { font-size:20px; font-weight:900; color:#047857; font-variant-numeric:tabular-nums; }
.tp-vacio { padding:28px; text-align:center; color:#94a3b8; font-size:12.5px; }
@media (max-width:640px) { .tp-buscar { margin-left:0; width:100%; } .tp-buscar input { width:100%; box-sizing:border-box; } }
`

const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const fCorta = isoStr => { if (!isoStr) return '—'; const [y, m, d] = String(isoStr).slice(0, 10).split('-'); return `${+d} ${MESES[+m - 1]} ${y}` }
const fNum = isoStr => isoStr ? String(isoStr).slice(0, 10).split('-').reverse().join('/') : '—'
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const CONCEPTOS = {
  CUOTA:   { label:'Cuota',                bg:'#d1fae5', color:'#047857' },
  ABONO:   { label:'Abono',        bg:'#fef3c7', color:'#b45309' },
  AFIL:    { label:'Afiliación',           bg:'#e0e7ff', color:'#4338ca' },
  CAMBIO:  { label:'Cambio benef.',  bg:'#fae8ff', color:'#a21caf' },
}
const conceptoDe = p => p.tipo === 'AFILIACION'
  ? (p.beneficiario_id || p.beneficiario_nombre ? 'CAMBIO' : 'AFIL')
  : (p.parcial ? 'ABONO' : 'CUOTA')

// Arma, para cada pago, el periodo que cubre con sus fechas. En un abono
// parcial calcula hasta qué día alcanzan los abonos de ese periodo hechos
// hasta ese momento (igual que la cobertura por días del sistema).
function construirFilas(pagos, poliza) {
  const dia = diaAncla(poliza)
  const cuota = +poliza.valor_cuota || 0
  const acumulado = {}
  const orden = [...pagos].sort((a, b) => String(a.creado_en || a.fecha_pago).localeCompare(String(b.creado_en || b.fecha_pago)))
  const info = {}
  for (const p of orden) {
    const c = conceptoDe(p)
    if (c === 'AFIL' || c === 'CAMBIO') {
      info[p.id] = { concepto: c, etiqueta: c === 'AFIL' ? 'Única vez · titular' : (p.beneficiario_nombre || 'Beneficiario'), desde: null, hasta: null }
      continue
    }
    const per = normalizarInicio(p.mes_correspondiente, dia)
    let hasta = p.periodo_hasta ? String(p.periodo_hasta).slice(0, 10) : per.fin_iso
    let dias = null
    if (c === 'ABONO' && cuota > 0) {
      if (!p.anulado) acumulado[per.iso] = (acumulado[per.iso] || 0) + (+p.monto || 0)
      const suma = p.anulado ? (+p.monto || 0) : acumulado[per.iso]
      dias = diasQueCubre(suma, cuota, per)
      hasta = dias > 0 ? iso(addDias(per.inicio, dias - 1)) : null
    }
    info[p.id] = { concepto: c, etiqueta: per.etiqueta, desde: per.iso, hasta, dias }
  }
  return pagos.map(p => ({ ...p, _i: info[p.id] }))
}

export default function TablaPagosPoliza({ pagos = [], poliza, fmtMetodo = x => x, puedeAnular = false, onRecibo, onAnular }) {
  const [filtro, setFiltro] = useState('TODOS')
  const [q, setQ] = useState('')
  const filas = construirFilas(pagos, poliza)

  const vigentes = filas.filter(p => !p.anulado)
  const sumar = arr => arr.reduce((s, p) => s + (+p.monto || 0), 0)
  const porConcepto = c => vigentes.filter(p => p._i.concepto === c)
  const total = sumar(vigentes)
  const anulados = filas.filter(p => p.anulado)

  const cuenta = {
    TODOS: filas.length,
    CUOTAS: filas.filter(p => !p.anulado && ['CUOTA', 'ABONO'].includes(p._i.concepto)).length,
    AFILIACION: filas.filter(p => !p.anulado && ['AFIL', 'CAMBIO'].includes(p._i.concepto)).length,
    ANULADOS: anulados.length,
  }
  const visibles = filas.filter(p => {
    if (filtro === 'CUOTAS' && (p.anulado || !['CUOTA', 'ABONO'].includes(p._i.concepto))) return false
    if (filtro === 'AFILIACION' && (p.anulado || !['AFIL', 'CAMBIO'].includes(p._i.concepto))) return false
    if (filtro === 'ANULADOS' && !p.anulado) return false
    if (!q.trim()) return true
    const texto = norm([String(p.numero_recibo).padStart(6, '0'), p._i.etiqueta, CONCEPTOS[p._i.concepto].label,
      fmtMetodo(p.metodo_pago), p.cajero, p.referencia, fCorta(p.fecha_pago)].join(' '))
    return norm(q).split(/\s+/).every(t => texto.includes(t))
  })
  const totalVisible = sumar(visibles.filter(p => !p.anulado))

  return (
    <>
      <style>{CSS}</style>
      <div className="tp-filtros">
        {[['TODOS', 'Todos'], ['CUOTAS', 'Cuotas y abonos'], ['AFILIACION', 'Afiliación / cambios'], ['ANULADOS', 'Anulados']].map(([k, l]) => (
          <button key={k} type="button" className={`tp-chip${filtro === k ? ' on' : ''}`} onClick={() => setFiltro(k)}>
            {l}<span>{cuenta[k]}</span>
          </button>
        ))}
        <div className="tp-buscar">
          <Search size={13}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar recibo, periodo, cajero…"/>
        </div>
      </div>

      <div className="tp-wrap">
        <div className="tp-scroll">
          <table className="tp-tabla">
            <thead>
              <tr>
                <th>N° recibo</th>
                <th>Pagado el / por</th>
                <th>Concepto</th>
                <th>Periodo que cubre</th>
                <th>Forma de pago</th>
                <th className="num">Valor</th>
                <th style={{ width:1 }}></th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr><td colSpan={7} className="tp-vacio">{filas.length ? 'Ningún pago coincide con el filtro' : 'Sin pagos registrados'}</td></tr>
              ) : visibles.map(p => {
                const c = CONCEPTOS[p._i.concepto]
                return (
                  <tr key={p.id} className={p.anulado ? 'anul' : undefined}>
                    <td className="tp-recibo">{String(p.numero_recibo).padStart(6, '0')}</td>
                    <td>
                      <div style={{ whiteSpace:'nowrap', fontWeight:600 }}>{fCorta(p.fecha_pago)}</div>
                      <div className="tp-rango" style={{ whiteSpace:'normal', maxWidth:150 }}>{p.cajero || '—'}</div>
                    </td>
                    <td>
                      <span className="tp-concepto" style={p.anulado ? { background:'#fee2e2', color:'#dc2626' } : { background:c.bg, color:c.color }}>
                        {p.anulado ? 'ANULADO' : c.label}
                      </span>
                      {p.anulado && <div style={{ fontSize:10.5, marginTop:2 }}>{c.label}</div>}
                    </td>
                    <td>
                      <div className="tp-per" style={p.anulado ? { color:'#94a3b8' } : undefined}>{p._i.etiqueta}</div>
                      {p._i.desde && (
                        <div className="tp-rango">
                          {fNum(p._i.desde)} → {p._i.hasta ? fNum(p._i.hasta) : '—'}
                          {p._i.concepto === 'ABONO' && p._i.dias != null && <> · {p._i.dias} días</>}
                        </div>
                      )}
                      {p.anulado && (
                        <div className="tp-anulnota">
                          Anulado{p.anulado_por_nombre && <> por <strong>{p.anulado_por_nombre}</strong></>}
                          {' el '}{p.anulado_en
                            ? new Date(p.anulado_en).toLocaleString('es-CO', { dateStyle:'medium', timeStyle:'short' })
                            : fCorta(p.fecha_anulacion)}
                          {p.motivo_anulacion && <> — <em>{p.motivo_anulacion}</em></>}
                          {(p.comprobante_numero || p.reverso_numero) && (
                            <div style={{ color:'#7f1d1d' }}>
                              Contabilidad: {p.comprobante_numero && <>comprobante <strong>{p.comprobante_numero}</strong> anulado</>}
                              {p.reverso_numero && <> · nota de reverso <strong>{p.reverso_numero}</strong></>}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      <FormaPagoTag codigo={p.metodo_pago}/>
                      {p.referencia && <div className="tp-rango">Ref: {p.referencia}</div>}
                    </td>
                    <td className="num"><span className="tp-valor" style={p.anulado ? { color:'#94a3b8' } : undefined}>{fmt(p.monto)}</span></td>
                    <td>
                      <div className="tp-acc">
                        {p.soporte_url && (
                          <a className="tp-btn" href={archivoUrl(p.soporte_url)} target="_blank" rel="noreferrer" title="Ver soporte"
                            style={{ color:'#4f46e5', background:'#eef2ff', border:'1.5px solid #c7d2fe' }}><Eye size={13}/></a>
                        )}
                        {!p.anulado && (
                          <button type="button" className="tp-btn" onClick={() => onRecibo?.(p)} title="Imprimir recibo"
                            style={{ color:'#059669', background:'#ecfdf5', border:'1.5px solid #a7f3d0' }}><Printer size={13}/></button>
                        )}
                        {!p.anulado && puedeAnular && (
                          <button type="button" className="tp-btn" onClick={() => onAnular?.(p)} title="Anular este pago"
                            style={{ color:'#dc2626', background:'#fef2f2', border:'1.5px solid #fecaca' }}><Ban size={13}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="tp-pie">
          <div className="tp-desglose">
            <span>Cuotas completas: <b>{porConcepto('CUOTA').length}</b> · <b>{fmt(sumar(porConcepto('CUOTA')))}</b></span>
            {porConcepto('ABONO').length > 0 && <span>Abonos parciales: <b>{porConcepto('ABONO').length}</b> · <b>{fmt(sumar(porConcepto('ABONO')))}</b></span>}
            {porConcepto('AFIL').length > 0 && <span>Afiliación: <b>{fmt(sumar(porConcepto('AFIL')))}</b></span>}
            {porConcepto('CAMBIO').length > 0 && <span>Cambios de beneficiario: <b>{fmt(sumar(porConcepto('CAMBIO')))}</b></span>}
            {anulados.length > 0 && <span style={{ color:'#b91c1c' }}>Anulados (no suman): <b style={{ color:'#b91c1c' }}>{anulados.length}</b> · {fmt(sumar(anulados))}</span>}
            {poliza.pago_hasta && <span>Cubierta hasta: <b>{fCorta(poliza.pago_hasta)}</b></span>}
            {filtro !== 'TODOS' || q.trim() ? <span>Total de lo filtrado: <b>{fmt(totalVisible)}</b></span> : null}
          </div>
          <div className="tp-total">
            <small>Total pagado a la fecha</small>
            <strong>{fmt(total)}</strong>
          </div>
        </div>
      </div>
    </>
  )
}
