import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import Brand from '../../components/Brand'

export default function QuizList() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      setError('')
      try {
        const data = await fetch('/api/quiz').then((r) => r.json())
        if (data.error) throw new Error(data.error)
        setQuizzes(data)
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [])

  return (
    <>
      <Brand right="Take a quiz" />
      <div className="main">
        <div className="page-heading">
          <h1 className="page-title">Available quizzes</h1>
          <p className="page-sub">Pick a published module to get started.</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        {quizzes === null ? (
          <div className="loading">Loading…</div>
        ) : quizzes.length === 0 ? (
          <div className="card empty">
            <h3>No quizzes published yet</h3>
            <p>The admin hasn't published any modules.</p>
          </div>
        ) : (
          <div className="mod-list">
            {quizzes.map((q) => (
              <button key={q.id} className="mod-item" onClick={() => navigate(`/quiz/${q.id}`)}>
                <div>
                  <div className="mod-item-title">{q.title}</div>
                  {q.description && <div className="mod-item-desc">{q.description}</div>}
                  <div className="mod-item-meta">
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      {q._count?.questions ?? 0} questions
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="muted" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}