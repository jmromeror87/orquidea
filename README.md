# 🌸 Orquídea — Sistema de Gestión Funeraria

Sistema web integral para la administración de servicios funerarios.

## Estructura del Proyecto

```
orquidea/
├── orquidea-web/     # Frontend — React 19 + Vite 6
└── orquidea-api/     # Backend  — Node.js 20 + Fastify 4 + PostgreSQL 15
```

## Stack Tecnológico

### Backend
- **Node.js 20+** · Runtime del servidor
- **Fastify 4.x** · Framework HTTP
- **PostgreSQL 15** · Base de datos relacional
- **pg** · Driver de conexión a PostgreSQL
- **PDFKit / Puppeteer** · Generación de PDFs
- **ExcelJS** · Exportación de reportes Excel
- **@fastify/multipart** · Upload de archivos
- **whatsapp-web.js** · Notificaciones por WhatsApp
- **JWT + bcrypt** · Autenticación segura
- **PM2** · Gestor de procesos en producción

### Frontend
- **React 19** · UI declarativa
- **Vite 6.x** · Bundler ultrarrápido
- **React Router 6** · Navegación SPA
- **Axios** · Cliente HTTP con interceptores JWT
- **Recharts** · Gráficas y visualizaciones
- **jsPDF + AutoTable** · PDFs desde el navegador
- **SheetJS** · Exportación Excel
- **Lucide React** · Iconografía SVG

### Infraestructura
- **Ubuntu Server** (DigitalOcean)
- **Nginx** · Proxy inverso
- **Docker** · Backups de BD
- **rsync + sshpass** · Deploy automatizado

## Inicio Rápido

```bash
# Backend
cd orquidea-api
npm install
cp .env.example .env   # configurar variables
npm run migrate        # ejecutar migraciones
npm run dev

# Frontend
cd orquidea-web
npm install
cp .env.example .env
npm run dev
```
