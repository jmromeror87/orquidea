/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Territorio — Recaudo                                ║
 * ║  Archivo         : 018_zonas_recaudo.sql                               ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-03                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- Zonas de recaudo (independientes de la división política)
CREATE TABLE IF NOT EXISTS zonas_recaudo (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo        VARCHAR(20) NOT NULL DEFAULT 'URBANA' CHECK (tipo IN ('URBANA','RURAL','MIXTA')),
  color       VARCHAR(7) DEFAULT '#6366F1',
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rutas dentro de cada zona
CREATE TABLE IF NOT EXISTS rutas_recaudo (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zona_id        UUID NOT NULL REFERENCES zonas_recaudo(id) ON DELETE CASCADE,
  nombre         VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  dias_mes       INTEGER[] NOT NULL DEFAULT '{}',  -- días del mes: [5, 15, 25]
  recaudador_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  activa         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asignación de pólizas a rutas
CREATE TABLE IF NOT EXISTS poliza_ruta (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id  UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  ruta_id    UUID NOT NULL REFERENCES rutas_recaudo(id) ON DELETE CASCADE,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poliza_id)  -- una póliza solo puede estar en una ruta
);

-- Datos de prueba
INSERT INTO zonas_recaudo (nombre, descripcion, tipo, color) VALUES
  ('Zona Urbana Centro', 'Casco urbano principal de Ábrego', 'URBANA', '#6366F1'),
  ('Zona Norte Rural', 'Veredas sector norte del municipio', 'RURAL', '#10B981'),
  ('Zona Sur Rural', 'Veredas sector sur - Ocaña', 'RURAL', '#F59E0B'),
  ('Zona Mixta Occidente', 'Barrios periféricos y veredas cercanas', 'MIXTA', '#8B5CF6')
ON CONFLICT DO NOTHING;
