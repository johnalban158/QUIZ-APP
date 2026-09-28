import { useState } from 'react'
import { Bug, Check, Send, X } from 'lucide-react'
import { api } from '../api'

const CATEGORIES = [
  { value: 'BUG', label: 'Bug — something is broken' },
  { value: 'CONTENT', label: 'Content — a question is wrong' },
  { value: 'GENERAL', label: 'General question' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'OTHER', label: 'Other' },
]

const MAX = 5000

export default function ReportBug() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('BUG')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const close = () => {
    setOpen(false)
    setError('')
    setSending(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      await api('/report-bug', {
        method: 'POST',
        body: {
          message: text,
          category,
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
        },
      })
      setSent(true)
      setMessage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button type="button" className="admin-report" onClick={() => { setOpen(true); setSent(false) }}>
        <Bug size={16} /> Report a bug
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => !sending && close()}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2 className="modal-title">Report a problem</h2>
                <p className="page-sub">This goes straight to the app owner.</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={close}>
                <X size={18} />
              </button>
            </div>

            {sent ? (
              <>
                <div className="empty">
                  <span className="empty-icon"><Check size={20} /></span>
                  <h3>Thanks — report sent</h3>
                  <p>We&apos;ll take a look. You can close this.</p>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-primary" onClick={close}>Close</button>
                </div>
              </>
            ) : (
              <form onSubmit={submit}>
                {error && <div className="form-error">{error}</div>}

                <div className="field">
                  <label htmlFor="bug-category">Type of report</label>
                  <select
                    id="bug-category"
                    className="select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="bug-message">What happened?</label>
                  <textarea
                    id="bug-message"
                    className="textarea"
                    rows={6}
                    maxLength={MAX}
                    required
                    placeholder="Tell us what you were doing and what went wrong…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="field-hint">
                    {message.length} / {MAX} characters
                  </p>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={close} disabled={sending}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
                    <Send size={15} /> {sending ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
