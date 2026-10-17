-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Bitácora (pólizas y servicios)                       ║
-- ║  Archivo         : 107_bitacora.sql                                     ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-17                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Notas que los usuarios escriben sobre una póliza (y luego un servicio):
-- qué pasó, qué se hizo, novedades. Texto enriquecido (HTML ya saneado en la
-- API), con imágenes. Nada se borra de verdad: editar guarda la versión
-- anterior y eliminar deja la nota oculta con quién, cuándo y por qué.
CREATE TABLE IF NOT EXISTS bitacora (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo    VARCHAR(20) NOT NULL CHECK (entidad_tipo IN ('POLIZA','SERVICIO')),
  entidad_id      UUID NOT NULL,
  categoria       VARCHAR(40) NOT NULL DEFAULT 'NOTA',
  titulo          VARCHAR(200),
  contenido_html  TEXT NOT NULL,
  contenido_texto TEXT NOT NULL DEFAULT '',          -- para buscar
  fijada          BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_id      UUID REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  editado_en      TIMESTAMPTZ,
  editado_por     UUID REFERENCES usuarios(id),
  eliminado       BOOLEAN NOT NULL DEFAULT FALSE,
  eliminado_por   UUID REFERENCES usuarios(id),
  eliminado_en    TIMESTAMPTZ,
  motivo_eliminacion TEXT
);
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON bitacora(entidad_tipo, entidad_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS bitacora_versiones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitacora_id    UUID NOT NULL REFERENCES bitacora(id) ON DELETE CASCADE,
  categoria      VARCHAR(40),
  titulo         VARCHAR(200),
  contenido_html TEXT NOT NULL,
  usuario_id     UUID REFERENCES usuarios(id),   -- autor de esa versión
  guardado_en    TIMESTAMPTZ NOT NULL,           -- cuándo se escribió esa versión
  reemplazada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bitacora_versiones ON bitacora_versiones(bitacora_id, reemplazada_en DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bitacora, bitacora_versiones TO orquidea_user;
