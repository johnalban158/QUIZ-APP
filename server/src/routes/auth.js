import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { signToken, requireAdmin, STAFF_ROLES } from '../middleware/auth.js'

const router = Router()

const ADMIN_ROLES = ['ADMIN']

function authPayload(user) {
  return {
    token: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      specialty: user.specialty,
    },
  }
}

// Shared credential check. `allowedRoles` is the single source of truth for
// which roles may log in through a given endpoint.
function makeLogin(allowedRoles) {
  return async (req, res) => {
    const { email, password } = req.body ?? {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account frozen. Contact an administrator.' })
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    res.json(authPayload(user))
  }
}

// POST /api/auth/login - ADMIN only (admin login page).
router.post('/login', makeLogin(ADMIN_ROLES))

// POST /api/auth/admin/login - alias kept for older clients; also ADMIN only.
router.post('/admin/login', makeLogin(ADMIN_ROLES))

// POST /api/auth/staff/login - NURSE or CAREGIVER only (staff login page).
router.post('/staff/login', makeLogin(STAFF_ROLES))

// POST /api/auth/staff/register - admin-only staff account creation.
// `role` is required and must be NURSE or CAREGIVER; `specialty` stays required.
router.post('/staff/register', requireAdmin, async (req, res) => {
  const { name, email, password, specialty, role } = req.body ?? {}
  if (!name || !email || !password || !specialty || !role) {
    return res.status(400).json({ error: 'All fields required: name, email, password, specialty, role' })
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: "role must be 'NURSE' or 'CAREGIVER'" })
  }
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, specialty },
  })
  res.status(201).json(authPayload(user))
})

// NOTE: the old public `POST /api/auth/register` (which created ADMIN accounts
// without authentication) was removed on purpose.

export default router
