-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 036 — Transferencia de titular de póliza             ║
-- ║  Fecha           : 2026-07-24                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Caso de uso: el titular de una póliza fallece pero no fue quien se     ║
-- ║  atendió (o simplemente la familia decide que otra persona asuma el     ║
-- ║  pago). Hoy no existía forma de cambiar el titular sin perder el        ║
-- ║  historial de pagos/antigüedad de la póliza (sería tener que cancelar  ║
-- ║  y crear una nueva, perdiendo la carencia ya cumplida).                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS poliza_transferencias (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id           UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  titular_anterior_id UUID NOT NULL REFERENCES terceros(id),
  titular_nuevo_id    UUID NOT NULL REFERENCES terceros(id),
  motivo              TEXT,
  usuario_id          UUID NOT NULL REFERENCES usuarios(id),
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poliza_transferencias_poliza ON poliza_transferencias(poliza_id);

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE poliza_transferencias TO orquidea_user;
