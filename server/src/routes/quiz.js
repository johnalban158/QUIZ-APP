import { Router } from 'express'
import { prisma } from '../prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  const modules = await prisma.module.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(modules)
})

router.get('/:id', async (req, res) => {
  const module = await prisma.module.findFirst({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          text: true,
          orderIndex: true,
          options: {
            select: { id: true, text: true },
            orderBy: { id: 'asc' },
          },
        },
      },
    },
  })
  if (!module) return res.status(404).json({ error: 'Quiz not found' })
  res.json({ id: module.id, title: module.title, description: module.description, questions: module.questions })
})

router.post('/:id/submit', async (req, res) => {
  const { takerName, takerEmail, answers } = req.body ?? {}
  if (!takerName || !takerName.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers must be a non-empty array' })
  }

  const module = await prisma.module.findFirst({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: true },
      },
    },
  })
  if (!module) return res.status(404).json({ error: 'Quiz not found' })

  const byId = new Map(module.questions.flatMap((q) => q.options.map((o) => [o.id, { q, o }])))
  let score = 0
  const breakdown = []

  const answerLines = answers
    .filter((a) => byId.has(a.optionId))
    .map((a) => {
      const { q, o } = byId.get(a.optionId)
      const correct = !!o.isCorrect
      const correctOption = q.options.find((op) => op.isCorrect)
      breakdown.push({
        questionId: q.id,
        questionText: q.text,
        selectedText: o.text,
        isCorrect: correct,
        correctText: correctOption ? correctOption.text : null,
      })
      if (correct) score++
      return {
        questionId: q.id,
        selectedOptionId: o.id,
        isCorrect: correct,
      }
    })

  const total = module.questions.length
  const submission = await prisma.submission.create({
    data: {
      moduleId: module.id,
      takerName: takerName.trim(),
      takerEmail: (takerEmail ?? '').trim(),
      score,
      total,
      answers: { create: answerLines },
    },
  })

  res.status(201).json({
    submissionId: submission.id,
    moduleTitle: module.title,
    takerName: submission.takerName,
    score,
    total,
    percent: total ? Math.round((score / total) * 100) : 0,
    breakdown,
  })
})

export default router