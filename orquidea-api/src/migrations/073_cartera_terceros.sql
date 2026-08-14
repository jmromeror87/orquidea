-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Cartera de terceros (convenios y familias)           ║
-- ║                    — cuentas por cobrar que NO son a cargo de la        ║
-- ║                    funeraria. Todo lo autorizado por un convenio y no   ║
-- ║                    pagado de inmediato, y todo excedente no cubierto,   ║
-- ║                    queda registrado como cartera contra el deudor que   ║
-- ║                    corresponda (el convenio o la familia), nunca como   ║
-- ║                    costo absorbido por la empresa.                     ║
-- ║  Archivo         : 073_cartera_terceros.sql                             ║
-- ║  Fecha           : 2026-08-14                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS cartera_terceros (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deudor_tipo       VARCHAR(20) NOT NULL CHECK (deudor_tipo IN ('CONVENIO','CONTRATANTE')),
  deudor_id         UUID,              -- NULL si aún no se define el responsable (caso dinámico)
  servicio_id       UUID NOT NULL REFERENCES servicios_funerarios(id) ON DELETE CASCADE,
  concepto          VARCHAR(150) NOT NULL,
  valor             NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pagado      NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_pendiente   NUMERIC(12,2) GENERATED ALWAYS AS (valor - valor_pagado) STORED,
  estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PARCIAL','PAGADO','ANULADO')),
  sede_id           UUID REFERENCES sedes(id),
  observaciones     TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un solo renglón de cartera por servicio y tipo de deudor (se recalcula al editar el servicio)
  CONSTRAINT uq_cartera_terceros_servicio_deudor UNIQUE (servicio_id, deudor_tipo)
);

CREATE INDEX IF NOT EXISTS idx_cartera_terceros_deudor   ON cartera_terceros(deudor_tipo, deudor_id);
CREATE INDEX IF NOT EXISTS idx_cartera_terceros_servicio ON cartera_terceros(servicio_id);
CREATE INDEX IF NOT EXISTS idx_cartera_terceros_estado   ON cartera_terceros(estado);

CREATE TABLE IF NOT EXISTS abonos_cartera_terceros (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cartera_id        UUID NOT NULL REFERENCES cartera_terceros(id) ON DELETE CASCADE,
  monto             NUMERIC(12,2) NOT NULL,
  metodo_pago       VARCHAR(40),
  referencia        VARCHAR(80),
  fecha_pago        DATE NOT NULL DEFAULT CURRENT_DATE,
  notas             TEXT,
  usuario_id        UUID REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abonos_cartera_terceros_cartera ON abonos_cartera_terceros(cartera_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cartera_terceros, abonos_cartera_terceros TO orquidea_user;
