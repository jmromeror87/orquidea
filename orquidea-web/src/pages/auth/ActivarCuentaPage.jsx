/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Autenticación — Activación de cuenta                 ║
 * ║  Archivo         : ActivarCuentaPage.jsx                                ║
 * ║  Fecha           : 2026-07-30                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react'
import { authService } from '../../services/auth.service.js'

const CSS = `
  @keyframes ac-up   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes ac-spin { to{transform:rotate(360deg)} }

  .ac-wrap {
    min-height: 100vh; width: 100%;
    display: flex; align-items: center; justify-content: center;
    background: #F0F2F8; font-family: -apple-system,'Inter',system-ui,sans-serif;
    padding: 32px 16px;
  }
  .ac-inner { width: 100%; max-width: 420px; animation: ac-up .35s ease; }
  .ac-mob { text-align: center; margin-bottom: 24px; }
  .ac-mob-img {
    width: 64px; height: 64px; border-radius: 18px; overflow: hidden;
    border: 2px solid #E8EBF5; box-shadow: 0 4px 16px rgba(46,49,146,.12);
    background: #fff; margin: 0 auto 12px;
  }
  .ac-mob-img img { width:100%; height:100%; object-fit:cover; }
  .ac-mob-name { font-size: 19px; font-weight: 900; color: #0A0C24; }
  .ac-mob-sub { font-size: 10.5px; color: #9CA3AF; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 3px; }

  .ac-card {
    background: #fff; border-radius: 24px; padding: 40px 36px;
    border: 1px solid #E8EBF5;
    box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 10px 40px rgba(46,49,146,.07);
    position: relative; overflow: hidden;
  }
  .ac-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background: linear-gradient(90deg,#2E3192 0%,#5B6EE8 45%,#C9A020 75%,#F0D060 100%);
  }
  @media(max-width:480px){ .ac-card{ padding:30px 22px; border-radius:20px; } }

  .ac-lbl { font-size:10.5px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#9CA3AF; margin-bottom:10px; }
  .ac-title { font-size:25px; font-weight:900; color:#0A0C24; letter-spacing:-.6px; line-height:1.15; margin-bottom:6px; }
  .ac-sub { font-size:13.5px; color:#6B7280; line-height:1.55; margin-bottom:24px; }
  .ac-sep { height:1px; background:#F0F2FA; margin-bottom:22px; }

  .ac-field { margin-bottom:14px; }
  .ac-label { display:block; font-size:12px; font-weight:700; color:#374151; margin-bottom:7px; }
  .ac-iw { position:relative; display:flex; align-items:center; }
  .ac-ico { position:absolute; left:14px; color:#C0C6DE; z-index:1; display:flex; }
  .ac-iw:focus-within .ac-ico { color:#2E3192; }
  .ac-input {
    width:100%; padding:13px 46px 13px 44px; border:1.5px solid #E4E7F2; border-radius:12px;
    background:#F8F9FE; color:#0A0C24; font-size:14.5px; font-weight:500; outline:none;
    font-family:inherit; transition:border-color .18s,background .18s,box-shadow .18s;
  }
  .ac-input:focus { border-color:#2E3192; background:#fff; box-shadow:0 0 0 4px rgba(46,49,146,.08); }
  .ac-input.err { border-color:#EF4444; background:#FFF5F5; }
  .ac-eye { position:absolute; right:14px; background:none; border:none; cursor:pointer; color:#C0C6DE; z-index:1; }

  .ac-hint { font-size:11px; color:#9CA3AF; margin-top:6px; }

  .ac-error {
    display:flex; align-items:flex-start; gap:9px; background:#FFF1F1; border:1.5px solid #FECACA;
    border-radius:12px; padding:12px 14px; font-size:13px; font-weight:600; color:#DC2626; margin-bottom:16px;
  }
  .ac-btn {
    width:100%; padding:15px 20px; border-radius:13px; border:none;
    background:linear-gradient(135deg,#2E3192 0%,#252A88 100%); color:#fff;
    font-size:15px; font-weight:800; cursor:pointer; font-family:inherit;
    display:flex; align-items:center; justify-content:center; gap:10px;
    box-shadow:0 4px 16px rgba(46,49,146,.35); transition:all .2s; margin-top:6px;
  }
  .ac-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(46,49,146,.45); }
  .ac-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ac-spin { width:17px; height:17px; border-radius:50%; border:2.5px solid rgba(255,255,255,.3); border-top-color:#fff; animation:ac-spin .7s linear infinite; }

  .ac-center { text-align:center; padding:20px 0; }
  .ac-icon-circle {
    width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    margin:0 auto 18px;
  }
  .ac-foot { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:20px; font-size:11px; color:#A0A8C0; font-weight:500; }
`

export default function ActivarCuentaPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [estado, setEstado] = useState('cargando') // cargando | valido | invalido | listo
  const [usuario, setUsuario] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')

  const [form, setForm] = useState({ password:'', confirmar:'' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    authService.verificarActivacion(token)
      .then(res => { setUsuario(res.data.data); setEstado('valido') })
      .catch(err => { setErrorCarga(err.response?.data?.error || 'Enlace inválido'); setEstado('invalido') })
  }, [token])

  const submit = async e => {
    e.preventDefault()
    if (form.password.length < 8) return setError('La contraseña debe tener mínimo 8 caracteres')
    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden')
    setBusy(true); setError('')
    try {
      await authService.activarCuenta(token, form.password)
      setEstado('listo')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo activar la cuenta')
    } finally { setBusy(false) }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="ac-wrap">
        <div className="ac-inner">
          <div className="ac-mob">
            <div className="ac-mob-img"><img src="/logo.jpg" alt="Funeraria San José"/></div>
            <div className="ac-mob-name">ORQUÍDEA ERP</div>
            <div className="ac-mob-sub">Funeraria San José de Ábrego</div>
          </div>

          <div className="ac-card">
            {estado === 'cargando' && (
              <div className="ac-center">
                <Loader2 size={28} color="#2E3192" style={{ animation:'ac-spin 1s linear infinite' }}/>
                <div style={{ marginTop:14, fontSize:13.5, color:'#6B7280' }}>Verificando tu enlace…</div>
              </div>
            )}

            {estado === 'invalido' && (
              <div className="ac-center">
                <div className="ac-icon-circle" style={{ background:'#FFF1F1' }}>
                  <AlertCircle size={28} color="#DC2626"/>
                </div>
                <div className="ac-title">Enlace no válido</div>
                <div className="ac-sub">{errorCarga}</div>
                <Link to="/login" style={{ fontSize:13, fontWeight:700, color:'#2E3192', textDecoration:'none' }}>
                  Ir a iniciar sesión
                </Link>
              </div>
            )}

            {estado === 'valido' && (
              <>
                <div className="ac-lbl">Activación de cuenta</div>
                <div className="ac-title">Hola, {usuario?.nombre?.split(' ')[0]} 👋</div>
                <div className="ac-sub">
                  Estás activando tu cuenta de <strong>{usuario?.email}</strong> en Orquídea ERP.
                  Crea tu contraseña para continuar.
                </div>
                <div className="ac-sep"/>

                <form onSubmit={submit} noValidate>
                  <div className="ac-field">
                    <label className="ac-label" htmlFor="password">Nueva contraseña</label>
                    <div className="ac-iw">
                      <span className="ac-ico"><Lock size={15}/></span>
                      <input
                        id="password" type={show ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres" autoFocus
                        value={form.password}
                        onChange={e => { setForm(f=>({...f,password:e.target.value})); setError('') }}
                        className={`ac-input${error?' err':''}`} disabled={busy}
                      />
                      <button type="button" className="ac-eye" onClick={()=>setShow(v=>!v)} tabIndex={-1}>
                        {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>

                  <div className="ac-field" style={{ marginBottom:20 }}>
                    <label className="ac-label" htmlFor="confirmar">Confirmar contraseña</label>
                    <div className="ac-iw">
                      <span className="ac-ico"><Lock size={15}/></span>
                      <input
                        id="confirmar" type={show ? 'text' : 'password'}
                        placeholder="Repite tu contraseña"
                        value={form.confirmar}
                        onChange={e => { setForm(f=>({...f,confirmar:e.target.value})); setError('') }}
                        className={`ac-input${error?' err':''}`} disabled={busy}
                      />
                    </div>
                    <div className="ac-hint">Usa letras, números y algún símbolo para mayor seguridad.</div>
                  </div>

                  {error && (
                    <div className="ac-error">
                      <AlertCircle size={15} style={{ flexShrink:0, marginTop:1 }}/>
                      {error}
                    </div>
                  )}

                  <button type="submit" className="ac-btn" disabled={busy}>
                    {busy ? <><div className="ac-spin"/> Guardando…</> : <>Crear mi contraseña <ArrowRight size={16}/></>}
                  </button>
                </form>
              </>
            )}

            {estado === 'listo' && (
              <div className="ac-center">
                <div className="ac-icon-circle" style={{ background:'#F0FDF4' }}>
                  <CheckCircle2 size={28} color="#059669"/>
                </div>
                <div className="ac-title">¡Listo!</div>
                <div className="ac-sub">Tu contraseña quedó creada. Ya puedes iniciar sesión en Orquídea ERP.</div>
                <button className="ac-btn" onClick={() => navigate('/login', { replace:true })}>
                  Ir a iniciar sesión <ArrowRight size={16}/>
                </button>
              </div>
            )}
          </div>

          <div className="ac-foot">
            <ShieldCheck size={13} color="#CBD5E1"/>
            <span>© 2026 Funeraria San José de Ábrego S.A.S</span>
          </div>
        </div>
      </div>
    </>
  )
}
