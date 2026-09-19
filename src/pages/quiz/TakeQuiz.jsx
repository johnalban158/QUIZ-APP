import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Check, FileQuestion, Send, Timer, UserRound } from 'lucide-react'
import Brand from '../../components/Brand'
import { useAuth } from '../../context/AuthContext'
import { specialtyLabel } from '../../lib'

export default function TakeQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [quiz, setQuiz] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [staffId, setStaffId] = useState('')
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const startedAtRef = useRef(null)

  const isStaff = user?.role === 'STAFF'

  useEffect(() => {
    (async () => {
      setError('')
      try {
        const [quizData, staffData] = await Promise.all([
          fetch(`/api/quiz/${id}`).then((r) => r.json()),
          fetch('/api/quiz/staff-list').then((r) => r.json()),
        ])
        if (quizData.error) throw new Error(quizData.error)
        setQuiz(quizData)
        setStaffList(Array.isArray(staffData) ? staffData : [])
        if (user?.role === 'STAFF' && user.id) setStaffId(user.id)
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [id, user])

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
  const staffName = staffList.find((s) => s.id === staffId)

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
        staffMemberId: staffId,
        answers: Object.values(answers).map((optionId) => ({ optionId })),
        timeTakenSeconds: startedAtRef.current
          ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
          : undefined,
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
            <p className="eyebrow">Training module</p>
            <h1 className="quiz-intro-title">{quiz.title}</h1>
            {quiz.description && <p className="quiz-intro-desc">{quiz.description}</p>}
            <div className="quiz-intro-meta">
              <span className="badge badge-soft"><FileQuestion size={12} /> {total} questions</span>
              <span className="badge badge-draft"><Timer size={12} /> ~{Math.max(1, Math.round(total * 0.5))} min</span>
            </div>

            {quiz.content && (
              <div className="quiz-reading">
                <div className="quiz-reading-head"><BookOpen size={15} /> Read before you start</div>
                <div className="reading-body">{quiz.content}</div>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}

            <div className="quiz-intro-form">
              <div className="field">
                <label><UserRound size={14} /> Your name</label>
                <input className="input input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" />
              </div>

              {isStaff ? (
                <div className="field">
                  <label><UserRound size={14} /> Training credit</label>
                  <input className="input input-lg" value={user ? user.name : ''} readOnly />
                  <p className="form-hint">Results will be recorded for your own training plan.</p>
                </div>
              ) : (
                <div className="field">
                  <label><UserRound size={14} /> Who is assisting you? <span className="req">*</span></label>
                  <select
                    className="select input-lg"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                  >
                    <option value="">Select staff member…</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {specialtyLabel(s.specialty)}{s.state ? ` · ${s.state}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="form-hint">Your result counts toward this staff member's training plan.</p>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-block"
              disabled={!name.trim() || (isStaff ? false : !staffId)}
              onClick={() => {
                setStarted(true)
                startedAtRef.current = Date.now()
              }}
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
      <Brand back="/quiz" backLabel="Leave quiz" right={`${current + 1} / ${total}${staffName ? ` · ${staffName.name}` : ''}`} />
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