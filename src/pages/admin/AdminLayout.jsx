import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { BookOpen, ListChecks, LogOut, Users, UsersRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { AdminBrand } from '../../components/Brand'

export default function AdminLayout() {
  const { user, logout } = useAuth()

  if (!user || user.role !== 'ADMIN') return <Navigate to="/admin/login" replace />

  const tabs = [
    { to: '/admin/residents', label: 'Residents', icon: UsersRound },
    { to: '/admin/staff', label: 'Staff', icon: Users },
    { to: '/admin/modules', label: 'Content Library', icon: BookOpen },
    { to: '/admin/submissions', label: 'Submissions', icon: ListChecks },
  ]

  return (
    <>
      <AdminBrand user={user} logout={logout} />
      <div className="admin">
        <nav className="admin-side" aria-label="Admin">
          <div className="admin-side-user">
            <span className="avatar">{(user.name || 'A')[0].toUpperCase()}</span>
            <div>
              <p className="admin-side-user-name">{user.name || 'Admin'}</p>
              <p className="admin-side-user-role">Administrator</p>
            </div>
          </div>

          <div className="admin-nav-wrap">
            <p className="admin-side-heading">Menu</p>
            <div className="admin-nav">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  <tab.icon size={17} /> {tab.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="admin-side-foot">
            <button type="button" className="admin-logout" onClick={logout}>
              <LogOut size={16} /> Log out
            </button>
          </div>
        </nav>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  )
}