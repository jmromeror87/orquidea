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

const fmtCOP = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v || 0)
const fmtFecha = d => d ? new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' }) : '—'
const METODOS = { efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta', pse:'PSE', pse_online:'PSE (en línea)', cheque:'Cheque' }

export async function imprimirReciboPagoPoliza({ pago, poliza, empresa }) {
  const emp = empresa || {}
  const logoDataUrl = await getLogoDataUrl(emp.logo_url)

  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'letter' })
  const W = 215.9, PL = 20, PR = 20, CW = W - PL - PR
  const BLACK = [0,0,0], DARK = [26,26,46], GRAY = [90,90,90], LGRAY = [200,200,200]
  const GREEN = [5,150,105], GREEN_BG = [236,253,245], GREEN_BORDER = [167,243,208]

  let y = 10

  // ── Encabezado ────────────────────────────────────────────────────────
  const yBloqueInicio = y
  const logo = dibujarLogoPDF(doc, logoDataUrl, PL, y, 14, 14)
  const xTexto = logo ? PL + logo.w + 4 : PL
  if (logo && logo.h > 5) y += (logo.h - 5) / 2

  doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(...BLACK)
  const nombreLineas = doc.splitTextToSize((emp.razon_social || 'Funeraria San José de Ábrego S.A.S').toUpperCase(), CW - (logo ? logo.w + 4 : 0))
  doc.text(nombreLineas, xTexto, y + 3)

  y = Math.max(yBloqueInicio + 5, logo ? yBloqueInicio + logo.h - 6 : 0) + 4 + (nombreLineas.length - 1) * 3.5

  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY)
  const infoEmp = [emp.nit && `NIT ${emp.nit}`, emp.telefono_1 && `Tel ${emp.telefono_1}`].filter(Boolean).join('  ·  ')
  const infoLineas = doc.splitTextToSize(infoEmp, CW)
  doc.text(infoLineas, PL, y)
  y = Math.max(y + infoLineas.length * 2.8, yBloqueInicio + (logo ? logo.h : 0) + 2) + 3

  doc.setDrawColor(...BLACK); doc.setLineWidth(0.6); doc.line(PL, y, W-PR, y)
  y += 6

  // ── Título + N° recibo ────────────────────────────────────────────────
  doc.setFont('helvetica','bold'); doc.setFontSize(11.5); doc.setTextColor(...BLACK)
  doc.text('RECIBO DE PAGO', PL, y)
  doc.setFontSize(10)
  doc.text(`N.° ${String(pago.numero_recibo).padStart(6,'0')}`, W - PR, y, { align:'right' })
  y += 2
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2); doc.line(PL, y, W-PR, y)
  y += 7

  // ── Datos de la póliza / titular ──────────────────────────────────────
  const fila = (lbl, val) => {
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(...GRAY)
    doc.text(lbl.toUpperCase(), PL, y)
    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...BLACK)
    doc.text(String(val ?? '—'), PL, y + 4)
    y += 9
  }
  fila('Póliza N.°', poliza.numero_legado || poliza.numero)
  fila('Titular', poliza.titular_nombre)
  fila('Período cubierto', pago.periodo_hasta && pago.mes_correspondiente
    ? `${fmtFecha(pago.mes_correspondiente)}  -  ${fmtFecha(pago.periodo_hasta)}`
    : fmtFecha(pago.mes_correspondiente))

  y += 2

  // ── Monto — destacado ─────────────────────────────────────────────────
  doc.setFillColor(...GREEN_BG); doc.setDrawColor(...GREEN_BORDER); doc.setLineWidth(0.4)
  doc.roundedRect(PL, y, CW, 20, 2, 2, 'FD')
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GREEN)
  doc.text('VALOR PAGADO', PL + 6, y + 7)
  doc.setFontSize(17)
  doc.text(fmtCOP(pago.monto), PL + 6, y + 15.5)
  y += 26

  // ── Detalle del pago ──────────────────────────────────────────────────
  const filaChica = (lbl, val) => {
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
    doc.text(lbl, PL, y)
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...BLACK)
    doc.text(String(val ?? '—'), W - PR, y, { align:'right' })
    y += 5.5
  }
  filaChica('Fecha de pago', fmtFecha(pago.fecha_pago))
  filaChica('Método de pago', METODOS[pago.metodo_pago] || pago.metodo_pago || '—')
  if (pago.referencia) filaChica('Referencia', pago.referencia)

  y += 4
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2); doc.line(PL, y, W-PR, y)
  y += 16

  // ── Firmas — quien elabora y quien recibe ──────────────────────────────
  doc.setDrawColor(...GRAY); doc.setLineWidth(0.3)
  const colW = (CW - 16) / 2
  doc.line(PL, y, PL + colW, y)
  doc.line(PL + colW + 16, y, PL + colW + 16 + colW, y)

  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...BLACK)
  doc.text('Elabora', PL, y + 4.5)
  doc.text('Recibe', PL + colW + 16, y + 4.5)

  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GRAY)
  doc.text(pago.cajero || '—', PL, y + 9)
  doc.text(poliza.titular_nombre || '—', PL + colW + 16, y + 9)

  y += 20

  // ── Pie ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...LGRAY)
  doc.text('Documento generado por Orquídea ERP', W/2, y, { align:'center' })

  doc.save(`Recibo-${String(pago.numero_recibo).padStart(6,'0')}.pdf`)
}
