-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 124 — Servicios funerarios históricos de Pisco      ║
-- ║  Fecha           : 2026-11-07                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Los servicios prestados desde 1972 se migran de Pisco como historial (sin
-- contabilidad). Muchos fueron "particulares": no tienen póliza, contrato ni
-- convenio, así que la regla de origen acepta también los marcados de Pisco.
ALTER TABLE servicios_funerarios ADD COLUMN IF NOT EXISTS migrado_pisco BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE servicios_funerarios DROP CONSTRAINT IF EXISTS ck_servicio_tiene_origen;
ALTER TABLE servicios_funerarios ADD CONSTRAINT ck_servicio_tiene_origen
  CHECK (contrato_id IS NOT NULL OR poliza_id IS NOT NULL OR convenio_id IS NOT NULL OR migrado_pisco);

-- El código automático (SRV-año-consecutivo) solo se genera si no viene uno:
-- los servicios de Pisco conservan su número (PISCO-xxxx) y no consumen los
-- consecutivos del año en curso.
CREATE OR REPLACE FUNCTION fn_codigo_servicio_auto() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_anio  INT := EXTRACT(YEAR FROM NOW());
  v_seq   INT;
BEGIN
  IF NEW.codigo IS NOT NULL AND NEW.codigo <> '' THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(MAX((regexp_match(codigo, 'SRV-\d{4}-(\d+)'))[1]::INT), 0) + 1
    INTO v_seq
    FROM servicios_funerarios
   WHERE codigo LIKE 'SRV-' || v_anio || '-%';
  NEW.codigo := 'SRV-' || v_anio || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_codigo_servicio ON servicios_funerarios;
CREATE TRIGGER trg_codigo_servicio BEFORE INSERT ON servicios_funerarios
  FOR EACH ROW EXECUTE FUNCTION fn_codigo_servicio_auto();

CREATE INDEX IF NOT EXISTS idx_servicios_difunto ON servicios_funerarios (difunto_id);
CREATE INDEX IF NOT EXISTS idx_servicios_poliza  ON servicios_funerarios (poliza_id);
CREATE INDEX IF NOT EXISTS idx_items_servicio_srv ON items_servicio (servicio_id);
CREATE INDEX IF NOT EXISTS idx_defunciones_tercero ON defunciones (tercero_id);
