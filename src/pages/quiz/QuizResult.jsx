import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Award, CheckCircle, LayoutList, RotateCcw, Trophy, XCircle } from 'lucide-react'
import Brand from '../../components/Brand'

export default function QuizResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()

  if (!state) {
    navigate(`/quiz/${id}`, { replace: true })
    return null
  }

  const { score, total, percent, moduleTitle, takerName, breakdown } = state
  const pct = Math.round(percent)

  let verdict
  if (percent >= 80) verdict = { title: 'Excellent work!', icon: Trophy, color: 'var(--ok)' }
  else if (percent >= 50) verdict = { title: 'Good job!', icon: Award, color: 'var(--ok)' }
  else verdict = { title: 'Keep practicing', icon: Award, color: 'var(--bad)' }

  const VerdictIcon = verdict.icon
  const ringDeg = `${Math.round((pct / 100) * 360)}deg`

  return (
    <>
      <Brand back="/quiz" backLabel="All quizzes" right={takerName} />
      <div className="quiz-shell">
        <div className="card result-card">
          <div className="ring" style={{ '--ring-deg': ringDeg }}>
            <div className="ring-inner">
              <div className="score-num">{score}/{total}</div>
              <div className="score-pct">{pct}% correct</div>
            </div>
          </div>

          <h2 className="result-verdict" style={{ color: verdict.color }}>
            <VerdictIcon size={20} style={{ verticalAlign: -3, marginRight: 6 }} />
            {verdict.title}
          </h2>
          <p className="result-msg">{moduleTitle}</p>

          <div className="result-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/quiz')}>
              <LayoutList size={16} /> All quizzes
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/quiz/${id}`)}>
              <RotateCcw size={16} /> Try again
            </button>
          </div>
        </div>

        {Array.isArray(breakdown) && breakdown.length > 0 && (
          <div className="breakdown">
            <h2 className="breakdown-title">Answer breakdown</h2>
            {breakdown.map((b, i) => (
              <div key={i} className="card br-card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className={`br-num ${b.isCorrect ? 'ok' : 'bad'}`}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="br-text">{b.questionText}</div>
                    <div className="br-sub">
                      Your answer: <strong>{b.selectedText}</strong>
                      {!b.isCorrect && b.correctText && (
                        <span className="correct-line"> · Correct: {b.correctText}</span>
                      )}
                    </div>
                  </div>
                  <div className={`br-icon ${b.isCorrect ? 'ok' : 'bad'}`}>
                    {b.isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}