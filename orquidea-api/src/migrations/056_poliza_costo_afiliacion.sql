-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — costo de afiliación (primera vez)          ║
-- ║  Archivo         : 056_poliza_costo_afiliacion.sql                      ║
-- ║  Fecha           : 2026-07-31                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS costo_afiliacion         NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS afiliacion_pagada         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS afiliacion_fecha_pago      DATE,
  ADD COLUMN IF NOT EXISTS afiliacion_metodo_pago     VARCHAR(40),
  ADD COLUMN IF NOT EXISTS afiliacion_usuario_id      UUID REFERENCES usuarios(id);
