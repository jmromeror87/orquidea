/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — recibo después de un cobro                 ║
 * ║  Archivo         : components/polizas/ReciboCobro.jsx                   ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Al registrar un cobro: ver/imprimir el recibo oficial (PDF) o enviarlo al
 * cliente por WhatsApp. Envío por WhatsApp, en orden:
 *   1) el WhatsApp del sistema (si está conectado) manda el PDF directo;
 *   2) si no, en el celular se comparte el PDF (menú Compartir → WhatsApp);
 *   3) en el computador se abre WhatsApp Web con el resumen del recibo.
 */
import { useEffect, useState } from 'react'
import { Printer, Loader2, CheckCircle2, X } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { imprimirReciboPagoPoliza } from '../../utils/reciboPagoPoliza.js'
import { FormaPagoTag } from '../ui/FormaPago.jsx'

const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const fLarga = iso => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }) : ''
const IconoWA = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.6 15.1L2 22l5.02-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-2.98.78.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>
)

export default function ReciboCobro({ polizaId, pagoId, loteId, telefono: telInicial = '', onClose }) {
  const [poliza, setPoliza] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [tel, setTel] = useState(String(telInicial || '').replace(/\D/g, ''))
  const [enviando, setEnviando] = useState(false)
  // El navegador solo abre ventanas / Compartir justo después de un clic: si la
  // preparación del PDF tardó, se ofrece un botón para terminar con otro clic.
  const [pendiente, setPendiente] = useState(null)   // { tipo:'share', archivo, texto, titulo } | { tipo:'wa', url }

  useEffect(() => {
    Promise.all([api.get(`/polizas/${polizaId}`), api.get('/empresa')])
      .then(([p, e]) => { setPoliza(p.data.data); setEmpresa(e.data.data || {}) })
      .catch(() => toast.error('No se pudo cargar el recibo'))
  }, [polizaId])

  const pago = poliza?.pagos?.find(x => (loteId && x.lote_id === loteId) || x.id === pagoId)
  const grupo = pago ? poliza.pagos.filter(x => !x.anulado && (loteId ? x.lote_id === loteId : x.id === pagoId)) : []
  const total = grupo.reduce((t, x) => t + Number(x.monto || 0), 0)
  const numeros = grupo.map(x => String(x.numero_recibo).padStart(6, '0')).sort()
  const numeroTxt = numeros.length > 1 ? `${numeros[0]}–${numeros[numeros.length - 1]}` : numeros[0]

  const ver = () => imprimirReciboPagoPoliza({ pago, poliza, empresa })

  const mensaje = () => [
    `*${empresa?.razon_social || 'Funeraria San José de Ábrego'}*`,
    `Recibo de pago N.° ${numeroTxt}`,
    `Titular: ${poliza.titular_nombre}`,
    `Póliza: ${poliza.numero_legado || poliza.numero}`,
    `Valor recibido: ${fmt(total)}`,
    poliza.pago_hasta ? `Cubierta hasta: ${fLarga(poliza.pago_hasta)}` : null,
    '¡Gracias por su pago!',
  ].filter(Boolean).join('\n')

  const enviarWhatsApp = async () => {
    const numero = tel.replace(/\D/g, '')
    if (numero.length < 10) return toast.error('Escriba el número de WhatsApp del cliente (10 dígitos)')
    setEnviando(true)
    try {
      const pdf = await imprimirReciboPagoPoliza({ pago, poliza, empresa, salida: 'blob' })
      // 1) WhatsApp del sistema
      try {
        const fd = new FormData()
        fd.append('telefono', numero.length === 10 ? `57${numero}` : numero)
        fd.append('mensaje', mensaje())
        fd.append('archivo', pdf.blob, pdf.nombre)
        await api.post('/notificaciones/whatsapp-documento', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success(`Recibo enviado por WhatsApp al ${numero}`)
        return
      } catch { /* el WhatsApp del sistema no está conectado: se comparte desde el equipo */ }
      // 2) Compartir el PDF desde el equipo (celular o computador)
      const archivo = new File([pdf.blob], pdf.nombre, { type: 'application/pdf' })
      // En el celular el menú Compartir adjunta el PDF a WhatsApp; en el
      // computador ese menú casi nunca trae WhatsApp → se abre WhatsApp Web.
      const esCelular = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      if (esCelular && navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: pdf.titulo, text: mensaje() })
          toast.success('Elija WhatsApp en el menú para enviar el recibo')
          return
        } catch (e) {
          if (e?.name === 'AbortError') return
          setPendiente({ tipo: 'share', archivo, texto: mensaje(), titulo: pdf.titulo }); return
        }
      }
      // 3) WhatsApp con el resumen del recibo
      const url = `https://wa.me/${numero.length === 10 ? '57' + numero : numero}?text=${encodeURIComponent(mensaje())}`
      if (!window.open(url, '_blank')) { setPendiente({ tipo: 'wa', url }); return }
      toast.info('Se abrió WhatsApp con el resumen del recibo. Para el PDF: "Ver / imprimir" y compártalo.', 7000)
    } catch (e) { toast.error('No se pudo preparar el recibo') }
    finally { setEnviando(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.45)', backdropFilter:'blur(3px)', zIndex:1400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:460, boxShadow:'0 24px 70px rgba(0,0,0,.28)', overflow:'hidden' }}>
        <div style={{ padding:'20px 22px', background:'linear-gradient(135deg,#047857,#10B981)', color:'#fff', textAlign:'center', position:'relative' }}>
          <button onClick={onClose} title="Cerrar" style={{ position:'absolute', right:12, top:12, border:'1.5px solid rgba(255,255,255,.35)', background:'rgba(255,255,255,.12)', color:'#fff', width:32, height:32, borderRadius:10, cursor:'pointer' }}><X size={15}/></button>
          <CheckCircle2 size={34}/>
          <div style={{ fontSize:13, fontWeight:700, opacity:.9, marginTop:4 }}>Pago registrado</div>
          <div style={{ fontSize:28, fontWeight:900, lineHeight:1.2 }}>{pago ? fmt(total) : '…'}</div>
          {pago && <div style={{ fontSize:12.5, opacity:.9 }}>Recibo N.° {numeroTxt}</div>}
        </div>
        {!pago ? <div style={{ padding:30, textAlign:'center' }}><Loader2 size={22} className="spin pl-spin"/></div> : (
          <div style={{ padding:'16px 22px 20px' }}>
            <div style={{ fontSize:13, color:'#334155', lineHeight:1.7, marginBottom:14 }}>
              <div><b>{poliza.titular_nombre}</b> · Póliza {poliza.numero_legado || poliza.numero}</div>
              <div>{grupo.map(x => x.parcial ? 'Abono' : 'Cuota').filter((v, i, a) => a.indexOf(v) === i).join(' + ')} · <FormaPagoTag codigo={pago.metodo_pago} size={14}/></div>
              {poliza.pago_hasta && <div style={{ color:'#047857', fontWeight:700 }}>Cubierta hasta el {fLarga(poliza.pago_hasta)}</div>}
            </div>
            <button onClick={ver} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#fff', fontWeight:800, fontSize:13.5, cursor:'pointer', color:'#0F172A', marginBottom:10, fontFamily:'inherit' }}>
              <Printer size={16}/> Ver / imprimir recibo
            </button>
            <div style={{ border:'1.5px solid #BBF7D0', background:'#F0FDF4', borderRadius:12, padding:12 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#047857', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Enviar al cliente por WhatsApp</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={tel} onChange={e => setTel(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="Celular del cliente" inputMode="tel" data-cap="no"
                  style={{ flex:1, minWidth:0, border:'1.5px solid #D1D5DB', borderRadius:10, padding:'9px 11px', fontSize:14, fontFamily:'inherit', outline:'none' }}/>
                <button onClick={enviarWhatsApp} disabled={enviando}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'none', background:'#25D366', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity: enviando ? .6 : 1 }}>
                  {enviando ? <Loader2 size={15} className="spin pl-spin"/> : <IconoWA/>} Enviar
                </button>
              </div>
              {pendiente?.tipo === 'share' && (
                <button onClick={async () => { try { await navigator.share({ files: [pendiente.archivo], title: pendiente.titulo, text: pendiente.texto }); setPendiente(null) } catch { /* cancelado */ } }}
                  style={{ marginTop:8, width:'100%', padding:'9px', borderRadius:10, border:'none', background:'#047857', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                  📎 Compartir el PDF (elija WhatsApp)
                </button>
              )}
              {pendiente?.tipo === 'wa' && (
                <a href={pendiente.url} target="_blank" rel="noreferrer" onClick={() => setPendiente(null)}
                  style={{ marginTop:8, display:'block', textAlign:'center', padding:'9px', borderRadius:10, background:'#25D366', color:'#fff', fontWeight:800, textDecoration:'none' }}>
                  Abrir WhatsApp con el recibo
                </a>
              )}
              <div style={{ fontSize:11, color:'#64748B', marginTop:6 }}>Si el WhatsApp del sistema está conectado, el PDF le llega directo al cliente.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
