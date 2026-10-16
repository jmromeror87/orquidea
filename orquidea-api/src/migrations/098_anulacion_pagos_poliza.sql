-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — anulación de pagos con trazabilidad        ║
-- ║  Archivo         : 098_anulacion_pagos_poliza.sql                       ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-16                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- 1. Quién anuló y en qué momento exacto (fecha_anulacion/motivo ya existían).
-- 2. La regla "un pago por mes por póliza" ahora ignora los pagos ANULADOS:
--    antes, volver a pagar un mes cuyo pago se anuló sobrescribía el registro
--    anulado (se perdía la trazabilidad) o chocaba con la restricción única.
--    El pago anulado se conserva y el nuevo pago queda como un registro aparte.
ALTER TABLE pagos_poliza
  ADD COLUMN IF NOT EXISTS anulado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS anulado_en  TIMESTAMPTZ;

ALTER TABLE pagos_poliza DROP CONSTRAINT IF EXISTS uq_pago_poliza_mes;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_poliza_mes_vigente
  ON pagos_poliza (poliza_id, mes_correspondiente)
  WHERE NOT anulado;
