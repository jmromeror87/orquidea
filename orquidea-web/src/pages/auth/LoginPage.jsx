/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Autenticación — Login v4                             ║
 * ║  Archivo         : LoginPage.jsx                                        ║
 * ║  Versión         : v4.0.0                                               ║
 * ║  Fecha           : 2026-07-01                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { authService }  from '../../services/auth.service.js'
import { useAuthStore } from '../../store/auth.store.js'

const STATS = [
  { value: '14', label: 'Módulos integrados' },
  { value: '100%', label: 'Facturación DIAN' },
  { value: '6', label: 'Roles de acceso' },
]

const CSS = `
  @keyframes lv4-up   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes lv4-spin { to{transform:rotate(360deg)} }
  @keyframes lv4-pulse{ 0%,100%{opacity:1} 50%{opacity:.4} }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  .lv4 {
    min-height: 100vh;
    width: 100%;
    display: flex;
    background: #F0F2F8;
    font-family: -apple-system, 'Inter', system-ui, sans-serif;
  }

  /* ══════════════════════════════
     COLUMNA IZQUIERDA — decorativa
  ══════════════════════════════ */
  .lv4-left {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    background: #fff;
    border-right: 1px solid #E8EBF5;
    padding: 52px 56px;
    width: 46%;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  @media(min-width: 960px) { .lv4-left { display: flex; } }
  @media(min-width: 1280px) { .lv4-left { width: 50%; padding: 60px 72px; } }

  /* Acento top-left */
  .lv4-left::before {
    content: '';
    position: absolute; top: 0; left: 0;
    width: 100%; height: 4px;
    background: linear-gradient(90deg, #2E3192, #5B6EE8 40%, #C9A020 70%, #F0D060);
  }

  /* Patrón de puntos */
  .lv4-dots {
    position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(circle, #E2E5F0 1.2px, transparent 1.2px);
    background-size: 28px 28px;
    opacity: .6;
  }

  /* Burbuja decorativa */
  .lv4-bubble {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(46,49,146,.06), rgba(201,160,32,.04));
    pointer-events: none;
  }
  .lv4-bubble1 { width:320px; height:320px; bottom:-80px; right:-60px; }
  .lv4-bubble2 { width:180px; height:180px; top:20%; right:10%; }

  .lv4-left-inner { position: relative; z-index: 1; }

  /* Logo */
  .lv4-logo {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 60px;
    animation: lv4-up .4s ease;
  }
  .lv4-logo-img {
    width: 52px; height: 52px; border-radius: 14px;
    overflow: hidden; border: 2px solid #E8EBF5;
    box-shadow: 0 2px 12px rgba(46,49,146,.1);
    background: #fff; flex-shrink: 0;
  }
  .lv4-logo-img img { width:100%; height:100%; object-fit:cover; }
  .lv4-logo-name {
    font-size: 18px; font-weight: 900; color: #0A0C24; letter-spacing: -.3px;
  }
  .lv4-logo-sub {
    font-size: 10px; font-weight: 600; color: #9CA3AF;
    letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;
  }

  /* Headline */
  .lv4-headline {
    margin-bottom: 48px;
    animation: lv4-up .4s .06s ease both;
  }
  .lv4-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: #EEF0FB; border-radius: 20px;
    padding: 5px 12px;
    font-size: 10.5px; font-weight: 700; color: #2E3192;
    letter-spacing: .8px; text-transform: uppercase;
    margin-bottom: 18px;
  }
  .lv4-tag-dot { width:6px; height:6px; border-radius:50%; background:#2E3192; }
  .lv4-h1 {
    font-size: 42px; font-weight: 900; color: #0A0C24;
    line-height: 1.08; letter-spacing: -1.5px; margin-bottom: 16px;
  }
  @media(min-width:1280px) { .lv4-h1 { font-size: 50px; } }
  .lv4-h1 span {
    color: #2E3192;
  }
  .lv4-desc {
    font-size: 15px; color: #6B7280; line-height: 1.7; max-width: 360px;
  }

  /* Stats */
  .lv4-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    animation: lv4-up .4s .12s ease both;
  }
  .lv4-stat {
    background: #F7F8FD; border: 1.5px solid #E8EBF5;
    border-radius: 14px; padding: 16px 14px;
    text-align: center;
  }
  .lv4-stat-val { font-size: 26px; font-weight: 900; color: #0A0C24; letter-spacing: -1px; }
  .lv4-stat-lbl { font-size: 10.5px; color: #9CA3AF; font-weight: 600; margin-top: 2px; }

  /* Feature icons row */
  .lv4-feats-row {
    display: flex; gap: 10px; flex-wrap: wrap;
    animation: lv4-up .4s .1s ease both; margin-bottom: 40px;
  }
  .lv4-feat-chip {
    display: flex; align-items: center; gap: 8px;
    background: #F7F8FD; border: 1.5px solid #E8EBF5;
    border-radius: 12px; padding: 10px 14px;
    font-size: 10.5px; font-weight: 700; color: #374151;
    transition: all .2s; white-space: nowrap;
  }
  .lv4-feat-chip:hover { border-color: #C7CBE8; background: #EEF0FB; color: #2E3192; }
  .lv4-feat-chip span { font-size: 18px; line-height: 1; }

  /* Pie izquierdo */
  .lv4-left-foot {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; color: #CBD5E1; font-weight: 500;
    animation: lv4-up .4s .18s ease both;
  }
  .lv4-lf-sep { width: 3px; height: 3px; border-radius: 50%; background: #E2E8F0; }

  /* ══════════════════════════════
     COLUMNA DERECHA — formulario
  ══════════════════════════════ */
  .lv4-right {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 20px; min-height: 100vh;
    background: #F0F2F8;
    position: relative;
  }

  .lv4-right-inner {
    width: 100%; max-width: 420px;
    animation: lv4-up .35s ease;
  }

  /* Logo mobile */
  .lv4-mob {
    text-align: center; margin-bottom: 28px;
  }
  @media(min-width: 960px) { .lv4-mob { display: none; } }
  .lv4-mob-img {
    width: 66px; height: 66px; border-radius: 18px;
    overflow: hidden; border: 2px solid #E8EBF5;
    box-shadow: 0 4px 16px rgba(46,49,146,.12);
    background: #fff; margin: 0 auto 12px;
  }
  .lv4-mob-img img { width:100%; height:100%; object-fit:cover; }
  .lv4-mob-name { font-size: 20px; font-weight: 900; color: #0A0C24; }
  .lv4-mob-sub { font-size: 10.5px; color: #9CA3AF; font-weight: 600;
    letter-spacing: 1.2px; text-transform: uppercase; margin-top: 3px; }

  /* Card */
  .lv4-card {
    background: #fff;
    border-radius: 24px;
    padding: 44px 40px 40px;
    border: 1px solid #E8EBF5;
    box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 10px 40px rgba(46,49,146,.07), 0 30px 60px rgba(46,49,146,.04);
    position: relative; overflow: hidden;
  }
  .lv4-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #2E3192 0%, #5B6EE8 45%, #C9A020 75%, #F0D060 100%);
  }
  @media(max-width: 480px) {
    .lv4-card { padding: 32px 22px 28px; border-radius: 20px; }
  }

  /* Card head */
  .lv4-card-lbl {
    font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; color: #9CA3AF; margin-bottom: 10px;
  }
  .lv4-card-title {
    font-size: 28px; font-weight: 900; color: #0A0C24;
    letter-spacing: -.7px; line-height: 1.12; margin-bottom: 6px;
  }
  .lv4-card-sub {
    font-size: 14px; color: #6B7280; line-height: 1.55; margin-bottom: 28px;
  }

  .lv4-sep {
    height: 1px; background: #F0F2FA; margin-bottom: 24px;
  }

  /* Inputs */
  .lv4-field { margin-bottom: 14px; }
  .lv4-label {
    display: block; font-size: 12px; font-weight: 700;
    color: #374151; letter-spacing: .2px; margin-bottom: 7px;
  }
  .lv4-iw { position: relative; display: flex; align-items: center; }
  .lv4-ico {
    position: absolute; left: 14px; pointer-events: none;
    color: #C0C6DE; transition: color .18s; z-index: 1;
    display: flex; align-items: center;
  }
  .lv4-iw:focus-within .lv4-ico { color: #2E3192; }
  .lv4-input {
    width: 100%; padding: 13px 16px 13px 44px;
    border: 1.5px solid #E4E7F2;
    border-radius: 12px;
    background: #F8F9FE;
    color: #0A0C24;
    font-size: 14.5px; font-weight: 500;
    outline: none; font-family: inherit;
    transition: border-color .18s, background .18s, box-shadow .18s;
  }
  .lv4-input::placeholder { color: #C8CCDE; font-weight: 400; }
  .lv4-input:focus {
    border-color: #2E3192; background: #fff;
    box-shadow: 0 0 0 4px rgba(46,49,146,.08);
  }
  .lv4-input.ok  { border-color: #10B981; background: #F0FDF4; }
  .lv4-input.err { border-color: #EF4444; background: #FFF5F5; box-shadow: 0 0 0 4px rgba(239,68,68,.07); }
  .lv4-eye {
    position: absolute; right: 14px; background: none; border: none;
    cursor: pointer; color: #C0C6DE; padding: 4px; line-height: 0;
    transition: color .18s; z-index: 1;
  }
  .lv4-eye:hover { color: #2E3192; }
  .lv4-check {
    position: absolute; right: 14px; color: #10B981;
    display: flex; align-items: center; pointer-events: none;
  }

  /* Error */
  .lv4-error {
    display: flex; align-items: flex-start; gap: 9px;
    background: #FFF1F1; border: 1.5px solid #FECACA;
    border-radius: 12px; padding: 12px 14px;
    font-size: 13px; font-weight: 600; color: #DC2626;
    margin-bottom: 16px;
  }

  /* Botón */
  .lv4-btn {
    width: 100%; padding: 15px 20px;
    border-radius: 13px; border: none;
    background: linear-gradient(135deg, #2E3192 0%, #252A88 100%);
    color: #fff;
    font-size: 15px; font-weight: 800; letter-spacing: .1px;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    position: relative; overflow: hidden;
    box-shadow: 0 4px 16px rgba(46,49,146,.35), 0 1px 4px rgba(0,0,0,.1);
    transition: all .2s;
    margin-top: 6px;
  }
  .lv4-btn::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,.13) 0%, transparent 60%);
    pointer-events: none;
  }
  .lv4-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(46,49,146,.45);
    background: linear-gradient(135deg, #3740A8 0%, #2E3192 100%);
  }
  .lv4-btn:active:not(:disabled) { transform: translateY(0); }
  .lv4-btn:disabled { opacity: .5; cursor: not-allowed; }

  .lv4-spin {
    width: 17px; height: 17px; border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff;
    animation: lv4-spin .7s linear infinite; flex-shrink: 0;
  }

  /* Seguridad */
  .lv4-sec {
    display: flex; align-items: center; gap: 8px;
    margin-top: 18px; justify-content: center;
    font-size: 11.5px; color: #9CA3AF; font-weight: 500;
  }
  .lv4-sec-badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: #F0FDF4; border: 1px solid #BBFFD4;
    border-radius: 20px; padding: 3px 10px;
    font-size: 11px; font-weight: 700; color: #059669;
  }
  .lv4-sec-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #059669;
    animation: lv4-pulse 2s ease-in-out infinite;
  }

  /* Footer bajo card */
  .lv4-foot {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-top: 20px;
    font-size: 11px; color: #A0A8C0; font-weight: 500;
  }
  .lv4-foot-sep { width: 3px; height: 3px; border-radius: 50%; background: #D1D8F0; }

  /* ── Responsive ── */
  @media(max-width: 959px) {
    .lv4-right { padding: 40px 16px 48px; }
  }
  @media(max-width: 480px) {
    .lv4-input { font-size: 16px; }
    .lv4-card-title { font-size: 24px; }
  }
`

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const emailRef = useRef(null)

  const [form, setForm] = useState({ email:'', password:'' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [valid, setValid] = useState({ email:false, pwd:false })

  useEffect(() => { emailRef.current?.focus() }, [])

  const change = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (error) setError('')
    if (name === 'email')    setValid(v => ({ ...v, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) }))
    if (name === 'password') setValid(v => ({ ...v, pwd: value.length >= 4 }))
  }

  const submit = async e => {
    e?.preventDefault()
    if (!form.email || !form.password) return setError('Ingrese su correo y contraseña.')
    setBusy(true); setError('')
    try {
      const res = await authService.login(form.email, form.password)
      const { token, usuario } = res.data.data
      setAuth(token, usuario)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Correo o contraseña incorrectos.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="lv4">

        {/* ══ IZQUIERDA ══ */}
        <div className="lv4-left">
          <div className="lv4-dots"/>
          <div className="lv4-bubble lv4-bubble1"/>
          <div className="lv4-bubble lv4-bubble2"/>

          <div className="lv4-left-inner">
            {/* Logo */}
            <div className="lv4-logo">
              <div className="lv4-logo-img">
                <img src="/logo.jpg" alt="Funeraria San José"/>
              </div>
              <div>
                <div className="lv4-logo-name">ORQUÍDEA ERP</div>
                <div className="lv4-logo-sub">Funeraria San José de Ábrego</div>
              </div>
            </div>

            {/* Headline */}
            <div className="lv4-headline">
              <div className="lv4-tag">
                <span className="lv4-tag-dot"/>
                Sistema de gestión funeraria
              </div>
              <h1 className="lv4-h1">
                Gestione toda su<br/>
                funeraria con<br/>
                <span>una sola herramienta.</span>
              </h1>
              <p className="lv4-desc">
                Contratos, servicios funerarios, pólizas de previsión,
                cartera y facturación electrónica DIAN — todo integrado,
                diseñado para Colombia.
              </p>
            </div>

            {/* Feature chips — solo emoji + nombre corto */}
            <div className="lv4-feats-row">
              {[
                ['📋','Contratos'],['🛡️','Pólizas'],['💳','Cartera'],
                ['📊','Reportes'],['⚙️','Servicios'],['👥','Terceros'],
              ].map(([e,l]) => (
                <div key={l} className="lv4-feat-chip">
                  <span>{e}</span> {l}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="lv4-stats" style={{ marginBottom: 32 }}>
              {STATS.map(s => (
                <div key={s.label} className="lv4-stat">
                  <div className="lv4-stat-val">{s.value}</div>
                  <div className="lv4-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="lv4-left-foot">
              <ShieldCheck size={13} color="#CBD5E1"/>
              <span>© 2026 Todos los derechos reservados · Funeraria San José de Ábrego S.A.S · SSL/TLS · Auditoría completa · RBAC · 🇨🇴</span>
            </div>
          </div>
        </div>

        {/* ══ DERECHA — FORMULARIO ══ */}
        <div className="lv4-right">
          <div className="lv4-right-inner">

            {/* Logo solo móvil */}
            <div className="lv4-mob">
              <div className="lv4-mob-img">
                <img src="/logo.jpg" alt="Funeraria San José"/>
              </div>
              <div className="lv4-mob-name">ORQUÍDEA ERP</div>
              <div className="lv4-mob-sub">Funeraria San José de Ábrego</div>
            </div>

            <div className="lv4-card">
              <div className="lv4-card-lbl">Acceso al sistema</div>
              <div className="lv4-card-title">Bienvenido 👋</div>
              <div className="lv4-card-sub">Ingrese sus credenciales para continuar.</div>

              <div className="lv4-sep"/>

              <form onSubmit={submit} noValidate>
                {/* Email */}
                <div className="lv4-field">
                  <label className="lv4-label" htmlFor="email">Correo electrónico</label>
                  <div className="lv4-iw">
                    <span className="lv4-ico"><Mail size={15}/></span>
                    <input
                      ref={emailRef}
                      id="email" name="email" type="email"
                      autoComplete="email"
                      placeholder="usuario@empresa.com"
                      value={form.email} onChange={change} disabled={busy}
                      className={`lv4-input${error?' err':valid.email?' ok':''}`}
                    />
                    {valid.email && !error && (
                      <span className="lv4-check"><CheckCircle2 size={15}/></span>
                    )}
                  </div>
                </div>

                {/* Contraseña */}
                <div className="lv4-field" style={{ marginBottom:20 }}>
                  <label className="lv4-label" htmlFor="password">Contraseña</label>
                  <div className="lv4-iw">
                    <span className="lv4-ico"><Lock size={15}/></span>
                    <input
                      id="password" name="password"
                      type={show ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={form.password} onChange={change} disabled={busy}
                      style={{ paddingRight: 46 }}
                      className={`lv4-input${error?' err':valid.pwd?' ok':''}`}
                    />
                    <button type="button" className="lv4-eye"
                      onClick={() => setShow(v => !v)} tabIndex={-1}>
                      {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="lv4-error">
                    <AlertCircle size={15} style={{ flexShrink:0, marginTop:1 }}/>
                    {error}
                  </div>
                )}

                <button type="submit" className="lv4-btn" disabled={busy}>
                  {busy
                    ? <><div className="lv4-spin"/> Verificando…</>
                    : <>Ingresar al sistema <ArrowRight size={16}/></>
                  }
                </button>
              </form>

              <div className="lv4-sec">
                <span className="lv4-sec-badge">
                  <span className="lv4-sec-dot"/> Sistema activo
                </span>
                <span>Orquídea ERP v1.0.0</span>
              </div>
            </div>

            <div className="lv4-foot">
              <span>© 2026 Todos los derechos reservados</span>
              <span className="lv4-foot-sep"/>
              <span>Funeraria San José de Ábrego S.A.S</span>
            </div>

          </div>
        </div>

      </div>
    </>
  )
}
