/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Layout — Footer                                      ║
 * ║  Archivo         : Footer.jsx                                           ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const CSS = `
  .ftr {
    height: 36px;
    background: #fff;
    border-top: 1px solid #ECEDF8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px;
    flex-shrink: 0;
    gap: 12px;
  }
  .ftr-left  { display:flex; align-items:center; gap:10px; }
  .ftr-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }

  .ftr-version {
    font-size: 12px;
    font-weight: 800;
    color: #374151;
    background: #F4F5FA;
    border: 1.5px solid #E2E5F0;
    border-radius: 20px;
    padding: 3px 13px;
  }
  .ftr-build {
    font-size: 11px;
    color: #9CA3AF;
  }
  .ftr-sep { width:1px; height:16px; background:#E2E5F0; flex-shrink:0; }

  .ftr-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 700;
    color: #059669;
    border: 1.5px solid #A7F3D0;
    border-radius: 20px;
    padding: 3px 13px;
  }
  .ftr-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 0 2px rgba(16,185,129,.25);
    animation: ftpulse 2s infinite;
  }
  @keyframes ftpulse {
    0%,100% { box-shadow: 0 0 0 2px rgba(16,185,129,.25); }
    50%      { box-shadow: 0 0 0 4px rgba(16,185,129,.1);  }
  }

  .ftr-copy {
    font-size: 11px;
    color: #9CA3AF;
    white-space: nowrap;
  }

  .ftr-dev-label {
    font-size: 11px;
    color: #9CA3AF;
    white-space: nowrap;
  }
  .ftr-dev-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #2E3192, #C9A020);
    border-radius: 20px;
    padding: 4px 14px 4px 5px;
  }
  .ftr-dev-avatar {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: rgba(255,255,255,.25);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
  }
  .ftr-dev-name {
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }
`

import { useState, useEffect } from 'react'
import api from '../../services/api.js'

export default function Footer() {
  const fecha = new Date().toISOString().slice(0, 10)
  const [razonSocial, setRazonSocial] = useState('Funeraria San José De Ábrego S.A.S')

  useEffect(() => {
    api.get('/empresa').then(r => {
      const rs = r.data.data?.razon_social
      if (rs) setRazonSocial(rs)
    }).catch(() => {})
  }, [])

  return (
    <>
      <style>{CSS}</style>
      <footer className="ftr">

        <div className="ftr-left">
          <div className="ftr-version">v1.0.0</div>
          <span className="ftr-build">build #1 · {fecha}</span>
          <div className="ftr-sep" />
          <div className="ftr-status">
            <div className="ftr-dot" />
            SISTEMA ACTIVO
          </div>
          <div className="ftr-sep" />
          <span className="ftr-copy">© 2026 Todos los derechos reservados · {razonSocial}</span>
        </div>

        <div className="ftr-right">
          <span className="ftr-dev-label">Desarrollado por</span>
          <div className="ftr-dev-badge">
            <div className="ftr-dev-avatar">J</div>
            <span className="ftr-dev-name">Ing. Jhoan Romero Rivera</span>
          </div>
        </div>

      </footer>
    </>
  )
}
