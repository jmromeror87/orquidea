-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : POS — efectivo recibido y vuelto en el recibo        ║
-- ║  Archivo         : 087_pos_pagos_vuelto.sql                             ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- El monto con el que el cliente pagó en efectivo (billete de $10.000 sobre
-- un saldo de $8.000) y el vuelto entregado nunca se guardaban — el POS
-- calculaba el vuelto solo en pantalla y lo descartaba al confirmar la
-- venta, así que el recibo impreso nunca lo mostraba (a diferencia de
-- cualquier POS real de almacén de cadena).
ALTER TABLE pos_venta_pagos
  ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS cambio         NUMERIC(14,2);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pos_venta_pagos TO orquidea_user;
