-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — mora según la cobertura pagada             ║
-- ║  Archivo         : 104_calcular_mora_por_cobertura.sql                  ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-16                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Bug real: calcular_mora_polizas() — que se ejecuta CADA VEZ que se abre la
-- lista de pólizas — contaba la mora desde la FECHA DEL ÚLTIMO PAGO (por mes
-- de calendario), no desde hasta cuándo está pagada (pago_hasta). Pisaba lo
-- que calcula el proceso nocturno y, p. ej., ponía VENCIDA a quien pagó 12
-- meses por adelantado hace un año. Tampoco actualizaba saldo_mora y usaba
-- umbrales distintos a fn_estado_poliza.
--
-- Ahora usa la MISMA regla que fn_recalcular_mora_polizas y la API
-- (services/pagosPoliza.service.js → recalcularMora): meses completos sin
-- cobertura entre pago_hasta y hoy; estado con fn_estado_poliza.
CREATE OR REPLACE FUNCTION public.calcular_mora_polizas()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  WITH m AS (
    SELECT id, GREATEST(0,
      EXTRACT(YEAR  FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int * 12 +
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, COALESCE(pago_hasta, ultimo_pago, fecha_inicio)))::int
    ) AS mora
    FROM polizas
    WHERE estado NOT IN ('CANCELADA','EJECUTADA')
  )
  UPDATE polizas p SET
    meses_mora = m.mora,
    saldo_mora = m.mora * p.valor_cuota,
    estado     = fn_estado_poliza(m.mora)
  FROM m
  WHERE p.id = m.id
    AND (p.meses_mora IS DISTINCT FROM m.mora OR p.estado IS DISTINCT FROM fn_estado_poliza(m.mora));
END;
$function$;
