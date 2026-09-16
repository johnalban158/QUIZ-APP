export default function ProgressBar({ current, total }) {
  const percent = Math.round(((current + 1) / total) * 100)

  return (
    <div className="progress-wrap">
      <div className="progress-info">
        <span>
          Question {current + 1} of {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}