/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — ícono del fallecido (angelito)                  ║
 * ║  Archivo         : components/ui/Angelito.jsx                           ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-11-07                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Único ícono para el fallecido en todo el sistema (reemplaza el emoji 👼,
 * que se veía distinto en cada computador). Cambiarlo aquí lo cambia en todo.
 */
import angelito from '../../assets/iconos/angelito.png'

export default function Angelito({ size = 18, style, title = 'Fallecido' }) {
  return (
    <img src={angelito} alt={title} title={title} width={size} height={size}
      style={{ display:'inline-block', verticalAlign:'middle', objectFit:'contain', flexShrink:0, ...style }}/>
  )
}
