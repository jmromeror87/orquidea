-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 118 — Listas inteligentes (hospitales, médicos,      ║
-- ║                    iglesias, cementerios, coros, EPS, religiones,       ║
-- ║                    notarías)                                            ║
-- ║  Fecha           : 2026-10-20                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Campos que se escribían a mano (y quedaban "nuevaeps", "Nueva EPS", "NUEVA
-- E.P.S."…) ahora se eligen de una lista que se administra en Configuración →
-- Listas de valores, y se puede ampliar al vuelo desde el mismo campo.
-- `detalle` = dato adicional del valor (registro médico, dirección…).

ALTER TABLE listas_valores DROP CONSTRAINT IF EXISTS listas_valores_tipo_check;
ALTER TABLE listas_valores ADD CONSTRAINT listas_valores_tipo_check CHECK (tipo IN (
  'SEXO','ESTADO_CIVIL','OCUPACION','PARENTESCO','DOCUMENTO_SERVICIO',
  'HOSPITAL','MEDICO','IGLESIA','CEMENTERIO','CORO','EPS','RELIGION','NOTARIA'));
ALTER TABLE listas_valores ALTER COLUMN codigo TYPE VARCHAR(120);
ALTER TABLE listas_valores ALTER COLUMN etiqueta TYPE VARCHAR(150);
ALTER TABLE listas_valores ADD COLUMN IF NOT EXISTS detalle VARCHAR(200);

-- Inserta un valor si no existe uno equivalente (sin tildes ni mayúsculas)
CREATE OR REPLACE FUNCTION pg_temp.lv(p_tipo TEXT, p_etiqueta TEXT, p_detalle TEXT DEFAULT NULL, p_orden INT DEFAULT 0) RETURNS VOID AS $$
DECLARE et TEXT := btrim(regexp_replace(p_etiqueta, '\s+', ' ', 'g'));
BEGIN
  IF et IS NULL OR et = '' OR length(et) < 2 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM listas_valores WHERE tipo = p_tipo AND sin_tildes(lower(etiqueta)) = sin_tildes(lower(et))) THEN RETURN; END IF;
  INSERT INTO listas_valores (tipo, codigo, etiqueta, detalle, orden)
  VALUES (p_tipo, left(upper(regexp_replace(sin_tildes(et), '[^A-Za-z0-9]+', '_', 'g')), 120), et, NULLIF(btrim(p_detalle), ''), p_orden)
  ON CONFLICT (tipo, codigo) DO NOTHING;
END $$ LANGUAGE plpgsql;

-- EPS de Colombia (régimen contributivo, subsidiado, indígenas y especiales)
SELECT pg_temp.lv('EPS', x::text, NULL::text, n::int) FROM unnest(ARRAY[
  'Nueva EPS','EPS Sura','Sanitas EPS','Salud Total EPS','Compensar EPS','Famisanar EPS','Coosalud EPS',
  'Mutual Ser EPS','Emssanar EPS','Asmet Salud EPS','Savia Salud EPS','Capresoca EPS','Comfenalco Valle EPS',
  'Aliansalud EPS','Cajacopi Atlántico EPS','Capital Salud EPS','Comfaoriente EPS','Comfachocó EPS',
  'Comfaguajira EPS','Comfamiliar Huila EPS','Comfasucre EPS','Familiar de Colombia EPS',
  'Servicio Occidental de Salud (SOS)','Salud Mía EPS','Ecoopsos EPS',
  'Dusakawi EPSI','Anas Wayuu EPSI','Mallamas EPSI','Pijaos Salud EPSI','Asociación Indígena del Cauca (AIC) EPSI',
  'Fuerzas Militares (Sanidad Militar)','Policía Nacional (Sanidad Policial)','Magisterio (FOMAG)','Ecopetrol',
  'Universidad (régimen especial)','No afiliado'
]) WITH ORDINALITY AS t(x, n);

SELECT pg_temp.lv('RELIGION', x::text, NULL::text, n::int) FROM unnest(ARRAY[
  'Católica','Cristiana evangélica','Pentecostal','Iglesia Pentecostal Unida de Colombia','Adventista del Séptimo Día',
  'Testigo de Jehová','Bautista','Presbiteriana','Luterana','Anglicana','Metodista','Menonita','Cuadrangular',
  'Misión Carismática Internacional','Cristiana no denominacional','Ortodoxa',
  'Mormona (Santos de los Últimos Días)','Judía','Musulmana','Budista','Hinduista','Bahá''í','Hare Krishna',
  'Espiritista','Espiritualidad indígena','Religiones afrocolombianas','Agnóstica','Atea','Otra','Ninguna'
]) WITH ORDINALITY AS t(x, n);

-- Lo que ya está escrito en el sistema (con mayúscula inicial)
SELECT pg_temp.lv('MEDICO', v, r) FROM (SELECT initcap(lower(btrim(medico_certifica))) v, MAX(registro_medico)::text r
  FROM defunciones WHERE medico_certifica IS NOT NULL GROUP BY 1) s;
SELECT pg_temp.lv('HOSPITAL', v) FROM (SELECT DISTINCT initcap(lower(btrim(direccion_fallecimiento))) v
  FROM defunciones WHERE direccion_fallecimiento IS NOT NULL AND tipo_lugar IN ('HOSPITAL','CLINICA')) s;
SELECT pg_temp.lv('NOTARIA', v) FROM (SELECT DISTINCT initcap(lower(btrim(notaria))) v FROM defunciones WHERE notaria IS NOT NULL) s;
SELECT pg_temp.lv('IGLESIA', v) FROM (SELECT DISTINCT initcap(lower(btrim(iglesia))) v FROM servicios_funerarios WHERE iglesia IS NOT NULL) s;
SELECT pg_temp.lv('CORO', v) FROM (SELECT DISTINCT initcap(lower(btrim(coro))) v FROM servicios_funerarios WHERE coro IS NOT NULL) s;
SELECT pg_temp.lv('CEMENTERIO', v) FROM (SELECT DISTINCT initcap(lower(btrim(lugar_disposicion))) v FROM servicios_funerarios WHERE lugar_disposicion IS NOT NULL) s;
