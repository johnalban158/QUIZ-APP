import { useEffect, useRef, useState } from 'react'
import {
  HeartHandshake,
  Pencil,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { api } from '../../api'
import { specialtyLabel } from '../../lib'
import ReadAloud from '../../components/ReadAloud'

// Normalise responses that arrive as an array or as { data: [...] }.
function asList(payload) {
  if (Array.isArray(payload)) return payload
  for (const key of ['residents', 'data']) {
    if (payload && Array.isArray(payload[key])) return payload[key]
  }
  return []
}

function byName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''))
}

/**
 * Accessible modal shell — Escape to close, backdrop click to close,
 * focus moved in on open and restored on close, simple focus trap.
 */
function Modal({ title, sub, labelledBy, onClose, children }) {
  const backdropRef = useRef(null)
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const prevActive = document.activeElement
    const panel = panelRef.current
    if (panel && typeof panel.focus === 'function') panel.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && panel) {
        const focusables = [...panel.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter((el) => !el.disabled && el.offsetParent !== null)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !panel.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus()
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onCloseRef.current()
      }}
    >
      <div className="card modal" ref={panelRef} tabIndex={-1}>
        <div className="modal-head">
          <div>
            <h2 id={labelledBy} className="modal-title">{title}</h2>
            {sub && <p className="page-sub">{sub}</p>}
          </div>
          <button type="button" className="modal-close" aria-label="Close" onClick={() => onCloseRef.current()}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const EMPTY_ADD = { name: '', email: '', preferredStaffId: '', notes: '' }
const EMPTY_EDIT = { name: '', email: '', notes: '' }

export default function Residents() {
  const [residents, setResidents] = useState(null)
  const [staff, setStaff] = useState([])
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Add resident modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD)
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  // Change preferred staff modal
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignStaffId, setAssignStaffId] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignError, setAssignError] = useState('')

  // Edit resident modal
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete confirm modal
  const [delTarget, setDelTarget] = useState(null)
  const [delBusy, setDelBusy] = useState(false)
  const [delError, setDelError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [r, s] = await Promise.all([
          api('/admin/residents?limit=100'),
          api('/admin/staff?limit=100'),
        ])
        if (cancelled) return
        setResidents(asList(r).slice().sort(byName))
        setStaff(asList(s).slice().sort(byName))
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load residents')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refresh = () => setReloadKey((k) => k + 1)

  const openAssign = (resident) => {
    setAssignError('')
    setAssignTarget(resident)
    setAssignStaffId(resident.preferredStaffId ?? '')
  }

  const changeStaff = async (e) => {
    e.preventDefault()
    if (!assignTarget) return
    setAssignBusy(true)
    setAssignError('')
    try {
      await api(`/admin/residents/${assignTarget.id}`, {
        method: 'PATCH',
        body: { preferredStaffId: assignStaffId || null },
      })
      setAssignTarget(null)
      refresh()
    } catch (err) {
      setAssignError(err.message || 'Failed to update preferred staff')
    } finally {
      setAssignBusy(false)
    }
  }

  const openEdit = (resident) => {
    setEditError('')
    setEditTarget(resident)
    setEditForm({
      name: resident.name ?? '',
      email: resident.email ?? '',
      notes: resident.notes ?? '',
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editTarget) return
    setEditBusy(true)
    setEditError('')
    try {
      await api(`/admin/residents/${editTarget.id}`, {
        method: 'PATCH',
        body: {
          name: editForm.name.trim(),
          email: editForm.email.trim() || null,
          notes: editForm.notes.trim() || null,
        },
      })
      setEditTarget(null)
      refresh()
    } catch (err) {
      setEditError(err.message || 'Failed to update resident')
    } finally {
      setEditBusy(false)
    }
  }

  const addResident = async (e) => {
    e.preventDefault()
    setAddBusy(true)
    setAddError('')
    try {
      const body = {
        name: addForm.name.trim(),
        email: addForm.email.trim() || null,
        notes: addForm.notes.trim() || null,
      }
      if (addForm.preferredStaffId) body.preferredStaffId = addForm.preferredStaffId
      await api('/admin/residents', { method: 'POST', body })
      setShowAdd(false)
      setAddForm(EMPTY_ADD)
      refresh()
    } catch (err) {
      setAddError(err.message || 'Failed to add resident')
    } finally {
      setAddBusy(false)
    }
  }

  const deleteResident = async () => {
    if (!delTarget) return
    setDelBusy(true)
    setDelError('')
    try {
      await api(`/admin/residents/${delTarget.id}`, { method: 'DELETE' })
      setDelTarget(null)
      refresh()
    } catch (err) {
      setDelError(err.message || 'Failed to delete resident')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <>
      <div className="mod-header">
        <div>
          <p className="eyebrow">Resident management</p>
          <h1>Resident Management</h1>
          <p className="page-sub">Assign residents to staff and keep their details up to date.</p>
        </div>
        <div className="mod-header-actions">
          <ReadAloud text="Resident management. Assign residents to preferred staff members." />
          <button className="btn btn-orange" onClick={() => setShowAdd(true)}>
            <UserPlus size={18} /> Add Resident
          </button>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {residents === null ? (
        <div className="loading">
          <span className="spinner" />
          Loading residents…
        </div>
      ) : residents.length === 0 ? (
        <div className="card empty">
          <span className="empty-icon"><Users size={20} /></span>
          <h3>No residents yet</h3>
          <p>Add your first resident and assign them to a preferred staff member.</p>
          <button className="btn btn-orange" onClick={() => setShowAdd(true)} style={{ marginTop: 14 }}>
            <UserPlus size={16} /> Add Resident
          </button>
        </div>
      ) : (
        <>
          <div className="section-head">
            <span className="section-head-icon"><Users size={18} /></span>
            <div className="section-head-text">
              <h2>Residents</h2>
            </div>
            <span className="chip">
              {residents.length} resident{residents.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="resident-list">
            {residents.map((r) => {
              const preferred = r.preferredStaff
              return (
                <article key={r.id} className="card resident-card res-card">
                  <span className="resident-avatar" aria-hidden="true">
                    {(r.name || '?')[0].toUpperCase()}
                  </span>

                  <div className="resident-main">
                    <h3 className="resident-name">{r.name}</h3>
                    {r.email && <p className="res-email muted">{r.email}</p>}
                    <div className="res-staff-line">
                      {preferred ? (
                        <>
                          <span className="res-staff-name">
                            <HeartHandshake size={16} aria-hidden="true" />
                            {preferred.name}
                          </span>
                          <span className="badge res-spec-badge">
                            {specialtyLabel(preferred.specialty)}
                          </span>
                        </>
                      ) : (
                        <span className="res-unassigned">
                          <UserRound size={16} aria-hidden="true" />
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="res-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openAssign(r)}
                    >
                      {preferred ? 'Change staff' : 'Assign staff'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm res-delete"
                      onClick={() => { setDelError(''); setDelTarget(r) }}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {/* Add resident */}
      {showAdd && (
        <Modal
          title="Add Resident"
          sub="Adds a new resident profile to the directory."
          labelledBy="res-add-title"
          onClose={() => setShowAdd(false)}
        >
          {addError && <div className="form-error" role="alert">{addError}</div>}
          <form onSubmit={addResident}>
            <div className="field">
              <label htmlFor="res-add-name">Name</label>
              <input
                id="res-add-name"
                className="input"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Rose Sullivan"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="res-add-email">Email (optional)</label>
              <input
                id="res-add-email"
                className="input"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="rose@family.com"
              />
            </div>
            <div className="field">
              <label htmlFor="res-add-staff">Preferred staff (optional)</label>
              <select
                id="res-add-staff"
                className="select"
                value={addForm.preferredStaffId}
                onChange={(e) => setAddForm({ ...addForm, preferredStaffId: e.target.value })}
              >
                <option value="">No preferred staff</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {specialtyLabel(s.specialty)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="res-add-notes">Notes (optional)</label>
              <textarea
                id="res-add-notes"
                className="textarea"
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                placeholder="Care preferences, family contacts, anything useful…"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-orange" disabled={addBusy}>
                {addBusy ? 'Adding…' : 'Add Resident'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change preferred staff */}
      {assignTarget && (
        <Modal
          title="Preferred Staff"
          sub={`Choose the staff member who cares for ${assignTarget.name || 'this resident'}.`}
          labelledBy="res-assign-title"
          onClose={() => setAssignTarget(null)}
        >
          {assignError && <div className="form-error" role="alert">{assignError}</div>}
          <form onSubmit={changeStaff}>
            <div className="field">
              <label htmlFor="res-assign-staff">Staff member</label>
              <select
                id="res-assign-staff"
                className="select"
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
                autoFocus
              >
                <option value="">Unassign (no preferred staff)</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {specialtyLabel(s.specialty)}
                  </option>
                ))}
              </select>
              <p className="form-hint">Select “Unassign” to clear the resident&apos;s preferred staff.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAssignTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={assignBusy}>
                {assignBusy ? 'Saving…' : 'Save staff'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit resident */}
      {editTarget && (
        <Modal
          title="Edit Resident"
          sub={`Update details for ${editTarget.name || 'this resident'}.`}
          labelledBy="res-edit-title"
          onClose={() => setEditTarget(null)}
        >
          {editError && <div className="form-error" role="alert">{editError}</div>}
          <form onSubmit={saveEdit}>
            <div className="field">
              <label htmlFor="res-edit-name">Name</label>
              <input
                id="res-edit-name"
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="res-edit-email">Email (optional)</label>
              <input
                id="res-edit-email"
                className="input"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="res-edit-notes">Notes (optional)</label>
              <textarea
                id="res-edit-notes"
                className="textarea"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editBusy}>
                {editBusy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {delTarget && (
        <Modal
          title="Delete Resident?"
          sub={`This permanently removes ${delTarget.name || 'this resident'} from the directory.`}
          labelledBy="res-del-title"
          onClose={() => setDelTarget(null)}
        >
          {delError && <div className="form-error" role="alert">{delError}</div>}
          <p className="form-hint">
            Their quiz history may be kept by the system, but this profile can no longer be
            assigned to staff.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDelTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={deleteResident} disabled={delBusy}>
              <Trash2 size={16} /> {delBusy ? 'Deleting…' : 'Delete resident'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}