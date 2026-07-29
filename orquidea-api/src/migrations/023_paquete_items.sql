-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Orquídea ERP · Migración 023 — Ítems de paquete + paquete en servicio ║
-- ║  Fecha: 2026-07-10                                                      ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;

-- 1. Ítems detallados de cada paquete
CREATE TABLE IF NOT EXISTS paquete_items (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  paquete_id   UUID        NOT NULL REFERENCES paquetes_servicio(id) ON DELETE CASCADE,
  nombre       VARCHAR(150) NOT NULL,
  descripcion  TEXT,
  categoria    VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
  incluido     BOOLEAN     NOT NULL DEFAULT TRUE,
  orden        SMALLINT    NOT NULL DEFAULT 0,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paquete_items_paquete ON paquete_items(paquete_id);

-- 2. paquete_id en servicios_funerarios
ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS paquete_id UUID REFERENCES paquetes_servicio(id);

-- 3. Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON paquete_items TO orquidea_user;
GRANT UPDATE ON servicios_funerarios TO orquidea_user;

-- 4. Poblar ítems de los 4 paquetes principales
-- Básico
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Certificado médico de defunción', 'DOCUMENTOS', 1 FROM paquetes_servicio WHERE nombre='Básico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Asesoría a la familia', 'GENERAL', 2 FROM paquetes_servicio WHERE nombre='Básico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Recogida del difunto (local)', 'TRASLADO', 3 FROM paquetes_servicio WHERE nombre='Básico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Preparación y arreglo básico', 'PREPARACION', 4 FROM paquetes_servicio WHERE nombre='Básico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Ataúd línea básica', 'ATAUD', 5 FROM paquetes_servicio WHERE nombre='Básico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Velación 4 horas', 'SALA_VELACION', 6 FROM paquetes_servicio WHERE nombre='Básico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Trámites de inhumación', 'DOCUMENTOS', 7 FROM paquetes_servicio WHERE nombre='Básico';

-- Esencial
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Certificado médico de defunción', 'DOCUMENTOS', 1 FROM paquetes_servicio WHERE nombre='Esencial';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Asesoría a la familia', 'GENERAL', 2 FROM paquetes_servicio WHERE nombre='Esencial';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Recogida del difunto (local)', 'TRASLADO', 3 FROM paquetes_servicio WHERE nombre='Esencial';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Preparación y arreglo profesional', 'PREPARACION', 4 FROM paquetes_servicio WHERE nombre='Esencial';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Ataúd línea familiar', 'ATAUD', 5 FROM paquetes_servicio WHERE nombre='Esencial';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Sala de velación 8 horas', 'SALA_VELACION', 6 FROM paquetes_servicio WHERE nombre='Esencial';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Trámites completos de inhumación', 'DOCUMENTOS', 7 FROM paquetes_servicio WHERE nombre='Esencial';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Registro civil de defunción', 'DOCUMENTOS', 8 FROM paquetes_servicio WHERE nombre='Esencial';

-- Clásico
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Certificado médico de defunción', 'DOCUMENTOS', 1 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Asesoría personalizada a la familia', 'GENERAL', 2 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Recogida del difunto (local)', 'TRASLADO', 3 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Preparación y arreglo premium', 'PREPARACION', 4 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Ataúd línea premium', 'ATAUD', 5 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Sala de velación 12 horas', 'SALA_VELACION', 6 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Flores y coronas', 'FLORES', 7 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Trámites completos', 'DOCUMENTOS', 8 FROM paquetes_servicio WHERE nombre='Clásico';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Registro civil de defunción', 'DOCUMENTOS', 9 FROM paquetes_servicio WHERE nombre='Clásico';

-- Diamante
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Certificado médico de defunción', 'DOCUMENTOS', 1 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Asesoría VIP 24h a la familia', 'GENERAL', 2 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Recogida en limusina (local)', 'TRASLADO', 3 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Preparación y arreglo de lujo', 'PREPARACION', 4 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Ataúd línea de lujo', 'ATAUD', 5 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Sala VIP 24 horas', 'SALA_VELACION', 6 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Flores y arreglos florales premium', 'FLORES', 7 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Todos los trámites legales', 'DOCUMENTOS', 8 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Lápida personalizada', 'GENERAL', 9 FROM paquetes_servicio WHERE nombre='Diamante';
INSERT INTO paquete_items (paquete_id, nombre, categoria, orden) SELECT id, 'Servicio de café y refrigerio', 'GENERAL', 10 FROM paquetes_servicio WHERE nombre='Diamante';

COMMIT;
