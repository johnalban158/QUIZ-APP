import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CheckCircle, FileQuestion, XCircle } from 'lucide-react'
import { api } from '../../api'

export default function SubmissionDetail() {
  const { id } = useParams()
  const [sub, setSub] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      setError('')
      try {
        setSub(await api(`/admin/submissions/${id}`))
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [id])

  if (error) {
    return (
      <div>
        <Link to="/admin/submissions" className="back-link">
          <ArrowLeft size={16} /> Back to submissions
        </Link>
        <div className="card empty">
          <span className="empty-icon"><FileQuestion size={20} /></span>
          <h3>Submission not found</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!sub) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading…
      </div>
    )
  }

  const pct = sub.total ? Math.round((sub.score / sub.total) * 100) : 0

  return (
    <div>
      <Link to="/admin/submissions" className="back-link">
        <ArrowLeft size={16} /> Back to submissions
      </Link>

      <div className="sub-head">
        <span className="avatar avatar-lg">{(sub.takerName || '?')[0].toUpperCase()}</span>
        <div className="sub-head-text">
          <h1 style={{ marginBottom: 0 }}>{sub.takerName}</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>on {sub.module?.title ?? '—'}</p>
        </div>
        <div className="sub-head-meta">
          <span className={`badge ${pct >= 70 ? 'badge-ok' : 'badge-bad'}`} style={{ fontSize: '0.82rem' }}>
            {sub.score}/{sub.total} · {pct}%
          </span>
          {sub.submittedAt && (
            <span className="muted sub-date">
              <CalendarDays size={13} /> {new Date(sub.submittedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {sub.answers && sub.answers.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Question</th>
                <th>Answer given</th>
                <th>Correct answer</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {sub.answers.map((a, i) => (
                <tr key={a.id}>
                  <td className="muted">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{a.question?.text ?? '—'}</td>
                  <td>{a.selectedOption?.text ?? '—'}</td>
                  <td style={{ color: 'var(--ok)', fontWeight: 500 }}>
                    {a.question?.options?.find((o) => o.isCorrect)?.text ?? '—'}
                  </td>
                  <td>
                    {a.isCorrect
                      ? <CheckCircle size={18} style={{ color: 'var(--ok)' }} />
                      : <XCircle size={18} style={{ color: 'var(--bad)' }} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty">
          <span className="empty-icon"><FileQuestion size={20} /></span>
          <h3>No answers recorded</h3>
          <p>This submission doesn't have any answers.</p>
        </div>
      )}
    </div>
  )
}