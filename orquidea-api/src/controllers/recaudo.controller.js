/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Recaudo                                             ║
 * ║  Archivo         : recaudo.controller.js                               ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-03                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede, rutaPermitida, ordenRecaudoPermitida } from '../utils/sede.js'

// GET /api/recaudo/rutas-del-dia?fecha=YYYY-MM-DD
// Lista las rutas que tienen cobro programado para esa fecha
export async function rutasDelDia(req, reply) {
  const fecha = req.query.fecha || new Date().toISOString().slice(0, 10)
  const dia = new Date(fecha + 'T12:00:00').getDate()
  const { sedeIds } = resolverSede(req)

  const r = await pool.query(`
    SELECT
      r.id, r.nombre AS ruta_nombre, r.dias_mes, r.zona_id,
      z.nombre AS zona_nombre, z.color AS zona_color,
      u.nombre AS recaudador_nombre,
      COUNT(pr.poliza_id) AS total_polizas,
      COALESCE(SUM(p.valor_cuota), 0) AS total_esperado,
      o.id AS orden_id, o.estado AS orden_estado, o.total_recaudado
    FROM rutas_recaudo r
    JOIN zonas_recaudo z ON z.id = r.zona_id
    LEFT JOIN usuarios u ON u.id = r.recaudador_id
    LEFT JOIN poliza_ruta pr ON pr.ruta_id = r.id AND pr.activa
    LEFT JOIN polizas p ON p.id = pr.poliza_id AND p.estado IN ('ACTIVA','VIGENTE')
    LEFT JOIN ordenes_recaudo o ON o.ruta_id = r.id AND o.fecha = $2
    WHERE r.activa AND $1 = ANY(r.dias_mes)
      AND ($3::uuid[] IS NULL OR z.sede_id = ANY($3::uuid[]))
    GROUP BY r.id, z.nombre, z.color, u.nombre, o.id, o.estado, o.total_recaudado
    ORDER BY z.nombre, r.nombre
  `, [dia, fecha, sedeIds])

  return reply.send({ data: r.rows })
}

// GET /api/recaudo/orden-del-dia?fecha=YYYY-MM-DD&ruta_id=UUID
// Genera o recupera la orden del día de una ruta
export async function ordenDelDia(req, reply) {
  const fecha = req.query.fecha || new Date().toISOString().slice(0, 10)
  const { ruta_id } = req.query

  if (!ruta_id) return reply.code(400).send({ error: 'ruta_id requerido' })

  const { sedeIds } = resolverSede(req)
  if (!(await rutaPermitida(pool, ruta_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta ruta' })
  }

  // Buscar orden existente
  let orden = await pool.query(
    `SELECT o.*, u.nombre AS recaudador_nombre, r.nombre AS ruta_nombre,
            z.nombre AS zona_nombre, z.color AS zona_color
     FROM ordenes_recaudo o
     JOIN rutas_recaudo r ON r.id = o.ruta_id
     JOIN zonas_recaudo z ON z.id = r.zona_id
     LEFT JOIN usuarios u ON u.id = o.recaudador_id
     WHERE o.ruta_id = $1 AND o.fecha = $2`,
    [ruta_id, fecha]
  )

  if (orden.rows.length === 0) {
    // Calcular total esperado
    const totalQ = await pool.query(
      `SELECT COALESCE(SUM(p.valor_cuota), 0) AS total
       FROM poliza_ruta pr
       JOIN polizas p ON p.id = pr.poliza_id
       WHERE pr.ruta_id = $1 AND pr.activa AND p.estado IN ('ACTIVA','VIGENTE')`,
      [ruta_id]
    )
    const ruta = await pool.query(
      `SELECT r.*, u.id AS rec_id, u.nombre AS rec_nombre
       FROM rutas_recaudo r
       LEFT JOIN usuarios u ON u.id = r.recaudador_id
       WHERE r.id = $1`,
      [ruta_id]
    )
    const nueva = await pool.query(
      `INSERT INTO ordenes_recaudo (ruta_id, fecha, recaudador_id, total_esperado)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [ruta_id, fecha, ruta.rows[0]?.rec_id || null, totalQ.rows[0].total]
    )
    orden = await pool.query(
      `SELECT o.*, u.nombre AS recaudador_nombre, r.nombre AS ruta_nombre,
              z.nombre AS zona_nombre, z.color AS zona_color
       FROM ordenes_recaudo o
       JOIN rutas_recaudo r ON r.id = o.ruta_id
       JOIN zonas_recaudo z ON z.id = r.zona_id
       LEFT JOIN usuarios u ON u.id = o.recaudador_id
       WHERE o.id = $1`,
      [nueva.rows[0].id]
    )
  }

  // Cargar visitas con datos de póliza y titular
  const visitas = await pool.query(`
    SELECT
      pr.poliza_id,
      p.numero AS poliza_numero, p.estado AS poliza_estado,
      p.valor_cuota, p.meses_mora, p.dia_cobro, p.saldo_mora,
      COALESCE(t.nombres || ' ' || t.apellidos, t.razon_social) AS titular_nombre,
      t.numero_documento AS titular_doc,
      t.telefono AS titular_cel,
      t.direccion AS titular_dir,
      v.id AS visita_id, v.resultado, v.valor_cobrado, v.valor_esperado, v.metodo_pago,
      v.observaciones, v.visitado_en,
      rr.fecha_promesa
    FROM poliza_ruta pr
    JOIN polizas p ON p.id = pr.poliza_id
    JOIN terceros t ON t.id = p.titular_id
    LEFT JOIN visitas_recaudo v ON v.orden_id = $1 AND v.poliza_id = pr.poliza_id
    LEFT JOIN recibos_recaudo rr ON rr.visita_id = v.id
    WHERE pr.ruta_id = $2 AND pr.activa
    ORDER BY v.resultado NULLS FIRST, t.apellidos, t.nombres
  `, [orden.rows[0].id, ruta_id])

  return reply.send({
    data: {
      orden: orden.rows[0],
      visitas: visitas.rows,
    },
  })
}

// POST /api/recaudo/visitas — registrar o actualizar visita
export async function registrarVisita(req, reply) {
  const {
    orden_id, poliza_id, resultado,
    valor_cobrado = 0, metodo_pago, observaciones,
  } = req.body

  if (!orden_id || !poliza_id || !resultado) {
    return reply.code(400).send({ error: 'orden_id, poliza_id y resultado son requeridos' })
  }

  const { sedeIds } = resolverSede(req)
  if (!(await ordenRecaudoPermitida(pool, orden_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta orden de recaudo' })
  }

  // Obtener valor esperado
  const polQ = await pool.query(`SELECT valor_cuota FROM polizas WHERE id = $1`, [poliza_id])
  const valor_esperado = polQ.rows[0]?.valor_cuota || 0

  await pool.query(`
    INSERT INTO visitas_recaudo
      (orden_id, poliza_id, resultado, valor_cobrado, valor_esperado, metodo_pago, observaciones, visitado_en)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (orden_id, poliza_id) DO UPDATE SET
      resultado     = EXCLUDED.resultado,
      valor_cobrado = EXCLUDED.valor_cobrado,
      metodo_pago   = EXCLUDED.metodo_pago,
      observaciones = EXCLUDED.observaciones,
      visitado_en   = NOW()
  `, [orden_id, poliza_id, resultado, valor_cobrado, valor_esperado, metodo_pago, observaciones])

  // Actualizar totales de la orden
  await pool.query(`
    UPDATE ordenes_recaudo SET
      total_recaudado = (
        SELECT COALESCE(SUM(valor_cobrado), 0)
        FROM visitas_recaudo WHERE orden_id = $1
      ),
      estado = CASE
        WHEN (SELECT COUNT(*) FROM visitas_recaudo WHERE orden_id = $1 AND resultado IS NOT NULL) =
             (SELECT COUNT(*) FROM visitas_recaudo WHERE orden_id = $1)
             AND (SELECT COUNT(*) FROM visitas_recaudo WHERE orden_id = $1) > 0
        THEN 'COMPLETADA'
        ELSE 'EN_CURSO'
      END
    WHERE id = $1
  `, [orden_id])

  return reply.send({ ok: true })
}

// GET /api/recaudo/historial?ruta_id=&desde=&hasta=
export async function historial(req, reply) {
  const { ruta_id, desde, hasta } = req.query
  const { sedeIds } = resolverSede(req)

  const r = await pool.query(`
    SELECT
      o.id, o.fecha, o.estado, o.total_esperado, o.total_recaudado,
      r.nombre AS ruta_nombre,
      z.nombre AS zona_nombre, z.color AS zona_color,
      u.nombre AS recaudador_nombre,
      COUNT(v.id) AS total_visitas,
      COUNT(v.id) FILTER (WHERE v.resultado = 'COBRADO')  AS cobradas,
      COUNT(v.id) FILTER (WHERE v.resultado = 'AUSENTE')  AS ausentes,
      COUNT(v.id) FILTER (WHERE v.resultado = 'PROMESA')  AS promesas,
      COUNT(v.id) FILTER (WHERE v.resultado = 'PARCIAL')  AS parciales,
      COUNT(v.id) FILTER (WHERE v.resultado = 'NO_PAGA')  AS no_paga,
      COUNT(v.id) FILTER (WHERE v.resultado = 'APLAZADO') AS aplazados
    FROM ordenes_recaudo o
    JOIN rutas_recaudo r ON r.id = o.ruta_id
    JOIN zonas_recaudo z ON z.id = r.zona_id
    LEFT JOIN usuarios u ON u.id = o.recaudador_id
    LEFT JOIN visitas_recaudo v ON v.orden_id = o.id
    WHERE ($1::UUID IS NULL OR o.ruta_id = $1)
      AND ($2::DATE IS NULL OR o.fecha >= $2)
      AND ($3::DATE IS NULL OR o.fecha <= $3)
      AND ($4::uuid[] IS NULL OR z.sede_id = ANY($4::uuid[]))
    GROUP BY o.id, r.nombre, z.nombre, z.color, u.nombre
    ORDER BY o.fecha DESC
    LIMIT 50
  `, [ruta_id || null, desde || null, hasta || null, sedeIds])

  return reply.send({ data: r.rows })
}

// GET /api/recaudo/historial/:ordenId/visitas — detalle de visitas de una orden
export async function visitasDeOrden(req, reply) {
  const { ordenId } = req.params
  const { sedeIds } = resolverSede(req)
  if (!(await ordenRecaudoPermitida(pool, ordenId, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta orden de recaudo' })
  }

  const r = await pool.query(`
    SELECT
      v.id, v.resultado, v.valor_cobrado, v.valor_esperado,
      v.metodo_pago, v.observaciones, v.visitado_en,
      p.numero AS poliza_numero, p.valor_cuota, p.meses_mora,
      COALESCE(t.nombres || ' ' || t.apellidos, t.razon_social) AS titular_nombre,
      t.telefono AS titular_cel
    FROM visitas_recaudo v
    JOIN polizas p ON p.id = v.poliza_id
    JOIN terceros t ON t.id = p.titular_id
    WHERE v.orden_id = $1
    ORDER BY v.resultado NULLS LAST, t.apellidos
  `, [ordenId])

  return reply.send({ data: r.rows })
}

// GET /api/recaudo/indicadores
export async function indicadores(req, reply) {
  const { sedeIds } = resolverSede(req)
  const s = [sedeIds]

  const [resumen, porZona, eficiencia] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(DISTINCT o.id)                                          AS total_ordenes,
        SUM(o.total_esperado)                                         AS esperado_total,
        SUM(o.total_recaudado)                                        AS recaudado_total,
        ROUND(SUM(o.total_recaudado)*100.0 / NULLIF(SUM(o.total_esperado),0), 1) AS pct_recaudo,
        COUNT(v.id) FILTER (WHERE v.resultado = 'COBRADO')            AS visitas_cobradas,
        COUNT(v.id) FILTER (WHERE v.resultado = 'AUSENTE')            AS visitas_ausentes,
        COUNT(v.id) FILTER (WHERE v.resultado = 'PROMESA')            AS visitas_promesa,
        COUNT(v.id)                                                   AS total_visitas
      FROM ordenes_recaudo o
      JOIN rutas_recaudo r ON r.id = o.ruta_id
      JOIN zonas_recaudo z ON z.id = r.zona_id
      LEFT JOIN visitas_recaudo v ON v.orden_id = o.id
      WHERE DATE_TRUNC('month', o.fecha) = DATE_TRUNC('month', CURRENT_DATE)
        AND ($1::uuid[] IS NULL OR z.sede_id = ANY($1::uuid[]))
    `, s),
    pool.query(`
      SELECT
        z.nombre AS zona, z.color,
        COUNT(DISTINCT o.id)   AS ordenes,
        SUM(o.total_esperado)  AS esperado,
        SUM(o.total_recaudado) AS recaudado,
        ROUND(SUM(o.total_recaudado)*100.0 / NULLIF(SUM(o.total_esperado),0), 1) AS pct
      FROM zonas_recaudo z
      JOIN rutas_recaudo r ON r.zona_id = z.id
      LEFT JOIN ordenes_recaudo o
        ON o.ruta_id = r.id
        AND DATE_TRUNC('month', o.fecha) = DATE_TRUNC('month', CURRENT_DATE)
      WHERE ($1::uuid[] IS NULL OR z.sede_id = ANY($1::uuid[]))
      GROUP BY z.id
      ORDER BY recaudado DESC NULLS LAST
    `, s),
    pool.query(`
      SELECT
        u.nombre AS recaudador,
        COUNT(DISTINCT o.id)   AS ordenes,
        SUM(o.total_recaudado) AS recaudado,
        ROUND(SUM(o.total_recaudado)*100.0 / NULLIF(SUM(o.total_esperado),0), 1) AS pct
      FROM ordenes_recaudo o
      JOIN usuarios u ON u.id = o.recaudador_id
      JOIN rutas_recaudo r ON r.id = o.ruta_id
      JOIN zonas_recaudo z ON z.id = r.zona_id
      WHERE DATE_TRUNC('month', o.fecha) = DATE_TRUNC('month', CURRENT_DATE)
        AND ($1::uuid[] IS NULL OR z.sede_id = ANY($1::uuid[]))
      GROUP BY u.id
      ORDER BY recaudado DESC NULLS LAST
      LIMIT 10
    `, s),
  ])

  return reply.send({
    data: {
      resumen: resumen.rows[0],
      por_zona: porZona.rows,
      por_recaudador: eficiencia.rows,
    },
  })
}

// GET /api/recaudo/mis-rutas?fecha=YYYY-MM-DD
// Rutas asignadas al recaudador autenticado para la fecha indicada
export async function misRutas(req, reply) {
  const userId = req.user.id
  const rol    = req.user.rol
  const esAdmin = ['superadmin', 'administrador'].includes(rol)
  const fecha  = req.query.fecha || new Date().toISOString().slice(0, 10)
  const dia    = new Date(fecha + 'T12:00:00').getDate()
  const { sedeIds } = resolverSede(req)

  // Admin ve todas las rutas del día (o filtra por sede); recaudador solo las suyas
  const whereClause = esAdmin
    ? `(TRUE OR r.recaudador_id = $1::uuid) AND r.activa AND $2 = ANY(r.dias_mes) AND ($4::uuid[] IS NULL OR z.sede_id = ANY($4::uuid[]))`
    : `r.recaudador_id = $1::uuid AND r.activa AND $2 = ANY(r.dias_mes) AND ($4::uuid[] IS NULL OR z.sede_id = ANY($4::uuid[]))`

  const r = await pool.query(`
    SELECT
      r.id, r.nombre AS ruta_nombre, r.dias_mes,
      z.nombre AS zona_nombre, z.color AS zona_color, z.tipo AS zona_tipo,
      u.nombre AS recaudador_nombre,
      COUNT(DISTINCT pr.poliza_id) AS total_polizas,
      COALESCE(SUM(p.valor_cuota), 0) AS total_esperado,
      o.id AS orden_id, o.estado AS orden_estado,
      o.total_recaudado, o.total_esperado AS orden_esperado,
      COUNT(v.id) AS total_visitas,
      COUNT(v.id) FILTER (WHERE v.resultado IS NOT NULL) AS visitas_gestionadas,
      COUNT(v.id) FILTER (WHERE v.resultado = 'COBRADO') AS cobradas,
      COUNT(v.id) FILTER (WHERE v.resultado = 'PARCIAL') AS parciales
    FROM rutas_recaudo r
    JOIN zonas_recaudo z ON z.id = r.zona_id
    LEFT JOIN usuarios u ON u.id = r.recaudador_id
    LEFT JOIN poliza_ruta pr ON pr.ruta_id = r.id AND pr.activa
    LEFT JOIN polizas p ON p.id = pr.poliza_id AND p.estado IN ('ACTIVA','VIGENTE')
    LEFT JOIN ordenes_recaudo o ON o.ruta_id = r.id AND o.fecha = $3
    LEFT JOIN visitas_recaudo v ON v.orden_id = o.id
    WHERE ${whereClause}
    GROUP BY r.id, z.nombre, z.color, z.tipo, u.nombre, o.id, o.estado, o.total_recaudado, o.total_esperado
    ORDER BY z.nombre, r.nombre
  `, [userId, dia, fecha, sedeIds])

  return reply.send({ data: r.rows, fecha })
}

// POST /api/recaudo/visitas/detalle — registrar visita con generación de recibo
export async function registrarVisitaDetalle(req, reply) {
  const {
    orden_id, poliza_id,
    resultado,
    valor_cobrado = 0,
    metodo_pago = 'EFECTIVO',
    fecha_promesa,
    observaciones,
  } = req.body

  const recaudador_id = req.user?.id || null

  if (!orden_id || !poliza_id || !resultado) {
    return reply.code(400).send({ error: 'orden_id, poliza_id y resultado son requeridos' })
  }

  const { sedeIds } = resolverSede(req)
  if (!(await ordenRecaudoPermitida(pool, orden_id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta orden de recaudo' })
  }

  // Obtener datos completos: póliza + tercero + plan + empresa
  const polQ = await pool.query(`
    SELECT
      p.numero        AS poliza_numero,
      p.valor_cuota,
      p.meses_mora,
      p.pago_hasta,
      p.saldo_mora,
      pl.nombre       AS plan_nombre,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre,
      t.numero_documento,
      td.sigla        AS tipo_documento,
      t.telefono      AS titular_tel,
      u.nombre        AS recaudador_nombre
    FROM polizas p
    JOIN terceros t   ON t.id = p.titular_id
    JOIN planes_poliza pl ON pl.id = p.plan_id
    LEFT JOIN tipos_documento td ON td.id = t.tipo_documento_id
    LEFT JOIN usuarios u ON u.id = $2
    WHERE p.id = $1
  `, [poliza_id, recaudador_id])
  if (!polQ.rows.length) return reply.code(404).send({ error: 'Póliza no encontrada' })
  const pol = polQ.rows[0]
  const { valor_cuota, meses_mora, titular_nombre, numero_documento } = pol

  // Datos de la empresa emisora
  const empQ = await pool.query(`
    SELECT razon_social, nit, digito_verificador, direccion,
           municipio, departamento, telefono_1, email, pie_pagina
    FROM empresa LIMIT 1
  `)
  const emp = empQ.rows[0] || {}

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Upsert visita
    const vRes = await client.query(`
      INSERT INTO visitas_recaudo
        (orden_id, poliza_id, resultado, valor_cobrado, valor_esperado, metodo_pago, observaciones, visitado_en)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      ON CONFLICT (orden_id, poliza_id) DO UPDATE SET
        resultado     = EXCLUDED.resultado,
        valor_cobrado = EXCLUDED.valor_cobrado,
        metodo_pago   = EXCLUDED.metodo_pago,
        observaciones = EXCLUDED.observaciones,
        visitado_en   = NOW()
      RETURNING id
    `, [orden_id, poliza_id, resultado, valor_cobrado, valor_cuota, metodo_pago, observaciones])
    const visita_id = vRes.rows[0].id

    // 2. Actualizar totales de la orden
    await client.query(`
      UPDATE ordenes_recaudo SET
        total_recaudado = (SELECT COALESCE(SUM(valor_cobrado),0) FROM visitas_recaudo WHERE orden_id=$1),
        estado = CASE
          WHEN (SELECT COUNT(*) FROM visitas_recaudo WHERE orden_id=$1 AND resultado IS NOT NULL) =
               (SELECT COUNT(*) FROM visitas_recaudo WHERE orden_id=$1) AND
               (SELECT COUNT(*) FROM visitas_recaudo WHERE orden_id=$1) > 0
          THEN 'COMPLETADA' ELSE 'EN_CURSO' END
      WHERE id=$1
    `, [orden_id])

    // 3. Si hubo cobro real → crear recibo + actualizar póliza + insertar en pagos_poliza
    let recibo = null
    if (['COBRADO', 'PARCIAL', 'PROMESA'].includes(resultado)) {
      const saldo_anterior = Number(valor_cuota) * Number(meses_mora || 0)
      const saldo_nuevo    = Math.max(0, saldo_anterior - Number(valor_cobrado))

      const rRes = await client.query(`
        INSERT INTO recibos_recaudo
          (visita_id, poliza_id, recaudador_id, tipo, valor, valor_cuota,
           saldo_anterior, saldo_nuevo, fecha_pago, fecha_promesa, metodo_pago, observaciones)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,$9,$10,$11)
        ON CONFLICT DO NOTHING
        RETURNING *
      `, [
        visita_id, poliza_id, recaudador_id,
        resultado === 'PROMESA' ? 'PROMESA' : resultado === 'COBRADO' ? 'PAGO' : 'PARCIAL',
        valor_cobrado, valor_cuota, saldo_anterior, saldo_nuevo,
        fecha_promesa || null, metodo_pago, observaciones,
      ])
      recibo = rRes.rows[0]

      // 4. Pago real → fn_aplicar_pago_poliza (fuente única de verdad)
      if (['COBRADO', 'PARCIAL'].includes(resultado) && Number(valor_cobrado) > 0) {
        await client.query(
          `SELECT fn_aplicar_pago_poliza($1,$2,$3,$4,$4,$5)`,
          [poliza_id, valor_cobrado, metodo_pago, recaudador_id, observaciones || null]
        )
      }
    }

    // 6a. Registrar promesa en póliza para cálculo de intereses
    if (['APLAZADO', 'PROMESA'].includes(resultado) && fecha_promesa) {
      await client.query(
        `SELECT fn_registrar_promesa($1, $2::DATE)`,
        [poliza_id, fecha_promesa]
      )
    }

    // 6b. Auto-agendamiento: APLAZADO o PARCIAL con fecha → reasignar a la ruta de ese día
    let rutaAgendada = null
    if (['APLAZADO', 'PARCIAL', 'PROMESA'].includes(resultado) && fecha_promesa) {
      const diaPromesa = new Date(fecha_promesa + 'T12:00:00').getDate()
      // Buscar ruta del recaudador que corra ese día
      const rutaQ = await client.query(`
        SELECT r.id, r.nombre FROM rutas_recaudo r
        WHERE r.recaudador_id = $1 AND r.activa AND $2 = ANY(r.dias_mes)
        ORDER BY r.nombre LIMIT 1
      `, [recaudador_id, diaPromesa])

      if (rutaQ.rows.length > 0) {
        const rutaDestino = rutaQ.rows[0].id
        // Reasignar poliza a esa ruta para ese día
        await client.query(`
          INSERT INTO poliza_ruta (poliza_id, ruta_id)
          VALUES ($1, $2)
          ON CONFLICT (poliza_id) DO UPDATE SET ruta_id = $2, activa = TRUE
        `, [poliza_id, rutaDestino])
        rutaAgendada = rutaQ.rows[0].nombre
      }
    }

    await client.query('COMMIT')

    return reply.send({
      ok: true,
      visita_id,
      recibo,
      ruta_agendada: rutaAgendada,
      datos_recibo: recibo ? {
        // Identificación del recibo
        numero:            `REC-${new Date().getFullYear()}-${recibo.numero}`,
        numero_interno:    recibo.numero,
        fecha_hora:        new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', hour12: true }),
        // Empresa
        empresa_nombre:    emp.razon_social   || 'Funeraria San José de Ábrego',
        empresa_nit:       emp.nit            || '',
        empresa_dv:        emp.digito_verificador || '',
        empresa_dir:       emp.direccion      || '',
        empresa_ciudad:    `${emp.municipio || ''}, ${emp.departamento || ''}`.trim().replace(/^,\s*/, ''),
        empresa_tel:       emp.telefono_1     || '',
        empresa_email:     emp.email          || '',
        empresa_pie:       emp.pie_pagina     || '',
        // Titular y póliza
        titular:           titular_nombre,
        tipo_documento:    pol.tipo_documento || 'CC',
        documento:         numero_documento,
        titular_tel:       pol.titular_tel    || '',
        poliza_numero:     pol.poliza_numero,
        plan_nombre:       pol.plan_nombre,
        // Pago
        resultado,
        valor_cobrado:     Number(valor_cobrado),
        valor_cuota:       Number(valor_cuota),
        meses_mora_antes:  Number(meses_mora || 0),
        saldo_anterior:    Number(pol.saldo_mora || 0),
        metodo_pago,
        fecha_promesa:     fecha_promesa || null,
        pago_hasta_nuevo:  pol.pago_hasta,
        // Recaudador
        recaudador:        pol.recaudador_nombre || 'Recaudador',
        observaciones:     observaciones || null,
      } : null,
    })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// GET /api/recaudo/recibos/:id — obtener recibo para imprimir/mostrar
export async function obtenerRecibo(req, reply) {
  const r = await pool.query(`
    SELECT rr.*,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular_nombre,
      t.numero_documento, t.telefono AS celular,
      p.numero AS poliza_numero,
      u.nombre AS recaudador_nombre,
      z.nombre AS zona_nombre, z.sede_id AS zona_sede_id
    FROM recibos_recaudo rr
    JOIN polizas p ON p.id = rr.poliza_id
    JOIN terceros t ON t.id = p.titular_id
    LEFT JOIN usuarios u ON u.id = rr.recaudador_id
    LEFT JOIN visitas_recaudo v ON v.id = rr.visita_id
    LEFT JOIN ordenes_recaudo o ON o.id = v.orden_id
    LEFT JOIN rutas_recaudo rt ON rt.id = o.ruta_id
    LEFT JOIN zonas_recaudo z ON z.id = rt.zona_id
    WHERE rr.id = $1
  `, [req.params.id])
  if (!r.rows.length) return reply.code(404).send({ error: 'Recibo no encontrado' })

  const { sedeIds } = resolverSede(req)
  if (sedeIds !== null && !sedeIds.includes(r.rows[0].zona_sede_id)) {
    return reply.code(403).send({ error: 'No tiene acceso a este recibo' })
  }

  return reply.send({ data: r.rows[0] })
}

// GET /api/recaudo/calendario?mes=7&anio=2026
export async function calendarioRecaudo(req, reply) {
  const anio = parseInt(req.query.anio) || new Date().getFullYear()
  const mes  = parseInt(req.query.mes)  || new Date().getMonth() + 1
  const { sedeIds } = resolverSede(req)

  // Rutas activas con sus días y color
  const rutasQ = await pool.query(`
    SELECT r.id, r.nombre, r.dias_mes, r.recaudador_id,
           u.nombre AS recaudador_nombre,
           COALESCE(z.color, '#6366F1') AS color
    FROM rutas_recaudo r
    LEFT JOIN usuarios u ON u.id = r.recaudador_id
    LEFT JOIN zonas_recaudo z ON z.id = r.zona_id
    WHERE r.activa AND ($1::uuid[] IS NULL OR z.sede_id = ANY($1::uuid[]))
    ORDER BY r.nombre
  `, [sedeIds])

  // Pólizas agendadas en cada ruta con estado y mora
  const polizasQ = await pool.query(`
    SELECT
      pr.ruta_id,
      p.id AS poliza_id, p.numero, p.dia_cobro,
      p.estado, p.meses_mora, p.saldo_mora, p.valor_cuota,
      CONCAT(t.nombres, ' ', t.apellidos) AS titular_nombre
    FROM poliza_ruta pr
    JOIN polizas p ON p.id = pr.poliza_id
    JOIN terceros t ON t.id = p.titular_id
    WHERE pr.activa AND p.estado NOT IN ('CANCELADA','EJECUTADA')
    ORDER BY t.nombres
  `)

  // Visitas ya realizadas este mes
  const visitasQ = await pool.query(`
    SELECT
      v.poliza_id,
      v.resultado,
      DATE(COALESCE(v.visitado_en, v.creado_en)) AS fecha
    FROM visitas_recaudo v
    JOIN ordenes_recaudo o ON o.id = v.orden_id
    WHERE EXTRACT(MONTH FROM COALESCE(v.visitado_en, v.creado_en)) = $1
      AND EXTRACT(YEAR  FROM COALESCE(v.visitado_en, v.creado_en)) = $2
  `, [mes, anio])

  const visitasPorPoliza = {}
  for (const v of visitasQ.rows) {
    visitasPorPoliza[v.poliza_id] = v
  }

  // Construir mapa dia → rutas → polizas
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const calendario = {}

  for (let dia = 1; dia <= diasEnMes; dia++) {
    calendario[dia] = []
  }

  for (const ruta of rutasQ.rows) {
    const polizasDeRuta = polizasQ.rows.filter(p => p.ruta_id === ruta.id)
    for (const dia of ruta.dias_mes) {
      if (dia < 1 || dia > diasEnMes) continue
      const polizasDelDia = polizasDeRuta.filter(p => p.dia_cobro === dia || ruta.dias_mes.includes(dia))
      if (polizasDelDia.length === 0) continue
      calendario[dia].push({
        ruta_id:    ruta.id,
        ruta_nombre: ruta.nombre,
        color:      ruta.color,
        recaudador: ruta.recaudador_nombre,
        total:      polizasDelDia.length,
        cobradas:   polizasDelDia.filter(p => visitasPorPoliza[p.poliza_id]?.resultado === 'COBRADO').length,
        polizas:    polizasDelDia.map(p => ({
          ...p,
          visita: visitasPorPoliza[p.poliza_id] || null,
        })),
      })
    }
  }

  return reply.send({ anio, mes, dias_en_mes: diasEnMes, calendario })
}

// PATCH /api/recaudo/ordenes/:id/estado
export async function cambiarEstadoOrden(req, reply) {
  const { estado } = req.body
  const estadosValidos = ['PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'CANCELADA']
  if (!estadosValidos.includes(estado)) {
    return reply.code(400).send({ error: 'Estado inválido' })
  }
  const { sedeIds } = resolverSede(req)
  if (!(await ordenRecaudoPermitida(pool, req.params.id, sedeIds))) {
    return reply.code(403).send({ error: 'No tiene acceso a esta orden de recaudo' })
  }
  await pool.query(`UPDATE ordenes_recaudo SET estado = $1 WHERE id = $2`, [estado, req.params.id])
  return reply.send({ ok: true })
}
