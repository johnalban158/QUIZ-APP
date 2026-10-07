import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, GraduationCap } from 'lucide-react'
import { api } from '../../api'
import { specialtyLabel, formatDate } from '../../lib'

export default function StaffHome() {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      setError('')
      try {
        setPlan(await api('/staff/me'))
      } catch (err) {
        setError(err.message || 'Failed to load training plan')
      }
    })()
  }, [])

  if (error && !plan) {
    return (
      <>
        <div className="form-error">{error}</div>
        <div className="card empty">
          <span className="empty-icon"><BookOpen size={20} /></span>
          <h3>Could not load your plan</h3>
          <p>{error}</p>
        </div>
      </>
    )
  }

  if (!plan) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading your training plan…
      </div>
    )
  }

  return (
    <>
      <div className="section-head">
        <span className="section-head-icon"><GraduationCap size={18} /></span>
        <div>
          <h1>My training plan</h1>
          <p className="page-sub">{specialtyLabel(plan.specialty)}</p>
        </div>
      </div>

      <div className="card plan-summary">
        <div className="plan-num">
          {plan.completedModules ?? 0}<span> / {plan.totalEligibleModules ?? 0}</span>
        </div>
        <div className="plan-summary-main">
          <div className="plan-title">Modules complete</div>
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            {plan.assignedModules ?? 0} assigned · {plan.totalEligibleModules ?? 0} eligible for your specialty
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${plan.progressPercent ?? 0}%` }} />
          </div>
        </div>
      </div>

      <div className="section-head">
        <span className="section-head-icon"><BookOpen size={18} /></span>
        <div>
          <h2>Assigned modules</h2>
        </div>
        {plan.assignments.length > 0 && (
          <span className="chip">{plan.assignments.length} module{plan.assignments.length === 1 ? '' : 's'}</span>
        )}
      </div>

      {plan.assignments.length === 0 ? (
        <div className="card empty">
          <span className="empty-icon"><BookOpen size={20} /></span>
          <h3>No training assigned yet</h3>
          <p>Your administrator will assign modules that fit your specialty.</p>
        </div>
      ) : (
        <div className="mod-list">
          {plan.assignments.map((a) => (
            <Link key={a.moduleId} to={`/staff/modules/${a.moduleId}`} className="mod-item">
              <div>
                <div className="mod-item-title">{a.moduleTitle}</div>
                <div className="mod-item-meta">
                  {a.completion ? (
                    <span className="badge badge-ok">Completed · {a.completion.percent}%</span>
                  ) : a.moduleStatus === 'PUBLISHED' ? (
                    <span className="badge badge-published">Not started</span>
                  ) : (
                    <span className="badge badge-draft">Draft</span>
                  )}
                  <span className="muted mod-item-count">
                    {a.moduleStatus === 'PUBLISHED' ? 'Ready to take' : 'Not available yet'}
                    {a.assignedAt ? ` · Assigned ${formatDate(a.assignedAt)}` : ''}
                  </span>
                </div>
              </div>
              <span
                className="quiz-card-arrow"
                title={a.moduleStatus === 'PUBLISHED' && !a.completion ? 'Read & begin' : 'Review'}
              >
                <ChevronRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}