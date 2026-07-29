-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Compras                                             ║
-- ║  Archivo         : 017_compras.sql                                     ║
-- ║  Versión         : v1.0.0                                              ║
-- ║  Fecha           : 2026-07-02                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Solicitudes de compra
CREATE TABLE IF NOT EXISTS cmp_solicitudes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            SERIAL UNIQUE,
  solicitante_id    UUID REFERENCES usuarios(id),
  bodega_id         UUID REFERENCES inv_bodegas(id),
  estado            VARCHAR(20) DEFAULT 'PENDIENTE'
                      CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','CONVERTIDA')),
  prioridad         VARCHAR(10) DEFAULT 'NORMAL'
                      CHECK (prioridad IN ('BAJA','NORMAL','ALTA','URGENTE')),
  motivo            TEXT,
  fecha_requerida   DATE,
  aprobado_por      UUID REFERENCES usuarios(id),
  fecha_aprobacion  TIMESTAMPTZ,
  orden_compra_id   UUID,
  notas_rechazo     TEXT,
  creado_en         TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Detalle de solicitudes
CREATE TABLE IF NOT EXISTS cmp_solicitudes_detalle (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitud_id          UUID REFERENCES cmp_solicitudes(id) ON DELETE CASCADE,
  producto_id           UUID REFERENCES inv_productos(id),
  cantidad_solicitada   NUMERIC(12,2) NOT NULL,
  cantidad_aprobada     NUMERIC(12,2),
  costo_estimado        NUMERIC(14,2) DEFAULT 0,
  notas                 TEXT
);

-- 3. Proveedores (extiende terceros)
CREATE TABLE IF NOT EXISTS cmp_proveedores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tercero_id          UUID REFERENCES terceros(id) UNIQUE,
  codigo              VARCHAR(20) UNIQUE,
  tipo_proveedor      VARCHAR(30) DEFAULT 'GENERAL'
                        CHECK (tipo_proveedor IN ('GENERAL','ATAUD','FLORES','INSUMOS','SERVICIOS','PAPELERIA')),
  condicion_pago      VARCHAR(20) DEFAULT 'CONTADO'
                        CHECK (condicion_pago IN ('CONTADO','8_DIAS','15_DIAS','30_DIAS','45_DIAS','60_DIAS')),
  dias_entrega        INTEGER DEFAULT 1,
  descuento_habitual  NUMERIC(5,2) DEFAULT 0,
  calificacion        NUMERIC(3,1) DEFAULT 5.0,
  banco               VARCHAR(80),
  numero_cuenta       VARCHAR(30),
  tipo_cuenta         VARCHAR(20),
  contacto_nombre     VARCHAR(80),
  contacto_cargo      VARCHAR(60),
  activo              BOOLEAN DEFAULT TRUE,
  creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Cotizaciones
CREATE TABLE IF NOT EXISTS cmp_cotizaciones (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              SERIAL UNIQUE,
  solicitud_id        UUID REFERENCES cmp_solicitudes(id),
  proveedor_id        UUID REFERENCES cmp_proveedores(id),
  estado              VARCHAR(20) DEFAULT 'BORRADOR'
                        CHECK (estado IN ('BORRADOR','ENVIADA','RECIBIDA','SELECCIONADA','RECHAZADA')),
  fecha_emision       DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE,
  subtotal            NUMERIC(16,2) DEFAULT 0,
  impuestos           NUMERIC(16,2) DEFAULT 0,
  descuento           NUMERIC(16,2) DEFAULT 0,
  total               NUMERIC(16,2) DEFAULT 0,
  tiempo_entrega_dias INTEGER,
  notas               TEXT,
  archivo_url         VARCHAR(300),
  usuario_id          UUID REFERENCES usuarios(id),
  creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Detalle de cotizaciones
CREATE TABLE IF NOT EXISTS cmp_cotizaciones_detalle (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cotizacion_id   UUID REFERENCES cmp_cotizaciones(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES inv_productos(id),
  descripcion     VARCHAR(200),
  cantidad        NUMERIC(12,2) NOT NULL,
  costo_unitario  NUMERIC(14,2) NOT NULL,
  descuento_item  NUMERIC(5,2) DEFAULT 0,
  subtotal        NUMERIC(16,2) GENERATED ALWAYS AS (cantidad * costo_unitario * (1 - descuento_item/100)) STORED
);

-- 6. Recepciones de mercancía
CREATE TABLE IF NOT EXISTS cmp_recepciones (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero           SERIAL UNIQUE,
  orden_compra_id  UUID REFERENCES inv_ordenes_compra(id),
  proveedor_id     UUID REFERENCES cmp_proveedores(id),
  bodega_id        UUID REFERENCES inv_bodegas(id),
  estado           VARCHAR(20) DEFAULT 'PENDIENTE'
                     CHECK (estado IN ('PENDIENTE','PARCIAL','COMPLETA','CON_DISCREPANCIA')),
  fecha_recepcion  TIMESTAMPTZ DEFAULT NOW(),
  numero_remision  VARCHAR(60),
  observaciones    TEXT,
  recibido_por     UUID REFERENCES usuarios(id),
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Detalle de recepciones
CREATE TABLE IF NOT EXISTS cmp_recepciones_detalle (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recepcion_id        UUID REFERENCES cmp_recepciones(id) ON DELETE CASCADE,
  producto_id         UUID REFERENCES inv_productos(id),
  ubicacion_id        UUID REFERENCES inv_ubicaciones(id),
  cantidad_esperada   NUMERIC(12,2) NOT NULL,
  cantidad_recibida   NUMERIC(12,2) NOT NULL,
  cantidad_rechazada  NUMERIC(12,2) DEFAULT 0,
  costo_unitario      NUMERIC(14,2) NOT NULL,
  motivo_rechazo      TEXT,
  movimiento_id       UUID REFERENCES inv_movimientos(id)
);

-- 8. Cuentas por pagar
CREATE TABLE IF NOT EXISTS cmp_cuentas_pagar (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            SERIAL UNIQUE,
  proveedor_id      UUID REFERENCES cmp_proveedores(id),
  orden_compra_id   UUID REFERENCES inv_ordenes_compra(id),
  recepcion_id      UUID REFERENCES cmp_recepciones(id),
  concepto          VARCHAR(200),
  monto_total       NUMERIC(16,2) NOT NULL,
  monto_pagado      NUMERIC(16,2) DEFAULT 0,
  monto_pendiente   NUMERIC(16,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
  estado            VARCHAR(20) DEFAULT 'PENDIENTE'
                      CHECK (estado IN ('PENDIENTE','PARCIAL','PAGADA','VENCIDA','ANULADA')),
  fecha_emision     DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago        DATE,
  metodo_pago       VARCHAR(40),
  referencia_pago   VARCHAR(100),
  notas             TEXT,
  creado_en         TIMESTAMPTZ DEFAULT NOW()
);

-- FK diferida: solicitud → orden compra
ALTER TABLE cmp_solicitudes
  ADD CONSTRAINT fk_orden_compra
  FOREIGN KEY (orden_compra_id) REFERENCES inv_ordenes_compra(id);

-- Ampliar inv_ordenes_compra para integración con módulo compras
ALTER TABLE inv_ordenes_compra ADD COLUMN IF NOT EXISTS solicitud_id UUID REFERENCES cmp_solicitudes(id);
ALTER TABLE inv_ordenes_compra ADD COLUMN IF NOT EXISTS cotizacion_seleccionada_id UUID REFERENCES cmp_cotizaciones(id);
ALTER TABLE inv_ordenes_compra ADD COLUMN IF NOT EXISTS proveedor_cmp_id UUID REFERENCES cmp_proveedores(id);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_cmp_sol_estado    ON cmp_solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_cmp_sol_solicit   ON cmp_solicitudes(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_cmp_prov_tercero  ON cmp_proveedores(tercero_id);
CREATE INDEX IF NOT EXISTS idx_cmp_rec_oc        ON cmp_recepciones(orden_compra_id);
CREATE INDEX IF NOT EXISTS idx_cmp_cp_proveedor  ON cmp_cuentas_pagar(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_cmp_cp_estado     ON cmp_cuentas_pagar(estado);

-- Permisos
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_solicitudes         TO orquidea_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_solicitudes_detalle TO orquidea_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_proveedores         TO orquidea_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_cotizaciones        TO orquidea_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_cotizaciones_detalle TO orquidea_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_recepciones         TO orquidea_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_recepciones_detalle TO orquidea_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON cmp_cuentas_pagar       TO orquidea_user;

GRANT USAGE,SELECT ON SEQUENCE cmp_solicitudes_numero_seq         TO orquidea_user;
GRANT USAGE,SELECT ON SEQUENCE cmp_cotizaciones_numero_seq        TO orquidea_user;
GRANT USAGE,SELECT ON SEQUENCE cmp_recepciones_numero_seq         TO orquidea_user;
GRANT USAGE,SELECT ON SEQUENCE cmp_cuentas_pagar_numero_seq       TO orquidea_user;
