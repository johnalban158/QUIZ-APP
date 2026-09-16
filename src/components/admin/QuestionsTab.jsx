import { useQuiz } from '../../context/QuizContext'

export default function QuestionsTab() {
  const { activeQuiz, addQuestionToActive, updateQuestionInActive, removeQuestionFromActive } =
    useQuiz()

  if (!activeQuiz) return null

  return (
    <div className="bank">
      <div className="bank-header">
        <h2 className="admin-heading">
          Questions ({activeQuiz.questions.length})
        </h2>
        <button className="primary-btn add-q-btn" onClick={addQuestionToActive}>
          Add question
        </button>
      </div>

      <div className="q-list">
        {activeQuiz.questions.map((q) => (
          <div key={q.id} className="card admin-card q-card">
            <input
              className="q-input q-question-input"
              value={q.question}
              onChange={(e) =>
                updateQuestionInActive(q.id, { question: e.target.value })
              }
              placeholder="Question text"
            />

            {q.options.map((option, oi) => (
              <div key={oi} className="q-option-row">
                <input
                  type="radio"
                  name={q.id}
                  checked={q.correctIndex === oi}
                  onChange={() =>
                    updateQuestionInActive(q.id, { correctIndex: oi })
                  }
                  title="Mark as correct"
                  className="q-radio"
                />
                <input
                  className="q-input"
                  value={option}
                  onChange={(e) => {
                    const options = [...q.options]
                    options[oi] = e.target.value
                    updateQuestionInActive(q.id, { options })
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                />
              </div>
            ))}

            <div className="q-card-footer">
              <button
                className="delete-btn"
                onClick={() => removeQuestionFromActive(q.id)}
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