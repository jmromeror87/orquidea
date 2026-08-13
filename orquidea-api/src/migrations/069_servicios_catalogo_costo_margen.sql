-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Catálogo de servicios — costo interno + margen para  ║
-- ║                    calcular el precio de venta automáticamente          ║
-- ║  Archivo         : 069_servicios_catalogo_costo_margen.sql              ║
-- ║  Fecha           : 2026-08-13                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE servicios_catalogo
  ADD COLUMN IF NOT EXISTS costo        NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_tipo  VARCHAR(10)   NOT NULL DEFAULT 'PORCENTAJE'
    CHECK (margen_tipo IN ('PORCENTAJE','FIJO')),
  ADD COLUMN IF NOT EXISTS margen_valor NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Los ítems que ya existían: se asume que el precio_base actual YA es el precio
-- de venta, así que el costo arranca igual (margen 0) para no alterar precios
-- ya cargados. El usuario ajusta el margen desde la UI cuando quiera.
UPDATE servicios_catalogo SET costo = precio_base WHERE costo = 0;
