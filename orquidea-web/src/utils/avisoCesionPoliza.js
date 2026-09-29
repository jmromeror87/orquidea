/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — aviso y autorización de cambio de titular  ║
 * ║  Archivo         : avisoCesionPoliza.js                                ║
 * ║  Versión         : v1.1.0                                               ║
 * ║  Fecha           : 2026-09-12                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Cuando fallece el TITULAR de la póliza (no un beneficiario), la póliza no
 * se cierra — sigue vigente para el resto del grupo familiar, pero requiere
 * que un familiar asuma la titularidad. Este documento se entrega a la
 * familia como constancia del trámite pendiente.
 */
import { jsPDF } from 'jspdf'
import { getLogoDataUrl, dibujarLogoPDF } from './logo.js'
import { archivoUrl } from './archivoUrl.js'

// PDF nativo (texto/cajas dibujadas con jsPDF), no HTML convertido — la
// conversión vía html2canvas resultaba en páginas en blanco. Mismo diseño
// visual que el contrato y la orden de servicio, que sí funcionan bien.
export async function imprimirAvisoCesionPoliza({ poliza, titularFallecido, beneficiarios, empresa }) {
  const emp = empresa || {}
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const candidatos = (beneficiarios || []).filter(b => !b.ejecutado)
  const logoDataUrl = await getLogoDataUrl(emp.logo_url)

  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W = 210, PL = 15, PR = 15, CW = W - PL - PR
  const BLACK = [0,0,0], GRAY = [90,90,90], LGRAY = [180,180,180]
  const GOLD = [201,160,32], AMBER_BG = [255,251,235], AMBER_BORDER = [253,230,138], AMBER_TEXT = [146,64,14]

  let y = 14

  // ── Encabezado ────────────────────────────────────────────────────────
  const yBloqueInicio = y
  const logo = dibujarLogoPDF(doc, logoDataUrl, PL, y, 18, 18)
  const xTexto = logo ? PL + logo.w + 5 : PL
  if (logo && logo.h > 6) y += (logo.h - 6) / 2

  doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...BLACK)
  doc.text((emp.razon_social || 'Funeraria San José de Ábrego S.A.S').toUpperCase(), xTexto, y + 4)

  y = Math.max(yBloqueInicio + 7, logo ? yBloqueInicio + logo.h - 6 : 0) + 5

  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  const infoEmp = [
    emp.nit && `NIT: ${emp.nit}`, emp.direccion,
    emp.telefono_1 && `Tel: ${emp.telefono_1}`,
  ].filter(Boolean).join('   |   ')
  const infoLineas = doc.splitTextToSize(infoEmp, CW)
  doc.text(infoLineas, PL, y)
  y = Math.max(y + infoLineas.length * 3.2, yBloqueInicio + (logo ? logo.h : 0) + 3) + 2

  doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.line(PL, y, W-PR, y)
  y += 8

  // ── Título ────────────────────────────────────────────────────────────
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...BLACK)
  doc.text('AVISO DE CESIÓN DE PÓLIZA', W/2, y, { align:'center' })
  y += 5
  doc.setFontSize(10)
  doc.text('POR FALLECIMIENTO DEL TITULAR', W/2, y, { align:'center' })
  y += 9

  // ── Recuadro de datos ─────────────────────────────────────────────────
  const datos = [
    ['Póliza N.°', String(poliza.numero_legado || poliza.numero)],
    ['Plan', poliza.plan_nombre || '—'],
    ['Titular fallecido', titularFallecido.nombre],
    ['Documento', titularFallecido.numero_documento || '—'],
    ['Fecha de aviso', hoy],
  ]
  const filaAlto = 7
  const cajaAlto = filaAlto * Math.ceil(datos.length / 2) + 6
  doc.setFillColor(248, 250, 252); doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3)
  doc.roundedRect(PL, y, CW, cajaAlto, 2, 2, 'FD')
  let yy = y + 6
  datos.forEach(([lbl, val], i) => {
    const col = i % 2, fila = Math.floor(i / 2)
    const x = PL + 6 + col * (CW / 2)
    const yPos = yy + fila * filaAlto
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GRAY)
    doc.text(lbl.toUpperCase(), x, yPos)
    doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(...BLACK)
    doc.text(String(val), x, yPos + 4.5)
  })
  y += cajaAlto + 8

  // ── Aviso destacado ───────────────────────────────────────────────────
  const textoAviso = 'Esta póliza SIGUE VIGENTE para el resto del grupo familiar — no se pierde la cobertura ni el ' +
    'historial de pagos y antigüedad. Sin embargo, es obligatorio que un familiar asuma la titularidad (pago de ' +
    'las cuotas) para que la póliza se mantenga activa hacia adelante.'
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5)
  const lineasAviso = doc.splitTextToSize(textoAviso, CW - 12)
  const avisoAlto = lineasAviso.length * 4.6 + 8
  doc.setFillColor(...AMBER_BG); doc.setDrawColor(...AMBER_BORDER); doc.setLineWidth(0.4)
  doc.roundedRect(PL, y, CW, avisoAlto, 2, 2, 'FD')
  doc.setTextColor(...AMBER_TEXT)
  doc.text(lineasAviso, PL + 6, y + 6)
  y += avisoAlto + 8

  // ── Párrafo explicativo ───────────────────────────────────────────────
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...BLACK)
  const parrafo1 = `Por medio del presente documento se informa a la familia de ${titularFallecido.nombre} ` +
    `(q.e.p.d.), identificado(a) con documento ${titularFallecido.numero_documento || '—'}, titular de la ` +
    `póliza N.° ${poliza.numero_legado || poliza.numero} de ${emp.razon_social || 'la funeraria'}, que debe ` +
    `realizarse el trámite de cesión de titularidad a favor de uno de los siguientes beneficiarios del grupo ` +
    `familiar, o de otro familiar autorizado:`
  const lineas1 = doc.splitTextToSize(parrafo1, CW)
  doc.text(lineas1, PL, y)
  y += lineas1.length * 4.6 + 4

  // ── Lista de candidatos ───────────────────────────────────────────────
  if (candidatos.length) {
    candidatos.forEach(b => {
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5)
      doc.text('•', PL + 2, y)
      doc.text(`${b.nombre}${b.parentesco ? ' — ' + b.parentesco : ''}`, PL + 7, y)
      y += 5.5
    })
  } else {
    doc.setFont('helvetica','italic'); doc.setFontSize(9.5)
    doc.text('No hay beneficiarios activos registrados — debe indicarse el nuevo titular directamente en la funeraria.', PL, y)
    y += 5.5
  }
  y += 4

  doc.setFont('helvetica','normal'); doc.setFontSize(9.5)
  const parrafo2 = `Mientras se define el nuevo titular, la póliza conserva su estado, su historial de pagos y la ` +
    `antigüedad ya cumplida. El nuevo titular deberá presentarse en las oficinas de ${emp.razon_social || 'la funeraria'} ` +
    `con su documento de identidad para formalizar el cambio.`
  const lineas2 = doc.splitTextToSize(parrafo2, CW)
  doc.text(lineas2, PL, y)
  y += lineas2.length * 4.6 + 30

  // ── Firmas ────────────────────────────────────────────────────────────
  if (y > 250) y = 250
  doc.setDrawColor(...GRAY); doc.setLineWidth(0.3)
  const colW = (CW - 20) / 2
  doc.line(PL, y, PL + colW, y)
  doc.line(PL + colW + 20, y, PL + colW + 20 + colW, y)
  doc.setFontSize(9); doc.setTextColor(...GRAY)
  doc.text('Recibido por (familiar)', PL + colW/2, y + 5, { align:'center' })
  doc.text('Entregado por / Funeraria', PL + colW + 20 + colW/2, y + 5, { align:'center' })

  doc.save(`aviso-cesion-poliza-${poliza.numero_legado || poliza.numero}.pdf`)
}

/**
 * Autorización para cambio de titular — reproduce el formato en papel que ya
 * usa la funeraria (cédulas, motivo de la modificación, firma + huella de
 * quien autoriza y de la empresa). Se genera automáticamente con los datos
 * ya digitados en el sistema al confirmar una transferencia de titular —
 * solo queda imprimirla y hacerla firmar/huellar en el momento.
 */
export function imprimirAutorizacionCambioTitular({ poliza, autoriza, nuevoTitular, motivo, empresa }) {
  const w = window.open('', '_blank', 'width=800,height=1000')
  if (!w) return

  const emp = empresa || {}
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const quienAutoriza = autoriza || nuevoTitular

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <title>Autorización cambio de titular — Póliza ${poliza.numero_legado || poliza.numero}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;padding:40px;font-size:13.5px;line-height:1.7}
    h1{font-size:16px;text-align:center;text-transform:uppercase;letter-spacing:.5px;margin-bottom:18px}
    .meta{font-size:12px;color:#333;margin-bottom:18px}
    .meta div{margin-bottom:2px}
    .rot{text-transform:uppercase;font-weight:800;text-align:center;margin:22px 0 10px;font-size:14px;letter-spacing:1px}
    p{margin-bottom:14px;text-align:justify}
    .u{border-bottom:1px solid #333;padding:0 4px}
    .firmas{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:60px}
    .firma-box{text-align:center}
    .huella{width:110px;height:110px;border:1.5px solid #333;margin:0 auto 8px}
    .firma-line{border-top:1px solid #333;padding-top:6px;font-size:11.5px;font-weight:700}
    .ciudad-fecha{margin-top:50px;font-size:12.5px}
    @media print{ body{padding:16px} }
  </style></head><body>
    ${emp.logo_url ? `<div style="text-align:center;margin-bottom:10px"><img src="${archivoUrl(emp.logo_url)}" style="max-width:55mm;max-height:22mm;object-fit:contain"></div>` : ''}
    <h1>Autorización para cambio de titular</h1>

    <div class="meta">
      <div><strong>FECHA:</strong> ${hoy}</div>
      <div><strong>REPRESENTANTE LEGAL:</strong> ${emp.razon_social || 'Funeraria San José de Ábrego S.A.S'}${emp.nit ? '. NIT. ' + emp.nit : ''}</div>
      <div><strong>CONTRATO No.</strong> ${poliza.numero_legado || poliza.numero}</div>
    </div>

    <p>
      Yo, <strong>${quienAutoriza.nombres || quienAutoriza.nombre} ${quienAutoriza.apellidos || ''}</strong>,
      identificado(a) con la Cédula de Ciudadanía No. <strong>${quienAutoriza.numero_documento || '________________'}</strong>
      de <span class="u">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>,
      y como beneficiario(a) del Contrato de Previsión Exequial No. <strong>${poliza.numero_legado || poliza.numero}</strong>
      de la empresa ${emp.razon_social || 'FUNERARIA SAN JOSÉ DE ÁBREGO S.A.S'},
    </p>

    <div class="rot">Autorizo</div>

    <p>
      A <strong>${nuevoTitular.nombres || nuevoTitular.nombre} ${nuevoTitular.apellidos || ''}</strong>,
      identificado(a) con la Cédula de Ciudadanía No. <strong>${nuevoTitular.numero_documento || '________________'}</strong>
      de <span class="u">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>,
      para ser <strong>Titular del Grupo Familiar</strong> cobijado bajo el Contrato No.
      <strong>${poliza.numero_legado || poliza.numero}</strong>${poliza.fecha_inicio ? ', ' + new Date(poliza.fecha_inicio).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' }) : ''}.
      Tel. ${nuevoTitular.telefono || '________________'}
    </p>

    <p>
      La anterior modificación se realiza por: <strong>${motivo || '________________________________________'}</strong>
    </p>

    <div class="firmas">
      <div class="firma-box">
        <div class="huella"></div>
        <div class="firma-line">${quienAutoriza.nombres || quienAutoriza.nombre} ${quienAutoriza.apellidos || ''}</div>
        <div style="font-size:10.5px;color:#666;margin-top:2px">QUIEN AUTORIZA</div>
      </div>
      <div class="firma-box">
        <div class="huella"></div>
        <div class="firma-line">&nbsp;</div>
        <div style="font-size:10.5px;color:#666;margin-top:2px">POR LA EMPRESA</div>
      </div>
    </div>

    <div class="ciudad-fecha">${emp.municipio || 'Ábrego'}, ${hoy}</div>
  </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 350)
}
