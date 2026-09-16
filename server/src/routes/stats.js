import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.use(requireAdmin)

/**
 * GET /api/admin/stats
 * Returns dashboard overview stats:
 * - publishedModules: number of published modules
 * - totalSubmissions: total submissions across all modules
 * - uniqueTakers: unique taker emails
 * - averageScorePercent: average score percentage across all submissions
 * - recentSubmissions: submissions in the last 7 days
 */
router.get('/', async (req, res) => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    publishedModules,
    totalSubmissions,
    uniqueTakers,
    avgScoreResult,
    recentSubmissions,
  ] = await Promise.all([
    prisma.module.count({ where: { status: 'PUBLISHED' } }),
    prisma.submission.count(),
    prisma.submission.groupBy({
      by: ['takerEmail'],
      _count: { takerEmail: true },
    }),
    prisma.submission.aggregate({
      _avg: { score: true, total: true },
    }),
    prisma.submission.count({
      where: { submittedAt: { gte: sevenDaysAgo } },
    }),
  ])

  const uniqueTakersCount = uniqueTakers.length
  const avgScore = avgScoreResult._avg.score ?? 0
  const avgTotal = avgScoreResult._avg.total ?? 1
  const averageScorePercent = avgTotal > 0 ? Math.round((avgScore / avgTotal) * 100) : 0

  res.json({
    publishedModules,
    totalSubmissions,
    uniqueTakers: uniqueTakersCount,
    averageScorePercent,
    recentSubmissions,
  })
})

export default router