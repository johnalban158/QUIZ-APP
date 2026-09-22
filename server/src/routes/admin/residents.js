import { Router } from 'express'
import { prisma } from '../../prisma.js'

const router = Router()

const residentSelect = {
  id: true,
  name: true,
  email: true,
  notes: true,
  preferredStaffId: true,
  preferredStaff: { select: { id: true, name: true, specialty: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { submissions: true } },
}

function normalizeEmailInput(raw) {
  if (raw === undefined) return undefined
  if (raw === null) return null
  const s = String(raw).trim()
  return s === '' ? null : s
}

async function validateStaffId(staffId) {
  const staff = await prisma.user.findUnique({ where: { id: staffId } })
  if (!staff || staff.role !== 'STAFF') return false
  return true
}

// GET /api/admin/residents - list all residents
router.get('/', async (req, res) => {
  const residents = await prisma.seniorProfile.findMany({
    select: residentSelect,
    orderBy: { name: 'asc' },
  })
  res.json({ residents })
})

// POST /api/admin/residents - create resident
router.post('/', async (req, res) => {
  const { name, email, notes, preferredStaffId } = req.body ?? {}

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }

  // Validate preferred staff
  let staffId = undefined
  if (preferredStaffId !== undefined && preferredStaffId !== null && preferredStaffId !== '') {
    const ok = await validateStaffId(preferredStaffId)
    if (!ok) return res.status(400).json({ error: 'Invalid preferredStaffId: staff not found' })
    staffId = preferredStaffId
  }

  // Validate email uniqueness
  const normalizedEmail = normalizeEmailInput(email)
  if (normalizedEmail) {
    const exists = await prisma.seniorProfile.findUnique({ where: { email: normalizedEmail } })
    if (exists) return res.status(409).json({ error: 'Email already in use' })
  }

  try {
    const resident = await prisma.seniorProfile.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail === undefined ? undefined : normalizedEmail,
        notes: notes === undefined ? undefined : (notes === null ? null : String(notes)),
        preferredStaffId: staffId ?? undefined,
      },
      select: residentSelect,
    })
    return res.status(201).json({ resident })
  } catch (e) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Email already in use' })
    throw e
  }
})

// PATCH /api/admin/residents/:id - update resident
router.patch('/:id', async (req, res) => {
  const { name, email, notes, preferredStaffId } = req.body ?? {}

  const hasAny = name !== undefined || email !== undefined || notes !== undefined || preferredStaffId !== undefined
  if (!hasAny) {
    return res.status(400).json({ error: 'At least one field is required: name, email, notes, preferredStaffId' })
  }

  const existing = await prisma.seniorProfile.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Resident not found' })

  const data = {}

  if (name !== undefined) {
    if (typeof name === 'string' && !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' })
    }
    if (name === null) {
      return res.status(400).json({ error: 'Name cannot be empty' })
    }
    data.name = String(name).trim()
  }

  if (email !== undefined) {
    const normalizedEmail = normalizeEmailInput(email)
    if (normalizedEmail) {
      const clash = await prisma.seniorProfile.findUnique({ where: { email: normalizedEmail } })
      if (clash && clash.id !== existing.id) {
        return res.status(409).json({ error: 'Email already in use' })
      }
    }
    data.email = normalizedEmail
  }

  if (notes !== undefined) {
    data.notes = notes === null ? null : String(notes)
  }

  if (preferredStaffId !== undefined) {
    if (preferredStaffId === null || preferredStaffId === '') {
      data.preferredStaffId = null
    } else {
      const ok = await validateStaffId(preferredStaffId)
      if (!ok) return res.status(400).json({ error: 'Invalid preferredStaffId: staff not found' })
      data.preferredStaffId = preferredStaffId
    }
  }

  try {
    const resident = await prisma.seniorProfile.update({
      where: { id: existing.id },
      data,
      select: residentSelect,
    })
    return res.json({ resident })
  } catch (e) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Email already in use' })
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Resident not found' })
    throw e
  }
})

// DELETE /api/admin/residents/:id - delete resident
router.delete('/:id', async (req, res) => {
  const existing = await prisma.seniorProfile.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Resident not found' })
  await prisma.seniorProfile.delete({ where: { id: existing.id } })
  res.json({ ok: true })
})

export default router
