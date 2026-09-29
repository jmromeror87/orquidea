/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servicios — formatos que se entregan al cliente     ║
 * ║  Archivo         : formatosServicio.js                                 ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-29                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Formatos impresos que se le entregan a la familia en cada servicio
 * (asistencia a novenarios, etc.). Se llenan con los datos del servicio que
 * devuelve GET /servicios/:id/orden-impresion; los campos que el sistema no
 * conoce quedan como línea en blanco para llenar a mano.
 *
 * Para agregar un formato nuevo: escribir su función generarXxx(datos, logo,
 * campos) aquí y registrarlo en FORMATOS_SERVICIO (lo lee la pestaña
 * Documentos del servicio).
 */
import { jsPDF } from 'jspdf'
import { dibujarLogoPDF } from './logo.js'

// Márgenes del formato original de la funeraria (A4, mm)
const PL = 29, PR = 182, CX = (PL + PR) / 2
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

// ── Formateo ──────────────────────────────────────────────────────────────
// "2026-sep-26 10:19 a.m." (el mismo estilo del formato impreso)
export function fmtFechaHoraFormato(d = new Date()) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0')
  const h12 = h % 12 || 12
  return `${d.getFullYear()}-${MESES[d.getMonth()]}-${String(d.getDate()).padStart(2, '0')} ${h12}:${m} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

// Fecha sin hora (columna DATE de Postgres) → "2026-09-09", sin correr el día por zona horaria
function fmtFechaISO(v) {
  if (!v) return ''
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    // "2026-09-09T05:00:00.000Z" es medianoche de Colombia serializada en UTC → la fecha es la de la parte local
    const d = new Date(v)
    if (v.length > 10 && !isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return v.slice(0, 10)
  }
  return ''
}

// "2026-10-03T19:00" (input datetime-local) → "2026-oct-03 7:00 p.m."
function fmtEntrada(v) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, mo, d] = v.split('-')
    return `${y}-${MESES[+mo - 1]}-${d}`
  }
  const d = new Date(v)
  return isNaN(d) ? v : fmtFechaHoraFormato(d)
}

function fmtTel(t) {
  const n = String(t || '').replace(/\D/g, '')
  return n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3)}` : (t || '')
}

// ── Piezas comunes ───────────────────────────────────────────────────────
// Encabezado: logo a la izquierda, razón social + NIT + dirección + teléfonos centrados
function dibujarEncabezado(doc, empresa = {}, logoDataUrl) {
  dibujarLogoPDF(doc, logoDataUrl, 31, 31, 40, 24)

  const nit = empresa.nit ? `${empresa.nit}${empresa.digito_verificador != null ? '-' + empresa.digito_verificador : ''}` : ''
  const dir = [empresa.direccion, empresa.municipio].filter(Boolean).join(', ')
  const tels = [empresa.telefono, empresa.telefono_2].filter(Boolean).map(fmtTel).join(' - ')
  const xc = 124

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text((empresa.nombre_empresa || 'Funeraria San José de Ábrego S.A.S').toUpperCase(), xc, 39, { align: 'center' })
  doc.setFontSize(9.5)
  if (nit)  doc.text(`NIT: ${nit}`, xc, 44, { align: 'center' })
  if (dir)  doc.text(`DIR: ${dir}`, xc, 48.5, { align: 'center' })
  if (tels) doc.text(`TEL: ${tels}`, xc, 53, { align: 'center' })
}

// Una línea de pares "ETIQUETA: valor" seguidos; si no caben, pasa a la línea siguiente
function dibujarPares(doc, pares, y, salto = 5) {
  let x = PL
  doc.setFontSize(9)
  for (const [etiqueta, valor] of pares) {
    doc.setFont('helvetica', 'bold')
    const et = `${etiqueta}: `
    const wEt = doc.getTextWidth(et)
    doc.setFont('helvetica', 'normal')
    const val = String(valor || '—')
    const wVal = doc.getTextWidth(val)
    if (x > PL && x + wEt + wVal > PR) { x = PL; y += salto }
    doc.setFont('helvetica', 'bold');   doc.text(et, x, y)
    doc.setFont('helvetica', 'normal'); doc.text(val, x + wEt, y)
    x += wEt + wVal + 4
  }
  return y
}

// "ETIQUETA:________" hasta el margen derecho, con el valor escrito encima si existe
function campoLinea(doc, etiqueta, valor, y, { negrita = true, hasta = PR } = {}) {
  doc.setFontSize(9)
  doc.setFont('helvetica', negrita ? 'bold' : 'normal')
  doc.text(`${etiqueta}:`, PL, y)
  const x0 = PL + doc.getTextWidth(`${etiqueta}:`) + 0.5
  doc.setLineWidth(0.25)
  doc.line(x0, y + 0.6, hasta, y + 0.6)
  if (valor) {
    doc.setFont('helvetica', 'normal')
    doc.text(String(valor), x0 + 1.5, y - 0.4)
  }
}

// "Fecha: ___/___/___ / Hora: ___:___"
function campoFechaHora(doc, y) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setLineWidth(0.25)
  let x = PL
  const txt = t => { doc.text(t, x, y); x += doc.getTextWidth(t) }
  const seg = w => { doc.line(x, y + 0.6, x + w, y + 0.6); x += w }
  txt('Fecha:'); seg(10); txt('/'); seg(10); txt('/'); seg(10); txt('/ Hora:'); seg(10); txt(':'); seg(11)
}

// ── Formato: Asistencia a novenarios (coordinadores) ─────────────────────
export function generarAsistenciaNovenarios(datos, logoDataUrl, campos = {}) {
  const { servicio: s = {}, empresa = {}, defuncion } = datos
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  dibujarEncabezado(doc, empresa, logoDataUrl)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('ASISTENCIA A NOVENARIOS COORDINADORES', CX, 61, { align: 'center' })

  let y = dibujarPares(doc, [
    ['SER QUERIDO', campos.ser_querido ?? s.difunto_nombre],
    ['FECHA', campos.fecha ?? fmtFechaHoraFormato()],
    ['FECHA DEFUNCIÓN', campos.fecha_defuncion ?? fmtFechaISO(defuncion?.fecha_fallecimiento)],
  ], 68)
  y = dibujarPares(doc, [
    ['DIRECCIÓN VELACIÓN', campos.direccion_velacion],
    ['RESPONSABLE', campos.responsable ?? s.responsable_nombre ?? s.contratante_nombre],
  ], y + 6)

  y += 6
  campoLinea(doc, 'COORDINADOR', campos.coordinador, y);                                     y += 4.2
  campoLinea(doc, 'INICIO NOVENARIO', fmtEntrada(campos.inicio_novenario), y);            y += 4.2
  campoLinea(doc, 'FINALIZACIÓN NOVENARIO', fmtEntrada(campos.fin_novenario), y);         y += 4.2
  campoLinea(doc, 'EUCARISTÍA ÚLTIMA NOCHE', fmtEntrada(campos.eucaristia), y)

  // Tres visitas del coordinador, cada una con fecha/hora, recibo y observaciones
  y += 10
  for (const titulo of ['PRIMERA VISITA', 'SEGUNDA VISITA', 'TERCERA VISITA']) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(titulo, PL, y)
    y += 5.5; campoFechaHora(doc, y)
    y += 5;   campoLinea(doc, 'Recibo', '', y, { negrita: false, hasta: 102 })
    y += 5;   campoFechaHora(doc, y)
    y += 6;   campoLinea(doc, 'Observaciones', '', y, { negrita: false })
    doc.setLineWidth(0.25)
    for (let i = 0; i < 5; i++) { y += 5; doc.line(PL, y + 0.6, PR, y + 0.6) }
    y += 9
  }

  doc.save(`Asistencia_Novenarios_${s.codigo || s.numero || 'servicio'}.pdf`)
}

// ── Formato: Atención y acompañamientos ──────────────────────────────────
// Las fechas del servicio se guardan como hora local "tal cual" (el formulario
// hace .slice(0,16) del ISO), así que se leen del texto sin convertir zona.
function partesFechaServicio(iso) {
  if (!iso || typeof iso !== 'string') return { fecha: '', hora: '' }
  const fecha = iso.slice(0, 10).replace(/-/g, '/')
  const [h, m] = iso.slice(11, 16).split(':').map(Number)
  if (isNaN(h)) return { fecha, hora: '' }
  return { fecha, hora: `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}` }
}

// "SRV-2026-0126" → "126/2026"
function controlInterno(codigo) {
  const m = /(\d{4})-(\d+)$/.exec(codigo || '')
  return m ? `${parseInt(m[2], 10)}/${m[1]}` : (codigo || '')
}

// Traslado que lleva al cementerio/crematorio (carroza + conductor de las exequias)
function trasladoExequias(traslados = []) {
  return traslados.find(t => ['CEMENTERIO', 'CREMATORIO'].includes(t.tipo)) || traslados[traslados.length - 1] || null
}

export function generarAtencionAcompanamientos(datos, logoDataUrl, campos = {}) {
  const { servicio: s = {}, empresa = {} } = datos
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const L = 20, R = 187, C2 = 102.5
  doc.setLineWidth(0.25)
  doc.setTextColor(0, 0, 0)

  // Encabezado (en este formato la razón social va en mayúsculas/minúsculas y más grande)
  dibujarLogoPDF(doc, logoDataUrl, 21, 20, 40, 24)
  const nit = empresa.nit ? `${empresa.nit}${empresa.digito_verificador != null ? '-' + empresa.digito_verificador : ''}` : ''
  const dir = [empresa.direccion, empresa.municipio].filter(Boolean).join(', ')
  const tels = [empresa.telefono, empresa.telefono_2].filter(Boolean).map(fmtTel).join(' - ')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17)
  doc.text(empresa.nombre_empresa || 'Funeraria San José de Ábrego S.A.S', 119, 28, { align: 'center' })
  doc.setFontSize(10)
  if (nit)  doc.text(`NIT. ${nit}`, 119, 33, { align: 'center' })
  if (dir)  doc.text(`DIR. ${dir}`, 119, 37.5, { align: 'center' })
  if (tels) doc.text(`TEL. ${tels}`, 119, 42, { align: 'center' })

  doc.setFontSize(11)
  doc.text('ATENCIÓN Y ACOMPAÑAMIENTOS', 105, 52, { align: 'center' })

  // Datos del servicio en dos columnas
  const par = (x, y, et, val, ancho) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    doc.text(`${et}: `, x, y)
    const w = doc.getTextWidth(`${et}: `)
    // Si el valor es largo (p. ej. nombre completo), se reduce la letra en vez de cortarlo
    doc.setFont('helvetica', 'normal')
    const v = String(val || '')
    let fs = 9.5
    while (fs > 6.5 && doc.setFontSize(fs) && doc.getTextWidth(v) > ancho - w) fs -= 0.5
    doc.text(v, x + w, y)
  }
  const izq = [
    ['SER QUERIDO', campos.ser_querido], ['ORDEN NO', campos.orden_no], ['CONTROL INT', campos.control_int],
    ['COORDINADOR', campos.coordinador], ['FECHA DEFUNCIÓN', campos.fecha_defuncion], ['FECHA EXEQUIAS', campos.fecha_exequias],
  ]
  const der = [
    ['HORA EXEQUIAS', campos.hora_exequias], ['IGLESIA', campos.iglesia], ['CORO', campos.coro],
    ['CARROZA', campos.carroza], ['CONDUCTOR', campos.conductor], ['CEMENTERIO', campos.cementerio],
  ]
  izq.forEach(([e, v], i) => par(L, 62 + i * 4.3, e, v, C2 - L - 6))
  der.forEach(([e, v], i) => par(C2, 62 + i * 4.3, e, v, R - C2))

  // Utilidades de dibujo
  const subrayado = (txt, x, y, size = 10) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(size)
    doc.text(txt, x, y)
    doc.line(x, y + 0.8, x + doc.getTextWidth(txt), y + 0.8)
  }
  const linea = (x1, x2, y) => doc.line(x1, y + 0.6, x2, y + 0.6)
  const texto = (t, x, y, opts) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(t, x, y, opts) }
  // "1. ________|___/___/___| Inicio __:__ Final __:__"
  const filaTurno = (n, y, valor) => {
    texto(`${n}.`, 26.5, y, { align: 'right' })
    linea(27.5, 85.5, y); if (valor) texto(valor, 28.5, y - 0.4)
    texto('|', 86, y); linea(87, 94, y); texto('/', 94.3, y); linea(95.5, 105, y); texto('/', 105.3, y); linea(106.5, 114, y)
    texto('| Inicio', 114.3, y); linea(125, 133, y); texto(':', 133.3, y); linea(134.5, 142, y)
    texto('Final', 143, y); linea(151, 164, y); texto(':', 164.3, y); linea(165.5, R, y)
  }

  // Jefe de protocolo
  subrayado('JEFE DE PROTOCOLO:', L, 92.5)
  linea(L + doc.getTextWidth('JEFE DE PROTOCOLO:') + 1, R, 92.5)
  if (campos.jefe_protocolo) texto(campos.jefe_protocolo, L + doc.getTextWidth('JEFE DE PROTOCOLO:') + 3, 92)

  // Cafetería durante velación
  subrayado('SERVICIO DE CAFETERÍA DURANTE VELACIÓN', L, 104.5)
  for (let i = 0; i < 5; i++) filaTurno(i + 1, 111.5 + i * 7.3)

  // Cortejo fúnebre (izquierda) y servicio última noche / decoradora (derecha)
  subrayado('CORTEJO FÚNEBRE', L, 150.5)
  for (let i = 0; i < 6; i++) { const y = 160 + i * 7.3; texto(`${i + 1}.`, 26.5, y, { align: 'right' }); linea(27.5, 92.5, y) }
  const x7 = 26.5 - doc.getTextWidth('7.')
  texto('7. Oración:', x7, 203.6); linea(x7 + doc.getTextWidth('7. Oración:') + 0.5, 92.5, 203.6)

  const X = 98.5
  subrayado('SERVICIO ÚLTIMA NOCHE', X, 150.5)
  texto('Parroquia', 106.5, 160); linea(122, 168, 160); if (campos.parroquia) texto(campos.parroquia, 123, 159.6)
  texto('Hora', 169.5, 160); linea(177, 181, 160); texto(':', 181.3, 160); linea(182.5, R, 160)
  linea(106.5, 120, 167.3); texto('/', 120.3, 167.3); linea(121.5, 135, 167.3); texto('/', 135.3, 167.3); linea(136.5, 150, 167.3)
  texto('| Turno', 150.3, 167.3); linea(162, 173, 167.3); texto(':', 173.3, 167.3); linea(174.5, R, 167.3)
  texto('1.', 103, 174.6); linea(106.5, R, 174.6)
  texto('2.', 103, 181.9); linea(106.5, R, 181.9)

  subrayado('DECORADORA DE TUMBA', X, 189.2)
  let xc = 100.5
  for (const etiqueta of ['3 Asistencias', '5 Asistencias', 'Asistencia última noche']) {
    doc.rect(xc, 196.5 - 2.6, 2.6, 2.6); texto(etiqueta, xc + 3.6, 196.5)
    xc += 3.6 + doc.getTextWidth(etiqueta) + 2.2
  }
  texto('Auxiliar', 100, 205); linea(111.5, R, 205)

  // Cafetería novenario
  subrayado('CAFETERÍA NOVENARIO', L, 215.3)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('NOVENARIO', L, 219.8)
  const fechaCorta = (et, y, valor) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(et, 27.5, y)
    const x = 27.5 + doc.getTextWidth(et) + 0.5
    if (valor) { texto(valor, x + 1, y - 0.4); linea(x, x + 28, y); return }
    linea(x, x + 11, y); texto('/', x + 11.3, y); linea(x + 12.5, x + 19.5, y); texto('/', x + 19.8, y); linea(x + 21, x + 28, y)
  }
  fechaCorta('Inicia:', 229, fmtEntrada(campos.inicio_novenario))
  fechaCorta('Finaliza:', 236.7, fmtEntrada(campos.fin_novenario))
  for (let i = 0; i < 3; i++) filaTurno(i + 1, 247.5 + i * 7.3)

  doc.save(`Atencion_Acompanamientos_${s.codigo || s.numero || 'servicio'}.pdf`)
}

// "VEREDA LA SIERRA" + "LA SIERRA" → no repetir el barrio si ya viene en la dirección
function unirDireccion(direccion, barrio) {
  const d = (direccion || '').trim(), b = (barrio || '').trim()
  if (!b || d.toLowerCase().includes(b.toLowerCase())) return d
  return d ? `${d}, ${b}` : b
}

// ── Registro de formatos (los muestra la pestaña Documentos del servicio) ─
// `campos`: lo que se puede ajustar antes de descargar; `valorInicial(datos)` los precarga.
export const FORMATOS_SERVICIO = [
  {
    clave: 'asistencia_novenarios',
    titulo: 'Asistencia a novenarios',
    descripcion: 'Control de visitas del coordinador durante el novenario',
    generar: generarAsistenciaNovenarios,
    campos: [
      { k: 'ser_querido',        label: 'Ser querido' },
      { k: 'responsable',        label: 'Responsable' },
      { k: 'direccion_velacion', label: 'Dirección velación', span: 2 },
      { k: 'coordinador',        label: 'Coordinador', span: 2 },
      { k: 'inicio_novenario',   label: 'Inicio novenario',        type: 'date' },
      { k: 'fin_novenario',      label: 'Finalización novenario',  type: 'date' },
      { k: 'eucaristia',         label: 'Eucaristía última noche', type: 'datetime-local', span: 2 },
    ],
    valorInicial: ({ servicio: s = {} }) => ({
      ser_querido: s.difunto_nombre || '',
      responsable: s.responsable_nombre || s.contratante_nombre || '',
      // Sala propia si la hubo; si fue en casa, la dirección/barrio de quien responde por el servicio
      direccion_velacion: s.sala_nombre
        || unirDireccion(s.responsable_direccion, s.responsable_barrio)
        || unirDireccion(s.contratante_direccion, s.contratante_barrio),
      coordinador: s.coordinador_nombre || '',
      inicio_novenario: '', fin_novenario: '', eucaristia: '',
    }),
  },
  {
    clave: 'atencion_acompanamientos',
    titulo: 'Atención y acompañamientos',
    descripcion: 'Exequias, cafetería, cortejo, última noche y novenario',
    generar: generarAtencionAcompanamientos,
    campos: [
      { k: 'ser_querido',     label: 'Ser querido', span: 2 },
      { k: 'orden_no',        label: 'Orden No.' },
      { k: 'control_int',     label: 'Control interno' },
      { k: 'coordinador',     label: 'Coordinador' },
      { k: 'fecha_defuncion', label: 'Fecha defunción' },
      { k: 'fecha_exequias',  label: 'Fecha exequias' },
      { k: 'hora_exequias',   label: 'Hora exequias' },
      { k: 'iglesia',         label: 'Iglesia' },
      { k: 'coro',            label: 'Coro' },
      { k: 'carroza',         label: 'Carroza (placa)' },
      { k: 'conductor',       label: 'Conductor' },
      { k: 'cementerio',      label: 'Cementerio', span: 2 },
      { k: 'jefe_protocolo',  label: 'Jefe de protocolo', span: 2 },
      { k: 'parroquia',       label: 'Parroquia (última noche)', span: 2 },
      { k: 'inicio_novenario', label: 'Inicio novenario', type: 'date' },
      { k: 'fin_novenario',    label: 'Fin novenario',    type: 'date' },
    ],
    valorInicial: ({ servicio: s = {}, defuncion, traslados = [] }) => {
      const ex = partesFechaServicio(s.fecha_disposicion)
      const t = trasladoExequias(traslados)
      return {
        ser_querido: s.difunto_nombre || '',
        orden_no: s.numero != null ? String(s.numero) : '',
        control_int: controlInterno(s.codigo),
        coordinador: s.coordinador_nombre || '',
        fecha_defuncion: fmtFechaISO(defuncion?.fecha_fallecimiento),
        fecha_exequias: ex.fecha,
        hora_exequias: ex.hora,
        iglesia: s.iglesia || '',
        coro: s.coro || '',
        carroza: t?.vehiculo_placa || t?.vehiculo || '',
        // El conductor del traslado a cementerio; si no hay, el asignado en Personal
        conductor: t?.conductor_nombre || t?.conductor || s.conductor_personal_nombre || '',
        cementerio: s.lugar_disposicion || '',
        jefe_protocolo: s.jefe_protocolo_nombre || '',
        parroquia: '', inicio_novenario: '', fin_novenario: '',
      }
    },
  },
]
