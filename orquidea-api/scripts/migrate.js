/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Base de Datos                                   ║
 * ║  Archivo         : migrate.js                                      ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, '../src/migrations')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

async function run() {
  const client = await pool.connect()
  try {
    // Tabla de control de migraciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migraciones (
        id         SERIAL PRIMARY KEY,
        nombre     VARCHAR(200) UNIQUE NOT NULL,
        ejecutada  TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    const { rows: ejecutadas } = await client.query('SELECT nombre FROM _migraciones')
    const ejecutadasSet = new Set(ejecutadas.map(r => r.nombre))

    const archivos = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const archivo of archivos) {
      if (ejecutadasSet.has(archivo)) {
        console.log(`  ⏭  Ya ejecutada: ${archivo}`)
        continue
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, archivo), 'utf8')
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO _migraciones (nombre) VALUES ($1)', [archivo])
      await client.query('COMMIT')
      console.log(`  ✅ Migración aplicada: ${archivo}`)
    }

    console.log('\n🌸 Migraciones completadas')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Error en migración:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
