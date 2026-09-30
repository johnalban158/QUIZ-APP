import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAdmin, requireStaff, STAFF_ROLES } from '../middleware/auth.js'

const adminRouter = Router()
const selfRouter = Router()

// Where-clause matching any staff member (NURSE or CAREGIVER).
// `role: STAFF_FILTER` no longer exists in the Role enum.
const STAFF_FILTER = { in: STAFF_ROLES }

// Passing grade, unchanged: >= 70%.
const PASS_PERCENT = 70

// Admin routes - all requireAdmin
adminRouter.use(requireAdmin)

// Self routes - all requireStaff
selfRouter.use(requireStaff)

/**
 * Helper: check if a module is eligible for a staff member
 */
async function isModuleEligible(moduleId, specialty) {
  const eligible = await prisma.moduleEligibility.findFirst({
    where: {
      moduleId,
      specialty,
    },
  })
  return !!eligible
}

/**
 * Helper: build StaffAssignmentDetail for a staff member
 */
async function buildAssignmentsForStaff(staffId, specialty) {
  const assignments = await prisma.staffModuleAssignment.findMany({
    where: { staffId },
    include: {
      module: { select: { id: true, title: true, status: true, eligibility: { select: { specialty: true } } } },
      assignedBy: { select: { name: true } },
      completion: { select: { submissionId: true, score: true, total: true, percent: true, passed: true, completedAt: true } },
    },
    orderBy: { assignedAt: 'desc' },
  })

  return Promise.all(assignments.map(async (a) => {
    const isEligible = await isModuleEligible(a.moduleId, specialty)
    return {
      moduleId: a.module.id,
      moduleTitle: a.module.title,
      moduleStatus: a.module.status,
      assignedAt: a.assignedAt,
      assignedByName: a.assignedBy.name,
      completion: a.completion ? {
        submissionId: a.completion.submissionId,
        score: a.completion.score,
        total: a.completion.total,
        percent: a.completion.percent,
        passed: a.completion.passed,
        completedAt: a.completion.completedAt,
      } : undefined,
      isEligible,
      moduleEligibility: a.module.eligibility,
    }
  }))
}

/**
 * Helper: compute roster stats for staff list
 */
async function computeRosterStats(staffList) {
  const staffIds = staffList.map(s => s.id)

  // Assignments count
  const assignments = await prisma.staffModuleAssignment.groupBy({
    by: ['staffId'],
    where: { staffId: { in: staffIds } },
    _count: { staffId: true },
  })

  // Completions count (passed only)
  const completions = await prisma.staffModuleCompletion.groupBy({
    by: ['staffId'],
    where: { staffId: { in: staffIds }, passed: true },
    _count: { staffId: true },
  })

  // Eligible modules count per specialty group
  const groups = new Map()
  staffList.forEach(s => {
    const key = s.specialty
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s.id)
  })

  const eligibleCounts = new Map()
  for (const [specialty] of groups) {
    const count = await prisma.module.count({
      where: {
        status: 'PUBLISHED',
        eligibility: { some: { specialty } },
      },
    })
    eligibleCounts.set(specialty, count)
  }

  const assignMap = new Map(assignments.map(a => [a.staffId, a._count.staffId]))
  const completeMap = new Map(completions.map(c => [c.staffId, c._count.staffId]))

  return staffList.map(s => {
    const key = s.specialty
    const assigned = assignMap.get(s.id) ?? 0
    const completed = completeMap.get(s.id) ?? 0
    const totalEligible = eligibleCounts.get(key) ?? 0
    const progressPercent = totalEligible > 0 ? Math.round((completed / totalEligible) * 100) : 0
    return {
      ...s,
      assignedModules: assigned,
      completedModules: completed,
      totalEligibleModules: totalEligible,
      progressPercent,
    }
  })
}

// ===== ADMIN ROUTES =====

// GET /api/admin/staff - List staff roster with computed stats
adminRouter.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25))
  const search = req.query.search ? String(req.query.search).trim() : ''
  const specialty = req.query.specialty ? String(req.query.specialty) : ''

  const where = { role: STAFF_FILTER }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (specialty) where.specialty = specialty

  const [staff, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, specialty: true, isActive: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  const data = await computeRosterStats(staff)

  res.json({ data, meta: { total, page, limit } })
})

// GET /api/admin/staff/:id - Staff detail with training plan
adminRouter.get('/:id', async (req, res) => {
  const staff = await prisma.user.findUnique({
    where: { id: req.params.id, role: STAFF_FILTER },
    select: { id: true, name: true, email: true, specialty: true, isActive: true },
  })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const assignments = await buildAssignmentsForStaff(staff.id, staff.specialty)
  const assignedModules = assignments.length
  const completedModules = assignments.filter(a => a.completion?.passed).length

  // Compute totalEligibleModules for this staff (specialty-only rules)
  const totalEligibleModules = await prisma.module.count({
    where: {
      status: 'PUBLISHED',
      eligibility: {
        some: { specialty: staff.specialty },
      },
    },
  })

  const progressPercent = totalEligibleModules > 0 ? Math.round((completedModules / totalEligibleModules) * 100) : 0

  res.json({
    ...staff,
    assignments,
    assignedModules,
    completedModules,
    totalEligibleModules,
    progressPercent,
  })
})

// POST /api/admin/staff/:id/modules - Assign a module to a staff member
adminRouter.post('/:id/modules', async (req, res) => {
  const { moduleId } = req.body ?? {}
  if (!moduleId) return res.status(400).json({ error: 'moduleId is required' })

  const staff = await prisma.user.findUnique({ where: { id: req.params.id, role: STAFF_FILTER } })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const module = await prisma.module.findUnique({ where: { id: moduleId } })
  if (!module) return res.status(404).json({ error: 'Module not found' })
  if (module.status !== 'PUBLISHED') return res.status(400).json({ error: 'Module must be PUBLISHED to assign' })

  const eligible = await isModuleEligible(moduleId, staff.specialty)
  if (!eligible) return res.status(400).json({ error: 'Staff member is not eligible for this module' })

  const assignment = await prisma.staffModuleAssignment.upsert({
    where: { staffId_moduleId: { staffId: staff.id, moduleId } },
    create: { staffId: staff.id, moduleId, assignedById: req.user.id },
    update: {},
    include: { module: { select: { id: true, title: true, status: true } }, assignedBy: { select: { name: true } } },
  })

  res.status(201).json({
    ok: true,
    assignment: {
      moduleId: assignment.module.id,
      moduleTitle: assignment.module.title,
      moduleStatus: assignment.module.status,
      assignedAt: assignment.assignedAt,
      assignedByName: assignment.assignedBy.name,
    },
  })
})

// DELETE /api/admin/staff/:id/modules/:moduleId - Remove assignment (block if completed)
adminRouter.delete('/:id/modules/:moduleId', async (req, res) => {
  const { id, moduleId } = req.params

  const staff = await prisma.user.findUnique({ where: { id, role: STAFF_FILTER } })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const completion = await prisma.staffModuleCompletion.findUnique({
    where: { staffId_moduleId: { staffId: id, moduleId } },
  })
  if (completion) {
    return res.status(409).json({ error: 'Cannot remove assignment: staff has already completed this module' })
  }

  await prisma.staffModuleAssignment.deleteMany({ where: { staffId: id, moduleId } })
  res.json({ ok: true })
})

// POST /api/admin/staff/bulk-assign - Bulk assign module to multiple staff
adminRouter.post('/bulk-assign', async (req, res) => {
  const { staffIds, moduleId } = req.body ?? {}
  if (!Array.isArray(staffIds) || staffIds.length === 0 || !moduleId) {
    return res.status(400).json({ error: 'staffIds (array) and moduleId are required' })
  }

  const module = await prisma.module.findUnique({ where: { id: moduleId } })
  if (!module || module.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Module not found or not published' })
  }

  const staff = await prisma.user.findMany({
    where: { id: { in: staffIds }, role: STAFF_FILTER },
    select: { id: true, specialty: true },
  })
  if (staff.length !== staffIds.length) {
    return res.status(400).json({ error: 'One or more staff not found' })
  }

  const eligibleStaffIds = new Set()
  const skipped = []

  for (const s of staff) {
    const eligible = await prisma.moduleEligibility.findFirst({
      where: { moduleId, specialty: s.specialty },
    })
    if (eligible) {
      eligibleStaffIds.add(s.id)
    } else {
      skipped.push({ staffId: s.id, reason: 'INELIGIBLE' })
    }
  }

  // Check for already assigned
  const existing = await prisma.staffModuleAssignment.findMany({
    where: { staffId: { in: [...eligibleStaffIds] }, moduleId },
    select: { staffId: true },
  })
  const alreadyAssigned = new Set(existing.map(e => e.staffId))
  alreadyAssigned.forEach(id => {
    eligibleStaffIds.delete(id)
    skipped.push({ staffId: id, reason: 'ALREADY_ASSIGNED' })
  })

  if (eligibleStaffIds.size === 0) {
    return res.json({ ok: true, created: 0, skipped })
  }

  const created = await prisma.$transaction(
    [...eligibleStaffIds].map(staffId =>
      prisma.staffModuleAssignment.upsert({
        where: { staffId_moduleId: { staffId, moduleId } },
        create: { staffId, moduleId, assignedById: req.user.id },
        update: {},
      })
    )
  )

  res.json({ ok: true, created: created.length, skipped })
})

// PATCH /api/admin/staff/:id/status - Freeze / unfreeze a staff account
adminRouter.patch('/:id/status', async (req, res) => {
  const { id } = req.params
  const isActive = req.body?.isActive

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot freeze your own account' })
  }
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive (boolean) is required' })
  }

  const staff = await prisma.user.findUnique({ where: { id, role: STAFF_FILTER } })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, specialty: true, isActive: true },
  })

  res.json({ ok: true, user: updated })
})

// ===== SELF-SERVICE ROUTES =====

// GET /api/staff/me/modules - Module assignments with completion status
selfRouter.get('/me/modules', async (req, res) => {
  const assignments = await prisma.staffModuleAssignment.findMany({
    where: { staffId: req.user.id },
    include: {
      module: { select: { id: true, title: true, description: true } },
      completion: { select: { score: true, total: true, percent: true, passed: true, completedAt: true } },
    },
    orderBy: { assignedAt: 'desc' },
  })

  // Find which modules have at least one attempt (submission) so we can
  // distinguish NOT_STARTED from IN_PROGRESS (completions are only
  // recorded on pass, so a failed attempt leaves a Submission but no completion).
  const moduleIds = assignments.map((a) => a.moduleId)
  const attempted = new Set()
  if (moduleIds.length > 0) {
    const submissions = await prisma.submission.findMany({
      where: { staffMemberId: req.user.id, moduleId: { in: moduleIds } },
      select: { moduleId: true },
    })
    submissions.forEach((s) => attempted.add(s.moduleId))
  }

  const modules = assignments.map((a) => {
    let status
    if (a.completion) {
      status = a.completion.passed ? 'PASSED' : 'FAILED'
    } else if (attempted.has(a.moduleId)) {
      status = 'IN_PROGRESS'
    } else {
      status = 'NOT_STARTED'
    }
    return {
      id: a.id,
      moduleId: a.module.id,
      module: a.module,
      assignedAt: a.assignedAt,
      completion: a.completion ?? null,
      status,
    }
  })

  res.json({ modules })
})

// GET /api/staff/me - Own training plan
selfRouter.get('/me', async (req, res) => {
  const staff = await prisma.user.findUnique({
    where: { id: req.user.id, role: STAFF_FILTER },
    select: { id: true, name: true, email: true, specialty: true, isActive: true },
  })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const assignments = await buildAssignmentsForStaff(staff.id, staff.specialty)
  const assignedModules = assignments.length
  const completedModules = assignments.filter(a => a.completion?.passed).length

  const totalEligibleModules = await prisma.module.count({
    where: {
      status: 'PUBLISHED',
      eligibility: {
        some: { specialty: staff.specialty },
      },
    },
  })

  const progressPercent = totalEligibleModules > 0 ? Math.round((completedModules / totalEligibleModules) * 100) : 0

  const completions = await prisma.staffModuleCompletion.findMany({
    where: { staffId: staff.id },
    select: {
      moduleId: true,
      submissionId: true,
      score: true,
      total: true,
      percent: true,
      passed: true,
      completedAt: true,
      module: { select: { id: true, title: true } },
    },
    orderBy: { completedAt: 'desc' },
  })

  res.json({
    ...staff,
    assignments,
    completions,
    assignedModules,
    completedModules,
    totalEligibleModules,
    progressPercent,
  })
})

// GET /api/staff/me/modules/:moduleId - Module detail for assigned module (no answers)
selfRouter.get('/me/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params

  // Verify assignment exists
  const assignment = await prisma.staffModuleAssignment.findUnique({
    where: { staffId_moduleId: { staffId: req.user.id, moduleId } },
  })
  if (!assignment) return res.status(404).json({ error: 'Module not assigned to you' })

  const module = await prisma.module.findFirst({
    where: { id: moduleId, status: 'PUBLISHED' },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          text: true,
          orderIndex: true,
          mediaUrl: true,
          mediaType: true,
          options: { select: { id: true, text: true }, orderBy: { id: 'asc' } },
        },
      },
    },
  })
  if (!module) return res.status(404).json({ error: 'Module not found or not published' })

  res.json({
    id: module.id,
    title: module.title,
    description: module.description,
    content: module.content,
    questions: module.questions,
  })
})

/**
 * Grade a set of questions against the caller's selections.
 * `selectedByQuestionId` is a Map<questionId, selectedOptionId>.
 * Returns score/total/percent/passed plus the per-question breakdown and the
 * SubmissionAnswer rows to persist (only for questions actually answered).
 */
function gradeQuestions(questions, selectedByQuestionId) {
  let score = 0
  const breakdown = []
  const answerRows = []

  for (const q of questions) {
    const correctOption = q.options.find((o) => o.isCorrect) ?? null
    const selectedOptionId = selectedByQuestionId.get(q.id) ?? null
    const selected = selectedOptionId ? (q.options.find((o) => o.id === selectedOptionId) ?? null) : null
    const isCorrect = !!(selected && selected.isCorrect)
    if (selected) {
      if (isCorrect) score++
      answerRows.push({ questionId: q.id, selectedOptionId: selected.id, isCorrect })
    }
    breakdown.push({
      questionId: q.id,
      text: q.text,
      selectedOptionId,
      correctOptionId: correctOption ? correctOption.id : null,
      isCorrect,
    })
  }

  const total = questions.length
  const percent = total > 0 ? Math.round((score / total) * 100) : 0
  return { score, total, percent, passed: percent >= PASS_PERCENT, breakdown, answerRows }
}

// Rebuild a breakdown from stored SubmissionAnswer rows (used by /results so a
// past attempt shows what was actually graded at the time).
function breakdownFromStored(questions, answers) {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]))
  return questions.map((q) => {
    const stored = answerByQuestion.get(q.id)
    const correctOption = q.options.find((o) => o.isCorrect) ?? null
    return {
      questionId: q.id,
      text: q.text,
      selectedOptionId: stored ? stored.selectedOptionId : null,
      correctOptionId: correctOption ? correctOption.id : null,
      isCorrect: stored ? !!stored.isCorrect : false,
    }
  })
}

// POST /api/staff/me/modules/:moduleId/submit - grade + record an attempt.
// The caller must have this module assigned; grading happens server-side only
// (correct answers are revealed in the response, never before).
selfRouter.post('/me/modules/:moduleId/submit', async (req, res) => {
  const { moduleId } = req.params
  const { answers, timeTakenSeconds } = req.body ?? {}

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers must be a non-empty array of { questionId, selectedOptionId }' })
  }
  if (
    timeTakenSeconds !== undefined &&
    timeTakenSeconds !== null &&
    (!Number.isInteger(timeTakenSeconds) || timeTakenSeconds < 0)
  ) {
    return res.status(400).json({ error: 'timeTakenSeconds must be a non-negative integer' })
  }

  // PUBLISHED module only
  const module = await prisma.module.findFirst({
    where: { id: moduleId, status: 'PUBLISHED' },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: { orderBy: { id: 'asc' } } },
      },
    },
  })
  if (!module) return res.status(404).json({ error: 'Module not found or not published' })

  // Assignment required: staff may only submit modules assigned to them
  const assignment = await prisma.staffModuleAssignment.findUnique({
    where: { staffId_moduleId: { staffId: req.user.id, moduleId: module.id } },
  })
  if (!assignment) return res.status(403).json({ error: 'Module is not assigned to you' })

  // Keep only answers that belong to this module (question + option pair).
  const questionById = new Map(module.questions.map((q) => [q.id, q]))
  const selectedByQuestionId = new Map()
  for (const entry of answers) {
    if (!entry || typeof entry.questionId !== 'string' || typeof entry.selectedOptionId !== 'string') continue
    const question = questionById.get(entry.questionId)
    if (!question) continue
    if (!question.options.some((o) => o.id === entry.selectedOptionId)) continue
    if (!selectedByQuestionId.has(question.id)) selectedByQuestionId.set(question.id, entry.selectedOptionId)
  }
  if (selectedByQuestionId.size === 0) {
    return res.status(400).json({ error: "answers must reference this module's questions and options" })
  }

  const { score, total, percent, passed, breakdown, answerRows } = gradeQuestions(
    module.questions,
    selectedByQuestionId
  )

  // Submission + (on pass) StaffModuleCompletion in one transaction
  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.submission.create({
      data: {
        moduleId: module.id,
        staffMemberId: req.user.id,
        takerName: req.user.name,
        takerEmail: req.user.email,
        score,
        total,
        timeTakenSeconds: timeTakenSeconds ?? null,
        answers: { create: answerRows },
      },
    })

    if (passed) {
      await tx.staffModuleCompletion.upsert({
        where: { staffId_moduleId: { staffId: req.user.id, moduleId: module.id } },
        create: {
          staffId: req.user.id,
          moduleId: module.id,
          submissionId: created.id,
          score,
          total,
          percent,
          passed: true,
        },
        update: {
          submissionId: created.id,
          score,
          total,
          percent,
          passed: true,
          completedAt: new Date(),
        },
      })
    }

    return created
  })

  res.status(201).json({
    submissionId: submission.id,
    score,
    total,
    percent,
    passed,
    completedAt: submission.submittedAt,
    breakdown,
  })
})

// GET /api/staff/me/modules/:moduleId/results - past attempts for the caller.
selfRouter.get('/me/modules/:moduleId/results', async (req, res) => {
  const { moduleId } = req.params

  const assignment = await prisma.staffModuleAssignment.findUnique({
    where: { staffId_moduleId: { staffId: req.user.id, moduleId } },
  })
  if (!assignment) return res.status(404).json({ error: 'Module not assigned to you' })

  const submissions = await prisma.submission.findMany({
    where: { moduleId, staffMemberId: req.user.id },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      score: true,
      total: true,
      submittedAt: true,
      answers: { select: { questionId: true, selectedOptionId: true, isCorrect: true } },
    },
  })

  const toAttempt = (s) => {
    const percent = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0
    return {
      id: s.id,
      score: s.score,
      total: s.total,
      percent,
      passed: percent >= PASS_PERCENT,
      submittedAt: s.submittedAt,
    }
  }
  const attempts = submissions.map(toAttempt)

  let latest = null
  if (submissions.length > 0) {
    const newest = submissions[0]
    const questions = await prisma.question.findMany({
      where: { moduleId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, text: true, options: { select: { id: true, isCorrect: true } } },
    })
    latest = {
      ...toAttempt(newest),
      breakdown: breakdownFromStored(questions, newest.answers),
    }
  }

  res.json({ attempts, latest })
})

export { adminRouter, selfRouter }