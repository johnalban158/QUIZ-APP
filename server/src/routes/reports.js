import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { sendBugReportEmail, mailConfigured } from '../mailer.js'

const router = Router()

const CATEGORIES = ['GENERAL', 'BUG', 'CONTENT', 'SUGGESTION', 'OTHER']
const MAX_MESSAGE = 5000

// POST /api/report-bug - available to any signed-in user (admin or staff).
// The report is always stored in the DB; the email is best-effort so a mail
// outage can never lose a report.
router.post('/report-bug', requireAuth, async (req, res) => {
  const { message, category, pageUrl, userAgent } = req.body ?? {}

  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) {
    return res.status(400).json({ error: 'Please describe the problem' })
  }
  if (text.length > MAX_MESSAGE) {
    return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE} characters)` })
  }

  const report = await prisma.bugReport.create({
    data: {
      userId: req.user.id,
      userName: req.user.name || 'Unknown',
      userEmail: req.user.email || null,
      role: req.user.role || null,
      category: CATEGORIES.includes(category) ? category : 'GENERAL',
      message: text,
      pageUrl: typeof pageUrl === 'string' ? pageUrl.slice(0, 500) : null,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
    },
  })

  let emailed = false
  try {
    const result = await sendBugReportEmail(report)
    emailed = result.sent
    if (emailed) {
      await prisma.bugReport.update({ where: { id: report.id }, data: { emailed: true } })
    }
  } catch (e) {
    // Report is already saved, so a mail failure is not fatal.
    console.error('Bug report email failed:', e.message)
  }

  res.status(201).json({
    ok: true,
    id: report.id,
    emailed,
    mailConfigured: mailConfigured(),
  })
})

// GET /api/admin/reports - admin inbox view of recent reports
router.get('/admin/reports', requireAdmin, async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  res.json(reports)
})

export default router
