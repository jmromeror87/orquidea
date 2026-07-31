-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Planes de Póliza — código público (slug para landing) ║
-- ║  Archivo         : 057_planes_poliza_codigo.sql                         ║
-- ║  Fecha           : 2026-07-31                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Consolida el catálogo de planes: de aquí en adelante "Pólizas > Planes  ║
-- ║  de Póliza" (planes_poliza) es la ÚNICA fuente de verdad de planes,      ║
-- ║  incluida la landing pública. "Configuración > Planes" (planes_catalogo) ║
-- ║  queda deprecado — la tabla se conserva sin usar, no se borra.          ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE planes_poliza
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(60);

-- Backfill: generar slug único a partir del nombre para los planes existentes
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  candidato TEXT;
  sufijo INT;
BEGIN
  FOR r IN SELECT id, nombre FROM planes_poliza WHERE codigo IS NULL ORDER BY creado_en LOOP
    base_slug := lower(regexp_replace(unaccent(r.nombre), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    candidato := base_slug;
    sufijo := 1;
    WHILE EXISTS (SELECT 1 FROM planes_poliza WHERE codigo = candidato) LOOP
      sufijo := sufijo + 1;
      candidato := base_slug || '-' || sufijo;
    END LOOP;
    UPDATE planes_poliza SET codigo = candidato WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE planes_poliza
  ALTER COLUMN codigo SET NOT NULL,
  ADD CONSTRAINT uq_planes_poliza_codigo UNIQUE (codigo);
