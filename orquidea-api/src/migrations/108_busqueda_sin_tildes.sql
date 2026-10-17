-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Búsquedas sin importar tildes ni mayúsculas          ║
-- ║  Archivo         : 108_busqueda_sin_tildes.sql                          ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-17                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- "ana" encuentra "Ána", "peña" encuentra "Pena" y viceversa. No requiere la
-- extensión unaccent (que pide superusuario): translate() es suficiente para
-- el español. IMMUTABLE para poder indexarla si algún día hace falta.
CREATE OR REPLACE FUNCTION sin_tildes(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT lower(translate(coalesce(t, ''),
    'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç',
    'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc'))
$$;
GRANT EXECUTE ON FUNCTION sin_tildes(TEXT) TO orquidea_user;

-- busca(campo, texto): TODAS las palabras del texto aparecen en el campo, en
-- cualquier orden, sin importar tildes ni mayúsculas. El texto puede venir con
-- comodines (%juan%) como lo arman las consultas viejas: se ignoran.
--   busca('Luis Emiro Pacheco Cañizares', 'pacheco luis')  → true
CREATE OR REPLACE FUNCTION busca(campo TEXT, texto TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT COALESCE(bool_and(position(w IN sin_tildes(campo)) > 0), TRUE)
  FROM regexp_split_to_table(sin_tildes(btrim(coalesce(texto, ''), '% ')), '[\s%]+') AS w
  WHERE w <> ''
$$;
GRANT EXECUTE ON FUNCTION busca(TEXT, TEXT) TO orquidea_user;
