-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Pólizas — renovación anual con incremento SMMLV      ║
-- ║  Archivo         : 109_incremento_anual_polizas.sql                     ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-17                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Las pólizas se renuevan solas cada año y la cuota sube según el
-- incremento del salario mínimo (SMMLV) de ese año.
--  · Cuándo sube: parámetro incremento_modo → 'ANIVERSARIO' (el día que cada
--    póliza cumple año) o 'ENERO' (1 de enero, todas).
--  · Cuánto: % del SMMLV del año (o el que fije la gerencia). Si aún no hay
--    decreto, la gerencia registra un % PROYECTADO para cobrar por adelantado.
--  · Cada periodo se cobra con la tarifa vigente el día en que EMPIEZA.
--  · Redondeo de la cuota nueva: parámetro incremento_redondeo (100 = centena).

ALTER TABLE parametros_sistema
  ADD COLUMN IF NOT EXISTS incremento_modo VARCHAR(12) NOT NULL DEFAULT 'ANIVERSARIO'
    CHECK (incremento_modo IN ('ANIVERSARIO','ENERO')),
  ADD COLUMN IF NOT EXISTS incremento_redondeo INTEGER NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS salario_minimo (
  anio               INTEGER PRIMARY KEY,
  valor              NUMERIC(12,2),                  -- SMMLV decretado (NULL si es solo proyección)
  porcentaje_smmlv   NUMERIC(6,3),                   -- % de aumento frente al año anterior (calculado)
  porcentaje_aplicar NUMERIC(6,3),                   -- % que se aplica a las pólizas (NULL = el del SMMLV)
  proyectado         BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE: aún sin decreto, % estimado por gerencia
  decreto            VARCHAR(120),
  actualizado_por    UUID REFERENCES usuarios(id),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valores oficiales (decretos del Gobierno Nacional)
INSERT INTO salario_minimo (anio, valor, porcentaje_smmlv, decreto) VALUES
  (2022, 1000000, 10.070, 'Decreto 1724 de 2021'),
  (2023, 1160000, 16.000, 'Decreto 2613 de 2022'),
  (2024, 1300000, 12.069, 'Decreto 2292 de 2023'),
  (2025, 1423500,  9.500, 'Decreto 1572 de 2024'),
  (2026, 1750905, 23.000, 'Decreto 1469 de 2025')
ON CONFLICT (anio) DO NOTHING;

-- Desde qué fecha rige la cuota actual de cada póliza. Las existentes: hoy
-- (su cuota ya es la vigente; el próximo incremento es el siguiente
-- aniversario o 1 de enero, nunca se cobran años atrasados).
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS tarifa_desde DATE;
UPDATE polizas SET tarifa_desde = CURRENT_DATE WHERE tarifa_desde IS NULL;

CREATE TABLE IF NOT EXISTS poliza_renovaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id       UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,                 -- desde cuándo rige la cuota nueva
  anio_smmlv      INTEGER NOT NULL,
  porcentaje      NUMERIC(6,3) NOT NULL,
  proyectado      BOOLEAN NOT NULL DEFAULT FALSE,
  cuota_anterior  NUMERIC(12,2) NOT NULL,
  cuota_nueva     NUMERIC(12,2) NOT NULL,
  modo            VARCHAR(12) NOT NULL,
  usuario_id      UUID REFERENCES usuarios(id), -- NULL = proceso automático
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poliza_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_poliza_renovaciones ON poliza_renovaciones(poliza_id, fecha DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE salario_minimo, poliza_renovaciones TO orquidea_user;
