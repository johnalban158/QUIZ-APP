import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, GraduationCap, LogOut, Moon, Play, Shield, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const THEME_KEY = 'kanani_theme'

export default function Brand({ right, back, backLabel }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
  }

  return (
    <header className="brand">
      <div className="brand-inner">
        {back === true ? (
          <button type="button" className="nav-back" onClick={() => navigate(-1)} aria-label={backLabel || 'Go back'}>
            <ArrowLeft size={18} />
          </button>
        ) : back ? (
          <Link to={back} className="nav-back" aria-label={backLabel || 'Go back'}>
            <ArrowLeft size={18} />
          </Link>
        ) : null}

        <Link to="/" className="brand-logo" aria-label="KAN A NI PLEASE home">
          <GraduationCap size={19} strokeWidth={2.5} />
        </Link>

        <Link to="/" className="brand-name">
          KAN A&nbsp;NI <span className="brand-accent">PLEASE</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/quiz" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Play size={15} />
            <span className="nav-label">Take a quiz</span>
          </NavLink>
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Shield size={15} />
              <span className="nav-label">Admin</span>
            </NavLink>
          )}
          {user?.role === 'STAFF' && (
            <NavLink to="/staff" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <BookOpen size={15} />
              <span className="nav-label">My training</span>
            </NavLink>
          )}
        </nav>

        <button
          type="button"
          className="btn-icon theme-toggle"
          onClick={toggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {right && <div className="brand-right">{right}</div>}
      </div>
    </header>
  )
}

export function AdminBrand({ user, logout }) {
  const name = user?.name || 'Admin'

  return (
    <Brand
      right={
        <div className="nav-user">
          <span className="nav-user-name" title={name}>{name}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={logout}>
            <LogOut size={14} />
            <span className="nav-label">Log out</span>
          </button>
        </div>
      }
    />
  )
}

export function QuizBrand({ right }) {
  return <Brand right={right} />
}