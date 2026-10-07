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
 * - uniqueTakers: distinct STAFF MEMBERS with at least one submission.
 *   (The old metric grouped on `takerEmail`, which is empty for staff
 *   submissions, so it was always 0/1. It now counts distinct staffMemberId.)
 * - activeStaff: distinct staff members with a passing StaffModuleCompletion.
 * - averageScorePercent: average score percentage across all submissions
 * - recentSubmissions: submissions in the last 7 days
 */
router.get('/', async (req, res) => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    publishedModules,
    totalSubmissions,
    staffWithSubmissions,
    completionsByStaff,
    avgScoreResult,
    recentSubmissions,
  ] = await Promise.all([
    prisma.module.count({ where: { status: 'PUBLISHED' } }),
    prisma.submission.count(),
    // Distinct staff members who have submitted at least one attempt.
    prisma.submission.findMany({
      where: { staffMemberId: { not: null } },
      select: { staffMemberId: true },
      distinct: ['staffMemberId'],
    }),
    // Distinct staff members with at least one passed module completion.
    prisma.staffModuleCompletion.groupBy({
      by: ['staffId'],
      where: { passed: true },
    }),
    prisma.submission.aggregate({
      _avg: { score: true, total: true },
    }),
    prisma.submission.count({
      where: { submittedAt: { gte: sevenDaysAgo } },
    }),
  ])

  const uniqueTakers = staffWithSubmissions.length
  const activeStaff = completionsByStaff.length
  const avgScore = avgScoreResult._avg.score ?? 0
  const avgTotal = avgScoreResult._avg.total ?? 1
  const averageScorePercent = avgTotal > 0 ? Math.round((avgScore / avgTotal) * 100) : 0

  res.json({
    publishedModules,
    totalSubmissions,
    uniqueTakers,
    activeStaff,
    averageScorePercent,
    recentSubmissions,
  })
})

export default router
