import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }
  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  // Re-check the account in the DB so a frozen staff member's existing
  // session is invalidated immediately (force logout).
  const account = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { isActive: true },
  })
  if (!account) {
    return res.status(401).json({ error: 'Account no longer exists' })
  }
  if (!account.isActive) {
    return res.status(401).json({ error: 'Account frozen' })
  }
  req.user = payload
  next()
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}

export function requireStaff(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Staff access required' })
    }
    next()
  })
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}