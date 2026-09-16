import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, XCircle, RotateCcw, LayoutList, Trophy } from 'lucide-react'
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

  return (
    <>
      <Brand right={`${takerName}`} />
      <div className="quiz-shell">
        <div className="card result-card">
          <Trophy size={48} style={{ color: percent >= 70 ? 'var(--ok)' : 'var(--bad)', marginBottom: 12 }} />
          <div className="score-num">{score}/{total}</div>
          <p className="score-pct">{percent}% correct</p>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 24 }}>{moduleTitle}</h2>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/quiz')}>
              <LayoutList size={16} /> All quizzes
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/quiz/${id}`)}>
              <RotateCcw size={16} /> Try again
            </button>
          </div>
        </div>

        {/* breakdown */}
        {Array.isArray(breakdown) && breakdown.length > 0 && (
          <div className="breakdown">
            <h2 style={{ fontSize: '1.2rem', marginBottom: 12 }}>Answer breakdown</h2>
            {breakdown.map((b, i) => (
              <div key={i} className="card" style={{ marginBottom: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className={`br-icon ${b.isCorrect ? 'ok' : 'bad'}`}>
                    {b.isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="br-text">{b.questionText}</div>
                    <div className="br-sub">
                      Your answer: <strong>{b.selectedText}</strong>
                      {!b.isCorrect && b.correctText && (
                        <span className="correct-line"> · Correct: {b.correctText}</span>
                      )}
                    </div>
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