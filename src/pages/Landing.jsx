import { Link } from 'react-router-dom'
import { GraduationCap, Shield, Play } from 'lucide-react'
import Brand from '../components/Brand'

export default function Landing() {
  return (
    <>
      <Brand />
      <div className="landing">
        <div className="card landing-card">
          <div className="landing-logo">
            <GraduationCap size={30} />
          </div>
          <h1 className="landing-title">Quiz App</h1>
          <p className="landing-desc">
            Build modules, publish quizzes, and track scores — all in one place.
          </p>
          <div className="landing-actions">
            <Link to="/admin" className="btn btn-primary">
              <Shield size={17} /> Open Admin
            </Link>
            <Link to="/quiz" className="btn btn-ghost">
              <Play size={17} /> Take a Quiz
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}