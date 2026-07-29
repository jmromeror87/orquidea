-- ============================================================================
-- ORQUÍDEA ERP — Sistema de Gestión Funeraria
-- Cliente         : Funeraria San José de Abrego
-- Desarrollado por: Ing. Jhoan M. Romero Rivera
-- ----------------------------------------------------------------------------
-- Módulo          : Recaudo
-- Archivo         : 019_recaudo_operativo.sql
-- Versión         : v1.0.0
-- Fecha           : 2026-07-03
-- ----------------------------------------------------------------------------
-- © 2026 Funeraria San José de Abrego. Todos los derechos reservados.
-- ============================================================================

-- Órdenes del día (generadas automáticamente o manualmente)
CREATE TABLE IF NOT EXISTS ordenes_recaudo (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ruta_id         UUID NOT NULL REFERENCES rutas_recaudo(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  estado          VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                    CHECK (estado IN ('PENDIENTE','EN_CURSO','COMPLETADA','CANCELADA')),
  recaudador_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  total_esperado  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_recaudado NUMERIC(14,2) NOT NULL DEFAULT 0,
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ruta_id, fecha)
);

-- Visitas individuales por póliza dentro de una orden
CREATE TABLE IF NOT EXISTS visitas_recaudo (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orden_id       UUID NOT NULL REFERENCES ordenes_recaudo(id) ON DELETE CASCADE,
  poliza_id      UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  resultado      VARCHAR(20) CHECK (resultado IN ('COBRADO','AUSENTE','PROMESA','PARCIAL','NO_PAGA','APLAZADO')),
  valor_cobrado  NUMERIC(14,2) DEFAULT 0,
  valor_esperado NUMERIC(14,2) NOT NULL DEFAULT 0,
  metodo_pago    VARCHAR(20) CHECK (metodo_pago IN ('EFECTIVO','TRANSFERENCIA','NEQUI','DAVIPLATA','OTRO')),
  observaciones  TEXT,
  visitado_en    TIMESTAMPTZ,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(orden_id, poliza_id)
);

-- Permisos
GRANT ALL ON ordenes_recaudo TO orquidea_user;
GRANT ALL ON visitas_recaudo TO orquidea_user;
