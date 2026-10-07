import { Router } from 'express'
import cloudinary from '../cloudinary.js'
import { cloudinaryConfigured } from '../cloudinary.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAdmin)

// Cloudinary's free plan does not expose quota numbers, so we count the
// assets we actually own instead of trusting storage.used / storage.limit.
async function countOwned() {
  const FOLDER = 'quizapp-question-media'
  let objects = 0
  let bytes = 0
  let nextCursor

  do {
    const page = await cloudinary.api.resources({
      resource_type: 'video',
      type: 'upload',
      prefix: FOLDER,
      max_results: 100,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    })
    objects += page.resources.length
    bytes += page.resources.reduce((a, r) => a + (r.bytes || 0), 0)
    nextCursor = page.next_cursor
  } while (nextCursor)

  return { objects, bytes }
}

// GET /api/admin/storage - media storage usage for the admin meter
router.get('/', async (_req, res) => {
  if (!cloudinaryConfigured()) {
    return res.json({
      configured: false,
      provider: 'cloudinary',
      objects: 0,
      bytesUsed: 0,
      quotaBytes: 25 * 1024 * 1024 * 1024, // documented free-tier allowance
    })
  }

  try {
    const { objects, bytes } = await countOwned()
    let plan = 'Free'
    try {
      const usage = await cloudinary.api.usage()
      if (usage?.plan) plan = usage.plan
    } catch {
      /* usage() can 404 on some accounts - the plan label is cosmetic */
    }

    const quotaBytes = 25 * 1024 * 1024 * 1024
    res.json({
      configured: true,
      provider: 'cloudinary',
      plan,
      objects,
      bytesUsed: bytes,
      quotaBytes,
      usedPercent: Math.min(100, Math.round((bytes / quotaBytes) * 10000) / 100),
    })
  } catch (e) {
    console.error('Storage usage failed:', e.message)
    res.status(500).json({ error: 'Could not read storage usage' })
  }
})

export default router
