import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <ListChecks size={24} style={{ color: 'var(--accent)' }} />
        <h1 style={{ margin: 0 }}>Submissions</h1>
      </div>
      <p className="page-sub">All quiz attempts — filter by module, sort by date or score.</p>

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
        <div className="loading">Loading…</div>
      ) : subs.length === 0 ? (
        <div className="card empty">
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
              {subs.map((s) => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/submissions/${s.id}`)}>
                  <td style={{ fontWeight: 600 }}>{s.takerName}</td>
                  <td>{s.module?.title ?? '—'}</td>
                  <td>
                    {s.score}/{s.total}{' '}
                    <span className="badge badge-ok" style={{ marginLeft: 6 }}>{Math.round((s.score / s.total) * 100)}%</span>
                  </td>
                  <td>{new Date(s.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}