/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 034                                           ║
 * ║  Pólizas: congelar cobertura al momento de la venta (grandfathering)     ║
 * ║  Fecha: 2026-07-24                                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Problema que resuelve: hoy la cobertura de una póliza (ataúd, horas de  ║
 * ║  velación, traslados, etc.) se lee EN VIVO desde planes_poliza vía JOIN. ║
 * ║  Si alguien edita un plan, TODAS las pólizas vendidas bajo ese plan      ║
 * ║  cambian de cobertura retroactivamente, incluso pólizas de hace años.   ║
 * ║  La solución: copiar ("congelar") la cobertura del plan hacia la        ║
 * ║  póliza en el momento en que se crea. Editar el plan después solo       ║
 * ║  afecta pólizas NUEVAS, nunca las ya vendidas.                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ── 1. Columnas de cobertura congelada en polizas ─────────────────────────

ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS max_beneficiarios       SMALLINT,
  ADD COLUMN IF NOT EXISTS cubre_ataud             VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cubre_velacion_h        SMALLINT,
  ADD COLUMN IF NOT EXISTS cubre_traslado_local    BOOLEAN,
  ADD COLUMN IF NOT EXISTS cubre_traslado_nacional BOOLEAN,
  ADD COLUMN IF NOT EXISTS cubre_flores            BOOLEAN,
  ADD COLUMN IF NOT EXISTS cubre_cremacion         BOOLEAN,
  ADD COLUMN IF NOT EXISTS cubre_tramites          BOOLEAN,
  ADD COLUMN IF NOT EXISTS cubre_lapida            BOOLEAN,
  ADD COLUMN IF NOT EXISTS valor_excedente         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coberturas_extra        JSONB;

-- ── 2. Backfill: pólizas existentes toman snapshot de su plan actual ──────
-- (es lo mejor que se puede hacer retroactivamente; de aquí en adelante ya
--  quedan protegidas contra futuras ediciones del plan)

UPDATE polizas p SET
  max_beneficiarios       = pl.max_beneficiarios,
  cubre_ataud             = pl.cubre_ataud,
  cubre_velacion_h        = pl.cubre_velacion_h,
  cubre_traslado_local    = pl.cubre_traslado_local,
  cubre_traslado_nacional = pl.cubre_traslado_nacional,
  cubre_flores            = pl.cubre_flores,
  cubre_cremacion         = pl.cubre_cremacion,
  cubre_tramites          = pl.cubre_tramites,
  cubre_lapida            = pl.cubre_lapida,
  valor_excedente         = pl.valor_excedente,
  coberturas_extra        = pl.coberturas_extra
FROM planes_poliza pl
WHERE pl.id = p.plan_id AND p.cubre_ataud IS NULL;

-- ── 3. Trigger: copiar cobertura del plan al crear una póliza nueva ───────
-- Extiende el trigger existente que ya calculaba fecha_fin_carencia.

CREATE OR REPLACE FUNCTION fn_set_fecha_fin_carencia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_plan RECORD;
BEGIN
  SELECT * INTO v_plan FROM planes_poliza WHERE id = NEW.plan_id;
  NEW.fecha_fin_carencia := NEW.fecha_inicio + (v_plan.meses_carencia || ' months')::INTERVAL;

  -- Congelar cobertura solo si no vino ya explícita (permite override manual futuro)
  IF NEW.max_beneficiarios IS NULL THEN
    NEW.max_beneficiarios       := v_plan.max_beneficiarios;
    NEW.cubre_ataud             := v_plan.cubre_ataud;
    NEW.cubre_velacion_h        := v_plan.cubre_velacion_h;
    NEW.cubre_traslado_local    := v_plan.cubre_traslado_local;
    NEW.cubre_traslado_nacional := v_plan.cubre_traslado_nacional;
    NEW.cubre_flores            := v_plan.cubre_flores;
    NEW.cubre_cremacion         := v_plan.cubre_cremacion;
    NEW.cubre_tramites          := v_plan.cubre_tramites;
    NEW.cubre_lapida            := v_plan.cubre_lapida;
    NEW.valor_excedente         := v_plan.valor_excedente;
    NEW.coberturas_extra        := v_plan.coberturas_extra;
  END IF;

  RETURN NEW;
END;
$$;

-- El trigger ya existe (trg_set_fecha_fin_carencia), solo se reemplazó la función.
