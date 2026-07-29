-- ═══════════════════════════════════════════════════════════════════════════
-- ORQUÍDEA ERP — Migración 004: División política de Colombia
-- Módulo: Territorio (Departamentos → Municipios → Zonas/Barrios/Veredas)
-- Fecha : 2026-06-30
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tablas ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS geo_departamentos (
  id         CHAR(2)      PRIMARY KEY,        -- Código DANE 2 dígitos
  nombre     VARCHAR(100) NOT NULL,
  activo     BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_municipios (
  id               CHAR(5)      PRIMARY KEY,  -- Código DANE 5 dígitos
  departamento_id  CHAR(2)      NOT NULL REFERENCES geo_departamentos(id) ON DELETE CASCADE,
  nombre           VARCHAR(150) NOT NULL,
  activo           BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_zonas (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio_id  CHAR(5)      NOT NULL REFERENCES geo_municipios(id) ON DELETE CASCADE,
  nombre        VARCHAR(150) NOT NULL,
  tipo          VARCHAR(30)  NOT NULL DEFAULT 'BARRIO',  -- BARRIO, VEREDA, CORREGIMIENTO, SECTOR, COMUNA, INSPECCIÓN, URBANIZACIÓN
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(municipio_id, nombre, tipo)
);

CREATE INDEX IF NOT EXISTS idx_geo_municipios_dept ON geo_municipios(departamento_id);
CREATE INDEX IF NOT EXISTS idx_geo_zonas_mpio      ON geo_zonas(municipio_id);
CREATE INDEX IF NOT EXISTS idx_geo_zonas_tipo       ON geo_zonas(tipo);

-- ── Departamentos de Colombia (33) ──────────────────────────────────────────
INSERT INTO geo_departamentos (id, nombre) VALUES
  ('05','Antioquia'),
  ('08','Atlántico'),
  ('11','Bogotá D.C.'),
  ('13','Bolívar'),
  ('15','Boyacá'),
  ('17','Caldas'),
  ('18','Caquetá'),
  ('19','Cauca'),
  ('20','Cesar'),
  ('23','Córdoba'),
  ('25','Cundinamarca'),
  ('27','Chocó'),
  ('41','Huila'),
  ('44','La Guajira'),
  ('47','Magdalena'),
  ('50','Meta'),
  ('52','Nariño'),
  ('54','Norte de Santander'),
  ('63','Quindío'),
  ('66','Risaralda'),
  ('68','Santander'),
  ('70','Sucre'),
  ('73','Tolima'),
  ('76','Valle del Cauca'),
  ('81','Arauca'),
  ('85','Casanare'),
  ('86','Putumayo'),
  ('88','San Andrés y Providencia'),
  ('91','Amazonas'),
  ('94','Guainía'),
  ('95','Guaviare'),
  ('97','Vaupés'),
  ('99','Vichada')
ON CONFLICT (id) DO NOTHING;

-- ── Municipios ───────────────────────────────────────────────────────────────

-- AMAZONAS (91) — 11 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('91001','91','Leticia'),('91263','91','El Encanto'),('91405','91','La Chorrera'),
  ('91407','91','La Pedrera'),('91430','91','La Victoria'),('91460','91','Mirití-Paraná'),
  ('91530','91','Puerto Alegría'),('91536','91','Puerto Arica'),('91540','91','Puerto Nariño'),
  ('91669','91','Puerto Santander'),('91798','91','Tarapacá')
ON CONFLICT (id) DO NOTHING;

-- ANTIOQUIA (05) — 125 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('05001','05','Medellín'),('05002','05','Abejorral'),('05004','05','Abriaquí'),
  ('05021','05','Alejandría'),('05030','05','Amagá'),('05031','05','Amalfi'),
  ('05034','05','Andes'),('05036','05','Angelópolis'),('05038','05','Angostura'),
  ('05040','05','Anorí'),('05042','05','Santafé de Antioquia'),('05044','05','Anzá'),
  ('05045','05','Apartadó'),('05051','05','Arboletes'),('05055','05','Argelia'),
  ('05059','05','Armenia'),('05079','05','Barbosa'),('05086','05','Belmira'),
  ('05088','05','Bello'),('05091','05','Betania'),('05093','05','Betulia'),
  ('05101','05','Ciudad Bolívar'),('05107','05','Briceño'),('05113','05','Buriticá'),
  ('05120','05','Cáceres'),('05125','05','Caicedo'),('05129','05','Caldas'),
  ('05134','05','Campamento'),('05138','05','Cañasgordas'),('05142','05','Caracolí'),
  ('05145','05','Caramanta'),('05147','05','Carepa'),('05148','05','El Carmen de Viboral'),
  ('05150','05','Carolina'),('05154','05','Caucasia'),('05172','05','Chigorodó'),
  ('05190','05','Cisneros'),('05197','05','Cocorná'),('05206','05','Concepción'),
  ('05209','05','Concordia'),('05212','05','Copacabana'),('05234','05','Dabeiba'),
  ('05237','05','Don Matías'),('05240','05','Ebéjico'),('05250','05','El Bagre'),
  ('05264','05','Entrerríos'),('05266','05','Envigado'),('05282','05','Fredonia'),
  ('05284','05','Frontino'),('05306','05','Giraldo'),('05308','05','Girardota'),
  ('05310','05','Gómez Plata'),('05313','05','Granada'),('05315','05','Guadalupe'),
  ('05318','05','Guarne'),('05321','05','Guatapé'),('05347','05','Heliconia'),
  ('05353','05','Hispania'),('05360','05','Itagüí'),('05361','05','Ituango'),
  ('05364','05','Jardín'),('05368','05','Jericó'),('05376','05','La Ceja'),
  ('05380','05','La Estrella'),('05390','05','La Pintada'),('05400','05','La Unión'),
  ('05411','05','Liborina'),('05425','05','Maceo'),('05440','05','Marinilla'),
  ('05467','05','Montebello'),('05475','05','Murindó'),('05480','05','Mutatá'),
  ('05483','05','Nariño'),('05490','05','Necoclí'),('05495','05','Nechí'),
  ('05501','05','Olaya'),('05541','05','Peñol'),('05543','05','Peque'),
  ('05576','05','Pueblorrico'),('05579','05','Puerto Berrío'),('05585','05','Puerto Nare'),
  ('05591','05','Puerto Triunfo'),('05604','05','Remedios'),('05607','05','Retiro'),
  ('05615','05','Rionegro'),('05628','05','Sabanalarga'),('05631','05','Sabaneta'),
  ('05642','05','Salgar'),('05647','05','San Andrés de Cuerquia'),('05649','05','San Carlos'),
  ('05652','05','San Francisco'),('05656','05','San Jerónimo'),('05658','05','San José de la Montaña'),
  ('05659','05','San Juan de Urabá'),('05660','05','San Luis'),('05664','05','San Pedro de los Milagros'),
  ('05665','05','San Pedro de Urabá'),('05667','05','San Rafael'),('05670','05','San Roque'),
  ('05674','05','San Vicente Ferrer'),('05679','05','Santa Bárbara'),('05686','05','Santa Rosa de Osos'),
  ('05690','05','Santo Domingo'),('05697','05','El Santuario'),('05736','05','Segovia'),
  ('05756','05','Sonsón'),('05761','05','Sopetrán'),('05789','05','Támesis'),
  ('05790','05','Tarazá'),('05792','05','Tarso'),('05809','05','Titiribí'),
  ('05819','05','Toledo'),('05837','05','Turbo'),('05842','05','Uramita'),
  ('05847','05','Urrao'),('05854','05','Valdivia'),('05856','05','Valparaíso'),
  ('05858','05','Vegachí'),('05861','05','Venecia'),('05873','05','Vigía del Fuerte'),
  ('05885','05','Yalí'),('05887','05','Yarumal'),('05890','05','Yolombó'),
  ('05893','05','Yondó'),('05895','05','Zaragoza')
ON CONFLICT (id) DO NOTHING;

-- ATLÁNTICO (08) — 23 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('08001','08','Barranquilla'),('08078','08','Baranoa'),('08137','08','Campo de la Cruz'),
  ('08141','08','Candelaria'),('08296','08','Galapa'),('08372','08','Juan de Acosta'),
  ('08421','08','Luruaco'),('08433','08','Malambo'),('08436','08','Manatí'),
  ('08520','08','Palmar de Varela'),('08549','08','Piojó'),('08558','08','Polonuevo'),
  ('08560','08','Ponedera'),('08573','08','Puerto Colombia'),('08606','08','Repelón'),
  ('08634','08','Sabanagrande'),('08638','08','Sabanalarga'),('08675','08','Santa Lucía'),
  ('08685','08','Santo Tomás'),('08758','08','Soledad'),('08770','08','Suan'),
  ('08832','08','Tubará'),('08849','08','Usiacurí')
ON CONFLICT (id) DO NOTHING;

-- BOGOTÁ D.C. (11)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('11001','11','Bogotá D.C.')
ON CONFLICT (id) DO NOTHING;

-- BOLÍVAR (13) — 46 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('13001','13','Cartagena'),('13006','13','Achí'),('13030','13','Altos del Rosario'),
  ('13042','13','Arenal'),('13052','13','Arjona'),('13062','13','Arroyohondo'),
  ('13074','13','Barranco de Loba'),('13140','13','Calamar'),('13160','13','Cantagallo'),
  ('13188','13','Cicuco'),('13212','13','Córdoba'),('13222','13','Clemencia'),
  ('13244','13','El Carmen de Bolívar'),('13248','13','El Guamo'),('13268','13','El Peñón'),
  ('13300','13','Hatillo de Loba'),('13430','13','Magangué'),('13433','13','Mahates'),
  ('13440','13','Margarita'),('13442','13','María la Baja'),('13458','13','Montecristo'),
  ('13468','13','Mompós'),('13473','13','Morales'),('13490','13','Norosí'),
  ('13549','13','Pinillos'),('13580','13','Regidor'),('13600','13','Río Viejo'),
  ('13620','13','San Cristóbal'),('13647','13','San Estanislao'),('13650','13','San Fernando'),
  ('13654','13','San Jacinto'),('13655','13','San Jacinto del Cauca'),('13657','13','San Juan Nepomuceno'),
  ('13667','13','San Martín de Loba'),('13670','13','San Pablo'),('13673','13','Santa Catalina'),
  ('13683','13','Santa Rosa'),('13688','13','Santa Rosa del Sur'),('13744','13','Simití'),
  ('13760','13','Soplaviento'),('13780','13','Talaigua Nuevo'),('13810','13','Tiquisio'),
  ('13836','13','Turbaco'),('13838','13','Turbaná'),('13873','13','Villanueva'),
  ('13894','13','Zambrano')
ON CONFLICT (id) DO NOTHING;

-- BOYACÁ (15) — 123 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('15001','15','Tunja'),('15022','15','Almeida'),('15047','15','Aquitania'),
  ('15051','15','Arcabuco'),('15087','15','Belén'),('15090','15','Berbeo'),
  ('15092','15','Betéitiva'),('15097','15','Boavita'),('15104','15','Boyacá'),
  ('15106','15','Briceño'),('15109','15','Buenavista'),('15114','15','Busbanzá'),
  ('15131','15','Caldas'),('15135','15','Campohermoso'),('15162','15','Cerinza'),
  ('15172','15','Chinavita'),('15176','15','Chiquinquirá'),('15180','15','Chiscas'),
  ('15183','15','Chita'),('15185','15','Chitaraque'),('15187','15','Chivatá'),
  ('15189','15','Ciénega'),('15204','15','Cómbita'),('15212','15','Coper'),
  ('15215','15','Corrales'),('15218','15','Covarachía'),('15223','15','Cubará'),
  ('15224','15','Cucaita'),('15226','15','Cuítiva'),('15232','15','Chíquiza'),
  ('15236','15','Chivor'),('15238','15','Duitama'),('15244','15','El Cocuy'),
  ('15248','15','El Espino'),('15272','15','Firavitoba'),('15276','15','Floresta'),
  ('15293','15','Gachantivá'),('15296','15','Gámeza'),('15299','15','Garagoa'),
  ('15317','15','Guacamayas'),('15322','15','Guateque'),('15325','15','Guayatá'),
  ('15332','15','Güicán'),('15362','15','Iza'),('15367','15','Jenesano'),
  ('15368','15','Jericó'),('15377','15','Labranzagrande'),('15380','15','La Capilla'),
  ('15401','15','La Victoria'),('15403','15','La Uvita'),('15407','15','Villa de Leyva'),
  ('15425','15','Macanal'),('15442','15','Maripí'),('15455','15','Miraflores'),
  ('15464','15','Mongua'),('15466','15','Monguí'),('15469','15','Moniquirá'),
  ('15476','15','Motavita'),('15480','15','Muzo'),('15491','15','Nobsa'),
  ('15494','15','Nuevo Colón'),('15500','15','Oicatá'),('15507','15','Otanche'),
  ('15511','15','Pachavita'),('15514','15','Páez'),('15516','15','Paipa'),
  ('15518','15','Pajarito'),('15522','15','Panqueba'),('15531','15','Pauna'),
  ('15533','15','Paya'),('15537','15','Paz de Río'),('15542','15','Pesca'),
  ('15550','15','Pisba'),('15572','15','Puerto Boyacá'),('15580','15','Quípama'),
  ('15599','15','Ramiriquí'),('15600','15','Ráquira'),('15621','15','Rondón'),
  ('15632','15','Saboyá'),('15638','15','Sáchica'),('15646','15','Samacá'),
  ('15660','15','San Eduardo'),('15664','15','San José de Pare'),('15667','15','San Luis de Gaceno'),
  ('15673','15','San Mateo'),('15676','15','San Miguel de Sema'),('15681','15','San Pablo de Borbur'),
  ('15686','15','Santana'),('15690','15','Santa María'),('15693','15','Santa Rosa de Viterbo'),
  ('15696','15','Santa Sofía'),('15720','15','Sativasur'),('15723','15','Sativanorte'),
  ('15740','15','Siachoque'),('15753','15','Soatá'),('15755','15','Socotá'),
  ('15757','15','Socha'),('15759','15','Sogamoso'),('15761','15','Somondoco'),
  ('15762','15','Sora'),('15763','15','Sotaquirá'),('15764','15','Soracá'),
  ('15774','15','Susacón'),('15776','15','Sutamarchán'),('15778','15','Sutatenza'),
  ('15790','15','Tasco'),('15798','15','Tenza'),('15804','15','Tibaná'),
  ('15808','15','Tinjacá'),('15810','15','Tipacoque'),('15814','15','Toca'),
  ('15816','15','Togüí'),('15820','15','Tópaga'),('15822','15','Tota'),
  ('15835','15','Turmequé'),('15837','15','Tuta'),('15839','15','Tutazá'),
  ('15842','15','Úmbita'),('15861','15','Ventaquemada'),('15879','15','Viracachá'),
  ('15897','15','Zetaquira')
ON CONFLICT (id) DO NOTHING;

-- CALDAS (17) — 27 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('17001','17','Manizales'),('17013','17','Aguadas'),('17042','17','Anserma'),
  ('17050','17','Aranzazu'),('17088','17','Belalcázar'),('17174','17','Chinchiná'),
  ('17272','17','Filadelfia'),('17380','17','La Dorada'),('17388','17','La Merced'),
  ('17433','17','Manzanares'),('17442','17','Marmato'),('17444','17','Marquetalia'),
  ('17446','17','Marulanda'),('17486','17','Neira'),('17495','17','Norcasia'),
  ('17513','17','Pácora'),('17524','17','Palestina'),('17541','17','Pensilvania'),
  ('17616','17','Riosucio'),('17653','17','Risaralda'),('17662','17','Salamina'),
  ('17665','17','Samaná'),('17777','17','San José'),('17867','17','Supía'),
  ('17873','17','Victoria'),('17877','17','Villamaría'),('17878','17','Viterbo')
ON CONFLICT (id) DO NOTHING;

-- CAQUETÁ (18) — 16 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('18001','18','Florencia'),('18029','18','Albania'),('18094','18','Belén de los Andaquíes'),
  ('18150','18','Cartagena del Chairá'),('18205','18','Curillo'),('18247','18','El Doncello'),
  ('18256','18','El Paujil'),('18410','18','La Montañita'),('18460','18','Milán'),
  ('18479','18','Morelia'),('18592','18','Puerto Rico'),('18610','18','San José del Fragua'),
  ('18753','18','San Vicente del Caguán'),('18756','18','Solano'),('18785','18','Solita'),
  ('18860','18','Valparaíso')
ON CONFLICT (id) DO NOTHING;

-- CAUCA (19) — 42 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('19001','19','Popayán'),('19022','19','Almaguer'),('19050','19','Argelia'),
  ('19075','19','Balboa'),('19100','19','Bolívar'),('19110','19','Buenos Aires'),
  ('19130','19','Cajibío'),('19137','19','Caldono'),('19142','19','Caloto'),
  ('19212','19','Corinto'),('19256','19','El Tambo'),('19290','19','Florencia'),
  ('19300','19','Guachené'),('19318','19','Guapi'),('19355','19','Inzá'),
  ('19364','19','Jambaló'),('19392','19','La Sierra'),('19397','19','La Vega'),
  ('19418','19','López de Micay'),('19450','19','Mercaderes'),('19455','19','Miranda'),
  ('19473','19','Morales'),('19513','19','Padilla'),('19517','19','Páez'),
  ('19532','19','Patía'),('19533','19','Piamonte'),('19548','19','Piendamó'),
  ('19573','19','Puerto Tejada'),('19585','19','Puracé'),('19622','19','Rosas'),
  ('19693','19','San Sebastián'),('19698','19','Santander de Quilichao'),('19701','19','Santa Rosa'),
  ('19743','19','Silvia'),('19760','19','Sotará'),('19780','19','Suárez'),
  ('19785','19','Sucre'),('19807','19','Timbío'),('19809','19','Timbiquí'),
  ('19821','19','Toribío'),('19824','19','Totoró'),('19845','19','Villa Rica')
ON CONFLICT (id) DO NOTHING;

-- CESAR (20) — 25 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('20001','20','Valledupar'),('20011','20','Aguachica'),('20013','20','Agustín Codazzi'),
  ('20032','20','Astrea'),('20045','20','Becerril'),('20060','20','Bosconia'),
  ('20175','20','Chimichagua'),('20178','20','Chiriguaná'),('20228','20','Curumaní'),
  ('20238','20','El Copey'),('20250','20','El Paso'),('20295','20','Gamarra'),
  ('20310','20','González'),('20383','20','La Gloria'),('20400','20','La Jagua de Ibirico'),
  ('20443','20','Manaure Balcón del Cesar'),('20517','20','Pailitas'),('20550','20','Pelaya'),
  ('20570','20','Pueblo Bello'),('20614','20','Río de Oro'),('20621','20','La Paz'),
  ('20710','20','San Alberto'),('20750','20','San Diego'),('20770','20','San Martín'),
  ('20787','20','Tamalameque')
ON CONFLICT (id) DO NOTHING;

-- CHOCÓ (27) — 30 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('27001','27','Quibdó'),('27006','27','Acandí'),('27025','27','Alto Baudó'),
  ('27050','27','Atrato'),('27073','27','Bagadó'),('27075','27','Bahía Solano'),
  ('27077','27','Bajo Baudó'),('27099','27','Bojayá'),('27135','27','El Cantón del San Pablo'),
  ('27150','27','Carmen del Darién'),('27160','27','Cértegui'),('27205','27','Condoto'),
  ('27245','27','El Carmen de Atrato'),('27250','27','El Litoral del San Juan'),('27361','27','Istmina'),
  ('27372','27','Juradó'),('27413','27','Lloró'),('27425','27','Medio Atrato'),
  ('27430','27','Medio Baudó'),('27450','27','Medio San Juan'),('27491','27','Nóvita'),
  ('27495','27','Nuquí'),('27580','27','Río Iro'),('27600','27','Río Quito'),
  ('27615','27','Riosucio'),('27660','27','San José del Palmar'),('27745','27','Sipí'),
  ('27787','27','Tadó'),('27800','27','Unguía'),('27810','27','Unión Panamericana')
ON CONFLICT (id) DO NOTHING;

-- CÓRDOBA (23) — 30 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('23001','23','Montería'),('23068','23','Ayapel'),('23079','23','Buenavista'),
  ('23090','23','Canalete'),('23162','23','Cereté'),('23168','23','Chimá'),
  ('23182','23','Chinú'),('23189','23','Ciénaga de Oro'),('23300','23','Cotorra'),
  ('23350','23','La Apartada'),('23417','23','Lorica'),('23419','23','Los Córdobas'),
  ('23464','23','Momil'),('23466','23','Montelíbano'),('23500','23','Moñitos'),
  ('23555','23','Planeta Rica'),('23570','23','Pueblo Nuevo'),('23574','23','Puerto Escondido'),
  ('23580','23','Puerto Libertador'),('23586','23','Purísima'),('23660','23','Sahagún'),
  ('23670','23','San Andrés de Sotavento'),('23672','23','San Antero'),('23675','23','San Bernardo del Viento'),
  ('23678','23','San Carlos'),('23682','23','San José de Uré'),('23686','23','San Pelayo'),
  ('23770','23','Tierralta'),('23807','23','Tuchín'),('23855','23','Valencia')
ON CONFLICT (id) DO NOTHING;

-- CUNDINAMARCA (25) — 116 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('25001','25','Agua de Dios'),('25019','25','Albán'),('25035','25','Anapoima'),
  ('25040','25','Anolaima'),('25053','25','Arbeláez'),('25086','25','Beltrán'),
  ('25095','25','Bituima'),('25099','25','Bojacá'),('25120','25','Cabrera'),
  ('25123','25','Cachipay'),('25126','25','Cajicá'),('25148','25','Caparrapí'),
  ('25151','25','Cáqueza'),('25154','25','Carmen de Carupa'),('25168','25','Chaguaní'),
  ('25175','25','Chía'),('25178','25','Chipaque'),('25181','25','Choachí'),
  ('25183','25','Chocontá'),('25200','25','Cogua'),('25214','25','Cota'),
  ('25224','25','Cucunubá'),('25245','25','El Colegio'),('25258','25','El Peñón'),
  ('25260','25','El Rosal'),('25269','25','Facatativá'),('25279','25','Fómeque'),
  ('25281','25','Fosca'),('25286','25','Funza'),('25288','25','Fúquene'),
  ('25290','25','Fusagasugá'),('25293','25','Gachalá'),('25295','25','Gachancipá'),
  ('25297','25','Gachetá'),('25299','25','Gama'),('25307','25','Girardot'),
  ('25312','25','Granada'),('25317','25','Guachetá'),('25320','25','Guaduas'),
  ('25322','25','Guasca'),('25324','25','Guataquí'),('25326','25','Guatavita'),
  ('25328','25','Guayabal de Síquima'),('25335','25','Guayabetal'),('25339','25','Gutiérrez'),
  ('25368','25','Jerusalén'),('25372','25','Junín'),('25377','25','La Calera'),
  ('25386','25','La Mesa'),('25394','25','La Palma'),('25398','25','La Peña'),
  ('25402','25','La Vega'),('25407','25','Lenguazaque'),('25426','25','Macheta'),
  ('25430','25','Madrid'),('25436','25','Manta'),('25438','25','Medina'),
  ('25473','25','Mosquera'),('25483','25','Nariño'),('25486','25','Nemocón'),
  ('25488','25','Nilo'),('25489','25','Nimaima'),('25491','25','Nocaima'),
  ('25506','25','Venecia'),('25513','25','Pacho'),('25518','25','Paime'),
  ('25524','25','Pandi'),('25530','25','Paratebueno'),('25535','25','Pasca'),
  ('25572','25','Puerto Salgar'),('25580','25','Pulí'),('25592','25','Quebradanegra'),
  ('25594','25','Quetame'),('25596','25','Quipile'),('25599','25','Apulo'),
  ('25612','25','Ricaurte'),('25645','25','San Antonio del Tequendama'),('25649','25','San Bernardo'),
  ('25653','25','San Cayetano'),('25658','25','San Francisco'),('25662','25','San Juan de Río Seco'),
  ('25718','25','Sasaima'),('25736','25','Sesquilé'),('25740','25','Sibaté'),
  ('25743','25','Silvania'),('25745','25','Simijaca'),('25754','25','Soacha'),
  ('25758','25','Sopó'),('25769','25','Subachoque'),('25772','25','Suesca'),
  ('25777','25','Supatá'),('25779','25','Susa'),('25781','25','Sutatausa'),
  ('25785','25','Tabio'),('25793','25','Tausa'),('25797','25','Tena'),
  ('25799','25','Tenjo'),('25805','25','Tibacuy'),('25807','25','Tibirita'),
  ('25815','25','Tocaima'),('25817','25','Tocancipá'),('25823','25','Topaipí'),
  ('25839','25','Ubalá'),('25841','25','Ubaque'),('25843','25','Ubaté'),
  ('25845','25','Une'),('25851','25','Útica'),('25862','25','Vergara'),
  ('25867','25','Vianí'),('25875','25','Villeta'),('25878','25','Viotá'),
  ('25885','25','Yacopí'),('25898','25','Zipacón'),('25899','25','Zipaquirá')
ON CONFLICT (id) DO NOTHING;

-- GUAINÍA (94)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('94001','94','Inírida'),('94343','94','Barranco Minas'),('94663','94','Mapiripana'),
  ('94883','94','San Felipe'),('94884','94','Puerto Colombia'),('94885','94','La Guadalupe'),
  ('94886','94','Cacahual'),('94887','94','Pana Pana'),('94888','94','Morichal Nuevo')
ON CONFLICT (id) DO NOTHING;

-- GUAVIARE (95)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('95001','95','San José del Guaviare'),('95015','95','Calamar'),
  ('95025','95','El Retorno'),('95200','95','Miraflores')
ON CONFLICT (id) DO NOTHING;

-- HUILA (41) — 37 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('41001','41','Neiva'),('41006','41','Acevedo'),('41013','41','Agrado'),
  ('41016','41','Aipe'),('41020','41','Algeciras'),('41026','41','Altamira'),
  ('41078','41','Baraya'),('41132','41','Campoalegre'),('41206','41','Colombia'),
  ('41244','41','Elías'),('41298','41','Garzón'),('41306','41','Gigante'),
  ('41319','41','Guadalupe'),('41349','41','Hobo'),('41357','41','Iquira'),
  ('41359','41','Isnos'),('41378','41','La Argentina'),('41396','41','La Plata'),
  ('41483','41','Nátaga'),('41503','41','Oporapa'),('41518','41','Paicol'),
  ('41524','41','Palermo'),('41530','41','Palestina'),('41548','41','Pital'),
  ('41551','41','Pitalito'),('41615','41','Rivera'),('41660','41','Saladoblanco'),
  ('41668','41','San Agustín'),('41676','41','Santa María'),('41770','41','Suaza'),
  ('41791','41','Tarqui'),('41797','41','Tesalia'),('41799','41','Tello'),
  ('41801','41','Teruel'),('41807','41','Timaná'),('41872','41','Villavieja'),
  ('41885','41','Yaguará')
ON CONFLICT (id) DO NOTHING;

-- LA GUAJIRA (44) — 15 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('44001','44','Riohacha'),('44035','44','Albania'),('44078','44','Barrancas'),
  ('44090','44','Dibulla'),('44098','44','Distracción'),('44110','44','El Molino'),
  ('44143','44','Fonseca'),('44188','44','Hatonuevo'),('44378','44','Maicao'),
  ('44420','44','Manaure'),('44430','44','La Jagua del Pilar'),('44560','44','San Juan del Cesar'),
  ('44650','44','Uribia'),('44847','44','Urumita'),('44855','44','Villanueva')
ON CONFLICT (id) DO NOTHING;

-- MAGDALENA (47) — 30 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('47001','47','Santa Marta'),('47030','47','Algarrobo'),('47053','47','Aracataca'),
  ('47058','47','Ariguaní'),('47161','47','Cerro de San Antonio'),('47170','47','Chivolo'),
  ('47189','47','Ciénaga'),('47205','47','Concordia'),('47245','47','El Banco'),
  ('47258','47','El Piñón'),('47268','47','El Retén'),('47288','47','Fundación'),
  ('47318','47','Guamal'),('47460','47','Nueva Granada'),('47541','47','Pedraza'),
  ('47545','47','Pijiño del Carmen'),('47551','47','Pivijay'),('47555','47','Plato'),
  ('47570','47','Puebloviejo'),('47605','47','Remolino'),('47660','47','Sabanas de San Ángel'),
  ('47675','47','Salamina'),('47703','47','San Sebastián de Buenavista'),('47707','47','San Zenón'),
  ('47720','47','Santa Ana'),('47745','47','Santa Bárbara de Pinto'),('47798','47','Sitionuevo'),
  ('47960','47','Tenerife'),('47980','47','Zapayán'),('47001','47','Zona Bananera')
ON CONFLICT (id) DO NOTHING;

-- META (50) — 29 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('50001','50','Villavicencio'),('50006','50','Acacías'),('50110','50','Barranca de Upía'),
  ('50124','50','Cabuyaro'),('50150','50','Castilla la Nueva'),('50223','50','Cubarral'),
  ('50226','50','Cumaral'),('50245','50','El Calvario'),('50251','50','El Castillo'),
  ('50270','50','El Dorado'),('50287','50','Fuente de Oro'),('50313','50','Granada'),
  ('50318','50','Guamal'),('50325','50','Mapiripán'),('50330','50','Mesetas'),
  ('50350','50','La Macarena'),('50370','50','Uribe'),('50400','50','Lejanías'),
  ('50450','50','Puerto Concordia'),('50568','50','Puerto Gaitán'),('50573','50','Puerto Lleras'),
  ('50577','50','Puerto López'),('50590','50','Puerto Rico'),('50606','50','Restrepo'),
  ('50680','50','San Carlos de Guaroa'),('50683','50','San Juan de Arama'),('50686','50','San Juanito'),
  ('50689','50','San Martín'),('50711','50','Vistahermosa')
ON CONFLICT (id) DO NOTHING;

-- NARIÑO (52) — 64 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('52001','52','Pasto'),('52019','52','Albán'),('52022','52','Aldana'),
  ('52036','52','Ancuya'),('52051','52','Arboleda'),('52079','52','Barbacoas'),
  ('52083','52','Belén'),('52110','52','Buesaco'),('52203','52','Colón'),
  ('52207','52','Consacá'),('52210','52','Contadero'),('52215','52','Córdoba'),
  ('52224','52','Cuaspud'),('52227','52','Cumbal'),('52233','52','Cumbitara'),
  ('52240','52','El Charco'),('52250','52','El Peñol'),('52254','52','El Rosario'),
  ('52256','52','El Tablón de Gómez'),('52258','52','El Tambo'),('52286','52','Funes'),
  ('52320','52','Guachucal'),('52323','52','Guaitarilla'),('52325','52','Gualmatán'),
  ('52354','52','Iles'),('52356','52','Imués'),('52378','52','Ipiales'),
  ('52381','52','La Cruz'),('52385','52','La Florida'),('52390','52','La Llanada'),
  ('52399','52','La Tola'),('52405','52','La Unión'),('52411','52','Leiva'),
  ('52418','52','Linares'),('52427','52','Los Andes'),('52435','52','Magüí'),
  ('52436','52','Mallama'),('52490','52','Mosquera'),('52506','52','Nariño'),
  ('52520','52','Olaya Herrera'),('52540','52','Ospina'),('52560','52','Francisco Pizarro'),
  ('52565','52','Policarpa'),('52573','52','Potosí'),('52585','52','Providencia'),
  ('52612','52','Puerres'),('52621','52','Pupiales'),('52678','52','Ricaurte'),
  ('52683','52','Roberto Payán'),('52685','52','Samaniego'),('52687','52','Sandoná'),
  ('52693','52','San Bernardo'),('52694','52','San Lorenzo'),('52696','52','San Pablo'),
  ('52699','52','San Pedro de Cartago'),('52720','52','Santa Bárbara'),('52786','52','Santacruz'),
  ('52788','52','Sapuyes'),('52835','52','Taminango'),('52838','52','Tangua'),
  ('52885','52','Tumaco'),('52890','52','Túquerres'),('52905','52','Yacuanquer'),
  ('52473','52','Mosquera')
ON CONFLICT (id) DO NOTHING;

-- NORTE DE SANTANDER (54) — 40 municipios ★ (donde opera la funeraria)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('54001','54','Cúcuta'),('54003','54','Ábrego'),('54006','54','Arboledas'),
  ('54051','54','Bochalema'),('54099','54','Bucarasica'),('54109','54','Cáchira'),
  ('54125','54','Cácota'),('54172','54','Chinácota'),('54174','54','Chitagá'),
  ('54206','54','Convención'),('54223','54','Cucutilla'),('54239','54','Durania'),
  ('54245','54','El Carmen'),('54250','54','El Tarra'),('54261','54','El Zulia'),
  ('54313','54','Gramalote'),('54344','54','Hacarí'),('54347','54','Herrán'),
  ('54377','54','Labateca'),('54385','54','La Esperanza'),('54398','54','La Playa de Belén'),
  ('54405','54','Los Patios'),('54418','54','Lourdes'),('54480','54','Mutiscua'),
  ('54498','54','Ocaña'),('54518','54','Pamplona'),('54520','54','Pamplonita'),
  ('54553','54','Puerto Santander'),('54599','54','Ragonvalia'),('54660','54','Salazar'),
  ('54670','54','San Calixto'),('54673','54','San Cayetano'),('54680','54','Santiago'),
  ('54720','54','Sardinata'),('54743','54','Silos'),('54800','54','Teorama'),
  ('54810','54','Tibú'),('54820','54','Toledo'),('54874','54','Villa Caro'),
  ('54905','54','Villa del Rosario')
ON CONFLICT (id) DO NOTHING;

-- PUTUMAYO (86) — 13 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('86001','86','Mocoa'),('86219','86','Colón'),('86320','86','Orito'),
  ('86568','86','Puerto Asís'),('86569','86','Puerto Caicedo'),('86571','86','Puerto Guzmán'),
  ('86573','86','Puerto Leguízamo'),('86749','86','Sibundoy'),('86755','86','San Francisco'),
  ('86757','86','San Miguel'),('86760','86','Santiago'),('86865','86','Valle del Guamuez'),
  ('86885','86','Villagarzón')
ON CONFLICT (id) DO NOTHING;

-- QUINDÍO (63) — 12 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('63001','63','Armenia'),('63111','63','Buenavista'),('63130','63','Calarcá'),
  ('63190','63','Circasia'),('63212','63','Córdoba'),('63272','63','Filandia'),
  ('63302','63','Génova'),('63401','63','La Tebaida'),('63470','63','Montenegro'),
  ('63548','63','Pijao'),('63594','63','Quimbaya'),('63690','63','Salento')
ON CONFLICT (id) DO NOTHING;

-- RISARALDA (66) — 14 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('66001','66','Pereira'),('66045','66','Apía'),('66075','66','Balboa'),
  ('66088','66','Belén de Umbría'),('66170','66','Dosquebradas'),('66318','66','Guática'),
  ('66383','66','La Celia'),('66400','66','La Virginia'),('66440','66','Marsella'),
  ('66456','66','Mistrató'),('66572','66','Pueblo Rico'),('66594','66','Quinchía'),
  ('66682','66','Santa Rosa de Cabal'),('66687','66','Santuario')
ON CONFLICT (id) DO NOTHING;

-- SAN ANDRÉS Y PROVIDENCIA (88)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('88001','88','San Andrés'),('88564','88','Providencia')
ON CONFLICT (id) DO NOTHING;

-- SANTANDER (68) — 87 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('68001','68','Bucaramanga'),('68013','68','Aguada'),('68020','68','Albania'),
  ('68051','68','Aratoca'),('68077','68','Barbosa'),('68079','68','Barichara'),
  ('68081','68','Barrancabermeja'),('68092','68','Betulia'),('68101','68','Bolívar'),
  ('68121','68','Cabrera'),('68132','68','California'),('68147','68','Capitanejo'),
  ('68152','68','Carcasí'),('68160','68','Cepitá'),('68162','68','Cerrito'),
  ('68167','68','Charalá'),('68169','68','Charta'),('68179','68','Chipatá'),
  ('68190','68','Cimitarra'),('68207','68','Concepción'),('68209','68','Confines'),
  ('68211','68','Contratación'),('68217','68','Coromoro'),('68229','68','Curití'),
  ('68235','68','El Carmen de Chucurí'),('68245','68','El Guacamayo'),('68250','68','El Peñón'),
  ('68255','68','El Playón'),('68264','68','Encino'),('68266','68','Enciso'),
  ('68271','68','Florián'),('68276','68','Floridablanca'),('68296','68','Galán'),
  ('68298','68','Gámbita'),('68307','68','Girón'),('68318','68','Guaca'),
  ('68320','68','Guadalupe'),('68322','68','Guapotá'),('68324','68','Guavatá'),
  ('68327','68','Güepsa'),('68344','68','Hato'),('68368','68','Jesús María'),
  ('68370','68','Jordán'),('68377','68','La Belleza'),('68385','68','Landázuri'),
  ('68397','68','La Paz'),('68406','68','Lebrija'),('68418','68','Los Santos'),
  ('68425','68','Macaravita'),('68432','68','Málaga'),('68444','68','Matanza'),
  ('68464','68','Mogotes'),('68468','68','Molagavita'),('68498','68','Ocamonte'),
  ('68500','68','Oiba'),('68502','68','Onzaga'),('68522','68','Palmar'),
  ('68524','68','Palmas del Socorro'),('68533','68','Páramo'),('68547','68','Piedecuesta'),
  ('68549','68','Pinchote'),('68572','68','Puente Nacional'),('68573','68','Puerto Parra'),
  ('68575','68','Puerto Wilches'),('68615','68','Rionegro'),('68655','68','Sabana de Torres'),
  ('68669','68','San Andrés'),('68673','68','San Benito'),('68679','68','San Gil'),
  ('68682','68','San Joaquín'),('68684','68','San José de Miranda'),('68686','68','San Miguel'),
  ('68689','68','San Vicente de Chucurí'),('68705','68','Santa Bárbara'),('68720','68','Santa Helana del Opón'),
  ('68745','68','Simacota'),('68755','68','Socorro'),('68770','68','Suaita'),
  ('68773','68','Sucre'),('68780','68','Suratá'),('68820','68','Tona'),
  ('68855','68','Valle de San José'),('68861','68','Vélez'),('68867','68','Vetas'),
  ('68872','68','Villanueva'),('68895','68','Zapatoca')
ON CONFLICT (id) DO NOTHING;

-- SUCRE (70) — 26 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('70001','70','Sincelejo'),('70110','70','Buenavista'),('70124','70','Caimito'),
  ('70204','70','Coloso'),('70215','70','Corozal'),('70221','70','Coveñas'),
  ('70230','70','Chalán'),('70235','70','El Roble'),('70265','70','Galeras'),
  ('70400','70','Guaranda'),('70418','70','La Unión'),('70429','70','Los Palmitos'),
  ('70473','70','Majagual'),('70508','70','Morroa'),('70523','70','Ovejas'),
  ('70533','70','Palmito'),('70670','70','Sampués'),('70678','70','San Benito Abad'),
  ('70702','70','San Juan de Betulia'),('70708','70','San Marcos'),('70713','70','San Onofre'),
  ('70717','70','San Pedro'),('70771','70','San Luis de Sincé'),('70820','70','Santiago de Tolú'),
  ('70823','70','Tolú Viejo'),('70742','70','San Antonio de Palmito')
ON CONFLICT (id) DO NOTHING;

-- TOLIMA (73) — 47 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('73001','73','Ibagué'),('73024','73','Alpujarra'),('73026','73','Alvarado'),
  ('73030','73','Ambalema'),('73043','73','Anzoátegui'),('73055','73','Armero'),
  ('73067','73','Ataco'),('73124','73','Cajamarca'),('73148','73','Carmen de Apicalá'),
  ('73152','73','Casabianca'),('73168','73','Chaparral'),('73200','73','Coello'),
  ('73217','73','Coyaima'),('73226','73','Cunday'),('73236','73','Dolores'),
  ('73268','73','Espinal'),('73270','73','Falan'),('73275','73','Flandes'),
  ('73283','73','Fresno'),('73319','73','Guamo'),('73347','73','Herveo'),
  ('73349','73','Honda'),('73352','73','Icononzo'),('73408','73','Lérida'),
  ('73411','73','Líbano'),('73443','73','Mariquita'),('73449','73','Melgar'),
  ('73461','73','Murillo'),('73483','73','Natagaima'),('73504','73','Ortega'),
  ('73520','73','Palocabildo'),('73547','73','Piedras'),('73555','73','Planadas'),
  ('73563','73','Prado'),('73585','73','Purificación'),('73616','73','Rio Blanco'),
  ('73622','73','Roncesvalles'),('73624','73','Rovira'),('73671','73','Saldaña'),
  ('73675','73','San Antonio'),('73678','73','San Luis'),('73686','73','Santa Isabel'),
  ('73770','73','Suárez'),('73854','73','Valle de San Juan'),('73861','73','Venadillo'),
  ('73870','73','Villahermosa'),('73873','73','Villarrica')
ON CONFLICT (id) DO NOTHING;

-- VALLE DEL CAUCA (76) — 42 municipios
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('76001','76','Cali'),('76020','76','Alcalá'),('76036','76','Andalucía'),
  ('76041','76','Ansermanuevo'),('76054','76','Argelia'),('76100','76','Bolívar'),
  ('76109','76','Buenaventura'),('76111','76','Buga'),('76113','76','Bugalagrande'),
  ('76122','76','Caicedonia'),('76126','76','Calima'),('76130','76','Candelaria'),
  ('76147','76','Cartago'),('76233','76','Dagua'),('76243','76','El Águila'),
  ('76246','76','El Cairo'),('76248','76','El Cerrito'),('76250','76','El Dovio'),
  ('76275','76','Florida'),('76306','76','Ginebra'),('76318','76','Guacarí'),
  ('76364','76','Jamundí'),('76377','76','La Cumbre'),('76400','76','La Unión'),
  ('76403','76','La Victoria'),('76497','76','Obando'),('76520','76','Palmira'),
  ('76563','76','Pradera'),('76606','76','Restrepo'),('76616','76','Riofrío'),
  ('76622','76','Roldanillo'),('76670','76','San Pedro'),('76736','76','Sevilla'),
  ('76823','76','Toro'),('76828','76','Trujillo'),('76834','76','Tuluá'),
  ('76845','76','Ulloa'),('76863','76','Versalles'),('76869','76','Vijes'),
  ('76890','76','Yotoco'),('76892','76','Yumbo'),('76895','76','Zarzal')
ON CONFLICT (id) DO NOTHING;

-- ARAUCA (81)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('81001','81','Arauca'),('81065','81','Arauquita'),('81220','81','Cravo Norte'),
  ('81300','81','Fortul'),('81591','81','Puerto Rondón'),('81736','81','Saravena'),
  ('81794','81','Tame')
ON CONFLICT (id) DO NOTHING;

-- CASANARE (85)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('85001','85','Yopal'),('85010','85','Aguazul'),('85015','85','Chámeza'),
  ('85125','85','Hato Corozal'),('85136','85','La Salina'),('85139','85','Maní'),
  ('85162','85','Monterrey'),('85225','85','Nunchía'),('85230','85','Orocué'),
  ('85250','85','Paz de Ariporo'),('85263','85','Pore'),('85279','85','Recetor'),
  ('85300','85','Sabanalarga'),('85315','85','Sácama'),('85325','85','San Luis de Palenque'),
  ('85400','85','Támara'),('85410','85','Tauramena'),('85430','85','Trinidad'),
  ('85440','85','Villanueva')
ON CONFLICT (id) DO NOTHING;

-- VAUPÉS (97)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('97001','97','Mitú'),('97161','97','Carurú'),('97511','97','Pacoa'),
  ('97666','97','Papunahua'),('97777','97','Taraira'),('97889','97','Yavaraté')
ON CONFLICT (id) DO NOTHING;

-- VICHADA (99)
INSERT INTO geo_municipios (id, departamento_id, nombre) VALUES
  ('99001','99','Puerto Carreño'),('99524','99','La Primavera'),
  ('99624','99','Santa Rosalía'),('99773','99','Cumaribo')
ON CONFLICT (id) DO NOTHING;

-- ── Zonas/Barrios semilla — Ocaña (54498) ★ barrios del sistema de referencia
INSERT INTO geo_zonas (municipio_id, nombre, tipo) VALUES
  ('54498','Isabel Celis','BARRIO'),('54498','Jardines','BARRIO'),
  ('54498','Keneddy','BARRIO'),('54498','La 18','BARRIO'),
  ('54498','La Ceiba','BARRIO'),('54498','La Central','BARRIO'),
  ('54498','La Estrella','BARRIO'),('54498','La Inmaculada','BARRIO'),
  ('54498','La Piñuela','BARRIO'),('54498','La Real','BARRIO'),
  ('54498','La Torcoroma','BARRIO'),('54498','La Victoria','BARRIO'),
  ('54498','Los Alpes','BARRIO'),('54498','Los Pinos','BARRIO'),
  ('54498','Pablo Sexto','BARRIO'),('54498','Parque Principal','BARRIO'),
  ('54498','San Antonio','BARRIO'),('54498','San Carlos','BARRIO'),
  ('54498','San Francisco','BARRIO'),('54498','San Luis','BARRIO'),
  ('54498','San Pedro','BARRIO'),('54498','San Rafael','BARRIO'),
  ('54498','Santa Bárbara','BARRIO'),('54498','Trece de Marzo','BARRIO'),
  ('54498','Villa Celmira','BARRIO'),('54498','Villa del Rosario','BARRIO'),
  -- Veredas Ocaña
  ('54498','Aguas Claras','VEREDA'),('54498','El Palmar','VEREDA'),
  ('54498','La Ermita','VEREDA'),('54498','Los Arrayanes','VEREDA'),
  ('54498','San Isidro','VEREDA'),('54498','Guamalito','CORREGIMIENTO')
ON CONFLICT (municipio_id, nombre, tipo) DO NOTHING;

-- Barrios Ábrego (54003) — sede de la funeraria
INSERT INTO geo_zonas (municipio_id, nombre, tipo) VALUES
  ('54003','Centro','BARRIO'),('54003','El Carmelo','BARRIO'),
  ('54003','La Esperanza','BARRIO'),('54003','Los Álamos','BARRIO'),
  ('54003','Primero de Mayo','BARRIO'),('54003','San Martín','BARRIO'),
  ('54003','Villa del Carmen','BARRIO'),('54003','Urbanización El Prado','URBANIZACIÓN'),
  -- Veredas Ábrego
  ('54003','Aspasica','VEREDA'),('54003','El Palmar','VEREDA'),
  ('54003','La Albania','VEREDA'),('54003','Las Minas','VEREDA'),
  ('54003','Río Grande','VEREDA'),('54003','San Pablo','CORREGIMIENTO'),
  ('54003','Teorama','VEREDA')
ON CONFLICT (municipio_id, nombre, tipo) DO NOTHING;

-- Barrios Cúcuta (54001)
INSERT INTO geo_zonas (municipio_id, nombre, tipo) VALUES
  ('54001','Atalaya','BARRIO'),('54001','Belén','BARRIO'),
  ('54001','Centro','BARRIO'),('54001','Chapinero','BARRIO'),
  ('54001','Comuneros','BARRIO'),('54001','El Llano','BARRIO'),
  ('54001','El Salado','BARRIO'),('54001','Juan Atalaya','BARRIO'),
  ('54001','La Libertad','BARRIO'),('54001','La Merced','BARRIO'),
  ('54001','Las Américas','BARRIO'),('54001','Los Patios','BARRIO'),
  ('54001','Niza','BARRIO'),('54001','Popular','BARRIO'),
  ('54001','San Eduardo','BARRIO'),('54001','San Luis','BARRIO'),
  ('54001','Sevilla','BARRIO'),('54001','Villa del Rosario','BARRIO'),
  ('54001','Comunas 1 a 10','COMUNA')
ON CONFLICT (municipio_id, nombre, tipo) DO NOTHING;

-- Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE geo_departamentos TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE geo_municipios    TO orquidea_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE geo_zonas         TO orquidea_user;
