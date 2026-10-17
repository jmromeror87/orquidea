-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — abonos parciales con días de cobertura     ║
-- ║  Archivo         : 103_polizas_abonos_por_dias.sql                      ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-16                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Un abono que no completa la cuota da DÍAS de cobertura proporcionales
-- (cuota ÷ días del periodo) y el siguiente pago completa primero lo que falta
-- de ese periodo. Antes el abono "ocupaba" el periodo: el siguiente pago lo
-- saltaba y ese periodo quedaba incompleto para siempre.
--
-- pagos_poliza.parcial = la fila no es una cuota completa por sí sola (abono o
-- complemento de un abono). Un periodo puede tener varias filas parciales; la
-- regla "una cuota por periodo" aplica solo a las cuotas completas.
ALTER TABLE pagos_poliza ADD COLUMN IF NOT EXISTS parcial BOOLEAN NOT NULL DEFAULT FALSE;

-- Solo los abonos parciales registrados como tales. Una cuota vieja con un
-- valor menor al actual (la cuota subió con los años) sigue siendo completa.
UPDATE pagos_poliza SET parcial = TRUE
 WHERE tipo = 'CUOTA' AND NOT parcial AND notas ILIKE 'Abono parcial%';

DROP INDEX IF EXISTS uq_pago_poliza_periodo_vigente;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_poliza_periodo_vigente
  ON pagos_poliza (poliza_id, mes_correspondiente)
  WHERE tipo = 'CUOTA' AND NOT anulado AND NOT parcial;
