-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Recaudo — Panel Recaudador                          ║
-- ║  Archivo         : 020_recibos_recaudo.sql                             ║
-- ║  Versión         : v1.0.0                                              ║
-- ║  Fecha           : 2026-07-03                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Recibos de pago generados por el recaudador en campo
CREATE TABLE IF NOT EXISTS recibos_recaudo (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          SERIAL,  -- número consecutivo del recibo
  visita_id       UUID NOT NULL REFERENCES visitas_recaudo(id) ON DELETE CASCADE,
  poliza_id       UUID NOT NULL REFERENCES polizas(id),
  recaudador_id   UUID REFERENCES usuarios(id),
  tipo            VARCHAR(20) NOT NULL DEFAULT 'PAGO' CHECK (tipo IN ('PAGO','PROMESA','PARCIAL')),
  valor           NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_cuota     NUMERIC(14,2) NOT NULL DEFAULT 0,  -- cuota original
  saldo_anterior  NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo_nuevo     NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_pago      DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_promesa   DATE,  -- para tipo PROMESA: fecha comprometida
  metodo_pago     VARCHAR(20) CHECK (metodo_pago IN ('EFECTIVO','TRANSFERENCIA','NEQUI','DAVIPLATA','OTRO')),
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consecutivo por año
CREATE SEQUENCE IF NOT EXISTS recibo_seq START 1;

GRANT ALL ON recibos_recaudo TO orquidea_user;
GRANT ALL ON SEQUENCE recibo_seq TO orquidea_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO orquidea_user;
