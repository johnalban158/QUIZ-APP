import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { api } from '../../api'

const EMPTY_OPTIONS = [
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
]

export default function ModuleEditor() {
  const { id } = useParams()
  const [mod, setMod] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState(EMPTY_OPTIONS)
  const [adding, setAdding] = useState(false)
  const [addText, setAddText] = useState('')
  const [addOpts, setAddOpts] = useState(EMPTY_OPTIONS)

  const load = async () => {
    try {
      const data = await api('/admin/modules')
      const found = data.find((m) => m.id === id)
      if (!found) { setError('Module not found'); return }
      setMod(found)
      setTitle(found.title)
      setDescription(found.description)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const saveMeta = async () => {
    setError('')
    try {
      const updated = await api(`/admin/modules/${id}`, {
        method: 'PATCH',
        body: { title, description },
      })
      setMod((prev) => ({ ...prev, ...updated }))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleStatus = async () => {
    setError('')
    const next = mod.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      const updated = await api(`/admin/modules/${id}`, { method: 'PATCH', body: { status: next } })
      setMod((prev) => ({ ...prev, ...updated }))
    } catch (err) {
      setError(err.message)
    }
  }

  const reorder = async (qid, dir) => {
    const qs = [...mod.questions]
    const idx = qs.findIndex((q) => q.id === qid)
    const target = idx + dir
    if (target < 0 || target >= qs.length) return
    ;[qs[idx], qs[target]] = [qs[target], qs[idx]]
    try {
      await api(`/admin/modules/${id}/questions/reorder`, {
        method: 'PATCH',
        body: { order: qs.map((q) => q.id) },
      })
      setMod((prev) => ({ ...prev, questions: qs }))
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (q) => {
    setEditingId(q.id)
    setEditText(q.text)
    setEditOpts(q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })))
  }

  const saveEdit = async () => {
    setError('')
    try {
      const updated = await api(`/admin/modules/${id}/questions/${editingId}`, {
        method: 'PUT',
        body: { text: editText, options: editOpts },
      })
      setMod((prev) => ({
        ...prev,
        questions: prev.questions.map((q) => (q.id === editingId ? updated : q)),
      }))
      setEditingId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const addQuestion = async () => {
    setError('')
    try {
      const created = await api(`/admin/modules/${id}/questions`, {
        method: 'POST',
        body: { text: addText, options: addOpts },
      })
      setMod((prev) => ({ ...prev, questions: [...prev.questions, created] }))
      setAdding(false)
      setAddText('')
      setAddOpts(EMPTY_OPTIONS)
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteQuestion = async (qid) => {
    if (!window.confirm('Delete this question?')) return
    setError('')
    try {
      await api(`/admin/modules/${id}/questions/${qid}`, { method: 'DELETE' })
      await load()
      setEditingId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!mod && !error) return <div className="loading">Loading…</div>

  return (
    <>
      <Link to="/admin" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to modules
      </Link>

      {error && <div className="form-error">{error}</div>}

      {mod && (
        <div className="editor">
          {/* meta */}
          <div className="editor-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 style={{ marginBottom: 0 }}>Module details</h2>
              <div className="status-switch">
                <button className={mod.status === 'DRAFT' ? 'on' : ''} onClick={toggleStatus}>Draft</button>
                <button className={mod.status === 'PUBLISHED' ? 'on' : ''} onClick={toggleStatus}>Published</button>
              </div>
            </div>
            <div className="field">
              <label>Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveMeta} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveMeta} placeholder="Optional description" />
            </div>
          </div>

          {/* questions */}
          <div className="editor-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ marginBottom: 0 }}>Questions ({mod.questions.length})</h2>
              {!adding && (
                <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
                  <Plus size={15} /> Add question
                </button>
              )}
            </div>

            {/* add form */}
            {adding && (
              <div className="qcard editing">
                <div className="field">
                  <label>Question text</label>
                  <input className="input" value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="Enter question…" />
                </div>
                {addOpts.map((opt, i) => (
                  <div key={i} className="opt-edit-row" style={{ marginBottom: 8 }}>
                    <span className="opt-letter" style={{ width: 22 }}>{String.fromCharCode(65 + i)}</span>
                    <input
                      className="input"
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...addOpts]
                        next[i] = { ...next[i], text: e.target.value }
                        setAddOpts(next)
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                    <button
                      className={`mark-btn ${opt.isCorrect ? 'on' : ''}`}
                      onClick={() => {
                        const next = addOpts.map((o, j) => ({ ...o, isCorrect: j === i }))
                        setAddOpts(next)
                      }}
                    >
                      <Check size={12} /> Correct
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={addQuestion}>Save question</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setError('') }}>Cancel</button>
                </div>
              </div>
            )}

            {mod.questions.length === 0 && !adding && (
              <div className="empty" style={{ padding: '24px 0' }}>
                <p>No questions yet. Click “Add question” to begin.</p>
              </div>
            )}

            {mod.questions.map((q, i) => (
              <div key={q.id} className={`qcard ${editingId === q.id ? 'editing' : ''}`}>
                {editingId === q.id ? (
                  <>
                    <div className="field">
                      <label>Question text</label>
                      <input className="input" value={editText} onChange={(e) => setEditText(e.target.value)} />
                    </div>
                    {editOpts.map((opt, j) => (
                      <div key={j} className="opt-edit-row" style={{ marginBottom: 8 }}>
                        <span className="opt-letter" style={{ width: 22 }}>{String.fromCharCode(65 + j)}</span>
                        <input
                          className="input"
                          value={opt.text}
                          onChange={(e) => {
                            const next = [...editOpts]
                            next[j] = { ...next[j], text: e.target.value }
                            setEditOpts(next)
                          }}
                        />
                        <button
                          className={`mark-btn ${opt.isCorrect ? 'on' : ''}`}
                          onClick={() => {
                            const next = editOpts.map((o, k) => ({ ...o, isCorrect: k === j }))
                            setEditOpts(next)
                          }}
                        >
                          <Check size={12} /> Correct
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="qcard-top">
                      <span className="qcard-num">{i + 1}</span>
                      <span className="qcard-text">{q.text}</span>
                      <span className="qcard-actions">
                        <button className="icon-btn" title="Move up" onClick={() => reorder(q.id, -1)} disabled={i === 0}><ArrowUp size={15} /></button>
                        <button className="icon-btn" title="Move down" onClick={() => reorder(q.id, 1)} disabled={i === mod.questions.length - 1}><ArrowDown size={15} /></button>
                        <button className="icon-btn" title="Edit" onClick={() => startEdit(q)}><Pencil size={15} /></button>
                        <button className="icon-btn danger" title="Delete" onClick={() => deleteQuestion(q.id)}><Trash2 size={15} /></button>
                      </span>
                    </div>
                    <div className="opt-list">
                      {q.options.map((opt) => (
                        <div key={opt.id} className={`opt-row ${opt.isCorrect ? 'correct' : ''}`}>
                          <span className="opt-letter">{opt.text ? opt.text[0].toUpperCase() : '?'}</span>
                          <span className="opt-text">{opt.text}</span>
                          {opt.isCorrect && <span className="badge badge-ok" style={{ marginLeft: 'auto' }}>Correct</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}