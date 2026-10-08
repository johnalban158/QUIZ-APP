import { useEffect, useState } from 'react'
import { Flag, Inbox } from 'lucide-react'
import { api } from '../../api'
import { roleLabel } from '../../lib'

const CATEGORIES = ['', 'BUG', 'CONTENT', 'GENERAL', 'SUGGESTION', 'OTHER']

export default function Reports() {
  const [reports, setReports] = useState(null)
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api('/admin/reports?limit=100')
      .then(setReports)
      .catch((err) => setError(err.message))
  }, [])

  const visible = reports === null
    ? []
    : reports.filter((r) => !category || r.category === category)

  return (
    <>
      <div className="section-head">
        <span className="section-head-icon"><Flag size={18} /></span>
        <div>
          <h1 style={{ margin: 0 }}>Bug reports</h1>
          <p className="page-sub">What nurses &amp; caregivers flagged from inside the app — newest first.</p>
        </div>
        {reports !== null && reports.length > 0 && (
          <span className="chip">{visible.length} report{visible.length === 1 ? '' : 's'}</span>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="toolbar">
        <div className="field">
          <label>Category</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c === '' ? 'All categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {reports === null ? (
        <div className="loading">
          <span className="spinner" />
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="card empty">
          <span className="empty-icon"><Inbox size={20} /></span>
          <h3>No bug reports</h3>
          <p>Reports sent from the in-app flag button will appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th>Category</th>
                <th>Message</th>
                <th>Emailed</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.userName || '—'}</div>
                    {(roleLabel(r.role) || r.userEmail) && (
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {[roleLabel(r.role), r.userEmail].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td><span className="badge">{r.category}</span></td>
                  <td style={{ whiteSpace: 'pre-wrap', maxWidth: 420 }}>{r.message}</td>
                  <td>
                    <span className={`badge ${r.emailed ? 'badge-ok' : 'badge-bad'}`}>
                      {r.emailed ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="muted">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
