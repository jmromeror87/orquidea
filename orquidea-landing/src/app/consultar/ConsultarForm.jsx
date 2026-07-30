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

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { consultarEstado, iniciarPago, consultarEstadoPago, cop } from '@/lib/api'

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

const PAGO_ESTADO_LABEL = {
  aprobado: { texto: '¡Pago aprobado! Gracias por ponerte al día.', clase: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rechazado: { texto: 'El pago fue rechazado. Puedes intentarlo de nuevo.', clase: 'bg-red-50 text-red-800 border-red-200' },
  pendiente: { texto: 'Estamos confirmando tu pago con el banco. Esto puede tardar unos segundos…', clase: 'bg-gold-50 text-gold-700 border-gold-200' },
}

const TIPO_PLAN_LABEL = { INDIVIDUAL: 'Individual', FAMILIAR: 'Familiar', AMPLIADO: 'Ampliado', COLECTIVO: 'Colectivo' }
const METODO_LABEL = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', cheque: 'Cheque',
  descuento_nomina: 'Descuento nómina', pse: 'PSE', pse_online: 'Pago en línea',
}
const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function Dato({ label, valor }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-semibold text-brand-900">{valor}</dd>
    </div>
  )
}

function Seccion({ titulo, icono, children }) {
  return (
    <div className="mt-6 border-t border-stone-100 pt-6 first:mt-0 first:border-0 first:pt-0">
      <h3 className="flex items-center gap-2 font-serif text-lg text-brand-900">
        <span>{icono}</span> {titulo}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  )
}

const ATAUD_LABEL = { BASICO: 'Básico', MEDIANO: 'Mediano', PREMIUM: 'Premium', LUJO: 'Lujo' }

const COBERTURA_ITEMS = (c) => [
  c.cubre_ataud && { label: 'Ataúd', valor: ATAUD_LABEL[c.cubre_ataud] || c.cubre_ataud },
  c.cubre_velacion_h && { label: 'Horas de velación', valor: `${c.cubre_velacion_h}h` },
  c.cubre_traslado_local != null && { label: 'Traslado local', valor: c.cubre_traslado_local ? 'Incluido' : 'No incluido' },
  c.cubre_traslado_nacional != null && { label: 'Traslado nacional', valor: c.cubre_traslado_nacional ? 'Incluido' : 'No incluido' },
  c.cubre_flores != null && { label: 'Flores', valor: c.cubre_flores ? 'Incluido' : 'No incluido' },
  c.cubre_cremacion != null && { label: 'Cremación', valor: c.cubre_cremacion ? 'Incluido' : 'No incluido' },
  c.cubre_tramites != null && { label: 'Trámites legales', valor: c.cubre_tramites ? 'Incluido' : 'No incluido' },
  c.cubre_lapida != null && { label: 'Lápida', valor: c.cubre_lapida ? 'Incluido' : 'No incluido' },
].filter(Boolean)

export default function ConsultarForm() {
  const searchParams = useSearchParams()
  const [tipo, setTipo] = useState('POLIZA')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [numero, setNumero] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [pagando, setPagando] = useState(false)
  const [estadoPago, setEstadoPago] = useState(null) // 'pendiente' | 'aprobado' | 'rechazado'

  // Si venimos de vuelta del checkout de Wompi (?ref=...), consultar el estado
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (!ref) return
    let intentos = 0
    const revisar = async () => {
      try {
        const data = await consultarEstadoPago(ref)
        setEstadoPago(data.estado)
        if (data.estado === 'pendiente' && intentos < 8) {
          intentos++
          setTimeout(revisar, 3000)
        }
      } catch { /* silencioso — no bloquea el resto de la página */ }
    }
    revisar()
  }, [searchParams])

  async function pagarAhora() {
    setPagando(true)
    setError(null)
    try {
      const { checkoutUrl } = await iniciarPago({ numero_documento: numeroDocumento.trim(), numero: numero.trim(), tipo })
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el pago')
      setPagando(false)
    }
  }

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

      {estadoPago && (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${PAGO_ESTADO_LABEL[estadoPago]?.clase || 'bg-stone-50 text-stone-700 border-stone-200'}`}>
          {PAGO_ESTADO_LABEL[estadoPago]?.texto || estadoPago}
        </p>
      )}

      {resultado && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          {/* ── Encabezado: titular + estado ── */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-brand-900">{resultado.titular?.nombre || '—'}</h2>
              <p className="mt-1 text-sm text-stone-500">
                {tipo === 'POLIZA' ? `Póliza N° ${resultado.numero}` : `Contrato N° ${resultado.numero}`}
                {' · '}CC {resultado.titular?.numero_documento}
                {resultado.titular?.telefono && <> · {resultado.titular.telefono}</>}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_COLOR[resultado.estado] || 'bg-stone-100 text-stone-700'}`}>
              {ESTADO_LABEL[resultado.estado] || resultado.estado}
            </span>
          </div>

          {/* ── Datos generales ── */}
          <Seccion titulo={tipo === 'POLIZA' ? resultado.plan : resultado.paquete || 'Contrato'} icono="📄">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Dato label="Cuota mensual" valor={`${cop(resultado.valor_cuota)}/mes`} />
              {resultado.dia_cobro && <Dato label="Día de cobro" valor={`Día ${resultado.dia_cobro} de cada mes`} />}
              <Dato label="Meses en mora" valor={resultado.meses_mora || 0} />
              <Dato label="Saldo en mora" valor={cop(resultado.saldo_mora)} />
              {resultado.ultimo_pago && <Dato label="Último pago" valor={fmtFecha(resultado.ultimo_pago)} />}
              {resultado.pago_hasta && <Dato label="Pagado hasta" valor={fmtFecha(resultado.pago_hasta)} />}
              <Dato label="Fecha inicio" valor={fmtFecha(resultado.fecha_inicio)} />
              {resultado.fecha_fin_carencia && (
                <Dato
                  label="Fin carencia"
                  valor={<>{fmtFecha(resultado.fecha_fin_carencia)} {resultado.en_carencia ? '⏳' : '✅'}</>}
                />
              )}
              {tipo === 'CONTRATO' && resultado.valor_total != null && (
                <>
                  <Dato label="Valor total" valor={cop(resultado.valor_total)} />
                  <Dato label="Valor pagado" valor={cop(resultado.valor_pagado)} />
                </>
              )}
            </dl>
          </Seccion>

          {/* ── Afiliados / cobertura (solo pólizas) ── */}
          {tipo === 'POLIZA' && (
            <>
              <Seccion titulo="Afiliados" icono="👥">
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <Dato label="Tipo de plan" valor={TIPO_PLAN_LABEL[resultado.plan_tipo] || resultado.plan_tipo} />
                  <Dato label="Máx. beneficiarios" valor={`${resultado.cobertura?.max_beneficiarios ?? '—'} personas`} />
                  <Dato label="Afiliados actuales" valor={`${resultado.afiliados_actuales ?? 0} personas`} />
                </dl>
                {resultado.beneficiarios?.length > 0 && (
                  <ul className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-100">
                    {resultado.beneficiarios.map((b, i) => (
                      <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="font-medium text-brand-900">{b.nombre}</span>
                        <span className="text-stone-500">{b.parentesco}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Seccion>

              <Seccion titulo="Cobertura" icono="🛡️">
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  {COBERTURA_ITEMS(resultado.cobertura || {}).map((it, i) => (
                    <Dato key={i} label={it.label} valor={it.valor} />
                  ))}
                  {Number(resultado.cobertura?.valor_excedente) > 0 && (
                    <Dato label="Valor excedente" valor={cop(resultado.cobertura.valor_excedente)} />
                  )}
                </dl>
              </Seccion>
            </>
          )}

          {/* ── Historial de pagos ── */}
          {resultado.pagos?.length > 0 && (
            <Seccion titulo="Historial de pagos" icono="🧾">
              <div className="overflow-x-auto rounded-lg border border-stone-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Recibo</th>
                      <th className="px-4 py-2 font-semibold">Mes</th>
                      <th className="px-4 py-2 font-semibold">Fecha de pago</th>
                      <th className="px-4 py-2 font-semibold">Método</th>
                      <th className="px-4 py-2 text-right font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {resultado.pagos.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-stone-600">#{p.numero_recibo}</td>
                        <td className="px-4 py-2 text-stone-600">
                          {new Date(p.mes_correspondiente).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2 text-stone-600">{fmtFecha(p.fecha_pago)}</td>
                        <td className="px-4 py-2 text-stone-600">{METODO_LABEL[p.metodo_pago] || p.metodo_pago}</td>
                        <td className="px-4 py-2 text-right font-semibold text-brand-900">{cop(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Seccion>
          )}

          {/* ── Pagar saldo pendiente ── */}
          {Number(resultado.saldo_mora) > 0 && (
            <div className="mt-6 rounded-lg bg-gold-100 px-4 py-4 text-sm text-gold-700">
              <p>Tienes un saldo pendiente de <strong>{cop(resultado.saldo_mora)}</strong>.</p>
              <button
                type="button"
                onClick={pagarAhora}
                disabled={pagando}
                className="mt-3 w-full rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60 sm:w-auto"
              >
                {pagando ? 'Redirigiendo a pago seguro…' : `Pagar ahora ${cop(resultado.saldo_mora)}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
