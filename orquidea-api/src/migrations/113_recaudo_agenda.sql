-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Recaudo — agenda de visitas (tipo cita) y formas     ║
-- ║                    de pago configuradas                                 ║
-- ║  Archivo         : 113_recaudo_agenda.sql                               ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-10-19                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- 1) Recaudo solo aceptaba EFECTIVO/TRANSFERENCIA/NEQUI/DAVIPLATA/OTRO en
--    mayúsculas: cualquier otra forma configurada (Crediservir…) hacía fallar
--    el registro. Ahora acepta el código de cualquier forma de pago.
-- Lo mismo en los pagos de pólizas y contratos: solo aceptaban efectivo,
-- transferencia, tarjeta, cheque, descuento_nomina y pse → un pago por NEQUI o
-- DAVIPLATA (formas activas) o en línea (pse_online) fallaba. La validación
-- real es la contabilidad: una forma sin cuenta configurada se rechaza ahí.
ALTER TABLE pagos_poliza   DROP CONSTRAINT IF EXISTS pagos_poliza_metodo_pago_check;
ALTER TABLE pagos_contrato DROP CONSTRAINT IF EXISTS pagos_contrato_metodo_pago_check;
ALTER TABLE visitas_recaudo DROP CONSTRAINT IF EXISTS visitas_recaudo_metodo_pago_check;
ALTER TABLE recibos_recaudo DROP CONSTRAINT IF EXISTS recibos_recaudo_metodo_pago_check;
UPDATE visitas_recaudo SET metodo_pago = lower(metodo_pago) WHERE metodo_pago <> lower(metodo_pago);
UPDATE recibos_recaudo SET metodo_pago = lower(metodo_pago) WHERE metodo_pago <> lower(metodo_pago);

-- 2) Agenda: "promete pagar el…" / "vuelva el…" queda como una cita (fecha y
--    hora opcional) que aparece en el calendario ese día. Antes se movía la
--    póliza de ruta para siempre.
CREATE TABLE IF NOT EXISTS recaudo_agenda (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id        UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  fecha            DATE NOT NULL,
  hora             TIME,
  tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('PROMESA','VOLVER')),
  nota             TEXT,
  ruta_id          UUID REFERENCES rutas_recaudo(id),
  recaudador_id    UUID REFERENCES usuarios(id),
  visita_origen_id UUID REFERENCES visitas_recaudo(id) ON DELETE SET NULL,
  estado           VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ATENDIDA','CANCELADA')),
  atendida_en      TIMESTAMPTZ,
  creado_por       UUID REFERENCES usuarios(id),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recaudo_agenda_fecha ON recaudo_agenda(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_recaudo_agenda_poliza ON recaudo_agenda(poliza_id, estado);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE recaudo_agenda TO orquidea_user;
