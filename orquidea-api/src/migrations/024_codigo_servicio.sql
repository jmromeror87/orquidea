-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Orquídea ERP · Migración 024 — Código alfanumérico de servicio        ║
-- ║  Fecha: 2026-07-14                                                      ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;

-- 1. Columna codigo (único por año)
ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS uq_servicio_codigo ON servicios_funerarios(codigo) WHERE codigo IS NOT NULL;

-- 2. Función que genera el código SRV-YYYY-NNNN
CREATE OR REPLACE FUNCTION fn_generar_codigo_servicio()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_anio  INT := EXTRACT(YEAR FROM NOW());
  v_seq   INT;
BEGIN
  SELECT COALESCE(MAX(
    (regexp_match(codigo, 'SRV-\d{4}-(\d+)'))[1]::INT
  ), 0) + 1
  INTO v_seq
  FROM servicios_funerarios
  WHERE codigo LIKE 'SRV-' || v_anio || '-%';

  NEW.codigo := 'SRV-' || v_anio || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- 3. Trigger: se dispara al INSERT antes de escribir la fila
DROP TRIGGER IF EXISTS trg_codigo_servicio ON servicios_funerarios;
CREATE TRIGGER trg_codigo_servicio
  BEFORE INSERT ON servicios_funerarios
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL)
  EXECUTE FUNCTION fn_generar_codigo_servicio();

-- 4. Backfill: asignar código a servicios existentes (por orden de creación)
DO $$
DECLARE
  r   RECORD;
  seq INT := 1;
  yr  INT;
  cur_yr INT := 0;
BEGIN
  FOR r IN
    SELECT id, creado_en FROM servicios_funerarios
    WHERE codigo IS NULL
    ORDER BY creado_en
  LOOP
    yr := EXTRACT(YEAR FROM r.creado_en);
    IF yr <> cur_yr THEN seq := 1; cur_yr := yr; END IF;
    UPDATE servicios_funerarios
      SET codigo = 'SRV-' || yr || '-' || LPAD(seq::TEXT, 4, '0')
    WHERE id = r.id;
    seq := seq + 1;
  END LOOP;
END;
$$;

-- 5. Permisos
GRANT SELECT ON servicios_funerarios TO orquidea_user;

COMMIT;
