/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Auditoría — registro de acciones de negocio          ║
 * ║  Archivo         : auditoria.service.js                                 ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-11                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

// Nunca debe reventar la petición que la originó — un fallo al auditar no
// puede tumbar una venta o un pago real.
export async function registrarAuditoria({
  usuario_id = null, usuario_nombre = null, accion, modulo = null,
  metodo = null, ruta = null, entidad_id = null, descripcion = null,
  ip = null, navegador = null, sede_id = null,
}) {
  try {
    await pool.query(
      `INSERT INTO auditoria_log
         (usuario_id, usuario_nombre, accion, modulo, metodo, ruta, entidad_id, descripcion, ip, navegador, sede_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [usuario_id, usuario_nombre, accion, modulo, metodo, ruta, entidad_id, descripcion, ip, navegador, sede_id]
    )
  } catch (e) {
    console.error('[auditoria] no se pudo registrar:', e.message)
  }
}

// Lectura mínima del User-Agent — solo navegador + sistema operativo, sin
// traer una librería completa de parsing para esto.
export function parsearNavegador(ua = '') {
  if (!ua) return '—'
  let so = 'Desconocido'
  if (/windows/i.test(ua)) so = 'Windows'
  else if (/mac os/i.test(ua)) so = 'macOS'
  else if (/android/i.test(ua)) so = 'Android'
  else if (/iphone|ipad/i.test(ua)) so = 'iOS'
  else if (/linux/i.test(ua)) so = 'Linux'

  let navegador = 'Desconocido'
  if (/edg\//i.test(ua)) navegador = 'Edge'
  else if (/chrome\//i.test(ua)) navegador = 'Chrome'
  else if (/firefox\//i.test(ua)) navegador = 'Firefox'
  else if (/safari\//i.test(ua)) navegador = 'Safari'

  return `${navegador} en ${so}`
}
