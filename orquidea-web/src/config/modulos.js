/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Seguridad — catálogo de módulos                      ║
 * ║  Archivo         : config/modulos.js                                    ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * UNA sola lista de módulos para el menú, la matriz de Roles y Permisos y la
 * protección de rutas. Antes la matriz tenía su propia lista (con "clientes",
 * que ningún menú usaba, y sin Pólizas, Convenios, Tesorería…): esos permisos
 * no se podían quitar y el usuario veía módulos que no tenía asignados.
 * `key` = permisos_roles.modulo; `rutas` = páginas que abre el módulo.
 */
export const MODULOS = [
  { key:'dashboard',     label:'Dashboard',      icon:'📊', color:'#6366F1', rutas:['/dashboard'],          desc:'Panel principal y resumen de la funeraria' },
  { key:'terceros',      label:'Terceros',       icon:'👥', color:'#10B981', rutas:['/terceros'],           desc:'Clientes, difuntos, proveedores y demás personas' },
  { key:'contratos',     label:'Contratos',      icon:'📄', color:'#F59E0B', rutas:['/contratos'],          desc:'Contratos y previsión funeraria' },
  { key:'servicios',     label:'Servicios',      icon:'🌸', color:'#8B5CF6', rutas:['/servicios'],          desc:'Servicios funerarios' },
  { key:'polizas',       label:'Pólizas',        icon:'🛡️', color:'#059669', rutas:['/polizas'],            desc:'Pólizas, planes, beneficiarios y pagos' },
  { key:'inventario',    label:'Inventario',     icon:'📦', color:'#0EA5E9', rutas:['/inventario'],         desc:'Productos, existencias y movimientos' },
  { key:'compras',       label:'Compras',        icon:'🧾', color:'#D97706', rutas:['/compras'],            desc:'Compras y pagos a proveedores' },
  { key:'convenios',     label:'Convenios',      icon:'🤝', color:'#0891B2', rutas:['/convenios', '/cartera-convenios'], desc:'Convenios con empresas y su cartera' },
  { key:'pos',           label:'Punto de Venta', icon:'🛒', color:'#16A34A', rutas:['/pos'],                desc:'Venta de mostrador y caja menor' },
  { key:'memoriales',    label:'Memoriales',     icon:'🕯️', color:'#4C1D95', rutas:['/memoriales'],         desc:'Novenarios, aniversarios y misas del sitio web' },
  { key:'cartera',       label:'Cartera',        icon:'💰', color:'#EF4444', rutas:['/pagos'],              desc:'Pagos, cuotas y cartera de contratos y pólizas' },
  { key:'recaudo',       label:'Recaudo',        icon:'🛣️', color:'#6366F1', rutas:['/recaudo'],            desc:'Cobro en campo: calendario, rutas del día e indicadores' },
  { key:'tesoreria',     label:'Tesorería',      icon:'🏦', color:'#0D9488', rutas:['/tesoreria'],          desc:'Cuentas de caja y bancos, traslados y comprobantes' },
  { key:'contabilidad',  label:'Contabilidad',   icon:'📚', color:'#4338CA', rutas:['/contabilidad'],       desc:'PUC, libro diario y reportes contables' },
  { key:'reportes',      label:'Reportes',       icon:'📈', color:'#0284C7', rutas:['/reportes'],           desc:'Informes y estadísticas' },
  { key:'solicitudes',   label:'Solicitudes',    icon:'📥', color:'#DB2777', rutas:['/solicitudes'],        desc:'Prospectos que llegan desde la página web' },
  { key:'asesores',      label:'Asesores',       icon:'💼', color:'#EC4899', rutas:['/asesores'],           desc:'Asesores comerciales y comisiones' },
  { key:'usuarios',      label:'Usuarios',       icon:'👤', color:'#64748B', rutas:['/usuarios'],           desc:'Usuarios del sistema, roles y permisos' },
  { key:'territorio',    label:'Territorio',     icon:'🗺️', color:'#059669', rutas:['/territorio'],         desc:'Departamentos, municipios, zonas y rutas de recaudo' },
  { key:'configuracion', label:'Configuración',  icon:'⚙️', color:'#C9A020', rutas:['/configuracion'],      desc:'Parámetros del sistema' },
  { key:'auditoria',     label:'Auditoría',      icon:'🔎', color:'#7E22CE', rutas:['/auditoria'],          desc:'Bitácora de cambios y usuarios en línea' },
]

/** Módulo al que pertenece una ruta ('/polizas/planes' → polizas). */
export function moduloDeRuta(pathname) {
  const base = '/' + String(pathname || '').split('/').filter(Boolean)[0]
  return MODULOS.find(m => m.rutas.includes(base))?.key || null
}

/** Roles que ven todo sin pasar por la matriz. */
export const ROLES_TOTALES = ['superadmin', 'administrador']
