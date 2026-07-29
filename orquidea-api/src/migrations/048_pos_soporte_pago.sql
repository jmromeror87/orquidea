-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 048_pos_soporte_pago.sql                             ║
-- ║  Propósito       : Soporte adjunto (foto/PDF del comprobante) por cada  ║
-- ║                    línea de pago no-efectivo en el POS.                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE pos_venta_pagos ADD COLUMN IF NOT EXISTS soporte_url TEXT;
