import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FileQuestion, Mail, Send, Timer, User } from 'lucide-react'
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

  if (error && !quiz) {
    return (
      <>
        <Brand back="/quiz" backLabel="Back to quizzes" />
        <div className="main">
          <div className="card empty">
            <span className="empty-icon"><FileQuestion size={20} /></span>
            <h3>Quiz unavailable</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/quiz')} style={{ marginTop: 14 }}>
              Browse quizzes
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!quiz) {
    return (
      <>
        <Brand back="/quiz" backLabel="Back to quizzes" />
        <div className="loading">
          <span className="spinner" />
          Loading…
        </div>
      </>
    )
  }

  const questions = quiz.questions ?? []
  const total = questions.length
  const q = questions[current]
  const answeredCount = Object.keys(answers).length
  const progressPct = total ? Math.round(((current + 1) / total) * 100) : 0

  if (total === 0) {
    return (
      <>
        <Brand back="/quiz" backLabel="Back to quizzes" />
        <div className="main">
          <div className="card empty">
            <span className="empty-icon"><FileQuestion size={20} /></span>
            <h3>No questions yet</h3>
            <p>This module doesn't have any questions yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/quiz')} style={{ marginTop: 14 }}>
              Browse quizzes
            </button>
          </div>
        </div>
      </>
    )
  }

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

  // Intro / name entry screen
  if (!started) {
    return (
      <>
        <Brand back="/quiz" backLabel="Back to quizzes" right={`${total} questions`} />
        <div className="quiz-shell">
          <div className="card quiz-intro">
            <span className="quiz-intro-icon"><FileQuestion size={26} /></span>
            <p className="eyebrow">Published quiz</p>
            <h1 className="quiz-intro-title">{quiz.title}</h1>
            {quiz.description && <p className="quiz-intro-desc">{quiz.description}</p>}
            <div className="quiz-intro-meta">
              <span className="badge badge-soft"><FileQuestion size={12} /> {total} questions</span>
              <span className="badge badge-draft"><Timer size={12} /> ~{Math.max(1, Math.round(total * 0.5))} min</span>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="quiz-intro-form">
              <div className="field">
                <label><User size={14} /> Your name</label>
                <input className="input input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" />
              </div>
              <div className="field">
                <label><Mail size={14} /> Email (optional)</label>
                <input className="input input-lg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alice@example.com" />
              </div>
            </div>

            <button
              className="btn btn-primary btn-block"
              disabled={!name.trim()}
              onClick={() => setStarted(true)}
            >
              Start quiz <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </>
    )
  }

  // Question screen
  return (
    <>
      <Brand back="/quiz" backLabel="Leave quiz" right={`${current + 1} / ${total}`} />
      <div className="quiz-shell">
        <div className="quiz-progress-head">
          <span>Question {current + 1} of {total}</span>
          <span>{progressPct}% complete</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="card quiz-qcard">
          <h2 className="quiz-question">
            <span className="quiz-qnum">{current + 1}</span>
            {q.text}
          </h2>
          <div className="quiz-opts">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`quiz-opt${selected ? ' selected' : ''}`}
                  onClick={() => selectOption(q.id, opt.id)}
                >
                  <span className="letter">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text">{opt.text}</span>
                  <span className="opt-check">{selected && <Check size={13} strokeWidth={3} />}</span>
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="dot-nav">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              type="button"
              className={`dot${i === current ? ' current' : ''}${answers[qq.id] ? ' done' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Go to question ${i + 1}`}
              aria-current={i === current ? 'step' : undefined}
              title={`Question ${i + 1}`}
            />
          ))}
        </div>

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
              {submitting ? 'Submitting…' : <><span>Submit</span> <Send size={16} /></>}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setCurrent((c) => c + 1)}
              disabled={!answers[q.id]}
            >
              <span>Next</span> <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}