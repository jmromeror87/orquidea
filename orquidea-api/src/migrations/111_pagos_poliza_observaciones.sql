-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — observaciones del pago (salen en recibo)   ║
-- ║  Archivo         : 111_pagos_poliza_observaciones.sql                   ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-17                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Lo que escribe quien recibe el pago (se imprime en el recibo). Separado de
-- `notas`, que guarda las anotaciones automáticas del sistema.
ALTER TABLE pagos_poliza ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Un pago que cubre varios periodos genera una fila por periodo; lote_id las
-- agrupa para imprimir UN recibo con el detalle y el total recibido.
ALTER TABLE pagos_poliza ADD COLUMN IF NOT EXISTS lote_id UUID;
CREATE INDEX IF NOT EXISTS idx_pagos_poliza_lote ON pagos_poliza(lote_id);
