-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 022 — Intereses de mora dinámicos                  ║
-- ║  Fecha           : 2026-07-07                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Parámetros de mora — configurables por el administrador
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parametros_mora (
  id                          SERIAL PRIMARY KEY,
  nombre                      VARCHAR(120) NOT NULL DEFAULT 'Configuración principal',
  -- Tasa de interés diaria sobre el saldo en mora (ej: 0.0033 = 0.33% diario ≈ 10% mensual)
  tasa_interes_diario         NUMERIC(7,6) NOT NULL DEFAULT 0.003300,
  -- Días de gracia después del vencimiento/promesa antes de cobrar interés
  dias_gracia_promesa         SMALLINT     NOT NULL DEFAULT 1,
  -- Días desde la fecha_promesa vencida para auto-cancelar la póliza
  dias_auto_cancelacion       SMALLINT     NOT NULL DEFAULT 30,
  -- Activar/desactivar auto-cancelación
  auto_cancelar               BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Activar/desactivar cobro de intereses
  cobrar_intereses            BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Solo una fila activa
  activo                      BOOLEAN      NOT NULL DEFAULT TRUE,
  actualizado                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_por             UUID         REFERENCES usuarios(id)
);

-- Solo puede haber una configuración activa
CREATE UNIQUE INDEX IF NOT EXISTS idx_parametros_mora_activo ON parametros_mora(activo) WHERE activo = TRUE;

-- Insertar configuración por defecto
INSERT INTO parametros_mora (
  nombre, tasa_interes_diario, dias_gracia_promesa,
  dias_auto_cancelacion, auto_cancelar, cobrar_intereses
) VALUES (
  'Configuración principal',
  0.003300,   -- 0.33% diario ≈ 10% mensual (tasa moratoria estándar Colombia)
  1,          -- 1 día de gracia
  30,         -- 30 días para auto-cancelar
  TRUE,
  TRUE
) ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Columna intereses acumulados en pólizas
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS interes_mora      NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_promesa     DATE,          -- última promesa vigente
  ADD COLUMN IF NOT EXISTS promesa_incumplida BOOLEAN       NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Log de intereses aplicados
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mora_intereses (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id     UUID         NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  fecha         DATE         NOT NULL DEFAULT CURRENT_DATE,
  dias_mora     INT          NOT NULL,
  saldo_base    NUMERIC(14,2) NOT NULL,  -- saldo sobre el que se aplicó
  tasa_aplicada NUMERIC(7,6) NOT NULL,
  monto_interes NUMERIC(14,2) NOT NULL,
  tipo          VARCHAR(20)  NOT NULL DEFAULT 'DIARIO'
                             CHECK(tipo IN ('DIARIO','PROMESA_VENCIDA','MANUAL')),
  descripcion   TEXT,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mora_intereses_poliza ON mora_intereses(poliza_id);
CREATE INDEX IF NOT EXISTS idx_mora_intereses_fecha  ON mora_intereses(fecha);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Función actualizada: fn_recalcular_mora_polizas
--    Corre cada noche a las 2am y:
--    a) Actualiza meses_mora y saldo_mora (cuotas vencidas)
--    b) Aplica intereses a promesas vencidas
--    c) Auto-cancela pólizas con promesas muy vencidas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_recalcular_mora_polizas()
RETURNS TABLE(
  procesadas      INT,
  con_interes     INT,
  auto_canceladas INT
)
LANGUAGE plpgsql AS $$
DECLARE
  param           parametros_mora%ROWTYPE;
  pol             RECORD;
  v_meses_mora    INT;
  v_saldo_cuotas  NUMERIC(14,2);
  v_dias_vencidos INT;
  v_monto_interes NUMERIC(14,2);
  v_total_procesadas   INT := 0;
  v_total_interes      INT := 0;
  v_total_canceladas   INT := 0;
BEGIN
  -- Cargar parámetros activos
  SELECT * INTO param FROM parametros_mora WHERE activo = TRUE LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;

  FOR pol IN
    SELECT
      p.id, p.numero, p.valor_cuota, p.pago_hasta, p.ultimo_pago,
      p.meses_mora, p.saldo_mora, p.interes_mora,
      p.estado, p.fecha_promesa, p.promesa_incumplida
    FROM polizas p
    WHERE p.estado NOT IN ('CANCELADA', 'EJECUTADA')
  LOOP
    v_total_procesadas := v_total_procesadas + 1;

    -- ── a) Recalcular meses mora (cuotas vencidas) ──────────────────────
    IF pol.pago_hasta IS NULL THEN
      v_meses_mora := GREATEST(0,
        EXTRACT(YEAR  FROM AGE(CURRENT_DATE, pol.ultimo_pago))::INT * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, pol.ultimo_pago))::INT
      );
    ELSE
      v_meses_mora := GREATEST(0,
        EXTRACT(YEAR  FROM AGE(CURRENT_DATE, pol.pago_hasta))::INT * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, pol.pago_hasta))::INT
      );
    END IF;

    v_saldo_cuotas := v_meses_mora * pol.valor_cuota;

    -- ── b) Intereses sobre promesas vencidas ─────────────────────────────
    v_monto_interes := 0;

    IF param.cobrar_intereses
       AND pol.fecha_promesa IS NOT NULL
       AND pol.fecha_promesa < CURRENT_DATE - param.dias_gracia_promesa
    THEN
      v_dias_vencidos := (CURRENT_DATE - pol.fecha_promesa) - param.dias_gracia_promesa;

      -- Solo aplicar si no se aplicó hoy ya
      IF NOT EXISTS (
        SELECT 1 FROM mora_intereses
        WHERE poliza_id = pol.id AND fecha = CURRENT_DATE
      ) AND v_dias_vencidos > 0 THEN

        -- Interés = saldo_mora_cuotas × tasa_diaria (interés simple)
        v_monto_interes := ROUND(v_saldo_cuotas * param.tasa_interes_diario, 0);

        IF v_monto_interes > 0 THEN
          INSERT INTO mora_intereses(
            poliza_id, fecha, dias_mora, saldo_base,
            tasa_aplicada, monto_interes, tipo, descripcion
          ) VALUES (
            pol.id, CURRENT_DATE, v_dias_vencidos, v_saldo_cuotas,
            param.tasa_interes_diario, v_monto_interes,
            'PROMESA_VENCIDA',
            'Promesa del ' || pol.fecha_promesa || ' vencida hace ' || v_dias_vencidos || ' días'
          );
          v_total_interes := v_total_interes + 1;
        END IF;

        -- Marcar promesa incumplida
        UPDATE polizas SET promesa_incumplida = TRUE WHERE id = pol.id;
      END IF;
    END IF;

    -- Sumar todos los intereses acumulados de este período
    SELECT COALESCE(SUM(monto_interes), 0) INTO v_monto_interes
    FROM mora_intereses
    WHERE poliza_id = pol.id;

    -- ── c) Auto-cancelación por promesa muy vencida ──────────────────────
    IF param.auto_cancelar
       AND pol.fecha_promesa IS NOT NULL
       AND pol.fecha_promesa < CURRENT_DATE - param.dias_auto_cancelacion
       AND pol.estado NOT IN ('CANCELADA','EJECUTADA')
    THEN
      UPDATE polizas SET
        estado             = 'CANCELADA',
        meses_mora         = v_meses_mora,
        saldo_mora         = v_saldo_cuotas + v_monto_interes,
        interes_mora       = v_monto_interes,
        promesa_incumplida = TRUE,
        actualizado        = NOW()
      WHERE id = pol.id;
      v_total_canceladas := v_total_canceladas + 1;

    ELSE
      -- ── d) Actualizar estado normal (prepago) ──────────────────────────
      UPDATE polizas SET
        meses_mora   = v_meses_mora,
        saldo_mora   = v_saldo_cuotas + v_monto_interes,
        interes_mora = v_monto_interes,
        estado = CASE
          WHEN estado IN ('CANCELADA','EJECUTADA') THEN estado
          ELSE fn_estado_poliza(v_meses_mora)
        END,
        actualizado = NOW()
      WHERE id = pol.id;
    END IF;

  END LOOP;

  RETURN QUERY SELECT v_total_procesadas, v_total_interes, v_total_canceladas;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Función para registrar una promesa en la póliza (llamada al hacer APLAZADO)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_registrar_promesa(
  p_poliza_id   UUID,
  p_fecha       DATE
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE polizas SET
    fecha_promesa      = p_fecha,
    promesa_incumplida = FALSE,
    actualizado        = NOW()
  WHERE id = p_poliza_id;
END;
$$;

COMMIT;
