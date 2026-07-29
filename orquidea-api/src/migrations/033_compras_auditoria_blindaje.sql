/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ORQUÍDEA ERP — Migración 033                                           ║
 * ║  Compras: trazabilidad completa (auditoría) + controles anti-fraude     ║
 * ║  Fecha: 2026-07-24                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

-- ── 1. Auditoría del módulo de Compras ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS cmp_auditoria (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modulo     VARCHAR(30) NOT NULL
    CHECK (modulo IN ('solicitud','proveedor','orden_compra','recepcion','cuenta_pagar')),
  entidad_id UUID        NOT NULL,
  usuario_id UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  accion     TEXT        NOT NULL,
  metadatos  JSONB,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmp_auditoria_entidad ON cmp_auditoria(modulo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_cmp_auditoria_fecha   ON cmp_auditoria(creado_en DESC);

-- ── 2. Controles anti-fraude a nivel de base de datos (defensa en profundidad) ─

-- Ítems de orden de compra: cantidades y costos no pueden ser cero/negativos
ALTER TABLE inv_oc_detalle
  ADD CONSTRAINT chk_ocdet_cantidad_positiva CHECK (cantidad_solicitada > 0),
  ADD CONSTRAINT chk_ocdet_costo_no_negativo CHECK (costo_unitario >= 0),
  ADD CONSTRAINT chk_ocdet_recibida_no_negativa CHECK (cantidad_recibida >= 0);

-- Cuentas por pagar: nunca se puede pagar más de lo que se debe, ni en negativo
ALTER TABLE cmp_cuentas_pagar
  ADD CONSTRAINT chk_cxp_monto_pagado_rango CHECK (monto_pagado >= 0 AND monto_pagado <= monto_total);

-- Recepciones: cantidades no pueden ser negativas
ALTER TABLE cmp_recepciones_detalle
  ADD CONSTRAINT chk_recdet_cantidades_no_negativas
    CHECK (cantidad_recibida >= 0 AND cantidad_rechazada >= 0 AND cantidad_esperada >= 0);

GRANT SELECT,INSERT ON TABLE cmp_auditoria TO orquidea_user;
