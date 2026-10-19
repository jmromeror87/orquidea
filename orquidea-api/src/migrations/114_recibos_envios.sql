-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 114 — Envíos de recibos y pagos de cada visita       ║
-- ║  Fecha           : 2026-10-19                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Cada vez que un recibo de pago de póliza se manda al cliente queda anotado:
-- a qué número, por qué medio y quién. SISTEMA = el WhatsApp del sistema lo
-- entregó; WHATSAPP_WEB / COMPARTIR = se abrió en el equipo (sin confirmación).

CREATE TABLE IF NOT EXISTS recibos_envios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id   UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  pago_id     UUID REFERENCES pagos_poliza(id) ON DELETE CASCADE,
  lote_id     UUID,
  telefono    VARCHAR(20) NOT NULL,
  canal       VARCHAR(20) NOT NULL CHECK (canal IN ('SISTEMA','WHATSAPP_WEB','COMPARTIR')),
  usuario_id  UUID REFERENCES usuarios(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recibos_envios_poliza ON recibos_envios(poliza_id, creado_en DESC);

-- Pagos cobrados en una visita de recaudo → se muestran como "recibos de la visita"
ALTER TABLE pagos_poliza ADD COLUMN IF NOT EXISTS visita_id UUID REFERENCES visitas_recaudo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pagos_poliza_visita ON pagos_poliza(visita_id) WHERE visita_id IS NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orquidea_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON recibos_envios TO orquidea_user;
  END IF;
END $$;
