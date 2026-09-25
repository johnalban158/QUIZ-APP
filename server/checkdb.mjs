import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const user = await prisma.user.findUnique({ where: { email: 'admin@quizapp.com' } })
console.log('user found:', !!user)
if (user) {
  console.log('role:', user.role)
  console.log('has passwordHash:', !!user.passwordHash)
  const ok = await bcrypt.compare('admin123', user.passwordHash)
  console.log('bcrypt compare:', ok)
  try {
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty }, 'change-me-to-a-long-random-string-in-production', { expiresIn: '7d' })
    console.log('token generated:', !!token)
  } catch (e) {
    console.error('jwt error:', e.message)
  }
}
await prisma.$disconnect()
