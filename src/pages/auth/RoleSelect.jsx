import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, UserCog, Users } from 'lucide-react'
import Brand from '../../components/Brand'
import BlobField from '../../assets/illustrations/BlobField'

const ROLES = [
  {
    key: 'resident',
    label: 'Resident',
    sub: 'Take a quiz with a little help',
    icon: Users,
    to: '/quiz',
  },
  {
    key: 'staff',
    label: 'Staff',
    sub: 'Run a quiz session and earn training credit',
    icon: UserCog,
    to: '/staff/login',
  },
  {
    key: 'admin',
    label: 'Admin',
    sub: 'Manage quizzes, modules and staff',
    icon: Shield,
    to: '/admin/login',
  },
]

export default function RoleSelect() {
  const navigate = useNavigate()
  const [pressed, setPressed] = useState(null)

  const release = () => setPressed(null)

  return (
    <>
      <Brand />
      <div className="stage-decor" aria-hidden="true">
        <BlobField />
      </div>
      <div className="role-select">
        <section className="card role-card-head">
          <p className="eyebrow">Goodwill Caring Health Services</p>
          <h1 className="role-title">Welcome</h1>
          <p className="role-sub">Who's signing in today?</p>

          <div className="role-options">
            {ROLES.map((r) => {
              const Icon = r.icon
              const isPressed = pressed === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  role="button"
                  aria-pressed={isPressed}
                  className={`role-card role-card--${r.key}${isPressed ? ' pressed' : ''}`}
                  onClick={() => navigate(r.to)}
                  onPointerDown={() => setPressed(r.key)}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onPointerLeave={release}
                  onBlur={release}
                >
                  <span className="role-card-icon" aria-hidden="true">
                    <Icon size={24} />
                  </span>
                  <span className="role-card-text">
                    <span className="role-card-label">{r.label}</span>
                    <span className="role-card-sub">{r.sub}</span>
                  </span>
                  <span className="role-card-arrow" aria-hidden="true">
                    <ArrowRight size={22} />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
      <footer className="site-footer">Goodwill Caring Health Services · built with React + Express</footer>
    </>
  )
}