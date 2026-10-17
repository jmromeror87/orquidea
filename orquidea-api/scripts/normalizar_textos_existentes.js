/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Mantenimiento — uniformar textos ya guardados        ║
 * ║  Archivo         : scripts/normalizar_textos_existentes.js              ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Aplica a los datos YA guardados las mismas reglas que ahora se usan al
 * escribir (utils/textoFormato.js): nombres "LUIS EMIRO" → "Luis Emiro",
 * observaciones con mayúscula inicial.
 *
 *   node scripts/normalizar_textos_existentes.js            ← solo muestra (no cambia nada)
 *   node scripts/normalizar_textos_existentes.js --aplicar  ← guarda los cambios
 *
 * Hacer respaldo de la base antes de --aplicar.
 */
import pool from '../src/config/database.js'
import { nombrePropio, frase } from '../src/utils/textoFormato.js'

const APLICAR = process.argv.includes('--aplicar')
const PLAN = [
  { tabla: 'terceros', persona: ['nombres', 'apellidos', 'barrio', 'vereda', 'nombre_conyuge', 'nombre_padre', 'nombre_madre'], frase: ['observaciones'] },
  { tabla: 'usuarios', persona: ['nombre'], frase: [], donde: 'NOT COALESCE(oculto, FALSE)' },
  { tabla: 'polizas', persona: [], frase: ['observaciones', 'motivo_cancelacion'] },
  { tabla: 'contratos', persona: [], frase: ['observaciones'] },
  { tabla: 'servicios_funerarios', persona: [], frase: ['observaciones', 'causa_fallecimiento'] },
]

const limpiarEsp = s => s.replace(/\s+/g, ' ').trim()

async function main() {
  const db = await pool.connect()
  let total = 0
  try {
    if (APLICAR) await db.query('BEGIN')
    for (const { tabla, persona, frase: frases, donde } of PLAN) {
      const cols = [...persona, ...frases]
      const existen = (await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = ANY($2)`, [tabla, cols])).rows.map(r => r.column_name)
      if (!existen.length) continue
      const { rows } = await db.query(`SELECT id, ${existen.join(', ')} FROM ${tabla}${donde ? ` WHERE ${donde}` : ''}`)
      let n = 0
      const ejemplos = []
      for (const r of rows) {
        const cambios = {}
        for (const c of existen) {
          const v = r[c]; if (typeof v !== 'string' || !v.trim()) continue
          const nuevo = persona.includes(c) ? nombrePropio(limpiarEsp(v)) : frase(v.trim())
          if (nuevo !== v) cambios[c] = nuevo
        }
        if (!Object.keys(cambios).length) continue
        n++
        if (ejemplos.length < 6) ejemplos.push(Object.entries(cambios).map(([c, v]) => `${c}: "${r[c]}" → "${v}"`).join(' | '))
        if (APLICAR) {
          const k = Object.keys(cambios)
          await db.query(`UPDATE ${tabla} SET ${k.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`, [r.id, ...k.map(c => cambios[c])])
        }
      }
      total += n
      console.log(`\n${tabla}: ${n} de ${rows.length} registros cambian`)
      ejemplos.forEach(e => console.log('   ', e.length > 180 ? e.slice(0, 180) + '…' : e))
    }
    if (APLICAR) { await db.query('COMMIT'); console.log(`\n✔ Aplicado: ${total} registros actualizados`) }
    else console.log(`\n(Vista previa: no se cambió nada. Total que cambiaría: ${total}. Use --aplicar para guardar.)`)
  } catch (e) {
    if (APLICAR) await db.query('ROLLBACK')
    throw e
  } finally { db.release(); await pool.end() }
}
main().catch(e => { console.error(e); process.exit(1) })
