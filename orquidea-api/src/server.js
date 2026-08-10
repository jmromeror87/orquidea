/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Servidor / Core                                 ║
 * ║  Archivo         : server.js                                       ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { fileURLToPath } from 'url'
import path from 'path'
import 'dotenv/config'

import { env } from './config/env.js'
import pool from './config/database.js'
import { ejecutarRecordatoriosPago } from './cron/recordatoriosPago.js'

// ── Rutas ─────────────────────────────────────────────────────────
import { errorHandler }    from './middlewares/errorHandler.js'
import authRoutes          from './routes/auth.routes.js'
import usuariosRoutes      from './routes/usuarios.routes.js'
import tercerosRoutes      from './routes/terceros.routes.js'
import serviciosRoutes     from './routes/servicios.routes.js'
import contratosRoutes     from './routes/contratos.routes.js'
import pagosRoutes         from './routes/pagos.routes.js'
import reportesRoutes      from './routes/reportes.routes.js'
import comprobantesRoutes  from './routes/comprobantes.routes.js'
import empresaRoutes       from './routes/empresa.routes.js'
import territorioRoutes    from './routes/territorio.routes.js'
import polizasRoutes       from './routes/polizas.routes.js'
import asesoresRoutes      from './routes/asesores.routes.js'
import flotaRoutes         from './routes/flota.routes.js'
import permisosRoutes      from './routes/permisos.routes.js'
import tiposDocumentoRoutes from './routes/tiposDocumento.routes.js'
import formasPagoRoutes     from './routes/formasPago.routes.js'
import inventarioRoutes     from './routes/inventario.routes.js'
import comprasRoutes        from './routes/compras.routes.js'
import dashboardRoutes      from './routes/dashboard.routes.js'
import zonasRecaudoRoutes  from './routes/zonas_recaudo.routes.js'
import recaudoRoutes       from './routes/recaudo.routes.js'
import moraRoutes          from './routes/mora.routes.js'
import conveniosRoutes     from './routes/convenios.routes.js'
import posRoutes           from './routes/pos.routes.js'
import publicoRoutes       from './routes/publico.routes.js'
import memorialesRoutes    from './routes/memoriales.routes.js'
import leadsRoutes         from './routes/leads.routes.js'
import notificacionesRoutes from './routes/notificaciones.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = Fastify({
  logger: {
    level: env.nodeEnv === 'production' ? 'warn' : 'info',
    transport: env.nodeEnv !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

// ── Plugins ───────────────────────────────────────────────────────
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || env.frontendUrls.includes(origin)) return cb(null, true)
    cb(new Error('No permitido por CORS'), false)
  },
  credentials: true,
})

await app.register(jwt, {
  secret: env.jwtSecret,
})

await app.register(multipart, {
  limits: { fileSize: 25 * 1024 * 1024 },  // 25 MB
})

await app.register(staticFiles, {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/',
})

// ── Health check ──────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  service: 'orquidea-api',
  timestamp: new Date().toISOString(),
  db: (await pool.query('SELECT 1')).rows.length > 0 ? 'connected' : 'error',
}))

// ── Registro de rutas ─────────────────────────────────────────────
app.setErrorHandler(errorHandler)

app.register(authRoutes,         { prefix: '/api/auth' })
app.register(usuariosRoutes,     { prefix: '/api/usuarios' })
app.register(tercerosRoutes,      { prefix: '/api/terceros' })
app.register(serviciosRoutes,    { prefix: '/api/servicios' })
app.register(contratosRoutes,    { prefix: '/api/contratos' })
app.register(pagosRoutes,        { prefix: '/api/pagos' })
app.register(reportesRoutes,     { prefix: '/api/reportes' })
app.register(comprobantesRoutes, { prefix: '/api/comprobantes' })
app.register(empresaRoutes,      { prefix: '/api/empresa' })
app.register(territorioRoutes,     { prefix: '/api/territorio' })
app.register(polizasRoutes,        { prefix: '/api/polizas' })
app.register(permisosRoutes,       { prefix: '/api/permisos' })
app.register(tiposDocumentoRoutes, { prefix: '/api/tipos-documento' })
app.register(formasPagoRoutes,    { prefix: '/api/formas-pago' })
app.register(inventarioRoutes,    { prefix: '/api/inventario' })
app.register(comprasRoutes,       { prefix: '/api/compras' })
app.register(dashboardRoutes,     { prefix: '/api/dashboard' })
app.register(zonasRecaudoRoutes,  { prefix: '/api/zonas-recaudo' })
app.register(recaudoRoutes,       { prefix: '/api/recaudo' })
app.register(moraRoutes,          { prefix: '/api/mora' })
app.register(asesoresRoutes,      { prefix: '/api/asesores' })
app.register(flotaRoutes,         { prefix: '/api/flota' })
app.register(conveniosRoutes,     { prefix: '/api/convenios' })
app.register(posRoutes,           { prefix: '/api/pos' })
app.register(publicoRoutes,       { prefix: '/api/publico' })
app.register(memorialesRoutes,    { prefix: '/api/memoriales' })
app.register(leadsRoutes,         { prefix: '/api/leads' })
app.register(notificacionesRoutes, { prefix: '/api/notificaciones' })

// ── Cron: recalcular mora de pólizas cada noche a las 2:00 AM ────────
function programarCronMora() {
  const ahora    = new Date()
  const proximas2am = new Date(ahora)
  proximas2am.setHours(2, 0, 0, 0)
  if (proximas2am <= ahora) proximas2am.setDate(proximas2am.getDate() + 1)
  const msHasta2am = proximas2am - ahora

  const recalcularMora = async () => {
    try {
      await pool.query('SELECT fn_recalcular_mora_polizas()')
      await pool.query('SELECT fn_recalcular_mora_contratos()')
      console.log(`[CRON] Mora recalculada (pólizas + contratos) — ${new Date().toISOString()}`)
    } catch (e) {
      console.error('[CRON] Error al recalcular mora:', e.message)
    }
  }

  setTimeout(async () => {
    await recalcularMora()
    // Reprogramar para mañana
    setInterval(recalcularMora, 24 * 60 * 60 * 1000)
  }, msHasta2am)

  console.log(`[CRON] Mora programada para las 2:00 AM (en ${Math.round(msHasta2am/60000)} min)`)
}

// ── Cron: recordatorios de pago (WhatsApp/SMS) cada mañana a las 9:00 AM ──
// Corre después del recálculo de mora (2am) para tener meses_mora/saldo_mora
// del día ya actualizados. Avisa: cuota vence en 3 días, y pólizas en mora.
function programarCronRecordatorios() {
  const ahora   = new Date()
  const proxima9am = new Date(ahora)
  proxima9am.setHours(9, 0, 0, 0)
  if (proxima9am <= ahora) proxima9am.setDate(proxima9am.getDate() + 1)
  const msHasta9am = proxima9am - ahora

  setTimeout(async () => {
    await ejecutarRecordatoriosPago()
    setInterval(ejecutarRecordatoriosPago, 24 * 60 * 60 * 1000)
  }, msHasta9am)

  console.log(`[CRON] Recordatorios de pago programados para las 9:00 AM (en ${Math.round(msHasta9am/60000)} min)`)
}

// ── Start ─────────────────────────────────────────────────────────
try {
  await app.listen({ port: env.port, host: env.host })
  console.log(`🌸 Orquídea API corriendo en http://localhost:${env.port}`)
  programarCronMora()
  programarCronRecordatorios()
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
