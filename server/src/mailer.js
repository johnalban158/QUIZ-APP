import nodemailer from 'nodemailer'

// Owner inbox that receives every bug report.
const MAIL_TO = process.env.MAIL_TO || 'jochaenjo@gmail.com'

export function mailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS)
}

let transporter = null
function getTransporter() {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendBugReportEmail(report) {
  if (!mailConfigured()) {
    return { sent: false, reason: 'SMTP not configured' }
  }

  const lines = [
    `Category: ${report.category}`,
    `From:    ${report.userName}${report.userEmail ? ` <${report.userEmail}>` : ''}`,
    `Role:    ${report.role || 'unknown'}`,
    `Page:    ${report.pageUrl || 'n/a'}`,
    `Time:    ${new Date(report.createdAt).toISOString()}`,
    '',
    'Message:',
    report.message,
    '',
    `User agent: ${report.userAgent || 'n/a'}`,
  ]

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `"Quiz App" <${process.env.SMTP_USER}>`,
    to: MAIL_TO,
    subject: `[Quiz App] Bug report: ${report.category} - ${report.userName}`,
    text: lines.join('\n'),
    html: `<h2>New bug report</h2>
      <p><strong>${escapeHtml(report.userName)}</strong> (${escapeHtml(report.role || 'unknown')})</p>
      <p style="white-space:pre-wrap">${escapeHtml(report.message)}</p>
      <hr>
      <p style="font-size:12px;color:#666">
        Category: ${escapeHtml(report.category)}<br>
        Email: ${escapeHtml(report.userEmail || 'n/a')}<br>
        Page: ${escapeHtml(report.pageUrl || 'n/a')}<br>
        Time: ${escapeHtml(new Date(report.createdAt).toISOString())}
      </p>`,
  })

  return { sent: true }
}
