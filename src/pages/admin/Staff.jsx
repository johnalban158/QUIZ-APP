import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Search, UserPlus, Users, X } from 'lucide-react'
import { api } from '../../api'
import { SPECIALTIES, specialtyLabel } from '../../lib'

const LIMIT = 10

const REASON_LABELS = {
  INELIGIBLE: 'Not eligible for this module',
  ALREADY_ASSIGNED: 'Already assigned',
  NOT_FOUND: 'Staff member not found',
  SKIPPED: 'Skipped',
}

function reasonLabel(reason) {
  return REASON_LABELS[reason] || reason || 'Skipped'
}

export default function Staff() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: LIMIT })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())

  // Add staff modal
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', specialty: SPECIALTIES[0].value })
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  // Bulk assign modal
  const [showAssign, setShowAssign] = useState(false)
  const [eligible, setEligible] = useState(null)
  const [chosenModule, setChosenModule] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignResult, setAssignResult] = useState(null)

  const load = async (p = page, q = search, sp = specialty) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q.trim()) params.set('search', q.trim())
      if (sp) params.set('specialty', sp)
      const res = await api(`/admin/staff?${params}`)
      setRows(Array.isArray(res) ? res : (res.data ?? []))
      setMeta(res.meta ?? { total: Array.isArray(res) ? res.length : 0, page: p, limit: LIMIT })
    } catch (err) {
      setRows(null)
      setError(err.message || 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(page, search, specialty), 200)
    return () => clearTimeout(t)
  }, [page, search, specialty])

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const list = rows ?? []
      const all = list.length > 0 && list.every((r) => prev.has(r.id))
      const next = new Set(prev)
      if (all) list.forEach((r) => next.delete(r.id))
      else list.forEach((r) => next.add(r.id))
      return next
    })
  }

  const addStaff = async (e) => {
    e.preventDefault()
    setAddBusy(true)
    setAddError('')
    try {
      await api('/auth/staff/register', { method: 'POST', body: form })
      setShowAdd(false)
      setForm({ name: '', email: '', password: '', specialty: SPECIALTIES[0].value })
      setSelected(new Set())
      setPage(1)
      load(1, search, specialty)
    } catch (err) {
      setAddError(err.message || 'Failed to add staff member')
    } finally {
      setAddBusy(false)
    }
  }

  const openAssign = async () => {
    setShowAssign(true)
    setAssignResult(null)
    setChosenModule('')
    setEligible(null)
    setAssignError('')
    try {
      const params = new URLSearchParams()
      ;[...selected].forEach((sid) => params.append('staffIds', sid))
      const res = await api(`/admin/modules/eligible?${params}`)
      setEligible(Array.isArray(res) ? res : [])
    } catch (err) {
      setEligible([])
      setAssignError(err.message || 'Failed to load eligible modules')
    }
  }

  const bulkAssign = async () => {
    if (!chosenModule) return
    setAssignBusy(true)
    setAssignError('')
    try {
      const res = await api('/admin/staff/bulk-assign', {
        method: 'POST',
        body: { staffIds: [...selected], moduleId: chosenModule },
      })
      setAssignResult(res)
      setSelected(new Set())
      load(page, search, specialty)
    } catch (err) {
      setAssignError(err.message || 'Failed to assign module')
    } finally {
      setAssignBusy(false)
    }
  }

  const nameById = (id) => {
    const row = (rows ?? []).find((r) => r.id === id)
    return row ? row.name : id
  }

  const skippedItems = (assignResult?.skipped ?? []).map((s) =>
    typeof s === 'string' ? { staffId: s, reason: 'SKIPPED' } : s
  )

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit))

  return (
    <>
      <div className="mod-header">
        <div>
          <p className="eyebrow">Staff roster</p>
          <h1>Staff</h1>
          <p className="page-sub">Manage care aides and assign training modules by specialty eligibility.</p>
        </div>
        <div className="mod-header-actions">
          {selected.size >= 1 && (
            <button className="btn btn-primary" onClick={openAssign}>
              Assign module
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowAdd(true)}>
            <UserPlus size={16} /> Add staff
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="field search-wrap">
          <label>Search</label>
          <span className="search-icon"><Search size={15} /></span>
          <input
            className="input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name…"
          />
        </div>
        <div className="field">
          <label>Specialty</label>
          <select className="select" value={specialty} onChange={(e) => { setSpecialty(e.target.value); setPage(1) }}>
            <option value="">All specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-spacer" />
        {selected.size >= 1 && (
          <div className="bulk-bar">
            <span className="bulk-count">{selected.size} selected</span>
            <button type="button" className="btn-icon" title="Clear selection" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {rows === null ? (
        <div className="loading">
          <span className="spinner" />
          Loading staff…
        </div>
      ) : rows.length === 0 ? (
        <div className="card empty">
          <span className="empty-icon"><Users size={20} /></span>
          <h3>No staff members found</h3>
          <p>Try adjusting your filters, or add your first care aide.</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 14 }}>
            <UserPlus size={16} /> Add staff
          </button>
        </div>
      ) : (
        <>
          {loading && <div className="loading" style={{ padding: '12px 0' }}><span className="spinner" /> Reloading…</div>}
          <div className="table-wrap">
            <table className="table roster-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input
                      type="checkbox"
                      className="input-check"
                      checked={(rows ?? []).length > 0 && (rows ?? []).every((r) => selected.has(r.id))}
                      onChange={toggleSelectAll}
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th>Name</th>
                  <th>Specialty</th>
                  <th>Training progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/admin/staff/${s.id}`)}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="input-check"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        aria-label={`Select ${s.name}`}
                      />
                    </td>
                    <td>
                      <div className="staff-cell">
                        <span className="avatar avatar-sm">{(s.name || '?')[0].toUpperCase()}</span>
                        <div>
                          <div className="staff-name">{s.name}</div>
                          <div className="muted staff-email">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{specialtyLabel(s.specialty)}</td>
                    <td>
                      <div className="progress-mini">
                        <div className="progress-mini-fill" style={{ width: `${s.progressPercent ?? 0}%` }} />
                      </div>
                      <div className="progress-meta">
                        {s.completedModules ?? 0}/{s.totalEligibleModules ?? 0} modules · {s.progressPercent ?? 0}%
                      </div>
                    </td>
                    <td className="row-link">
                      View plan <ChevronRight size={15} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </button>
            <span className="pager-info">Page {meta.page} of {totalPages} · {meta.total} staff</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}

      {/* Add staff modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2 className="modal-title">Add staff member</h2>
                <p className="page-sub">Creates a login the care aide can use to see their training plan.</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>

            {addError && <div className="form-error">{addError}</div>}

            <form onSubmit={addStaff}>
              <div className="field">
                <label>Full name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" required autoFocus />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@care.com" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Temporary password" required />
              </div>
              <div className="modal-form-grid">
                <div className="field">
                  <label>Specialty</label>
                  <select className="select" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
                    {SPECIALTIES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addBusy}>
                  {addBusy ? 'Adding…' : 'Add staff member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk assign modal */}
      {showAssign && (
        <div className="modal-backdrop" onClick={() => setShowAssign(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2 className="modal-title">Assign module</h2>
                <p className="page-sub">
                  Choosing a module assigns it to all {selected.size} selected staff members.
                </p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowAssign(false)}>
                <X size={18} />
              </button>
            </div>

            {assignError && <div className="form-error">{assignError}</div>}

            {assignResult ? (
              <>
                <div className="assign-result">
                  <div className="assign-result-head">
                    <CheckCircle2 size={18} style={{ color: 'var(--ok)' }} />
                    <span><strong>{assignResult.created ?? 0}</strong> staff assigned</span>
                  </div>
                  {skippedItems.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p className="muted" style={{ marginBottom: 6 }}>Skipped {skippedItems.length}:</p>
                      {skippedItems.map((s, i) => (
                        <div key={i} className="assign-result-row">
                          <span style={{ fontWeight: 600, flex: 1 }}>{nameById(s.staffId)}</span>
                          <span className="muted">{reasonLabel(s.reason)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => setShowAssign(false)}>Done</button>
                </div>
              </>
            ) : eligible === null ? (
              <div className="loading">
                <span className="spinner" />
                Loading eligible modules…
              </div>
            ) : eligible.length === 0 ? (
              <div className="empty">
                <span className="empty-icon"><Users size={20} /></span>
                <h3>No eligible modules</h3>
                <p>No published modules are currently eligible for all of the selected staff's specialty.</p>
              </div>
            ) : (
              <>
                <p className="form-hint" style={{ marginBottom: 10 }}>Published modules eligible for all selected staff:</p>
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
                  <button className="btn btn-primary" disabled={!chosenModule || assignBusy} onClick={bulkAssign}>
                    {assignBusy ? 'Assigning…' : 'Assign to selected staff'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}