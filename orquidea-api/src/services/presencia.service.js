/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Auditoría — presencia en línea (en memoria)          ║
 * ║  Archivo         : presencia.service.js                                 ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * "Quién está en línea ahora" sin pegarle a la base de datos en cada
 * petición — un Map en memoria del propio proceso, actualizado gratis en
 * cada request autenticado (verifyToken). Se pierde si el proceso se
 * reinicia, lo cual es aceptable: es una vista de "ahora mismo", no un
 * historial (eso lo guarda auditoria_log aparte).
 */
const presencia = new Map() // usuario_id -> { nombre, rol, ip, navegador, sede_id, sede_nombre, ultima_actividad }

export function marcarActividad(usuario, { ip, navegador }) {
  presencia.set(usuario.id, {
    usuario_id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    ip,
    navegador,
    sede_id: usuario.sede_id,
    ultima_actividad: new Date().toISOString(),
  })
}

export function quitarPresencia(usuario_id) {
  presencia.delete(usuario_id)
}

// Se considera "en línea" a quien tuvo actividad en los últimos N minutos —
// no hay logout confiable con JWT stateless, así que esto es lo real.
export function listarEnLinea(minutos = 5) {
  const limite = Date.now() - minutos * 60_000
  return [...presencia.values()]
    .filter(p => new Date(p.ultima_actividad).getTime() >= limite)
    .sort((a, b) => new Date(b.ultima_actividad) - new Date(a.ultima_actividad))
}
