/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Utilidades — textos uniformes al guardar             ║
 * ║  Archivo         : utils/normalizarTextos.js                            ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Garantía del lado del servidor: aunque un dato llegue sin formato (otra
 * pantalla, importación, app externa), se guarda uniforme. Se aplica en un
 * hook global (server.js) a todo cuerpo JSON de POST/PUT/PATCH, por NOMBRE
 * de campo. Mismas reglas que el web (utils/textoFormato.js).
 */
import { nombrePropio, tituloRespetando, frase } from './textoFormato.js'

const PERSONA = new Set(['nombres', 'apellidos', 'nombre_conyuge', 'nombre_madre', 'nombre_padre', 'contacto_nombre',
  'responsable_nombre', 'representante_legal', 'medico_certifica', 'cliente_nombre', 'conductor', 'barrio', 'vereda'])
const LUGAR = new Set(['razon_social', 'nombre_comercial', 'titular', 'iglesia', 'coro', 'lugar_fallecimiento',
  'lugar_recogida', 'lugar_disposicion', 'lugar_exp_documento', 'notaria', 'ocupacion', 'religion', 'nacionalidad',
  'contacto_cargo', 'seguridad_social', 'banco', 'ciudad_registro'])
const FRASE = /^(observaciones(_\w+)?|convenio_observaciones|notas?(_\w+)?|motivo(_\w+)?|descripcion|concepto|causa_fallecimiento|materiales|resultado|condicion_pago|direccion(_\w+)?|detalle|comentario|justificacion)$/

function normalizarValor(clave, v) {
  if (typeof v !== 'string' || !v) return v
  const limpio = v.replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, '')
  if (PERSONA.has(clave)) return nombrePropio(limpio.replace(/\s+/g, ' '))
  if (LUGAR.has(clave)) return tituloRespetando(limpio.replace(/\s+/g, ' '))
  if (FRASE.test(clave)) return frase(limpio)
  return v
}

export function normalizarCuerpo(obj, prof = 0) {
  if (!obj || typeof obj !== 'object' || prof > 4) return obj
  if (Array.isArray(obj)) { obj.forEach(x => normalizarCuerpo(x, prof + 1)); return obj }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') normalizarCuerpo(v, prof + 1)
    else obj[k] = normalizarValor(k, v)
  }
  return obj
}
