/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración de Empresa                             ║
 * ║  Archivo         : empresa.service.js                                   ║
 * ║  Fecha           : 2026-06-30                                           ║
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import api from './api.js'

export const empresaService = {
  obtener:              ()       => api.get('/empresa'),
  actualizar:           (data)   => api.put('/empresa', data),
  actualizarParametros: (data)   => api.put('/empresa/parametros', data),

  listarSedes:   (params) => api.get('/empresa/sedes', { params }),
  crearSede:     (data)   => api.post('/empresa/sedes', data),
  actualizarSede:(id, d)  => api.put(`/empresa/sedes/${id}`, d),

  listarPlanes:   (params) => api.get('/empresa/planes', { params }),
  crearPlan:      (data)   => api.post('/empresa/planes', data),
  actualizarPlan: (id, d)  => api.put(`/empresa/planes/${id}`, d),

  listarServicios:    (params) => api.get('/empresa/servicios', { params }),
  crearServicio:      (data)   => api.post('/empresa/servicios', data),
  actualizarServicio: (id, d)  => api.put(`/empresa/servicios/${id}`, d),
}
