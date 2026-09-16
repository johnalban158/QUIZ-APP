import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Info, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Brand from '../../components/Brand'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      if (u.role !== 'ADMIN') {
        setError('That account is not an admin.')
        return
      }
      navigate('/admin')
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
          <div className="login-logo"><ShieldCheck size={26} /></div>
          <h2 className="login-title">Admin login</h2>
          <p className="login-sub">Sign in to manage modules and submissions.</p>

          <div className="demo-hint">
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span><strong>Demo:</strong> admin@quizapp.com · admin123</span>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label><Mail size={14} /> Email</label>
            <input
              className="input input-lg"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@quizapp.com"
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