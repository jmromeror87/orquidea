-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pagos en línea (Wompi) — pólizas y contratos         ║
-- ║  Archivo         : 055_pagos_online.sql                                 ║
-- ║  Fecha           : 2026-07-30                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Usuario de sistema para atribuir los pagos hechos desde la landing ─────
-- Oculto del listado de usuarios (columna 'oculto' ya existe, migración 054).
INSERT INTO usuarios (nombre, email, password, rol, activo, oculto)
VALUES (
  'Pagos en línea (Wompi)',
  'pagos.online@sistema.local',
  '$2b$10$disabled.account.no.login.possible.for.system.user.x',  -- hash inutilizable, nadie inicia sesión con esta cuenta
  'operador',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ── Tabla de transacciones de pago en línea ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos_online (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                  VARCHAR(10) NOT NULL CHECK (tipo IN ('poliza','contrato')),
  entidad_id            UUID NOT NULL,      -- poliza_id o contrato_id según 'tipo'
  referencia            VARCHAR(80) NOT NULL UNIQUE,
  monto                 NUMERIC(14,2) NOT NULL,
  estado                VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','aprobado','rechazado','expirado')),
  wompi_transaccion_id  VARCHAR(80),
  wompi_metodo          VARCHAR(40),
  numero_documento      VARCHAR(20),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  procesado_en          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pagos_online_referencia ON pagos_online(referencia);
CREATE INDEX IF NOT EXISTS idx_pagos_online_entidad    ON pagos_online(tipo, entidad_id);
