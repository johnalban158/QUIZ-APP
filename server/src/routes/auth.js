import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { signToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty } })
})

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' })
  }
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN' },
  })
  res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty } })
})

// Staff login (public) - validates role === STAFF
router.post('/staff/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.role !== 'STAFF') {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty } })
})

// Admin login (public) - validates role === ADMIN
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty } })
})

// Admin creates staff account
router.post('/staff/register', requireAdmin, async (req, res) => {
  const { name, email, password, specialty } = req.body ?? {}
  if (!name || !email || !password || !specialty) {
    return res.status(400).json({ error: 'All fields required: name, email, password, specialty' })
  }
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'STAFF', specialty },
  })
  res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty } })
})

export default router