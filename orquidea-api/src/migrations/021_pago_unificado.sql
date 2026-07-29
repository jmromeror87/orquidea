/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 021: Función unificada de pago de póliza      ║
 * ║  Archivo : 021_pago_unificado.sql  |  Fecha: 2026-07-06                 ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ══════════════════════════════════════════════════════════════════════
-- REGLAS PREPAGO (única fuente de verdad)
-- 0 mora  → VIGENTE   (pagó este mes, tiene cobertura)
-- 1+ mora → SUSPENDIDA (no pagó, sin cobertura)
-- 6+ mora → VENCIDA   (deuda antigua)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_estado_poliza(p_mora INT)
RETURNS VARCHAR AS $$
BEGIN
  IF p_mora >= 6 THEN RETURN 'VENCIDA'; END IF;
  IF p_mora >= 1 THEN RETURN 'SUSPENDIDA'; END IF;
  RETURN 'VIGENTE';
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ══════════════════════════════════════════════════════════════════════
-- fn_aplicar_pago_poliza
-- Registra un pago y actualiza estado/mora atómicamente.
-- Retorna el registro insertado en pagos_poliza.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_aplicar_pago_poliza(
  p_poliza_id     UUID,
  p_monto         NUMERIC,
  p_metodo        VARCHAR DEFAULT 'EFECTIVO',
  p_usuario_id    UUID   DEFAULT NULL,
  p_cobrador_id   UUID   DEFAULT NULL,
  p_notas         TEXT   DEFAULT NULL,
  p_mes_corr      DATE   DEFAULT NULL   -- si NULL usa DATE_TRUNC('month', CURRENT_DATE)
) RETURNS pagos_poliza AS $$
DECLARE
  v_poliza        polizas%ROWTYPE;
  v_meses_pagados INT;
  v_nueva_mora    INT;
  v_nuevo_estado  VARCHAR;
  v_mes_corr      DATE;
  v_pago          pagos_poliza%ROWTYPE;
BEGIN
  -- Bloquear la fila de la póliza para evitar concurrencia
  SELECT * INTO v_poliza FROM polizas WHERE id = p_poliza_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Póliza % no encontrada', p_poliza_id;
  END IF;
  IF v_poliza.estado IN ('CANCELADA', 'EJECUTADA') THEN
    RAISE EXCEPTION 'La póliza está % y no puede recibir pagos', v_poliza.estado;
  END IF;

  -- Calcular cuántos meses cubre el pago
  v_meses_pagados := FLOOR(p_monto / v_poliza.valor_cuota)::INT;
  v_nueva_mora    := GREATEST(0, v_poliza.meses_mora - v_meses_pagados);
  v_nuevo_estado  := fn_estado_poliza(v_nueva_mora);
  v_mes_corr      := COALESCE(p_mes_corr, DATE_TRUNC('month', CURRENT_DATE));

  -- Insertar en pagos_poliza
  INSERT INTO pagos_poliza (
    poliza_id, mes_correspondiente, monto, metodo_pago,
    fecha_pago, usuario_id, cobrador_id, notas
  ) VALUES (
    p_poliza_id, v_mes_corr, p_monto, p_metodo,
    CURRENT_DATE, p_usuario_id, p_cobrador_id, p_notas
  ) RETURNING * INTO v_pago;

  -- Actualizar póliza
  UPDATE polizas SET
    ultimo_pago = CURRENT_DATE,
    meses_mora  = v_nueva_mora,
    saldo_mora  = v_nueva_mora * valor_cuota,
    estado      = v_nuevo_estado,
    actualizado = NOW()
  WHERE id = p_poliza_id;

  RETURN v_pago;
END;
$$ LANGUAGE plpgsql;


-- ══════════════════════════════════════════════════════════════════════
-- fn_recalcular_mora_polizas  (cron diario — regla prepago)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_recalcular_mora_polizas() RETURNS void AS $$
BEGIN
  UPDATE polizas SET
    meses_mora = (
      GREATEST(0,
        (DATE_PART('year',  AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT * 12
        + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                 DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT
        ) - 1
      )
    )::SMALLINT,
    saldo_mora = (
      GREATEST(0,
        (DATE_PART('year',  AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT * 12
        + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                 DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT
        ) - 1
      ) * valor_cuota
    ),
    estado = fn_estado_poliza((
      GREATEST(0,
        (DATE_PART('year',  AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT * 12
        + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                 DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT
        ) - 1
      )::INT
    )),
    actualizado = NOW()
  WHERE estado NOT IN ('CANCELADA', 'EJECUTADA');
END;
$$ LANGUAGE plpgsql;

-- Ejecutar inmediatamente para sincronizar datos actuales
SELECT fn_recalcular_mora_polizas();

SELECT 'Migración 021 aplicada OK' AS resultado;
