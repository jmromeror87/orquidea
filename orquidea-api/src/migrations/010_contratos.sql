/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contratos — Migración 010                            ║
 * ║  Archivo         : 010_contratos.sql                                    ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ── 1. Ampliar contratos con campos de previsión ──────────────────────────

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS tipo_contrato   VARCHAR(20)    NOT NULL DEFAULT 'INMEDIATO'
    CHECK (tipo_contrato IN ('PREVISION','INMEDIATO')),
  ADD COLUMN IF NOT EXISTS modalidad       VARCHAR(20)    NOT NULL DEFAULT 'CONTADO'
    CHECK (modalidad IN ('CONTADO','CUOTAS')),
  ADD COLUMN IF NOT EXISTS num_cuotas      INTEGER        NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valor_cuota     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dia_cobro       SMALLINT       CHECK (dia_cobro BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS fecha_inicio    DATE           NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS sede_id         UUID           REFERENCES sedes(id);

-- ── 2. Paquetes de servicio — datos iniciales ─────────────────────────────

INSERT INTO paquetes_servicio (nombre, descripcion, precio_base) VALUES
  ('Básico',      'Ataúd sencillo, velación 4h, traslado local, trámites.',               1800000),
  ('Esencial',    'Ataúd mediano, velación 8h, traslado, sala de velación, trámites.',    2800000),
  ('Clásico',     'Ataúd premium, velación 12h, traslado, flores, trámites completos.',   4200000),
  ('Diamante',    'Ataúd de lujo, velación 24h, limusina, flores, trámites, lápida.',     7500000),
  ('Previsión I', 'Paquete de previsión básico — contratación anticipada.',               1500000),
  ('Previsión II','Paquete de previsión completo — contratación anticipada con flores.',  3200000)
ON CONFLICT DO NOTHING;

-- ── 3. Permisos del módulo ────────────────────────────────────────────────

UPDATE permisos_roles SET modulo = 'contratos' WHERE modulo = 'contratos';

-- Asegurar permiso si no existe
INSERT INTO permisos_roles (rol, modulo, accion, permitido)
VALUES
  ('superadmin',       'contratos', 'ver',      true),
  ('superadmin',       'contratos', 'crear',    true),
  ('superadmin',       'contratos', 'editar',   true),
  ('superadmin',       'contratos', 'eliminar', true),
  ('administrador',    'contratos', 'ver',      true),
  ('administrador',    'contratos', 'crear',    true),
  ('administrador',    'contratos', 'editar',   true),
  ('administrador',    'contratos', 'eliminar', true),
  ('operador',         'contratos', 'ver',      true),
  ('operador',         'contratos', 'crear',    true),
  ('operador',         'contratos', 'editar',   true),
  ('operador',         'contratos', 'eliminar', false),
  ('asesor_comercial', 'contratos', 'ver',      true),
  ('asesor_comercial', 'contratos', 'crear',    true),
  ('asesor_comercial', 'contratos', 'editar',   true),
  ('asesor_comercial', 'contratos', 'eliminar', false),
  ('contador',         'contratos', 'ver',      true),
  ('contador',         'contratos', 'crear',    false),
  ('contador',         'contratos', 'editar',   false),
  ('contador',         'contratos', 'eliminar', false),
  ('consultor',        'contratos', 'ver',      true),
  ('consultor',        'contratos', 'crear',    false),
  ('consultor',        'contratos', 'editar',   false),
  ('consultor',        'contratos', 'eliminar', false)
ON CONFLICT (rol, modulo, accion) DO NOTHING;

-- ── 4. Grants ────────────────────────────────────────────────────────────

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE contratos, paquetes_servicio, pagos, servicios_adicionales TO orquidea_user;
