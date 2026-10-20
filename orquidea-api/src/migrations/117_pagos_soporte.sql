-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 117 — Soporte (PDF/imagen) de pagos de pólizas y     ║
-- ║                    contratos                                            ║
-- ║  Fecha           : 2026-10-20                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- El código guardaba el soporte de los pagos por transferencia (Bancolombia,
-- Crediservir, Nequi…) en soporte_url, pero la columna nunca se creó: el pago
-- se registraba y el adjunto fallaba con "error inesperado"; Cartera tampoco
-- podía listar los pagos.
ALTER TABLE pagos_poliza   ADD COLUMN IF NOT EXISTS soporte_url TEXT;
ALTER TABLE pagos_contrato ADD COLUMN IF NOT EXISTS soporte_url TEXT;
