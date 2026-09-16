import { Link } from 'react-router-dom'

export default function Gateway() {
  return (
    <main className="main gateway">
      <header className="brand">
        <span className="brand-logo">?</span> Quiz App
      </header>

      <div className="gateway-card">
        <p className="gateway-title">Who are you?</p>

        <Link to="/admin" className="gateway-btn gateway-admin">
          Admin
        </Link>
        <Link to="/play/name" className="gateway-btn gateway-play">
          Player
        </Link>
      </div>
    </main>
  )
}