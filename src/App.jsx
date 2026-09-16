import { useState } from 'react'
import { questions } from './questions'
import Question from './components/Question'
import ProgressBar from './components/ProgressBar'
import Results from './Results'
import './App.css'

const totalQuestions = questions.length

function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [finished, setFinished] = useState(false)

  const handleSelect = (index) => {
    if (selected !== null) return
    setSelected(index)
    if (index === questions[currentIndex].correctIndex) {
      setScore(score + 1)
    }
  }

  const next = () => {
    if (currentIndex + 1 === totalQuestions) {
      setFinished(true)
    } else {
      setCurrentIndex(currentIndex + 1)
      setSelected(null)
    }
  }

  const restart = () => {
    setCurrentIndex(0)
    setScore(0)
    setSelected(null)
    setFinished(false)
  }

  return (
    <div className="app">
      <header className="brand">
        <span className="brand-logo">?</span> Quiz App
      </header>

      <main className="main">
        {finished ? (
          <Results score={score} total={totalQuestions} onRestart={restart} />
        ) : (
          <>
            <ProgressBar current={currentIndex} total={totalQuestions} />

            <Question
              question={questions[currentIndex]}
              selected={selected}
              onSelect={handleSelect}
            />

            {selected !== null && (
              <button className="primary-btn next-btn" onClick={next}>
                {currentIndex + 1 === totalQuestions
                  ? 'See results'
                  : 'Next question'}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App