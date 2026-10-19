/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — recibo de pago individual (PDF media carta) ║
 * ║  Archivo         : reciboPagoPoliza.js                                  ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-12                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { jsPDF } from 'jspdf'
import { getLogoDataUrl, dibujarLogoPDF } from './logo.js'
import { diaAncla, normalizarInicio } from './periodosPoliza.js'
import { verPDF } from '../store/visorPdf.store.js'
import { numeroALetras } from '../components/ui/CurrencyInput.jsx'

const fmtCOP = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v || 0)
const fmtFecha = d => d ? new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' }) : '—'
const METODOS = { efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta', pse:'PSE', pse_online:'PSE (en línea)', cheque:'Cheque' }

// Valor en letras para el recibo: "Veintiocho mil ciento setenta y ocho pesos M/CTE"
function enLetras(v) {
  const t = numeroALetras(Number(v) || 0)
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)} pesos M/CTE` : ''
}

// salida: 'ver' (visor con Imprimir) o 'blob' (devuelve el PDF para enviarlo por WhatsApp)
export async function imprimirReciboPagoPoliza({ pago, poliza, empresa, salida = 'ver' }) {
  const emp = empresa || {}
  const logoDataUrl = await getLogoDataUrl(emp.logo_url)

  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'letter' })
  const W = 215.9, PL = 18, PR = 18, CW = W - PL - PR
  const BLACK = [17,24,39], GRAY = [100,107,120], LGRAY = [205,210,218], XLGRAY = [243,244,246]
  const GREEN = [5,120,85], GREEN_BG = [236,253,245], GREEN_BORDER = [167,243,208]
  // Un pago de varios periodos = varias filas con el mismo lote → UN recibo
  // con el detalle y el total (pagos viejos: mismas fila/hora/usuario).
  const hermanos = pago.tipo === 'CUOTA' ? (poliza.pagos || []).filter(x => !x.anulado && x.tipo === 'CUOTA' &&
    (pago.lote_id ? x.lote_id === pago.lote_id : (x.creado_en === pago.creado_en && x.usuario_id === pago.usuario_id)))
    .sort((a, b) => String(a.mes_correspondiente).localeCompare(String(b.mes_correspondiente))) : []
  const grupo = hermanos.length > 1 ? hermanos : [pago]
  const totalGrupo = grupo.reduce((t, x) => t + Number(x.monto || 0), 0)
  const nums = grupo.map(x => Number(x.numero_recibo)).sort((a, b) => a - b)
  const numero = String(nums[0]).padStart(6,'0') + (nums.length > 1 ? `–${String(nums[nums.length - 1]).padStart(6,'0')}` : '')
  const obs = grupo.map(x => x.observaciones).find(Boolean) || pago.observaciones
  const esCambio = pago.tipo === 'AFILIACION' && (pago.beneficiario_id || pago.beneficiario_nombre)
  const titulo = esCambio ? 'CAMBIO DE BENEFICIARIO' : pago.tipo === 'AFILIACION' ? 'RECIBO DE AFILIACIÓN' : 'RECIBO DE PAGO'

  let y = 14

  // ── Encabezado: logo | datos de la empresa  ·  recuadro del recibo ─────
  // El texto de la empresa va A LA DERECHA del logo (antes el NIT quedaba
  // debajo, montado sobre el logo).
  const CAJA_W = 58
  const logo = dibujarLogoPDF(doc, logoDataUrl, PL, y, 24, 22)
  const xEmp = logo ? PL + logo.w + 5 : PL
  const anchoEmp = W - PR - CAJA_W - 6 - xEmp
  let ye = y + 4
  doc.setFont('helvetica','bold'); doc.setFontSize(11.5); doc.setTextColor(...BLACK)
  const nombre = doc.splitTextToSize((emp.razon_social || 'Funeraria San José de Ábrego S.A.S').toUpperCase(), anchoEmp)
  doc.text(nombre, xEmp, ye); ye += nombre.length * 4.6
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  const nit = emp.nit ? `NIT ${emp.nit}${emp.digito_verificador ? '-' + emp.digito_verificador : ''}` : null
  for (const linea of [nit, [emp.direccion, emp.municipio_nombre].filter(Boolean).join(', '),
                       [emp.telefono_1 && `Tel. ${emp.telefono_1}`, emp.email].filter(Boolean).join('  ·  ')]) {
    if (!linea) continue
    const ls = doc.splitTextToSize(linea, anchoEmp)
    doc.text(ls, xEmp, ye); ye += ls.length * 3.8
  }

  // Recuadro: tipo, número y fecha
  const xc = W - PR - CAJA_W
  doc.setFillColor(...XLGRAY); doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3)
  doc.roundedRect(xc, y, CAJA_W, 24, 2, 2, 'FD')
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...GREEN)
  doc.text(titulo, xc + CAJA_W / 2, y + 6.5, { align:'center' })
  doc.setFontSize(nums.length > 1 ? 11.5 : 15); doc.setTextColor(...BLACK)
  doc.text(`N.° ${numero}`, xc + CAJA_W / 2, y + 14, { align:'center' })
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY)
  doc.text(fmtFecha(pago.fecha_pago), xc + CAJA_W / 2, y + 20, { align:'center' })

  y = Math.max(ye, y + (logo ? logo.h : 0), y + 24) + 5
  doc.setDrawColor(...GREEN); doc.setLineWidth(0.8); doc.line(PL, y, W - PR, y)
  y += 9

  // ── Datos: dos columnas ───────────────────────────────────────────────
  const campo = (x, ancho, lbl, val) => {
    doc.setFont('helvetica','bold'); doc.setFontSize(6.8); doc.setTextColor(...GRAY)
    doc.text(lbl.toUpperCase(), x, y)
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...BLACK)
    const ls = doc.splitTextToSize(String(val ?? '—'), ancho)
    doc.text(ls, x, y + 4.8)
    return ls.length
  }
  const C2 = PL + CW * 0.62
  const n1 = campo(PL, CW * 0.58, 'Titular', `${poliza.titular_nombre || '—'}${poliza.titular_doc ? `  ·  CC ${poliza.titular_doc}` : ''}`)
  campo(C2, CW * 0.38, 'Póliza N.°', `${poliza.numero_legado || poliza.numero}${poliza.plan_nombre ? `  ·  ${poliza.plan_nombre}` : ''}`)
  y += 6 + n1 * 4.6

  if (grupo.length > 1) {
    // ── Detalle de periodos pagados ──
    doc.setFont('helvetica','bold'); doc.setFontSize(6.8); doc.setTextColor(...GRAY)
    doc.text(`PERIODOS PAGADOS (${grupo.length})`, PL, y)
    y += 3
    doc.setFillColor(...XLGRAY); doc.rect(PL, y, CW, 7, 'F')
    doc.setFontSize(7.2); doc.setTextColor(...GRAY)
    doc.text('RECIBO', PL + 3, y + 4.8); doc.text('PERIODO', PL + 25, y + 4.8); doc.text('DESDE – HASTA', PL + 68, y + 4.8)
    doc.text('VALOR', W - PR - 3, y + 4.8, { align:'right' })
    y += 7
    for (const x of grupo) {
      const per = normalizarInicio(x.mes_correspondiente, diaAncla(poliza))
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...BLACK)
      doc.text(String(x.numero_recibo).padStart(6,'0'), PL + 3, y + 5)
      // Una fila "parcial" que completó un periodo con abono previo dice "completa"
      const etq = /^Completa el periodo/.test(x.notas || '') ? ' (completa)' : x.parcial ? ' (abono)' : ''
      doc.setFont('helvetica','bold'); doc.text(per.etiqueta + etq, PL + 25, y + 5)
      doc.setFont('helvetica','normal'); doc.text(`${fmtFecha(per.iso)} – ${fmtFecha(per.fin_iso)}`, PL + 68, y + 5)
      doc.setFont('helvetica','bold'); doc.text(fmtCOP(x.monto), W - PR - 3, y + 5, { align:'right' })
      doc.setDrawColor(...XLGRAY); doc.setLineWidth(0.2); doc.line(PL, y + 7.5, W - PR, y + 7.5)
      y += 7.5
    }
    y += 6
  } else {
    let concepto
    if (pago.tipo === 'AFILIACION') {
      concepto = esCambio ? `Cambio de beneficiario — ${pago.beneficiario_nombre || ''}` : 'Afiliación del titular (única vez)'
    } else {
      // Periodo contado desde el día de afiliación: "Jun–Jul 2026 (15 jun 2026 – 14 jul 2026)"
      const per = normalizarInicio(pago.mes_correspondiente, diaAncla(poliza))
      concepto = `${pago.parcial ? 'Abono a la cuota del periodo' : 'Cuota del periodo'} ${per.etiqueta}  (${fmtFecha(per.iso)} – ${fmtFecha(per.fin_iso)})`
    }
    const n2 = campo(PL, CW, pago.tipo === 'AFILIACION' ? 'Concepto' : 'Periodo cubierto', concepto)
    y += 6 + n2 * 4.6 + 2
  }

  // ── Valor pagado + en letras ──────────────────────────────────────────
  doc.setFillColor(...GREEN_BG); doc.setDrawColor(...GREEN_BORDER); doc.setLineWidth(0.4)
  doc.roundedRect(PL, y, CW, 24, 2.5, 2.5, 'FD')
  doc.setFont('helvetica','bold'); doc.setFontSize(7.2); doc.setTextColor(...GREEN)
  doc.text(grupo.length > 1 ? 'TOTAL RECIBIDO' : 'VALOR PAGADO', PL + 7, y + 7)
  doc.setFontSize(19); doc.text(fmtCOP(totalGrupo), PL + 7, y + 16)
  doc.setFont('helvetica','italic'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  const letras = doc.splitTextToSize(enLetras(totalGrupo), CW * 0.5)
  doc.text(letras, W - PR - 7, y + 12 - (letras.length - 1) * 1.8, { align:'right' })
  y += 31

  // ── Detalle del pago ──────────────────────────────────────────────────
  const filaChica = (lbl, val) => {
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY)
    doc.text(lbl, PL, y)
    doc.setFont('helvetica','bold'); doc.setTextColor(...BLACK)
    doc.text(String(val ?? '—'), W - PR, y, { align:'right' })
    doc.setDrawColor(...XLGRAY); doc.setLineWidth(0.2); doc.line(PL, y + 2.2, W - PR, y + 2.2)
    y += 7
  }
  filaChica('Fecha de pago', fmtFecha(pago.fecha_pago))
  filaChica('Forma de pago', METODOS[pago.metodo_pago] || pago.metodo_pago || '—')
  if (pago.referencia) filaChica('Referencia / N.° de aprobación', pago.referencia)
  const ultimo = grupo[grupo.length - 1]
  if (ultimo.periodo_hasta && ultimo.tipo !== 'AFILIACION' && !ultimo.parcial) filaChica('Cubre hasta', fmtFecha(ultimo.periodo_hasta))

  // ── Observaciones ─────────────────────────────────────────────────────
  if (obs?.trim()) {
    y += 2
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
    const ls = doc.splitTextToSize(obs.trim(), CW - 10)
    const alto = 9 + ls.length * 4
    doc.setFillColor(...XLGRAY); doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2)
    doc.roundedRect(PL, y, CW, alto, 2, 2, 'FD')
    doc.setFont('helvetica','bold'); doc.setFontSize(6.8); doc.setTextColor(...GRAY)
    doc.text('OBSERVACIONES', PL + 5, y + 5.5)
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...BLACK)
    doc.text(ls, PL + 5, y + 10)
    y += alto + 4
  }

  y += 18

  // ── Firmas — quien elabora y quien recibe ──────────────────────────────
  doc.setDrawColor(...GRAY); doc.setLineWidth(0.3)
  const colW = (CW - 20) / 2
  doc.line(PL, y, PL + colW, y)
  doc.line(PL + colW + 20, y, W - PR, y)
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...BLACK)
  doc.text('Elabora', PL, y + 4.5)
  doc.text('Recibe', PL + colW + 20, y + 4.5)
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY)
  doc.text(pago.cajero || '—', PL, y + 9)
  doc.text(poliza.titular_nombre || '—', PL + colW + 20, y + 9)
  y += 22

  // ── Pie ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica','normal'); doc.setFontSize(6.8); doc.setTextColor(...LGRAY)
  doc.text('Conserve este recibo como soporte de su pago  ·  Documento generado por Orquídea ERP', W / 2, y, { align:'center' })

  const tituloVisor = `${titulo === 'RECIBO DE PAGO' ? 'Recibo de pago' : titulo.charAt(0) + titulo.slice(1).toLowerCase()} N° ${numero}`
  if (salida === 'blob') return { blob: doc.output('blob'), nombre: `Recibo-${numero}.pdf`, titulo: tituloVisor, numero, total: totalGrupo, grupo }
  verPDF(doc, tituloVisor, `Recibo-${numero}`)
}
