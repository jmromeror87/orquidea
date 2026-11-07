-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 123 — Índices para pagos y pólizas (volumen real)   ║
-- ║  Fecha           : 2026-11-07                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Con la migración desde Pisco (155 mil pagos, 2.300 pólizas, 13 mil
-- beneficiarios) las consultas por póliza recorrían toda la tabla: el único
-- índice por póliza en pagos_poliza era parcial (solo cuotas vigentes no
-- parciales) y no servía para "todos los pagos de esta póliza".
CREATE INDEX IF NOT EXISTS idx_pagos_poliza_poliza       ON pagos_poliza (poliza_id, mes_correspondiente);
CREATE INDEX IF NOT EXISTS idx_polizas_titular           ON polizas (titular_id);
CREATE INDEX IF NOT EXISTS idx_polizas_plan              ON polizas (plan_id);
CREATE INDEX IF NOT EXISTS idx_polizas_estado            ON polizas (estado);
CREATE INDEX IF NOT EXISTS idx_poliza_beneficiarios_terc ON poliza_beneficiarios (tercero_id);
ANALYZE pagos_poliza;
ANALYZE polizas;
ANALYZE poliza_beneficiarios;
