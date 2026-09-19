import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.use(requireAdmin)

router.get('/', async (req, res) => {
  const { moduleId, sort, order } = req.query
  const where = moduleId ? { moduleId: String(moduleId) } : {}

  const sortField = sort === 'score' ? 'score' : 'submittedAt'
  const sortOrder = order === 'asc' ? 'asc' : 'desc'

  const submissions = await prisma.submission.findMany({
    where,
    include: { module: { select: { id: true, title: true } }, staffMember: { select: { id: true, name: true } } },
    orderBy: { [sortField]: sortOrder },
  })
  res.json(submissions)
})

router.get('/:id', async (req, res) => {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: {
      module: { select: { id: true, title: true } },
      staffMember: { select: { id: true, name: true } },
      answers: {
        include: {
          question: {
            select: {
              id: true,
              text: true,
              options: { select: { id: true, text: true, isCorrect: true } },
            },
          },
          selectedOption: { select: { id: true, text: true } },
        },
      },
    },
  })
  if (!submission) return res.status(404).json({ error: 'Submission not found' })
  res.json(submission)
})

export default router