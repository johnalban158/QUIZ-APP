import { useState } from 'react'
import { sampleQuestions } from '../data/questions'
import type { Question } from '../types'

interface DraftQuestion {
  category: string
  question: string
  options: string[]
  correctIndex: number
}

export default function Admin() {
  const [questions, setQuestions] = useState<Question[]>(sampleQuestions)
  const [draft, setDraft] = useState<DraftQuestion>({
    category: 'General',
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
  })
  const [saved, setSaved] = useState(false)

  const updateOption = (index: number, value: string) => {
    const options = [...draft.options]
    options[index] = value
    setDraft({ ...draft, options })
  }

  const addQuestion = () => {
    if (!draft.question || draft.options.some((o) => !o.trim())) return
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      ...draft,
    }
    setQuestions((prev) => [...prev, newQuestion])
    setDraft({ category: 'General', question: '', options: ['', '', '', ''], correctIndex: 0 })
    setSaved(false)
  }

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    setSaved(false)
  }

  const handleSaveAll = () => {
    setSaved(true)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Quiz admin</h1>

      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow mb-10">
        <h2 className="text-xl font-semibold mb-4">Add a question</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Question</label>
            <input
              type="text"
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Options</label>
            <div className="space-y-2">
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={draft.correctIndex === index}
                    onChange={() => setDraft({ ...draft, correctIndex: index })}
                    title={`Mark as correct`}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Select the radio next to the correct answer</p>
          </div>

          <button
            onClick={addQuestion}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Add question
          </button>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Questions ({questions.length})
          </h2>
          <button
            onClick={handleSaveAll}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-white font-semibold hover:bg-green-700 transition"
          >
            Save all
          </button>
        </div>

        {saved && (
          <p className="text-green-600 text-sm mb-4">
            Saved (currently in memory - will connect to backend later)
          </p>
        )}

        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-start gap-4"
            >
              <div>
                <p className="font-medium">{q.question}</p>
                <p className="text-sm text-gray-500 mt-1">{q.category}</p>
              </div>
              <button
                onClick={() => removeQuestion(q.id)}
                className="text-red-500 hover:text-red-700 font-medium text-sm shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}