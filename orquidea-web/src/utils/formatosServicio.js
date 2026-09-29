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
]
