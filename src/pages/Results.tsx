import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizStore } from '../store/quizStore'

export default function Results() {
  const navigate = useNavigate()
  const { questions, answers, selectedCategory, reset } = useQuizStore()

  const score = useMemo(
    () => questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0),
    [questions, answers],
  )

  const total = questions.length
  const percent = total ? Math.round((score / total) * 100) : 0

  const goHome = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-sm uppercase tracking-wide text-gray-400">
          {selectedCategory ?? 'All categories'}
        </p>
        <h1 className="text-3xl font-bold mt-2">Your score</h1>
        <p className="text-6xl font-black mt-6 text-indigo-600">
          {score}/{total}
        </p>
        <p className="text-gray-500 mt-2">{percent}% correct</p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const userAnswer = answers[i]
          const isCorrect = userAnswer === q.correctIndex
          return (
            <div
              key={q.id}
              className={`rounded-xl border-2 p-4 ${
                isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
              }`}
            >
              <p className="font-medium">
                {i + 1}. {q.question}
              </p>
              <p className="text-sm mt-2">
                Your answer:{' '}
                {userAnswer !== undefined ? q.options[userAnswer] : 'No answer (time out)'}
              </p>
              {!isCorrect && (
                <p className="text-sm text-green-700">
                  Correct: {q.options[q.correctIndex]}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={goHome}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}