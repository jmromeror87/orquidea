-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : Auditoría — bitácora global de actividad             ║
-- ║  Archivo         : 085_auditoria_global.sql                             ║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : 2026-09-11                                          ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Bitácora de acciones de negocio (login/logout + crear/actualizar/eliminar/
-- anular en cualquier módulo) — NO clics ni navegación de páginas, decisión
-- explícita del cliente para no caer en vigilancia laboral excesiva. Se
-- alimenta sola desde un hook global en server.js (onResponse) que capta
-- toda petición mutante autenticada, así que no hay que instrumentar cada
-- controlador uno por uno.
--
-- usuario_nombre queda desnormalizado a propósito: si el usuario se
-- desactiva o se borra más adelante, el historial de auditoría no debe
-- perder de quién era la acción.
CREATE TABLE IF NOT EXISTS auditoria_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(150),
  accion         VARCHAR(20) NOT NULL CHECK (accion IN (
                    'LOGIN','LOGIN_FALLIDO','LOGOUT','CREAR','ACTUALIZAR','ELIMINAR','ANULAR','OTRA'
                  )),
  modulo         VARCHAR(60),
  metodo         VARCHAR(10),
  ruta           VARCHAR(300),
  entidad_id     VARCHAR(100),
  descripcion    VARCHAR(300),
  ip             VARCHAR(45),
  navegador      VARCHAR(200),
  sede_id        UUID REFERENCES sedes(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_creado  ON auditoria_log(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo  ON auditoria_log(modulo);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion  ON auditoria_log(accion);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE auditoria_log TO orquidea_user;
