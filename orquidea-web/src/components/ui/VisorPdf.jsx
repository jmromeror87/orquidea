/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — visor de documentos (PDF / impresión)           ║
 * ║  Archivo         : components/ui/VisorPdf.jsx                           ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Visor único (montado en main.jsx). Se abre con verPDF()/verHTML() de
 * store/visorPdf.store.js. Muestra el documento a pantalla completa con
 * Imprimir como acción principal. Solo cierra con X o "Cerrar" (nunca al
 * hacer clic afuera, como todas las ventanas del sistema).
 */
import { useEffect, useRef, useState } from 'react'
import { Printer, X, Download, FileText, Loader2 } from 'lucide-react'
import { useVisorPdf } from '../../store/visorPdf.store.js'

const CSS = `
.vp-ov { position:fixed; inset:0; z-index:3000; background:rgba(15,23,42,.62); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:18px; }
.vp { background:#fff; border-radius:16px; width:min(1100px, 100%); height:min(94vh, 1200px); display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,.35); animation:vp-in .18s ease; }
@keyframes vp-in { from { transform:translateY(12px); opacity:0 } to { transform:none; opacity:1 } }
.vp-head { display:flex; align-items:center; gap:10px; padding:12px 16px; background:linear-gradient(135deg,#065f46,#059669); color:#fff; }
.vp-head b { font-size:14.5px; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.vp-btn { display:flex; align-items:center; gap:6px; border-radius:9px; padding:8px 14px; font-size:12.5px; font-weight:800; cursor:pointer; font-family:inherit; border:1.5px solid rgba(255,255,255,.35); background:rgba(255,255,255,.12); color:#fff; white-space:nowrap; }
.vp-btn:hover { background:rgba(255,255,255,.22); }
.vp-btn.pri { background:#fff; color:#065f46; border-color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.18); }
.vp-btn.pri:hover { background:#ecfdf5; }
.vp-btn.ico { padding:8px; }
.vp-cuerpo { flex:1; min-height:0; background:#525659; position:relative; }
.vp-cuerpo iframe { width:100%; height:100%; border:none; display:block; background:#fff; }
.vp-cargando { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#e5e7eb; gap:8px; font-size:13px; pointer-events:none; }
.vp-pie { padding:7px 16px; font-size:11.5px; color:#64748b; background:#f8fafc; border-top:1px solid #e5e7eb; }
@media (max-width:640px) { .vp-ov { padding:0; } .vp { border-radius:0; height:100vh; } .vp-btn .vp-txt { display:none; } }
`

export default function VisorPdf() {
  const doc = useVisorPdf(s => s.doc)
  const cerrar = useVisorPdf(s => s.cerrar)
  const frame = useRef(null)
  const [listo, setListo] = useState(false)

  useEffect(() => { setListo(false) }, [doc])
  // Ctrl+P imprime el documento del visor (no la pantalla del ERP)
  useEffect(() => {
    if (!doc) return
    const k = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); imprimir() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  if (!doc) return null

  function imprimir() {
    const w = frame.current?.contentWindow
    try { w.focus(); w.print() }
    catch { if (doc.url) window.open(doc.url, '_blank') }   // respaldo: el visor del navegador
  }
  const descargar = () => {
    const a = document.createElement('a'); a.href = doc.url; a.download = doc.nombre; a.click()
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="vp-ov">
        <div className="vp" role="dialog" aria-label={doc.titulo}>
          <div className="vp-head">
            <FileText size={18}/>
            <b>{doc.titulo}</b>
            <button type="button" className="vp-btn pri" onClick={imprimir} autoFocus><Printer size={15}/><span className="vp-txt">Imprimir</span></button>
            {doc.tipo === 'pdf' && (
              <button type="button" className="vp-btn" onClick={descargar} title="Guardar una copia en el computador (opcional)">
                <Download size={15}/><span className="vp-txt">Descargar</span>
              </button>
            )}
            <button type="button" className="vp-btn ico" onClick={cerrar} title="Cerrar"><X size={17}/></button>
          </div>
          <div className="vp-cuerpo">
            {!listo && <div className="vp-cargando"><Loader2 size={18} className="pl-spin"/> Preparando documento…</div>}
            {doc.tipo === 'pdf'
              ? <iframe ref={frame} key={doc.url} src={`${doc.url}#toolbar=1&navpanes=0&view=FitH`} title={doc.titulo} onLoad={() => setListo(true)}/>
              : <iframe ref={frame} key={doc.titulo + doc.html.length} srcDoc={doc.html} title={doc.titulo} onLoad={() => setListo(true)}/>}
          </div>
          <div className="vp-pie">Vista previa — use <b>Imprimir</b> (o Ctrl+P). No se guarda ningún archivo en el computador.</div>
        </div>
      </div>
    </>
  )
}
