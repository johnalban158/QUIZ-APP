import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import moduleRoutes from './routes/modules.js'
import submissionRoutes from './routes/submissions.js'
import quizRoutes from './routes/quiz.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/admin/modules', moduleRoutes)
app.use('/api/admin/submissions', submissionRoutes)
app.use('/api/quiz', quizRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Something went wrong' })
})

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})