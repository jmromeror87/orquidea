-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Cartera y Pagos — Migración 013                     ║
-- ║  Archivo         : 013_cartera.sql                                     ║
-- ║  Fecha           : 2026-07-01                                          ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── 1. Agregar campo numero_recibo a pagos_poliza ─────────────────────────
--    (equivalente a NORECIBO de PISCO — numeración automática de recibos)

ALTER TABLE pagos_poliza
  ADD COLUMN IF NOT EXISTS numero_recibo   SERIAL UNIQUE,
  ADD COLUMN IF NOT EXISTS descuento       NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recargo_mora    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS periodo_hasta   DATE,         -- hasta qué mes cubre el pago
  ADD COLUMN IF NOT EXISTS cobrador_id     UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS anulado         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_anulacion DATE,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

-- ── 2. Agregar campos de cartera a polizas ───────────────────────────────
--    pago_hasta: hasta qué mes está cubierta la póliza (PAGOHASTA de PISCO)
--    saldo_mora: valor en pesos acumulado en mora
--    cobrador_id: recaudador asignado

ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS pago_hasta   DATE,
  ADD COLUMN IF NOT EXISTS saldo_mora   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cobrador_id  UUID REFERENCES usuarios(id);

-- Inicializar pago_hasta con fecha_inicio para pólizas existentes
UPDATE polizas SET pago_hasta = fecha_inicio WHERE pago_hasta IS NULL;

-- ── 3. Agregar campos de cartera a contratos ─────────────────────────────

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS pago_hasta   DATE,
  ADD COLUMN IF NOT EXISTS saldo_mora   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cobrador_id  UUID REFERENCES usuarios(id);

UPDATE contratos SET pago_hasta = fecha_inicio WHERE pago_hasta IS NULL AND fecha_inicio IS NOT NULL;

-- ── 4. Tabla de pagos de contratos (espejo de pagos_poliza para contratos) ─

CREATE TABLE IF NOT EXISTS pagos_contrato (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_recibo     SERIAL UNIQUE,
  contrato_id       UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  mes_correspondiente DATE NOT NULL,
  periodo_hasta     DATE,
  monto             NUMERIC(12,2) NOT NULL,
  descuento         NUMERIC(12,2) NOT NULL DEFAULT 0,
  recargo_mora      NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago       VARCHAR(40)  NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_pago IN ('efectivo','transferencia','tarjeta','cheque','descuento_nomina','pse')),
  referencia        VARCHAR(120),
  fecha_pago        DATE NOT NULL DEFAULT CURRENT_DATE,
  cobrador_id       UUID REFERENCES usuarios(id),
  anulado           BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_anulacion   DATE,
  motivo_anulacion  TEXT,
  usuario_id        UUID NOT NULL REFERENCES usuarios(id),
  notas             TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pago_contrato_mes UNIQUE (contrato_id, mes_correspondiente)
);

-- ── 5. Vista unificada de cartera (pólizas + contratos) ──────────────────

CREATE OR REPLACE VIEW v_cartera AS
  -- Pólizas
  SELECT
    p.id,
    'POLIZA'                         AS tipo,
    p.numero::TEXT                   AS numero,
    COALESCE(t.razon_social, t.nombres || ' ' || COALESCE(t.apellidos,'')) AS titular,
    t.telefono,
    pl.nombre                        AS plan,
    p.valor_cuota                    AS cuota,
    p.estado,
    p.pago_hasta,
    p.meses_mora,
    p.saldo_mora,
    p.cobrador_id,
    p.dia_cobro,
    p.fecha_inicio
  FROM polizas p
  JOIN terceros t ON t.id = p.titular_id
  JOIN planes_poliza pl ON pl.id = p.plan_id

  UNION ALL

  -- Contratos
  SELECT
    c.id,
    'CONTRATO'                       AS tipo,
    c.numero_contrato::TEXT          AS numero,
    COALESCE(t.razon_social, t.nombres || ' ' || COALESCE(t.apellidos,'')) AS titular,
    t.telefono,
    c.paquete                        AS plan,
    c.valor_cuota                    AS cuota,
    c.estado,
    c.pago_hasta,
    GREATEST(0,
      (DATE_PART('year', AGE(DATE_TRUNC('month', CURRENT_DATE),
                             DATE_TRUNC('month', COALESCE(c.pago_hasta, c.fecha_inicio))))::INT * 12
      + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(c.pago_hasta, c.fecha_inicio))))::INT
      ) - 1
    )::SMALLINT                      AS meses_mora,
    c.saldo_mora,
    c.cobrador_id,
    c.dia_cobro,
    c.fecha_inicio
  FROM contratos c
  JOIN terceros t ON t.id = c.titular_id;

-- ── 6. Función: recalcular mora de pólizas ───────────────────────────────

CREATE OR REPLACE FUNCTION fn_recalcular_mora_polizas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE polizas SET
    meses_mora = GREATEST(0, (
      DATE_PART('year',  AGE(DATE_TRUNC('month', CURRENT_DATE),
                             DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT * 12
    + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                             DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT
    - 1))::SMALLINT,
    saldo_mora = GREATEST(0, (
      DATE_PART('year',  AGE(DATE_TRUNC('month', CURRENT_DATE),
                             DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT * 12
    + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                             DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT
    - 1)) * valor_cuota,
    estado = CASE
      WHEN estado IN ('CANCELADA','EJECUTADA') THEN estado
      WHEN GREATEST(0, (
        DATE_PART('year',  AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT * 12
      + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT
      - 1)) >= 6 THEN 'VENCIDA'
      WHEN GREATEST(0, (
        DATE_PART('year',  AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT * 12
      + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(pago_hasta, fecha_inicio))))::INT
      - 1)) >= 2 THEN 'SUSPENDIDA'
      ELSE 'VIGENTE'
    END,
    actualizado = NOW()
  WHERE estado NOT IN ('CANCELADA','EJECUTADA');
END;
$$;

-- ── 7. Grants ─────────────────────────────────────────────────────────────

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE pagos_contrato TO orquidea_user;
GRANT USAGE, SELECT ON SEQUENCE pagos_contrato_numero_recibo_seq TO orquidea_user;
GRANT SELECT ON v_cartera TO orquidea_user;

-- Refrescar mora inicial
SELECT fn_recalcular_mora_polizas();
