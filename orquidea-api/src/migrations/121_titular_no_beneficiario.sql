-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 121 — El titular no figura también como beneficiario ║
-- ║  Fecha           : 2026-10-20                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Al ceder una póliza a quien ya era beneficiario, la persona quedaba dos
-- veces (titular y beneficiario): aparecía repetida al abrir un servicio y
-- ocupaba un cupo. Sin pagos asociados se borra la inscripción duplicada; con
-- pagos se retira sin gastar cupo (es_cambio compensa el retiro).
UPDATE poliza_beneficiarios pb SET activo = FALSE, es_cambio = TRUE
FROM polizas p
WHERE p.id = pb.poliza_id AND pb.tercero_id = p.titular_id AND NOT pb.ejecutado
  AND EXISTS (SELECT 1 FROM pagos_poliza pp WHERE pp.beneficiario_id = pb.id);

DELETE FROM poliza_beneficiarios pb
USING polizas p
WHERE p.id = pb.poliza_id AND pb.tercero_id = p.titular_id AND NOT pb.ejecutado
  AND NOT EXISTS (SELECT 1 FROM pagos_poliza pp WHERE pp.beneficiario_id = pb.id);
