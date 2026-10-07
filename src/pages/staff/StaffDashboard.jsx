import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Sparkles,
  TrendingUp,
  WifiOff,
} from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import RoleBadge from '../../components/RoleBadge'
import { formatDate, roleLabel, specialtyLabel } from '../../lib'

const STATUS_META = {
  NOT_STARTED: { label: 'Not started', className: 'badge-draft' },
  IN_PROGRESS: { label: 'In progress', className: 'badge-inprogress' },
  PASSED: { label: 'Passed', className: 'badge-ok' },
  FAILED: { label: 'Failed', className: 'badge-bad' },
}

function statusOf(mod) {
  const raw = String(mod.status || '').toUpperCase()
  if (STATUS_META[raw]) return raw
  if (mod.completion) return mod.completion.passed ? 'PASSED' : 'FAILED'
  return 'NOT_STARTED'
}

function percentOf(result) {
  if (typeof result.percent === 'number') return Math.round(result.percent)
  return result.total ? Math.round((result.score / result.total) * 100) : 0
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setError('')
      try {
        const [planData, modulesData] = await Promise.all([
          api('/staff/me'),
          api('/staff/me/modules'),
        ])
        if (!alive) return
        setPlan(planData)
        setModules(modulesData.modules ?? [])
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load your dashboard')
      }
    })()
    return () => {
      alive = false
    }
  }, [reloadKey])

  const loaded = plan !== null && modules !== null

  const firstName = (user?.name || 'Staff').trim().split(/\s+/)[0] || 'Staff'
  // Role comes from data already on hand: the stored session, or /staff/me
  // if the backend includes it. No extra fetch.
  const ownRole = plan?.role ?? user?.role
  const roleBits = [roleLabel(ownRole), user?.specialty ? specialtyLabel(user.specialty) : '']
    .filter(Boolean)
    .join(' · ')

  const passedCount = (modules ?? []).filter((m) => statusOf(m) === 'PASSED').length
  const totalCount = (modules ?? []).length
  const progressPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
  const recent = (plan?.completions ?? []).slice(0, 4)

  const retry = () => {
    setPlan(null)
    setModules(null)
    setError('')
    setReloadKey((k) => k + 1)
  }

  if (error && !loaded) {
    return (
      <div className="main">
        <div className="page-heading dashboard-head">
          <div>
            <p className="eyebrow">Staff dashboard</p>
            <h1 className="page-title">Welcome back, {firstName}</h1>
          </div>
        </div>
        <div className="card empty" role="alert">
          <span className="empty-icon"><WifiOff size={26} /></span>
          <h3>Couldn&apos;t load your dashboard</h3>
          <p>{error}</p>
          <button className="btn btn-primary" type="button" onClick={retry}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading your dashboard…
      </div>
    )
  }

  return (
    <div className="main">
      <div className="page-heading dashboard-head">
        <div>
          <p className="eyebrow">Staff dashboard</p>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="page-sub">{roleBits || 'Your modules & progress'}</p>
          <RoleBadge role={ownRole} />
        </div>
      </div>

      <section className="dash-section" aria-labelledby="progress-title">
        <div className="section-head">
          <span className="section-head-icon"><TrendingUp size={20} /></span>
          <div className="section-head-text">
            <h2 id="progress-title">Overall progress</h2>
          </div>
          <span className="chip">{progressPct}% complete</span>
        </div>

        <div className="card plan-summary">
          <div className="plan-num">
            {passedCount}<span> / {totalCount}</span>
          </div>
          <div className="plan-summary-main">
            <div className="plan-title">Modules passed</div>
            <div className="muted" style={{ fontSize: '0.9rem' }}>
              {totalCount} assigned · pass at least 70% to record a completion
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
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
              const status = statusOf(mod)
              const meta = STATUS_META[status]
              const title = mod.module?.title || mod.moduleTitle || 'Untitled module'
              return (
                <Link
                  key={mod.moduleId || mod.id}
                  className="card mod-card"
                  to={`/staff/modules/${mod.moduleId || mod.id}`}
                >
                  <div className="mod-card-main">
                    <span className="mod-card-title">{title}</span>
                    <span className="mod-card-meta">
                      <span className={`badge ${meta.className}`}>{meta.label}</span>
                      {status === 'PASSED' && mod.completion && (
                        <span className="mod-card-due">{percentOf(mod.completion)}% score</span>
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

      <section className="dash-section" aria-labelledby="results-title">
        <div className="section-head">
          <span className="section-head-icon"><ClipboardCheck size={20} /></span>
          <div className="section-head-text">
            <h2 id="results-title">Recent results</h2>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="card empty">
            <span className="empty-icon"><ClipboardCheck size={26} /></span>
            <h3>No results yet</h3>
            <p>Pass a quiz and your result will show up here.</p>
          </div>
        ) : (
          <div className="mod-list">
            {recent.map((c) => (
              <Link
                key={`${c.moduleId}-${c.completedAt}`}
                to={`/staff/modules/${c.moduleId}`}
                className="mod-item"
              >
                <div>
                  <div className="mod-item-title">{c.module?.title ?? 'Module'}</div>
                  <div className="mod-item-meta">
                    <span className={`badge ${c.passed ? 'badge-ok' : 'badge-bad'}`}>
                      {c.passed ? 'Passed' : 'Failed'} · {percentOf(c)}%
                    </span>
                    <span className="muted mod-item-count">
                      {c.score}/{c.total} · {formatDate(c.completedAt)}
                    </span>
                  </div>
                </div>
                <span className="quiz-card-arrow" aria-hidden="true">
                  <ChevronRight size={14} />
                </span>
              </Link>
            ))}
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
          <Link className="card dash-action" to="/staff/plan">
            <span className="dash-action-icon"><TrendingUp size={24} /></span>
            <span className="dash-action-text">
              <span className="dash-action-title">View My Progress</span>
              <span className="dash-action-sub">
                {progressPct}% complete · {passedCount} of {totalCount} module
                {totalCount === 1 ? '' : 's'} passed
              </span>
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
