import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, BookOpen, GraduationCap, ListChecks, Play, Shield } from 'lucide-react'
import Brand from '../components/Brand'
import { api } from '../api'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Create modules',
    text: 'Draft questions, mark the correct answers, and publish in a few clicks.',
  },
  {
    icon: ListChecks,
    title: 'Take quizzes',
    text: 'A clean, focused question-by-question flow with a live progress bar.',
  },
  {
    icon: BarChart3,
    title: 'Track results',
    text: 'Every attempt, score, and answer breakdown in one dashboard.',
  },
]

export default function Landing() {
  const [quizCount, setQuizCount] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/quiz')
        if (Array.isArray(data)) setQuizCount(data.length)
      } catch {
        // Api is unavailable — the chip just stays hidden.
      }
    })()
  }, [])

  return (
    <>
      <Brand />
      <div className="landing">
        <div className="blob blob-a" aria-hidden="true" />
        <div className="blob blob-b" aria-hidden="true" />

        <section className="card landing-card">
          <div className="landing-logo">
            <GraduationCap size={30} />
          </div>
          <p className="landing-eyebrow">Learn · Publish · Track</p>
          <h1 className="landing-title">Know what you know.</h1>
          <p className="landing-desc">
            Build modules, publish quizzes, and track scores — all in one place.
          </p>
          <div className="landing-actions">
            <Link to="/quiz" className="btn btn-primary btn-lg">
              <Play size={17} /> Take a quiz
            </Link>
            <Link to="/admin" className="btn btn-ghost btn-lg">
              <Shield size={17} /> Open admin
            </Link>
          </div>
          {quizCount !== null && (
            <div className="landing-stats">
              <span className="chip">
                <BookOpen size={14} /> {quizCount} published quiz{quizCount === 1 ? '' : 'zes'}
              </span>
            </div>
          )}
        </section>

        <section className="feature-row" aria-label="Features">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon"><f.icon size={20} /></span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-text">{f.text}</p>
            </div>
          ))}
        </section>
      </div>
      <footer className="site-footer">KAN A NI PLEASE · built with React + Express</footer>
    </>
  )
}