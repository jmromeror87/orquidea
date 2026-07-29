-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 046_pos.sql                                          ║
-- ║  Propósito       : Punto de Venta (POS) para material litúrgico —       ║
-- ║                    escapularios, biblias, vírgenes, lápidas, etc. —     ║
-- ║                    con apertura/cierre de caja menor por sede.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Sesiones de caja (apertura/cierre) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_cajas (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sede_id                UUID NOT NULL REFERENCES sedes(id),
  bodega_id              UUID NOT NULL REFERENCES inv_bodegas(id),
  usuario_id             UUID NOT NULL REFERENCES usuarios(id),
  monto_apertura         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_cierre_esperado  NUMERIC(14,2),
  monto_cierre_real      NUMERIC(14,2),
  diferencia             NUMERIC(14,2),
  estado                 VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'
                           CHECK (estado IN ('ABIERTA','CERRADA')),
  observaciones_apertura TEXT,
  observaciones_cierre   TEXT,
  abierta_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cerrada_en             TIMESTAMPTZ,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_cajas_sede    ON pos_cajas(sede_id);
CREATE INDEX IF NOT EXISTS idx_pos_cajas_usuario ON pos_cajas(usuario_id);
-- Un cajero no puede tener dos cajas ABIERTAS al mismo tiempo
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_caja_abierta_usuario
  ON pos_cajas(usuario_id) WHERE estado = 'ABIERTA';

-- ── Ventas ──────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS pos_ventas_numero_seq START 1;

CREATE TABLE IF NOT EXISTS pos_ventas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            INTEGER NOT NULL DEFAULT nextval('pos_ventas_numero_seq'),
  caja_id           UUID NOT NULL REFERENCES pos_cajas(id),
  sede_id           UUID NOT NULL REFERENCES sedes(id),
  bodega_id         UUID NOT NULL REFERENCES inv_bodegas(id),
  cliente_id        UUID REFERENCES terceros(id),
  cliente_nombre    VARCHAR(200), -- venta de mostrador sin registrar tercero
  subtotal          NUMERIC(14,2) NOT NULL DEFAULT 0,
  descuento         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total             NUMERIC(14,2) NOT NULL DEFAULT 0,
  metodo_pago       VARCHAR(40) NOT NULL DEFAULT 'efectivo',
  referencia        VARCHAR(120),
  usuario_id        UUID NOT NULL REFERENCES usuarios(id),
  anulada           BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_anulacion  TEXT,
  fecha_anulacion   TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_ventas_numero ON pos_ventas(numero);
CREATE INDEX IF NOT EXISTS idx_pos_ventas_caja  ON pos_ventas(caja_id);
CREATE INDEX IF NOT EXISTS idx_pos_ventas_sede  ON pos_ventas(sede_id);
CREATE INDEX IF NOT EXISTS idx_pos_ventas_fecha ON pos_ventas(creado_en);

-- ── Ítems de cada venta ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_venta_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id        UUID NOT NULL REFERENCES pos_ventas(id) ON DELETE CASCADE,
  producto_id     UUID NOT NULL REFERENCES inv_productos(id),
  cantidad        NUMERIC(12,2) NOT NULL,
  precio_unitario NUMERIC(14,2) NOT NULL,
  costo_unitario  NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(16,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  movimiento_id   UUID REFERENCES inv_movimientos(id)
);

CREATE INDEX IF NOT EXISTS idx_pos_venta_items_venta ON pos_venta_items(venta_id);

GRANT ALL PRIVILEGES ON TABLE pos_cajas, pos_ventas, pos_venta_items TO orquidea_user;
GRANT ALL PRIVILEGES ON SEQUENCE pos_ventas_numero_seq TO orquidea_user;
