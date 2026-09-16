import { Link } from 'react-router-dom'

export default function Gateway() {
  return (
    <main className="main gateway">
      <div className="gateway-hero">
        <div className="gateway-badge">
          <span className="gateway-badge-mark">?</span>
        </div>
        <p className="gateway-kicker">Quiz platform</p>
        <h1 className="gateway-title">Quiz App</h1>
        <p className="gateway-tagline">
          Test knowledge, run challenges, track scores.
        </p>
      </div>

      <div className="gateway-actions">
        <Link to="/admin" className="gateway-btn gateway-admin">
          <span className="gateway-btn-label">Log in as Admin</span>
          <span className="gateway-arrow" aria-hidden="true">
            →
          </span>
        </Link>

        <Link to="/play/name" className="gateway-btn gateway-play">
          <span className="gateway-btn-label">Take a quiz</span>
          <span className="gateway-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>

      <p className="gateway-footnote">Admin builds quizzes · Players answer them</p>
    </main>
  )
}