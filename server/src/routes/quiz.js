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

// GET /api/quiz/seniors/find?name=John - Public name-based matching.
// Matches a quiz taker's typed name to SeniorProfile rows, then resolves each
// match's designated staff member + that staff's PUBLISHED assigned modules.
// NOTE: must stay BEFORE '/seniors/:id/modules' and before '/:id' so "find"
// is never treated as a param value.
// Response shape:
// {
//   matches: [{
//     senior: { id, name, preferredStaffId },
//     staff: { id, name, specialty } | null,
//     modules: [{ id, title, description, createdAt }]
//   }]
// }
router.get('/seniors/find', async (req, res) => {
  const rawName = req.query?.name
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (!name) {
    return res.status(400).json({ error: 'name query parameter is required' })
  }
  const seniors = await prisma.seniorProfile.findMany({
    where: { name: { contains: name, mode: 'insensitive' } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: {
      preferredStaff: { select: { id: true, name: true, specialty: true } },
    },
  })
  const matches = await Promise.all(
    seniors.map(async (s) => {
      if (!s.preferredStaffId) {
        return {
          senior: { id: s.id, name: s.name, preferredStaffId: s.preferredStaffId },
          staff: null,
          modules: [],
        }
      }
      const assignments = await prisma.staffModuleAssignment.findMany({
        where: { staffId: s.preferredStaffId, module: { status: 'PUBLISHED' } },
        include: {
          module: { select: { id: true, title: true, description: true, createdAt: true } },
        },
        orderBy: { assignedAt: 'desc' },
      })
      return {
        senior: { id: s.id, name: s.name, preferredStaffId: s.preferredStaffId },
        staff: s.preferredStaff ?? null,
        modules: assignments.map((a) => ({
          id: a.module.id,
          title: a.module.title,
          description: a.module.description,
          createdAt: a.module.createdAt,
        })),
      }
    })
  )
  res.json({ matches })
})

// GET /api/quiz/seniors/:id/modules - Designated modules for a resident.
// Returns the PUBLISHED modules assigned to the resident's preferred staff
// member, so the frontend can AUTO-open the resident's module right after
// their profile is picked (elderly usability: no browsing needed).
// Shape: [{ id, title, description, status, staffId, assignedAt }]
// Empty array when the resident has no preferred staff or no published
// assignments (caller should fall back to the full quiz list).
// NOTE: must stay BEFORE router.get('/:id') for readability (multi-segment
// path can't be swallowed by '/:id', but keep public senior routes together).
router.get('/seniors/:id/modules', async (req, res) => {
  const senior = await prisma.seniorProfile.findUnique({ where: { id: req.params.id } })
  if (!senior) return res.status(404).json({ error: 'Senior not found' })
  if (!senior.preferredStaffId) return res.json([])
  const assignments = await prisma.staffModuleAssignment.findMany({
    where: { staffId: senior.preferredStaffId, module: { status: 'PUBLISHED' } },
    include: {
      module: { select: { id: true, title: true, description: true, status: true } },
    },
    orderBy: { assignedAt: 'desc' },
  })
  res.json(
    assignments.map((a) => ({
      id: a.module.id,
      title: a.module.title,
      description: a.module.description,
      status: a.module.status,
      staffId: a.staffId,
      assignedAt: a.assignedAt,
    }))
  )
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
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers must be a non-empty array' })
  }
  if (timeTakenSeconds !== undefined && (!Number.isInteger(timeTakenSeconds) || timeTakenSeconds < 0)) {
    return res.status(400).json({ error: 'timeTakenSeconds must be a non-negative integer' })
  }

  // Resolve senior first so we can fall back to senior.preferredStaffId when
  // staffMemberId is omitted. Explicit staffMemberId wins when provided.
  const cleanSeniorId =
    typeof seniorProfileId === 'string' ? seniorProfileId.trim() || null : (seniorProfileId ?? null)
  let senior = null
  if (cleanSeniorId) {
    senior = await prisma.seniorProfile.findUnique({ where: { id: cleanSeniorId } })
    if (!senior) return res.status(404).json({ error: 'Senior not found' })
  }

  const cleanStaffInput =
    typeof staffMemberId === 'string' ? staffMemberId.trim() || null : (staffMemberId ?? null)
  const effectiveStaffMemberId = cleanStaffInput || senior?.preferredStaffId || null
  if (!effectiveStaffMemberId) {
    return res.status(400).json({ error: 'staffMemberId is required' })
  }

  // Validate staff member exists and is STAFF
  const staff = await prisma.user.findUnique({ where: { id: effectiveStaffMemberId } })
  if (!staff || staff.role !== 'STAFF') {
    return res.status(400).json({ error: 'Invalid staff member' })
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
    where: { staffId_moduleId: { staffId: effectiveStaffMemberId, moduleId: module.id } },
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
        staffMemberId: effectiveStaffMemberId,
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
        where: { staffId_moduleId: { staffId: effectiveStaffMemberId, moduleId: module.id } },
        create: {
          staffId: effectiveStaffMemberId,
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
    staffMemberId: effectiveStaffMemberId,
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