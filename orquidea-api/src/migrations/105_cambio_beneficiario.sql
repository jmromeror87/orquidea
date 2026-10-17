-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — cobro por cambio de beneficiario           ║
-- ║  Archivo         : 105_cambio_beneficiario.sql                          ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-17                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Regla de la funeraria: la AFILIACIÓN se cobra una sola vez, al titular. Los
-- beneficiarios dentro del cupo del plan no pagan nada. Solo cuando ya se
-- usaron todos los cupos y se saca a uno para meter a otro (cambio, no por
-- fallecimiento) puede cobrarse un valor, que define la gerencia por plan
-- (0 = no se cobra).
ALTER TABLE planes_poliza
  ADD COLUMN IF NOT EXISTS valor_cambio_beneficiario NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Marca qué entradas fueron un cambio (reemplazo de alguien vivo retirado).
-- Cupos libres = máximo − activos − (retirados vivos − cambios ya hechos):
-- un fallecido libera su puesto sin costo; un retiro vivo deja un puesto que
-- se ocupa como "cambio".
ALTER TABLE poliza_beneficiarios
  ADD COLUMN IF NOT EXISTS es_cambio BOOLEAN NOT NULL DEFAULT FALSE;
