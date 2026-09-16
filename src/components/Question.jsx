export default function Question({ question, selected, onSelect, showFeedback = true }) {
  const isAnswered = selected !== null
  const reveal = showFeedback && isAnswered
  const isCorrect = selected === question.correctIndex

  return (
    <section className="card">
      <h2 className="question">{question.question}</h2>

      <div className="options">
        {question.options.map((option, index) => {
          let optionClass = 'option'
          if (reveal) {
            if (index === question.correctIndex) {
              optionClass += ' option-correct'
            } else if (index === selected) {
              optionClass += ' option-incorrect'
            } else {
              optionClass += ' option-dimmed'
            }
          } else if (isAnswered) {
            optionClass += ' option-dimmed'
          }
          return (
            <button
              key={index}
              className={optionClass}
              disabled={isAnswered}
              onClick={() => onSelect(index)}
            >
              <span className="option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      {reveal && (
        <p className="hint">
          {isCorrect
            ? 'Correct! Nice job.'
            : `Oops. Correct answer: ${question.options[question.correctIndex]}`}
        </p>
      )}
    </section>
  )
}