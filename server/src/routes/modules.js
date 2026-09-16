import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.use(requireAdmin)

const withQuestions = {
  questions: {
    orderBy: { orderIndex: 'asc' },
    include: { options: { orderBy: { id: 'asc' } } },
  },
  _count: { select: { submissions: true } },
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error('A question needs at least 2 options')
  }
  const correct = options.filter((o) => o.isCorrect).length
  if (correct !== 1) {
    throw new Error('A question needs exactly one correct option')
  }
  return options.map((o) => ({ text: String(o.text ?? '').trim(), isCorrect: !!o.isCorrect }))
}

router.get('/', async (req, res) => {
  const modules = await prisma.module.findMany({
    include: withQuestions,
    orderBy: { createdAt: 'desc' },
  })
  res.json(modules)
})

router.post('/', async (req, res) => {
  const { title, description, status } = req.body ?? {}
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }
  const module = await prisma.module.create({
    data: {
      title: title.trim(),
      description: description ?? '',
      status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      createdById: req.user.id,
    },
    include: withQuestions,
  })
  res.status(201).json(module)
})

router.patch('/:id', async (req, res) => {
  const { title, description, status } = req.body ?? {}
  const data = {}
  if (typeof title === 'string') {
    if (!title.trim()) return res.status(400).json({ error: 'Title cannot be empty' })
    data.title = title.trim()
  }
  if (typeof description === 'string') data.description = description
  if (['DRAFT', 'PUBLISHED'].includes(status)) data.status = status

  const module = await prisma.module.update({
    where: { id: req.params.id },
    data,
    include: withQuestions,
  })
  res.json(module)
})

router.delete('/:id', async (req, res) => {
  await prisma.module.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

router.post('/:id/questions', async (req, res) => {
  const { text, options } = req.body ?? {}
  if (!text || !text.trim()) return res.status(400).json({ error: 'Question text is required' })
  let normalized
  try {
    normalized = normalizeOptions(options)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  const module = await prisma.module.findUnique({ where: { id: req.params.id } })
  if (!module) return res.status(404).json({ error: 'Module not found' })

  const count = await prisma.question.count({ where: { moduleId: module.id } })
  const question = await prisma.question.create({
    data: {
      moduleId: module.id,
      text: text.trim(),
      orderIndex: count,
      options: { create: normalized },
    },
    include: { options: true },
  })
  res.status(201).json(question)
})

router.put('/:id/questions/:qid', async (req, res) => {
  const { text, options } = req.body ?? {}
  if (!text || !text.trim()) return res.status(400).json({ error: 'Question text is required' })
  let normalized
  try {
    normalized = normalizeOptions(options)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, moduleId: req.params.id },
  })
  if (!question) return res.status(404).json({ error: 'Question not found' })

  const updated = await prisma.$transaction([
    prisma.questionOption.deleteMany({ where: { questionId: question.id } }),
    prisma.question.update({
      where: { id: question.id },
      data: { text: text.trim(), options: { create: normalized } },
      include: { options: true },
    }),
  ])
  res.json(updated[1])
})

router.patch('/:id/questions/reorder', async (req, res) => {
  const { order } = req.body ?? {}
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of question ids' })
  const questions = await prisma.question.findMany({ where: { moduleId: req.params.id } })
  const ids = new Set(questions.map((q) => q.id))
  if (order.some((id) => !ids.has(id)) || order.length !== ids.size) {
    return res.status(400).json({ error: 'order must contain every question id exactly once' })
  }
  await prisma.$transaction(
    order.map((id, index) =>
      prisma.question.update({ where: { id }, data: { orderIndex: index } })
    )
  )
  res.json({ ok: true })
})

router.delete('/:id/questions/:qid', async (req, res) => {
  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, moduleId: req.params.id },
  })
  if (!question) return res.status(404).json({ error: 'Question not found' })
  await prisma.question.delete({ where: { id: question.id } })
  const rest = await prisma.question.findMany({
    where: { moduleId: req.params.id },
    orderBy: { orderIndex: 'asc' },
  })
  await prisma.$transaction(
    rest.map((q, index) =>
      prisma.question.update({ where: { id: q.id }, data: { orderIndex: index } })
    )
  )
  res.json({ ok: true })
})

export default router