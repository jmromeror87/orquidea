/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : components/LeadForm.jsx                             ║
 * ║  Versión         : v1.0.0                                              ║
 * ║  Fecha           : 2026-07-28                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
'use client'

import { useState } from 'react'
import { crearLead } from '@/lib/api'
import BenefitIcon from './BenefitIcons'

export default function LeadForm({ origen = 'landing' }) {
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', mensaje: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [enviado, setEnviado] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await crearLead({ ...form, origen })
      setEnviado(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gold-400/40 bg-gold-100/30 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-900 text-gold-400">
          <BenefitIcon name="check" className="h-6 w-6" />
        </span>
        <p className="mt-4 font-serif text-xl text-brand-900">¡Listo, {form.nombre.split(' ')[0]}!</p>
        <p className="mt-2 text-sm text-stone-600">
          Recibimos tu solicitud. Una asesora se comunicará contigo muy pronto.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Solicita información</p>
      <h3 className="mt-1 font-serif text-2xl text-brand-900">Inscríbete si te interesa</h3>
      <p className="mt-2 text-sm text-stone-600">
        Déjanos tu nombre, correo y celular — un profesional se comunicará contigo.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-semibold text-stone-700">Nombre completo</span>
          <input
            required
            value={form.nombre}
            onChange={set('nombre')}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            placeholder="Tu nombre"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-stone-700">Correo electrónico</span>
          <input
            type="email"
            value={form.correo}
            onChange={set('correo')}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            placeholder="tucorreo@ejemplo.com"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-stone-700">Número de celular</span>
          <input
            required
            type="tel"
            value={form.telefono}
            onChange={set('telefono')}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            placeholder="300 000 0000"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-stone-700">Mensaje (opcional)</span>
          <textarea
            value={form.mensaje}
            onChange={set('mensaje')}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            placeholder="Cuéntanos qué necesitas"
          />
        </label>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition hover:bg-gold-400 disabled:opacity-60"
      >
        {loading ? 'Enviando…' : 'Inscríbeme, quiero que me contacten'}
      </button>
    </form>
  )
}
