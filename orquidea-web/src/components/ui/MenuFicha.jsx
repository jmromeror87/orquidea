/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — menú lateral de fichas                          ║
 * ║  Archivo         : components/ui/MenuFicha.jsx                          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-20                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * El mismo menú en las fichas de Servicios, Contratos y Pólizas: grupos con
 * título, y en cada opción ícono, nombre, contador, una línea de ayuda y un
 * indicador (punto ámbar = falta algo; ✓ verde = completo).
 *
 *   <MenuFicha tab={tab} onTab={setTab} color="#7C3AED" grupos={[
 *     { titulo:'Servicio', tabs:[{ key:'info', icon:'📋', label:'Información', sub:'…', cuenta, aviso, ok }] }]}/>
 */
import { CheckCircle2 } from 'lucide-react'

export default function MenuFicha({ grupos, tab, onTab, color = '#7C3AED', fondo = '#EDE9FE', chip = '#DDD6FE' }) {
  return (
    <div style={{ width:214, flexShrink:0, borderRight:'1.5px solid #F0F0F5', background:'#FAFBFF', overflowY:'auto',
      padding:'8px 8px 12px', display:'flex', flexDirection:'column', minHeight:0 }}>
      {grupos.map(g => (
        <div key={g.titulo} style={{ marginBottom:6 }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:'#A5A9C0', letterSpacing:'.1em', textTransform:'uppercase', padding:'8px 12px 4px' }}>{g.titulo}</div>
          {g.tabs.map(t => {
            const act = tab === t.key
            return (
              <button key={t.key} onClick={() => onTab(t.key)} title={t.sub}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:10, border:'none', cursor:'pointer',
                  textAlign:'left', background: act ? fondo : 'transparent', color: act ? color : '#374151',
                  boxShadow: act ? `inset 3px 0 0 ${color}` : 'none', transition:'background .12s', fontFamily:'inherit' }}
                onMouseEnter={e => { if (!act) e.currentTarget.style.background = '#F3F4F6' }}
                onMouseLeave={e => { if (!act) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize:16, width:22, textAlign:'center', flexShrink:0 }}>{t.icon}</span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight: act ? 800 : 600 }}>
                    {t.label}
                    {t.cuenta > 0 && <span style={{ fontSize:10, fontWeight:800, padding:'0 6px', borderRadius:8, background: act ? chip : '#EEF0F6', color: act ? color : '#6B7280' }}>{t.cuenta}</span>}
                  </span>
                  {t.sub && <span style={{ display:'block', fontSize:10.5, color: t.aviso ? '#B45309' : '#9CA3AF', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.sub}</span>}
                </span>
                {t.aviso ? <span title="Falta información" style={{ width:8, height:8, borderRadius:'50%', background:'#F59E0B', flexShrink:0 }}/>
                  : t.ok ? <CheckCircle2 size={13} color="#059669" style={{ flexShrink:0 }}/> : null}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
