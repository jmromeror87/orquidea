/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Dashboard                                            ║
 * ║  Archivo         : dashboard.controller.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-07-03                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede } from '../utils/sede.js'

export async function getDashboard(req, reply) {
  const { sedeIds } = resolverSede(req)
  const s = [sedeIds]

  const [
    kpisRes, recaudoMensualRes, serviciosMesRes,
    salaRes, polizasMoraRes, serviciosRecientesRes,
    oportunidadesRes, disposicionRes, recaudoDiarioRes
  ] = await Promise.all([

    // KPIs principales
    pool.query(`
      SELECT
        (SELECT COUNT(*) FROM servicios_funerarios WHERE estado NOT IN ('COMPLETADO','CANCELADO') AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS servicios_activos,
        (SELECT COUNT(*) FROM servicios_funerarios WHERE estado='EN_CURSO' AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS en_curso,
        (SELECT COUNT(*) FROM servicios_funerarios WHERE creado_en::date = CURRENT_DATE AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS hoy,
        (SELECT COUNT(*) FROM contratos WHERE DATE_TRUNC('month',creado_en)=DATE_TRUNC('month',NOW()) AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS contratos_mes,
        (SELECT COUNT(*) FROM polizas WHERE estado='VIGENTE' AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS polizas_vigentes,
        (SELECT COUNT(*) FROM polizas WHERE estado IN ('VIGENTE','SUSPENDIDA','VENCIDA') AND meses_mora > 0 AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS polizas_mora,
        (SELECT COALESCE(SUM(monto),0) FROM (
          SELECT monto FROM pagos_poliza pp JOIN polizas p ON p.id=pp.poliza_id WHERE DATE_TRUNC('month',pp.fecha_pago)=DATE_TRUNC('month',NOW()) AND pp.anulado=FALSE AND ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))
          UNION ALL
          SELECT monto FROM pagos_contrato pc JOIN contratos c ON c.id=pc.contrato_id WHERE DATE_TRUNC('month',pc.fecha_pago)=DATE_TRUNC('month',NOW()) AND pc.anulado=FALSE AND ($1::uuid[] IS NULL OR c.sede_id = ANY($1::uuid[]))
        ) t) AS recaudo_mes,
        (SELECT COALESCE(SUM(monto),0) FROM (
          SELECT monto FROM pagos_poliza pp JOIN polizas p ON p.id=pp.poliza_id WHERE DATE_TRUNC('month',pp.fecha_pago)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') AND pp.anulado=FALSE AND ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))
          UNION ALL
          SELECT monto FROM pagos_contrato pc JOIN contratos c ON c.id=pc.contrato_id WHERE DATE_TRUNC('month',pc.fecha_pago)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') AND pc.anulado=FALSE AND ($1::uuid[] IS NULL OR c.sede_id = ANY($1::uuid[]))
        ) t) AS recaudo_mes_anterior,
        (SELECT COUNT(*) FROM salas_velacion WHERE activa AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS total_salas,
        (SELECT COUNT(DISTINCT sf.sala_id) FROM servicios_funerarios sf WHERE sf.sala_id IS NOT NULL AND sf.estado NOT IN ('COMPLETADO','CANCELADO') AND ($1::uuid[] IS NULL OR sf.sede_id = ANY($1::uuid[]))) AS salas_ocupadas,
        (SELECT COUNT(*) FROM terceros) AS total_terceros,
        (SELECT COUNT(*) FROM pos_ventas WHERE NOT anulada AND creado_en::date = CURRENT_DATE AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS pos_ventas_hoy,
        (SELECT COALESCE(SUM(total),0) FROM pos_ventas WHERE NOT anulada AND creado_en::date = CURRENT_DATE AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))) AS pos_total_hoy
    `, s),

    // Recaudo últimos 6 meses (para gráfica de barras)
    pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', fecha_pago),'Mon YY') AS mes,
        EXTRACT(MONTH FROM fecha_pago)::int AS mes_num,
        EXTRACT(YEAR FROM fecha_pago)::int AS anio,
        SUM(monto) AS total
      FROM (
        SELECT pp.fecha_pago, pp.monto FROM pagos_poliza pp JOIN polizas p ON p.id=pp.poliza_id
          WHERE pp.anulado=FALSE AND pp.fecha_pago >= NOW() - INTERVAL '6 months' AND ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))
        UNION ALL
        SELECT pc.fecha_pago, pc.monto FROM pagos_contrato pc JOIN contratos c ON c.id=pc.contrato_id
          WHERE pc.anulado=FALSE AND pc.fecha_pago >= NOW() - INTERVAL '6 months' AND ($1::uuid[] IS NULL OR c.sede_id = ANY($1::uuid[]))
      ) t
      GROUP BY 1,2,3 ORDER BY 3,2
    `, s),

    // Servicios por mes últimos 6 meses
    pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month',creado_en),'Mon YY') AS mes,
        EXTRACT(MONTH FROM creado_en)::int AS mes_num,
        EXTRACT(YEAR FROM creado_en)::int AS anio,
        COUNT(*) AS total
      FROM servicios_funerarios
      WHERE creado_en >= NOW() - INTERVAL '6 months' AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))
      GROUP BY 1,2,3 ORDER BY 3,2
    `, s),

    // Ocupación de salas
    pool.query(`
      SELECT sv.nombre, sv.capacidad,
        COUNT(sf.id) AS servicios_activos,
        CASE WHEN COUNT(sf.id) > 0 THEN TRUE ELSE FALSE END AS ocupada
      FROM salas_velacion sv
      LEFT JOIN servicios_funerarios sf ON sf.sala_id = sv.id AND sf.estado NOT IN ('COMPLETADO','CANCELADO')
      WHERE sv.activa = TRUE AND ($1::uuid[] IS NULL OR sv.sede_id = ANY($1::uuid[]))
      GROUP BY sv.id, sv.nombre, sv.capacidad
      ORDER BY ocupada DESC, sv.nombre
    `, s),

    // Pólizas con mora (oportunidad de recaudo)
    pool.query(`
      SELECT COUNT(*) AS total,
        SUM(meses_mora) AS meses_acumulados
      FROM polizas WHERE estado IN ('VIGENTE','SUSPENDIDA','VENCIDA') AND meses_mora > 0
        AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))
    `, s),

    // Últimos 5 servicios
    pool.query(`
      SELECT sf.id, sf.numero,
        COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS difunto,
        sf.tipo_disposicion, sf.estado, sf.creado_en,
        sv.nombre AS sala
      FROM servicios_funerarios sf
      LEFT JOIN terceros t ON t.id = sf.difunto_id
      LEFT JOIN salas_velacion sv ON sv.id = sf.sala_id
      WHERE ($1::uuid[] IS NULL OR sf.sede_id = ANY($1::uuid[]))
      ORDER BY sf.creado_en DESC LIMIT 5
    `, s),

    // Oportunidades de recaudo: pólizas en mora agrupadas por meses
    pool.query(`
      SELECT meses_mora,COUNT(*) AS cantidad,
        SUM(p.valor_cuota * meses_mora) AS valor_estimado
      FROM polizas p
      WHERE estado IN ('VIGENTE','SUSPENDIDA','VENCIDA') AND meses_mora > 0
        AND ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))
      GROUP BY meses_mora ORDER BY meses_mora
    `, s),

    // Servicios por tipo de disposición
    pool.query(`
      SELECT tipo_disposicion, COUNT(*) AS total
      FROM servicios_funerarios
      WHERE ($1::uuid[] IS NULL OR sede_id = ANY($1::uuid[]))
      GROUP BY tipo_disposicion
    `, s),

    // Recaudo día a día del mes en curso (para desglosar cuando solo hay 1 mes de historial)
    pool.query(`
      SELECT TO_CHAR(fecha_pago, 'DD Mon') AS dia,
        EXTRACT(DAY FROM fecha_pago)::int AS dia_num,
        SUM(monto) AS total
      FROM (
        SELECT pp.fecha_pago, pp.monto FROM pagos_poliza pp JOIN polizas p ON p.id=pp.poliza_id
          WHERE pp.anulado=FALSE AND DATE_TRUNC('month', pp.fecha_pago) = DATE_TRUNC('month', NOW())
            AND ($1::uuid[] IS NULL OR p.sede_id = ANY($1::uuid[]))
        UNION ALL
        SELECT pc.fecha_pago, pc.monto FROM pagos_contrato pc JOIN contratos c ON c.id=pc.contrato_id
          WHERE pc.anulado=FALSE AND DATE_TRUNC('month', pc.fecha_pago) = DATE_TRUNC('month', NOW())
            AND ($1::uuid[] IS NULL OR c.sede_id = ANY($1::uuid[]))
      ) t
      GROUP BY 1,2 ORDER BY 2
    `, s),
  ])

  const k = kpisRes.rows[0]
  return reply.send({
    data: {
      kpis: {
        servicios_activos:    +k.servicios_activos,
        en_curso:             +k.en_curso,
        hoy:                  +k.hoy,
        contratos_mes:        +k.contratos_mes,
        polizas_vigentes:     +k.polizas_vigentes,
        polizas_mora:         +k.polizas_mora,
        recaudo_mes:          +k.recaudo_mes,
        recaudo_mes_anterior: +k.recaudo_mes_anterior,
        total_salas:          +k.total_salas,
        salas_ocupadas:       +k.salas_ocupadas,
        total_terceros:       +k.total_terceros,
        pos_ventas_hoy:       +k.pos_ventas_hoy,
        pos_total_hoy:        +k.pos_total_hoy,
      },
      recaudo_mensual:     recaudoMensualRes.rows.map(r => ({ mes: r.mes, total: +r.total })),
      recaudo_diario:      recaudoDiarioRes.rows.map(r => ({ dia: r.dia, total: +r.total })),
      servicios_mes:       serviciosMesRes.rows.map(r => ({ mes: r.mes, total: +r.total })),
      salas:               salaRes.rows,
      mora_stats:          polizasMoraRes.rows[0],
      servicios_recientes: serviciosRecientesRes.rows,
      oportunidades:       oportunidadesRes.rows,
      disposicion:         disposicionRes.rows.map(r => ({ ...r, total: +r.total })),
    }
  })
}
