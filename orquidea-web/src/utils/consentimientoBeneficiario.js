/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — consentimiento cobertura básica (>75 años) ║
 * ║  Archivo         : consentimientoBeneficiario.js                       ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Padres/suegros del titular mayores de 75 años se aceptan como
 * beneficiarios sin límite de edad, pero cubiertos SOLO por el servicio
 * funerario básico — el titular debe dejar constancia firmada de que
 * conoce y acepta esa condición.
 */
export function imprimirConsentimientoBeneficiario({ poliza, titular, beneficiario, empresa }) {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return

  const emp = empresa || {}
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <title>Consentimiento — Póliza ${poliza.numero}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;padding:40px;font-size:13.5px;line-height:1.6}
    .head{text-align:center;border-bottom:3px solid #C9A020;padding-bottom:14px;margin-bottom:22px}
    .emp{font-size:16px;font-weight:800}
    .emp-sub{font-size:11px;color:#666;margin-top:2px}
    h1{font-size:15px;text-align:center;margin:18px 0;text-transform:uppercase;letter-spacing:.5px}
    .datos{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin:18px 0;font-size:12.5px;
      background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:14px 16px}
    .datos .lbl{color:#888;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
    .aviso{background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:14px 16px;margin:18px 0;font-weight:700;color:#92400E}
    p{margin-bottom:12px;text-align:justify}
    .firmas{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:70px}
    .firma{border-top:1px solid #999;padding-top:6px;text-align:center;font-size:11px;color:#666}
    @media print{ body{padding:16px} }
  </style></head><body>
    <div class="head">
      <div class="emp">${emp.razon_social || 'Funeraria San José de Ábrego S.A.S'}</div>
      <div class="emp-sub">NIT ${emp.nit || ''}${emp.direccion ? ' · ' + emp.direccion : ''}${emp.telefono_1 ? ' · Tel ' + emp.telefono_1 : ''}</div>
    </div>

    <h1>Consentimiento de cobertura limitada por edad del beneficiario</h1>

    <div class="datos">
      <div><span class="lbl">Póliza N.°</span><br>${poliza.numero}</div>
      <div><span class="lbl">Plan</span><br>${poliza.plan_nombre || '—'}</div>
      <div><span class="lbl">Titular</span><br>${titular.nombre}</div>
      <div><span class="lbl">Documento titular</span><br>${titular.numero_documento || '—'}</div>
      <div><span class="lbl">Beneficiario</span><br>${beneficiario.nombre}</div>
      <div><span class="lbl">Documento beneficiario</span><br>${beneficiario.documento || '—'}</div>
      <div><span class="lbl">Parentesco</span><br>${beneficiario.parentesco}</div>
      <div><span class="lbl">Edad</span><br>${beneficiario.edad} años</div>
    </div>

    <div class="aviso">
      El beneficiario arriba mencionado tiene más de 75 años. De acuerdo con la política de afiliación de
      ${emp.razon_social || 'la funeraria'}, los padres o suegros del titular se aceptan como beneficiarios
      SIN límite de edad, pero en ese caso quedan cubiertos ÚNICAMENTE por el servicio funerario básico,
      independientemente del plan contratado.
    </div>

    <p>
      Yo, <strong>${titular.nombre}</strong>, identificado(a) con documento <strong>${titular.numero_documento || '—'}</strong>,
      en calidad de titular de la póliza N.° ${poliza.numero}, declaro que conozco y acepto que mi
      <strong>${beneficiario.parentesco}</strong>, <strong>${beneficiario.nombre}</strong>, de ${beneficiario.edad} años de edad,
      queda incluido(a) como beneficiario(a) de mi póliza con cobertura limitada al <strong>servicio funerario básico</strong>,
      sin las coberturas adicionales que sí aplican para el resto de beneficiarios dentro del plan contratado.
    </p>
    <p>
      Firmo este consentimiento de manera libre y voluntaria, entendiendo su alcance, en ${emp.direccion ? 'la dirección arriba indicada' : 'la fecha señalada'}, a los ${hoy}.
    </p>

    <div class="firmas">
      <div class="firma">Firma del titular<br>${titular.nombre}</div>
      <div class="firma">Firma del asesor / representante de la funeraria</div>
    </div>
  </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 350)
}
