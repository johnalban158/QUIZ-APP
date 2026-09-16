import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import Question from '../components/Question'
import ProgressBar from '../components/ProgressBar'
import Results from '../Results'

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function Player() {
  const { bank, settings } = useQuiz()

  const session = useMemo(() => {
    let list = [...bank]
    if (settings.shuffleQuestions) list = shuffle(list)

    const count = Math.min(Math.max(settings.perSession || 5, 1), list.length)
    list = list.slice(0, count)

    if (settings.shuffleAnswers) {
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
  }, [bank, settings.shuffleQuestions, settings.shuffleAnswers, settings.perSession])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [finished, setFinished] = useState(false)

  if (session.length === 0) {
    return (
      <main className="main">
        <header className="brand">
          <span className="brand-logo">?</span> Quiz App
        </header>
        <section className="card empty-state">
          <h2 className="question">No questions yet</h2>
          <p className="hint">Add some questions in the Admin panel first.</p>
          <Link to="/admin" className="primary-btn">
            Go to Admin
          </Link>
        </section>
      </main>
    )
  }

  if (
    finished ||
    currentIndex >= session.length
  ) {
    return (
      <main className="main">
        <header className="brand">
          <span className="brand-logo">?</span> Quiz App
        </header>
        <Results
          score={score}
          total={session.length}
          onRestart={() => {
            setCurrentIndex(0)
            setScore(0)
            setSelected(null)
            setFinished(false)
          }}
        />
      </main>
    )
  }

  const question = session[currentIndex]

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
      </header>

      <ProgressBar current={currentIndex} total={session.length} />

      <Question
        question={question}
        selected={selected}
        onSelect={handleSelect}
      />

      {selected !== null && (
        <button className="primary-btn next-btn" onClick={next}>
          {currentIndex + 1 === session.length ? 'See results' : 'Next question'}
        </button>
      )}
    </main>
  )
}