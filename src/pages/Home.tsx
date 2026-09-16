import { useNavigate } from 'react-router-dom'
import { categories, sampleQuestions } from '../data/questions'
import { useQuizStore } from '../store/quizStore'

export default function Home() {
  const navigate = useNavigate()
  const setQuestions = useQuizStore((s) => s.setQuestions)
  const selectCategory = useQuizStore((s) => s.selectCategory)

  const startQuiz = (category: string | null) => {
    const pool = category
      ? sampleQuestions.filter((q) => q.category === category)
      : sampleQuestions
    selectCategory(category)
    setQuestions(pool)
    navigate('/quiz')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold text-center mb-2">Quiz App</h1>
      <p className="text-center text-gray-500 mb-10">
        Test your knowledge. Pick a category and go.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => startQuiz(null)}
          className="rounded-xl bg-indigo-600 p-6 text-left text-white shadow hover:bg-indigo-700 transition"
        >
          <span className="text-lg font-semibold">All Questions</span>
          <p className="text-indigo-200 text-sm mt-1">{sampleQuestions.length} questions</p>
        </button>

        {categories.map((category) => (
          <button
            key={category}
            onClick={() => startQuiz(category)}
            className="rounded-xl bg-white p-6 text-left shadow hover:shadow-md transition border border-gray-200"
          >
            <span className="text-lg font-semibold">{category}</span>
            <p className="text-gray-500 text-sm mt-1">
              {sampleQuestions.filter((q) => q.category === category).length} questions
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}