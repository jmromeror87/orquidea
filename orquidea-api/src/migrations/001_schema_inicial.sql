-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Base de Datos                                   ║
-- ║  Archivo         : 001_schema_inicial.sql                          ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-06-28                                      ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- ═══════════════════════════════════════════════════════════════
--  Orquídea — Migración 001: Esquema inicial
--  Sistema de Gestión Funeraria
-- ═══════════════════════════════════════════════════════════════

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ── Tabla: usuarios ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(120)  NOT NULL,
  email       VARCHAR(180)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  rol         VARCHAR(30)   NOT NULL DEFAULT 'operador',  -- admin | operador | consultor
  activo      BOOLEAN       NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Tabla: clientes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres         VARCHAR(120) NOT NULL,
  apellidos       VARCHAR(120) NOT NULL,
  cedula          VARCHAR(20)  UNIQUE,
  telefono        VARCHAR(20),
  telefono_alt    VARCHAR(20),
  email           VARCHAR(180),
  direccion       TEXT,
  ciudad          VARCHAR(80),
  observaciones   TEXT,
  activo          BOOLEAN      NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: difuntos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS difuntos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres         VARCHAR(120) NOT NULL,
  apellidos       VARCHAR(120) NOT NULL,
  cedula          VARCHAR(20),
  fecha_nacimiento DATE,
  fecha_fallecimiento DATE NOT NULL,
  lugar_fallecimiento VARCHAR(200),
  causa_fallecimiento VARCHAR(200),
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: paquetes_servicio ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS paquetes_servicio (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(120) NOT NULL,
  descripcion TEXT,
  precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  activo      BOOLEAN      NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: contratos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          SERIAL UNIQUE,
  cliente_id      UUID NOT NULL REFERENCES clientes(id),
  difunto_id      UUID REFERENCES difuntos(id),
  paquete_id      UUID REFERENCES paquetes_servicio(id),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pagado    NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_pendiente NUMERIC(12,2) GENERATED ALWAYS AS (valor_total - valor_pagado) STORED,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'activo',  -- activo | completado | cancelado
  fecha_servicio  DATE,
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: pagos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id     UUID NOT NULL REFERENCES contratos(id),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  monto           NUMERIC(12,2) NOT NULL,
  metodo_pago     VARCHAR(40)  NOT NULL,  -- efectivo | transferencia | tarjeta | cheque
  referencia      VARCHAR(120),
  comprobante_url VARCHAR(300),
  notas           TEXT,
  fecha_pago      DATE         NOT NULL DEFAULT CURRENT_DATE,
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: servicios_adicionales ─────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios_adicionales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id UUID NOT NULL REFERENCES contratos(id),
  descripcion VARCHAR(200) NOT NULL,
  cantidad    INTEGER      NOT NULL DEFAULT 1,
  precio_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: notificaciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        VARCHAR(30)  NOT NULL,  -- whatsapp | email | sistema
  destinatario VARCHAR(120),
  mensaje     TEXT         NOT NULL,
  enviado     BOOLEAN      NOT NULL DEFAULT false,
  error       TEXT,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contratos_cliente    ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado     ON contratos(estado);
CREATE INDEX IF NOT EXISTS idx_contratos_fecha      ON contratos(fecha_servicio);
CREATE INDEX IF NOT EXISTS idx_pagos_contrato       ON pagos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha          ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_clientes_cedula      ON clientes(cedula);

-- ── Usuario admin por defecto ─────────────────────────────────────
-- Contraseña: Admin1234! (CAMBIAR EN PRODUCCIÓN)
INSERT INTO usuarios (nombre, email, password, rol)
VALUES (
  'Administrador',
  'admin@orquidea.com',
  '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FgkCGpbCYMa9.mGEGiJBpM.MwYxF3Oy',
  'admin'
) ON CONFLICT (email) DO NOTHING;
