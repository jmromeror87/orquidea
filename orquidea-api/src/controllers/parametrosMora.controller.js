/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración / Intereses de Mora                   ║
 * ║  Archivo         : parametrosMora.controller.js                        ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'

// GET /api/mora/parametros
export async function obtenerParametros(req, reply) {
  const r = await pool.query(`
    SELECT * FROM parametros_mora WHERE activo = TRUE LIMIT 1
  `)
  return reply.send({ data: r.rows[0] || null })
}

// PUT /api/mora/parametros
export async function actualizarParametros(req, reply) {
  const {
    nombre, tasa_interes_diario, dias_gracia_promesa,
    dias_auto_cancelacion, auto_cancelar, cobrar_intereses,
  } = req.body

  const r = await pool.query(`
    UPDATE parametros_mora SET
      nombre                = COALESCE($1, nombre),
      tasa_interes_diario   = COALESCE($2, tasa_interes_diario),
      dias_gracia_promesa   = COALESCE($3, dias_gracia_promesa),
      dias_auto_cancelacion = COALESCE($4, dias_auto_cancelacion),
      auto_cancelar         = COALESCE($5, auto_cancelar),
      cobrar_intereses      = COALESCE($6, cobrar_intereses),
      actualizado           = NOW(),
      actualizado_por       = $7
    WHERE activo = TRUE
    RETURNING *
  `, [
    nombre ?? null,
    tasa_interes_diario != null ? Number(tasa_interes_diario) : null,
    dias_gracia_promesa != null ? Number(dias_gracia_promesa) : null,
    dias_auto_cancelacion != null ? Number(dias_auto_cancelacion) : null,
    auto_cancelar != null ? Boolean(auto_cancelar) : null,
    cobrar_intereses != null ? Boolean(cobrar_intereses) : null,
    req.user.id,
  ])

  return reply.send({ data: r.rows[0], mensaje: 'Parámetros actualizados' })
}

// POST /api/mora/aplicar-ahora — ejecutar cron manualmente (pólizas + contratos)
export async function aplicarMoraAhora(req, reply) {
  const [rPol, rCtr] = await Promise.all([
    pool.query(`SELECT * FROM fn_recalcular_mora_polizas()`),
    pool.query(`SELECT * FROM fn_recalcular_mora_contratos()`),
  ])
  const pol = rPol.rows[0]
  const ctr = rCtr.rows[0]
  return reply.send({
    data: { polizas: pol, contratos: ctr },
    mensaje: `Pólizas: ${pol.procesadas} procesadas, ${pol.con_interes} con interés, ${pol.auto_canceladas} auto-canceladas · `
      + `Contratos: ${ctr.procesados} procesados, ${ctr.con_interes} con interés, ${ctr.auto_cancelados} auto-cancelados`,
  })
}

// GET /api/mora/intereses/:polizaId — historial de intereses por póliza
export async function historialIntereses(req, reply) {
  const { polizaId } = req.params
  const r = await pool.query(`
    SELECT mi.*, p.numero AS poliza_numero
    FROM mora_intereses mi
    JOIN polizas p ON p.id = mi.poliza_id
    WHERE mi.poliza_id = $1
    ORDER BY mi.fecha DESC, mi.creado_en DESC
    LIMIT 100
  `, [polizaId])
  return reply.send({ data: r.rows })
}

// GET /api/mora/intereses-contrato/:contratoId — historial de intereses por contrato
export async function historialInteresesContrato(req, reply) {
  const { contratoId } = req.params
  const r = await pool.query(`
    SELECT mi.*, c.numero AS contrato_numero
    FROM mora_intereses mi
    JOIN contratos c ON c.id = mi.contrato_id
    WHERE mi.contrato_id = $1
    ORDER BY mi.fecha DESC, mi.creado_en DESC
    LIMIT 100
  `, [contratoId])
  return reply.send({ data: r.rows })
}

// POST /api/mora/contratos/:contratoId/promesa — registrar promesa de pago
export async function registrarPromesaContrato(req, reply) {
  const { contratoId } = req.params
  const { fecha_promesa } = req.body
  if (!fecha_promesa) return reply.code(400).send({ error: 'fecha_promesa es obligatoria (YYYY-MM-DD)' })

  const r = await pool.query(
    `SELECT id FROM contratos WHERE id=$1 AND modalidad='CUOTAS' AND estado NOT IN ('completado','cancelado')`,
    [contratoId]
  )
  if (!r.rows.length) return reply.code(404).send({ error: 'Contrato no encontrado, no es a cuotas, o ya está finalizado' })

  await pool.query(`SELECT fn_registrar_promesa_contrato($1, $2::DATE)`, [contratoId, fecha_promesa])
  return reply.send({ ok: true })
}

// GET /api/mora/resumen — cuántas pólizas/contratos tienen intereses hoy
export async function resumenMora(req, reply) {
  const [rPol, rCtr] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.interes_mora > 0)                   AS con_interes,
        COALESCE(SUM(p.interes_mora), 0)                             AS total_intereses,
        COUNT(*) FILTER (WHERE p.promesa_incumplida)                 AS promesas_incumplidas,
        COUNT(*) FILTER (WHERE p.fecha_promesa < CURRENT_DATE
                           AND p.estado NOT IN ('CANCELADA','EJECUTADA')) AS promesas_vencidas
      FROM polizas p
      WHERE p.estado NOT IN ('CANCELADA','EJECUTADA')
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE c.interes_mora > 0)                   AS con_interes,
        COALESCE(SUM(c.interes_mora), 0)                             AS total_intereses,
        COUNT(*) FILTER (WHERE c.promesa_incumplida)                 AS promesas_incumplidas,
        COUNT(*) FILTER (WHERE c.fecha_promesa < CURRENT_DATE
                           AND c.estado NOT IN ('completado','cancelado')) AS promesas_vencidas
      FROM contratos c
      WHERE c.modalidad = 'CUOTAS' AND c.estado NOT IN ('completado','cancelado')
    `),
  ])
  const pol = rPol.rows[0]
  const ctr = rCtr.rows[0]
  return reply.send({
    data: {
      // Totales combinados (compatibles con el consumidor flat existente)
      con_interes:          +pol.con_interes + +ctr.con_interes,
      total_intereses:      +pol.total_intereses + +ctr.total_intereses,
      promesas_incumplidas: +pol.promesas_incumplidas + +ctr.promesas_incumplidas,
      promesas_vencidas:    +pol.promesas_vencidas + +ctr.promesas_vencidas,
      // Detalle por origen
      polizas: pol,
      contratos: ctr,
    },
  })
}
