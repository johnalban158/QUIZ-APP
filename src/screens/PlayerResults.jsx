import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'

export default function PlayerResults() {
  const navigate = useNavigate()
  const { result } = useQuiz()

  useEffect(() => {
    if (!result) {
      navigate('/play/select', { replace: true })
    }
  }, [result, navigate])

  if (!result) return null

  const percent = result.total ? Math.round((result.score / result.total) * 100) : 0

  return (
    <main className="main">
      <header className="brand">
        <span className="brand-logo">?</span> Quiz App
      </header>

      <section className="card result-card">
        <h2 className="results-title">Quiz complete!</h2>
        <p className="results-name">{result.name}</p>
        <p className="results-quiz">{result.quizTitle}</p>
        <p className="score">
          You scored <span className="score-value">{result.score}</span> out of{' '}
          {result.total}
        </p>
        <span className="score-percent">{percent}%</span>

        <div className="results-actions">
          <button
            className="primary-btn"
            onClick={() => navigate('/play/select')}
          >
            Play another quiz
          </button>
          <button
            className="secondary-btn"
            onClick={() => navigate(`/play/quiz/${result.quizId}`)}
          >
            Restart
          </button>
        </div>
      </section>
    </main>
  )
}