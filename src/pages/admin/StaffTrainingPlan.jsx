import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CheckCircle2, Plus, Trash2, UserPlus, Users, X } from 'lucide-react'
import { api } from '../../api'
import { specialtyLabel, formatDate } from '../../lib'

export default function StaffTrainingPlan() {
  const { id } = useParams()
  const [plan, setPlan] = useState(null)
  const [eligMap, setEligMap] = useState({})
  const [error, setError] = useState('')
  const [showAssign, setShowAssign] = useState(false)
  const [eligible, setEligible] = useState(null)
  const [chosenModule, setChosenModule] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignError, setAssignError] = useState('')

  const load = async () => {
    setError('')
    try {
      const [staff, modules] = await Promise.all([
        api(`/admin/staff/${id}`),
        api('/admin/modules').catch(() => []),
      ])
      setPlan(staff)
      const map = {}
      ;(Array.isArray(modules) ? modules : []).forEach((m) => {
        map[m.id] = Array.isArray(m.eligibility) ? m.eligibility : []
      })
      setEligMap(map)
    } catch (err) {
      setError(err.message || 'Failed to load training plan')
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const openAssign = async () => {
    setShowAssign(true)
    setChosenModule('')
    setAssignError('')
    try {
      const params = new URLSearchParams()
      params.append('staffIds', id)
      const res = await api(`/admin/modules/eligible?${params}`)
      const all = Array.isArray(res) ? res : []
      const assignedIds = new Set((plan?.assignments ?? []).map((a) => a.moduleId))
      setEligible(all.filter((m) => !assignedIds.has(m.id)))
    } catch (err) {
      setEligible([])
      setAssignError(err.message || 'Failed to load eligible modules')
    }
  }

  const assign = async () => {
    if (!chosenModule) return
    setAssignBusy(true)
    setAssignError('')
    try {
      await api(`/admin/staff/${id}/modules`, { method: 'POST', body: { moduleId: chosenModule } })
      setShowAssign(false)
      load()
    } catch (err) {
      setAssignError(err.message || 'Failed to assign module')
    } finally {
      setAssignBusy(false)
    }
  }

  const removeModule = async (moduleId) => {
    if (!window.confirm('Remove this assignment? The staff member will need to be re-assigned to take this module again.')) return
    setError('')
    try {
      await api(`/admin/staff/${id}/modules/${moduleId}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message || 'Failed to remove assignment')
    }
  }

  if (!plan && !error) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading training plan…
      </div>
    )
  }

  return (
    <div>
      <Link to="/admin/staff" className="back-link">
        <ArrowLeft size={16} /> Back to staff roster
      </Link>

      {error && <div className="form-error">{error}</div>}

      {plan && (
        <>
          <div className="card head-card">
            <div className="head-main">
              <span className="avatar avatar-lg">{(plan.name || '?')[0].toUpperCase()}</span>
              <div>
                <h1>{plan.name}</h1>
                <p className="page-sub">{plan.email}</p>
                <div className="head-chips">
                  <span className="badge badge-soft">{specialtyLabel(plan.specialty)}</span>
                </div>
              </div>
            </div>
            <div className="head-progress">
              <div className="progress-label">
                <span>{plan.completedModules ?? 0}/{plan.totalEligibleModules ?? 0} modules complete</span>
                <span>{plan.progressPercent ?? 0}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${plan.progressPercent ?? 0}%` }} />
              </div>
              <p className="muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                {plan.assignedModules ?? 0} assigned · {plan.totalEligibleModules ?? 0} eligible for this specialty
              </p>
            </div>
            <button className="btn btn-primary" onClick={openAssign}>
              <Plus size={16} /> Assign module
            </button>
          </div>

          <div className="section-head">
            <span className="section-head-icon"><Users size={18} /></span>
            <div>
              <h2 style={{ fontSize: '1.3rem' }}>Training plan</h2>
              <p className="page-sub">Modules assigned to this staff member.</p>
            </div>
            {plan.assignments.length > 0 && (
              <span className="chip">{plan.assignments.length} module{plan.assignments.length === 1 ? '' : 's'}</span>
            )}
          </div>

          {plan.assignments.length === 0 ? (
            <div className="card empty">
              <span className="empty-icon"><Users size={20} /></span>
              <h3>No modules assigned yet</h3>
              <p>Assign an eligible module to start this staff member's training.</p>
              <button className="btn btn-primary" onClick={openAssign} style={{ marginTop: 14 }}>
                <Plus size={16} /> Assign module
              </button>
            </div>
          ) : (
            <div className="assign-list">
              {plan.assignments.map((a) => (
                <div key={a.moduleId} className="card assign-row">
                  <div className="assign-main">
                    <div className="assign-title">{a.moduleTitle}</div>
                    <div className="assign-meta">
                      <span className={`badge ${a.moduleStatus === 'PUBLISHED' ? 'badge-published' : 'badge-draft'}`}>
                        {a.moduleStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </span>
                      <span className="muted assign-date">
                        <CalendarDays size={13} /> Assigned {formatDate(a.assignedAt)}
                      </span>
                      <span className="muted">by {a.assignedByName ?? '—'}</span>
                      {a.isEligible === false && <span className="badge badge-bad">Not currently eligible</span>}
                    </div>
                    {(eligMap[a.moduleId] ?? []).length > 0 && (
                      <div className="elig-tags">
                        {eligMap[a.moduleId].map((rule, i) => (
                          <span key={i} className="badge badge-soft">
                            {specialtyLabel(rule.specialty)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {a.completion ? (
                    <div className="completion ok">
                      <CheckCircle2 size={18} />
                      <div>
                        <div className="completion-title">Passed · {a.completion.percent}%</div>
                        <div className="completion-sub">
                          {a.completion.score}/{a.completion.total} · {formatDate(a.completion.completedAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="assign-side">
                      <button className="btn btn-danger btn-sm" onClick={() => removeModule(a.moduleId)}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Assign module modal */}
      {showAssign && (
        <div className="modal-backdrop" onClick={() => setShowAssign(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2 className="modal-title">Assign a module</h2>
                <p className="page-sub">Modules this staff member is eligible for that aren't already assigned.</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowAssign(false)}>
                <X size={18} />
              </button>
            </div>

            {assignError && <div className="form-error">{assignError}</div>}

            {eligible === null ? (
              <div className="loading">
                <span className="spinner" />
                Loading eligible modules…
              </div>
            ) : eligible.length === 0 ? (
              <div className="empty">
                <span className="empty-icon"><UserPlus size={20} /></span>
                <h3>Nothing left to assign</h3>
                <p>This staff member is already assigned every module they're currently eligible for.</p>
              </div>
            ) : (
              <>
                <div className="elig-options">
                  {eligible.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`sel-card${chosenModule === m.id ? ' selected' : ''}`}
                      onClick={() => setChosenModule(m.id)}
                    >
                      <span className="sel-card-title">{m.title}</span>
                      {m.description && <span className="sel-card-desc">{m.description}</span>}
                    </button>
                  ))}
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => setShowAssign(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={!chosenModule || assignBusy} onClick={assign}>
                    {assignBusy ? 'Assigning…' : 'Assign module'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}