import { useEffect, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle,
  FileQuestion,
  LayoutList,
  Lock,
  RotateCcw,
  Send,
  Timer,
  Trophy,
  Video,
  WifiOff,
  XCircle,
} from 'lucide-react'
import ReadAloud from '../../components/ReadAloud'
import { api } from '../../api'
import { extractYouTubeId } from '../../lib'

const PASS_MARK = 70

export default function StaffQuiz() {
  const { id } = useParams()

  const [mod, setMod] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [assignmentMissing, setAssignmentMissing] = useState(false)

  const [phase, setPhase] = useState('intro') // intro | questions | result
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [startedAt, setStartedAt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    (async () => {
      setLoadError('')
      setAssignmentMissing(false)
      try {
        setMod(await api(`/staff/me/modules/${id}`))
      } catch (err) {
        if (err.status === 403 || err.status === 404) setAssignmentMissing(true)
        setLoadError(err.message || 'Failed to load this quiz')
      }
    })()
  }, [id])

  const questions = mod?.questions ?? []
  const total = questions.length
  const answeredCount = Object.keys(answers).length
  const inProgress = phase === 'questions' && answeredCount > 0
  const blocker = useBlocker(inProgress)

  // The training-video gate. The API is the source of truth, but the intro
  // blocks up front so staff get a friendly screen instead of a failed submit.
  const videoId = mod?.youtubeVideoId || extractYouTubeId(mod?.youtubeUrl)
  const videoLocked = mod?.videoRequired === true && mod?.videoWatched !== true

  useEffect(() => {
    if (!inProgress) return undefined
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [inProgress])

  const optionTextById = new Map()
  const questionTextById = new Map()
  questions.forEach((qq) => {
    questionTextById.set(qq.id, qq.text)
    ;(qq.options ?? []).forEach((o) => optionTextById.set(o.id, o.text))
  })

  const start = () => {
    if (videoLocked) return
    setStartedAt((prev) => prev ?? Date.now())
    setSubmitError('')
    setPhase('questions')
    setCurrent(0)
  }

  const retake = () => {
    setAnswers({})
    setResult(null)
    setStartedAt(null)
    setSubmitError('')
    setCurrent(0)
    setPhase('intro')
  }

  const selectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const submitQuiz = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        answers: questions.map((qq) => ({
          questionId: qq.id,
          selectedOptionId: answers[qq.id] ?? null,
        })),
        timeTakenSeconds: startedAt
          ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
          : undefined,
      }
      const data = await api(`/staff/me/modules/${id}/submit`, {
        method: 'POST',
        body: payload,
      })
      setResult(data)
      setPhase('result')
    } catch (err) {
      // A 400 can be the video gate (VIDEO_REQUIRED) rather than a bad answer
      // payload. Re-read the module so the user gets the unlock screen with a
      // link back to the video instead of a raw error.
      if (err?.status === 400) {
        let detail = null
        try {
          detail = await api(`/staff/me/modules/${id}`)
        } catch {
          // Keep the original error if the re-read fails.
        }
        if (detail && detail.videoRequired === true && detail.videoWatched !== true) {
          setMod(detail)
          setAnswers({})
          setConfirmSubmit(false)
          setSubmitError('')
          setPhase('intro')
          return
        }
      }
      setSubmitError(err.message || 'Could not submit your quiz — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Load failure -----------------------------------------------------
  if (loadError && !mod) {
    return (
      <>
        <Link to="/staff/dashboard" className="back-link">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div className="card empty" role="alert">
          <span className="empty-icon"><WifiOff size={26} /></span>
          <h3>{assignmentMissing ? 'This quiz is not available to you' : 'Quiz unavailable'}</h3>
          <p>
            {assignmentMissing
              ? 'This module is not assigned to your account. Ask your administrator to assign it, then come back.'
              : loadError}
          </p>
          <div className="result-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/staff/dashboard">
              <LayoutList size={18} /> My dashboard
            </Link>
            <Link className="btn btn-ghost" to="/staff/plan">
              <BookOpen size={18} /> My training plan
            </Link>
          </div>
        </div>
      </>
    )
  }

  // ---- Loading ----------------------------------------------------------
  if (!mod) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading quiz…
      </div>
    )
  }

  // ---- Video gate -------------------------------------------------------
  if (videoLocked) {
    return (
      <div className="quiz-shell">
        <Link to={`/staff/modules/${id}`} className="back-link">
          <ArrowLeft size={16} /> Back to module
        </Link>

        <div className="card empty" role="alert">
          <span className="empty-icon">
            {videoId ? <Video size={26} /> : <Lock size={26} />}
          </span>
          <h3>Watch the training video first</h3>
          <p>
            {videoId
              ? 'This module has a required training video. Watch it on the module page and mark it as watched, then you can start the quiz.'
              : 'This module requires a training video that hasn’t been added yet. Ask your administrator to add it, then come back.'}
          </p>
          <div className="result-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to={`/staff/modules/${id}`}>
              <Video size={18} /> Go to the training video
            </Link>
            <Link className="btn btn-ghost" to="/staff/dashboard">
              <LayoutList size={18} /> My dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ---- Intro ------------------------------------------------------------
  if (phase === 'intro') {
    const introReadText = [mod.title, mod.description, mod.content].filter(Boolean).join('. ')
    return (
      <div className="quiz-shell">
        <Link to={`/staff/modules/${id}`} className="back-link">
          <ArrowLeft size={16} /> Back to module
        </Link>

        <div className="card quiz-intro">
          <span className="quiz-intro-icon"><FileQuestion size={30} /></span>
          <p className="eyebrow">Training module</p>
          <h1 className="quiz-intro-title">{mod.title}</h1>
          {mod.description && <p className="quiz-intro-desc">{mod.description}</p>}
          <div className="quiz-intro-meta">
            <span className="badge badge-soft"><FileQuestion size={14} /> {total} questions</span>
            <span className="badge badge-draft"><Timer size={14} /> ~{Math.max(1, Math.round(total * 0.5))} min</span>
            {videoId && !mod.videoRequired && (
              <span className="badge badge-state"><Video size={14} /> Optional training video</span>
            )}
            {mod.videoRequired === true && (
              <span className="badge badge-ok"><CheckCircle size={14} /> Training video watched</span>
            )}
          </div>

          {mod.content ? (
            <div className="quiz-reading">
              <div className="quiz-reading-head">
                <span><BookOpen size={18} /> Read before you start</span>
                <ReadAloud text={introReadText} />
              </div>
              <div className="reading-body">{mod.content}</div>
            </div>
          ) : (
            <ReadAloud text={introReadText} className="read-aloud-start" />
          )}

          <p className="form-hint" style={{ textAlign: 'center' }}>
            Your result is recorded on your training plan — you need {PASS_MARK}% to pass.
          </p>

          <button className="btn btn-primary btn-lg btn-block" onClick={start} disabled={total === 0}>
            <span>Start quiz</span> <ArrowRight size={20} />
          </button>
          {total === 0 && (
            <p className="form-hint" style={{ textAlign: 'center' }}>
              This module doesn&apos;t have any questions yet.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ---- Result -----------------------------------------------------------
  if (phase === 'result' && result) {
    const pct = Math.round(result.percent ?? (result.total ? (result.score / result.total) * 100 : 0))
    const passed = result.passed === true || pct >= PASS_MARK
    const breakdown = Array.isArray(result.breakdown) ? result.breakdown : []
    const VerdictIcon = passed ? Trophy : Award

    return (
      <div className="quiz-shell">
        <Link to={`/staff/modules/${id}`} className="back-link">
          <ArrowLeft size={16} /> Back to module
        </Link>

        <div className="card result-card">
          <div
            className="ring"
            style={{
              '--ring-deg': `${Math.round((pct / 100) * 360)}deg`,
              background: `conic-gradient(${passed ? 'var(--ok)' : 'var(--bad)'} var(--ring-deg), var(--surface-2) 0deg)`,
            }}
          >
            <div className="ring-inner">
              <div className="score-num">{result.score}/{result.total}</div>
              <div className="score-pct">{pct}% correct</div>
            </div>
          </div>

          <h2
            className={`result-verdict ${passed ? 'result-pass' : 'result-fail'}`}
            style={{ color: passed ? 'var(--ok)' : 'var(--bad)' }}
            aria-live="polite"
          >
            <VerdictIcon size={26} style={{ verticalAlign: -4, marginRight: 8 }} />
            {passed ? 'You passed!' : 'Keep practicing'}
          </h2>
          <p className="result-summary">
            You answered {result.score} out of {result.total} questions correctly.
          </p>
          <p className="result-msg">
            {passed
              ? 'Nice work — this completion is recorded on your training plan.'
              : `Don't worry — review the correct answers below and try again when you're ready (you need ${PASS_MARK}%).`}
          </p>

          <div className="result-credit">
            {passed ? (
              <span className="badge badge-ok">
                <CheckCircle size={15} /> Completion recorded
              </span>
            ) : (
              <span className="badge badge-bad">
                <XCircle size={15} /> No credit recorded — a passing score is needed
              </span>
            )}
          </div>

          <div className="result-actions">
            <Link to="/staff/dashboard" className="btn btn-primary">
              <LayoutList size={18} /> Back to dashboard
            </Link>
            <Link to={`/staff/modules/${id}`} className="btn btn-ghost">
              <BookOpen size={18} /> Back to module
            </Link>
            <button className="btn btn-orange" onClick={retake}>
              <RotateCcw size={18} /> Try again
            </button>
          </div>
        </div>

        {breakdown.length > 0 && (
          <div className="breakdown">
            <h2 className="breakdown-title">Answer breakdown</h2>
            {breakdown.map((b, i) => {
              const questionText = b.text || questionTextById.get(b.questionId) || 'Question'
              const selectedText = b.selectedText
                ?? (b.selectedOptionId ? optionTextById.get(b.selectedOptionId) : null)
                ?? 'No answer'
              const correctText = b.correctText
                ?? (b.correctOptionId ? optionTextById.get(b.correctOptionId) : null)
              return (
                <div key={b.questionId ?? i} className="card br-card">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span className={`br-num ${b.isCorrect ? 'ok' : 'bad'}`}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="br-text">{questionText}</div>
                      <div className="br-sub">
                        Your answer: <strong>{selectedText}</strong>
                        {!b.isCorrect && correctText && (
                          <span className="correct-line"> · Correct: {correctText}</span>
                        )}
                      </div>
                    </div>
                    <div className={`br-icon ${b.isCorrect ? 'ok' : 'bad'}`}>
                      {b.isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ---- One question at a time -------------------------------------------
  if (total === 0) {
    return (
      <div className="quiz-shell">
        <Link to={`/staff/modules/${id}`} className="back-link">
          <ArrowLeft size={16} /> Back to module
        </Link>
        <div className="card empty">
          <span className="empty-icon"><FileQuestion size={26} /></span>
          <h3>No questions yet</h3>
          <p>This module doesn&apos;t have any questions yet.</p>
          <Link className="btn btn-primary" to="/staff/dashboard">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const progressPct = Math.round(((current + 1) / total) * 100)
  const questionReadText = `Question ${current + 1}. ${q.text} The choices are ${(q.options ?? [])
    .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.text}`)
    .join('. ')}.`

  return (
    <div className="quiz-shell">
      <Link to={`/staff/modules/${id}`} className="back-link">
        <ArrowLeft size={16} /> Leave quiz
      </Link>

      <div className="quiz-progress-head">
        <span className="quiz-progress-label" role="status">Question {current + 1} of {total}</span>
        <span>{progressPct}% complete</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="card quiz-qcard">
        <div className="quiz-question-row">
          <h2 className="quiz-question" aria-live="polite">
            <span className="quiz-qnum" aria-hidden="true">{current + 1}</span>
            {q.text}
          </h2>
          <ReadAloud text={questionReadText} />
        </div>
        {q.mediaType === 'AUDIO' && (
          <audio src={q.mediaUrl} controls preload="metadata" style={{ width: '100%', height: 44, marginTop: 8 }} />
        )}
        {q.mediaType === 'VIDEO' && (
          <video src={q.mediaUrl} controls preload="metadata" style={{ width: '100%', maxHeight: 320, marginTop: 8, borderRadius: 12 }} />
        )}
        <div className="quiz-opts" role="group" aria-label="Choices">
          {(q.options ?? []).map((opt, i) => {
            const selected = answers[q.id] === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className={`quiz-opt${selected ? ' selected' : ''}`}
                onClick={() => selectOption(q.id, opt.id)}
                aria-pressed={selected}
              >
                <span className="letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <span className="opt-text">{opt.text}</span>
                <span className="opt-check" aria-hidden="true">{selected && <Check size={16} strokeWidth={3} />}</span>
              </button>
            )
          })}
        </div>
      </div>

      {submitError && <div className="form-error" role="alert">{submitError}</div>}

      <div className="dot-nav" aria-label="Questions">
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
          <ArrowLeft size={20} /> Previous
        </button>
        {current === total - 1 ? (
          <button
            className="btn btn-orange"
            onClick={() => setConfirmSubmit(true)}
            disabled={submitting || answeredCount < total}
          >
            {submitting ? 'Submitting…' : <><span>Submit</span> <Send size={20} /></>}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => setCurrent((c) => c + 1)}
            disabled={!answers[q.id]}
          >
            <span>Next</span> <ArrowRight size={20} />
          </button>
        )}
      </div>

      {confirmSubmit && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="submit-title">
          <div className="card modal leave-dialog">
            <div className="modal-head">
              <h3 id="submit-title" className="modal-title">Ready to submit?</h3>
            </div>
            <p className="leave-text">
              You&apos;ve answered all {total} questions. Once you submit, your score is saved to your
              training record.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost btn-lg" onClick={() => setConfirmSubmit(false)}>
                Review answers
              </button>
              <button
                className="btn btn-orange btn-lg"
                disabled={submitting}
                onClick={() => {
                  setConfirmSubmit(false)
                  submitQuiz()
                }}
              >
                <Send size={20} /> {submitting ? 'Submitting…' : 'Submit my quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {blocker.state === 'blocked' && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="card modal leave-dialog">
            <div className="modal-head">
              <h3 id="leave-title" className="modal-title">Leaving your quiz?</h3>
            </div>
            <p className="leave-text">
              You&apos;ve answered {answeredCount} of {total} questions. If you leave now, your
              answers will be lost.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost btn-lg" onClick={() => blocker.reset()}>
                Keep going
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => blocker.proceed()}
              >
                Leave quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
