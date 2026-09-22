import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, FileQuestion, Inbox, WifiOff } from 'lucide-react'
import Brand from '../../components/Brand'
import { api } from '../../api'

export default function QuizList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [quizzes, setQuizzes] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    try {
      setQuizzes(await api('/quiz'))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const retry = () => {
    setQuizzes(null)
    setError('')
    setReloadKey((k) => k + 1)
  }

  return (
    <>
      <Brand back="/" backLabel="Back to home" />
      <div className="main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Quizzes</p>
            <h1 className="page-title">Available quizzes</h1>
            <p className="page-sub">Read the material, then take the quiz. Passing records credit for the staff member assisting you.</p>
          </div>
          {quizzes && quizzes.length > 0 && (
            <span className="chip"><FileQuestion size={16} /> {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'}</span>
          )}
        </div>

        {error ? (
          <div className="card empty" role="alert">
            <span className="empty-icon"><WifiOff size={26} /></span>
            <h3>Can't reach the server</h3>
            <p>
              Please make sure it's running, then try again.
              <br />
              <span className="muted" style={{ fontSize: '0.95rem' }}>{error}</span>
            </p>
            <button className="btn btn-primary" onClick={retry} type="button">
              <ArrowRight size={16} /> Try again
            </button>
          </div>
        ) : quizzes === null ? (
          <div className="loading">
            <span className="spinner" />
            Loading quizzes…
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card empty">
            <span className="empty-icon"><Inbox size={26} /></span>
            <h3>No quizzes published yet</h3>
            <p>The admin hasn't published any modules.</p>
          </div>
        ) : (
          <div className="quiz-grid">
            {quizzes.map((q) => {
              const count = q._count?.questions ?? 0
              return (
                <button key={q.id} type="button" className="quiz-card" onClick={() => navigate(`/quiz/${q.id}${location.search}`)}>
                  <span className="quiz-card-top">
                    <span className="quiz-card-icon"><FileQuestion size={24} /></span>
                    <span className="badge badge-soft">{count} question{count === 1 ? '' : 's'}</span>
                  </span>
                  <span className="quiz-card-title">{q.title}</span>
                  {q.description && <span className="quiz-card-desc">{q.description}</span>}
                  <span className="quiz-card-foot">
                    Start quiz
                    <span className="quiz-card-arrow"><ArrowRight size={16} /></span>
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