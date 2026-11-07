-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 126 — Personal externo en los servicios             ║
-- ║  Fecha           : 2026-11-07                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Damas de cortejo, auxiliares de cafetería, última noche, asistencia… no son
-- usuarios del sistema: se registran como terceros con rol EMPLEADO y se
-- asignan al servicio con su turno y lo que se les paga (para liquidarles).
ALTER TABLE servicio_personal ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE servicio_personal ADD COLUMN IF NOT EXISTS tercero_id UUID REFERENCES terceros(id) ON DELETE CASCADE;
ALTER TABLE servicio_personal ADD COLUMN IF NOT EXISTS turno VARCHAR(150);
ALTER TABLE servicio_personal ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE servicio_personal ADD COLUMN IF NOT EXISTS migrado_pisco BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE servicio_personal DROP CONSTRAINT IF EXISTS ck_servicio_personal_persona;
ALTER TABLE servicio_personal ADD CONSTRAINT ck_servicio_personal_persona
  CHECK (usuario_id IS NOT NULL OR tercero_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_servicio_personal_tercero ON servicio_personal (tercero_id) WHERE tercero_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_servicio_personal_servicio ON servicio_personal (servicio_id);

-- Roles que maneja la funeraria (los de Pisco), con el valor que se paga hoy
INSERT INTO roles_personal_servicio (codigo, etiqueta, costo_interno, orden)
SELECT v.codigo, v.etiqueta, v.costo, v.orden FROM (VALUES
  ('Dama de Cortejo',      'Dama de Cortejo',      17000, 20),
  ('Auxiliar de Cafetería','Auxiliar de Cafetería',45500, 21),
  ('Última Noche',         'Última Noche',         14000, 22),
  ('Asistencia',           'Asistencia',           40000, 23),
  ('Oración y apoyo',      'Oración y apoyo',       3000, 24)
) AS v(codigo, etiqueta, costo, orden)
WHERE NOT EXISTS (SELECT 1 FROM roles_personal_servicio r WHERE r.codigo = v.codigo);
