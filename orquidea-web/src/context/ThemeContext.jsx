/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Tema — colores corporativos dinámicos                ║
 * ║  Archivo         : context/ThemeContext.jsx                             ║
 * ║  Fecha           : 2026-07-30                                          ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { empresaService } from '../services/empresa.service.js'
import { useAuthStore } from '../store/auth.store.js'

const ThemeContext = createContext(null)

function ajustarBrillo(hex, porcentaje) {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return hex
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const ajustar = c => {
    const v = porcentaje >= 0
      ? c + (255 - c) * porcentaje
      : c + c * porcentaje
    return Math.max(0, Math.min(255, Math.round(v)))
  }
  const toHex = c => c.toString(16).padStart(2, '0')
  return `#${toHex(ajustar(r))}${toHex(ajustar(g))}${toHex(ajustar(b))}`
}

export function aplicarColoresTema(colorPrimario, colorAcento) {
  const root = document.documentElement.style
  if (colorPrimario) {
    root.setProperty('--color-primary', colorPrimario)
    root.setProperty('--color-primary-lt', ajustarBrillo(colorPrimario, 0.22))
    root.setProperty('--color-primary-dk', ajustarBrillo(colorPrimario, -0.22))
    root.setProperty('--color-sidebar', ajustarBrillo(colorPrimario, -0.35))
  }
  if (colorAcento) {
    root.setProperty('--color-accent', colorAcento)
    root.setProperty('--color-accent-lt', ajustarBrillo(colorAcento, 0.35))
  }
}

export function ThemeProvider({ children }) {
  const [cargado, setCargado] = useState(false)
  const token = useAuthStore(s => s.token)

  const recargarTema = useCallback(() => {
    if (!useAuthStore.getState().token) { setCargado(true); return }
    empresaService.obtener()
      .then(res => {
        const { color_primario, color_acento } = res.data.data || {}
        aplicarColoresTema(color_primario, color_acento)
      })
      .catch(() => {})
      .finally(() => setCargado(true))
  }, [])

  useEffect(() => { recargarTema() }, [recargarTema, token])

  return (
    <ThemeContext.Provider value={{ cargado, recargarTema, aplicarColoresTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
