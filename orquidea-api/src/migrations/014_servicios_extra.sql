-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Servicios — Tanatopraxia y Trámites                 ║
-- ║  Archivo         : 014_servicios_extra.sql                             ║
-- ║  Fecha           : 2026-07-02                                          ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── 1. Campos extra en servicios_funerarios ───────────────────────────────

ALTER TABLE servicios_funerarios
  ADD COLUMN IF NOT EXISTS poliza_id           UUID REFERENCES polizas(id),
  ADD COLUMN IF NOT EXISTS certificado_medico  VARCHAR(120),
  ADD COLUMN IF NOT EXISTS registro_civil      VARCHAR(120),
  ADD COLUMN IF NOT EXISTS checklist           JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Inicializar checklist con ítems por defecto en servicios existentes
UPDATE servicios_funerarios
SET checklist = '[
  {"id":"cert_medico",      "label":"Certificado médico de defunción",  "done":false},
  {"id":"acta_defuncion",   "label":"Acta de defunción (notaría)",       "done":false},
  {"id":"permiso_inh",      "label":"Permiso de inhumación / cremación", "done":false},
  {"id":"reg_civil",        "label":"Registro civil de defunción",       "done":false},
  {"id":"paz_salvo",        "label":"Paz y salvo municipal",             "done":false},
  {"id":"novedad_ss",       "label":"Novedad ante seguridad social",     "done":false}
]'::jsonb
WHERE checklist = '[]'::jsonb;

-- Migrar datos existentes: si acta_defuncion existe → marcar ítem done
UPDATE servicios_funerarios
SET checklist = (
  SELECT jsonb_agg(
    CASE
      WHEN item->>'id' = 'acta_defuncion' AND acta_defuncion IS NOT NULL
        THEN jsonb_set(item, '{done}', 'true')
      WHEN item->>'id' = 'permiso_inh' AND permiso_inhumacion IS NOT NULL
        THEN jsonb_set(item, '{done}', 'true')
      ELSE item
    END
  )
  FROM jsonb_array_elements(checklist) AS item
)
WHERE acta_defuncion IS NOT NULL OR permiso_inhumacion IS NOT NULL;

-- ── 2. Tabla de órdenes de tanatopraxia ──────────────────────────────────

CREATE TABLE IF NOT EXISTS ordenes_tanatopraxia (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id    UUID NOT NULL UNIQUE REFERENCES servicios_funerarios(id) ON DELETE CASCADE,
  tipo_servicio  VARCHAR(30) NOT NULL DEFAULT 'BASICA'
    CHECK (tipo_servicio IN ('BASICA','EMBALSAMAMIENTO','RESTAURACION','ESPECIAL')),
  estado         VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','EN_PROCESO','COMPLETADO')),
  responsable    VARCHAR(100),
  hora_inicio    TIMESTAMPTZ,
  hora_fin       TIMESTAMPTZ,
  materiales     TEXT,          -- materiales utilizados
  observaciones  TEXT,
  usuario_id     UUID REFERENCES usuarios(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Grants ─────────────────────────────────────────────────────────────

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE ordenes_tanatopraxia TO orquidea_user;
