-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Migración       : 047_pos_pagos_divididos.sql                          ║
-- ║  Propósito       : Pago dividido (multi-tender) en el POS — el cliente  ║
-- ║                    puede pagar parte en Nequi, parte en efectivo, etc., ║
-- ║                    igual que un POS real. Se elimina el descuento.      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS pos_venta_pagos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id    UUID NOT NULL REFERENCES pos_ventas(id) ON DELETE CASCADE,
  metodo_pago VARCHAR(40) NOT NULL,
  monto       NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  referencia  VARCHAR(120),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_venta_pagos_venta ON pos_venta_pagos(venta_id);

-- Migrar ventas existentes (pago único) a la nueva tabla, para no perder historial
INSERT INTO pos_venta_pagos (venta_id, metodo_pago, monto, referencia)
SELECT id, metodo_pago, total, referencia
FROM pos_ventas v
WHERE NOT EXISTS (SELECT 1 FROM pos_venta_pagos vp WHERE vp.venta_id = v.id);

GRANT ALL PRIVILEGES ON TABLE pos_venta_pagos TO orquidea_user;
