import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate, useBlocker, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Check, FileQuestion, Search, Send, StickyNote, Timer, UserRound, UserRoundPlus, UsersRound, WifiOff, X } from 'lucide-react'
import Brand from '../../components/Brand'
import ReadAloud from '../../components/ReadAloud'
import QuizFloaties from '../../assets/illustrations/QuizFloaties'
import { useAuth } from '../../context/AuthContext'
import { specialtyLabel } from '../../lib'
import { api } from '../../api'

export default function TakeQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const presetResidentId = searchParams.get('resident') || ''
  const presetStaffId = searchParams.get('staff') || ''
  const presetName = searchParams.get('name') || ''
  const [quiz, setQuiz] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [seniors, setSeniors] = useState([])
  const [seniorsStatus, setSeniorsStatus] = useState('loading')
  const [seniorsError, setSeniorsError] = useState('')
  const [seniorSearch, setSeniorSearch] = useState('')
  const [seniorMode, setSeniorMode] = useState('saved')
  const [selectedSenior, setSelectedSenior] = useState(null)
  const [seniorNote, setSeniorNote] = useState('')
  const [seniorsReload, setSeniorsReload] = useState(0)
  const [newSeniorId, setNewSeniorId] = useState(null)
  const [starting, setStarting] = useState(false)
  const [autoStaffId, setAutoStaffId] = useState('')
  const startTimerRef = useRef(null)
  const loadedSeniorsRef = useRef(false)
  const presetAppliedRef = useRef(false)
  const [staffId, setStaffId] = useState('')
  const [started, setStarted] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const isStaff = user?.role === 'STAFF' && !presetResidentId

  const answeredCount = Object.keys(answers).length
  const inProgress = started && answeredCount > 0 && !submitted

  const blocker = useBlocker(inProgress)

  useEffect(() => {
    (async () => {
      setError('')
      try {
        const [quizData, staffData] = await Promise.all([
          api(`/quiz/${id}`),
          api('/quiz/staff-list'),
        ])
        setQuiz(quizData)
        setStaffList(Array.isArray(staffData) ? staffData : [])
        if (user?.role === 'STAFF' && user.id) setStaffId(user.id)
        if (
          presetStaffId &&
          Array.isArray(staffData) &&
          staffData.some((s) => s.id === presetStaffId)
        ) {
          setStaffId(presetStaffId)
        }
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [id, user, presetStaffId])

  useEffect(() => {
    if (isStaff) return undefined
    let alive = true
    const timer = setTimeout(async () => {
      try {
        const query = seniorSearch.trim() ? `?search=${encodeURIComponent(seniorSearch.trim())}` : ''
        const data = await api(`/quiz/seniors${query}`)
        if (!alive) return
        setSeniors(Array.isArray(data) ? data : [])
        loadedSeniorsRef.current = true
        setSeniorsStatus('ok')
        setSeniorsError('')
        if (!presetAppliedRef.current && presetResidentId) {
          presetAppliedRef.current = true
          const match = (Array.isArray(data) ? data : []).find((s) => s.id === presetResidentId)
          if (match) {
            setSeniorMode('saved')
            setSelectedSenior(match)
            setName(match.name)
            const preferred = match.preferredStaffId || presetStaffId
            if (preferred) setStaffId(preferred)
          } else if (presetName) {
            setName(presetName)
          }
        }
      } catch (err) {
        if (!alive) return
        setSeniorsError(err.message)
        if (!loadedSeniorsRef.current) setSeniorsStatus('error')
      }
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [seniorSearch, isStaff, seniorsReload, presetResidentId, presetName, presetStaffId])

  useEffect(() => {
    if (!inProgress) return undefined
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [inProgress])

  useEffect(() => {
    return () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current)
        startTimerRef.current = null
      }
    }
  }, [])

  const selectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const retrySeniors = () => {
    setSeniorsStatus('loading')
    setSeniorsError('')
    setSeniorsReload((k) => k + 1)
  }

  const clearAutoStart = () => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current)
      startTimerRef.current = null
    }
  }

  const pickStaff = (s) => {
    clearAutoStart()
    setAutoStaffId('')
    setStaffId(s.id)
  }

  const pickSenior = (s) => {
    clearAutoStart()
    setSeniorMode('saved')
    setSelectedSenior(s)
    setSeniorNote('')
    setName(s.name)
    const preferred =
      s.preferredStaffId && staffList.some((st) => st.id === s.preferredStaffId)
        ? s.preferredStaffId
        : ''
    if (preferred && (!staffId || staffId === preferred)) {
      setAutoStaffId(preferred)
      setStaffId(preferred)
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null
        setStarted(true)
        setStartedAt((prev) => prev ?? Date.now())
      }, 1500)
    } else {
      setAutoStaffId('')
    }
  }

  const chooseNew = () => {
    clearAutoStart()
    setSeniorMode('new')
    setSelectedSenior(null)
    setAutoStaffId('')
    setName('')
  }

  const resetSenior = () => {
    clearAutoStart()
    setSeniorMode('saved')
    setSelectedSenior(null)
    setAutoStaffId('')
    setSeniorNote('')
    setName('')
  }

  if (error && !quiz) {
    return (
      <>
        <Brand back="/quiz" backLabel="Back to quizzes" />
        <div className="main">
          <div className="card empty">
            <span className="empty-icon"><FileQuestion size={26} /></span>
            <h3>Quiz unavailable</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/quiz')} type="button">
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
  const progressPct = total ? Math.round(((current + 1) / total) * 100) : 0
  const staffName = staffList.find((s) => s.id === staffId)
  const autoCreditName = autoStaffId
    ? (staffList.find((s) => s.id === autoStaffId)?.name ?? selectedSenior?.preferredStaff?.name ?? '')
    : ''

  if (total === 0) {
    return (
      <>
        <Brand back="/quiz" backLabel="Back to quizzes" />
        <div className="main">
          <div className="card empty">
            <span className="empty-icon"><FileQuestion size={26} /></span>
            <h3>No questions yet</h3>
            <p>This module doesn't have any questions yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/quiz')} type="button">
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
        seniorProfileId: selectedSenior?.id ?? newSeniorId ?? undefined,
        answers: Object.values(answers).map((optionId) => ({ optionId })),
        timeTakenSeconds: startedAt
          ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
          : undefined,
      }
      const data = await api(`/quiz/${id}/submit`, {
        method: 'POST',
        body,
      })
      flushSync(() => setSubmitted(true))
      navigate(`/quiz/${id}/result`, { state: data })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const questionReadText = q
    ? `Question ${current + 1}. ${q.text} The choices are ${q.options
        .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.text}`)
        .join('. ')}.`
    : ''
  const introReadText = [quiz.title, quiz.description, quiz.content]
    .filter(Boolean)
    .join('. ')

  const startQuiz = async () => {
    setStarting(true)
    setError('')
    try {
      if (seniorMode === 'new' && name.trim()) {
        const created = await api('/quiz/seniors', {
          method: 'POST',
          body: {
            name: name.trim(),
            ...(seniorNote.trim() ? { notes: seniorNote.trim() } : {}),
            ...(staffId ? { preferredStaffId: staffId } : {}),
          },
        })
        if (created && created.id) setNewSeniorId(created.id)
      }
      setStarted(true)
      setStartedAt(Date.now())
    } catch (err) {
      setError(err.message)
    } finally {
      setStarting(false)
    }
  }

  // Intro / name entry screen
  if (!started) {
    return (
      <>
        <Brand back="/quiz" backLabel="Back to quizzes" right={`${total} questions`} />
        <div className="stage-decor" aria-hidden="true">
          <QuizFloaties />
        </div>
        <div className="quiz-shell">
          <div className="card quiz-intro">
            <span className="quiz-intro-icon"><FileQuestion size={30} /></span>
            <p className="eyebrow">Training module</p>
            <h1 className="quiz-intro-title">{quiz.title}</h1>
            {quiz.description && <p className="quiz-intro-desc">{quiz.description}</p>}
            <div className="quiz-intro-meta">
              <span className="badge badge-soft"><FileQuestion size={14} /> {total} questions</span>
              <span className="badge badge-draft"><Timer size={14} /> ~{Math.max(1, Math.round(total * 0.5))} min</span>
            </div>

            {quiz.content && (
              <div className="quiz-reading">
                <div className="quiz-reading-head">
                  <span><BookOpen size={18} /> Read before you start</span>
                  <ReadAloud text={introReadText} />
                </div>
                <div className="reading-body">{quiz.content}</div>
              </div>
            )}

            {!quiz.content && <ReadAloud text={introReadText} className="read-aloud-start" />}

            {error && <div className="form-error">{error}</div>}

            <div className="quiz-intro-form">
              {isStaff ? (
                <>
                  <div className="field">
                    <label><UserRound size={16} /> Your name</label>
                    <input className="input input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" autoComplete="name" />
                  </div>
                  <div className="field">
                    <label><UserRound size={16} /> Training credit</label>
                    <input className="input input-lg" value={user ? user.name : ''} readOnly />
                    <p className="form-hint">Results will be recorded for your own training plan.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label><UsersRound size={16} /> Who is taking this quiz? <span className="req">*</span></label>

                    {seniorsStatus === 'error' ? (
                      <div className="senior-fallback">
                        <div className="card empty" role="alert">
                          <span className="empty-icon"><WifiOff size={26} /></span>
                          <h3>Can't load saved profiles</h3>
                          <p>
                            No problem — you can still type a name below.
                            <br />
                            <span className="muted">{seniorsError}</span>
                          </p>
                          <button className="btn btn-primary" type="button" onClick={retrySeniors}>
                            <ArrowRight size={16} /> Try again
                          </button>
                        </div>
                        <div className="field senior-fallback-input">
                          <label><UserRound size={16} /> Senior's name</label>
                          <input className="input input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" autoComplete="name" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="senior-search">
                          <span className="senior-search-icon" aria-hidden="true"><Search size={22} /></span>
                          <input
                            className="input input-lg"
                            value={seniorSearch}
                            onChange={(e) => setSeniorSearch(e.target.value)}
                            placeholder="Find their name…"
                            aria-label="Search saved senior profiles"
                            autoComplete="off"
                          />
                        </div>

                        {seniorsStatus === 'loading' && seniors.length === 0 ? (
                          <div className="senior-loading">
                            <span className="spinner" />
                            Loading saved profiles…
                          </div>
                        ) : seniors.length === 0 ? (
                          <p className="form-hint senior-empty">
                            {seniorSearch.trim()
                              ? 'No saved profile matches that name.'
                              : 'No saved profiles yet — someone new will be remembered for next time.'}
                          </p>
                        ) : (
                          <div className="senior-list" role="radiogroup" aria-label="Saved seniors">
                            {seniors.map((s) => {
                              const selected = selectedSenior?.id === s.id
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  className={`senior-card${selected ? ' selected' : ''}`}
                                  onClick={() => pickSenior(s)}
                                >
                                  <span className="senior-avatar" aria-hidden="true">{(s.name || '?')[0].toUpperCase()}</span>
                                  <span className="senior-main">
                                    <span className="senior-name">{s.name}</span>
                                    {s.preferredStaff?.name && (
                                      <span className="senior-pref"><UserRound size={14} /> Prefers {s.preferredStaff.name}</span>
                                    )}
                                  </span>
                                  <span className="senior-check" aria-hidden="true">{selected && <Check size={16} strokeWidth={3} />}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        <button
                          type="button"
                          className={`senior-new${seniorMode === 'new' ? ' active' : ''}`}
                          aria-pressed={seniorMode === 'new'}
                          onClick={chooseNew}
                        >
                          <span className="senior-new-icon" aria-hidden="true"><UserRoundPlus size={22} /></span>
                          <span>
                            <span className="senior-new-title">Someone new</span>
                            <span className="senior-new-sub">Not in the list — type their name</span>
                          </span>
                        </button>

                        {seniorMode === 'new' && (
                          <div className="new-senior-form">
                            <div className="field">
                              <label><UserRound size={16} /> Guest's name <span className="req">*</span></label>
                              <input className="input input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" autoComplete="name" />
                            </div>
                            <div className="field">
                              <label><StickyNote size={16} /> Note (optional)</label>
                              <textarea className="textarea" rows={2} value={seniorNote} onChange={(e) => setSeniorNote(e.target.value)} placeholder="Anything to remember — e.g. prefers audio" />
                            </div>
                            {staffId && (
                              <p className="form-hint">This new profile will be saved with {staffName?.name ?? 'your assistant'} as their preferred staff member.</p>
                            )}
                          </div>
                        )}

                        {selectedSenior && (
                          <div className="senior-selected">
                            <span className="senior-selected-name">
                              <Check size={18} strokeWidth={3} />
                              {selectedSenior.name}
                              {selectedSenior.preferredStaff?.name ? ` · prefers ${selectedSenior.preferredStaff.name}` : ''}
                            </span>
                            <button className="btn btn-ghost btn-sm" type="button" onClick={resetSenior}>
                              <X size={16} /> Choose nobody
                            </button>
                            {autoStaffId && autoCreditName && (
                              <div className="staff-credit-note" role="status" aria-live="polite">
                                <UserRound size={20} />
                                <span className="staff-credit-text">
                                  Quiz will be credited to <strong>{autoCreditName}</strong>
                                </span>
                                <ReadAloud text={`Quiz will be credited to ${autoCreditName}.`} />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {!autoStaffId && (
                    <div className="field">
                      <label><UserRound size={16} /> Who is assisting you? <span className="req">*</span></label>
                      <div className="staff-pick" role="radiogroup" aria-label="Who is assisting you">
                        {staffList.map((s) => {
                          const selected = staffId === s.id
                          return (
                            <button
                              key={s.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              className={`staff-pick-card${selected ? ' selected' : ''}`}
                              onClick={() => pickStaff(s)}
                            >
                              <span className="staff-pick-avatar">{(s.name || '?')[0].toUpperCase()}</span>
                              <span>
                                <span className="staff-pick-name">{s.name}</span>
                                <span className="staff-pick-spec">{specialtyLabel(s.specialty)}</span>
                              </span>
                              <span className="staff-pick-check">{selected && <Check size={16} strokeWidth={3} />}</span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="form-hint">Your result counts toward this staff member's training plan.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              className="btn btn-orange btn-lg btn-block"
              disabled={!name.trim() || (isStaff ? false : !staffId) || starting}
              onClick={startQuiz}
            >
              {starting ? 'Saving profile…' : <><span>Start quiz</span> <ArrowRight size={20} /></>}
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
            {q.options.map((opt, i) => {
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

        {error && <div className="form-error">{error}</div>}

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
      </div>

      {confirmSubmit && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="submit-title">
          <div className="card modal leave-dialog">
            <div className="modal-head">
              <h3 id="submit-title" className="modal-title">Ready to submit?</h3>
            </div>
            <p className="leave-text">
              You've answered all {total} questions. Once you submit, your results are saved for your staff member.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost btn-lg" onClick={() => setConfirmSubmit(false)}>Review answers</button>
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
              You've answered {answeredCount} of {total} questions. If you leave now, your answers will be lost.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost btn-lg" onClick={() => blocker.reset()}>Keep going</button>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  setSubmitted(true)
                  blocker.proceed()
                }}
              >
                Leave quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}