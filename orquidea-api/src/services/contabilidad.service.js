/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Contabilidad — Motor de contabilización              ║
 * ║  Archivo         : contabilidad.service.js                              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-09-10                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Punto único de entrada para que CUALQUIER módulo del ERP genere un
 * comprobante contable, sin conocer cuentas del PUC ni construir asientos
 * a mano. Uso típico desde otro controlador (dentro de la MISMA transacción
 * del negocio, pasando el `client` de pg):
 *
 *   import { contabilizarEvento } from '../services/contabilidad.service.js'
 *   await contabilizarEvento(client, {
 *     evento_codigo: 'PAGO_CUOTA_POLIZA',
 *     montos: { total: 150000 },
 *     forma_pago_codigo: 'efectivo',
 *     concepto: 'Pago cuota póliza P-0001 — ago/2026',
 *     tercero_id: titular.id,
 *     sede_id: pol.sede_id,
 *     documento_origen_tipo: 'pagos_poliza',
 *     documento_origen_id: pago.id,
 *     usuario_id: req.user.id,
 *   })
 *
 * `montos` es un diccionario libre {nombre: valor} — cada línea de la regla
 * (reglas_contables_lineas) dice de cuál de esos montos toma su valor vía
 * su columna monto_campo. Esto permite que UN evento mueva varias cantidades
 * independientes en el mismo comprobante (ej. una venta de POS: el total
 * cobrado va a caja/ingreso, y el costo de lo vendido va a costo/inventario
 * — dos parejas de líneas con distinto monto, un solo comprobante balanceado).
 *
 * Si la regla del evento no existe o está inactiva, o el periodo contable
 * de la fecha está cerrado, lanza un Error — el llamador decide si eso debe
 * abortar la operación de negocio o solo quedar pendiente de contabilizar
 * (por ahora abortamos: preferimos nunca dejar dinero cobrado sin registrar).
 */
const PREFIJOS_COMPROBANTE = {
  RECAUDO: 'CI',   // Comprobante de Ingreso
  VENTA: 'FV',
  COMPRA: 'CE',    // Comprobante de Egreso
  EGRESO: 'CE',
  AJUSTE: 'CA',
  APERTURA: 'AP',
  NOMINA: 'NM',
  REVERSION: 'RV',
}

async function obtenerRegla(client, evento_codigo) {
  const { rows } = await client.query(
    `SELECT * FROM reglas_contables WHERE evento_codigo = $1 AND activa = TRUE`,
    [evento_codigo]
  )
  if (!rows.length) {
    throw Object.assign(
      new Error(`No existe una regla contable activa para el evento "${evento_codigo}"`),
      { httpCode: 500, code: 'REGLA_CONTABLE_NO_ENCONTRADA' }
    )
  }
  const lineas = await client.query(
    `SELECT * FROM reglas_contables_lineas WHERE regla_id = $1 ORDER BY orden`,
    [rows[0].id]
  )
  if (!lineas.rows.length) {
    throw Object.assign(
      new Error(`La regla contable "${evento_codigo}" no tiene líneas configuradas`),
      { httpCode: 500, code: 'REGLA_CONTABLE_SIN_LINEAS' }
    )
  }
  return { ...rows[0], lineas: lineas.rows }
}

async function resolverCuenta(client, origen, cuentaFija, forma_pago_codigo) {
  if (origen === 'FIJA') return cuentaFija

  if (!forma_pago_codigo) {
    throw Object.assign(
      new Error('Esta regla requiere forma_pago_codigo para resolver la cuenta de banco/caja'),
      { httpCode: 400, code: 'FORMA_PAGO_REQUERIDA' }
    )
  }
  const { rows } = await client.query(
    `SELECT cuenta_contable_codigo FROM formas_pago WHERE codigo = $1`,
    [forma_pago_codigo]
  )
  if (!rows.length || !rows[0].cuenta_contable_codigo) {
    throw Object.assign(
      new Error(`La forma de pago "${forma_pago_codigo}" no tiene cuenta contable configurada`),
      { httpCode: 500, code: 'FORMA_PAGO_SIN_CUENTA' }
    )
  }
  return rows[0].cuenta_contable_codigo
}

async function verificarPeriodoAbierto(client, fechaContable) {
  const fecha = new Date(fechaContable)
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth() + 1
  const { rows } = await client.query(
    `SELECT estado FROM periodos_contables WHERE anio = $1 AND mes = $2`,
    [anio, mes]
  )
  // Si el periodo no existe todavía, se considera abierto (se crea al cerrar
  // el primer periodo real — evita tener que sembrar 12 filas por año a mano).
  if (rows.length && rows[0].estado === 'CERRADO') {
    throw Object.assign(
      new Error(`El periodo contable ${mes}/${anio} está cerrado. No se puede contabilizar en él.`),
      { httpCode: 409, code: 'PERIODO_CERRADO' }
    )
  }
}

async function siguienteNumero(client, tipo) {
  const prefijo = PREFIJOS_COMPROBANTE[tipo] || 'CO'
  const { rows } = await client.query(`SELECT nextval('seq_comprobantes_contables') AS n`)
  const anio = new Date().getFullYear()
  return `${prefijo}-${anio}-${String(rows[0].n).padStart(6, '0')}`
}

/**
 * Genera un comprobante contable balanceado (una línea débito, una crédito)
 * a partir de un evento de negocio registrado en reglas_contables.
 * `client` debe ser una conexión pg con una transacción BEGIN ya abierta
 * por el módulo que llama, para que el comprobante viva o muera junto con
 * el movimiento de negocio que lo origina (nunca dinero cobrado sin asiento).
 */
export async function contabilizarEvento(client, {
  evento_codigo, montos, forma_pago_codigo = null, concepto,
  tercero_id = null, sede_id = null,
  documento_origen_tipo = null, documento_origen_id = null,
  usuario_id = null, fecha = null, fecha_contable = null,
}) {
  if (!montos || typeof montos !== 'object' || !Object.keys(montos).length) {
    throw Object.assign(new Error('montos es requerido: {nombreDelMonto: valor, ...}'), { httpCode: 400 })
  }

  const regla = await obtenerRegla(client, evento_codigo)
  const fechaComp = fecha || new Date().toISOString().slice(0, 10)
  const fechaCont = fecha_contable || fechaComp
  await verificarPeriodoAbierto(client, fechaCont)

  // Resuelve cada línea de la regla a (cuenta, monto, lado) concretos.
  // Un monto ausente o en 0 (ej. costo no configurado todavía en un
  // producto) no revienta la venta: esa pareja de líneas simplemente se
  // omite del comprobante — sigue siendo un asiento válido, solo que más
  // corto. Un valor negativo sí es un error de datos, no se tolera.
  const lineasResueltas = []
  let totalDebe = 0, totalHaber = 0
  for (const linea of regla.lineas) {
    const valorRaw = montos[linea.monto_campo]
    const valor = valorRaw === undefined || valorRaw === null ? 0 : Number(valorRaw)
    if (valor < 0) {
      throw Object.assign(
        new Error(`El evento "${evento_codigo}" recibió montos.${linea.monto_campo} negativo`),
        { httpCode: 400, code: 'MONTO_INVALIDO' }
      )
    }
    if (valor === 0) continue

    const cuenta = await resolverCuenta(client, linea.origen, linea.cuenta_codigo, forma_pago_codigo)
    const monto = Math.round(valor * 100) / 100
    lineasResueltas.push({ cuenta, monto, lado: linea.lado, orden: linea.orden, descripcion: linea.descripcion || concepto })
    if (linea.lado === 'D') totalDebe += monto; else totalHaber += monto
  }

  if (!lineasResueltas.length) {
    throw Object.assign(new Error('No hay montos que contabilizar para este evento'), { httpCode: 400 })
  }

  // Blindaje de partida doble: si la suma de las líneas configuradas no
  // cuadra, es un error de configuración de la regla (no del dato de
  // negocio) — se aborta antes de escribir nada en comprobantes_contables.
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    throw Object.assign(
      new Error(`La regla "${evento_codigo}" está descuadrada: débitos ${totalDebe} ≠ créditos ${totalHaber}. Revisa reglas_contables_lineas.`),
      { httpCode: 500, code: 'REGLA_DESCUADRADA' }
    )
  }

  const numero = await siguienteNumero(client, regla.tipo_comprobante)

  const comp = await client.query(
    `INSERT INTO comprobantes_contables (
       numero, tipo, fecha, fecha_contable, concepto, estado, evento_codigo,
       documento_origen_tipo, documento_origen_id, tercero_id, sede_id,
       total_debe, total_haber, usuario_creador, usuario_contabiliza
     ) VALUES ($1,$2,$3,$4,$5,'CONTABILIZADO',$6,$7,$8,$9,$10,$11,$11,$12,$12)
     RETURNING *`,
    [
      numero, regla.tipo_comprobante, fechaComp, fechaCont, concepto, evento_codigo,
      documento_origen_tipo, documento_origen_id, tercero_id, sede_id,
      totalDebe, usuario_id,
    ]
  )
  const comprobante = comp.rows[0]

  for (const l of lineasResueltas) {
    await client.query(
      `INSERT INTO asientos_contables (comprobante_id, orden, cuenta_codigo, tercero_id, sede_id, debe, haber, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        comprobante.id, l.orden, l.cuenta,
        tercero_id, sede_id,
        l.lado === 'D' ? l.monto : 0,
        l.lado === 'H' ? l.monto : 0,
        l.descripcion,
      ]
    )
  }

  return comprobante
}

/**
 * Comprobante de Tesorería (Ingreso o Egreso) de partidas libres — a
 * diferencia de contabilizarEvento (que exige una regla pre-configurada con
 * cuentas fijas), aquí el usuario busca y elige a mano la cuenta del PUC de
 * cada línea desde el asistente de Tesorería, incluida la de caja/banco
 * (`cuenta_principal_codigo` — cualquier cuenta de movimiento, no solo las
 * que tengan una forma de pago mapeada). Las N partidas son la otra pata:
 *   RECAUDO (CI): Débito banco / Crédito cada partida
 *   EGRESO  (CE): Débito cada partida / Crédito banco
 * El monto de la cuenta principal es SIEMPRE la suma de las partidas —
 * "AUTOMÁTICO" en el asistente — nunca se le pide al usuario cuadrar a
 * mano, que es la fuente #1 de error al capturar comprobantes.
 */
export async function crearComprobanteManual(client, {
  tipo, cuenta_principal_codigo, partidas, concepto, referencia = null,
  tercero_id = null, sede_id = null, usuario_id, fecha = null, fecha_contable = null,
}) {
  if (!['RECAUDO', 'EGRESO'].includes(tipo))
    throw Object.assign(new Error('tipo debe ser RECAUDO (ingreso) o EGRESO'), { httpCode: 400 })
  if (!cuenta_principal_codigo)
    throw Object.assign(new Error('Falta seleccionar la cuenta de caja o banco'), { httpCode: 400 })
  if (!Array.isArray(partidas) || !partidas.length)
    throw Object.assign(new Error('Se requiere al menos una partida'), { httpCode: 400 })

  const partidasValidas = partidas.map(p => ({ ...p, valor: Number(p.valor) }))
  for (const p of partidasValidas) {
    if (!p.cuenta_codigo) throw Object.assign(new Error('Cada partida requiere cuenta_codigo'), { httpCode: 400 })
    if (!(p.valor > 0)) throw Object.assign(new Error('Cada partida requiere un valor mayor a 0'), { httpCode: 400 })
  }

  const fechaComp = fecha || new Date().toISOString().slice(0, 10)
  const fechaCont = fecha_contable || fechaComp
  await verificarPeriodoAbierto(client, fechaCont)

  const { rows: cuentaRows } = await client.query(
    `SELECT codigo FROM contabilidad_puc WHERE codigo = $1 AND acepta_movimiento = TRUE AND activa = TRUE`,
    [cuenta_principal_codigo]
  )
  if (!cuentaRows.length)
    throw Object.assign(new Error('La cuenta de caja/banco no existe o no acepta movimiento'), { httpCode: 400 })

  const monto = Math.round(partidasValidas.reduce((a, p) => a + p.valor, 0) * 100) / 100
  const ladoBanco = tipo === 'RECAUDO' ? 'D' : 'H'
  const ladoPartida = tipo === 'RECAUDO' ? 'H' : 'D'

  const lineas = [
    { cuenta: cuenta_principal_codigo, monto, lado: ladoBanco, orden: 1, descripcion: concepto, tercero_id },
    ...partidasValidas.map((p, i) => ({
      cuenta: p.cuenta_codigo, monto: p.valor, lado: ladoPartida, orden: i + 2,
      descripcion: p.descripcion || concepto, tercero_id: p.tercero_id || tercero_id,
    })),
  ]

  const numero = await siguienteNumero(client, tipo)
  const comp = await client.query(
    `INSERT INTO comprobantes_contables (
       numero, tipo, fecha, fecha_contable, concepto, referencia, estado,
       documento_origen_tipo, tercero_id, sede_id,
       total_debe, total_haber, usuario_creador, usuario_contabiliza
     ) VALUES ($1,$2,$3,$4,$5,$6,'CONTABILIZADO','tesoreria_comprobantes',$7,$8,$9,$9,$10,$10)
     RETURNING *`,
    [numero, tipo, fechaComp, fechaCont, concepto, referencia, tercero_id, sede_id, monto, usuario_id]
  )
  const comprobante = comp.rows[0]

  for (const l of lineas) {
    await client.query(
      `INSERT INTO asientos_contables (comprobante_id, orden, cuenta_codigo, tercero_id, sede_id, debe, haber, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [comprobante.id, l.orden, l.cuenta, l.tercero_id, sede_id, l.lado === 'D' ? l.monto : 0, l.lado === 'H' ? l.monto : 0, l.descripcion]
    )
  }

  return comprobante
}

/**
 * Reversa un comprobante existente creando uno nuevo con las cuentas
 * invertidas (débito↔crédito), sin borrar ni modificar el original —
 * la historia contable se conserva íntegra para auditoría.
 */
export async function reversarComprobante(client, comprobante_id, { motivo, usuario_id }) {
  const original = await client.query(`SELECT * FROM comprobantes_contables WHERE id = $1`, [comprobante_id])
  if (!original.rows.length) throw Object.assign(new Error('Comprobante no encontrado'), { httpCode: 404 })
  const comp = original.rows[0]
  if (comp.estado === 'ANULADO') throw Object.assign(new Error('El comprobante ya está anulado'), { httpCode: 409 })

  await verificarPeriodoAbierto(client, new Date().toISOString().slice(0, 10))

  const lineas = await client.query(
    `SELECT * FROM asientos_contables WHERE comprobante_id = $1 ORDER BY orden`, [comprobante_id]
  )

  const numero = await siguienteNumero(client, 'REVERSION')
  const reversa = await client.query(
    `INSERT INTO comprobantes_contables (
       numero, tipo, fecha_contable, concepto, estado, evento_codigo,
       documento_origen_tipo, documento_origen_id, tercero_id, sede_id,
       total_debe, total_haber, usuario_creador, usuario_contabiliza, comprobante_reversa_id
     ) VALUES ($1,'REVERSION',CURRENT_DATE,$2,'CONTABILIZADO',$3,$4,$5,$6,$7,$8,$8,$9,$9,$10)
     RETURNING *`,
    [
      numero, `Reversión de ${comp.numero} — ${motivo}`, comp.evento_codigo,
      comp.documento_origen_tipo, comp.documento_origen_id, comp.tercero_id, comp.sede_id,
      comp.total_debe, usuario_id, comp.id,
    ]
  )

  for (const l of lineas.rows) {
    await client.query(
      `INSERT INTO asientos_contables (comprobante_id, orden, cuenta_codigo, tercero_id, sede_id, debe, haber, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [reversa.rows[0].id, l.orden, l.cuenta_codigo, l.tercero_id, l.sede_id, l.haber, l.debe, l.descripcion]
    )
  }

  await client.query(
    `UPDATE comprobantes_contables SET estado='ANULADO', anulado_por=$2, anulado_en=NOW(), motivo_anulacion=$3
     WHERE id = $1`,
    [comprobante_id, usuario_id, motivo]
  )

  return reversa.rows[0]
}
