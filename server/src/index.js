import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import moduleRoutes from './routes/modules.js'
import submissionRoutes from './routes/submissions.js'
import quizRoutes from './routes/quiz.js'
import statsRoutes from './routes/stats.js'
import { adminRouter as staffAdminRouter, selfRouter as staffSelfRouter } from './routes/staff.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/admin/modules', moduleRoutes)
app.use('/api/admin/submissions', submissionRoutes)
app.use('/api/admin/stats', statsRoutes)
app.use('/api/admin/staff', staffAdminRouter)
app.use('/api/staff', staffSelfRouter)
app.use('/api/quiz', quizRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  // Handle multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10MB)' })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err.message && err.message.includes('Only PDF, DOCX, and TXT')) {
    return res.status(400).json({ error: err.message })
  }
  res.status(500).json({ error: err.message || 'Something went wrong' })
})

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})