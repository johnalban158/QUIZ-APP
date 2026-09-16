import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { api } from '../../api'

export default function Modules() {
  const navigate = useNavigate()
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setError('')
    try {
      setModules(await api('/admin/modules'))
    } catch (err) {
      setError(err.message || 'Failed to load modules')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createModule = async () => {
    setCreating(true)
    setError('')
    try {
      const created = await api('/admin/modules', { method: 'POST', body: { title: 'Untitled module' } })
      await load()
      navigate(`/admin/modules/${created.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create module')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="mod-header">
        <div>
          <h1>Modules</h1>
          <p className="page-sub">Create and manage your quiz sets.</p>
        </div>
        <button className="btn btn-primary" onClick={createModule} disabled={creating}>
          <Plus size={16} /> New module
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {modules === null ? (
        <div className="loading">Loading…</div>
      ) : modules.length === 0 ? (
        <div className="card empty">
          <h3>No modules yet</h3>
          <p>Click “New module” to create your first quiz set.</p>
        </div>
      ) : (
        <div className="mod-list">
          {modules.map((m) => (
            <button key={m.id} className="mod-item" onClick={() => navigate(`/admin/modules/${m.id}`)}>
              <div>
                <div className="mod-item-title">{m.title || 'Untitled module'}</div>
                {m.description && <div className="mod-item-desc">{m.description}</div>}
                <div className="mod-item-meta">
                  <span className={`badge ${m.status === 'PUBLISHED' ? 'badge-published' : 'badge-draft'}`}>
                    {m.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </span>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{m.questions.length} questions · {m._count.submissions} submissions</span>
                </div>
              </div>
              <ChevronRight size={18} className="muted" />
            </button>
          ))}
        </div>
      )}
    </>
  )
}