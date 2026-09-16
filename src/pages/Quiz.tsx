import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizStore } from '../store/quizStore'

const TIME_PER_QUESTION = 30

export default function Quiz() {
  const navigate = useNavigate()
  const questions = useQuizStore((s) => s.questions)
  const current = useQuizStore((s) => s.currentQuestion)
  const answers = useQuizStore((s) => s.answers)
  const answer = useQuizStore((s) => s.answer)
  const next = useQuizStore((s) => s.next)
  const reset = useQuizStore((s) => s.reset)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)

  useEffect(() => {
    if (questions.length === 0) {
      reset()
      navigate('/')
      return
    }
  }, [questions.length, navigate, reset])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer)
          next()
          return TIME_PER_QUESTION
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [current, next])

  const question = questions[current]
  if (!question) return null

  const selected = answers[current]
  const isLast = current + 1 === questions.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <span>
          Question {current + 1} of {questions.length}
        </span>
        <span
          className={`font-mono font-bold ${timeLeft <= 5 ? 'text-red-500' : ''}`}
        >
          {timeLeft}s
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h2 className="text-2xl font-semibold mb-6">{question.question}</h2>

      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selected === index
          return (
            <button
              key={index}
              onClick={() => answer(index)}
              className={`w-full text-left rounded-xl border-2 px-4 py-3 transition ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => (isLast ? navigate('/results') : next())}
          disabled={selected === undefined && timeLeft > 1}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}