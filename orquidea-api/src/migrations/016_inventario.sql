/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Inventario                                          ║
 * ║  Archivo         : 016_inventario.sql                                  ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-02                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- Extensión requerida
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Categorías de inventario ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_categorias (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre       VARCHAR(80) NOT NULL UNIQUE,
  descripcion  TEXT,
  icono        VARCHAR(10) DEFAULT '📦',
  color        VARCHAR(7)  DEFAULT '#6B7280',
  activo       BOOLEAN     DEFAULT TRUE,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Productos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_productos (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id          UUID          REFERENCES inv_categorias(id),
  codigo_sku            VARCHAR(40)   UNIQUE NOT NULL,
  nombre                VARCHAR(120)  NOT NULL,
  descripcion           TEXT,
  unidad_medida         VARCHAR(20)   DEFAULT 'UNIDAD'
                        CHECK (unidad_medida IN ('UNIDAD','CAJA','METRO','KG','LITRO','PAQUETE')),
  costo_promedio        NUMERIC(14,2) DEFAULT 0,
  precio_venta          NUMERIC(14,2) DEFAULT 0,
  stock_minimo          INTEGER       DEFAULT 0,
  stock_maximo          INTEGER       DEFAULT 9999,
  es_perecedero         BOOLEAN       DEFAULT FALSE,
  imagen_url            VARCHAR(300),
  activo                BOOLEAN       DEFAULT TRUE,
  creado_en             TIMESTAMPTZ   DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── 3. Bodegas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_bodegas (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sede_id          UUID        REFERENCES sedes(id),
  codigo           VARCHAR(20) UNIQUE NOT NULL,
  nombre           VARCHAR(80) NOT NULL,
  descripcion      TEXT,
  responsable_id   UUID        REFERENCES usuarios(id),
  activo           BOOLEAN     DEFAULT TRUE,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Ubicaciones dentro de bodega ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_ubicaciones (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bodega_id     UUID        NOT NULL REFERENCES inv_bodegas(id) ON DELETE CASCADE,
  codigo        VARCHAR(30) NOT NULL,
  nombre        VARCHAR(80),
  tipo          VARCHAR(20) DEFAULT 'ESTANTE'
                CHECK (tipo IN ('ESTANTE','PISO','REFRIGERADO','EXTERIOR')),
  capacidad_max INTEGER     DEFAULT 9999,
  activo        BOOLEAN     DEFAULT TRUE,
  UNIQUE (bodega_id, codigo)
);

-- ─── 5. Stock actual por producto/ubicación ────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_stock (
  id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id             UUID          NOT NULL REFERENCES inv_productos(id),
  ubicacion_id            UUID          NOT NULL REFERENCES inv_ubicaciones(id),
  cantidad                NUMERIC(12,2) DEFAULT 0,
  costo_unitario_promedio NUMERIC(14,2) DEFAULT 0,
  ultima_actualizacion    TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (producto_id, ubicacion_id)
);

-- ─── 6. Órdenes de compra (declarada antes de movimientos para FK) ─────────
CREATE SEQUENCE IF NOT EXISTS inv_oc_numero_seq;

CREATE TABLE IF NOT EXISTS inv_ordenes_compra (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            INTEGER       UNIQUE NOT NULL DEFAULT nextval('inv_oc_numero_seq'),
  proveedor_id      UUID          REFERENCES terceros(id),
  bodega_destino_id UUID          REFERENCES inv_bodegas(id),
  estado            VARCHAR(20)   DEFAULT 'BORRADOR'
                    CHECK (estado IN ('BORRADOR','PENDIENTE','APROBADA','RECIBIDA','CANCELADA')),
  fecha_emision     DATE          DEFAULT CURRENT_DATE,
  fecha_esperada    DATE,
  fecha_recepcion   DATE,
  subtotal          NUMERIC(16,2) DEFAULT 0,
  impuestos         NUMERIC(16,2) DEFAULT 0,
  total             NUMERIC(16,2) DEFAULT 0,
  notas             TEXT,
  aprobado_por      UUID          REFERENCES usuarios(id),
  fecha_aprobacion  TIMESTAMPTZ,
  usuario_id        UUID          REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── 7. Movimientos de inventario ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_movimientos (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                  VARCHAR(20)   NOT NULL
                        CHECK (tipo IN ('ENTRADA','SALIDA','TRASLADO','AJUSTE','CONSUMO')),
  producto_id           UUID          NOT NULL REFERENCES inv_productos(id),
  ubicacion_origen_id   UUID          REFERENCES inv_ubicaciones(id),
  ubicacion_destino_id  UUID          REFERENCES inv_ubicaciones(id),
  cantidad              NUMERIC(12,2) NOT NULL,
  costo_unitario        NUMERIC(14,2) DEFAULT 0,
  valor_total           NUMERIC(16,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
  referencia            VARCHAR(100),
  motivo                TEXT,
  servicio_id           UUID          REFERENCES servicios_funerarios(id),
  orden_compra_id       UUID          REFERENCES inv_ordenes_compra(id),
  usuario_id            UUID          REFERENCES usuarios(id),
  fecha                 TIMESTAMPTZ   DEFAULT NOW(),
  notas                 TEXT
);

-- ─── 8. Detalle de órdenes de compra ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_oc_detalle (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  orden_id             UUID          NOT NULL REFERENCES inv_ordenes_compra(id) ON DELETE CASCADE,
  producto_id          UUID          NOT NULL REFERENCES inv_productos(id),
  cantidad_solicitada  NUMERIC(12,2) NOT NULL,
  cantidad_recibida    NUMERIC(12,2) DEFAULT 0,
  costo_unitario       NUMERIC(14,2) NOT NULL,
  subtotal             NUMERIC(16,2) GENERATED ALWAYS AS (cantidad_solicitada * costo_unitario) STORED,
  notas                TEXT
);

-- ─── Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_productos_categoria ON inv_productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_inv_productos_sku       ON inv_productos(codigo_sku);
CREATE INDEX IF NOT EXISTS idx_inv_stock_producto      ON inv_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_ubicacion     ON inv_stock(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_inv_movimientos_fecha   ON inv_movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movimientos_prod    ON inv_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_oc_estado           ON inv_ordenes_compra(estado);

-- ─── Datos iniciales: categorías ──────────────────────────────────────────
INSERT INTO inv_categorias (nombre, descripcion, icono, color) VALUES
  ('Ataúdes',              'Féretros y ataúdes de diferentes materiales',  '⚰️',  '#6B7280'),
  ('Urnas',                'Urnas funerarias para cremación',              '🏺',  '#92400E'),
  ('Flores y Coronas',     'Arreglos florales y coronas fúnebres',         '🌸',  '#BE185D'),
  ('Insumos de Preparación','Productos para preparación del cuerpo',       '🧴',  '#1D4ED8'),
  ('Ropa y Vestimenta',    'Vestimenta y ajuares mortuorios',              '👔',  '#7C3AED'),
  ('Papelería y Documentos','Esquelas, recordatorios, documentos',         '📋',  '#0369A1'),
  ('Capillas y Decoración','Elementos de decoración de capilla ardiente',  '🕯️', '#B45309'),
  ('Vehículos e Insumos',  'Insumos para vehículos fúnebres',             '🚗',  '#374151')
ON CONFLICT (nombre) DO NOTHING;

-- ─── Permisos ───────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_categorias     TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_productos       TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_bodegas         TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_ubicaciones     TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_stock           TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_movimientos     TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_ordenes_compra  TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_oc_detalle      TO orquidea_user;
GRANT USAGE, SELECT ON SEQUENCE inv_oc_numero_seq           TO orquidea_user;
