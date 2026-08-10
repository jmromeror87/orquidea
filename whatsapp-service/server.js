/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Servicio WhatsApp (whatsapp-web.js)         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Solo escucha en localhost — nunca expuesto a internet directamente.    ║
 * ║  orquidea-api lo consume como proxy autenticado (solo admins).          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcodeTerm = require('qrcode-terminal');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || '';

app.use((req, res, next) => {
  if (!INTERNAL_TOKEN) return next() // sin token configurado, no exige auth (uso local dev)
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ ok: false, error: 'No autorizado' })
  }
  next()
})

// ── Estado global ─────────────────────────────────────────
let clientReady     = false
let qrBase64        = null
let estadoInfo      = 'iniciando'
let ultimoError     = null
let numeroConectado = null
let conectadoDesde  = null

function getChromePath() {
  const fs = require('fs')
  try {
    const puppeteer = require('puppeteer')
    const p = puppeteer.executablePath()
    if (p && fs.existsSync(p)) return p
  } catch (e) { /* puppeteer no instalado */ }
  const systemPaths = [
    '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]
  for (const p of systemPaths) if (fs.existsSync(p)) return p
  return null
}

const chromePath = getChromePath()
if (!chromePath) {
  console.error('❌ No se encontró Chrome/Chromium. Ejecuta: npm install puppeteer')
  process.exit(1)
}
console.log(`🌐 Usando Chrome: ${chromePath}`)

function crearCliente() {
  const wapClient = new Client({
    authStrategy: new LocalAuth({ clientId: 'orquidea-erp' }),
    puppeteer: {
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
        '--disable-gpu', '--single-process',
      ],
    },
  })

  wapClient.on('qr', qr => {
    estadoInfo = 'esperando_qr'
    qrcodeTerm.generate(qr, { small: true })
    console.log('\n📱 Escanea este QR con el WhatsApp de la funeraria')
    QRCode.toDataURL(qr, (err, url) => { if (!err) qrBase64 = url })
  })

  wapClient.on('authenticated', () => {
    estadoInfo = 'autenticando'
    console.log('🔐 Sesión autenticada — cargando...')
  })

  wapClient.on('ready', () => {
    clientReady     = true
    qrBase64        = null
    estadoInfo      = 'conectado'
    ultimoError     = null
    numeroConectado = wapClient.info?.wid?.user || null
    conectadoDesde  = new Date().toISOString()
    console.log(`✅ WhatsApp listo — Orquídea ERP (+${numeroConectado})`)
  })

  wapClient.on('disconnected', reason => {
    clientReady     = false
    estadoInfo      = 'desconectado'
    numeroConectado = null
    conectadoDesde  = null
    console.log(`❌ WhatsApp desconectado: ${reason}`)
    console.log('🔄 Reconectando en 10 segundos...')
    setTimeout(() => {
      try { wapClient.destroy() } catch (e) {}
      iniciar()
    }, 10000)
  })

  wapClient.on('auth_failure', msg => {
    clientReady = false
    estadoInfo  = 'error_auth'
    ultimoError = msg
    console.error('❌ Error de autenticación WhatsApp:', msg)
  })

  wapClient.initialize().catch(e => {
    ultimoError = e.message
    estadoInfo  = 'error_init'
    console.error('❌ Error inicializando WhatsApp:', e.message)
  })

  return wapClient
}

let client
function iniciar() { client = crearCliente() }
iniciar()

// ── Endpoints ─────────────────────────────────────────────

app.get('/status', (_req, res) => {
  res.json({
    ready: clientReady, qr: qrBase64, estado: estadoInfo, error: ultimoError,
    numero: numeroConectado, conectado_desde: conectadoDesde,
  })
})

app.post('/reiniciar', async (_req, res) => {
  try {
    estadoInfo = 'iniciando'; clientReady = false; qrBase64 = null
    numeroConectado = null; conectadoDesde = null
    try { await client.logout() } catch (e) {}
    try { await client.destroy() } catch (e) {}
    iniciar()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.post('/send', async (req, res) => {
  const { telefono, mensaje } = req.body
  if (!clientReady) return res.status(503).json({ ok: false, error: 'WhatsApp no conectado' })
  if (!telefono || !mensaje) return res.status(400).json({ ok: false, error: 'Faltan telefono o mensaje' })
  try {
    let numero = telefono.replace(/[^0-9]/g, '')
    if (numero.startsWith('0')) numero = numero.substring(1)
    if (!numero.startsWith('57')) numero = '57' + numero
    const chatId = numero + '@c.us'
    await client.sendMessage(chatId, mensaje)
    console.log(`📤 → ${numero}: ${mensaje.substring(0, 60)}...`)
    res.json({ ok: true, numero })
  } catch (e) {
    console.error('Error enviando:', e.message)
    res.status(500).json({ ok: false, error: e.message })
  }
})

const PORT = process.env.PORT || 3011
const HOST = process.env.HOST || '127.0.0.1'
app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Servicio WhatsApp Orquídea en http://${HOST}:${PORT}`)
  console.log(`   Estado: http://${HOST}:${PORT}/status\n`)
})
