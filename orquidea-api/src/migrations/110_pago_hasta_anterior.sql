-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — anular un pago restaura la cobertura       ║
-- ║  Archivo         : 110_pago_hasta_anterior.sql                          ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-17                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Bug real (póliza 0719): al anular su ÚNICO pago, la póliza quedó "cubierta
-- hasta el día anterior al periodo anulado", como si todo lo anterior
-- estuviera pagado. Cada pago guarda ahora hasta cuándo estaba cubierta la
-- póliza ANTES de él, y anular lo restaura exactamente.
ALTER TABLE pagos_poliza ADD COLUMN IF NOT EXISTS pago_hasta_anterior DATE;
COMMENT ON COLUMN pagos_poliza.pago_hasta_anterior IS 'pago_hasta de la póliza antes de registrar este pago (NULL en pagos viejos o si no tenía cobertura)';
ALTER TABLE pagos_poliza ADD COLUMN IF NOT EXISTS sin_cobertura_previa BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN pagos_poliza.sin_cobertura_previa IS 'TRUE si al registrar el pago la póliza no tenía ninguna cobertura (pago_hasta NULL)';
