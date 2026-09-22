import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  HeartHandshake,
  Play,
  Sparkles,
  TrendingUp,
  UsersRound,
  WifiOff,
  X,
} from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../lib'

// ---- helpers for normalising the backend payloads (backend may grow) ----

function asArray(payload, keys) {
  if (Array.isArray(payload)) return payload
  for (const key of keys) {
    if (payload && Array.isArray(payload[key])) return payload[key]
  }
  return []
}

function moduleStatusOf(assignment) {
  const raw = String(assignment.status || assignment.assignmentStatus || '').toUpperCase()
  if (raw === 'PASSED' || raw === 'COMPLETED') return 'PASSED'
  if (raw === 'FAILED') return 'FAILED'
  if (raw === 'IN_PROGRESS' || raw === 'STARTED') return 'IN_PROGRESS'
  if (assignment.completion) {
    return assignment.completion.passed ? 'PASSED' : 'FAILED'
  }
  const hasAttempt =
    (Array.isArray(assignment.attempts) && assignment.attempts.length > 0) ||
    assignment.submissionCount > 0 ||
    assignment.attemptCount > 0
  if (hasAttempt) return 'IN_PROGRESS'
  return 'NOT_STARTED'
}

function lastQuizOf(resident) {
  const lq = resident.lastQuiz || resident.lastSubmission || resident.recentQuiz
  if (!lq) return null
  const title = lq.moduleTitle || lq.title || lq.module?.title || null
  const date = lq.completedAt || lq.submittedAt || lq.date || lq.takenAt || null
  if (!title && !date) return null
  return { title: title || 'Last quiz', date }
}

const STATUS_META = {
  NOT_STARTED: { label: 'Not started', className: 'badge-draft' },
  IN_PROGRESS: { label: 'In progress', className: 'badge-inprogress' },
  PASSED: { label: 'Passed', className: 'badge-ok' },
  FAILED: { label: 'Failed', className: 'badge-bad' },
}

function ResidentCard({ resident, onStart }) {
  const last = lastQuizOf(resident)
  const taken = resident._count?.submissions ?? 0
  return (
    <article className="card resident-card">
      <span className="resident-avatar" aria-hidden="true">
        {(resident.name || '?')[0].toUpperCase()}
      </span>
      <div className="resident-main">
        <h3 className="resident-name">{resident.name}</h3>
        {last ? (
          <p className="resident-last">
            <BookOpen size={17} />
            Last quiz: <strong>{last.title}</strong>
            {last.date ? ` · ${formatDate(last.date)}` : ''}
          </p>
        ) : taken > 0 ? (
          <p className="resident-last">
            <BookOpen size={17} />
            {taken} quiz{taken === 1 ? '' : 'zes'} taken
          </p>
        ) : (
          <p className="resident-last muted">
            <BookOpen size={17} />
            No quiz taken yet
          </p>
        )}
      </div>
      <button type="button" className="btn btn-orange resident-start" onClick={() => onStart(resident)}>
        <Play size={20} /> Start Session
      </button>
    </article>
  )
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [residents, setResidents] = useState(null)
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    (async () => {
      setError('')
      try {
        const [r, m] = await Promise.all([
          api('/staff/me/residents'),
          api('/staff/me/modules'),
        ])
        setResidents(asArray(r, ['residents', 'data']))
        setModules(asArray(m, ['modules', 'assignments', 'data']))
      } catch (err) {
        setError(err.message || 'Failed to load your dashboard')
      }
    })()
  }, [reloadKey])

  useEffect(() => {
    if (!showPicker) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setShowPicker(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPicker])

  const firstName = (user?.name || 'Staff').trim().split(/\s+/)[0] || 'Staff'
  const staffId = user?.id || ''

  const loaded = residents !== null && modules !== null

  const passedCount = (modules || []).filter((m) => moduleStatusOf(m) === 'PASSED').length
  const totalCount = (modules || []).length
  const progressPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

  const startSession = (resident) => {
    setShowPicker(false)
    if (!resident || !resident.id) return
    const params = new URLSearchParams({
      resident: resident.id,
      staff: staffId,
      name: resident.name || '',
    })
    navigate(`/quiz?${params.toString()}`)
  }

  const retry = () => {
    setResidents(null)
    setModules(null)
    setError('')
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="main">
      <div className="page-heading dashboard-head">
        <div>
          <p className="eyebrow">Staff dashboard</p>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="page-sub">Your residents &amp; modules</p>
        </div>
      </div>

      {error && !loaded && (
        <div className="card empty" role="alert">
          <span className="empty-icon"><WifiOff size={26} /></span>
          <h3>Couldn&apos;t load your dashboard</h3>
          <p>{error}</p>
          <button className="btn btn-primary" type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {loaded ? (
        <>
          <section className="dash-section" aria-labelledby="residents-title">
              <div className="section-head">
                <span className="section-head-icon"><HeartHandshake size={20} /></span>
                <div className="section-head-text">
                  <h2 id="residents-title">Residents I Care For</h2>
                </div>
                {residents.length > 0 && (
                  <span className="chip">{residents.length} resident{residents.length === 1 ? '' : 's'}</span>
                )}
              </div>

              {residents.length === 0 ? (
                <div className="card empty">
                  <span className="empty-icon"><HeartHandshake size={26} /></span>
                  <h3>No residents assigned yet</h3>
                  <p>Ask your administrator to link residents to you, or run a session with someone new.</p>
                  <Link className="btn btn-primary" to="/quiz">Start a quiz session</Link>
                </div>
              ) : (
                <div className="resident-list">
                  {residents.map((resident) => (
                    <ResidentCard
                      key={resident.id}
                      resident={resident}
                      onStart={startSession}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="dash-section" aria-labelledby="modules-title">
              <div className="section-head">
                <span className="section-head-icon"><BookOpen size={20} /></span>
                <div className="section-head-text">
                  <h2 id="modules-title">My Training Modules</h2>
                </div>
                {modules.length > 0 && (
                  <span className="chip">{modules.length} module{modules.length === 1 ? '' : 's'}</span>
                )}
              </div>

              {modules.length === 0 ? (
                <div className="card empty">
                  <span className="empty-icon"><BookOpen size={26} /></span>
                  <h3>No modules assigned yet</h3>
                  <p>Your administrator will assign modules that fit your specialty.</p>
                </div>
              ) : (
                <div className="dashboard-mod-list">
                  {modules.map((mod) => {
                    const status = moduleStatusOf(mod)
                    const meta = STATUS_META[status]
                    const title = mod.moduleTitle || mod.module?.title || mod.title || 'Untitled module'
                    const dueDate = mod.dueDate || mod.dueAt || mod.deadline || null
                    return (
                      <Link key={mod.moduleId || mod.id || title} className="card mod-card" to={`/staff/modules/${mod.moduleId || mod.id}`}>
                        <div className="mod-card-main">
                          <span className="mod-card-title">{title}</span>
                          <span className="mod-card-meta">
                            <span className={`badge ${meta.className}`}>
                              {meta.label}
                            </span>
                            {mod.isEligible === false && (
                              <span className="badge badge-state">No longer eligible</span>
                            )}
                            {dueDate && (
                              <span className="mod-card-due">
                                <CalendarDays size={16} /> Due {formatDate(dueDate)}
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="quiz-card-arrow" aria-hidden="true"><ChevronRight size={16} /></span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="dash-section" aria-labelledby="actions-title">
              <div className="section-head">
                <span className="section-head-icon"><Sparkles size={20} /></span>
                <div className="section-head-text">
                  <h2 id="actions-title">Quick Actions</h2>
                </div>
              </div>

              <div className="dash-actions">
                <button
                  type="button"
                  className="card dash-action"
                  onClick={() => setShowPicker(true)}
                  disabled={residents.length === 0}
                >
                  <span className="dash-action-icon dash-action-icon--orange"><UsersRound size={24} /></span>
                  <span className="dash-action-text">
                    <span className="dash-action-title">Start Quick Session</span>
                    <span className="dash-action-sub">
                      {residents.length === 0 ? 'No residents to pick yet' : 'Pick a resident and begin a quiz'}
                    </span>
                  </span>
                </button>

                <Link className="card dash-action" to="/staff/plan">
                  <span className="dash-action-icon"><TrendingUp size={24} /></span>
                  <span className="dash-action-text">
                    <span className="dash-action-title">View My Progress</span>
                    <span className="dash-action-sub">
                      {progressPct}% complete · {passedCount} of {totalCount} module{totalCount === 1 ? '' : 's'} passed
                    </span>
                  </span>
                </Link>
              </div>
            </section>
          </>
      ) : !error ? (
        <div className="loading">
          <span className="spinner" />
          Loading your dashboard…
        </div>
      ) : null}

      {showPicker && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="picker-title"
          ref={pickerRef}
          onClick={(e) => {
            if (e.target === pickerRef.current) setShowPicker(false)
          }}
        >
          <div className="card modal resident-picker">
            <div className="modal-head">
              <h3 id="picker-title" className="modal-title">Start a session</h3>
              <button type="button" className="modal-close" onClick={() => setShowPicker(false)} aria-label="Close">
                <X size={22} />
              </button>
            </div>
            <p className="form-hint">Pick a resident — they&apos;ll be pre-selected for the quiz.</p>
            <div className="resident-pick-list">
              {residents.map((resident) => (
                <button key={resident.id} type="button" className="resident-pick-row" onClick={() => startSession(resident)}>
                  <span className="resident-avatar" aria-hidden="true">
                    {(resident.name || '?')[0].toUpperCase()}
                  </span>
                  <span className="resident-pick-name">{resident.name}</span>
                  <Play size={20} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}