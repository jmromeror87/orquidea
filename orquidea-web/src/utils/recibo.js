/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : POS — recibo imprimible (ticket térmico 80mm)        ║
 * ║  Archivo         : recibo.js                                           ║
 * ║  Fecha           : 2026-09-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
// Abre una ventana nueva angosta (como en una impresora térmica 3nstar
// RPT004 80mm) con el ticket formateado y dispara el diálogo de impresión.
// El navegador se encarga de mandarlo a la impresora térmica configurada
// como impresora del sistema — no requiere driver ESC/POS aparte.
export function imprimirReciboPOS(recibo) {
  const w = window.open('', '_blank', 'width=340,height=700,toolbar=0,menubar=0,scrollbars=1')
  if (!w) return

  const fmt = n => Number(n ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
  const fecha = new Date(recibo.creado_en ?? Date.now())
  const fechaFmt = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaFmt = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })

  w.document.write(`<!DOCTYPE html><html lang="es"><head>
  <meta charset="utf-8">
  <title>Recibo POS-${recibo.numero}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:'Courier New',Courier,monospace;
      font-size:11.5px; width:72mm; padding:3mm 4mm 6mm;
      color:#000; background:#fff; line-height:1.45;
    }
    .c{text-align:center}
    .b{font-weight:bold}
    .s{font-size:9.5px}
    .xs{font-size:8.5px;color:#333}
    .dash{border-top:1px dashed #000;margin:5px 0}
    .solid{border-top:2px solid #000;margin:5px 0}
    .row{display:flex;justify-content:space-between;align-items:flex-start;gap:4px;margin-bottom:1px}
    .row .lbl{flex:1}
    .row .val{text-align:right;flex-shrink:0;white-space:nowrap}
    .prod-nombre{font-weight:bold;word-break:break-word;line-height:1.3}
    .prod-det{display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:3px}
    .total-row{font-size:14px;font-weight:bold;margin:4px 0}
    @media print{
      @page{size:72mm auto;margin:0}
      body{padding:1mm 2mm 4mm;-webkit-print-color-adjust:exact}
    }
  </style>
  </head><body>

  <div class="c b" style="font-size:14px;letter-spacing:.5px;text-transform:uppercase">${recibo.empresa_razon_social || ''}</div>
  ${recibo.empresa_nit ? `<div class="c s">NIT: ${recibo.empresa_nit}</div>` : ''}
  ${recibo.empresa_direccion ? `<div class="c xs">${recibo.empresa_direccion}</div>` : ''}
  ${recibo.empresa_telefono ? `<div class="c xs">Tel: ${recibo.empresa_telefono}</div>` : ''}

  <div class="dash"></div>
  <div class="c b" style="font-size:12px;letter-spacing:.5px">RECIBO DE VENTA N.° POS-${recibo.numero}</div>
  <div class="dash"></div>

  <div class="row s"><span class="lbl">Fecha:</span><span class="val b">${fechaFmt}</span></div>
  <div class="row s"><span class="lbl">Hora:</span><span class="val">${horaFmt}</span></div>
  <div class="row s"><span class="lbl">Sede:</span><span class="val">${recibo.sede_nombre || ''} · ${recibo.bodega_nombre || ''}</span></div>
  <div class="row s"><span class="lbl">Cajero:</span><span class="val">${recibo.cajero_nombre || ''}</span></div>
  <div class="row s"><span class="lbl">Cliente:</span><span class="val">${recibo.cliente_registrado_nombre || recibo.cliente_nombre || 'Consumidor final'}</span></div>

  <div class="dash"></div>
  <div class="row b s">
    <span style="flex:1">CANT DESCRIPCIÓN</span>
    <span style="text-align:right;min-width:55px">TOTAL</span>
  </div>
  <div class="dash"></div>

  ${(recibo.items || []).map(it => `
    <div class="prod-nombre">${it.producto_nombre}</div>
    <div class="prod-det">
      <span>${Number(it.cantidad) % 1 === 0 ? it.cantidad : Number(it.cantidad).toFixed(3)}x</span>
      <span class="b">${fmt(it.subtotal)}</span>
    </div>
  `).join('')}

  <div class="solid"></div>
  <div class="row total-row"><span>TOTAL</span><span>${fmt(recibo.total)}</span></div>
  <div class="solid"></div>

  <div class="b s" style="margin-top:4px">FORMA(S) DE PAGO:</div>
  ${(recibo.pagos || []).map(p => `
    <div class="row s">
      <span class="lbl">${p.metodo_pago}${p.referencia ? ` (${p.referencia})` : ''}</span>
      <span class="val">${fmt(p.monto)}</span>
    </div>
    ${+p.monto_recibido > 0 ? `
    <div class="row xs"><span class="lbl">Recibido</span><span class="val">${fmt(p.monto_recibido)}</span></div>
    ` : ''}
    ${+p.cambio > 0 ? `
    <div class="row s b"><span class="lbl">CAMBIO</span><span class="val">${fmt(p.cambio)}</span></div>
    ` : ''}
  `).join('')}

  <div class="dash"></div>
  <div class="c" style="font-size:11px;font-weight:bold;margin:6px 0 2px">¡Gracias por su compra!</div>
  <div class="c xs">Conserve este documento como soporte de su compra</div>
  <div style="height:14mm"></div>

  </body></html>`)
  w.document.close()
  setTimeout(() => { w.print(); w.close() }, 400)
}
