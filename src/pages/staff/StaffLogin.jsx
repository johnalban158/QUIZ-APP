import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Lock, Mail, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Brand from '../../components/Brand'

export default function StaffLogin() {
  const navigate = useNavigate()
  const { user, staffLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user?.role === 'STAFF') return <Navigate to="/staff" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await staffLogin(email, password)
      if (u.role !== 'STAFF') {
        setError('That account is not a staff member.')
        return
      }
      navigate('/staff')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Brand back="/" backLabel="Back to home" />
      <div className="login-page">
        <form className="card login-card" onSubmit={handleSubmit}>
          <div className="login-logo"><UserRound size={26} /></div>
          <h2 className="login-title">Staff login</h2>
          <p className="login-sub">Sign in to view your training plan and assigned modules.</p>

          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label><Mail size={14} /> Email</label>
            <input
              className="input input-lg"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@care.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label><Lock size={14} /> Password</label>
            <input
              className="input input-lg"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </>
  )
}