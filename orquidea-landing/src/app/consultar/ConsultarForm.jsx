/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Landing Pública                                     ║
 * ║  Archivo         : app/consultar/ConsultarForm.jsx                     ║
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
import { consultarEstado, cop } from '@/lib/api'

const ESTADO_LABEL = {
  VIGENTE: 'Vigente', SUSPENDIDA: 'Suspendida', VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada', EJECUTADA: 'Ejecutada',
  activo: 'Activo', finalizado: 'Finalizado', cancelado: 'Cancelado',
}

const ESTADO_COLOR = {
  VIGENTE: 'bg-emerald-100 text-emerald-800', activo: 'bg-emerald-100 text-emerald-800',
  SUSPENDIDA: 'bg-gold-100 text-gold-700', VENCIDA: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-stone-200 text-stone-700', cancelado: 'bg-stone-200 text-stone-700',
  EJECUTADA: 'bg-stone-200 text-stone-700', finalizado: 'bg-stone-200 text-stone-700',
}

export default function ConsultarForm() {
  const [tipo, setTipo] = useState('POLIZA')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [numero, setNumero] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResultado(null)
    try {
      const data = await consultarEstado({ numero_documento: numeroDocumento.trim(), numero: numero.trim(), tipo })
      setResultado(data)
    } catch (err) {
      setError(err.message || 'No se pudo consultar el estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-10">
      <form onSubmit={onSubmit} className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <div className="flex gap-3">
          {['POLIZA', 'CONTRATO'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tipo === t ? 'bg-brand-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t === 'POLIZA' ? 'Póliza' : 'Contrato'}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold text-stone-700">Número de cédula del titular</span>
            <input
              required
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              placeholder="Ej: 1091234567"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-stone-700">
              Número de {tipo === 'POLIZA' ? 'póliza' : 'contrato'}
            </span>
            <input
              required
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              placeholder="Ej: 1024"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition hover:bg-gold-400 disabled:opacity-60 sm:w-auto"
        >
          {loading ? 'Consultando…' : 'Consultar estado'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {resultado && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-brand-900">
              {tipo === 'POLIZA' ? resultado.plan : `Contrato ${resultado.tipo_contrato}`}
            </h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_COLOR[resultado.estado] || 'bg-stone-100 text-stone-700'}`}>
              {ESTADO_LABEL[resultado.estado] || resultado.estado}
            </span>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-stone-500">Cuota mensual</dt>
              <dd className="font-semibold text-brand-900">{cop(resultado.valor_cuota)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Meses en mora</dt>
              <dd className="font-semibold text-brand-900">{resultado.meses_mora || 0}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Saldo en mora</dt>
              <dd className="font-semibold text-brand-900">{cop(resultado.saldo_mora)}</dd>
            </div>
            {resultado.pago_hasta && (
              <div>
                <dt className="text-stone-500">Pagado hasta</dt>
                <dd className="font-semibold text-brand-900">
                  {new Date(resultado.pago_hasta).toLocaleDateString('es-CO')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-stone-500">Fecha de inicio</dt>
              <dd className="font-semibold text-brand-900">
                {new Date(resultado.fecha_inicio).toLocaleDateString('es-CO')}
              </dd>
            </div>
          </dl>
          {Number(resultado.meses_mora) > 0 && (
            <p className="mt-6 rounded-lg bg-gold-100 px-4 py-3 text-sm text-gold-700">
              Tienes pagos pendientes. Comunícate con nosotros para ponerte al día y evitar la suspensión.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
