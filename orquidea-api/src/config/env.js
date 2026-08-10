/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Configuración                                   ║
 * ║  Archivo         : env.js                                          ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-06-28                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import 'dotenv/config'

export const env = {
  port:        parseInt(process.env.PORT)  || 3001,
  host:        process.env.HOST            || '0.0.0.0',
  nodeEnv:     process.env.NODE_ENV        || 'development',
  jwtSecret:   process.env.JWT_SECRET      || 'dev_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL    || 'http://localhost:5173',
  frontendUrls: (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
                  .split(',').map(u => u.trim()).filter(Boolean),
  appUrl:      process.env.APP_URL         || process.env.FRONTEND_URL || 'http://localhost:5173',
  uploadPath:  process.env.UPLOAD_PATH     || './src/uploads',
  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760,
  waEnabled:   process.env.WA_ENABLED === 'true',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    fromName:  process.env.SMTP_FROM_NAME  || 'Orquídea ERP',
  },
  labsmobile: {
    user:  process.env.LABSMOBILE_USER  || '',
    token: process.env.LABSMOBILE_TOKEN || '',
    remitente: process.env.LABSMOBILE_REMITENTE || 'Orquidea',
  },
  whatsapp: {
    serviceUrl:    process.env.WHATSAPP_SERVICE_URL    || '',
    internalToken: process.env.WHATSAPP_INTERNAL_TOKEN || '',
  },
  wompi: {
    publicKey:      process.env.WOMPI_PUBLIC_KEY      || '',
    privateKey:      process.env.WOMPI_PRIVATE_KEY     || '',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
    eventsSecret:    process.env.WOMPI_EVENTS_SECRET    || '',
    // El ambiente lo determina el prefijo de la llave pública (pub_test_ vs pub_prod_)
    checkoutUrl: 'https://checkout.wompi.co/p/',
  },
}
