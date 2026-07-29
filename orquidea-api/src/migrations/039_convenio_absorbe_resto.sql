-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 039 — Convenios: quién absorbe el resto no cubierto  ║
-- ║  Fecha           : 2026-07-24                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Caso real: un servicio puede repartirse entre dos partes (ej. Alcaldía ║
-- ║  cubre 50% y la propia Funeraria asume el otro 50% como parte del       ║
-- ║  convenio), sin que la familia pague nada. Antes el sistema siempre     ║
-- ║  asumía que lo no cubierto por el convenio caía sobre la familia.       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

ALTER TABLE convenios
  ADD COLUMN IF NOT EXISTS absorbe_resto VARCHAR(20) NOT NULL DEFAULT 'FAMILIA'
    CHECK (absorbe_resto IN ('FAMILIA','FUNERARIA'));

ALTER TABLE convenio_autorizaciones
  ADD COLUMN IF NOT EXISTS absorbe_resto VARCHAR(20)
    CHECK (absorbe_resto IN ('FAMILIA','FUNERARIA'));  -- NULL = hereda el del convenio

ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS convenio_absorbe_resto VARCHAR(20);  -- snapshot al momento de crear el servicio

COMMIT;
