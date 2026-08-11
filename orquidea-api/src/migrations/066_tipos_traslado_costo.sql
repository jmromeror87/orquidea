-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Tipos de traslado — vínculo a ítem vendible del      ║
-- ║                    catálogo, para sugerir precio al registrar traslados ║
-- ║  Archivo         : 066_tipos_traslado_costo.sql                         ║
-- ║  Fecha           : 2026-08-12                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS tipos_traslado_config (
  tipo        VARCHAR(30) PRIMARY KEY CHECK (tipo IN ('RECOGIDA','SALA_VELACION','CEMENTERIO','CREMATORIO','OTRO')),
  catalogo_id UUID REFERENCES servicios_catalogo(id) ON DELETE SET NULL,
  actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tipos_traslado_config (tipo) VALUES
  ('RECOGIDA'), ('SALA_VELACION'), ('CEMENTERIO'), ('CREMATORIO'), ('OTRO')
ON CONFLICT (tipo) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tipos_traslado_config TO orquidea_user;
