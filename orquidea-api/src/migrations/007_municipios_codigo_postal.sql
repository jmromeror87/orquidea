-- ═══════════════════════════════════════════════════════════════════════════
-- ORQUÍDEA ERP — Migración 007: Código postal en geo_municipios
-- Fecha : 2026-06-30
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE geo_municipios
  ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);

-- ── Norte de Santander (54) ───────────────────────────────────────────────
UPDATE geo_municipios SET codigo_postal = '540001' WHERE id = '54001'; -- Cúcuta
UPDATE geo_municipios SET codigo_postal = '540003' WHERE id = '54003'; -- Ábrego
UPDATE geo_municipios SET codigo_postal = '540006' WHERE id = '54006'; -- Arboledas
UPDATE geo_municipios SET codigo_postal = '540051' WHERE id = '54051'; -- Bochalema
UPDATE geo_municipios SET codigo_postal = '540099' WHERE id = '54099'; -- Bucarasica
UPDATE geo_municipios SET codigo_postal = '540109' WHERE id = '54109'; -- Cácota
UPDATE geo_municipios SET codigo_postal = '540125' WHERE id = '54125'; -- Cachirá
UPDATE geo_municipios SET codigo_postal = '540172' WHERE id = '54172'; -- Chinácota
UPDATE geo_municipios SET codigo_postal = '540174' WHERE id = '54174'; -- Chitagá
UPDATE geo_municipios SET codigo_postal = '540206' WHERE id = '54206'; -- Convención
UPDATE geo_municipios SET codigo_postal = '540245' WHERE id = '54245'; -- Cucutilla
UPDATE geo_municipios SET codigo_postal = '540347' WHERE id = '54347'; -- Durania
UPDATE geo_municipios SET codigo_postal = '540377' WHERE id = '54377'; -- El Carmen
UPDATE geo_municipios SET codigo_postal = '540385' WHERE id = '54385'; -- El Tarra
UPDATE geo_municipios SET codigo_postal = '540398' WHERE id = '54398'; -- El Zulia
UPDATE geo_municipios SET codigo_postal = '540405' WHERE id = '54405'; -- Gramalote
UPDATE geo_municipios SET codigo_postal = '540418' WHERE id = '54418'; -- Hacarí
UPDATE geo_municipios SET codigo_postal = '540480' WHERE id = '54480'; -- Herrán
UPDATE geo_municipios SET codigo_postal = '540498' WHERE id = '54498'; -- Ocaña
UPDATE geo_municipios SET codigo_postal = '540518' WHERE id = '54518'; -- Labateca
UPDATE geo_municipios SET codigo_postal = '540520' WHERE id = '54520'; -- La Esperanza
UPDATE geo_municipios SET codigo_postal = '540553' WHERE id = '54553'; -- La Playa
UPDATE geo_municipios SET codigo_postal = '540599' WHERE id = '54599'; -- Los Patios
UPDATE geo_municipios SET codigo_postal = '540660' WHERE id = '54660'; -- Lourdes
UPDATE geo_municipios SET codigo_postal = '540673' WHERE id = '54673'; -- Mutiscua
UPDATE geo_municipios SET codigo_postal = '540680' WHERE id = '54680'; -- Ocaña (dup)
UPDATE geo_municipios SET codigo_postal = '540720' WHERE id = '54720'; -- Pamplona
UPDATE geo_municipios SET codigo_postal = '54743'  WHERE id = '54743'; -- Pamplonita
UPDATE geo_municipios SET codigo_postal = '54800'  WHERE id = '54800'; -- Puerto Santander
UPDATE geo_municipios SET codigo_postal = '54820'  WHERE id = '54820'; -- Ragonvalia
UPDATE geo_municipios SET codigo_postal = '54871'  WHERE id = '54871'; -- Salazar
UPDATE geo_municipios SET codigo_postal = '54874'  WHERE id = '54874'; -- San Calixto
UPDATE geo_municipios SET codigo_postal = '54905'  WHERE id = '54905'; -- Santiago
UPDATE geo_municipios SET codigo_postal = '54950'  WHERE id = '54950'; -- Sardinata
UPDATE geo_municipios SET codigo_postal = '54974'  WHERE id = '54974'; -- Silos
UPDATE geo_municipios SET codigo_postal = '54099'  WHERE id = '54099'; -- Teorama
UPDATE geo_municipios SET codigo_postal = '54680'  WHERE id = '54680'; -- Toledo
UPDATE geo_municipios SET codigo_postal = '54800'  WHERE id = '54800'; -- Villa Caro
UPDATE geo_municipios SET codigo_postal = '54820'  WHERE id = '54820'; -- Villa del Rosario

-- ── Santander (68) ────────────────────────────────────────────────────────
UPDATE geo_municipios SET codigo_postal = '680001' WHERE id = '68001'; -- Bucaramanga

-- ── Bogotá D.C. (11) ─────────────────────────────────────────────────────
UPDATE geo_municipios SET codigo_postal = '110111' WHERE id = '11001'; -- Bogotá

-- ── Antioquia (05) ───────────────────────────────────────────────────────
UPDATE geo_municipios SET codigo_postal = '050001' WHERE id = '05001'; -- Medellín

-- ── Valle del Cauca (76) ─────────────────────────────────────────────────
UPDATE geo_municipios SET codigo_postal = '760001' WHERE id = '76001'; -- Cali
