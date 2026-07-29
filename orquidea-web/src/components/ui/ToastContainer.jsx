/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Core / UI                                           ║
 * ║  Archivo         : ToastContainer.jsx                                  ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-23                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useToastStore } from '../../store/toast.store.js'

const ICONS = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
  warning: '⚠️',
}

const COLORS = {
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  error:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '10px',
      maxWidth: '380px', width: '100%',
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            background: c.bg, border: `1px solid ${c.border}`,
            borderLeft: `4px solid ${c.border}`,
            borderRadius: '8px', padding: '12px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            animation: 'toast-in .22s ease',
            color: c.text, fontSize: '14px', lineHeight: '1.45',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{ICONS[t.type]}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: c.text, opacity: 0.6, fontSize: '16px', lineHeight: 1,
                padding: '0 2px', flexShrink: 0, marginTop: '-1px',
              }}
              aria-label="Cerrar"
            >×</button>
          </div>
        )
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
