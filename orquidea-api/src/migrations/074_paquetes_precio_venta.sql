-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Paquetes de servicio — precio de venta fijo          ║
-- ║                    (separado del precio_base, que es la suma de costos  ║
-- ║                    de los ítems). Si precio_venta es NULL, se sigue     ║
-- ║                    usando precio_base — sin romper los paquetes         ║
-- ║                    existentes que venden al costo (ej. convenios).      ║
-- ║  Archivo         : 074_paquetes_precio_venta.sql                        ║
-- ║  Fecha           : 2026-08-14                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE paquetes_servicio
  ADD COLUMN IF NOT EXISTS precio_venta NUMERIC(12,2);
