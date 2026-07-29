/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 027                                           ║
 * ║  Agrega parentesco del contratante con el fallecido al servicio         ║
 * ║  Fecha: 2026-07-14                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS parentesco VARCHAR(60);

GRANT SELECT, INSERT, UPDATE ON servicios_funerarios TO orquidea_user;
