import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAdmin, requireStaff } from '../middleware/auth.js'

const adminRouter = Router()
const selfRouter = Router()

// Admin routes - all requireAdmin
adminRouter.use(requireAdmin)

// Self routes - all requireStaff
selfRouter.use(requireStaff)

/**
 * Helper: check if a module is eligible for a staff member
 */
async function isModuleEligible(moduleId, specialty, state) {
  const eligible = await prisma.moduleEligibility.findFirst({
    where: {
      moduleId,
      specialty,
      OR: [{ state }, { state: '' }],
    },
  })
  return !!eligible
}

/**
 * Helper: build StaffAssignmentDetail for a staff member
 */
async function buildAssignmentsForStaff(staffId, specialty, state) {
  const assignments = await prisma.staffModuleAssignment.findMany({
    where: { staffId },
    include: {
      module: { select: { id: true, title: true, status: true, eligibility: { select: { specialty: true, state: true } } } },
      assignedBy: { select: { name: true } },
      completion: { select: { submissionId: true, score: true, total: true, percent: true, passed: true, completedAt: true } },
    },
    orderBy: { assignedAt: 'desc' },
  })

  return Promise.all(assignments.map(async (a) => {
    const isEligible = await isModuleEligible(a.moduleId, specialty, state)
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

  // Eligible modules count per specialty+state group
  const groups = new Map()
  staffList.forEach(s => {
    const key = `${s.specialty}|${s.state}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s.id)
  })

  const eligibleCounts = new Map()
  for (const [key] of groups) {
    const [specialty, state] = key.split('|')
    const count = await prisma.module.count({
      where: {
        status: 'PUBLISHED',
        eligibility: { some: { specialty, OR: [{ state }, { state: '' }] } },
      },
    })
    eligibleCounts.set(key, count)
  }

  const assignMap = new Map(assignments.map(a => [a.staffId, a._count.staffId]))
  const completeMap = new Map(completions.map(c => [c.staffId, c._count.staffId]))

  return staffList.map(s => {
    const key = `${s.specialty}|${s.state}`
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
  const state = req.query.state ? String(req.query.state) : ''

  const where = { role: 'STAFF' }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (specialty) where.specialty = specialty
  if (state) where.state = state

  const [staff, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, specialty: true, state: true },
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
    where: { id: req.params.id, role: 'STAFF' },
    select: { id: true, name: true, email: true, specialty: true, state: true },
  })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const assignments = await buildAssignmentsForStaff(staff.id, staff.specialty, staff.state)
  const assignedModules = assignments.length
  const completedModules = assignments.filter(a => a.completion?.passed).length

  // Compute totalEligibleModules for this staff (including wildcard "all states" rules)
  const totalEligibleModules = await prisma.module.count({
    where: {
      status: 'PUBLISHED',
      eligibility: {
        some: { specialty: staff.specialty, OR: [{ state: staff.state }, { state: '' }] },
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

  const staff = await prisma.user.findUnique({ where: { id: req.params.id, role: 'STAFF' } })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const module = await prisma.module.findUnique({ where: { id: moduleId } })
  if (!module) return res.status(404).json({ error: 'Module not found' })
  if (module.status !== 'PUBLISHED') return res.status(400).json({ error: 'Module must be PUBLISHED to assign' })

  const eligible = await isModuleEligible(moduleId, staff.specialty, staff.state)
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

  const staff = await prisma.user.findUnique({ where: { id, role: 'STAFF' } })
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
    where: { id: { in: staffIds }, role: 'STAFF' },
    select: { id: true, specialty: true, state: true },
  })
  if (staff.length !== staffIds.length) {
    return res.status(400).json({ error: 'One or more staff not found' })
  }

  const eligibleStaffIds = new Set()
  const skipped = []

  for (const s of staff) {
    const eligible = await prisma.moduleEligibility.findFirst({
      where: { moduleId, specialty: s.specialty, OR: [{ state: s.state }, { state: '' }] },
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

// ===== SELF-SERVICE ROUTES =====

// GET /api/staff/me - Own training plan
selfRouter.get('/me', async (req, res) => {
  const staff = await prisma.user.findUnique({
    where: { id: req.user.id, role: 'STAFF' },
    select: { id: true, name: true, email: true, specialty: true, state: true },
  })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const assignments = await buildAssignmentsForStaff(staff.id, staff.specialty, staff.state)
  const assignedModules = assignments.length
  const completedModules = assignments.filter(a => a.completion?.passed).length

  const totalEligibleModules = await prisma.module.count({
    where: {
      status: 'PUBLISHED',
      eligibility: {
        some: { specialty: staff.specialty, OR: [{ state: staff.state }, { state: '' }] },
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

export { adminRouter, selfRouter }