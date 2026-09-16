import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Send, User } from 'lucide-react'
import Brand from '../../components/Brand'

export default function TakeQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const data = await fetch(`/api/quiz/${id}`).then((r) => r.json())
        if (data.error) throw new Error(data.error)
        setQuiz(data)
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [id])

  const selectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const questions = quiz?.questions ?? []
  const q = questions[current]
  const total = questions.length
  const answeredCount = Object.keys(answers).length

  const submitQuiz = async () => {
    setSubmitting(true)
    setError('')
    try {
      const body = {
        takerName: name.trim(),
        takerEmail: email.trim(),
        answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
      }
      const data = await fetch(`/api/quiz/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json())
      if (data.error) throw new Error(data.error)
      navigate(`/quiz/${id}/result`, { state: data })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !quiz) return (
    <>
      <Brand />
      <div className="main"><div className="form-error">{error}</div></div>
    </>
  )

  if (!quiz) return <div className="loading">Loading…</div>

  const LETTERS = ['A', 'B', 'C', 'D']

  // intro screen
  if (!started) {
    return (
      <>
        <Brand right={`${quiz.questions.length} questions`} />
        <div className="quiz-shell">
          <div className="card">
            <h1 className="quiz-intro-title">{quiz.title}</h1>
            {quiz.description && <p className="quiz-intro-desc">{quiz.description}</p>}
            <div className="quiz-intro-meta">
              <span className="badge badge-published">{quiz.questions.length} questions</span>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="field">
              <label><User size={14} /> Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" required />
            </div>
            <div className="field">
              <label>Email (optional)</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alice@example.com" />
            </div>

            <button
              className="btn btn-primary btn-block"
              disabled={!name.trim()}
              onClick={() => setStarted(true)}
            >
              Start quiz
            </button>
          </div>
        </div>
      </>
    )
  }

  // question screen
  return (
    <>
      <Brand right={`${current + 1} / ${total}`} />
      <div className="quiz-shell">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
        <p className="quiz-count">Question {current + 1} of {total}</p>

        <div className="card">
          <h2 className="quiz-question">{q.text}</h2>
          <div className="quiz-opts">
            {q.options.map((opt, i) => (
              <button
                key={opt.id}
                className={`quiz-opt ${answers[q.id] === opt.id ? 'selected' : ''}`}
                onClick={() => selectOption(q.id, opt.id)}
              >
                <span className="letter">{LETTERS[i]}</span>
                {opt.text}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="quiz-nav">
          <button
            className="btn btn-ghost"
            onClick={() => setCurrent((c) => c - 1)}
            disabled={current === 0}
          >
            <ArrowLeft size={16} /> Previous
          </button>

          {current === total - 1 ? (
            <button
              className="btn btn-primary"
              onClick={submitQuiz}
              disabled={submitting || answeredCount < total}
            >
              {submitting ? 'Submitting…' : 'Submit'} <Send size={16} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setCurrent((c) => c + 1)}
              disabled={!answers[q.id]}
            >
              Next <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}