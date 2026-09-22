import { Router } from 'express'
import { prisma } from '../prisma.js'

const router = Router()

// GET /api/quiz/staff-list - Public list of staff for senior selection
router.get('/staff-list', async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { role: 'STAFF' },
    select: { id: true, name: true, specialty: true },
    orderBy: { name: 'asc' },
  })
  res.json(staff)
})

// GET /api/quiz/seniors - Public list of saved senior profiles
// NOTE: must stay BEFORE router.get('/:id') or "seniors" is treated as :id
router.get('/seniors', async (req, res) => {
  const { search, staffId } = req.query ?? {}
  const where = {}
  if (typeof search === 'string' && search.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' }
  }
  if (typeof staffId === 'string' && staffId.trim()) {
    where.preferredStaffId = staffId.trim()
  }
  const seniors = await prisma.seniorProfile.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      preferredStaff: { select: { id: true, name: true, specialty: true } },
      _count: { select: { submissions: true } },
    },
  })
  res.json(
    seniors.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      preferredStaffId: s.preferredStaffId,
      preferredStaff: s.preferredStaff,
      notes: s.notes,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      submissionCount: s._count.submissions,
    }))
  )
})

// POST /api/quiz/seniors - Save a senior profile (public, staff-assisted flow)
router.post('/seniors', async (req, res) => {
  const { name, preferredStaffId, email, notes } = req.body ?? {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }
  const cleanStaffId =
    typeof preferredStaffId === 'string' ? preferredStaffId.trim() || null : (preferredStaffId ?? null)
  if (cleanStaffId) {
    const staff = await prisma.user.findUnique({ where: { id: cleanStaffId } })
    if (!staff || staff.role !== 'STAFF') {
      return res.status(400).json({ error: 'Invalid staff member' })
    }
  }
  const cleanEmail = typeof email === 'string' ? email.trim() || null : (email ?? null)
  const cleanNotes = typeof notes === 'string' ? notes.trim() || null : (notes ?? null)
  try {
    const senior = await prisma.seniorProfile.create({
      data: {
        name: String(name).trim(),
        preferredStaffId: cleanStaffId,
        email: cleanEmail,
        notes: cleanNotes,
      },
      include: { preferredStaff: { select: { id: true, name: true, specialty: true } } },
    })
    res.status(201).json({
      id: senior.id,
      name: senior.name,
      email: senior.email,
      preferredStaffId: senior.preferredStaffId,
      preferredStaff: senior.preferredStaff,
      notes: senior.notes,
      createdAt: senior.createdAt,
      updatedAt: senior.updatedAt,
    })
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'A senior with that email already exists' })
    }
    throw e
  }
})

router.get('/', async (req, res) => {
  const modules = await prisma.module.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(modules)
})

router.get('/:id', async (req, res) => {
  const module = await prisma.module.findFirst({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          text: true,
          orderIndex: true,
          options: {
            select: { id: true, text: true },
            orderBy: { id: 'asc' },
          },
        },
      },
    },
  })
  if (!module) return res.status(404).json({ error: 'Quiz not found' })
  res.json({ id: module.id, title: module.title, description: module.description, content: module.content, questions: module.questions })
})

// Shared helper for grading
async function gradeModule(module, answers) {
  const byId = new Map(module.questions.flatMap((q) => q.options.map((o) => [o.id, { q, o }])))
  let score = 0
  const breakdown = []

  const answerLines = answers
    .filter((a) => byId.has(a.optionId))
    .map((a) => {
      const { q, o } = byId.get(a.optionId)
      const correct = !!o.isCorrect
      const correctOption = q.options.find((op) => op.isCorrect)
      breakdown.push({
        questionId: q.id,
        questionText: q.text,
        selectedText: o.text,
        isCorrect: correct,
        correctText: correctOption ? correctOption.text : null,
      })
      if (correct) score++
      return {
        questionId: q.id,
        selectedOptionId: o.id,
        isCorrect: correct,
      }
    })

  const total = module.questions.length
  const percent = total ? Math.round((score / total) * 100) : 0
  const passed = percent >= 70

  return { score, total, percent, passed, breakdown, answerLines }
}

router.post('/:id/submit', async (req, res) => {
  const { takerName, staffMemberId, answers, timeTakenSeconds, seniorProfileId } = req.body ?? {}
  if (!takerName || !takerName.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (!staffMemberId) {
    return res.status(400).json({ error: 'staffMemberId is required' })
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers must be a non-empty array' })
  }
  if (timeTakenSeconds !== undefined && (!Number.isInteger(timeTakenSeconds) || timeTakenSeconds < 0)) {
    return res.status(400).json({ error: 'timeTakenSeconds must be a non-negative integer' })
  }

  // Validate staff member exists and is STAFF
  const staff = await prisma.user.findUnique({ where: { id: staffMemberId } })
  if (!staff || staff.role !== 'STAFF') {
    return res.status(400).json({ error: 'Invalid staff member' })
  }

  // Validate senior profile when linked (optional). staffMemberId stays required as today.
  const cleanSeniorId =
    typeof seniorProfileId === 'string' ? seniorProfileId.trim() || null : (seniorProfileId ?? null)
  if (cleanSeniorId) {
    const senior = await prisma.seniorProfile.findUnique({ where: { id: cleanSeniorId } })
    if (!senior) return res.status(404).json({ error: 'Senior not found' })
  }

  const module = await prisma.module.findFirst({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: true },
      },
    },
  })
  if (!module) return res.status(404).json({ error: 'Quiz not found' })

  // Check assignment exists (staff must be assigned this module)
  const assignment = await prisma.staffModuleAssignment.findUnique({
    where: { staffId_moduleId: { staffId: staffMemberId, moduleId: module.id } },
  })
  if (!assignment) {
    return res.status(400).json({ error: 'This module is not assigned to the selected staff member' })
  }

  const { score, total, percent, passed, breakdown, answerLines } = await gradeModule(module, answers)

  // Transaction: create Submission + (if passed) StaffModuleCompletion
  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.create({
      data: {
        moduleId: module.id,
        staffMemberId,
        takerName: takerName.trim(),
        takerEmail: '',
        seniorProfileId: cleanSeniorId,
        score,
        total,
        timeTakenSeconds: timeTakenSeconds ?? null,
        answers: { create: answerLines },
      },
    })

    // Touch the senior so repeat seniors bubble up on GET /seniors (updatedAt desc)
    if (cleanSeniorId) {
      await tx.seniorProfile.update({
        where: { id: cleanSeniorId },
        data: { updatedAt: new Date() },
      })
    }

    let completion = null
    if (passed) {
      completion = await tx.staffModuleCompletion.upsert({
        where: { staffId_moduleId: { staffId: staffMemberId, moduleId: module.id } },
        create: {
          staffId: staffMemberId,
          moduleId: module.id,
          submissionId: submission.id,
          score,
          total,
          percent,
          passed: true,
        },
        update: {
          submissionId: submission.id,
          score,
          total,
          percent,
          passed: true,
          completedAt: new Date(),
        },
      })
    }

    return { submission, completion }
  })

  res.status(201).json({
    submissionId: result.submission.id,
    moduleTitle: module.title,
    takerName: result.submission.takerName,
    staffMemberId,
    seniorProfileId: result.submission.seniorProfileId,
    score,
    total,
    percent,
    passed,
    breakdown,
    completionRecorded: !!result.completion,
  })
})

export default router