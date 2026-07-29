/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Core                                            ║
 * ║  Archivo         : errorHandler.js                                 ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Manejador global de errores para Fastify
 */
export function errorHandler(error, request, reply) {
  request.log.error(error)

  // Errores de validación de Fastify
  if (error.validation) {
    return reply.status(400).send({
      error: 'Datos inválidos',
      details: error.validation,
    })
  }

  // Errores de BD (pg)
  if (error.code === '23505') {
    return reply.status(409).send({ error: 'El registro ya existe' })
  }
  if (error.code === '23503') {
    return reply.status(409).send({ error: 'Referencia a registro inexistente' })
  }

  const statusCode = error.statusCode || 500
  reply.status(statusCode).send({
    error: statusCode === 500 ? 'Error interno del servidor' : error.message,
  })
}
