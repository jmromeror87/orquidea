-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — congelar servicios reales del plan         ║
-- ║  Archivo         : 061_poliza_servicios_incluidos.sql                   ║
-- ║  Fecha           : 2026-08-02                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Los servicios asignados a un plan (plan_servicios) ahora son la fuente  ║
-- ║  real de cobertura, reemplazando los booleanos fijos (cubre_ataud,      ║
-- ║  cubre_flores, etc.). Igual que esos booleanos, se congelan en la       ║
-- ║  póliza al momento de la venta (ver migración 034) para que editar el   ║
-- ║  plan después no cambie retroactivamente lo que una póliza ya vendida   ║
-- ║  cubre.                                                                 ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS servicios_incluidos JSONB NOT NULL DEFAULT '[]';

-- Backfill: pólizas existentes toman snapshot de los servicios que su plan
-- tenga asignados hoy en plan_servicios (mejor esfuerzo retroactivo).
UPDATE polizas p SET servicios_incluidos = COALESCE((
  SELECT jsonb_agg(jsonb_build_object(
    'id', sc.id, 'nombre', sc.nombre, 'categoria', sc.categoria, 'precio_base', sc.precio_base
  ) ORDER BY sc.nombre)
  FROM plan_servicios ps JOIN servicios_catalogo sc ON sc.id = ps.servicio_id
  WHERE ps.plan_id = p.plan_id
), '[]'::jsonb)
WHERE p.servicios_incluidos = '[]'::jsonb;
