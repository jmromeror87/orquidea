/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Hook         : useFormasPago                                          ║
 * ║  Archivo      : hooks/useFormasPago.js                                 ║
 * ║  Fecha        : 2026-07-02                                             ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Carga las formas de pago activas desde la API y devuelve utilidades para
 * renderizarlas en selects, labels e íconos en cualquier módulo.
 */
import { useState, useEffect } from 'react'
import api from '../services/api.js'

// Cache en memoria para evitar múltiples llamadas en la misma sesión
let _cache = null      // TODAS (activas e inactivas): para mostrar pagos viejos con su ícono
let _promesa = null

// Códigos antiguos o técnicos que corresponden a una forma configurada
const ALIAS = { pse_online: 'pse', wompi: 'pse', banco: 'transferencia', tarjeta_credito: 'tarjeta', tarjeta_debito: 'tarjeta' }

export function useFormasPago() {
  const [todas, setTodas] = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) return
    _promesa = _promesa || api.get('/formas-pago', { params: { todas: 1 } }).then(r => { _cache = r.data.data || []; return _cache })
    _promesa.then(setTodas).catch(() => { _promesa = null }).finally(() => setLoading(false))
  }, [])

  const formas = todas.filter(f => f.activo !== false)

  /** La forma configurada para un código (también códigos antiguos) */
  const buscar = (codigo) => {
    if (!codigo) return null
    const c = String(codigo).toLowerCase()
    return todas.find(x => x.codigo === c) || todas.find(x => x.codigo === ALIAS[c]) || null
  }

  /** Nombre legible (texto) de una forma por su código — para textos y avisos */
  const label = (codigo) => buscar(codigo)?.nombre || codigo

  /** Objeto {codigo} para usar como value inicial */
  const defaultCodigo = formas[0]?.codigo || 'efectivo'

  return { formas, todas, loading, label, buscar, defaultCodigo }
}

// Configuración → Formas de pago llama esto al guardar para refrescar íconos
export function invalidarFormasPago() { _cache = null; _promesa = null }
