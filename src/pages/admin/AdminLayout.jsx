import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { BookOpen, ListChecks } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { AdminBrand } from '../../components/Brand'

export default function AdminLayout() {
  const { user, logout } = useAuth()

  if (!user || user.role !== 'ADMIN') return <Navigate to="/admin/login" replace />

  const tabs = [
    { to: '/admin', label: 'Modules', icon: BookOpen, end: true },
    { to: '/admin/submissions', label: 'Submissions', icon: ListChecks },
  ]

  return (
    <>
      <AdminBrand user={user} logout={logout} />
      <div className="admin">
        <nav className="admin-side">
          <p className="admin-side-heading">Menu</p>
          <div className="admin-nav">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <tab.icon size={17} /> {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  )
}