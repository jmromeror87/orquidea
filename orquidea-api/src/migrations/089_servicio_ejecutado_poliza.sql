-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Contabilidad — reconocimiento de ingreso al ejecutar ║
-- ║                    una póliza de previsión exequial                     ║
-- ║  Archivo         : 089_servicio_ejecutado_poliza.sql                    ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Cierra el ciclo contable de una póliza (NIIF 15 — el ingreso se reconoce
-- cuando se transfiere el servicio, no cuando se cobra): mientras el
-- cliente paga cuotas, ese dinero es un PASIVO (PAGO_CUOTA_POLIZA →
-- 280505.01, "Anticipos por clientes"). Cuando el beneficiario se ejecuta
-- (el servicio funerario realmente se presta), ese anticipo se cancela y
-- SOLO AHÍ nace el ingreso real — antes de esto, la funeraria le debe el
-- servicio al cliente, no le ha vendido nada.
--
--   SERVICIO_EJECUTADO_POLIZA (al marcar un beneficiario como ejecutado)
--     Debe  280505.01 Anticipos por clientes de pólizas exequiales
--     Haber 417060.01 Servicios funerarios (ingreso)
--
-- El monto es la suma de servicios_incluidos (congelados en la póliza al
-- venderse, migración 061) — el valor total que el plan garantiza, no lo
-- que el cliente alcanzó a pagar en cuotas hasta la fecha.
INSERT INTO reglas_contables (evento_codigo, nombre, descripcion, tipo_comprobante, activa)
VALUES (
  'SERVICIO_EJECUTADO_POLIZA',
  'Reconocimiento de ingreso al ejecutar una póliza',
  'Cancela el pasivo de anticipos acumulado durante el pago de cuotas y reconoce el ingreso real, en el momento en que el servicio funerario efectivamente se presta (no cuando se cobra la cuota). Cuentas verificadas en TNS, reutilizadas de PAGO_CUOTA_POLIZA y CONTRATO_VENTA.',
  'VENTA', TRUE
)
ON CONFLICT (evento_codigo) DO NOTHING;

INSERT INTO reglas_contables_lineas (regla_id, orden, lado, origen, cuenta_codigo, monto_campo, descripcion)
SELECT id, 1, 'D', 'FIJA', '280505.01', 'total', 'Cancela anticipo de póliza (pasivo)' FROM reglas_contables WHERE evento_codigo = 'SERVICIO_EJECUTADO_POLIZA'
UNION ALL
SELECT id, 2, 'H', 'FIJA', '417060.01', 'total', 'Ingreso por servicio funerario ejecutado' FROM reglas_contables WHERE evento_codigo = 'SERVICIO_EJECUTADO_POLIZA'
ON CONFLICT DO NOTHING;
