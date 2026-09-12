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
 * Nombre de columna/tabla legible en español — para cuando no hay un
 * mensaje a la medida configurado abajo, así el usuario al menos entiende
 * QUÉ dato faltó o se repitió, en vez de un "Error interno del servidor"
 * que no le dice nada y lo deja sin saber qué corregir.
 */
const NOMBRE_CAMPO = {
  contrato_id: 'el contrato', poliza_id: 'la póliza', difunto_id: 'el difunto',
  contratante_id: 'el contratante', cliente_id: 'el cliente', producto_id: 'el producto',
  usuario_id: 'el usuario', sede_id: 'la sede', bodega_id: 'la bodega',
  cuenta_codigo: 'la cuenta contable', tercero_id: 'el tercero', servicio_id: 'el servicio',
  numero_documento: 'el número de documento', email: 'el correo electrónico',
  cuenta_principal_codigo: 'la cuenta de caja/banco',
}
const nombreLegible = (campo) => NOMBRE_CAMPO[campo] || `"${campo}"`

// Mensajes a la medida por restricción CHECK/UNIQUE con nombre propio —
// mucho más útil que repetirle al usuario el nombre técnico de la regla.
const MENSAJE_RESTRICCION = {
  ck_servicio_tiene_origen: 'El servicio debe estar vinculado a un contrato o a una póliza — verifica que hayas seleccionado uno de los dos antes de guardar.',
  ck_asiento_debe_o_haber: 'Una línea contable no puede tener débito y crédito a la vez.',
  ck_comprobante_cuadrado: 'El comprobante no cuadra: la suma de débitos debe ser igual a la de créditos.',
  pos_venta_pagos_monto_check: 'El monto de un pago debe ser mayor a cero.',
}

/**
 * Manejador global de errores para Fastify — la meta es que quien está
 * llenando un formulario SIEMPRE sepa por qué no se pudo guardar, en vez
 * de ver un "Error interno del servidor" genérico. El detalle técnico
 * completo igual queda en el log del servidor para depurar.
 */
export function errorHandler(error, request, reply) {
  request.log.error(error)

  // Errores de validación de Fastify (body/params mal formados)
  if (error.validation) {
    return reply.status(400).send({
      error: 'Datos inválidos — revisa los campos del formulario.',
      details: error.validation,
    })
  }

  // ── Errores de BD (código de Postgres) ──────────────────────────────────
  switch (error.code) {
    case '23505': // unique_violation
      return reply.status(409).send({ error: 'Ya existe un registro con ese mismo dato — revisa que no lo hayas guardado antes.' })

    case '23503': // foreign_key_violation
      return reply.status(409).send({
        error: `No se pudo completar la operación porque ${nombreLegible(error.column) || 'una referencia'} no existe o ya fue eliminado. Actualiza la página e inténtalo de nuevo.`,
      })

    case '23502': // not_null_violation
      return reply.status(400).send({
        error: `Falta ${nombreLegible(error.column)} — es un dato obligatorio para completar este registro.`,
      })

    case '23514': // check_violation
      return reply.status(400).send({
        error: MENSAJE_RESTRICCION[error.constraint] || 'El dato ingresado no cumple una regla del sistema — revisa los valores del formulario.',
      })

    case '22P02': // invalid_text_representation (ej. UUID/número mal formado)
      return reply.status(400).send({ error: 'Uno de los datos enviados tiene un formato inválido.' })

    case '22003': // numeric_value_out_of_range
      return reply.status(400).send({ error: 'Uno de los valores numéricos es demasiado grande.' })
  }

  const statusCode = error.statusCode || 500
  reply.status(statusCode).send({
    error: statusCode === 500
      ? 'Ocurrió un error inesperado en el servidor. Si el problema persiste, contacta al soporte técnico con la hora exacta de este intento.'
      : error.message,
  })
}
