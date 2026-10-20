-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 120 — Trámites legales calculados                    ║
-- ║  Fecha           : 2026-10-20                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Antes los trámites eran una lista manual (vacía en la práctica: con 0 ítems
-- el servicio figuraba "con todos los trámites completos") y los números se
-- escribían dos veces. Ahora un trámite está completo con su número (en la
-- defunción) y su soporte en Documentos. Se recalcula lo existente con esa regla.
UPDATE servicios_funerarios sf SET
  certificado_medico = d.cert_defuncion_num,
  registro_civil     = d.serial_registro,
  permiso_inhumacion = d.licencia_inhumacion,
  tramites_completos =
        d.cert_defuncion_num  IS NOT NULL AND EXISTS (SELECT 1 FROM documentos_servicio x WHERE x.servicio_id = sf.id AND x.tipo_codigo = 'CERTIFICADO_DEFUNCION')
    AND d.serial_registro     IS NOT NULL AND EXISTS (SELECT 1 FROM documentos_servicio x WHERE x.servicio_id = sf.id AND x.tipo_codigo = 'REGISTRO_CIVIL_DEFUNCION')
    AND d.licencia_inhumacion IS NOT NULL AND EXISTS (SELECT 1 FROM documentos_servicio x WHERE x.servicio_id = sf.id AND x.tipo_codigo = 'PERMISO_INHUMACION')
FROM defunciones d
WHERE d.tercero_id = sf.difunto_id;

-- Sin datos de defunción: los trámites no pueden estar completos
UPDATE servicios_funerarios sf SET tramites_completos = FALSE
WHERE NOT EXISTS (SELECT 1 FROM defunciones d WHERE d.tercero_id = sf.difunto_id);
