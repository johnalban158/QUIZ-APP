import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

export default function Brand({ right }) {
  return (
    <header className="brand">
      <div className="brand-inner">
        <Link to="/" className="brand-logo">
          <GraduationCap size={19} strokeWidth={2.5} />
        </Link>
        <span className="brand-name">Quiz App</span>
        {right && <span className="brand-right">{right}</span>}
      </div>
    </header>
  )
}

export function AdminBrand({ user, logout }) {
  return (
    <Brand
      right={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>{user?.name}</span>
          <button className="btn btn-sm btn-danger" onClick={logout}>Log out</button>
        </span>
      }
    />
  )
}

export function QuizBrand({ right }) {
  return (
    <Brand
      right={right && <span className="muted" style={{ fontSize: '0.85rem' }}>{right}</span>}
    />
  )
}