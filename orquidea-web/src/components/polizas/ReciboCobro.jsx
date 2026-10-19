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
 * ║  Versión         : v1.1.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Recibo de un pago de póliza: ver/imprimir el PDF oficial y enviarlo al
 * cliente por WhatsApp, mostrando si ya se le envió (cuándo, a qué número).
 * Envío por WhatsApp, en orden:
 *   1) el WhatsApp del sistema (si está conectado) manda el PDF directo;
 *   2) si no, en el celular se comparte el PDF (menú Compartir → WhatsApp);
 *   3) en el computador se abre WhatsApp Web con el resumen del recibo.
 *
 * - PanelRecibo: el bloque reutilizable (también lo usa el cobro del calendario).
 * - ReciboCobro (default): la ventana que aparece justo después de cobrar.
 */
import { useEffect, useState } from 'react'
import { Printer, Loader2, CheckCircle2, X, Clock } from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { imprimirReciboPagoPoliza } from '../../utils/reciboPagoPoliza.js'
import { FormaPagoTag } from '../ui/FormaPago.jsx'

const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n || 0)
const fLarga = iso => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }) : ''
const fCorta = iso => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short' }) : ''
const fHora = ts => ts ? new Date(ts).toLocaleString('es-CO', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }) : ''
const conIndicativo = n => (n.length === 10 ? `57${n}` : n)
const telVer = n => String(n || '').replace(/^57(\d{10})$/, '$1')
const periodoTxt = x => x.periodo_hasta ? `${fCorta(x.mes_correspondiente)} – ${fCorta(x.periodo_hasta)}` : fCorta(x.mes_correspondiente)
const IconoWA = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.6 15.1L2 22l5.02-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-2.98.78.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>
)

/** Pagos de cuota → recibos (un pago de varios periodos = un solo recibo). */
export function agruparRecibos(pagos) {
  const grupos = new Map()
  for (const x of pagos || []) {
    const k = x.lote_id || x.id
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k).push(x)
  }
  return [...grupos.values()].map(filas => {
    const validas = filas.filter(x => !x.anulado)
    const base = (validas.length ? validas : filas)
      .slice().sort((a, b) => String(a.mes_correspondiente).localeCompare(String(b.mes_correspondiente)))
    const nums = base.map(x => Number(x.numero_recibo)).filter(Boolean).sort((a, b) => a - b)
    const p = n => String(n).padStart(6, '0')
    return {
      key: base[0].lote_id || base[0].id,
      lote_id: base[0].lote_id || null,
      pago: base[0],
      filas: base,
      anulado: !validas.length,
      parcial: base.every(x => x.parcial),
      total: base.reduce((t, x) => t + Number(x.monto || 0), 0),
      numero: nums.length > 1 ? `${p(nums[0])}–${p(nums[nums.length - 1])}` : nums.length ? p(nums[0]) : '',
      creado_en: base[0].creado_en,
    }
  })
}

const enviosDe = (envios, rec) => (envios || []).filter(e =>
  (rec.lote_id && e.lote_id === rec.lote_id) || rec.filas.some(x => x.id === e.pago_id))

/** Línea con el último envío del recibo (o que no se ha enviado). */
export function EstadoEnvio({ envios }) {
  const ult = envios[0]
  if (!ult) return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#B45309', fontWeight:700 }}>
      <Clock size={13}/> Aún no se ha enviado al cliente
    </div>
  )
  const confirmado = ult.canal === 'SISTEMA'
  return (
    <div style={{ fontSize:12, color: confirmado ? '#047857' : '#475569', lineHeight:1.45 }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontWeight:800 }}>
        {confirmado ? <CheckCircle2 size={13}/> : <IconoWA size={13}/>}
        {confirmado ? 'Enviado por WhatsApp' : 'Abierto en WhatsApp (sin confirmar la entrega)'}
      </span>
      <span style={{ color:'#64748B' }}> · al {telVer(ult.telefono)} · {fHora(ult.creado_en)}{ult.usuario_nombre ? ` · ${ult.usuario_nombre}` : ''}</span>
      {envios.length > 1 && <span style={{ color:'#94A3B8' }}> · {envios.length} envíos</span>}
    </div>
  )
}

/**
 * Bloque del recibo: imprimir y WhatsApp con su estado de envío.
 * `recibo` sale de agruparRecibos(); `compacto` lo muestra como tarjeta de lista.
 */
export function PanelRecibo({ poliza, empresa, recibo, telefono = '', compacto = false }) {
  const [tel, setTel] = useState(String(telefono || '').replace(/\D/g, ''))
  const [envios, setEnvios] = useState(() => enviosDe(poliza.envios, recibo))
  const [enviando, setEnviando] = useState(false)
  const [abrir, setAbrir] = useState(!compacto)
  // El navegador solo abre ventanas / Compartir justo después de un clic: si la
  // preparación del PDF tardó, se ofrece un botón para terminar con otro clic.
  const [pendiente, setPendiente] = useState(null)   // { tipo:'share'|'wa', … , numero }

  useEffect(() => { setTel(String(telefono || '').replace(/\D/g, '')) }, [telefono])

  const ver = () => imprimirReciboPagoPoliza({ pago: recibo.pago, poliza, empresa })

  const mensaje = () => [
    `*${empresa?.razon_social || 'Funeraria San José de Ábrego'}*`,
    `Recibo de pago N.° ${recibo.numero}`,
    `Titular: ${poliza.titular_nombre}`,
    `Póliza: ${poliza.numero_legado || poliza.numero}`,
    `Valor recibido: ${fmt(recibo.total)}`,
    poliza.pago_hasta ? `Cubierta hasta: ${fLarga(poliza.pago_hasta)}` : null,
    '¡Gracias por su pago!',
  ].filter(Boolean).join('\n')

  const anotar = async (canal, numero) => {
    try {
      const r = await api.post('/notificaciones/recibo-envio', { poliza_id: poliza.id, pago_id: recibo.pago.id, lote_id: recibo.lote_id, telefono: conIndicativo(numero), canal })
      setEnvios(e => [r.data.data, ...e])
    } catch { /* la anotación no debe impedir el envío */ }
  }

  const enviarWhatsApp = async () => {
    const numero = tel.replace(/\D/g, '')
    if (numero.length < 10) return toast.error('Escriba el número de WhatsApp del cliente (10 dígitos)')
    setEnviando(true)
    try {
      const pdf = await imprimirReciboPagoPoliza({ pago: recibo.pago, poliza, empresa, salida: 'blob' })
      // 1) WhatsApp del sistema
      try {
        const fd = new FormData()
        fd.append('telefono', conIndicativo(numero))
        fd.append('mensaje', mensaje())
        fd.append('poliza_id', poliza.id)
        fd.append('pago_id', recibo.pago.id)
        if (recibo.lote_id) fd.append('lote_id', recibo.lote_id)
        fd.append('archivo', pdf.blob, pdf.nombre)
        await api.post('/notificaciones/whatsapp-documento', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setEnvios(e => [{ canal: 'SISTEMA', telefono: conIndicativo(numero), creado_en: new Date().toISOString() }, ...e])
        toast.success(`Recibo enviado por WhatsApp al ${numero}`)
        return
      } catch { /* el WhatsApp del sistema no está conectado: se comparte desde el equipo */ }
      // 2) En el celular el menú Compartir adjunta el PDF a WhatsApp; en el
      //    computador ese menú casi nunca trae WhatsApp → se abre WhatsApp Web.
      const archivo = new File([pdf.blob], pdf.nombre, { type: 'application/pdf' })
      const esCelular = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      if (esCelular && navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: pdf.titulo, text: mensaje() })
          anotar('COMPARTIR', numero)
          toast.success('Elija WhatsApp en el menú para enviar el recibo')
          return
        } catch (e) {
          if (e?.name === 'AbortError') return
          setPendiente({ tipo: 'share', archivo, texto: mensaje(), titulo: pdf.titulo, numero }); return
        }
      }
      // 3) WhatsApp con el resumen del recibo
      const url = `https://wa.me/${conIndicativo(numero)}?text=${encodeURIComponent(mensaje())}`
      if (!window.open(url, '_blank')) { setPendiente({ tipo: 'wa', url, numero }); return }
      anotar('WHATSAPP_WEB', numero)
      toast.info('El WhatsApp del sistema no está conectado: se abrió WhatsApp Web con el resumen. Para el PDF: "Imprimir" y compártalo.', 8000)
    } catch { toast.error('No se pudo preparar el recibo') }
    finally { setEnviando(false) }
  }

  const yaEnviado = envios.length > 0
  const confirmado = envios[0]?.canal === 'SISTEMA'
  const btnImprimir = { display:'flex', alignItems:'center', justifyContent:'center', gap:7, borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontWeight:800, cursor:'pointer', color:'#0F172A', fontFamily:'inherit' }

  return (
    <div style={compacto ? { border:'1.5px solid #E2E8F0', borderRadius:14, padding:12, background:'#fff' } : undefined}>
      {compacto ? (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom: recibo.anulado ? 0 : 10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13.5, fontWeight:800, color: recibo.anulado ? '#94A3B8' : '#0F172A', textDecoration: recibo.anulado ? 'line-through' : 'none' }}>
              Recibo N.° {recibo.numero} · {fmt(recibo.total)}
            </div>
            <div style={{ fontSize:11.5, color:'#64748B', marginTop:3, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <span>{fHora(recibo.creado_en)}</span>·<FormaPagoTag codigo={recibo.pago.metodo_pago} size={13}/>·
              <span>{recibo.filas.map(x => `${x.parcial ? 'Abono ' : ''}${periodoTxt(x)}`).join(', ')}</span>
            </div>
          </div>
          {recibo.anulado
            ? <span style={{ fontSize:10.5, fontWeight:800, background:'#FEE2E2', color:'#B91C1C', padding:'3px 8px', borderRadius:6 }}>ANULADO</span>
            : <button onClick={ver} title="Ver / imprimir recibo" style={{ ...btnImprimir, padding:'7px 11px', fontSize:12.5, flexShrink:0 }}><Printer size={14}/> Imprimir</button>}
        </div>
      ) : (
        <button onClick={ver} style={{ ...btnImprimir, width:'100%', padding:'11px', borderRadius:12, fontSize:13.5, marginBottom:10 }}>
          <Printer size={16}/> Ver / imprimir recibo
        </button>
      )}
      {!recibo.anulado && (
        <div style={{ border:`1.5px solid ${confirmado ? '#BBF7D0' : yaEnviado ? '#E2E8F0' : '#FDE68A'}`, background: confirmado ? '#F0FDF4' : yaEnviado ? '#F8FAFC' : '#FFFBEB', borderRadius:12, padding:'10px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, minWidth:0 }}><EstadoEnvio envios={envios}/></div>
            {!abrir && (
              <button onClick={() => setAbrir(true)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:9, border:'none', background:'#25D366', color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                <IconoWA size={13}/> {yaEnviado ? 'Reenviar' : 'Enviar'}
              </button>
            )}
          </div>
          {abrir && (
            <>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <input value={tel} onChange={e => setTel(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="Celular del cliente" inputMode="tel" data-cap="no"
                  style={{ flex:1, minWidth:0, border:'1.5px solid #D1D5DB', borderRadius:10, padding:'9px 11px', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff' }}/>
                <button onClick={enviarWhatsApp} disabled={enviando}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'none', background:'#25D366', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity: enviando ? .6 : 1 }}>
                  {enviando ? <Loader2 size={15} className="spin pl-spin"/> : <IconoWA/>} {yaEnviado ? 'Reenviar' : 'Enviar'}
                </button>
              </div>
              {pendiente?.tipo === 'share' && (
                <button onClick={async () => { try { await navigator.share({ files: [pendiente.archivo], title: pendiente.titulo, text: pendiente.texto }); anotar('COMPARTIR', pendiente.numero); setPendiente(null) } catch { /* cancelado */ } }}
                  style={{ marginTop:8, width:'100%', padding:'9px', borderRadius:10, border:'none', background:'#047857', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                  📎 Compartir el PDF (elija WhatsApp)
                </button>
              )}
              {pendiente?.tipo === 'wa' && (
                <a href={pendiente.url} target="_blank" rel="noreferrer" onClick={() => { anotar('WHATSAPP_WEB', pendiente.numero); setPendiente(null) }}
                  style={{ marginTop:8, display:'block', textAlign:'center', padding:'9px', borderRadius:10, background:'#25D366', color:'#fff', fontWeight:800, textDecoration:'none' }}>
                  Abrir WhatsApp con el recibo
                </a>
              )}
              <div style={{ fontSize:11, color:'#64748B', marginTop:6 }}>Con el WhatsApp del sistema conectado, el PDF le llega directo al cliente.</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReciboCobro({ polizaId, pagoId, loteId, telefono = '', resultado, onClose }) {
  const [poliza, setPoliza] = useState(null)
  const [empresa, setEmpresa] = useState(null)

  useEffect(() => {
    Promise.all([api.get(`/polizas/${polizaId}`), api.get('/empresa')])
      .then(([p, e]) => { setPoliza(p.data.data); setEmpresa(e.data.data || {}) })
      .catch(() => toast.error('No se pudo cargar el recibo'))
  }, [polizaId])

  const recibo = poliza ? agruparRecibos((poliza.pagos || []).filter(x => !x.anulado && (loteId ? x.lote_id === loteId : x.id === pagoId)))[0] : null
  // Un abono que completa el periodo ya es pago (lo dice el servidor al cobrar)
  const esAbono = resultado ? resultado === 'PARCIAL' : !!recibo?.parcial

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.45)', backdropFilter:'blur(3px)', zIndex:1400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:460, boxShadow:'0 24px 70px rgba(0,0,0,.28)', overflow:'hidden' }}>
        <div style={{ padding:'20px 22px', background:'linear-gradient(135deg,#047857,#10B981)', color:'#fff', textAlign:'center', position:'relative' }}>
          <button onClick={onClose} title="Cerrar" style={{ position:'absolute', right:12, top:12, border:'1.5px solid rgba(255,255,255,.35)', background:'rgba(255,255,255,.12)', color:'#fff', width:32, height:32, borderRadius:10, cursor:'pointer' }}><X size={15}/></button>
          <CheckCircle2 size={34}/>
          <div style={{ fontSize:13, fontWeight:700, opacity:.9, marginTop:4 }}>{esAbono ? 'Abono registrado' : 'Pago registrado'}</div>
          <div style={{ fontSize:28, fontWeight:900, lineHeight:1.2 }}>{recibo ? fmt(recibo.total) : '…'}</div>
          {recibo && <div style={{ fontSize:12.5, opacity:.9 }}>Recibo N.° {recibo.numero}</div>}
        </div>
        {!recibo ? <div style={{ padding:30, textAlign:'center' }}><Loader2 size={22} className="spin pl-spin"/></div> : (
          <div style={{ padding:'16px 22px 20px' }}>
            <div style={{ fontSize:13, color:'#334155', lineHeight:1.7, marginBottom:14 }}>
              <div><b>{poliza.titular_nombre}</b> · Póliza {poliza.numero_legado || poliza.numero}</div>
              <div>{esAbono ? 'Abono parcial' : recibo.parcial ? 'Completa el periodo' : 'Cuota'} · <FormaPagoTag codigo={recibo.pago.metodo_pago} size={14}/></div>
              {poliza.pago_hasta && <div style={{ color:'#047857', fontWeight:700 }}>Cubierta hasta el {fLarga(poliza.pago_hasta)}</div>}
            </div>
            <PanelRecibo poliza={poliza} empresa={empresa} recibo={recibo} telefono={telefono}/>
          </div>
        )}
      </div>
    </div>
  )
}
