-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas/Contratos — número del sistema anterior      ║
-- ║  Archivo         : 091_numero_legado.sql                                ║
-- ║  Versión         : v1.0.0                                               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Al migrar pólizas y contratos históricos del sistema anterior, Orquídea
-- les asigna su propio número consecutivo (p.numero / c.numero) — pero el
-- cliente necesita conservar el número/consecutivo con el que esos mismos
-- registros existían en el sistema viejo, para poder ubicarlos cruzando
-- contra papelería o reportes antiguos. Es un campo de texto libre (no
-- consecutivo propio, no único): distintos sistemas viejos usaron formatos
-- distintos a lo largo de los años.
ALTER TABLE polizas   ADD COLUMN IF NOT EXISTS numero_legado VARCHAR(50);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS numero_legado VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_polizas_numero_legado   ON polizas(numero_legado)   WHERE numero_legado IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_numero_legado ON contratos(numero_legado) WHERE numero_legado IS NOT NULL;
