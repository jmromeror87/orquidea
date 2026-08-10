-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Notificaciones — log de SMS / WhatsApp enviados      ║
-- ║  Archivo         : 062_notificaciones_log.sql                           ║
-- ║  Fecha           : 2026-08-10                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS notificaciones_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canal           VARCHAR(20)  NOT NULL CHECK (canal IN ('SMS','WHATSAPP')),
  destinatario    VARCHAR(30)  NOT NULL,
  mensaje         TEXT         NOT NULL,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'ENVIADO' CHECK (estado IN ('ENVIADO','ERROR')),
  proveedor       VARCHAR(40),
  referencia      VARCHAR(80),
  error           TEXT,
  usuario_id      UUID REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_log_canal ON notificaciones_log(canal, creado_en DESC);
