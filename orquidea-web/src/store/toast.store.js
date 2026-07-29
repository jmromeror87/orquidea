/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Core / UI                                           ║
 * ║  Archivo         : toast.store.js                                      ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-23                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { create } from 'zustand'

let _id = 0

export const useToastStore = create((set) => ({
  toasts: [],
  add(type, message, duration = 4000) {
    const id = ++_id
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }))
    if (duration > 0) setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration)
  },
  remove(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))

export const toast = {
  success: (msg, dur) => useToastStore.getState().add('success', msg, dur),
  error:   (msg, dur) => useToastStore.getState().add('error',   msg, dur),
  info:    (msg, dur) => useToastStore.getState().add('info',    msg, dur),
  warning: (msg, dur) => useToastStore.getState().add('warning', msg, dur),
}
