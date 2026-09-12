-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Servicios — contrato_id opcional                     ║
-- ║  Archivo         : 088_servicios_contrato_id_nullable.sql               ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Bug real: servicios_funerarios.contrato_id quedó NOT NULL desde que un
-- servicio SOLO podía nacer de un contrato. Cuando se agregó la opción de
-- crear el servicio directo desde una póliza (poliza_id) o desde un
-- contratante sin contrato (contratante_id), nadie relajó esta columna —
-- cualquier alta de servicio vía póliza reventaba con "null value in
-- column contrato_id violates not-null constraint".
ALTER TABLE servicios_funerarios
  ALTER COLUMN contrato_id DROP NOT NULL;

-- Un servicio debe venir de un contrato o de una póliza — la app ya exige
-- difunto_id, pero no había ninguna garantía a nivel de base de datos de
-- que el servicio esté vinculado a algo facturable. (Un "servicio directo"
-- con contratante sin contrato previo igual termina creando un contrato
-- por debajo — ver crear() en servicios.controller.js — así que
-- contrato_id siempre queda lleno en ese caso.)
ALTER TABLE servicios_funerarios
  ADD CONSTRAINT ck_servicio_tiene_origen
    CHECK (contrato_id IS NOT NULL OR poliza_id IS NOT NULL);
