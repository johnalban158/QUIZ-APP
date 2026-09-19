import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
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