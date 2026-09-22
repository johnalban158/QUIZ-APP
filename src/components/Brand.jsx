import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, GraduationCap, LogOut, Moon, Play, Shield, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const THEME_KEY = 'kanani_theme'
const FONT_KEY = 'kanani_font_scale'

export default function Brand({ right, back, backLabel }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [fontLarge, setFontLarge] = useState(
    () => document.documentElement.dataset.fontScale === 'large'
  )

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
  }

  const setFontSize = (large) => {
    setFontLarge(large)
    document.documentElement.dataset.fontScale = large ? 'large' : 'normal'
    localStorage.setItem(FONT_KEY, large ? 'large' : 'normal')
  }

  return (
    <header className="brand">
      <div className="brand-inner">
        {back === true ? (
          <button type="button" className="nav-back" onClick={() => navigate(-1)} aria-label={backLabel || 'Go back'}>
            <ArrowLeft size={22} />
          </button>
        ) : back ? (
          <Link to={back} className="nav-back" aria-label={backLabel || 'Go back'}>
            <ArrowLeft size={22} />
          </Link>
        ) : null}

        <Link to="/" className="brand-logo" aria-label="Goodwill Caring Health Services home">
          <GraduationCap size={24} strokeWidth={2.5} />
        </Link>

        <Link to="/" className="brand-name">
          Goodwill Caring Health Services
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/quiz" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Play size={18} />
            <span className="nav-label">Take a quiz</span>
          </NavLink>
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Shield size={18} />
              <span className="nav-label">Admin</span>
            </NavLink>
          )}
          {user?.role === 'STAFF' && (
            <NavLink to="/staff" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <BookOpen size={18} />
              <span className="nav-label">My training</span>
            </NavLink>
          )}
        </nav>

        <div className="brand-controls">
          <div className="text-size-toggle" role="group" aria-label="Text size">
            <button
              type="button"
              className={`text-sm${!fontLarge ? ' active' : ''}`}
              onClick={() => setFontSize(false)}
              aria-pressed={!fontLarge}
              aria-label="Standard text size"
              title="Standard text size"
            >
              A
            </button>
            <button
              type="button"
              className={`text-lg${fontLarge ? ' active' : ''}`}
              onClick={() => setFontSize(true)}
              aria-pressed={fontLarge}
              aria-label="Larger text size"
              title="Larger text size"
            >
              A
            </button>
          </div>

          <button
            type="button"
            className="btn-icon theme-toggle"
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

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
            <LogOut size={16} />
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