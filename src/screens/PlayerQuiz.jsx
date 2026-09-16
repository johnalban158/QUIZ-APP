import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import Question from '../components/Question'
import ProgressBar from '../components/ProgressBar'

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildSession(quiz) {
  const { questionsPerSession, shuffleQuestions, shuffleAnswers } =
    quiz.settings ?? {}

  let list = [...quiz.questions]
  if (shuffleQuestions) list = shuffle(list)

  const count = Math.min(Math.max(questionsPerSession || 5, 1), list.length)
  list = list.slice(0, count)

  if (shuffleAnswers) {
    list = list.map((q) => {
      const order = shuffle(q.options.map((_, i) => i))
      return {
        ...q,
        options: order.map((i) => q.options[i]),
        correctIndex: order.findIndex((i) => i === q.correctIndex),
      }
    })
  }

  return list
}

export default function PlayerQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { quizzes, playerName, startResult } = useQuiz()

  const quiz = quizzes.find((q) => q.id === id)

  const session = useMemo(() => (quiz ? buildSession(quiz) : []), [quiz])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!quiz) {
      navigate('/play/select', { replace: true })
    }
  }, [quiz, navigate])

  useEffect(() => {
    if (finished) {
      startResult({
        name: playerName,
        score,
        total: session.length,
        quizId: quiz?.id,
        quizTitle: quiz?.title,
      })
      navigate('/play/results')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  if (!quiz || session.length === 0) {
    return (
      <main className="main">
        <header className="brand">
          <span className="brand-logo">?</span> Quiz App
        </header>
        <section className="card empty-state">
          <h2 className="question">No questions in this quiz yet</h2>
          <p className="hint">Ask the admin to add some questions first.</p>
          <button
            className="primary-btn"
            onClick={() => navigate('/play/select')}
          >
            Back to quizzes
          </button>
        </section>
      </main>
    )
  }

  const question = session[currentIndex]
  const showFeedback = quiz.settings?.showAnswerMode !== 'end'

  const handleSelect = (index) => {
    if (selected !== null) return
    setSelected(index)
    if (index === question.correctIndex) {
      setScore((s) => s + 1)
    }
  }

  const next = () => {
    if (currentIndex + 1 === session.length) {
      setFinished(true)
    } else {
      setCurrentIndex((i) => i + 1)
      setSelected(null)
    }
  }

  return (
    <main className="main">
      <header className="brand">
        <span className="brand-logo">?</span> Quiz App
        <span className="brand-sub">{quiz.title}</span>
      </header>

      <ProgressBar current={currentIndex} total={session.length} />

      <Question
        question={question}
        selected={selected}
        onSelect={handleSelect}
        showFeedback={showFeedback}
      />

      {selected !== null && (
        <button className="primary-btn next-btn" onClick={next}>
          {currentIndex + 1 === session.length ? 'See results' : 'Next question'}
        </button>
      )}
    </main>
  )
}