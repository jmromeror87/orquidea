-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Planes de Póliza — servicios del catálogo asignados  ║
-- ║  Archivo         : 058_plan_servicios.sql                                ║
-- ║  Fecha           : 2026-07-31                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Permite asignar a cada plan una lista dinámica de servicios reales del  ║
-- ║  catálogo (Configuración > Servicios), en vez de solo los cubre_* fijos. ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS plan_servicios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES planes_poliza(id) ON DELETE CASCADE,
  servicio_id UUID NOT NULL REFERENCES servicios_catalogo(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plan_servicio UNIQUE (plan_id, servicio_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_servicios_plan ON plan_servicios(plan_id);
