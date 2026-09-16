import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, ListChecks } from 'lucide-react'
import { api } from '../../api'

export default function Submissions() {
  const navigate = useNavigate()
  const [subs, setSubs] = useState(null)
  const [modules, setModules] = useState([])
  const [filterModule, setFilterModule] = useState('')
  const [sort, setSort] = useState('date')
  const [order, setOrder] = useState('desc')
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterModule) params.set('moduleId', filterModule)
      params.set('sort', sort)
      params.set('order', order)
      const [s, m] = await Promise.all([
        api(`/admin/submissions?${params}`),
        api('/admin/modules'),
      ])
      setSubs(s)
      setModules(m)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [filterModule, sort, order])

  return (
    <>
      <div className="section-head">
        <span className="section-head-icon"><ListChecks size={18} /></span>
        <div>
          <h1 style={{ margin: 0 }}>Submissions</h1>
          <p className="page-sub">All quiz attempts — filter by module, sort by date or score.</p>
        </div>
        {subs !== null && subs.length > 0 && (
          <span className="chip">{subs.length} attempt{subs.length === 1 ? '' : 's'}</span>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="toolbar">
        <div className="field">
          <label>Module</label>
          <select className="select" value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Sort by</label>
          <select className="select" value={`${sort}:${order}`} onChange={(e) => {
            const [s, o] = e.target.value.split(':')
            setSort(s)
            setOrder(o)
          }}>
            <option value="submittedAt:desc">Date (newest)</option>
            <option value="submittedAt:asc">Date (oldest)</option>
            <option value="score:desc">Score (highest)</option>
            <option value="score:asc">Score (lowest)</option>
          </select>
        </div>
      </div>

      {subs === null ? (
        <div className="loading">
          <span className="spinner" />
          Loading…
        </div>
      ) : subs.length === 0 ? (
        <div className="card empty">
          <span className="empty-icon"><Inbox size={20} /></span>
          <h3>No submissions yet</h3>
          <p>Submissions will appear here once someone takes a published quiz.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Module</th>
                <th>Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const p = s.total ? Math.round((s.score / s.total) * 100) : 0
                return (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/submissions/${s.id}`)}>
                    <td style={{ fontWeight: 600 }}>{s.takerName}</td>
                    <td>{s.module?.title ?? '—'}</td>
                    <td>
                      {s.score}/{s.total}{' '}
                      <span className={`badge ${p >= 70 ? 'badge-ok' : 'badge-bad'}`} style={{ marginLeft: 6 }}>{p}%</span>
                    </td>
                    <td className="muted">{new Date(s.submittedAt).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}