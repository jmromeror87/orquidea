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
let _cache = null

export function useFormasPago() {
  const [formas, setFormas] = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) return
    api.get('/formas-pago')
      .then(r => {
        _cache = r.data.data || []
        setFormas(_cache)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /** Nombre legible de una forma por su código */
  const label = (codigo) => {
    const f = formas.find(x => x.codigo === codigo)
    return f ? `${f.icono} ${f.nombre}` : codigo
  }

  /** Objeto {codigo} para usar como value inicial */
  const defaultCodigo = formas[0]?.codigo || 'efectivo'

  return { formas, loading, label, defaultCodigo }
}
