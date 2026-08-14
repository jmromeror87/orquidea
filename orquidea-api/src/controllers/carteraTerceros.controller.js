/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Cartera de terceros (convenios y familias)           ║
 * ║  Archivo         : carteraTerceros.controller.js                        ║
 * ║  Fecha           : 2026-08-14                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import pool from '../config/database.js'
import { resolverSede } from '../utils/sede.js'

/**
 * Sincroniza la cartera que le corresponde a un servicio por convenio.
 * Se llama dentro de la MISMA transacción que crea/actualiza el servicio.
 *
 * Regla de negocio: la funeraria nunca absorbe el costo. Lo que autoriza
 * el convenio queda en cartera contra el convenio; el excedente no
 * autorizado queda en cartera contra la familia (deudor dinámico, puede
 * no tener tercero asignado todavía) — salvo que el convenio marque
 * absorbe_resto='FUNERARIA', caso excepcional en que la empresa lo condona
 * y no se genera cartera por el excedente.
 */
export async function sincronizarCartera(db, {
  servicioId, sedeId, convenioId, contratanteConvenioId,
  valorCubierto, absorbeResto, valorServicio, nombreServicio,
}) {
  const cubierto = Number(valorCubierto) || 0
  const resto = Math.max(0, (Number(valorServicio) || 0) - cubierto)
  const concepto = nombreServicio ? `Servicio funerario — ${nombreServicio}` : 'Servicio funerario'

  const upsert = async (deudorTipo, deudorId, valor, concep) => {
    if (!(valor > 0)) {
      await db.query(
        `DELETE FROM cartera_terceros WHERE servicio_id=$1 AND deudor_tipo=$2 AND valor_pagado=0`,
        [servicioId, deudorTipo]
      )
      return
    }
    await db.query(`
      INSERT INTO cartera_terceros (deudor_tipo, deudor_id, servicio_id, concepto, valor, sede_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (servicio_id, deudor_tipo) DO UPDATE SET
        deudor_id = EXCLUDED.deudor_id,
        valor     = EXCLUDED.valor,
        concepto  = EXCLUDED.concepto,
        sede_id   = COALESCE(cartera_terceros.sede_id, EXCLUDED.sede_id),
        estado = CASE
          WHEN cartera_terceros.valor_pagado >= EXCLUDED.valor - 0.01 THEN 'PAGADO'
          WHEN cartera_terceros.valor_pagado > 0 THEN 'PARCIAL'
          ELSE 'PENDIENTE' END,
        actualizado = NOW()
    `, [deudorTipo, deudorId, servicioId, concep, valor, sedeId])
  }

  if (convenioId) {
    await upsert('CONVENIO', convenioId, cubierto, `Cobertura del convenio — ${concepto}`)
    if (absorbeResto === 'FUNERARIA') {
      await db.query(`DELETE FROM cartera_terceros WHERE servicio_id=$1 AND deudor_tipo='CONTRATANTE' AND valor_pagado=0`, [servicioId])
    } else {
      await upsert('CONTRATANTE', contratanteConvenioId || null, resto, `Excedente no cubierto por el convenio — ${concepto}`)
    }
  } else {
    // El servicio ya no está vinculado a un convenio: se limpia la cartera que no tenga abonos.
    await db.query(`DELETE FROM cartera_terceros WHERE servicio_id=$1 AND valor_pagado=0`, [servicioId])
  }
}

export async function listar(req, reply) {
  const { sedeIds } = resolverSede(req)
  const { deudor_tipo, deudor_id, estado, q } = req.query
  const conds = []; const vals = []

  if (sedeIds) { vals.push(sedeIds); conds.push(`ct.sede_id = ANY($${vals.length}::uuid[])`) }
  if (deudor_tipo) { vals.push(deudor_tipo); conds.push(`ct.deudor_tipo = $${vals.length}`) }
  if (deudor_id)   { vals.push(deudor_id);   conds.push(`ct.deudor_id = $${vals.length}`) }
  if (estado)      { vals.push(estado);      conds.push(`ct.estado = $${vals.length}`) }
  if (q) {
    vals.push(`%${q}%`)
    conds.push(`(ct.concepto ILIKE $${vals.length} OR con.nombre ILIKE $${vals.length} OR ter.nombres ILIKE $${vals.length} OR ter.apellidos ILIKE $${vals.length})`)
  }

  const { rows } = await pool.query(`
    SELECT ct.*,
      CASE ct.deudor_tipo
        WHEN 'CONVENIO'     THEN con.nombre
        WHEN 'CONTRATANTE'  THEN NULLIF(TRIM(CONCAT(ter.nombres, ' ', ter.apellidos)), '')
      END AS deudor_nombre,
      sf.id AS servicio_id, d.nombres AS difunto_nombres, d.apellidos AS difunto_apellidos
    FROM cartera_terceros ct
    JOIN servicios_funerarios sf ON sf.id = ct.servicio_id
    LEFT JOIN terceros d         ON d.id = sf.difunto_id
    LEFT JOIN convenios con      ON ct.deudor_tipo = 'CONVENIO'    AND con.id = ct.deudor_id
    LEFT JOIN terceros ter       ON ct.deudor_tipo = 'CONTRATANTE' AND ter.id = ct.deudor_id
    ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}
    ORDER BY ct.estado = 'PENDIENTE' DESC, ct.creado_en DESC
  `, vals)

  const resumen = {
    total_pendiente: rows.reduce((s, r) => s + (r.estado !== 'ANULADO' ? Number(r.saldo_pendiente) : 0), 0),
    total_convenio:  rows.reduce((s, r) => s + (r.deudor_tipo === 'CONVENIO'    && r.estado !== 'ANULADO' ? Number(r.saldo_pendiente) : 0), 0),
    total_familia:   rows.reduce((s, r) => s + (r.deudor_tipo === 'CONTRATANTE' && r.estado !== 'ANULADO' ? Number(r.saldo_pendiente) : 0), 0),
  }
  return reply.send({ data: rows, resumen })
}

export async function detalle(req, reply) {
  const { id } = req.params
  const cartera = await pool.query(`SELECT * FROM cartera_terceros WHERE id=$1`, [id])
  if (!cartera.rows.length) return reply.status(404).send({ error: 'Registro de cartera no encontrado' })

  const abonos = await pool.query(
    `SELECT a.*, u.nombre AS usuario_nombre
     FROM abonos_cartera_terceros a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.cartera_id=$1 ORDER BY a.fecha_pago DESC, a.creado_en DESC`,
    [id]
  )
  return reply.send({ data: { ...cartera.rows[0], abonos: abonos.rows } })
}

export async function registrarAbono(req, reply) {
  const { id } = req.params
  const { monto, metodo_pago, referencia, fecha_pago, notas } = req.body
  if (!monto || Number(monto) <= 0) return reply.status(400).send({ error: 'El monto del abono debe ser mayor a cero' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const actual = await client.query(`SELECT * FROM cartera_terceros WHERE id=$1 FOR UPDATE`, [id])
    if (!actual.rows.length) { await client.query('ROLLBACK'); return reply.status(404).send({ error: 'Registro de cartera no encontrado' }) }
    const c = actual.rows[0]
    if (c.estado === 'ANULADO') { await client.query('ROLLBACK'); return reply.status(409).send({ error: 'Este registro de cartera está anulado' }) }

    const nuevoPagado = Number(c.valor_pagado) + Number(monto)
    if (nuevoPagado - Number(c.valor) > 0.01) {
      await client.query('ROLLBACK')
      return reply.status(400).send({ error: `El abono excede el saldo pendiente ($${Number(c.saldo_pendiente).toLocaleString('es-CO')})` })
    }
    const nuevoEstado = nuevoPagado >= Number(c.valor) - 0.01 ? 'PAGADO' : 'PARCIAL'

    const abono = await client.query(
      `INSERT INTO abonos_cartera_terceros (cartera_id, monto, metodo_pago, referencia, fecha_pago, notas, usuario_id)
       VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,$7) RETURNING *`,
      [id, monto, metodo_pago || null, referencia || null, fecha_pago || null, notas || null, req.user?.id || null]
    )

    await client.query(
      `UPDATE cartera_terceros SET valor_pagado=$2, estado=$3, actualizado=NOW() WHERE id=$1`,
      [id, nuevoPagado, nuevoEstado]
    )

    await client.query('COMMIT')
    return reply.status(201).send({ data: abono.rows[0], mensaje: 'Abono registrado correctamente' })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
