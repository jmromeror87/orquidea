-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 035 — Intereses de mora para Contratos               ║
-- ║  Fecha           : 2026-07-24                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Hasta hoy solo las pólizas tenían motor de mora con intereses diarios,  ║
-- ║  promesas de pago y auto-cancelación (migración 022). Los contratos a   ║
-- ║  cuotas (modalidad='CUOTAS') no acumulaban interés ni se auto-cancelaban ║
-- ║  por incumplimiento reiterado. Esta migración replica ese motor para    ║
-- ║  contratos, reutilizando la misma configuración de parametros_mora.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columnas de mora en contratos (mismas que pólizas)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS meses_mora        SMALLINT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interes_mora      NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_promesa     DATE,
  ADD COLUMN IF NOT EXISTS promesa_incumplida BOOLEAN     NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. mora_intereses pasa a ser polimórfica (póliza O contrato, nunca ambas)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE mora_intereses
  ALTER COLUMN poliza_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE;

ALTER TABLE mora_intereses
  DROP CONSTRAINT IF EXISTS chk_mora_intereses_origen;
ALTER TABLE mora_intereses
  ADD CONSTRAINT chk_mora_intereses_origen CHECK (
    (poliza_id IS NOT NULL AND contrato_id IS NULL) OR
    (poliza_id IS NULL AND contrato_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_mora_intereses_contrato ON mora_intereses(contrato_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Función: fn_recalcular_mora_contratos
--    Solo aplica a contratos con modalidad='CUOTAS' y estado activo.
--    Los contratos de CONTADO no tienen cronograma de cuotas, no acumulan mora.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_recalcular_mora_contratos()
RETURNS TABLE(
  procesados      INT,
  con_interes     INT,
  auto_cancelados INT
)
LANGUAGE plpgsql AS $$
DECLARE
  param           parametros_mora%ROWTYPE;
  ctr             RECORD;
  v_meses_mora    INT;
  v_saldo_cuotas  NUMERIC(14,2);
  v_dias_vencidos INT;
  v_monto_interes NUMERIC(14,2);
  v_total_procesados   INT := 0;
  v_total_interes      INT := 0;
  v_total_cancelados   INT := 0;
BEGIN
  SELECT * INTO param FROM parametros_mora WHERE activo = TRUE LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;

  FOR ctr IN
    SELECT
      c.id, c.numero, c.valor_cuota, c.pago_hasta, c.fecha_inicio,
      c.saldo_mora, c.interes_mora, c.estado,
      c.fecha_promesa, c.promesa_incumplida, c.saldo_pendiente
    FROM contratos c
    WHERE c.modalidad = 'CUOTAS'
      AND c.estado NOT IN ('completado', 'cancelado')
  LOOP
    v_total_procesados := v_total_procesados + 1;

    -- ── a) Meses de mora desde pago_hasta (o fecha_inicio si nunca ha pagado) ──
    v_meses_mora := GREATEST(0,
      EXTRACT(YEAR  FROM AGE(CURRENT_DATE, COALESCE(ctr.pago_hasta, ctr.fecha_inicio)))::INT * 12 +
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, COALESCE(ctr.pago_hasta, ctr.fecha_inicio)))::INT
    );

    -- Nunca en mora por más de lo que efectivamente se debe (saldo_pendiente real)
    v_saldo_cuotas := LEAST(v_meses_mora * ctr.valor_cuota, GREATEST(ctr.saldo_pendiente, 0));

    -- ── b) Intereses sobre promesas vencidas (misma tasa que pólizas) ────────
    v_monto_interes := 0;

    IF param.cobrar_intereses
       AND ctr.fecha_promesa IS NOT NULL
       AND ctr.fecha_promesa < CURRENT_DATE - param.dias_gracia_promesa
    THEN
      v_dias_vencidos := (CURRENT_DATE - ctr.fecha_promesa) - param.dias_gracia_promesa;

      IF NOT EXISTS (
        SELECT 1 FROM mora_intereses
        WHERE contrato_id = ctr.id AND fecha = CURRENT_DATE
      ) AND v_dias_vencidos > 0 THEN

        v_monto_interes := ROUND(v_saldo_cuotas * param.tasa_interes_diario, 0);

        IF v_monto_interes > 0 THEN
          INSERT INTO mora_intereses(
            contrato_id, fecha, dias_mora, saldo_base,
            tasa_aplicada, monto_interes, tipo, descripcion
          ) VALUES (
            ctr.id, CURRENT_DATE, v_dias_vencidos, v_saldo_cuotas,
            param.tasa_interes_diario, v_monto_interes,
            'PROMESA_VENCIDA',
            'Promesa del ' || ctr.fecha_promesa || ' vencida hace ' || v_dias_vencidos || ' días'
          );
          v_total_interes := v_total_interes + 1;
        END IF;

        UPDATE contratos SET promesa_incumplida = TRUE WHERE id = ctr.id;
      END IF;
    END IF;

    SELECT COALESCE(SUM(monto_interes), 0) INTO v_monto_interes
    FROM mora_intereses WHERE contrato_id = ctr.id;

    -- ── c) Auto-cancelación por promesa muy vencida ──────────────────────────
    IF param.auto_cancelar
       AND ctr.fecha_promesa IS NOT NULL
       AND ctr.fecha_promesa < CURRENT_DATE - param.dias_auto_cancelacion
       AND ctr.estado NOT IN ('completado','cancelado')
    THEN
      UPDATE contratos SET
        estado             = 'cancelado',
        meses_mora         = v_meses_mora,
        saldo_mora         = v_saldo_cuotas + v_monto_interes,
        interes_mora       = v_monto_interes,
        promesa_incumplida = TRUE,
        actualizado        = NOW()
      WHERE id = ctr.id;
      v_total_cancelados := v_total_cancelados + 1;
    ELSE
      UPDATE contratos SET
        meses_mora   = v_meses_mora,
        saldo_mora   = v_saldo_cuotas + v_monto_interes,
        interes_mora = v_monto_interes,
        actualizado  = NOW()
      WHERE id = ctr.id;
    END IF;

  END LOOP;

  RETURN QUERY SELECT v_total_procesados, v_total_interes, v_total_cancelados;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Registrar promesa de pago sobre un contrato
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_registrar_promesa_contrato(
  p_contrato_id UUID,
  p_fecha       DATE
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE contratos SET
    fecha_promesa      = p_fecha,
    promesa_incumplida = FALSE,
    actualizado        = NOW()
  WHERE id = p_contrato_id;
END;
$$;

COMMIT;
