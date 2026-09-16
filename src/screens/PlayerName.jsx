import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'

export default function PlayerName() {
  const navigate = useNavigate()
  const { setPlayerName } = useQuiz()
  const [name, setName] = useState('')

  const canContinue = name.trim().length > 0

  const handleContinue = () => {
    if (!canContinue) return
    setPlayerName(name.trim())
    navigate('/play/select')
  }

  return (
    <main className="main player-name-main">
      <header className="brand">
        <span className="brand-logo">?</span> Quiz App
      </header>

      <section className="card player-name-card">
        <h2 className="player-name-title">What's your name?</h2>
        <input
          type="text"
          className="name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          placeholder="Enter your name..."
          autoFocus
        />
        <button
          className="primary-btn"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue
        </button>
      </section>
    </main>
  )
}