-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — regla de edad para beneficiarios           ║
-- ║  Archivo         : 090_poliza_beneficiario_cobertura_basica.sql         ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Regla de negocio confirmada con el cliente: padres o suegros del titular
-- se pueden incluir como beneficiarios SIN límite de edad (incluso más de
-- 75 años), pero en ese caso solo quedan cubiertos por el servicio
-- funerario básico, sin importar el plan contratado. Cualquier otro
-- parentesco NO se acepta si el beneficiario tiene más de 75 años. Esta
-- excepción exige que el titular firme un consentimiento — se deja
-- trazabilidad de si ya se firmó y el soporte adjunto.
ALTER TABLE poliza_beneficiarios
  ADD COLUMN IF NOT EXISTS cobertura_basica       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consentimiento_firmado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consentimiento_url     TEXT,
  ADD COLUMN IF NOT EXISTS consentimiento_fecha   DATE;
