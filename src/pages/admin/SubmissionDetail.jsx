import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
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

  if (error) return <div className="main"><div className="form-error">{error}</div></div>
  if (!sub) return <div className="loading">Loading…</div>

  const pct = sub.total ? Math.round((sub.score / sub.total) * 100) : 0

  return (
    <div>
      <Link to="/admin/submissions" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to submissions
      </Link>

      <div className="sub-detail-head">
        <h1 style={{ marginBottom: 0 }}>{sub.takerName}</h1>
        <span className="muted" style={{ fontSize: '0.9rem' }}>on {sub.module?.title}</span>
        <span className="badge badge-ok" style={{ fontSize: '0.8rem' }}>{sub.score}/{sub.total} ({pct}%)</span>
      </div>

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
    </div>
  )
}