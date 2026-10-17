/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Pólizas — renovación anual (incremento SMMLV)        ║
 * ║  Archivo         : services/incrementoPolizas.service.js                ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Reglas (migración 109):
 *  · Cuándo sube la cuota: parametros_sistema.incremento_modo
 *      'ANIVERSARIO' → el día que cada póliza cumple año
 *      'ENERO'       → el 1 de enero, todas
 *  · Cuánto: salario_minimo.porcentaje_aplicar (decisión de gerencia) o, si no
 *    hay, el % de aumento del SMMLV de ese año. Sin decreto aún → % proyectado.
 *  · Redondeo: parametros_sistema.incremento_redondeo (100 = a la centena).
 *  · Los periodos pagados por adelantado se cobran con la tarifa del año en que
 *    EMPIEZA cada periodo (planDePago recibe cuotaPorPeriodo).
 *  · renovarPolizas() corre cada noche (server.js) y al arrancar: aplica las
 *    renovaciones cuya fecha ya llegó. Nunca cobra años atrasados: las pólizas
 *    existentes arrancan con tarifa_desde = día de la migración.
 */
import { construirTarifas, cuotaPorPeriodo, cortesIncremento, redondearCuota, iso, ymd } from '../utils/periodosPoliza.js'

export async function configIncremento(client) {
  const [par, sm] = await Promise.all([
    client.query(`SELECT incremento_modo, incremento_redondeo FROM parametros_sistema LIMIT 1`),
    client.query(`SELECT anio, valor, porcentaje_smmlv, porcentaje_aplicar, proyectado, decreto FROM salario_minimo ORDER BY anio`),
  ])
  const porcentajes = {}
  for (const r of sm.rows) {
    const pct = r.porcentaje_aplicar ?? r.porcentaje_smmlv
    if (pct != null) porcentajes[r.anio] = { porcentaje: Number(pct), proyectado: r.proyectado }
  }
  return {
    modo: par.rows[0]?.incremento_modo || 'ANIVERSARIO',
    redondeo: Number(par.rows[0]?.incremento_redondeo ?? 100),
    porcentajes,
    anios: sm.rows,
  }
}

export function tarifasDePoliza(pol, cfg, n = 6) {
  const tarifas = construirTarifas(pol, cfg, n)
  return { tarifas, cuotaFn: cuotaPorPeriodo(tarifas) }
}

// Aplica las renovaciones cuya fecha ya llegó (todas o una póliza)
export async function renovarPolizas(client, { usuario_id = null, polizaId = null, hoy = new Date() } = {}) {
  const cfg = await configIncremento(client)
  const hoyIso = iso({ y: hoy.getFullYear(), m: hoy.getMonth(), d: hoy.getDate() })
  const { rows } = await client.query(`
    SELECT id, numero, fecha_inicio, valor_cuota, COALESCE(tarifa_desde, fecha_inicio) AS tarifa_desde
    FROM polizas WHERE estado NOT IN ('CANCELADA','EJECUTADA') ${polizaId ? 'AND id = $1' : ''}`, polizaId ? [polizaId] : [])
  const aplicadas = [], pendientes = []
  for (const pol of rows) {
    let cuota = Number(pol.valor_cuota)
    let desde = iso(ymd(pol.tarifa_desde))
    for (const corte of cortesIncremento(pol, cfg.modo, desde, 10)) {
      if (corte > hoyIso) break
      const anio = +corte.slice(0, 4)
      const info = cfg.porcentajes[anio]
      if (!info) { pendientes.push({ poliza: pol.numero, fecha: corte, anio }); break }
      const nueva = redondearCuota(cuota * (1 + info.porcentaje / 100), cfg.redondeo)
      await client.query(`
        INSERT INTO poliza_renovaciones (poliza_id, fecha, anio_smmlv, porcentaje, proyectado, cuota_anterior, cuota_nueva, modo, usuario_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (poliza_id, fecha) DO NOTHING`,
        [pol.id, corte, anio, info.porcentaje, info.proyectado, cuota, nueva, cfg.modo, usuario_id])
      await client.query(`UPDATE polizas SET valor_cuota = $2, tarifa_desde = $3, actualizado = NOW() WHERE id = $1`, [pol.id, nueva, corte])
      aplicadas.push({ poliza: pol.numero, fecha: corte, anio, porcentaje: info.porcentaje, cuota_anterior: cuota, cuota_nueva: nueva })
      cuota = nueva; desde = corte
    }
  }
  return { aplicadas, pendientes, modo: cfg.modo }
}

// Próximas renovaciones (vista previa para la gerencia)
export async function proximasRenovaciones(client, dias = 60) {
  const cfg = await configIncremento(client)
  const hoy = new Date()
  const hoyIso = iso({ y: hoy.getFullYear(), m: hoy.getMonth(), d: hoy.getDate() })
  const lim = new Date(hoy.getTime() + dias * 86400000)
  const limIso = iso({ y: lim.getFullYear(), m: lim.getMonth(), d: lim.getDate() })
  const { rows } = await client.query(`
    SELECT p.id, p.numero, p.numero_legado, p.fecha_inicio, p.valor_cuota, COALESCE(p.tarifa_desde, p.fecha_inicio) AS tarifa_desde,
      COALESCE(t.nombres||' '||t.apellidos, t.razon_social) AS titular
    FROM polizas p JOIN terceros t ON t.id = p.titular_id
    WHERE p.estado NOT IN ('CANCELADA','EJECUTADA')`)
  const lista = []
  for (const pol of rows) {
    const { tarifas } = tarifasDePoliza(pol, cfg, 2)
    const sig = tarifas[1]
    if (sig && sig.desde <= limIso) lista.push({
      id: pol.id, numero: pol.numero, numero_legado: pol.numero_legado, titular: pol.titular,
      fecha: sig.desde, vencida: sig.desde <= hoyIso, anio: sig.anio,
      cuota_actual: Number(pol.valor_cuota), cuota_nueva: sig.cuota, porcentaje: sig.porcentaje,
      proyectado: sig.proyectado, pendiente: sig.pendiente,
    })
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
}
