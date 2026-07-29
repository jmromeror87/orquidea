-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Memoriales — conmemoraciones publicadas en el sitio ║
-- ║  Archivo         : 050_memoriales_web.sql                              ║
-- ║  Versión         : v1.0.0                                              ║
-- ║  Fecha           : 2026-07-28                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Tabla independiente de `defunciones` a propósito: publicar en el sitio web
-- requiere una decisión explícita del equipo (consentimiento familiar), no
-- debe salir automáticamente de los registros operativos internos.
CREATE TABLE IF NOT EXISTS memoriales_web (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id    uuid REFERENCES terceros(id) ON DELETE SET NULL,
  sede_id       uuid REFERENCES sedes(id),
  nombre        varchar(150) NOT NULL,
  foto_url      text,
  tipo          varchar(20) NOT NULL DEFAULT 'NOVENARIO',
  fecha_evento  date NOT NULL,
  mensaje       text,
  activo        boolean NOT NULL DEFAULT true,
  creado_por    uuid REFERENCES usuarios(id),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_memorial_tipo CHECK (tipo IN ('NOVENARIO','ANIVERSARIO','MISA','OTRO'))
);

CREATE INDEX IF NOT EXISTS idx_memoriales_activo_fecha ON memoriales_web(activo, fecha_evento);

CREATE OR REPLACE FUNCTION actualizar_timestamp_memorial()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memoriales_ts ON memoriales_web;
CREATE TRIGGER trg_memoriales_ts BEFORE UPDATE ON memoriales_web
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_memorial();
