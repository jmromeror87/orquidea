/**
 * Script utilitario — Agrega headers de copyright a todos los archivos del proyecto.
 * Ejecutar una sola vez desde la raíz del monorepo: node add-headers.js
 */

import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOY = '2026-06-28'

// ── Mapa: ruta relativa → [Módulo, tipo]  ────────────────────────
// tipo: 'js' | 'sql' | 'css'
const ARCHIVOS = [
  // ─── BACKEND ────────────────────────────────────────────────────
  ['orquidea-api/src/server.js',                          'Servidor / Core',         'js'],
  ['orquidea-api/src/config/database.js',                 'Configuración',           'js'],
  ['orquidea-api/src/config/env.js',                      'Configuración',           'js'],
  ['orquidea-api/src/middlewares/auth.middleware.js',      'Autenticación',           'js'],
  ['orquidea-api/src/middlewares/errorHandler.js',         'Core',                    'js'],
  ['orquidea-api/src/controllers/auth.controller.js',      'Autenticación',           'js'],
  ['orquidea-api/src/controllers/usuarios.controller.js',  'Usuarios y Permisos',     'js'],
  ['orquidea-api/src/controllers/clientes.controller.js',  'Clientes',                'js'],
  ['orquidea-api/src/controllers/contratos.controller.js', 'Contratos',               'js'],
  ['orquidea-api/src/controllers/pagos.controller.js',     'Pagos y Cartera',         'js'],
  ['orquidea-api/src/controllers/servicios.controller.js', 'Servicios',               'js'],
  ['orquidea-api/src/controllers/comprobantes.controller.js','Comprobantes',           'js'],
  ['orquidea-api/src/controllers/reportes.controller.js',  'Reportes y Analytics',    'js'],
  ['orquidea-api/src/routes/auth.routes.js',               'Autenticación',           'js'],
  ['orquidea-api/src/routes/usuarios.routes.js',           'Usuarios y Permisos',     'js'],
  ['orquidea-api/src/routes/clientes.routes.js',           'Clientes',                'js'],
  ['orquidea-api/src/routes/contratos.routes.js',          'Contratos',               'js'],
  ['orquidea-api/src/routes/pagos.routes.js',              'Pagos y Cartera',         'js'],
  ['orquidea-api/src/routes/servicios.routes.js',          'Servicios',               'js'],
  ['orquidea-api/src/routes/comprobantes.routes.js',       'Comprobantes',            'js'],
  ['orquidea-api/src/routes/reportes.routes.js',           'Reportes y Analytics',    'js'],
  ['orquidea-api/scripts/migrate.js',                      'Base de Datos',           'js'],
  // ─── SQL ────────────────────────────────────────────────────────
  ['orquidea-api/src/migrations/001_schema_inicial.sql',   'Base de Datos',           'sql'],
  ['orquidea-api/src/migrations/002_sedes_y_usuarios.sql', 'Base de Datos',           'sql'],
  // ─── FRONTEND ───────────────────────────────────────────────────
  ['orquidea-web/src/main.jsx',                            'Núcleo',                  'js'],
  ['orquidea-web/src/App.jsx',                             'Núcleo',                  'js'],
  ['orquidea-web/src/store/auth.store.js',                 'Autenticación',           'js'],
  ['orquidea-web/src/services/api.js',                     'Servicios HTTP',          'js'],
  ['orquidea-web/src/services/auth.service.js',            'Autenticación',           'js'],
  ['orquidea-web/src/components/layout/Header.jsx',        'Layout',                  'js'],
  ['orquidea-web/src/components/layout/Sidebar.jsx',       'Layout',                  'js'],
  ['orquidea-web/src/components/layout/AuthLayout.jsx',    'Layout',                  'js'],
  ['orquidea-web/src/components/layout/MainLayout.jsx',    'Layout',                  'js'],
  ['orquidea-web/src/pages/auth/LoginPage.jsx',            'Autenticación',           'js'],
  ['orquidea-web/src/pages/dashboard/DashboardPage.jsx',   'Dashboard',               'js'],
  ['orquidea-web/src/pages/clientes/ClientesPage.jsx',     'Clientes',                'js'],
  ['orquidea-web/src/pages/servicios/ServiciosPage.jsx',   'Servicios',               'js'],
  ['orquidea-web/src/pages/contratos/ContratosPage.jsx',   'Contratos',               'js'],
  ['orquidea-web/src/pages/pagos/PagosPage.jsx',           'Pagos y Cartera',         'js'],
  ['orquidea-web/src/pages/reportes/ReportesPage.jsx',     'Reportes y Analytics',    'js'],
  ['orquidea-web/src/pages/configuracion/ConfiguracionPage.jsx','Configuración',       'js'],
  ['orquidea-web/src/pages/usuarios/UsuariosPage.jsx',     'Usuarios y Permisos',     'js'],
  // ─── CSS ────────────────────────────────────────────────────────
  ['orquidea-web/src/index.css',                           'Estilos globales',        'css'],
  ['orquidea-web/src/components/layout/MainLayout.module.css','Layout',               'css'],
]

// ── Generadores de header ─────────────────────────────────────────
function pad(str, len) {
  return str + ' '.repeat(Math.max(0, len - str.length))
}

function headerJS(modulo, archivo) {
  return `/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : ${pad(modulo, 48)}║
 * ║  Archivo         : ${pad(archivo, 48)}║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : ${pad(HOY, 48)}║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */\n`
}

function headerSQL(modulo, archivo) {
  return `-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Cliente         : Funeraria San José de Abrego                        ║
-- ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
-- ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Módulo          : ${pad(modulo, 48)}║
-- ║  Archivo         : ${pad(archivo, 48)}║
-- ║  Versión         : v1.0.0                                               ║
-- ║  Fecha           : ${pad(HOY, 48)}║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
-- ║  Software propietario. Prohibida su reproducción, distribución o       ║
-- ║  comercialización sin autorización escrita del titular.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝\n`
}

function headerCSS(modulo, archivo) {
  return `/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : ${pad(modulo, 48)}║
 * ║  Archivo         : ${pad(archivo, 48)}║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : ${pad(HOY, 48)}║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */\n`
}

// ── Marcador para detectar si ya tiene header ─────────────────────
const MARCA = 'ORQUÍDEA ERP — Sistema de Gestión Funeraria'

// ── Procesador principal ──────────────────────────────────────────
async function procesar() {
  let ok = 0, omitidos = 0, errores = 0

  for (const [relPath, modulo, tipo] of ARCHIVOS) {
    const filePath = path.join(__dirname, relPath)
    const archivo  = path.basename(relPath)

    try {
      const contenido = await readFile(filePath, 'utf8')

      if (contenido.includes(MARCA)) {
        console.log(`  ⏭  Ya tiene header: ${relPath}`)
        omitidos++
        continue
      }

      const header =
        tipo === 'sql' ? headerSQL(modulo, archivo) :
        tipo === 'css' ? headerCSS(modulo, archivo) :
                         headerJS(modulo, archivo)

      await writeFile(filePath, header + contenido, 'utf8')
      console.log(`  ✅ Header agregado: ${relPath}`)
      ok++
    } catch (err) {
      console.warn(`  ⚠️  No encontrado: ${relPath}`)
      errores++
    }
  }

  console.log(`\n🌸 Completado — ${ok} archivos actualizados, ${omitidos} omitidos, ${errores} no encontrados`)
}

procesar()
