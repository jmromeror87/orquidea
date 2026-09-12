-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Contabilidad — Catálogo de cuentas (PUC)             ║
-- ║  Archivo         : 075_contabilidad_puc.sql                             ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-10                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Catálogo de cuentas basado en el Plan Único de Cuentas para comerciantes
-- (Decreto 2650 de 1993 y modificaciones). Estructura de 5 niveles:
--   1 = Clase (1 dígito)       2 = Grupo (2 dígitos)
--   3 = Cuenta mayor (4 díg.)  4 = Subcuenta (6 dígitos)
--   5 = Auxiliar (subcuenta + ".NN")
--
-- Origen de cada registro (columna origen), para trazabilidad y para que el
-- contador externo (TNS) pueda auditar qué se tomó de dónde:
--   'PUC_ESTANDAR'      -> Clase/Grupo/Cuenta oficiales del Decreto 2650/1993.
--                          Estructura estable desde 1993, de uso universal en
--                          Colombia. No requiere validación adicional.
--   'TNS_VERIFICADA'    -> Subcuenta/auxiliar tomada literalmente del Balance
--                          de Comprobación de Agosto/2026 emitido por TNS.
--   'PUC_COMPLEMENTARIO'-> Subcuentas estándar muy usadas (IVA descontable,
--                          retenciones por pagar, depreciación) que NO
--                          aparecieron en el balance de agosto por no tener
--                          movimiento ese mes, pero son necesarias para que
--                          el motor de reglas contables pueda operar.
--                          *** VALIDAR CÓDIGO EXACTO CONTRA EL PUC MAESTRO DE
--                          TNS ANTES DE CONTABILIZAR EN PRODUCCIÓN ***, para
--                          evitar duplicar una cuenta que el contador ya
--                          tenga creada con otro código de subcuenta/auxiliar.
--
-- IMPORTANTE (regla de no invención): los códigos de CLASE/GRUPO/CUENTA
-- (niveles 1 a 3) son el estándar público y no cambian entre empresas.
-- Los códigos de SUBCUENTA/AUXILIAR (niveles 4 y 5) sí son de libre
-- definición por cada compañía; los marcados TNS_VERIFICADA son exactos
-- porque provienen del balance real. Los marcados PUC_COMPLEMENTARIO son
-- una propuesta razonable y deben confirmarse con el contador externo antes
-- de su primer uso.

CREATE TABLE IF NOT EXISTS contabilidad_puc (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                VARCHAR(20) NOT NULL UNIQUE,
  nombre                VARCHAR(150) NOT NULL,
  nivel                 SMALLINT NOT NULL CHECK (nivel BETWEEN 1 AND 5),
  padre_codigo          VARCHAR(20) REFERENCES contabilidad_puc(codigo),
  clase_codigo          VARCHAR(2) NOT NULL,
  naturaleza            CHAR(1) NOT NULL CHECK (naturaleza IN ('D','C')),
  tipo                  VARCHAR(30) NOT NULL CHECK (tipo IN (
                          'ACTIVO','PASIVO','PATRIMONIO','INGRESO','GASTO',
                          'COSTO_VENTAS','COSTO_PRODUCCION',
                          'ORDEN_DEUDORA','ORDEN_ACREEDORA'
                        )),
  acepta_movimiento     BOOLEAN NOT NULL DEFAULT FALSE, -- solo TRUE en hojas (nivel 4 o 5 sin hijos)
  requiere_tercero      BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_centro_costo BOOLEAN NOT NULL DEFAULT FALSE,
  origen                VARCHAR(20) NOT NULL DEFAULT 'PUC_ESTANDAR'
                          CHECK (origen IN ('PUC_ESTANDAR','TNS_VERIFICADA','PUC_COMPLEMENTARIO','ORQUIDEA')),
  activa                BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por            UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_contabilidad_puc_padre  ON contabilidad_puc(padre_codigo);
CREATE INDEX IF NOT EXISTS idx_contabilidad_puc_clase  ON contabilidad_puc(clase_codigo);
CREATE INDEX IF NOT EXISTS idx_contabilidad_puc_nivel  ON contabilidad_puc(nivel);
CREATE INDEX IF NOT EXISTS idx_contabilidad_puc_activa ON contabilidad_puc(activa);

-- ═══════════════════════════════════════════════════════════════════════
-- NIVEL 1 — CLASES (9)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, origen) VALUES
('1','ACTIVO',1,NULL,'1','D','ACTIVO','PUC_ESTANDAR'),
('2','PASIVO',1,NULL,'2','C','PASIVO','PUC_ESTANDAR'),
('3','PATRIMONIO',1,NULL,'3','C','PATRIMONIO','PUC_ESTANDAR'),
('4','INGRESOS',1,NULL,'4','C','INGRESO','PUC_ESTANDAR'),
('5','GASTOS',1,NULL,'5','D','GASTO','PUC_ESTANDAR'),
('6','COSTOS DE VENTAS',1,NULL,'6','D','COSTO_VENTAS','PUC_ESTANDAR'),
('7','COSTOS DE PRODUCCION O DE OPERACION',1,NULL,'7','D','COSTO_PRODUCCION','PUC_ESTANDAR'),
('8','CUENTAS DE ORDEN DEUDORAS',1,NULL,'8','D','ORDEN_DEUDORA','PUC_ESTANDAR'),
('9','CUENTAS DE ORDEN ACREEDORAS',1,NULL,'9','C','ORDEN_ACREEDORA','PUC_ESTANDAR')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- NIVEL 2 — GRUPOS
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, origen) VALUES
-- Clase 1 ACTIVO
('11','DISPONIBLE',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('12','INVERSIONES',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('13','DEUDORES',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('14','INVENTARIOS',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('15','PROPIEDADES PLANTA Y EQUIPO',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('16','INTANGIBLES',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('17','DIFERIDOS',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('18','OTROS ACTIVOS',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
('19','VALORIZACIONES',2,'1','1','D','ACTIVO','PUC_ESTANDAR'),
-- Clase 2 PASIVO
('21','OBLIGACIONES FINANCIERAS',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('22','PROVEEDORES',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('23','CUENTAS POR PAGAR',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('24','IMPUESTOS GRAVAMENES Y TASAS',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('25','OBLIGACIONES LABORALES',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('26','PASIVOS ESTIMADOS Y PROVISIONES',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('27','DIFERIDOS',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('28','OTROS PASIVOS',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
('29','BONOS Y PAPELES COMERCIALES',2,'2','2','C','PASIVO','PUC_ESTANDAR'),
-- Clase 3 PATRIMONIO
('31','CAPITAL SOCIAL',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
('32','SUPERAVIT DE CAPITAL',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
('33','RESERVAS',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
('34','REVALORIZACION DEL PATRIMONIO',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
('35','DIVIDENDOS O PARTICIPACIONES DECRETADOS',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
('36','RESULTADOS DEL EJERCICIO',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
('37','RESULTADOS DE EJERCICIOS ANTERIORES',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
('38','SUPERAVIT POR VALORIZACIONES',2,'3','3','C','PATRIMONIO','PUC_ESTANDAR'),
-- Clase 4 INGRESOS
('41','OPERACIONALES',2,'4','4','C','INGRESO','PUC_ESTANDAR'),
('42','NO OPERACIONALES',2,'4','4','C','INGRESO','PUC_ESTANDAR'),
-- Clase 5 GASTOS
('51','OPERACIONALES DE ADMINISTRACION',2,'5','5','D','GASTO','PUC_ESTANDAR'),
('52','OPERACIONALES DE VENTAS',2,'5','5','D','GASTO','PUC_ESTANDAR'),
('53','NO OPERACIONALES',2,'5','5','D','GASTO','PUC_ESTANDAR'),
('54','IMPUESTO DE RENTA Y COMPLEMENTARIOS',2,'5','5','D','GASTO','PUC_ESTANDAR'),
-- Clase 6 COSTOS DE VENTAS
('61','COSTO DE VENTAS Y DE PRESTACION DE SERVICIOS',2,'6','6','D','COSTO_VENTAS','PUC_ESTANDAR'),
('62','COMPRAS',2,'6','6','D','COSTO_VENTAS','PUC_ESTANDAR'),
-- Clase 7 COSTOS DE PRODUCCION
('71','MATERIA PRIMA',2,'7','7','D','COSTO_PRODUCCION','PUC_ESTANDAR'),
('72','MANO DE OBRA DIRECTA',2,'7','7','D','COSTO_PRODUCCION','PUC_ESTANDAR'),
('73','COSTOS INDIRECTOS',2,'7','7','D','COSTO_PRODUCCION','PUC_ESTANDAR'),
('74','CONTRATOS DE SERVICIOS',2,'7','7','D','COSTO_PRODUCCION','PUC_ESTANDAR'),
-- Clase 8 y 9 ORDEN
('83','DERECHOS CONTINGENTES',2,'8','8','D','ORDEN_DEUDORA','PUC_ESTANDAR'),
('89','DEUDORAS DE CONTROL POR CONTRA',2,'8','8','D','ORDEN_DEUDORA','PUC_ESTANDAR'),
('93','RESPONSABILIDADES CONTINGENTES',2,'9','9','C','ORDEN_ACREEDORA','PUC_ESTANDAR'),
('99','ACREEDORAS DE CONTROL POR CONTRA',2,'9','9','C','ORDEN_ACREEDORA','PUC_ESTANDAR')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- NIVEL 3 — CUENTAS MAYOR (4 dígitos) — estándar + verificadas en balance TNS
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, origen) VALUES
-- 11 Disponible
('1105','CAJA',3,'11','1','D','ACTIVO','TNS_VERIFICADA'),
('1110','BANCOS',3,'11','1','D','ACTIVO','TNS_VERIFICADA'),
('1120','CUENTAS DE AHORRO',3,'11','1','D','ACTIVO','TNS_VERIFICADA'),
-- 12 Inversiones
('1295','OTRAS INVERSIONES',3,'12','1','D','ACTIVO','TNS_VERIFICADA'),
-- 13 Deudores
('1305','CLIENTES',3,'13','1','D','ACTIVO','TNS_VERIFICADA'),
('1325','CUENTAS POR COBRAR A SOCIOS Y ACCIONISTAS',3,'13','1','D','ACTIVO','TNS_VERIFICADA'),
('1355','ANTICIPO DE IMPUESTOS Y CONTRIBUCIONES O SALDOS A FAVOR',3,'13','1','D','ACTIVO','TNS_VERIFICADA'),
('1365','CUENTAS POR COBRAR A TRABAJADORES',3,'13','1','D','ACTIVO','TNS_VERIFICADA'),
('1380','DEUDORES VARIOS',3,'13','1','D','ACTIVO','PUC_COMPLEMENTARIO'),
-- 14 Inventarios
('1435','MERCANCIAS NO FABRICADAS POR LA EMPRESA',3,'14','1','D','ACTIVO','TNS_VERIFICADA'),
-- 15 Propiedades planta y equipo
('1504','TERRENOS',3,'15','1','D','ACTIVO','TNS_VERIFICADA'),
('1516','CONSTRUCCIONES Y EDIFICACIONES',3,'15','1','D','ACTIVO','PUC_COMPLEMENTARIO'),
('1524','EQUIPO DE OFICINA',3,'15','1','D','ACTIVO','TNS_VERIFICADA'),
('1528','EQUIPO DE COMPUTACION Y COMUNICACION',3,'15','1','D','ACTIVO','TNS_VERIFICADA'),
('1540','FLOTA Y EQUIPO DE TRANSPORTE',3,'15','1','D','ACTIVO','TNS_VERIFICADA'),
('1592','DEPRECIACION ACUMULADA (CR)',3,'15','1','C','ACTIVO','PUC_COMPLEMENTARIO'),
-- 24 Impuestos
('2404','DE RENTA Y COMPLEMENTARIOS',3,'24','2','C','PASIVO','PUC_COMPLEMENTARIO'),
('2408','IMPUESTO SOBRE LAS VENTAS POR PAGAR',3,'24','2','C','PASIVO','TNS_VERIFICADA'),
('2412','DE INDUSTRIA Y COMERCIO',3,'24','2','C','PASIVO','PUC_COMPLEMENTARIO'),
-- 21 Obligaciones financieras
('2110','BANCOS NACIONALES',3,'21','2','C','PASIVO','TNS_VERIFICADA'),
('2195','OTRAS OBLIGACIONES',3,'21','2','C','PASIVO','TNS_VERIFICADA'),
-- 22 Proveedores
('2205','NACIONALES',3,'22','2','C','PASIVO','TNS_VERIFICADA'),
-- 23 Cuentas por pagar
('2335','COSTOS Y GASTOS POR PAGAR',3,'23','2','C','PASIVO','TNS_VERIFICADA'),
('2355','DEUDAS CON ACCIONISTAS O SOCIOS',3,'23','2','C','PASIVO','TNS_VERIFICADA'),
('2365','RETENCION EN LA FUENTE',3,'23','2','C','PASIVO','PUC_COMPLEMENTARIO'),
('2367','IMPUESTO A LAS VENTAS RETENIDO',3,'23','2','C','PASIVO','PUC_COMPLEMENTARIO'),
('2368','IMPUESTO DE INDUSTRIA Y COMERCIO RETENIDO',3,'23','2','C','PASIVO','PUC_COMPLEMENTARIO'),
('2370','RETENCIONES Y APORTES DE NOMINA',3,'23','2','C','PASIVO','TNS_VERIFICADA'),
-- 25 Obligaciones laborales
('2505','SALARIOS POR PAGAR',3,'25','2','C','PASIVO','TNS_VERIFICADA'),
('2510','CESANTIAS CONSOLIDADAS',3,'25','2','C','PASIVO','PUC_COMPLEMENTARIO'),
('2515','INTERESES SOBRE CESANTIAS',3,'25','2','C','PASIVO','PUC_COMPLEMENTARIO'),
('2520','PRIMA DE SERVICIOS',3,'25','2','C','PASIVO','PUC_COMPLEMENTARIO'),
('2525','VACACIONES CONSOLIDADAS',3,'25','2','C','PASIVO','PUC_COMPLEMENTARIO'),
-- 28 Otros pasivos
('2805','ANTICIPOS Y AVANCES RECIBIDOS',3,'28','2','C','PASIVO','TNS_VERIFICADA'),
-- 31 Capital social
('3115','APORTES SOCIALES',3,'31','3','C','PATRIMONIO','TNS_VERIFICADA'),
-- 34 Revalorización
('3405','AJUSTES POR INFLACION AL PATRIMONIO',3,'34','3','C','PATRIMONIO','TNS_VERIFICADA'),
-- 36 Resultados del ejercicio
('3605','UTILIDAD DEL EJERCICIO',3,'36','3','C','PATRIMONIO','TNS_VERIFICADA'),
('3610','PERDIDA DEL EJERCICIO',3,'36','3','D','PATRIMONIO','PUC_COMPLEMENTARIO'),
-- 41 Ingresos operacionales
('4170','OTRAS ACTIVIDADES DE SERVICIOS SOCIALES',3,'41','4','C','INGRESO','TNS_VERIFICADA'),
('4175','DEVOLUCIONES EN VENTAS (DB)',3,'41','4','D','INGRESO','TNS_VERIFICADA'),
-- 42 Ingresos no operacionales
('4210','FINANCIEROS',3,'42','4','C','INGRESO','TNS_VERIFICADA'),
('4295','DIVERSOS',3,'42','4','C','INGRESO','PUC_COMPLEMENTARIO'),
-- 51 Gastos administración
('5105','GASTOS DE PERSONAL',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5110','HONORARIOS',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5115','IMPUESTOS',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5120','ARRENDAMIENTOS',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5130','SEGUROS',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5135','SERVICIOS',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5140','GASTOS LEGALES',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5145','MANTENIMIENTO Y REPARACIONES',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5155','GASTOS DE VIAJE',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5160','DEPRECIACIONES',3,'51','5','D','GASTO','PUC_COMPLEMENTARIO'),
('5195','DIVERSOS',3,'51','5','D','GASTO','TNS_VERIFICADA'),
('5199','PROVISIONES',3,'51','5','D','GASTO','TNS_VERIFICADA'),
-- 52 Gastos de ventas
('5205','GASTOS DE PERSONAL',3,'52','5','D','GASTO','TNS_VERIFICADA'),
('5235','SERVICIOS',3,'52','5','D','GASTO','TNS_VERIFICADA'),
-- 53 Gastos no operacionales
('5305','FINANCIEROS',3,'53','5','D','GASTO','TNS_VERIFICADA'),
('5395','GASTOS DIVERSOS',3,'53','5','D','GASTO','TNS_VERIFICADA'),
-- 54 Impuesto de renta
('5405','IMPUESTO DE RENTA Y COMPLEMENTARIOS',3,'54','5','D','GASTO','TNS_VERIFICADA'),
-- 61 Costo de ventas
('6170','OTRAS ACTIVIDADES DE SERVICIOS',3,'61','6','D','COSTO_VENTAS','TNS_VERIFICADA'),
-- 62 Compras
('6205','COMPRA DE MERCANCIAS',3,'62','6','D','COSTO_VENTAS','PUC_COMPLEMENTARIO'),
-- 72 Mano de obra directa
('7235','SERVICIOS VARIOS',3,'72','7','D','COSTO_PRODUCCION','TNS_VERIFICADA'),
-- 8 y 9 Cuentas de orden
('8395','OTRAS CUENTAS DEUDORAS DE CONTROL',3,'83','8','D','ORDEN_DEUDORA','PUC_COMPLEMENTARIO')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- NIVEL 4 — SUBCUENTAS (6 dígitos) verificadas literalmente en el balance
-- de comprobación de TNS (agosto 2026), salvo las marcadas COMPLEMENTARIO.
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, requiere_tercero, origen) VALUES
('110505','CAJA GENERAL',4,'1105','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('110510','CAJA MENOR',4,'1105','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('111005','MONEDA NACIONAL',4,'1110','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('112015','COOPERATIVAS',4,'1120','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('129501','OTRAS INVERSIONES',4,'1295','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('130505','NACIONALES',4,'1305','1','D','ACTIVO',TRUE,'TNS_VERIFICADA'),
('132505','A SOCIOS',4,'1325','1','D','ACTIVO',TRUE,'TNS_VERIFICADA'),
('135515','RETENCION EN LA FUENTE',4,'1355','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('136505','CUENTAS POR COBRAR A TRABAJADORES',4,'1365','1','D','ACTIVO',TRUE,'TNS_VERIFICADA'),
('136595','OTROS',4,'1365','1','D','ACTIVO',TRUE,'TNS_VERIFICADA'),
('138095','CONVENIOS Y TERCEROS PAGADORES',4,'1380','1','D','ACTIVO',TRUE,'ORQUIDEA'),
('143505','MERCANCIA NO FABRICADA POR LA EMPRESA',4,'1435','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('150405','URBANOS',4,'1504','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('151605','EDIFICACIONES',4,'1516','1','D','ACTIVO',FALSE,'PUC_COMPLEMENTARIO'),
('152405','MUEBLES Y ENSERES',4,'1524','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('152410','EQUIPOS',4,'1524','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('152805','EQUIPO DE PROCESAMIENTO DE DATOS',4,'1528','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('154005','VEHICULOS',4,'1540','1','D','ACTIVO',FALSE,'TNS_VERIFICADA'),
('159205','DEPRECIACION ACUM. CONSTRUCCIONES Y EDIFICACIONES',4,'1592','1','C','ACTIVO',FALSE,'PUC_COMPLEMENTARIO'),
('159224','DEPRECIACION ACUM. EQUIPO DE OFICINA',4,'1592','1','C','ACTIVO',FALSE,'PUC_COMPLEMENTARIO'),
('159228','DEPRECIACION ACUM. EQUIPO DE COMPUTACION Y COMUNICACION',4,'1592','1','C','ACTIVO',FALSE,'PUC_COMPLEMENTARIO'),
('159240','DEPRECIACION ACUM. FLOTA Y EQUIPO DE TRANSPORTE',4,'1592','1','C','ACTIVO',FALSE,'PUC_COMPLEMENTARIO'),
('211005','OBLIGACIONES FINANCIERAS',4,'2110','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('219505','A SOCIOS',4,'2195','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('220505','PROVEEDORES VARIOS',4,'2205','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('233595','OTROS',4,'2335','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('235510','SOCIOS',4,'2355','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('236540','RETENCION EN LA FUENTE POR PAGAR',4,'2365','2','C','PASIVO',FALSE,'PUC_COMPLEMENTARIO'),
('236705','IVA RETENIDO POR PAGAR',4,'2367','2','C','PASIVO',FALSE,'PUC_COMPLEMENTARIO'),
('236805','ICA RETENIDO POR PAGAR',4,'2368','2','C','PASIVO',FALSE,'PUC_COMPLEMENTARIO'),
('237005','APORTES A SALUD',4,'2370','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('237010','APORTES AL ICBF, SENA Y CAJA DE COMPENSACION',4,'2370','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('240402','DE RENTA',4,'2404','2','C','PASIVO',FALSE,'PUC_COMPLEMENTARIO'),
('240802','IVA GENERADO',4,'2408','2','C','PASIVO',FALSE,'TNS_VERIFICADA'),
('240805','IVA DESCONTABLE (DB)',4,'2408','2','D','PASIVO',FALSE,'PUC_COMPLEMENTARIO'),
('241205','INDUSTRIA Y COMERCIO POR PAGAR',4,'2412','2','C','PASIVO',FALSE,'PUC_COMPLEMENTARIO'),
('250501','SALARIOS POR PAGAR',4,'2505','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('251005','CESANTIAS',4,'2510','2','C','PASIVO',TRUE,'PUC_COMPLEMENTARIO'),
('251505','INTERESES SOBRE CESANTIAS',4,'2515','2','C','PASIVO',TRUE,'PUC_COMPLEMENTARIO'),
('252005','PRIMA DE SERVICIOS',4,'2520','2','C','PASIVO',TRUE,'PUC_COMPLEMENTARIO'),
('252505','VACACIONES',4,'2525','2','C','PASIVO',TRUE,'PUC_COMPLEMENTARIO'),
('280501','ANTICIPOS Y AVANCES',4,'2805','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('280505','ANTICIPO RECIBIDO DE CLIENTES',4,'2805','2','C','PASIVO',TRUE,'TNS_VERIFICADA'),
('311505','CUOTAS O PARTES DE INTERESES SOCIAL',4,'3115','3','C','PATRIMONIO',FALSE,'TNS_VERIFICADA'),
('340501','AJUSTE POR PATRIMONIO',4,'3405','3','C','PATRIMONIO',FALSE,'TNS_VERIFICADA'),
('360505','UTILIDAD DEL EJERCICIO',4,'3605','3','C','PATRIMONIO',FALSE,'TNS_VERIFICADA'),
('417060','SERVICIOS FUNERARIOS',4,'4170','4','C','INGRESO',FALSE,'TNS_VERIFICADA'),
('417501','DEVOLUCIONES EN VENTAS',4,'4175','4','D','INGRESO',FALSE,'TNS_VERIFICADA'),
('421005','INTERESES',4,'4210','4','C','INGRESO',FALSE,'TNS_VERIFICADA'),
('510506','SUELDOS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510518','COMISIONES',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510521','VIATICOS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510530','CESANTIAS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510533','INTERESES SOBRE CESANTIAS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510536','PRIMA DE SERVICIOS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510551','DOTACION Y SUMINISTRO A TRABAJADORES',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510563','CAPACITACION AL PERSONAL',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510569','APORTES AL ISS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510570','APORTES A FONDOS DE PENSIONES Y/O CESANTIAS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510572','APORTES CAJAS DE COMPENSACION',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510573','APORTES DEFENSORIA SECTOR FUNERARIO',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('510584','GASTOS MEDICOS Y DROGAS',4,'5105','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('511030','ASESORIA JURIDICA Y CONTABLE',4,'5110','5','D','GASTO',TRUE,'TNS_VERIFICADA'),
('511505','INDUSTRIA Y COMERCIO',4,'5115','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('511540','DE VEHICULOS',4,'5115','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('512010','CONSTRUCCIONES Y EDIFICACIONES',4,'5120','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('512040','FLOTA Y EQUIPO DE TRANSPORTE',4,'5120','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513001','SEGURO A TERCEROS',4,'5130','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513015','AFILIACION Y SOSTENIMIENTO',4,'5130','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513025','SEGURO CONTRA INCENDIO',4,'5130','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513040','FLOTA Y EQUIPO DE TRANSPORTE',4,'5130','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513510','TEMPORALES',4,'5135','5','D','GASTO',TRUE,'TNS_VERIFICADA'),
('513525','ACUEDUCTO Y ALCANTARILLADO',4,'5135','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513530','ENERGIA ELECTRICA',4,'5135','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513535','TELEFONO',4,'5135','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513540','CORREO, PORTES Y TELEGRAMAS',4,'5135','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('513550','TRANSPORTE, FLETES Y ACARREOS',4,'5135','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('514005','NOTARIALES',4,'5140','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('514010','REGISTRO MERCANTIL',4,'5140','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('514510','CONSTRUCCIONES Y EDIFICACIONES',4,'5145','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('514525','EQUIPO DE COMPUTACION Y COMUNICACION',4,'5145','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('514540','FLOTA Y EQUIPO DE TRANSPORTE',4,'5145','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('515505','PASAJES',4,'5155','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('516005','CONSTRUCCIONES Y EDIFICACIONES',4,'5160','5','D','GASTO',FALSE,'PUC_COMPLEMENTARIO'),
('516024','EQUIPO DE OFICINA',4,'5160','5','D','GASTO',FALSE,'PUC_COMPLEMENTARIO'),
('516028','EQUIPO DE COMPUTACION Y COMUNICACION',4,'5160','5','D','GASTO',FALSE,'PUC_COMPLEMENTARIO'),
('516040','FLOTA Y EQUIPO DE TRANSPORTE',4,'5160','5','D','GASTO',FALSE,'PUC_COMPLEMENTARIO'),
('519520','RELACIONES PUBLICAS',4,'5195','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('519525','ELEMENTOS DE ASEO Y CAFETERIA',4,'5195','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('519530','UTILES, PAPELERIA Y FOTOCOPIAS',4,'5195','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('519565','PARQUEADERO',4,'5195','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('519595','OTROS',4,'5195','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('519910','DEUDORES',4,'5199','5','D','GASTO',TRUE,'TNS_VERIFICADA'),
('520527','AUXILIO DE TRANSPORTE',4,'5205','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('523560','PUBLICIDAD, PROPAGANDA Y PROMOCION',4,'5235','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('530505','GASTOS BANCARIOS',4,'5305','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('530520','INTERESES',4,'5305','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('530535','DESCUENTOS COMERCIALES CONDICIONADOS',4,'5305','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('539525','DONACIONES',4,'5395','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('539595','OTROS',4,'5395','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('540505','IMPUESTO DE RENTA Y COMPLEMENTARIOS',4,'5405','5','D','GASTO',FALSE,'TNS_VERIFICADA'),
('617060','SERVICIOS FUNERARIOS',4,'6170','6','D','COSTO_VENTAS',FALSE,'TNS_VERIFICADA'),
('723555','SERVICIOS VARIOS PLANTA',4,'7235','7','D','COSTO_PRODUCCION',FALSE,'TNS_VERIFICADA')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- NIVEL 5 — AUXILIARES (subcuenta + ".NN") verificados literalmente en el
-- balance de comprobación de TNS, agosto 2026. Estas son las hojas donde
-- se permite contabilizar (acepta_movimiento = TRUE).
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO contabilidad_puc (codigo, nombre, nivel, padre_codigo, clase_codigo, naturaleza, tipo, acepta_movimiento, requiere_tercero, origen) VALUES
('110505.01','Caja general',5,'110505','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('110510.01','Caja menor',5,'110510','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('111005.01','Bancolombia Ahorros 70900001025',5,'111005','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('111005.02','Banco Colombia Planes Ahorro No. 70935294566',5,'111005','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('111005.10','Bancolombia corriente Planes 7093-52942-66',5,'111005','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('111005.12','Bancolombia Ahorros 70900001026',5,'111005','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('112015.01','Crediservir 202-00622',5,'112015','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('112015.02','Crediservir 202-0020294',5,'112015','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('112015.03','Crediservir 302-0000241',5,'112015','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('112015.04','Crediservir 302-0000242',5,'112015','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('112015.22','Crediservir 302-0000247',5,'112015','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('112015.24','Crediservir 302-0000246',5,'112015','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('112015.25','Crediservir 302-0000245',5,'112015','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('129501.01','Aportes cooperativas',5,'129501','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('130505.01','Clientes varios',5,'130505','1','D','ACTIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('130505.02','Clientes empresariales',5,'130505','1','D','ACTIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('132505.01','Cuenta por cobrar socios',5,'132505','1','D','ACTIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('135515.01','Retencion en la fuente por vta',5,'135515','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('136505.01','Cuenta por cobrar a trabajador',5,'136505','1','D','ACTIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('136595.01','Cuentas por cobrar varios',5,'136595','1','D','ACTIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('143505.01','Cofres',5,'143505','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('143505.02','Veladoras',5,'143505','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('143505.03','Articulos religiosos',5,'143505','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('150405.02','Lotes en cementerio Jardines la Inmaculada Abrego',5,'150405','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('150405.03','Lotes en cementerio Jardines El Resucitado Abrego',5,'150405','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('150405.04','Osarios en Capilla de cementerio Abrego',5,'150405','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('152405.01','Muebles y enseres',5,'152405','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('152405.02','Silleteria',5,'152405','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('152405.03','Equipos de oficina en general',5,'152405','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('152410.01','Utiles y equipos de la morgue',5,'152410','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('152805.01','Equipos de procesamiento de datos',5,'152805','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('154005.05','Vehiculo carroza Luv 2005 Chevrolet',5,'154005','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('154005.07','Vehiculo Ssanyong',5,'154005','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('154005.08','Vehiculo necromovil placa GEL 904',5,'154005','1','D','ACTIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('211005.01','Obligaciones financieras',5,'211005','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('219505.01','Otras obligaciones a socios',5,'219505','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('220505.01','Proveedores varios',5,'220505','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('220505.02','Proveedores por servicios',5,'220505','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('233595.01','Cuentas por pagar varias',5,'233595','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('235510.01','Cuenta por pagar a socios',5,'235510','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('237005.01','Aportes a salud',5,'237005','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('237010.05','Aportes a pension',5,'237010','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('240802.01','IVA generado por ventas',5,'240802','2','C','PASIVO',TRUE,FALSE,'TNS_VERIFICADA'),
('250501.01','Salarios por pagar',5,'250501','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('280501.01','Anticipos y avances de clientes',5,'280501','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('280505.01','Anticipos por clientes de polizas exequiales',5,'280505','2','C','PASIVO',TRUE,TRUE,'TNS_VERIFICADA'),
('311505.01','Aportes sociales',5,'311505','3','C','PATRIMONIO',TRUE,FALSE,'TNS_VERIFICADA'),
('340501.01','Ajuste por patrimonio',5,'340501','3','C','PATRIMONIO',TRUE,FALSE,'TNS_VERIFICADA'),
('360505.07','Utilidades acumuladas',5,'360505','3','C','PATRIMONIO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.01','Servicios funerarios',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.02','Venta de articulos religiosos',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.05','Ingresos por tarjetas',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.07','Ingresos por servicio de cementerio',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.09','Ingresos por preparadas',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.10','Ingresos por servicios de carroza',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.11','Ingresos por flores',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.12','Ingresos por otros servicios',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.13','Ingresos por servicio de coro',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.14','Ingresos por traslados',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.17','Ingresos por alquiler de tumba',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.21','Venta de resteros',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.22','Ingresos por cortejo funebre',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.24','Venta de veladoras',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.25','Ingreso por destino final',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.26','Ingreso por carteles',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.27','Ingreso por alquiler de boveda',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.28','Ingreso por auxiliar de velacion',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.29','Ingreso por servicio de transmisiones por redes sociales',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417060.30','Ingresos por homenaje fotografico',5,'417060','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('417501.01','Devoluciones en ventas',5,'417501','4','D','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('421005.01','Intereses ganados',5,'421005','4','C','INGRESO',TRUE,FALSE,'TNS_VERIFICADA'),
('510506.01','Sueldos',5,'510506','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510518.03','Comisiones por servicios',5,'510518','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510518.04','Comisiones por polizas',5,'510518','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510521.01','Viaticos',5,'510521','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510530.01','Cesantias',5,'510530','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510533.01','Interes sobre cesantias',5,'510533','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510536.01','Prima de servicios',5,'510536','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510551.01','Dotacion a personal',5,'510551','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510563.01','Capacitaciones',5,'510563','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510569.02','Riesgos profesionales',5,'510569','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510570.01','Aporte fondo de pensiones y cesantias',5,'510570','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510572.01','Caja de compensacion familiar',5,'510572','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510573.03','Aportes a salud',5,'510573','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('510584.01','Gastos medicos y drogas',5,'510584','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('511030.01','Asesoria contable',5,'511030','5','D','GASTO',TRUE,TRUE,'TNS_VERIFICADA'),
('511030.03','Asesoria juridica',5,'511030','5','D','GASTO',TRUE,TRUE,'TNS_VERIFICADA'),
('511505.01','Industria y comercio',5,'511505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('511505.02','Certificado camara de comercio',5,'511505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('511540.01','Seguros vehiculos en los creditos',5,'511540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('511540.02','Impuesto de vehiculos',5,'511540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('511540.03','Impuesto de gases',5,'511540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('512010.01','Instalaciones funerarias - locativas',5,'512010','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('512040.01','Carrozas funebres',5,'512040','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513001.02','Seguro de vida afiliados',5,'513001','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513001.03','Seguro de vida grupo empleados',5,'513001','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513015.01','Cuotas de sostenimiento REMANS',5,'513015','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513015.03','Cuota sostenimiento FENALCO',5,'513015','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513025.03','Seguro poliza de cumplimiento',5,'513025','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513040.01','SOAT',5,'513040','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513040.02','Seguro contra todo riesgo de vehiculos',5,'513040','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513510.01','Temporales',5,'513510','5','D','GASTO',TRUE,TRUE,'TNS_VERIFICADA'),
('513510.02','Servicio de disponibilidad',5,'513510','5','D','GASTO',TRUE,TRUE,'TNS_VERIFICADA'),
('513525.01','Acueducto',5,'513525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513530.01','Energia electrica',5,'513530','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513535.02','Celular',5,'513535','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513535.03','Servicio de internet',5,'513535','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513540.01','Portes y correos',5,'513540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513550.01','Fletes',5,'513550','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513550.02','Acarreos',5,'513550','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513550.04','Lavado de carrozas',5,'513550','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('513550.06','Lavada de carros particulares',5,'513550','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514005.01','Autenticaciones',5,'514005','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514005.05','Impuesto predial',5,'514005','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514010.01','Registros mercantil',5,'514010','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514510.02','Mantenimiento y reparaciones',5,'514510','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514525.01','Equipos de computacion y comunicacion (ítem 1)',5,'514525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514525.02','Equipos de computacion',5,'514525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514540.02','Combustibles de carrozas',5,'514540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514540.03','Lubricantes',5,'514540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514540.04','Repuestos y otros',5,'514540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514540.06','Tecnicomecanica de vehiculos',5,'514540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514540.07','Combustible y lubricantes vehiculo adicional',5,'514540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514540.08','Aceite motos',5,'514540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('514540.09','Combustible de motos',5,'514540','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('515505.01','Pasajes Ocaña',5,'515505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('515505.02','Gastos de viaje',5,'515505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('515505.06','Peajes',5,'515505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519520.01','Relaciones publicas',5,'519520','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519520.04','Reintegros por ayudas',5,'519520','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519520.06','Relaciones publicas (otros)',5,'519520','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519520.07','Reintegros por ayudas de auxilios economicos',5,'519520','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519525.01','Suministro',5,'519525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519525.02','Cafeteria',5,'519525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519525.04','Utiles de aseo',5,'519525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519525.05','Refrigerios',5,'519525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519530.01','Papeleria',5,'519530','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519530.02','Fotocopias',5,'519530','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519530.03','Utiles de oficina',5,'519530','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519565.01','Parqueadero',5,'519565','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519595.04','Fiestas de San Jose',5,'519595','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('519910.01','Clientes de dificil cobro',5,'519910','5','D','GASTO',TRUE,TRUE,'TNS_VERIFICADA'),
('520527.01','Auxilio de transporte',5,'520527','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('523560.01','Publicidad',5,'523560','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.01','4 por mil',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.02','Chequera',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.04','Manejo de tarjeta',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.05','IVA (gastos bancarios)',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.13','Comisiones bancarias',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.18','Plan canal negocios',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.19','Servicio de comision por pagos a otros bancos',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530505.20','Debito por rechazos de pagos',5,'530505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530520.04','Intereses por pagar',5,'530520','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530520.11','Interes credito vehiculo carroza',5,'530520','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530535.01','Descuento por pronto pago',5,'530535','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('530535.04','Descuento por acuerdo bilateral',5,'530535','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('539525.02','Ayudas a terceros',5,'539525','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('539595.01','Ajuste al valor',5,'539595','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('540505.01','Impuesto de renta',5,'540505','5','D','GASTO',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.01','Servicios funerarios',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.03','Desviceradas y preparadas',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.05','Registros y asentadas',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.06','Servicios de tarjetas',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.07','Servicio de flores',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.09','Servicio de cementerio',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.10','Servicio de certificados medicos',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.11','Servicio de coro',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.12','Servicio de auxiliares de velacion',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.14','Servicio de veladoras',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.15','Traslados',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.16','Utiles para la morgue',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.18','Aseo de tumbas, cortinas, alfombras',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.19','Servicios religiosos',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.28','Fotografia',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.29','Cintas para nombres de fallecido',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.33','Servicio de destino final',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.35','Rodamiento',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.36','Servicio de buseta',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.39','Servicio de kits de cafeteria',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.48','Ramos/buqueth',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.51','Seguro auxilio economico',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.52','Transmision de misa por redes sociales',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.53','Servicio de realizacion de exequias',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.54','Servicio de alquiler de laboratorio para necropsias',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('617060.55','Registro de marca',5,'617060','6','D','COSTO_VENTAS',TRUE,FALSE,'TNS_VERIFICADA'),
('723555.01','Residuos hospitalarios PGHIR',5,'723555','7','D','COSTO_PRODUCCION',TRUE,FALSE,'TNS_VERIFICADA')
ON CONFLICT (codigo) DO NOTHING;

-- Marca como "no acepta movimiento" cualquier código que tenga hijos
-- (clase, grupo, cuenta y subcuenta con detalle son de agrupación, no de
-- digitación directa — solo el auxiliar de más bajo nivel recibe asientos).
UPDATE contabilidad_puc p
SET acepta_movimiento = FALSE
WHERE EXISTS (SELECT 1 FROM contabilidad_puc h WHERE h.padre_codigo = p.codigo);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contabilidad_puc TO orquidea_user;
