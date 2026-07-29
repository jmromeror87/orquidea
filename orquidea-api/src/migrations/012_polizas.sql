/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas de Previsión — Migración 012                 ║
 * ║  Archivo         : 012_polizas.sql                                      ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ── 1. Planes de póliza (configurables) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS planes_poliza (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre            VARCHAR(80)  NOT NULL,
  descripcion       TEXT,
  tipo              VARCHAR(20)  NOT NULL DEFAULT 'FAMILIAR'
    CHECK (tipo IN ('INDIVIDUAL','FAMILIAR','AMPLIADO','COLECTIVO')),
  max_beneficiarios SMALLINT     NOT NULL DEFAULT 1,
  valor_mensual     NUMERIC(12,2) NOT NULL DEFAULT 0,
  meses_carencia    SMALLINT     NOT NULL DEFAULT 3,
  -- Coberturas (qué incluye el plan)
  cubre_ataud       VARCHAR(40)  NOT NULL DEFAULT 'BASICO'   -- BASICO | MEDIANO | PREMIUM | LUJO
    CHECK (cubre_ataud IN ('BASICO','MEDIANO','PREMIUM','LUJO')),
  cubre_velacion_h  SMALLINT     NOT NULL DEFAULT 4,          -- horas de velación
  cubre_traslado_local   BOOLEAN NOT NULL DEFAULT TRUE,
  cubre_traslado_nacional BOOLEAN NOT NULL DEFAULT FALSE,
  cubre_flores      BOOLEAN      NOT NULL DEFAULT FALSE,
  cubre_cremacion   BOOLEAN      NOT NULL DEFAULT FALSE,
  cubre_tramites    BOOLEAN      NOT NULL DEFAULT TRUE,
  cubre_lapida      BOOLEAN      NOT NULL DEFAULT FALSE,
  valor_excedente   NUMERIC(12,2) NOT NULL DEFAULT 0,         -- cobro si supera cobertura
  activo            BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Planes iniciales tipo Los Olivos
INSERT INTO planes_poliza (
  nombre, descripcion, tipo, max_beneficiarios, valor_mensual, meses_carencia,
  cubre_ataud, cubre_velacion_h, cubre_traslado_local, cubre_traslado_nacional,
  cubre_flores, cubre_cremacion, cubre_tramites, cubre_lapida
) VALUES
  ('Individual Básico',
   'Cobertura individual. Ataúd básico, velación 4h, traslado local y trámites.',
   'INDIVIDUAL', 1, 32000, 3, 'BASICO', 4, TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),

  ('Familiar Esencial',
   'Titular + cónyuge + hijos menores de 18. Ataúd mediano, velación 8h.',
   'FAMILIAR', 6, 58000, 3, 'MEDIANO', 8, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE),

  ('Familiar Clásico',
   'Titular + cónyuge + hijos + padres. Ataúd premium, velación 12h, flores.',
   'AMPLIADO', 10, 89000, 4, 'PREMIUM', 12, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE),

  ('Familiar Diamante',
   'Cobertura total ampliada. Ataúd de lujo, velación 24h, traslado nacional, cremación incluida, lápida.',
   'AMPLIADO', 12, 145000, 4, 'LUJO', 24, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),

  ('Colectivo Empresarial',
   'Para empresas y cooperativas. Precio por empleado/afiliado. Condiciones especiales.',
   'COLECTIVO', 1, 25000, 2, 'MEDIANO', 8, TRUE, FALSE, FALSE, FALSE, TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- ── 2. Pólizas ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS polizas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              SERIAL UNIQUE,
  titular_id          UUID NOT NULL REFERENCES terceros(id) ON DELETE RESTRICT,
  plan_id             UUID NOT NULL REFERENCES planes_poliza(id),
  estado              VARCHAR(20) NOT NULL DEFAULT 'VIGENTE'
    CHECK (estado IN ('VIGENTE','SUSPENDIDA','VENCIDA','EJECUTADA','CANCELADA')),
  -- Fechas
  fecha_inicio        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin_carencia  DATE,          -- calculado al insertar por trigger
  fecha_cancelacion   DATE,
  -- Pago
  valor_cuota         NUMERIC(12,2) NOT NULL,
  dia_cobro           SMALLINT NOT NULL DEFAULT 1 CHECK (dia_cobro BETWEEN 1 AND 28),
  -- Control de mora
  meses_mora          SMALLINT NOT NULL DEFAULT 0,
  ultimo_pago         DATE,
  -- Contrato de origen (si viene de un contrato de previsión existente)
  contrato_origen_id  UUID REFERENCES contratos(id),
  -- Asesor que la vendió
  usuario_id          UUID NOT NULL REFERENCES usuarios(id),
  observaciones       TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Beneficiarios de la póliza ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS poliza_beneficiarios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id   UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  tercero_id  UUID NOT NULL REFERENCES terceros(id) ON DELETE RESTRICT,
  parentesco  VARCHAR(40) NOT NULL,
  -- Si ya usó la cobertura
  ejecutado   BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_ejecucion DATE,
  servicio_id UUID REFERENCES servicios_funerarios(id),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_poliza_beneficiario UNIQUE (poliza_id, tercero_id)
);

-- ── 4. Pagos de póliza ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pagos_poliza (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id         UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  mes_correspondiente DATE NOT NULL,  -- primer día del mes que cubre
  monto             NUMERIC(12,2) NOT NULL,
  metodo_pago       VARCHAR(40) NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_pago IN ('efectivo','transferencia','tarjeta','cheque','descuento_nomina','pse')),
  referencia        VARCHAR(120),
  fecha_pago        DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_id        UUID NOT NULL REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pago_poliza_mes UNIQUE (poliza_id, mes_correspondiente)
);

-- ── 5a. Trigger: calcular fecha_fin_carencia al insertar póliza ──────────

CREATE OR REPLACE FUNCTION fn_set_fecha_fin_carencia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_meses SMALLINT;
BEGIN
  SELECT meses_carencia INTO v_meses FROM planes_poliza WHERE id = NEW.plan_id;
  NEW.fecha_fin_carencia := NEW.fecha_inicio + (v_meses || ' months')::INTERVAL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_fecha_fin_carencia ON polizas;
CREATE TRIGGER trg_set_fecha_fin_carencia
  BEFORE INSERT ON polizas
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_fin_carencia();

-- ── 5b. Función mora: calcula meses vencidos desde el último pago ─────────
-- Lógica: mora = meses completos transcurridos desde ultimo_pago (o fecha_inicio)
-- Una póliza pagada hoy tiene 0 mora; si no paga el mes siguiente tiene 1 mes mora.
-- A los 2 meses → SUSPENDIDA; a los 6 meses → VENCIDA.

CREATE OR REPLACE FUNCTION calcular_mora_polizas()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_meses_mora INTEGER;
BEGIN
  UPDATE polizas SET
    meses_mora = (
      -- Meses completos entre el período cubierto hasta hoy
      -- Si pagó hasta Mayo, y hoy es Julio → 1 mes mora (Junio vencido)
      GREATEST(0,
        (DATE_PART('year', AGE(DATE_TRUNC('month', CURRENT_DATE),
                               DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT * 12
        + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                 DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT
        ) - 1  -- el mes del último pago ya está cubierto
      )
    )::SMALLINT,
    estado = CASE
      WHEN estado IN ('CANCELADA','EJECUTADA') THEN estado  -- nunca cambiar estados finales
      WHEN GREATEST(0,
             (DATE_PART('year', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                    DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT * 12
             + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                      DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT
             ) - 1) >= 6  THEN 'VENCIDA'
      WHEN GREATEST(0,
             (DATE_PART('year', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                    DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT * 12
             + DATE_PART('month', AGE(DATE_TRUNC('month', CURRENT_DATE),
                                      DATE_TRUNC('month', COALESCE(ultimo_pago, fecha_inicio))))::INT
             ) - 1) >= 2  THEN 'SUSPENDIDA'
      ELSE 'VIGENTE'
    END
  WHERE estado NOT IN ('CANCELADA','EJECUTADA');
END;
$$;

-- ── 6. Rol en terceros ────────────────────────────────────────────────────

-- Asegurar que los permisos del módulo clientes mapeen a polizas también
INSERT INTO permisos_roles (rol, modulo, accion, permitido)
VALUES
  ('superadmin',       'polizas', 'ver',      true),
  ('superadmin',       'polizas', 'crear',    true),
  ('superadmin',       'polizas', 'editar',   true),
  ('superadmin',       'polizas', 'eliminar', true),
  ('administrador',    'polizas', 'ver',      true),
  ('administrador',    'polizas', 'crear',    true),
  ('administrador',    'polizas', 'editar',   true),
  ('administrador',    'polizas', 'eliminar', true),
  ('operador',         'polizas', 'ver',      true),
  ('operador',         'polizas', 'crear',    true),
  ('operador',         'polizas', 'editar',   true),
  ('operador',         'polizas', 'eliminar', false),
  ('asesor_comercial', 'polizas', 'ver',      true),
  ('asesor_comercial', 'polizas', 'crear',    true),
  ('asesor_comercial', 'polizas', 'editar',   true),
  ('asesor_comercial', 'polizas', 'eliminar', false),
  ('contador',         'polizas', 'ver',      true),
  ('contador',         'polizas', 'crear',    false),
  ('contador',         'polizas', 'editar',   false),
  ('contador',         'polizas', 'eliminar', false),
  ('consultor',        'polizas', 'ver',      true),
  ('consultor',        'polizas', 'crear',    false),
  ('consultor',        'polizas', 'editar',   false),
  ('consultor',        'polizas', 'eliminar', false)
ON CONFLICT (rol, modulo, accion) DO NOTHING;

-- ── 7. Grants ─────────────────────────────────────────────────────────────

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE
  planes_poliza, polizas, poliza_beneficiarios, pagos_poliza
TO orquidea_user;
