import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Award, BookOpen, Play } from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import ReadAloud from '../../components/ReadAloud'
import RoleBadge from '../../components/RoleBadge'
import { formatDate } from '../../lib'

export default function StaffModule() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mod, setMod] = useState(null)
  const [result, setResult] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      setError('')
      try {
        setMod(await api(`/staff/me/modules/${id}`))
      } catch (err) {
        setError(err.message || 'Failed to load module')
      }
    })()
  }, [id])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await api(`/staff/me/modules/${id}/results`)
        if (!alive) return
        setResult(data.latest ?? null)
        setAttempts(Array.isArray(data.attempts) ? data.attempts.length : 0)
      } catch {
        // A missing/failed results lookup must not block the module page.
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  if (error && !mod) {
    return (
      <>
        <Link to="/staff" className="back-link">
          <ArrowLeft size={16} /> Back to training plan
        </Link>
        <div className="form-error">{error}</div>
      </>
    )
  }

  if (!mod) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading module…
      </div>
    )
  }

  const questionCount = Array.isArray(mod.questions) ? mod.questions.length : 0
  const pct = result && result.total ? Math.round(result.percent ?? (result.score / result.total) * 100) : 0

  return (
    <>
      <Link to="/staff" className="back-link">
        <ArrowLeft size={16} /> Back to training plan
      </Link>

      <div className="section-head">
        <span className="section-head-icon"><BookOpen size={18} /></span>
        <div>
          <h1>{mod.title}</h1>
          <RoleBadge role={user?.role} />
          {mod.description && <p className="page-sub">{mod.description}</p>}
        </div>
      </div>

      {mod.content ? (
        <div className="card reading">
          <div className="quiz-reading-head">
            <span><BookOpen size={18} /> Read before you begin</span>
            <ReadAloud text={[mod.title, mod.description, mod.content].filter(Boolean).join('. ')} />
          </div>
          <div className="reading-body">{mod.content}</div>
        </div>
      ) : (
        <div className="card reading">
          <p className="muted">This module has no reading content — you can go straight to the quiz.</p>
        </div>
      )}

      {result && (
        <div className="card reading">
          <div className="quiz-reading-head">
            <span><Award size={18} /> Your latest result</span>
            <span className={`badge ${result.passed ? 'badge-ok' : 'badge-bad'}`}>
              {result.passed ? 'Passed' : 'Failed'} · {pct}%
            </span>
          </div>
          <p className="muted" style={{ fontSize: '0.95rem', margin: 0 }}>
            {result.score} out of {result.total} correct
            {result.submittedAt ? ` · taken ${formatDate(result.submittedAt)}` : ''}
            {attempts > 1 ? ` · ${attempts} attempts` : ''}
          </p>
        </div>
      )}

      <div className="card reading-footer">
        <div>
          <div className="plan-title">{questionCount} question{questionCount === 1 ? '' : 's'}</div>
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            Scoring at least 70% records a completion on your training record.
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate(`/staff/modules/${id}/quiz`)}>
          <Play size={17} /> Begin quiz
        </button>
      </div>
    </>
  )
}
