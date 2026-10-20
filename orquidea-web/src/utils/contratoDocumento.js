/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Documentos — contratos para firmar                   ║
 * ║  Archivo         : utils/contratoDocumento.js                           ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-20                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * MODELO PROVISIONAL de los contratos (hasta tener el texto oficial de la
 * funeraria). Se llenan con los datos del sistema y se abren en el visor para
 * imprimir — nunca se descargan.
 *  · contratoServicioHTML: prestación de servicios funerarios (módulo Contratos)
 *  · contratoPolizaHTML:   afiliación al plan de previsión exequial (Pólizas)
 * Base: los servicios funerarios se prestan EN ESPECIE y no son actividad
 * aseguradora (art. 111 Ley 795 de 2003, Sentencia C-940 de 2003); Estatuto
 * del Consumidor (Ley 1480 de 2011); datos personales (Ley 1581 de 2012).
 */
import { archivoUrl } from './archivoUrl.js'
import { numeroALetras } from '../components/ui/CurrencyInput.jsx'

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]))
const pesos = n => '$' + Math.round(+n || 0).toLocaleString('es-CO')
const enLetras = n => { try { return numeroALetras(Math.round(+n || 0)).toUpperCase() } catch { return '' } }
const fLarga = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }) : '________________'
const linea = (v, ancho = 180) => v ? `<b>${esc(v)}</b>` : `<span class="hueco" style="min-width:${ancho}px"></span>`

function empresaDe(e = {}) {
  const nit = e.nit ? `${e.nit}${e.digito_verificador ? '-' + e.digito_verificador : ''}` : null
  const ciudad = [e.municipio, e.departamento].filter(Boolean).join(', ')
  return { nombre: e.razon_social || 'Funeraria San José de Ábrego S.A.S.', comercial: e.nombre_comercial, nit, ciudad, ...e }
}

const CSS = `
@page { size: letter; margin: 18mm 18mm 20mm; }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; color:#111827; font-size:11.5pt; line-height:1.55; margin:0; }
.hoja { max-width: 760px; margin: 0 auto; padding: 24px 28px; }
.cab { display:flex; gap:16px; align-items:center; border-bottom:2px solid #1F2937; padding-bottom:12px; margin-bottom:6px; }
.cab img { width:74px; height:74px; object-fit:contain; }
.cab .emp { flex:1; font-family: Arial, Helvetica, sans-serif; font-size:9.5pt; color:#374151; line-height:1.4; }
.cab .emp b { display:block; font-size:12.5pt; color:#111827; }
.cab .num { text-align:right; font-family: Arial, Helvetica, sans-serif; font-size:9pt; color:#374151; border:1.5px solid #1F2937; border-radius:6px; padding:6px 10px; }
.cab .num b { display:block; font-size:13pt; color:#111827; }
h1 { text-align:center; font-size:14pt; letter-spacing:.04em; margin:16px 0 4px; text-transform:uppercase; }
.sub { text-align:center; font-size:10pt; color:#4B5563; margin:0 0 14px; }
h2 { font-size:11pt; margin:16px 0 4px; text-transform:uppercase; letter-spacing:.03em; }
p { margin:6px 0; text-align:justify; }
.hueco { display:inline-block; border-bottom:1px solid #111827; height:1em; vertical-align:bottom; }
table { width:100%; border-collapse:collapse; margin:8px 0; font-size:10pt; font-family: Arial, Helvetica, sans-serif; }
th, td { border:1px solid #9CA3AF; padding:5px 7px; text-align:left; vertical-align:top; }
th { background:#F3F4F6; font-size:9pt; text-transform:uppercase; letter-spacing:.03em; }
.cuadro { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #9CA3AF; font-family: Arial, Helvetica, sans-serif; font-size:9.5pt; margin:8px 0; }
.cuadro div { padding:5px 8px; border-bottom:1px solid #E5E7EB; }
.cuadro div:nth-child(odd) { border-right:1px solid #E5E7EB; }
.cuadro small { display:block; font-size:7.5pt; color:#6B7280; text-transform:uppercase; letter-spacing:.04em; }
.firmas { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:54px; font-family: Arial, Helvetica, sans-serif; font-size:9.5pt; page-break-inside: avoid; }
.firma { border-top:1px solid #111827; padding-top:6px; }
.huella { width:70px; height:86px; border:1px solid #9CA3AF; border-radius:6px; margin-top:8px; font-size:7pt; color:#9CA3AF; display:flex; align-items:flex-end; justify-content:center; padding-bottom:4px; }
.modelo { margin-top:26px; padding:8px 12px; border:1px dashed #B45309; color:#92400E; background:#FFFBEB; font-family: Arial, Helvetica, sans-serif; font-size:8.5pt; border-radius:6px; }
.salto { page-break-before: always; }
@media print { .hoja { padding:0; } .modelo { background:none; } }
`

function cabecera(emp, etiqueta, numero, fecha) {
  const logo = emp.logo_url ? `<img src="${esc(archivoUrl(emp.logo_url))}" alt="">` : ''
  return `<div class="cab">${logo}
    <div class="emp"><b>${esc(emp.nombre)}</b>${emp.nit ? `NIT ${esc(emp.nit)}<br>` : ''}${esc([emp.direccion, emp.ciudad].filter(Boolean).join(' · '))}<br>${esc([emp.telefono_1, emp.email].filter(Boolean).join(' · '))}</div>
    <div class="num">${esc(etiqueta)}<b>N.° ${esc(numero)}</b>${esc(fLarga(fecha))}</div></div>`
}

function pie(emp, nota) {
  return `<div class="modelo"><b>MODELO PROVISIONAL.</b> ${esc(nota)} El texto definitivo debe ser el aprobado por ${esc(emp.nombre)} y su asesor jurídico.</div>`
}

function firmas(emp, rotulo, nombre, doc) {
  return `<div class="firmas">
    <div><div class="firma"><b>EL PRESTADOR</b><br>${esc(emp.nombre)}<br>${esc(emp.representante_legal || 'Representante legal')}${emp.cedula_representante ? `<br>C.C. ${esc(emp.cedula_representante)}` : ''}</div></div>
    <div><div class="firma"><b>${esc(rotulo)}</b><br>${esc(nombre || '')}<br>${esc(doc || 'C.C.')}</div><div class="huella">Huella</div></div>
  </div>`
}

const clausulasComunes = (emp, quien) => `
<h2>Naturaleza del servicio</h2>
<p>Las partes declaran que el presente contrato tiene por objeto la prestación de servicios funerarios <b>en especie</b> y que, de acuerdo con el artículo 111 de la Ley 795 de 2003, no constituye actividad aseguradora. En consecuencia, los servicios no utilizados no dan lugar a devolución ni pago en dinero, salvo lo que disponga la ley.</p>
<h2>Protección de datos personales</h2>
<p>${esc(quien)} autoriza a ${esc(emp.nombre)} para tratar sus datos personales y los de las personas aquí relacionadas con la finalidad de ejecutar este contrato, gestionar cobros, enviar comunicaciones y atender el servicio, conforme a la Ley 1581 de 2012 y a la política de tratamiento de datos de la empresa. Podrá conocer, actualizar, rectificar y suprimir sus datos en las oficinas de la empresa.</p>
<h2>Derechos del consumidor</h2>
<p>Este contrato se rige por el Estatuto del Consumidor (Ley 1480 de 2011). Cuando la venta se haya realizado por métodos no tradicionales o a distancia, ${esc(quien.toLowerCase())} podrá ejercer el derecho de retracto en los términos del artículo 47 de dicha ley. Las peticiones, quejas y reclamos se atenderán en las oficinas y canales de atención de la empresa.</p>
<h2>Solución de controversias y domicilio</h2>
<p>Las diferencias que surjan de este contrato se resolverán primero por arreglo directo entre las partes. De no lograrse, se acudirá a la jurisdicción ordinaria. Para todos los efectos, el domicilio contractual es ${esc(emp.municipio || 'el municipio sede de la empresa')}.</p>
<h2>Mérito ejecutivo</h2>
<p>El presente documento presta mérito ejecutivo para el cobro de las sumas adeudadas, junto con los recibos y estados de cuenta expedidos por la empresa.</p>`

// ══════════════════════════════════════════════════════════════════════════
//  CONTRATO DE PRESTACIÓN DE SERVICIOS FUNERARIOS (módulo Contratos)
// ══════════════════════════════════════════════════════════════════════════
export function contratoServicioHTML({ c, empresa }) {
  const emp = empresaDe(empresa)
  const prev = c.tipo_contrato === 'PREVISION'
  const cuotas = c.modalidad === 'CUOTAS'
  const contratanteDoc = [c.contratante_tipo_doc, c.contratante_doc].filter(Boolean).join(' ')
  const domicilio = [c.contratante_direccion, c.contratante_municipio, c.contratante_departamento].filter(Boolean).join(', ')
  const items = c.paquete_items || []
  const adic = c.servicios_adicionales || []
  const numero = c.numero_legado || c.numero

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Contrato N.° ${esc(numero)} — ${esc(c.contratante_nombre)}</title><style>${CSS}</style></head><body><div class="hoja">
${cabecera(emp, 'Contrato', numero, c.fecha_inicio || c.creado_en)}
<h1>Contrato de prestación de servicios funerarios</h1>
<p class="sub">${prev ? 'Modalidad: previsión (servicio a futuro)' : 'Modalidad: servicio inmediato'} · ${cuotas ? `Pago en ${esc(c.num_cuotas)} cuotas` : 'Pago de contado'}</p>

<div class="cuadro">
  <div><small>El prestador</small>${esc(emp.nombre)}${emp.nit ? ` · NIT ${esc(emp.nit)}` : ''}</div>
  <div><small>Representante legal</small>${esc(emp.representante_legal || '—')}</div>
  <div><small>El contratante</small><b>${esc(c.contratante_nombre)}</b></div>
  <div><small>Identificación</small>${esc(contratanteDoc || '—')}</div>
  <div><small>Domicilio</small>${esc(domicilio || '—')}</div>
  <div><small>Teléfono</small>${esc(c.contratante_tel || '—')}</div>
  ${c.difunto_nombre ? `<div><small>${prev ? 'Beneficiario del servicio' : 'Fallecido'}</small><b>${esc(c.difunto_nombre)}</b></div><div><small>Identificación</small>${esc(c.difunto_documento || '—')}</div>` : ''}
  <div><small>Paquete</small>${esc(c.paquete_nombre || 'Personalizado (ver anexo)')}</div>
  <div><small>Asesor</small>${esc(c.asesor_nombre || '—')}</div>
</div>

<p>Entre los suscritos, <b>${esc(emp.nombre)}</b>${emp.nit ? `, identificada con NIT ${esc(emp.nit)}` : ''}, representada legalmente por ${linea(emp.representante_legal)}, quien en adelante se denominará <b>EL PRESTADOR</b>, y ${linea(c.contratante_nombre)}, identificado(a) con ${linea(contratanteDoc, 120)}, domiciliado(a) en ${linea(domicilio)}, quien en adelante se denominará <b>EL CONTRATANTE</b>, hemos acordado celebrar el presente contrato, que se regirá por las siguientes cláusulas:</p>

<h2>Primera — Objeto</h2>
<p>EL PRESTADOR se obliga a prestar en especie los servicios funerarios descritos en el <b>Anexo 1</b> ${c.difunto_nombre ? `en favor de ${linea(c.difunto_nombre)}` : 'en favor de la persona designada por EL CONTRATANTE'}${prev ? ', en el momento en que se produzca su fallecimiento' : ''}, y EL CONTRATANTE se obliga a pagar el precio en la forma aquí pactada.</p>

<h2>Segunda — Servicios incluidos</h2>
<p>Los servicios comprendidos son los del paquete <b>${esc(c.paquete_nombre || 'personalizado')}</b> relacionados en el Anexo 1. Cualquier servicio o elemento adicional que solicite EL CONTRATANTE se cobrará por separado, previa aceptación del precio, y hará parte de este contrato.</p>

<h2>Tercera — Valor y forma de pago</h2>
<p>El valor total del contrato es de <b>${pesos(c.valor_total)}</b> (${enLetras(c.valor_total)} PESOS M/CTE), que EL CONTRATANTE pagará ${cuotas
    ? `en <b>${esc(c.num_cuotas)} cuotas</b> mensuales de <b>${pesos(c.valor_cuota)}</b>${c.dia_cobro ? `, los días <b>${esc(c.dia_cobro)}</b> de cada mes` : ''}, a partir del ${esc(fLarga(c.fecha_inicio))}`
    : '<b>de contado</b> a la firma del presente documento'}. Los pagos se acreditan únicamente con el recibo oficial expedido por EL PRESTADOR, en efectivo o por los medios de pago autorizados por la empresa.</p>

<h2>Cuarta — Mora</h2>
<p>El retraso en el pago de las sumas pactadas causará intereses moratorios a la tasa máxima legal permitida certificada por la Superintendencia Financiera de Colombia.${prev ? ' Mientras EL CONTRATANTE se encuentre en mora, se suspende el derecho a exigir la prestación del servicio, el cual se restablece al ponerse al día.' : ''}</p>

<h2>Quinta — Obligaciones del prestador</h2>
<p>a) Prestar los servicios contratados con calidad, oportunidad y respeto por la memoria del fallecido y su familia; b) contar con personal idóneo, vehículos e instalaciones adecuados, cumpliendo las normas sanitarias vigentes; c) orientar a la familia en los trámites ante notaría, registraduría, parroquia y cementerio incluidos en el paquete; d) expedir los recibos de cada pago y mantener reserva de la información.</p>

<h2>Sexta — Obligaciones del contratante</h2>
<p>a) Pagar el precio en la forma pactada; b) informar de manera inmediata el fallecimiento a las líneas de atención de la empresa; c) entregar oportunamente los documentos necesarios (certificado médico de defunción, documento de identidad del fallecido y demás que exija la autoridad); d) designar a la persona que tomará las decisiones del servicio; e) informar cualquier cambio de dirección o teléfono.</p>

${prev ? `<h2>Séptima — Vigencia y precio</h2>
<p>Este contrato estará vigente hasta la prestación del servicio. Una vez pagado en su totalidad, el servicio se prestará en las condiciones pactadas sin cobros adicionales por los elementos incluidos en el Anexo 1. Si alguno de los elementos ya no existiera en el mercado, se reemplazará por uno de igual o mejor calidad.</p>` : ''}

<h2>${prev ? 'Octava' : 'Séptima'} — Terminación</h2>
<p>El contrato termina por la prestación total del servicio y el pago del precio, por mutuo acuerdo, o por incumplimiento de cualquiera de las partes. En caso de terminación anticipada, se liquidarán los valores pagados y los servicios efectivamente prestados.</p>

${clausulasComunes(emp, 'EL CONTRATANTE')}

${c.observaciones ? `<h2>Observaciones</h2><p>${esc(c.observaciones)}</p>` : ''}

<p>En constancia se firma en ${esc(emp.municipio || '________________')}, el ${esc(fLarga(c.fecha_inicio || c.creado_en))}, en dos ejemplares del mismo tenor.</p>
${firmas(emp, 'EL CONTRATANTE', c.contratante_nombre, contratanteDoc)}

<div class="salto"></div>
${cabecera(emp, 'Anexo 1 · Contrato', numero, c.fecha_inicio || c.creado_en)}
<h1>Anexo 1 — Servicios incluidos</h1>
<p class="sub">${esc(c.paquete_nombre || 'Servicio personalizado')}</p>
<table><thead><tr><th style="width:38px">#</th><th>Servicio o elemento</th><th>Detalle</th></tr></thead><tbody>
${items.length ? items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.nombre)}</td><td>${esc(it.descripcion || it.categoria || '')}</td></tr>`).join('')
    : '<tr><td colspan="3" style="color:#6B7280">Servicios según lo acordado con el contratante (diligenciar a mano si el paquete es personalizado).</td></tr>'}
</tbody></table>
${adic.length ? `<h2>Servicios adicionales</h2><table><thead><tr><th>Descripción</th><th style="width:70px">Cant.</th><th style="width:120px">Valor</th></tr></thead><tbody>
${adic.map(a => `<tr><td>${esc(a.descripcion)}</td><td>${esc(+a.cantidad)}</td><td>${pesos(a.subtotal)}</td></tr>`).join('')}</tbody></table>` : ''}
<p style="margin-top:14px"><b>Valor total del contrato: ${pesos(c.valor_total)}</b></p>
${firmas(emp, 'EL CONTRATANTE', c.contratante_nombre, contratanteDoc)}
${pie(emp, 'Formato de ejemplo generado por el sistema mientras se carga el contrato oficial de la funeraria.')}
</div></body></html>`
  return html
}

// ══════════════════════════════════════════════════════════════════════════
//  CONTRATO DE AFILIACIÓN AL PLAN DE PREVISIÓN EXEQUIAL (Pólizas)
// ══════════════════════════════════════════════════════════════════════════
export function contratoPolizaHTML({ p, empresa }) {
  const emp = empresaDe(empresa)
  const numero = p.numero_legado || p.numero
  const bens = (p.beneficiarios || []).filter(b => b.activo !== false && !b.ejecutado && !b.es_titular_historico)
  const serv = Array.isArray(p.servicios_incluidos) ? p.servicios_incluidos : []
  const domicilio = [p.titular_direccion, p.titular_barrio, p.titular_municipio].filter(Boolean).join(', ')
  const cubre = [
    p.cubre_ataud && 'Cofre o ataúd', p.cubre_velacion_h && `Velación hasta por ${p.cubre_velacion_h} horas`,
    p.cubre_traslado_local && 'Traslado local', p.cubre_traslado_nacional && 'Traslado nacional',
    p.cubre_flores && 'Arreglo floral', p.cubre_cremacion && 'Cremación', p.cubre_tramites && 'Trámites legales',
    p.cubre_lapida && 'Lápida',
  ].filter(Boolean)

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Contrato de afiliación — Póliza ${esc(numero)}</title><style>${CSS}</style></head><body><div class="hoja">
${cabecera(emp, 'Póliza / afiliación', numero, p.fecha_inicio || p.creado_en)}
<h1>Contrato de afiliación al plan de previsión exequial</h1>
<p class="sub">Plan <b>${esc(p.plan_nombre || '—')}</b> · Cuota mensual ${pesos(p.valor_cuota)}</p>

<div class="cuadro">
  <div><small>La empresa</small>${esc(emp.nombre)}${emp.nit ? ` · NIT ${esc(emp.nit)}` : ''}</div>
  <div><small>Representante legal</small>${esc(emp.representante_legal || '—')}</div>
  <div><small>Afiliado titular</small><b>${esc(p.titular_nombre)}</b></div>
  <div><small>Identificación</small>${esc(p.titular_doc || '—')}</div>
  <div><small>Fecha de nacimiento</small>${esc(p.titular_fecha_nacimiento ? fLarga(p.titular_fecha_nacimiento) : '—')}${p.titular_edad ? ` (${esc(p.titular_edad)} años)` : ''}</div>
  <div><small>Teléfono</small>${esc([p.titular_tel, p.titular_tel_alt].filter(Boolean).join(' · ') || '—')}</div>
  <div><small>Dirección</small>${esc(domicilio || '—')}</div>
  <div><small>Día de pago</small>${esc(p.dia_cobro ? `Día ${p.dia_cobro} de cada periodo` : 'Según fecha de afiliación')}</div>
  <div><small>Inicio de vigencia</small>${esc(fLarga(p.fecha_inicio))}</div>
  <div><small>Fin del periodo de carencia</small>${esc(p.fecha_fin_carencia ? fLarga(p.fecha_fin_carencia) : '—')}</div>
</div>

<p>Entre <b>${esc(emp.nombre)}</b>${emp.nit ? `, NIT ${esc(emp.nit)}` : ''}, en adelante <b>LA EMPRESA</b>, y ${linea(p.titular_nombre)}, identificado(a) con ${linea(p.titular_doc, 120)}, en adelante <b>EL AFILIADO TITULAR</b>, se celebra el presente contrato de afiliación, regido por las siguientes cláusulas:</p>

<h2>Primera — Objeto</h2>
<p>Mediante este contrato EL AFILIADO TITULAR y los beneficiarios inscritos adquieren el derecho a recibir <b>en especie</b> los servicios exequiales del plan <b>${esc(p.plan_nombre || '')}</b> en el momento de su fallecimiento, siempre que el contrato se encuentre vigente, al día en el pago de las cuotas y superado el periodo de carencia.</p>

<h2>Segunda — Definiciones</h2>
<p><b>Afiliado titular:</b> persona que suscribe el contrato y responde por el pago. <b>Beneficiarios:</b> personas inscritas por el titular dentro del cupo y los límites de edad del plan. <b>Carencia:</b> tiempo desde el inicio de la vigencia durante el cual aún no se puede exigir el servicio. <b>Periodo:</b> lapso mensual que cubre cada cuota, contado desde el día de afiliación. <b>Mora:</b> no pagar una cuota en su periodo.</p>

<h2>Tercera — Grupo afiliado</h2>
<p>El plan admite hasta <b>${esc(p.max_beneficiarios || '—')}</b> beneficiarios. A la firma quedan inscritos:</p>
<table><thead><tr><th style="width:32px">#</th><th>Nombre</th><th>Identificación</th><th>Parentesco</th><th style="width:60px">Edad</th></tr></thead><tbody>
${bens.length ? bens.map((b, i) => `<tr><td>${i + 1}</td><td>${esc(b.nombre || b.tercero_nombre || '')}</td><td>${esc([b.tipo_doc_sigla, b.documento || b.numero_documento].filter(Boolean).join(' '))}</td><td>${esc(b.parentesco || '')}</td><td>${esc(b.edad ?? '')}</td></tr>`).join('')
    : Array.from({ length: 4 }, (_, i) => `<tr><td>${i + 1}</td><td>&nbsp;</td><td></td><td></td><td></td></tr>`).join('')}
</tbody></table>
<p>La inclusión, el cambio o el retiro de beneficiarios se hará por escrito y se sujetará a las condiciones y tarifas vigentes del plan. El cupo de un beneficiario fallecido queda libre.</p>

<h2>Cuarta — Servicios cubiertos</h2>
<p>Ante el fallecimiento de un afiliado con derecho, LA EMPRESA prestará en especie:</p>
<table><thead><tr><th>Servicio</th></tr></thead><tbody>
${serv.length ? serv.map(s => `<tr><td>${esc(s.nombre || s.descripcion || s)}</td></tr>`).join('')
    : cubre.length ? cubre.map(x => `<tr><td>${esc(x)}</td></tr>`).join('') : '<tr><td>Según las condiciones del plan.</td></tr>'}
</tbody></table>
<p>Los servicios o elementos que la familia solicite por encima de lo cubierto se cobrarán aparte, previa aceptación.</p>

<h2>Quinta — Cuota y afiliación</h2>
<p>EL AFILIADO TITULAR pagará una cuota de <b>${pesos(p.valor_cuota)}</b> (${enLetras(p.valor_cuota)} PESOS M/CTE) por periodo${p.costo_afiliacion ? ` y un valor de afiliación de <b>${pesos(p.costo_afiliacion)}</b>` : ''}. Los pagos se acreditan con el recibo oficial de LA EMPRESA. Se pueden pagar periodos por anticipado. La cuota se actualiza una vez al año según el incremento del salario mínimo legal vigente, en la fecha definida por LA EMPRESA.</p>

<h2>Sexta — Periodo de carencia</h2>
<p>Los servicios podrán exigirse a partir del ${esc(p.fecha_fin_carencia ? fLarga(p.fecha_fin_carencia) : 'vencimiento del periodo de carencia del plan')}, conforme a las condiciones del plan. Los fallecimientos ocurridos durante la carencia no generan derecho al servicio cubierto.</p>

<h2>Séptima — Mora y suspensión</h2>
<p>El no pago oportuno de las cuotas suspende el derecho a recibir los servicios mientras dure la mora. La reactivación se hará al ponerse al día, y LA EMPRESA podrá exigir un nuevo periodo de carencia cuando la mora supere el tiempo definido en las condiciones del plan.</p>

<h2>Octava — Exclusiones</h2>
<p>No están cubiertos: a) personas no inscritas como beneficiarios; b) fallecimientos durante la carencia o la mora; c) servicios no incluidos en el plan; d) beneficiarios que no cumplan los límites de edad del plan.</p>

<h2>Novena — Procedimiento en caso de fallecimiento</h2>
<p>Se debe comunicar de inmediato a las líneas de atención de LA EMPRESA${emp.telefono_1 ? ` (${esc(emp.telefono_1)})` : ''} y presentar el certificado médico de defunción, el documento de identidad del fallecido y el último recibo de pago.</p>

<h2>Décima — Vigencia</h2>
<p>El contrato tiene vigencia de un (1) año contado desde su inicio y se renueva automáticamente por periodos iguales, salvo que alguna de las partes manifieste por escrito su intención de no renovarlo.</p>

<h2>Undécima — Terminación</h2>
<p>El contrato termina por voluntad del titular comunicada por escrito, por mora prolongada en los términos del plan, por fallecimiento del titular sin que se haya designado un nuevo responsable, o por incumplimiento de las obligaciones aquí pactadas.</p>

${clausulasComunes(emp, 'EL AFILIADO TITULAR')}

${p.observaciones ? `<h2>Observaciones</h2><p>${esc(p.observaciones)}</p>` : ''}

<p>En constancia se firma en ${esc(emp.municipio || '________________')}, el ${esc(fLarga(p.fecha_inicio || p.creado_en))}, en dos ejemplares del mismo tenor.</p>
${firmas(emp, 'EL AFILIADO TITULAR', p.titular_nombre, p.titular_doc)}
${pie(emp, 'Formato de ejemplo generado por el sistema mientras se carga el contrato oficial del plan exequial.')}
</div></body></html>`
  return html
}
