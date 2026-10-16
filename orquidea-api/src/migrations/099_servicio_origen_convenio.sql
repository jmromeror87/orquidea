-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Servicios — el convenio también es origen válido     ║
-- ║  Archivo         : 099_servicio_origen_convenio.sql                     ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-16                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Bug real (producción, 2026-10-15): crear un servicio por CONVENIO fallaba
-- con "violates check constraint ck_servicio_tiene_origen". Un servicio por
-- convenio no tiene contrato ni póliza — lo respalda el convenio (convenio_id)
-- — pero la regla de 088 solo aceptaba contrato o póliza.
ALTER TABLE servicios_funerarios DROP CONSTRAINT IF EXISTS ck_servicio_tiene_origen;
ALTER TABLE servicios_funerarios
  ADD CONSTRAINT ck_servicio_tiene_origen
    CHECK (contrato_id IS NOT NULL OR poliza_id IS NOT NULL OR convenio_id IS NOT NULL);
