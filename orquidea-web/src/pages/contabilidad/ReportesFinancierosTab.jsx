/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contabilidad — Reportes financieros                  ║
 * ║  Archivo         : ReportesFinancierosTab.jsx                           ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Balance de Comprobación, Estado de Resultados y Estado de Situación
 * Financiera — misma filosofía de los reportes que ya emite TNS (jerarquía
 * de cuentas, solo ramas con movimiento, subtotales por nivel), con
 * exportación a PDF con el logo y los datos legales de la empresa.
 */
import { useState, useEffect } from 'react'
import { FileBarChart, Download, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtPct = (n) => n == null ? '—' : `${n.toFixed(1)}%`
const codFmt = (codigo) => (codigo || '').replace('.', '')
const hoyISO = () => new Date().toISOString().slice(0, 10)
const primerDiaMes = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

const REPORTES = [
  { key: 'balance',    label: 'Balance de Comprobación' },
  { key: 'resultados', label: 'Estado de Resultados' },
  { key: 'situacion',  label: 'Estado de Situación Financiera' },
]

let _logoDataUrl = null
async function obtenerLogoBase64() {
  if (_logoDataUrl) return _logoDataUrl
  try {
    const res = await fetch('/logo.jpg')
    const blob = await res.blob()
    _logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch { _logoDataUrl = null }
  return _logoDataUrl
}

// ── Estado de Resultados en cascada — igual a como lo presentan los
// sistemas contables actuales (Siigo, World Office, TNS): renglones de
// ingreso/costo/gasto que van llegando a subtotales (utilidad bruta,
// operacional, neta), cada uno expandible al detalle de cuentas del PUC
// que lo componen, con el margen % de cada subtotal frente al ingreso.
function FilaGrupo({ label, valor, prefijos, data, signo = 1, bold = false, color, indent = 0 }) {
  const [abierto, setAbierto] = useState(false)
  // Nivel 3 ("Cuenta" del PUC) es el detalle natural de un P&G — bajar hasta
  // subcuenta/auxiliar sería más granular de lo que cualquier gerente lee.
  const detalle = data.filter(f => f.nivel === 3 && prefijos.some(p => f.codigo.startsWith(p)))
  const tieneDetalle = detalle.length > 0

  return (
    <>
      <tr style={{ cursor: tieneDetalle ? 'pointer' : 'default' }} onClick={() => tieneDetalle && setAbierto(a => !a)}>
        <td style={{ paddingLeft: 12 + indent, fontWeight: bold ? 800 : 500, color: color || '#374151' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {tieneDetalle ? (abierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span style={{ width: 12 }} />}
            {label}
          </span>
        </td>
        <td style={{ textAlign: 'right', fontWeight: bold ? 800 : 600, color: color || '#0F1035' }}>
          {signo < 0 && valor > 0 ? '(' : ''}{fmt(valor)}{signo < 0 && valor > 0 ? ')' : ''}
        </td>
      </tr>
      {abierto && detalle.map(f => (
        <tr key={f.codigo} style={{ fontSize: 12 }}>
          <td style={{ paddingLeft: 34 + indent, color: '#9CA3AF' }}>
            <span className="ctb-codigo">{codFmt(f.codigo)}</span> {f.nombre}
          </td>
          <td style={{ textAlign: 'right', color: '#6B7280' }}>{fmt(f.valor)}</td>
        </tr>
      ))}
    </>
  )
}

function EstadoResultadosView({ meta, data }) {
  if (!meta) return null
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <tbody>
          <FilaGrupo label="Ingresos operacionales" valor={meta.ingresos_operacionales} prefijos={['41']} data={data} />
          <FilaGrupo label="Costo de ventas" valor={meta.costo_ventas} prefijos={['6']} data={data} signo={-1} />
          {meta.costo_produccion > 0 && (
            <FilaGrupo label="Costo de producción" valor={meta.costo_produccion} prefijos={['7']} data={data} signo={-1} />
          )}
          <tr style={{ borderTop: '1.5px solid #E2E5F0' }}>
            <td style={{ paddingLeft: 12, fontWeight: 800, color: '#0F1035' }}>= Utilidad bruta</td>
            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F1035' }}>{fmt(meta.utilidad_bruta)}</td>
          </tr>
          <tr>
            <td style={{ paddingLeft: 12, fontSize: 11, color: '#9CA3AF' }}>Margen bruto</td>
            <td style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF' }}>{fmtPct(meta.margen_bruto)}</td>
          </tr>

          <FilaGrupo label="Gastos de administración" valor={meta.gastos_admon} prefijos={['51']} data={data} signo={-1} />
          <FilaGrupo label="Gastos de ventas" valor={meta.gastos_ventas} prefijos={['52']} data={data} signo={-1} />
          <tr style={{ borderTop: '1.5px solid #E2E5F0' }}>
            <td style={{ paddingLeft: 12, fontWeight: 800, color: '#0F1035' }}>= Utilidad operacional</td>
            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F1035' }}>{fmt(meta.utilidad_operacional)}</td>
          </tr>
          <tr>
            <td style={{ paddingLeft: 12, fontSize: 11, color: '#9CA3AF' }}>Margen operacional</td>
            <td style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF' }}>{fmtPct(meta.margen_operacional)}</td>
          </tr>

          <FilaGrupo label="Ingresos no operacionales" valor={meta.ingresos_no_operacionales} prefijos={['42']} data={data} />
          <FilaGrupo label="Gastos no operacionales" valor={meta.gastos_no_operacionales} prefijos={['53']} data={data} signo={-1} />

          <tr style={{ borderTop: '2px solid #0F1035' }}>
            <td style={{ paddingLeft: 12, fontWeight: 900, fontSize: 14, color: meta.utilidad_neta >= 0 ? '#059669' : '#DC2626' }}>
              = {meta.utilidad_neta >= 0 ? 'Utilidad neta' : 'Pérdida neta'}
            </td>
            <td style={{ textAlign: 'right', fontWeight: 900, fontSize: 14, color: meta.utilidad_neta >= 0 ? '#059669' : '#DC2626' }}>
              {fmt(meta.utilidad_neta)}
            </td>
          </tr>
          <tr>
            <td style={{ paddingLeft: 12, fontSize: 11, color: '#9CA3AF' }}>Margen neto</td>
            <td style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF' }}>{fmtPct(meta.margen_neto)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function ReportesFinancierosTab() {
  const [reporte, setReporte] = useState('balance')
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoyISO())
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState(null)

  useEffect(() => { api.get('/empresa').then(r => setEmpresa(r.data.data)).catch(() => {}) }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      let url, params
      if (reporte === 'balance')    { url = '/contabilidad/reportes/balance-comprobacion'; params = { desde, hasta } }
      if (reporte === 'resultados') { url = '/contabilidad/reportes/estado-resultados';    params = { desde, hasta } }
      if (reporte === 'situacion')  { url = '/contabilidad/reportes/estado-situacion';      params = { hasta } }
      const r = await api.get(url, { params })
      setData(r.data.data || [])
      setMeta(r.data.meta || null)
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [reporte, desde, hasta])

  const exportarPDF = async () => {
    const doc = new jsPDF()
    const logo = await obtenerLogoBase64()
    const titulo = REPORTES.find(r => r.key === reporte)?.label

    if (logo) { try { doc.addImage(logo, 'JPEG', 14, 10, 16, 16) } catch { /* logo opcional */ } }
    doc.setFontSize(13); doc.setTextColor(46, 49, 146)
    doc.text(empresa?.razon_social || 'Funeraria San José de Abrego S.A.S', logo ? 34 : 14, 16)
    doc.setFontSize(9); doc.setTextColor(120)
    doc.text(`NIT ${empresa?.nit || '900799674-8'}`, logo ? 34 : 14, 21)
    doc.setFontSize(12); doc.setTextColor(15, 16, 53)
    doc.text(titulo, 14, 32)
    doc.setFontSize(8.5); doc.setTextColor(120)
    doc.text(
      reporte === 'situacion' ? `Corte a ${hasta}` : `Del ${desde} al ${hasta}`,
      14, 37
    )
    doc.text(`Generado ${new Date().toLocaleString('es-CO')}`, 14, 41)

    if (reporte === 'balance') {
      autoTable(doc, {
        startY: 46,
        head: [['Código', 'Cuenta', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Final']],
        body: data.map(f => [
          codFmt(f.codigo), f.nombre,
          fmt(f.saldo_anterior), fmt(f.debito_periodo), fmt(f.credito_periodo), fmt(f.saldo_final),
        ]),
        headStyles: { fillColor: [46, 49, 146] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        styles: { fontSize: 7.5 },
        didParseCell: (d) => { if (data[d.row.index]?.nivel <= 2) d.cell.styles.fontStyle = 'bold' },
      })
    } else if (reporte === 'resultados') {
      const negParen = (v) => v > 0 ? `(${fmt(v)})` : fmt(v)
      const filasPyG = [
        ['Ingresos operacionales', fmt(meta.ingresos_operacionales)],
        ['Costo de ventas', negParen(meta.costo_ventas)],
        ...(meta.costo_produccion > 0 ? [['Costo de producción', negParen(meta.costo_produccion)]] : []),
        ['= Utilidad bruta', fmt(meta.utilidad_bruta)],
        [`  Margen bruto`, fmtPct(meta.margen_bruto)],
        ['Gastos de administración', negParen(meta.gastos_admon)],
        ['Gastos de ventas', negParen(meta.gastos_ventas)],
        ['= Utilidad operacional', fmt(meta.utilidad_operacional)],
        [`  Margen operacional`, fmtPct(meta.margen_operacional)],
        ['Ingresos no operacionales', fmt(meta.ingresos_no_operacionales)],
        ['Gastos no operacionales', negParen(meta.gastos_no_operacionales)],
        [meta.utilidad_neta >= 0 ? '= UTILIDAD NETA' : '= PÉRDIDA NETA', fmt(meta.utilidad_neta)],
        [`  Margen neto`, fmtPct(meta.margen_neto)],
      ]
      autoTable(doc, {
        startY: 46,
        head: [['Concepto', 'Valor']],
        body: filasPyG,
        headStyles: { fillColor: [46, 49, 146] },
        columnStyles: { 1: { halign: 'right' } },
        styles: { fontSize: 9 },
        didParseCell: (d) => { if (filasPyG[d.row.index]?.[0].startsWith('=')) d.cell.styles.fontStyle = 'bold' },
      })
    } else {
      autoTable(doc, {
        startY: 46,
        head: [['Código', 'Cuenta', 'Valor']],
        body: data.map(f => [codFmt(f.codigo), f.nombre, fmt(f.valor)]),
        headStyles: { fillColor: [46, 49, 146] },
        columnStyles: { 2: { halign: 'right' } },
        styles: { fontSize: 8 },
        didParseCell: (d) => { if (data[d.row.index]?.nivel <= 2) d.cell.styles.fontStyle = 'bold' },
      })
      if (reporte === 'situacion') {
        const y = doc.lastAutoTable.finalY + 8
        doc.setFontSize(9.5); doc.setTextColor(15, 16, 53)
        doc.text(`Total Activo: ${fmt(meta?.total_activo)}`, 14, y)
        doc.text(`Total Pasivo + Patrimonio: ${fmt(meta?.total_pasivo_patrimonio)}`, 14, y + 6)
      }
    }

    doc.save(`${reporte}-${hasta}.pdf`)
    toast.success('Reporte exportado a PDF con éxito')
  }

  return (
    <div>
      <div className="ctb-head-row">
        <div>
          <div className="ctb-title" style={{ fontSize: 20 }}>Reportes Financieros</div>
          <div className="ctb-sub">Generados en vivo desde el libro diario — misma jerarquía del PUC</div>
        </div>
        <div className="ctb-actions">
          <button className="btn-icon" onClick={cargar} title="Actualizar"><RefreshCw size={15} /></button>
          <button className="btn-primary" onClick={exportarPDF} disabled={loading || !data.length}>
            <Download size={15} /> Exportar PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
        {REPORTES.map(r => (
          <button key={r.key} className={`ctb-cat-pill${reporte === r.key ? ' active' : ''}`}
            onClick={() => setReporte(r.key)}
            style={{
              border: '1.5px solid #E2E5F0', background: reporte === r.key ? 'linear-gradient(135deg,#2E3192,#4338CA)' : '#fff',
              color: reporte === r.key ? '#fff' : '#374151', borderRadius: 20, padding: '8px 16px',
              fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}>
            <FileBarChart size={13} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />{r.label}
          </button>
        ))}
      </div>

      <div className="sec-card">
        <div className="sec-body">
          <div className="ctb-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {reporte !== 'situacion' && (
                <>
                  <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 700 }}>Desde</span>
                  <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                    className="select-filter" style={{ fontFamily: 'inherit' }} />
                </>
              )}
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 700 }}>{reporte === 'situacion' ? 'Corte a' : 'Hasta'}</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="select-filter" style={{ fontFamily: 'inherit' }} />
            </div>
          </div>

          {meta && (
            <div className="ctb-kpis" style={{ gridTemplateColumns: reporte === 'balance' ? 'repeat(2,1fr)' : reporte === 'resultados' ? 'repeat(4,1fr)' : 'repeat(3,1fr)', marginTop: 4 }}>
              {reporte === 'balance' && (
                <>
                  <div className="ctb-kpi" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <div className="ctb-kpi-label">Total débitos del período</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 18 }}>{fmt(meta.total_debito)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <div className="ctb-kpi-label">Total créditos del período</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 18 }}>{fmt(meta.total_credito)}</div>
                  </div>
                </>
              )}
              {reporte === 'resultados' && (
                <>
                  <div className="ctb-kpi" style={{ background: '#EEF2FF', color: '#2E3192' }}>
                    <div className="ctb-kpi-label">Total ingresos</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.total_ingresos)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <div className="ctb-kpi-label">Utilidad bruta · {fmtPct(meta.margen_bruto)}</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.utilidad_bruta)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <div className="ctb-kpi-label">Utilidad operacional · {fmtPct(meta.margen_operacional)}</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.utilidad_operacional)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: meta.utilidad_neta >= 0 ? '#ECFDF5' : '#FEF2F2', color: meta.utilidad_neta >= 0 ? '#059669' : '#DC2626' }}>
                    <div className="ctb-kpi-label">{meta.utilidad_neta >= 0 ? 'Utilidad neta' : 'Pérdida neta'} · {fmtPct(meta.margen_neto)}</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.utilidad_neta)}</div>
                  </div>
                </>
              )}
              {reporte === 'situacion' && (
                <>
                  <div className="ctb-kpi" style={{ background: '#EEF2FF', color: '#2E3192' }}>
                    <div className="ctb-kpi-label">Total Activo</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.total_activo)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                    <div className="ctb-kpi-label">Total Pasivo</div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.total_pasivo)}</div>
                  </div>
                  <div className="ctb-kpi" style={{ background: meta.cuadra ? '#ECFDF5' : '#FFFBEB', color: meta.cuadra ? '#059669' : '#D97706' }}>
                    <div className="ctb-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {meta.cuadra ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} Total Patrimonio
                    </div>
                    <div className="ctb-kpi-value" style={{ fontSize: 17 }}>{fmt(meta.total_patrimonio)}</div>
                  </div>
                </>
              )}
            </div>
          )}

          {loading ? (
            <div className="ctb-empty">Generando reporte…</div>
          ) : data.length === 0 ? (
            <div className="ctb-empty">Sin movimientos contabilizados en este rango todavía.</div>
          ) : reporte === 'resultados' ? (
            <EstadoResultadosView meta={meta} data={data} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Código</th><th>Cuenta</th>
                    {reporte === 'balance' ? (
                      <>
                        <th style={{ textAlign: 'right' }}>Saldo Anterior</th>
                        <th style={{ textAlign: 'right', color: '#059669' }}>Débito</th>
                        <th style={{ textAlign: 'right', color: '#7C3AED' }}>Crédito</th>
                        <th style={{ textAlign: 'right' }}>Saldo Final</th>
                      </>
                    ) : (
                      <th style={{ textAlign: 'right' }}>Valor</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.map(f => (
                    <tr key={f.codigo}>
                      <td>
                        <span className="ctb-codigo" style={{ paddingLeft: (f.nivel - 1) * 8, fontWeight: f.nivel <= 2 ? 800 : 600 }}>
                          {codFmt(f.codigo)}
                        </span>
                      </td>
                      <td style={{ paddingLeft: (f.nivel - 1) * 12, fontWeight: f.nivel <= 2 ? 800 : 500 }}>{f.nombre}</td>
                      {reporte === 'balance' ? (
                        <>
                          <td style={{ textAlign: 'right' }}>{fmt(f.saldo_anterior)}</td>
                          <td style={{ textAlign: 'right', color: '#059669' }}>{f.debito_periodo ? fmt(f.debito_periodo) : ''}</td>
                          <td style={{ textAlign: 'right', color: '#7C3AED' }}>{f.credito_periodo ? fmt(f.credito_periodo) : ''}</td>
                          <td style={{ textAlign: 'right', fontWeight: f.nivel <= 2 ? 800 : 600 }}>{fmt(f.saldo_final)}</td>
                        </>
                      ) : (
                        <td style={{ textAlign: 'right', fontWeight: f.nivel <= 2 ? 800 : 500 }}>{fmt(f.valor)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
