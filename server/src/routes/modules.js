import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAdmin } from '../middleware/auth.js'
import { upload, mediaUpload } from '../middleware/upload.js'
import { cloudinaryConfigured, uploadBuffer, destroyAsset } from '../cloudinary.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadDir = path.join(__dirname, '..', '..', 'uploads')

const router = Router()

router.use(requireAdmin)

const withQuestions = {
  questions: {
    orderBy: { orderIndex: 'asc' },
    include: { options: { orderBy: { id: 'asc' } } },
  },
  eligibility: { select: { specialty: true } },
  _count: { select: { submissions: true, questions: true } },
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error('A question needs at least 2 options')
  }
  const correct = options.filter((o) => o.isCorrect).length
  if (correct !== 1) {
    throw new Error('A question needs exactly one correct option')
  }
  return options.map((o) => ({ text: String(o.text ?? '').trim(), isCorrect: !!o.isCorrect }))
}

async function enrichModulesWithStats(modules) {
  if (modules.length === 0) return modules

  const moduleIds = modules.map((m) => m.id)

  const [avgScores, lastSubmissions] = await Promise.all([
    prisma.submission.groupBy({
      by: ['moduleId'],
      where: { moduleId: { in: moduleIds } },
      _avg: { score: true, total: true },
    }),
    prisma.submission.findMany({
      where: { moduleId: { in: moduleIds } },
      select: { moduleId: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
      distinct: ['moduleId'],
    }),
  ])

  const avgMap = new Map()
  for (const row of avgScores) {
    const avgScore = row._avg.score ?? 0
    const avgTotal = row._avg.total ?? 1
    avgMap.set(row.moduleId, avgTotal > 0 ? Math.round((avgScore / avgTotal) * 100) : 0)
  }

  const lastSubMap = new Map()
  for (const row of lastSubmissions) {
    if (!lastSubMap.has(row.moduleId)) {
      lastSubMap.set(row.moduleId, row.submittedAt)
    }
  }

  return modules.map((m) => ({
    ...m,
    avgScore: avgMap.get(m.id) ?? null,
    lastSubmittedAt: lastSubMap.get(m.id) ?? null,
  }))
}

router.get('/', async (req, res) => {
  const modules = await prisma.module.findMany({
    include: withQuestions,
    orderBy: { createdAt: 'desc' },
  })
  const enriched = await enrichModulesWithStats(modules)
  res.json(enriched)
})

router.post('/', async (req, res) => {
  const { title, description, status, content, eligibility } = req.body ?? {}
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }
  const module = await prisma.module.create({
    data: {
      title: title.trim(),
      description: description ?? '',
      status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      content: content ?? '',
      createdById: req.user.id,
      eligibility: eligibility ? { create: eligibility } : undefined,
    },
    include: withQuestions,
  })
  res.status(201).json(module)
})

router.patch('/:id', async (req, res) => {
  const { title, description, status, content, eligibility } = req.body ?? {}
  const data = {}
  if (typeof title === 'string') {
    if (!title.trim()) return res.status(400).json({ error: 'Title cannot be empty' })
    data.title = title.trim()
  }
  if (typeof description === 'string') data.description = description
  if (['DRAFT', 'PUBLISHED'].includes(status)) data.status = status
  if (typeof content === 'string') data.content = content

  // Handle eligibility replacement if provided
  if (eligibility !== undefined) {
    data.eligibility = {
      deleteMany: {},
      create: eligibility,
    }
  }

  const module = await prisma.module.update({
    where: { id: req.params.id },
    data,
    include: withQuestions,
  })
  res.json(module)
})

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.module.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Module not found' })
    const moduleId = existing.id

    // Best-effort: delete question media assets from Cloudinary
    if (cloudinaryConfigured()) {
      const media = await prisma.question.findMany({
        where: { moduleId, mediaPublicId: { not: null } },
        select: { mediaPublicId: true },
      })
      await Promise.allSettled(media.map(async (m) => destroyAsset(m.mediaPublicId)))
    }

    // Delete dependents explicitly in FK-safe order inside a transaction.
    // (Schema cascades Module -> questions/submissions/etc., but
    // SubmissionAnswer -> Question/QuestionOption has NO onDelete cascade,
    // and StaffModuleCompletion -> StaffModuleAssignment has no cascade,
    // so a plain prisma.module.delete() can fail on FK constraints.)
    await prisma.$transaction(async (tx) => {
      // 1. Completions first (FK to assignment compound key + submission)
      await tx.staffModuleCompletion.deleteMany({ where: { moduleId } })
      // 2. Answer lines referencing this module's submissions or questions
      await tx.submissionAnswer.deleteMany({ where: { submission: { moduleId } } })
      await tx.submissionAnswer.deleteMany({ where: { question: { moduleId } } })
      // 3. Submissions (their remaining answers already cleared above)
      await tx.submission.deleteMany({ where: { moduleId } })
      // 4. Options then questions
      await tx.questionOption.deleteMany({ where: { question: { moduleId } } })
      await tx.question.deleteMany({ where: { moduleId } })
      // 5. Assignments + eligibility (also DB-cascade, deleted explicitly)
      await tx.staffModuleAssignment.deleteMany({ where: { moduleId } })
      await tx.moduleEligibility.deleteMany({ where: { moduleId } })
      // 6. Parent
      await tx.module.delete({ where: { id: moduleId } })
    })

    // Clean up uploaded source document file, if any (best-effort)
    if (existing.sourceDocumentUrl) {
      try {
        const filePath = path.join(uploadDir, path.basename(existing.sourceDocumentUrl))
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } catch {
        // ignore file cleanup errors — DB delete already succeeded
      }
    }

    res.json({ ok: true })
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Module not found' })
    console.error(e)
    res.status(500).json({ error: e.message || 'Failed to delete module' })
  }
})

// GET /api/admin/modules/eligible - Get modules eligible for given staff IDs
router.get('/eligible', async (req, res) => {
  const staffIds = (req.query.staffIds) ? (Array.isArray(req.query.staffIds) ? req.query.staffIds : [req.query.staffIds]) : []
  if (staffIds.length === 0) return res.json([])

  const staff = await prisma.user.findMany({
    where: { id: { in: staffIds }, role: 'STAFF' },
    select: { id: true, specialty: true },
  })
  if (staff.length === 0) return res.json([])

  // Build OR conditions on specialty only
  const specialties = [...new Set(staff.map(s => s.specialty).filter(Boolean))]
  const orConditions = specialties.map(specialty => ({ specialty }))

  const eligibleModuleIds = await prisma.moduleEligibility.findMany({
    where: { OR: orConditions },
    select: { moduleId: true },
    distinct: ['moduleId'],
  })

  const moduleIds = eligibleModuleIds.map(e => e.moduleId)

  const modules = await prisma.module.findMany({
    where: { id: { in: moduleIds }, status: 'PUBLISHED' },
    select: { id: true, title: true, description: true, status: true },
    orderBy: { title: 'asc' },
  })
  res.json(modules)
})

// POST /api/admin/modules/:id/upload - Upload source document
router.post('/:id/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const module = await prisma.module.findUnique({ where: { id: req.params.id } })
  if (!module) return res.status(404).json({ error: 'Module not found' })

  // Delete old file if exists
  if (module.sourceDocumentUrl) {
    const oldPath = path.join(uploadDir, path.basename(module.sourceDocumentUrl))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  const url = `/uploads/${req.file.filename}`
  await prisma.module.update({
    where: { id: module.id },
    data: { sourceDocumentUrl: url },
  })

  res.json({ ok: true, url, filename: req.file.filename })
})

// DELETE /api/admin/modules/:id/upload - Delete source document
router.delete('/:id/upload', async (req, res) => {
  const module = await prisma.module.findUnique({ where: { id: req.params.id } })
  if (!module) return res.status(404).json({ error: 'Module not found' })

  if (module.sourceDocumentUrl) {
    const filePath = path.join(uploadDir, path.basename(module.sourceDocumentUrl))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await prisma.module.update({ where: { id: module.id }, data: { sourceDocumentUrl: null } })
  }
  res.json({ ok: true })
})

// POST /api/admin/modules/:id/questions/:qid/media - Attach audio/video to a question (Cloudinary)
router.post('/:id/questions/:qid/media', mediaUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  if (!cloudinaryConfigured()) {
    return res.status(500).json({
      error: 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to server/.env',
    })
  }

  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, moduleId: req.params.id },
  })
  if (!question) return res.status(404).json({ error: 'Question not found' })

  // Replace any existing media (remove the old Cloudinary asset first)
  if (question.mediaPublicId) {
    try { await destroyAsset(question.mediaPublicId) } catch { /* best-effort */ }
  }

  try {
    const result = await uploadBuffer(req.file.buffer)
    const updated = await prisma.question.update({
      where: { id: question.id },
      data: {
        mediaUrl: result.secure_url,
        mediaType: req.file.mimetype.startsWith('video/') ? 'VIDEO' : 'AUDIO',
        mediaPublicId: result.public_id,
      },
      include: { options: true },
    })
    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Upload to Cloudinary failed' })
  }
})

// DELETE /api/admin/modules/:id/questions/:qid/media - Remove question media from Cloudinary
router.delete('/:id/questions/:qid/media', async (req, res) => {
  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, moduleId: req.params.id },
  })
  if (!question) return res.status(404).json({ error: 'Question not found' })

  if (question.mediaPublicId) {
    try { await destroyAsset(question.mediaPublicId) } catch { /* best-effort */ }
  }

  const updated = await prisma.question.update({
    where: { id: question.id },
    data: { mediaUrl: null, mediaType: null, mediaPublicId: null },
    include: { options: true },
  })
  res.json(updated)
})

router.post('/:id/questions', async (req, res) => {
  const { text, options } = req.body ?? {}
  if (!text || !text.trim()) return res.status(400).json({ error: 'Question text is required' })
  let normalized
  try {
    normalized = normalizeOptions(options)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  const module = await prisma.module.findUnique({ where: { id: req.params.id } })
  if (!module) return res.status(404).json({ error: 'Module not found' })

  const count = await prisma.question.count({ where: { moduleId: module.id } })
  const question = await prisma.question.create({
    data: {
      moduleId: module.id,
      text: text.trim(),
      orderIndex: count,
      options: { create: normalized },
    },
    include: { options: true },
  })
  res.status(201).json(question)
})

router.put('/:id/questions/:qid', async (req, res) => {
  const { text, options } = req.body ?? {}
  if (!text || !text.trim()) return res.status(400).json({ error: 'Question text is required' })
  let normalized
  try {
    normalized = normalizeOptions(options)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, moduleId: req.params.id },
  })
  if (!question) return res.status(404).json({ error: 'Question not found' })

  const updated = await prisma.$transaction([
    prisma.questionOption.deleteMany({ where: { questionId: question.id } }),
    prisma.question.update({
      where: { id: question.id },
      data: { text: text.trim(), options: { create: normalized } },
      include: { options: true },
    }),
  ])
  res.json(updated[1])
})

router.patch('/:id/questions/reorder', async (req, res) => {
  const { order } = req.body ?? {}
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of question ids' })
  const questions = await prisma.question.findMany({ where: { moduleId: req.params.id } })
  const ids = new Set(questions.map((q) => q.id))
  if (order.some((id) => !ids.has(id)) || order.length !== ids.size) {
    return res.status(400).json({ error: 'order must contain every question id exactly once' })
  }
  await prisma.$transaction(
    order.map((id, index) =>
      prisma.question.update({ where: { id }, data: { orderIndex: index } })
    )
  )
  res.json({ ok: true })
})

router.delete('/:id/questions/:qid', async (req, res) => {
  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, moduleId: req.params.id },
  })
  if (!question) return res.status(404).json({ error: 'Question not found' })

  if (question.mediaPublicId) {
    try { await destroyAsset(question.mediaPublicId) } catch { /* best-effort */ }
  }

  await prisma.question.delete({ where: { id: question.id } })
  const rest = await prisma.question.findMany({
    where: { moduleId: req.params.id },
    orderBy: { orderIndex: 'asc' },
  })
  await prisma.$transaction(
    rest.map((q, index) =>
      prisma.question.update({ where: { id: q.id }, data: { orderIndex: index } })
    )
  )
  res.json({ ok: true })
})

export default router