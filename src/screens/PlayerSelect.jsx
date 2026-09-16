import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'

export default function PlayerSelect() {
  const navigate = useNavigate()
  const { quizzes, playerName, getTypeName } = useQuiz()

  return (
    <main className="main player-select-main">
      <header className="brand">
        <span className="brand-logo">?</span> Quiz App
      </header>

      <header className="page-heading">
        <h1 className="page-title">
          Hi, {playerName || 'player'}! Pick a quiz
        </h1>
        <p className="page-sub">Choose one to get started.</p>
      </header>

      <div className="quiz-grid">
        {quizzes.map((quiz) => (
          <button
            key={quiz.id}
            className="quiz-card"
            onClick={() => navigate(`/play/quiz/${quiz.id}`)}
          >
            <div className="quiz-card-top">
              <span className="quiz-badge quiz-badge-type">
                {getTypeName(quiz.type)}
              </span>
              <span className="quiz-badge quiz-badge-count">
                {quiz.questions.length} Qs
              </span>
            </div>
            <h2 className="quiz-card-title">{quiz.title || 'Untitled quiz'}</h2>
            <p className="quiz-card-meta">by {quiz.createdBy}</p>
          </button>
        ))}
      </div>
    </main>
  )
}