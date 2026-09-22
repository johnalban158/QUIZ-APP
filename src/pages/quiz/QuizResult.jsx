import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { Award, CheckCircle, LayoutList, RotateCcw, Trophy, XCircle } from 'lucide-react'
import Brand from '../../components/Brand'
import CelebrationBlobs from '../../assets/illustrations/CelebrationBlobs'
import { useAuth } from '../../context/AuthContext'

export default function QuizResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state } = useLocation()

  if (!state) {
    navigate(`/quiz/${id}`, { replace: true })
    return null
  }

  const {
    score,
    total,
    percent,
    moduleTitle,
    takerName,
    breakdown,
    passed,
    completionRecorded,
  } = state
  const pct = Math.round(percent)

  const passedState = passed === true
  let verdict
  if (passedState) {
    verdict = {
      title: 'You passed!',
      icon: Trophy,
      color: 'var(--ok)',
      message: 'Nice work — this is recorded in your staff member\u2019s training plan.',
    }
  } else {
    verdict = {
      title: 'Keep practicing',
      icon: Award,
      color: 'var(--bad)',
      message: 'Don\u2019t worry — review the correct answers below and try again when you\u2019re ready.',
    }
  }

  const VerdictIcon = verdict.icon
  const ringDeg = `${Math.round((pct / 100) * 360)}deg`

  return (
    <>
      <Brand back="/quiz" backLabel="All quizzes" right={takerName} />
      <div className="stage-decor" aria-hidden="true">
        <CelebrationBlobs />
      </div>
      <div className="quiz-shell">
        <div className="card result-card">
          <div
            className="ring"
            style={{
              '--ring-deg': ringDeg,
              background: `conic-gradient(${passedState ? 'var(--ok)' : 'var(--bad)'} var(--ring-deg), var(--surface-2) 0deg)`,
            }}
          >
            <div className="ring-inner">
              <div className="score-num">{score}/{total}</div>
              <div className="score-pct">{pct}% correct</div>
            </div>
          </div>

          <h2
            className={`result-verdict ${passedState ? 'result-pass' : 'result-fail'}`}
            style={{ color: verdict.color }}
            aria-live="polite"
          >
            <VerdictIcon size={26} style={{ verticalAlign: -4, marginRight: 8 }} />
            {verdict.title}
          </h2>
          <p className="result-summary">
            You answered {score} out of {total} questions correctly.
          </p>
          <p className="result-msg">{verdict.message}</p>
          <p className="result-msg muted">{moduleTitle}</p>

          <div className="result-credit">
            {passedState && completionRecorded ? (
              <span className="badge badge-ok">
                <CheckCircle size={15} /> Completion recorded for your staff member
              </span>
            ) : !passedState ? (
              <span className="badge badge-bad">
                <XCircle size={15} /> No credit recorded — a passing score is needed
              </span>
            ) : (
              <span className="badge badge-draft">Completion pending</span>
            )}
          </div>

          <div className="result-actions">
            {user?.role === 'STAFF' ? (
              <Link to="/staff" className="btn btn-primary">
                <LayoutList size={18} /> Back to my training
              </Link>
            ) : (
              <button className="btn btn-ghost" onClick={() => navigate('/quiz')}>
                <LayoutList size={18} /> All quizzes
              </button>
            )}
            <button className="btn btn-orange" onClick={() => navigate(`/quiz/${id}`)}>
              <RotateCcw size={18} /> Try again
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
                    {b.isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
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