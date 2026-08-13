-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Convenios — paquetes de servicio vinculados          ║
-- ║                    (ej: "Servicio Inicial", "Servicio Final")           ║
-- ║  Archivo         : 068_convenio_paquetes.sql                            ║
-- ║  Fecha           : 2026-08-13                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS convenio_paquetes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  paquete_id  UUID NOT NULL REFERENCES paquetes_servicio(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_convenio_paquete UNIQUE (convenio_id, paquete_id)
);

CREATE INDEX IF NOT EXISTS idx_convenio_paquetes_convenio ON convenio_paquetes(convenio_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE convenio_paquetes TO orquidea_user;
