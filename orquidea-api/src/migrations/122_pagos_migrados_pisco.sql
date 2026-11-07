-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 122 — Marca de pagos migrados del sistema Pisco     ║
-- ║  Fecha           : 2026-11-07                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- El historial de pagos de Pisco se carga SOLO como consulta: no genera
-- asientos (la contabilidad anterior al corte está en Visual TNS y entra a
-- Orquídea como saldos iniciales). Esta marca permite reconocerlos y evita
-- que se anulen desde la pantalla, porque no tienen comprobante que reversar.
ALTER TABLE pagos_poliza ADD COLUMN IF NOT EXISTS migrado_pisco BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_pagos_poliza_migrado ON pagos_poliza (migrado_pisco) WHERE migrado_pisco;
