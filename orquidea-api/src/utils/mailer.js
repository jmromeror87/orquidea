/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : Correo — envío transaccional (SMTP)                  ║
 * ║  Archivo         : utils/mailer.js                                      ║
 * ║  Fecha           : 2026-07-30                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transporter = null

function getTransporter() {
  if (!env.smtp.host) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  }
  return transporter
}

function layout({ titulo, cuerpoHtml, botonTexto, botonUrl }) {
  return `
  <div style="background:#F4F5FA;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ECEDF8;">
      <tr>
        <td style="background:linear-gradient(135deg,#2E3192,#C9A020);padding:28px 32px;text-align:center;">
          <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.3px;">ORQUÍDEA ERP</div>
          <div style="color:rgba(255,255,255,.85);font-size:12px;margin-top:2px;">Funeraria San José de Ábrego</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:18px;color:#0F1035;">${titulo}</h1>
          <div style="font-size:14px;line-height:1.6;color:#4B5065;">${cuerpoHtml}</div>
          ${botonUrl ? `
          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${botonUrl}" style="display:inline-block;background:#2E3192;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:10px;">${botonTexto}</a>
          </div>
          <div style="font-size:11.5px;color:#9CA3AF;text-align:center;margin-top:14px;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
            <span style="word-break:break-all;color:#6366F1;">${botonUrl}</span>
          </div>` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 32px;background:#FAFBFF;border-top:1px solid #ECEDF8;text-align:center;">
          <div style="font-size:11px;color:#9CA3AF;">© 2026 Funeraria San José de Ábrego S.A.S — Este es un correo automático, por favor no respondas.</div>
        </td>
      </tr>
    </table>
  </div>`
}

export async function enviarCorreoActivacion({ para, nombre, url }) {
  const t = getTransporter()
  if (!t) {
    console.warn(`[mailer] SMTP no configurado. Link de activación para ${para}: ${url}`)
    return { enviado: false, url }
  }

  const html = layout({
    titulo: `¡Bienvenido, ${nombre}! 👋`,
    cuerpoHtml: `
      Se creó una cuenta para ti en <strong>Orquídea ERP</strong>, el sistema de gestión de
      Funeraria San José de Ábrego.<br/><br/>
      Antes de ingresar, necesitas crear tu propia contraseña. Haz clic en el botón de abajo
      para activarla — el enlace es válido por 48 horas.
    `,
    botonTexto: 'Crear mi contraseña',
    botonUrl: url,
  })

  await t.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to: para,
    subject: 'Activa tu cuenta en Orquídea ERP',
    html,
  })

  return { enviado: true }
}
