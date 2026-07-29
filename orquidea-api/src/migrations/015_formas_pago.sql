-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Configuración — Formas de Pago                      ║
-- ║  Archivo         : 015_formas_pago.sql                                 ║
-- ║  Fecha           : 2026-07-02                                          ║
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS formas_pago (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo      VARCHAR(40)  NOT NULL UNIQUE,   -- efectivo, nequi, daviplata, transferencia…
  nombre      VARCHAR(80)  NOT NULL,
  icono       VARCHAR(10)  NOT NULL DEFAULT '💳',
  requiere_referencia   BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_soporte      BOOLEAN NOT NULL DEFAULT FALSE,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       SMALLINT NOT NULL DEFAULT 99,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Formas de pago predeterminadas
INSERT INTO formas_pago (codigo, nombre, icono, requiere_referencia, requiere_soporte, orden) VALUES
  ('efectivo',      'Efectivo',          '💵', FALSE, FALSE, 1),
  ('nequi',         'Nequi',             '🟣', TRUE,  TRUE,  2),
  ('daviplata',     'Daviplata',         '🔴', TRUE,  TRUE,  3),
  ('transferencia', 'Transferencia bancaria', '🏦', TRUE, TRUE, 4),
  ('tarjeta',       'Tarjeta débito/crédito', '💳', TRUE, FALSE, 5),
  ('pse',           'PSE',               '🖥️', TRUE,  FALSE, 6),
  ('cheque',        'Cheque',            '📋', TRUE,  TRUE,  7),
  ('descuento_nomina','Descuento nómina','📄', FALSE, FALSE, 8)
ON CONFLICT (codigo) DO NOTHING;

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE formas_pago TO orquidea_user;
