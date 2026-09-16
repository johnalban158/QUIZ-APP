import { useQuiz } from '../../context/QuizContext'

export default function QuizTypesTab() {
  const { quizTypes, addQuizType, updateQuizType, removeQuizType } = useQuiz()

  return (
    <div className="bank">
      <div className="bank-header">
        <h2 className="admin-heading">Quiz types ({quizTypes.length})</h2>
        <button className="primary-btn add-q-btn" onClick={addQuizType}>
          Add type
        </button>
      </div>

      <p className="admin-sub">
        Types appear in the Player quiz cards and can be assigned to any quiz.
      </p>

      <div className="q-list">
        {quizTypes.map((type) => (
          <div key={type.id} className="card admin-card type-card">
            <div className="type-card-row">
              <span className="type-dot" />
              <input
                className="q-input"
                value={type.name}
                onChange={(e) => updateQuizType(type.id, { name: e.target.value })}
                placeholder="Type name"
              />
            </div>
            <div className="q-card-footer">
              <button className="delete-btn" onClick={() => removeQuizType(type.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}