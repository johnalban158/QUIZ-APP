import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ClipboardList,
  FileQuestion,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, getToken } from '../../api'
import { SPECIALTIES } from '../../lib'

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
  const [content, setContent] = useState('')
  const [eligibility, setEligibility] = useState([])
  const [eligSaving, setEligSaving] = useState(false)
  const [srcUrl, setSrcUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState(EMPTY_OPTIONS)
  const [adding, setAdding] = useState(false)
  const [addText, setAddText] = useState('')
  const [addOpts, setAddOpts] = useState(EMPTY_OPTIONS)
  const fileRef = useRef(null)

  const load = async () => {
    try {
      const data = await api('/admin/modules')
      const found = data.find((m) => m.id === id)
      if (!found) { setError('Module not found'); return }
      setMod(found)
      setTitle(found.title)
      setDescription(found.description ?? '')
      setContent(found.content ?? '')
      setSrcUrl(found.sourceDocumentUrl ?? '')
      setEligibility(
        (found.eligibility ?? []).map((e) => ({ specialty: e.specialty, state: e.state ?? '' }))
      )
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

  const saveContent = async () => {
    setError('')
    try {
      const updated = await api(`/admin/modules/${id}`, { method: 'PATCH', body: { content } })
      setMod((prev) => ({ ...prev, ...updated }))
    } catch (err) {
      setError(err.message)
    }
  }

  const saveEligibility = async () => {
    setEligSaving(true)
    setError('')
    try {
      const payload = eligibility.map((r) => ({
        specialty: r.specialty,
        state: (r.state || '').trim().toUpperCase(),
      }))
      const updated = await api(`/admin/modules/${id}`, { method: 'PATCH', body: { eligibility: payload } })
      setMod((prev) => ({ ...prev, ...updated }))
    } catch (err) {
      setError(err.message)
    } finally {
      setEligSaving(false)
    }
  }

  const uploadSource = async (file) => {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/admin/modules/${id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`)
      setSrcUrl(data.url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const removeSource = async () => {
    if (!window.confirm('Remove the uploaded source document?')) return
    setError('')
    try {
      await api(`/admin/modules/${id}/upload`, { method: 'DELETE' })
      setSrcUrl('')
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

  if (!mod && !error) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading…
      </div>
    )
  }

  return (
    <div>
      <Link to="/admin/modules" className="back-link">
        <ArrowLeft size={16} /> Back to content library
      </Link>

      {error && <div className="form-error">{error}</div>}

      {mod && (
        <div className="editor">
          {/* meta */}
          <div className="editor-section">
            <div className="section-head">
              <span className="section-head-icon"><ClipboardList size={18} /></span>
              <div className="section-head-text">
                <h2>Module details</h2>
              </div>
              <div className="status-switch" aria-label={`Module status: ${mod.status === 'PUBLISHED' ? 'Published' : 'Draft'}`}>
                <button type="button" className={mod.status === 'DRAFT' ? 'on' : ''} onClick={toggleStatus}>Draft</button>
                <button type="button" className={mod.status === 'PUBLISHED' ? 'on' : ''} onClick={toggleStatus}>Published</button>
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

          {/* reading content */}
          <div className="editor-section">
            <div className="section-head">
              <span className="section-head-icon"><FileQuestion size={18} /></span>
              <div className="section-head-text">
                <h2>Reading content</h2>
              </div>
            </div>
            <textarea
              className="textarea"
              style={{ minHeight: 160 }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={saveContent}
              placeholder="What staff should read before taking the quiz? Saved automatically when you leave this box."
            />
            <p className="form-hint" style={{ marginTop: 6 }}>
              Shown on the “Read before you start” screen at the beginning of the quiz flow.
            </p>
          </div>

          {/* eligibility rules */}
          <div className="editor-section">
            <div className="section-head">
              <span className="section-head-icon"><ClipboardList size={18} /></span>
              <div className="section-head-text">
                <h2>Eligibility rules</h2>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEligibility((prev) => [...prev, { specialty: SPECIALTIES[0].value, state: '' }])}
              >
                <Plus size={15} /> Add rule
              </button>
            </div>
            <p className="form-hint" style={{ marginBottom: 14 }}>
              Only staff matching a rule's specialty (and state, unless “All states” is checked) can be assigned this module.
            </p>

            {eligibility.length === 0 ? (
              <div className="empty" style={{ padding: '18px 0' }}>
                <p className="muted">No eligibility rules yet — this module won't be assignable to any staff until you add one.</p>
              </div>
            ) : (
              <div className="rule-list">
                {eligibility.map((rule, i) => (
                  <div className="rule-row" key={i}>
                    <select
                      className="select"
                      value={rule.specialty}
                      onChange={(e) =>
                        setEligibility((prev) => prev.map((r, j) => (j === i ? { ...r, specialty: e.target.value } : r)))
                      }
                    >
                      {SPECIALTIES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <input
                      className="input"
                      value={rule.state}
                      disabled={rule.state === ''}
                      placeholder="State (e.g. NJ)"
                      onChange={(e) =>
                        setEligibility((prev) => prev.map((r, j) => (j === i ? { ...r, state: e.target.value.toUpperCase() } : r)))
                      }
                    />
                    <label className="rule-all">
                      <input
                        type="checkbox"
                        checked={rule.state === ''}
                        onChange={(e) =>
                          setEligibility((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, state: e.target.checked ? '' : r.state || '' } : r))
                          )
                        }
                      />
                      All states
                    </label>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Remove rule"
                      aria-label="Remove rule"
                      onClick={() => setEligibility((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {eligibility.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={saveEligibility} disabled={eligSaving} style={{ marginTop: 14 }}>
                <Check size={15} /> {eligSaving ? 'Saving…' : 'Save eligibility'}
              </button>
            )}
          </div>

          {/* source document */}
          <div className="editor-section">
            <div className="section-head">
              <span className="section-head-icon"><Link2 size={18} /></span>
              <div className="section-head-text">
                <h2>Source document</h2>
              </div>
            </div>
            <p className="form-hint" style={{ marginBottom: 14 }}>
              Attach the source material (PDF, DOCX, or TXT, up to 10 MB) this module is based on.
            </p>

            {srcUrl ? (
              <div className="file-chip">
                <Link2 size={16} />
                <span className="file-chip-name">{srcUrl.split('/').pop()}</span>
                <a className="btn btn-ghost btn-sm" href={srcUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button className="btn btn-danger btn-sm" onClick={removeSource}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            ) : (
              <div className="file-pick">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await uploadSource(file)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload size={15} /> {uploading ? 'Uploading…' : 'Choose & upload'}
                </button>
              </div>
            )}
          </div>

          {/* questions */}
          <div className="editor-section">
            <div className="section-head" style={{ marginBottom: 18 }}>
              <span className="section-head-icon"><FileQuestion size={18} /></span>
              <div className="section-head-text">
                <h2>Questions ({mod.questions.length})</h2>
              </div>
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
                      type="button"
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
                          type="button"
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
                        <button type="button" className="icon-btn" title="Move up" aria-label="Move question up" onClick={() => reorder(q.id, -1)} disabled={i === 0}><ArrowUp size={15} /></button>
                        <button type="button" className="icon-btn" title="Move down" aria-label="Move question down" onClick={() => reorder(q.id, 1)} disabled={i === mod.questions.length - 1}><ArrowDown size={15} /></button>
                        <button type="button" className="icon-btn" title="Edit" aria-label="Edit question" onClick={() => startEdit(q)}><Pencil size={15} /></button>
                        <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete question" onClick={() => deleteQuestion(q.id)}><Trash2 size={15} /></button>
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
    </div>
  )
}