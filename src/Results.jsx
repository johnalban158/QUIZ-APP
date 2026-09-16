export default function Results({ score, total, onRestart }) {
  const percent = total ? Math.round((score / total) * 100) : 0

  return (
    <section className="card result-card">
      <h2 className="results-title">Quiz complete!</h2>
      <p className="score">
        You scored <span className="score-value">{score}</span> out of {total}
      </p>
      <p className="score-percent">{percent}%</p>
      <button className="primary-btn" onClick={onRestart}>
        Restart
      </button>
    </section>
  )
}