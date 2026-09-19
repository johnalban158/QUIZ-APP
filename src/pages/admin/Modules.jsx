import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, FileText, Users, TrendingUp, Plus, Link2 } from 'lucide-react'
import { api } from '../../api'
import { specialtyLabel } from '../../lib'

function timeAgo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon"><Icon size={16} /></div>
      <div className="stat-tile-num">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  )
}

export default function Modules() {
  const navigate = useNavigate()
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [stats, setStats] = useState(null)

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

  useEffect(() => {
    api('/admin/stats')
      .then(setStats)
      .catch(() => {})
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
          <p className="eyebrow">Content Library</p>
          <h1>Content Library</h1>
          <p className="page-sub">Create and manage training modules — reading content plus the quiz that follows it.</p>
        </div>
        <button className="btn btn-primary" onClick={createModule} disabled={creating}>
          <Plus size={16} /> New module
        </button>
      </div>

      {/* ---- Stats strip ---- */}
      <div className="admin-stats">
        <StatTile icon={BookOpen} label="Published" value={stats ? stats.publishedModules : '--'} />
        <StatTile icon={FileText} label="Submissions" value={stats ? stats.totalSubmissions : '--'} />
        <StatTile icon={Users} label="Unique takers" value={stats ? stats.uniqueTakers : '--'} />
        <StatTile icon={TrendingUp} label="Avg score" value={stats ? `${Math.round(stats.averageScorePercent)}%` : '--'} />
      </div>

      {error && <div className="form-error">{error}</div>}

      {modules === null ? (
        <div className="loading">
          <span className="spinner" />
          Loading…
        </div>
      ) : modules.length === 0 ? (
        <div className="card empty">
          <span className="empty-icon"><BookOpen size={20} /></span>
          <h3>No modules yet</h3>
          <p>Click "New module" to create your first quiz set.</p>
          <button className="btn btn-primary" onClick={createModule} disabled={creating} style={{ marginTop: 14 }}>
            <Plus size={16} /> New module
          </button>
        </div>
      ) : (
        <>
          <div className="stat-chips">
            <span className="chip"><BookOpen size={14} /> {modules.length} module{modules.length === 1 ? '' : 's'}</span>
            <span className="chip">{modules.filter((m) => m.status === 'PUBLISHED').length} published</span>
          </div>

          <div className="mod-list">
            {modules.map((m) => (
              <button key={m.id} type="button" className="mod-item" onClick={() => navigate(`/admin/modules/${m.id}`)}>
                <div>
                  <div className="mod-item-title">{m.title || 'Untitled module'}</div>
                  {m.description && <div className="mod-item-desc">{m.description}</div>}
                  {m.lastSubmittedAt && (
                    <div className="mod-item-activity">Last activity {timeAgo(m.lastSubmittedAt)}</div>
                  )}
                  <div className="mod-item-meta">
                    <span className={`badge ${m.status === 'PUBLISHED' ? 'badge-published' : 'badge-draft'}`}>
                      {m.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                    {m.content && (
                      <span className="chip chip-sm"><FileText size={13} /> Reading content</span>
                    )}
                    {m.sourceDocumentUrl && (
                      <span className="chip chip-sm"><Link2 size={13} /> Source doc</span>
                    )}
                    <span className="muted mod-item-count">
                      {m.questions ? m.questions.length : 0} questions · {m._count?.submissions ?? 0} submissions
                    </span>
                    {m.avgScore !== null && (
                      <span className="badge badge-ok">Avg {Math.round(m.avgScore)}%</span>
                    )}
                  </div>
                  {Array.isArray(m.eligibility) && m.eligibility.length > 0 && (
                    <div className="elig-tags">
                      {m.eligibility.map((rule, i) => (
                        <span key={i} className="badge badge-soft">
                          {specialtyLabel(rule.specialty)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="muted" />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
