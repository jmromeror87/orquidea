/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Seguridad — permisos del usuario en sesión           ║
 * ║  Archivo         : store/permisos.store.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-19                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Permisos del rol en sesión (permisos_roles), cargados una vez y compartidos
 * por el menú y la protección de rutas.
 */
import { useEffect } from 'react'
import { create } from 'zustand'
import api from '../services/api.js'
import { useAuthStore } from './auth.store.js'
import { MODULOS, moduloDeRuta, ROLES_TOTALES } from '../config/modulos.js'

const usePermisosStore = create(set => ({
  clave: null,      // sesión (token) para la que se cargaron
  rol: null,
  estado: 'idle',   // idle | cargando | listo
  mapa: {},         // { polizas: { ver:true, crear:false, … } }
  paginaInicio: null, // módulo elegido como ventana de inicio del usuario
  cargar: async (rol, clave) => {
    set({ rol, clave, estado: 'cargando' })
    try {
      const r = await api.get('/permisos/mis-permisos')
      const mapa = {}
      for (const p of r.data.data || []) (mapa[p.modulo] ||= {})[p.accion] = p.permitido === true
      const paginaInicio = r.data.meta?.pagina_inicio || null
      set(s => (s.clave === clave ? { mapa, paginaInicio, estado: 'listo' } : s))
    } catch {
      set(s => (s.clave === clave ? { mapa: {}, paginaInicio: null, estado: 'listo' } : s))
    }
  },
  limpiar: () => set({ clave: null, rol: null, estado: 'idle', mapa: {}, paginaInicio: null }),
}))

/** Recarga los permisos (p. ej. después de cambiar la matriz). */
export const recargarPermisos = () => {
  const { rol, clave, cargar } = usePermisosStore.getState()
  if (rol) cargar(rol, clave)
}

/**
 * { listo, puede(moduloORuta, accion='ver'), inicio }
 * `inicio` = la ventana de inicio elegida para el usuario (Usuarios → editar)
 * si su rol la puede ver; si no, la primera página permitida en el orden del
 * menú (sin Dashboard entra directo a lo suyo; p. ej. un recaudador → Recaudo).
 */
export function usePermisos() {
  const rol = useAuthStore(s => s.usuario?.rol)
  const token = useAuthStore(s => s.token)
  const { clave, estado, mapa, paginaInicio, cargar } = usePermisosStore()
  const total = ROLES_TOTALES.includes(rol)

  // Se cargan al abrir la app (también para administradores: traen su ventana
  // de inicio); si cambió la matriz o la ventana, aplica al recargar
  useEffect(() => {
    if (rol && token !== clave) cargar(rol, token)
  }, [rol, token, clave, cargar])

  const listo = !!rol && clave === token && estado === 'listo'
  const puede = (modOrRuta, accion = 'ver') => {
    if (!rol) return false
    if (total) return true
    const modulo = String(modOrRuta).startsWith('/') ? moduloDeRuta(modOrRuta) : modOrRuta
    return !!modulo && mapa[modulo]?.[accion] === true
  }
  const elegido = paginaInicio && puede(paginaInicio) ? MODULOS.find(m => m.key === paginaInicio) : null
  const primero = elegido || MODULOS.find(m => puede(m.key))
  const inicio = primero ? primero.rutas[0] : null
  return { listo, puede, inicio }
}
