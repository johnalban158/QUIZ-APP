import { useQuiz } from '../../context/QuizContext'

export default function QuestionsTab() {
  const { bank, addQuestion, updateQuestion, removeQuestion } = useQuiz()

  return (
    <div className="bank">
      <div className="bank-header">
        <h2 className="admin-heading">Question bank ({bank.length})</h2>
        <button
          className="primary-btn add-q-btn"
          onClick={() => addQuestion()}
        >
          Add question
        </button>
      </div>

      <div className="q-list">
        {bank.map((q) => (
          <div key={q.id} className="card admin-card q-card">
            <input
              className="q-input q-question-input"
              value={q.question}
              onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
              placeholder="Question text"
            />

            {q.options.map((option, oi) => (
              <div key={oi} className="q-option-row">
                <input
                  type="radio"
                  name={q.id}
                  checked={q.correctIndex === oi}
                  onChange={() => updateQuestion(q.id, { correctIndex: oi })}
                  title="Mark as correct"
                  className="q-radio"
                />
                <input
                  className="q-input"
                  value={option}
                  onChange={(e) => {
                    const options = [...q.options]
                    options[oi] = e.target.value
                    updateQuestion(q.id, { options })
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                />
              </div>
            ))}

            <div className="q-card-footer">
              <button
                className="delete-btn"
                onClick={() => removeQuestion(q.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}