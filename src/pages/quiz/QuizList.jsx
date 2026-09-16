import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileQuestion, Inbox } from 'lucide-react'
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
      <Brand back="/" backLabel="Back to home" />
      <div className="main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Quizzes</p>
            <h1 className="page-title">Available quizzes</h1>
            <p className="page-sub">Pick a published module to get started. No account needed.</p>
          </div>
          {quizzes && quizzes.length > 0 && (
            <span className="chip"><FileQuestion size={14} /> {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'}</span>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        {quizzes === null ? (
          <div className="loading">
            <span className="spinner" />
            Loading quizzes…
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card empty">
            <span className="empty-icon"><Inbox size={20} /></span>
            <h3>No quizzes published yet</h3>
            <p>The admin hasn't published any modules.</p>
          </div>
        ) : (
          <div className="quiz-grid">
            {quizzes.map((q) => {
              const count = q._count?.questions ?? 0
              return (
                <button key={q.id} type="button" className="quiz-card" onClick={() => navigate(`/quiz/${q.id}`)}>
                  <span className="quiz-card-top">
                    <span className="quiz-card-icon"><FileQuestion size={20} /></span>
                    <span className="badge badge-soft">{count} question{count === 1 ? '' : 's'}</span>
                  </span>
                  <span className="quiz-card-title">{q.title}</span>
                  {q.description && <span className="quiz-card-desc">{q.description}</span>}
                  <span className="quiz-card-foot">
                    Start quiz
                    <span className="quiz-card-arrow"><ArrowRight size={14} /></span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}