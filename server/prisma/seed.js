import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizapp.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@quizapp.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })

  const existing = await prisma.module.count()
  if (existing > 0) {
    console.log('Seed skipped: modules already exist.')
    return
  }

  const generalKnowledge = await prisma.module.create({
    data: {
      title: 'General Knowledge',
      description: 'A quick warm-up on everyday facts.',
      status: 'PUBLISHED',
      createdById: admin.id,
      questions: {
        create: [
          {
            orderIndex: 0,
            text: 'What is the capital of France?',
            options: {
              create: [
                { text: 'London', isCorrect: false },
                { text: 'Paris', isCorrect: true },
                { text: 'Berlin', isCorrect: false },
                { text: 'Madrid', isCorrect: false },
              ],
            },
          },
          {
            orderIndex: 1,
            text: 'How many continents are there on Earth?',
            options: {
              create: [
                { text: 'Five', isCorrect: false },
                { text: 'Six', isCorrect: false },
                { text: 'Seven', isCorrect: true },
                { text: 'Eight', isCorrect: false },
              ],
            },
          },
          {
            orderIndex: 2,
            text: 'Which planet is known as the Red Planet?',
            options: {
              create: [
                { text: 'Venus', isCorrect: false },
                { text: 'Jupiter', isCorrect: false },
                { text: 'Saturn', isCorrect: false },
                { text: 'Mars', isCorrect: true },
              ],
            },
          },
        ],
      },
    },
  })

  const scienceBasics = await prisma.module.create({
    data: {
      title: 'Science Basics',
      description: 'Fundamental science questions for beginners.',
      status: 'DRAFT',
      createdById: admin.id,
      questions: {
        create: [
          {
            orderIndex: 0,
            text: 'What is H2O commonly known as?',
            options: {
              create: [
                { text: 'Salt', isCorrect: false },
                { text: 'Water', isCorrect: true },
                { text: 'Oxygen', isCorrect: false },
                { text: 'Hydrogen', isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('Seeded admin login: admin@quizapp.com / admin123')
  console.log('Seeded modules:', generalKnowledge.title, '&', scienceBasics.title)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())