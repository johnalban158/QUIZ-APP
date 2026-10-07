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
  Music,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { api, getToken } from '../../api'
import { SPECIALTIES, extractYouTubeId, normalizeYouTubeUrl, youTubeEmbedUrl } from '../../lib'

const EMPTY_OPTIONS = [
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
]

const YT_URL_ERROR =
  'That doesn’t look like a YouTube video link. Paste a watch link, a youtu.be short link, a /shorts link or an embed link.'

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
  const [generating, setGenerating] = useState(false)
  const [genInfo, setGenInfo] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState(EMPTY_OPTIONS)
  const [adding, setAdding] = useState(false)
  const [addText, setAddText] = useState('')
  const [addOpts, setAddOpts] = useState(EMPTY_OPTIONS)
  const [ytUrl, setYtUrl] = useState('')
  const [videoRequired, setVideoRequired] = useState(false)
  const [ytSaving, setYtSaving] = useState(false)
  const [ytError, setYtError] = useState('')
  const [ytSaved, setYtSaved] = useState(false)
  // The URL hint waits for a blur so a half-typed link isn't scolded mid-keystroke.
  const [ytTouched, setYtTouched] = useState(false)
  const fileRef = useRef(null)
  const mediaRefs = useRef({})
  const [mediaBusyId, setMediaBusyId] = useState(null)
  const [mediaErrorId, setMediaErrorId] = useState(null)
  const [mediaError, setMediaError] = useState('')

  // Reads a video file's duration in the browser with a detached <video>
  // element so we can reject files longer than 10 minutes before uploading.
  const readVideoDuration = (file) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const el = document.createElement('video')
      el.preload = 'metadata'
      const done = (seconds) => {
        URL.revokeObjectURL(url)
        resolve(Number.isFinite(seconds) ? seconds : 0)
      }
      el.onloadedmetadata = () => done(el.duration)
      el.onerror = () => done(0)
      el.src = url
    })

  const formatDuration = (seconds) => {
    const s = Math.max(0, Math.round(seconds))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

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
      setYtUrl(found.youtubeUrl ?? '')
      setVideoRequired(found.videoRequired === true)
      setYtError('')
      setYtSaved(false)
      setYtTouched(false)
      setEligibility(
        (found.eligibility ?? []).map((e) => ({ specialty: e.specialty }))
      )
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  // The video ID is derived from the URL in the box with the same rules the
  // API uses, so the preview always shows exactly what staff will get.
  const ytId = extractYouTubeId(ytUrl)
  const ytBlank = !ytUrl.trim()
  const ytInvalid = !ytBlank && !ytId
  const ytDirty =
    ytUrl.trim() !== (mod?.youtubeUrl ?? '') ||
    videoRequired !== (mod?.videoRequired === true)

  const saveVideo = async () => {
    if (ytInvalid) {
      setYtTouched(true)
      setYtError(YT_URL_ERROR)
      return
    }
    setYtSaving(true)
    setYtError('')
    setYtSaved(false)
    try {
      // Send a link the API can parse: a missing scheme is added here so a
      // "www.youtube.com/watch?v=…" paste saves instead of bouncing.
      const nextUrl = ytUrl.trim() ? normalizeYouTubeUrl(ytUrl) : null
      // A module can only require a video it actually has.
      const nextRequired = Boolean(nextUrl) && videoRequired
      const updated = await api(`/admin/modules/${id}`, {
        method: 'PATCH',
        body: { youtubeUrl: nextUrl, videoRequired: nextRequired },
      })
      setMod((prev) => ({ ...prev, ...(updated ?? {}) }))
      if (updated && Object.prototype.hasOwnProperty.call(updated, 'youtubeUrl')) {
        setYtUrl(updated.youtubeUrl ?? '')
      }
      setVideoRequired(
        updated && typeof updated.videoRequired === 'boolean'
          ? updated.videoRequired
          : nextRequired
      )
      setYtSaved(true)
    } catch (err) {
      setYtError(err.message || 'Could not save the training video — please try again.')
    } finally {
      setYtSaving(false)
    }
  }

  const clearVideo = async () => {
    if (!window.confirm('Remove the training video from this module?')) return
    setYtSaving(true)
    setYtError('')
    setYtSaved(false)
    try {
      const updated = await api(`/admin/modules/${id}`, {
        method: 'PATCH',
        body: { youtubeUrl: null, videoRequired: false },
      })
      setMod((prev) => ({ ...prev, ...(updated ?? {}) }))
      setYtUrl('')
      setVideoRequired(false)
      setYtSaved(true)
    } catch (err) {
      setYtError(err.message || 'Could not remove the training video — please try again.')
    } finally {
      setYtSaving(false)
    }
  }

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
    setGenInfo('')
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
      if (data.parseNote) setGenInfo(data.parseNote)
      else if (data.extractedChars) {
        setGenInfo(`Stored. Extracted ~${data.extractedChars} characters - use “Generate questions” below to create drafts you can edit.`)
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const generateQuestions = async () => {
    setGenerating(true)
    setError('')
    setGenInfo('')
    try {
      const data = await api(`/admin/modules/${id}/questions/generate`, {
        method: 'POST',
        body: { count: 8 },
      })
      setGenInfo(`Generated ${data.count} draft question(s) - review, edit, or delete below.`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
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

  const uploadMedia = async (q, file) => {
    setMediaBusyId(q.id)
    setError('')
    setMediaError('')
    setMediaErrorId(null)
    try {
      // Client-side pre-check: videos over 10 minutes are rejected before
      // any bytes are uploaded (the server enforces the same rule).
      const looksLikeVideo =
        (file.type && file.type.startsWith('video/')) || /\.(mp4|webm|mov|m4v|ogv|mkv)$/i.test(file.name)
      let durationSeconds = null
      if (looksLikeVideo) {
        const duration = await readVideoDuration(file)
        if (duration > 600) {
          throw new Error(
            `Videos must be 10 minutes or shorter (this one is ${formatDuration(duration)}).`
          )
        }
        durationSeconds = duration
      }
      const form = new FormData()
      form.append('file', file)
      // Tell the server how long the video is so it can reject over-long files
      // before spending an upload (server enforces the same 10-minute rule).
      if (durationSeconds !== null && Number.isFinite(durationSeconds) && durationSeconds > 0) {
        form.append('durationSeconds', String(Math.round(durationSeconds)))
      }
      const res = await fetch(`/api/admin/modules/${id}/questions/${q.id}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`)
      setMod((prev) => ({
        ...prev,
        questions: prev.questions.map((item) => (item.id === q.id ? data : item)),
      }))
    } catch (err) {
      setError(err.message)
      setMediaError(err.message)
      setMediaErrorId(q.id)
    } finally {
      setMediaBusyId(null)
    }
  }

  const removeMedia = async (q) => {
    if (!window.confirm('Remove this audio/video from the question?')) return
    setError('')
    setMediaError('')
    setMediaErrorId(null)
    try {
      const updated = await api(`/admin/modules/${id}/questions/${q.id}/media`, { method: 'DELETE' })
      setMod((prev) => ({
        ...prev,
        questions: prev.questions.map((item) => (item.id === q.id ? updated : item)),
      }))
      setMediaBusyId(null)
    } catch (err) {
      setError(err.message)
      setMediaError(err.message)
      setMediaErrorId(q.id)
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

          {/* training video (YouTube) */}
          <div className="editor-section">
            <div className="section-head">
              <span className="section-head-icon"><Video size={18} /></span>
              <div className="section-head-text">
                <h2>Training video (YouTube)</h2>
              </div>
              {mod.videoRequired === true && <span className="badge badge-bad">Required</span>}
            </div>
            <p className="form-hint" style={{ marginBottom: 14 }}>
              Paste a YouTube link and staff see the player at the top of this module. Regular
              watch links, youtu.be short links and /shorts links are all supported.
            </p>

            <div className="field">
              <label htmlFor="yt-url">YouTube link</label>
              <input
                id="yt-url"
                className="input"
                value={ytUrl}
                onChange={(e) => {
                  setYtUrl(e.target.value)
                  setYtError('')
                  setYtSaved(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); saveVideo() }
                }}
                onBlur={() => setYtTouched(true)}
                placeholder="https://www.youtube.com/watch?v=..."
                autoComplete="off"
                spellCheck="false"
                inputMode="url"
              />
            </div>

            {ytTouched && ytInvalid && !ytError && (
              <p className="form-hint yt-preview-note" role="status">{YT_URL_ERROR}</p>
            )}
            {ytError && <div className="form-error" role="alert" style={{ marginTop: 10 }}>{ytError}</div>}

            <div className="check-row">
              <input
                id="yt-required"
                type="checkbox"
                className="input-check"
                checked={videoRequired && Boolean(ytId)}
                disabled={!ytId}
                onChange={(e) => { setVideoRequired(e.target.checked); setYtSaved(false) }}
              />
              <label htmlFor="yt-required">Require video before quiz</label>
            </div>
            {!ytId && (
              <p className="form-hint" style={{ marginTop: 6 }}>
                Add a valid link first — staff are only asked to watch a video that exists.
              </p>
            )}

            <div className="yt-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={saveVideo}
                disabled={ytSaving || ytInvalid || (!ytDirty && !ytBlank)}
              >
                <Check size={15} /> {ytSaving ? 'Saving…' : 'Save video'}
              </button>
              {(ytUrl || mod.youtubeUrl) && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={clearVideo}
                  disabled={ytSaving}
                >
                  <Trash2 size={14} /> Clear video
                </button>
              )}
              {ytSaved && !ytSaving && <span className="form-hint" role="status">Saved</span>}
            </div>

            {ytId ? (
              <div className="yt-preview">
                <div className="video-frame">
                  <iframe
                    src={youTubeEmbedUrl(ytId, 'rel=0')}
                    title="Training video preview"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <p className="form-hint yt-preview-note">Preview · video ID {ytId}</p>
              </div>
            ) : (
              <div className="yt-placeholder">
                <Video size={20} />
                <span className="muted">No training video yet — paste a YouTube link to add one.</span>
              </div>
            )}
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
                onClick={() => setEligibility((prev) => [...prev, { specialty: SPECIALTIES[0].value }])}
              >
                <Plus size={15} /> Add rule
              </button>
            </div>
            <p className="form-hint" style={{ marginBottom: 14 }}>
              Only staff matching a rule's specialty can be assigned this module.
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
              Attach the source material (PDF, DOCX, PPT/PPTX, or TXT, up to 25 MB) this module is based on. After upload you can auto-generate draft questions below.
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
                  accept=".pdf,.docx,.ppt,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,text/plain"
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
            {srcUrl && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={generateQuestions} disabled={generating}>
                  <FileQuestion size={15} /> {generating ? 'Generating…' : 'Generate questions from document'}
                </button>
                {genInfo && <p className="form-hint" style={{ marginTop: 8 }}>{genInfo}</p>}
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
                    <div className="qmedia">
                      {q.mediaType === 'AUDIO' && (
                        <audio src={q.mediaUrl} controls preload="metadata" style={{ width: '100%', height: 40 }} />
                      )}
                      {q.mediaType === 'VIDEO' && (
                        <video src={q.mediaUrl} controls preload="metadata" style={{ width: '100%', maxHeight: 260, borderRadius: 10 }} />
                      )}
                      <div className="qmedia-actions">
                        <input
                          ref={(el) => { mediaRefs.current[q.id] = el }}
                          type="file"
                          accept="audio/*,video/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) await uploadMedia(q, file)
                            if (mediaRefs.current[q.id]) mediaRefs.current[q.id].value = ''
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => mediaRefs.current[q.id]?.click()}
                          disabled={mediaBusyId === q.id}
                        >
                          {q.mediaType === 'AUDIO' ? <Music size={14} /> : q.mediaType === 'VIDEO' ? <Video size={14} /> : <Upload size={14} />}
                          {mediaBusyId === q.id ? 'Uploading…' : q.mediaUrl ? 'Replace audio/video' : 'Add audio/video'}
                        </button>
                        {q.mediaUrl && (
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeMedia(q)} disabled={mediaBusyId === q.id}>
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
                        {q.mediaUrl && (
                          <span className="muted qmedia-type">
                            {q.mediaType === 'AUDIO' ? 'Audio' : 'Video'} attached
                          </span>
                        )}
                        <span className="form-hint">Videos: max 10 minutes (50 MB)</span>
                      </div>
                      {mediaErrorId === q.id && mediaError && (
                        <div className="form-error" role="alert" style={{ marginTop: 8 }}>
                          {mediaError}
                        </div>
                      )}
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