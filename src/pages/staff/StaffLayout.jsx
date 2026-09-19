import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { BookOpen, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { AdminBrand } from '../../components/Brand'
import { specialtyLabel } from '../../lib'

export default function StaffLayout() {
  const { user, logout } = useAuth()

  if (!user || user.role !== 'STAFF') return <Navigate to="/staff/login" replace />

  return (
    <>
      <AdminBrand user={user} logout={logout} />
      <div className="admin">
        <nav className="admin-side" aria-label="Staff portal">
          <div className="admin-side-user">
            <span className="avatar">{(user.name || 'S')[0].toUpperCase()}</span>
            <div>
              <p className="admin-side-user-name">{user.name}</p>
              <p className="admin-side-user-role">{specialtyLabel(user.specialty) || 'Staff member'}</p>
            </div>
          </div>

          <div className="admin-nav-wrap">
            <p className="admin-side-heading">My training</p>
            <div className="admin-nav">
              <NavLink to="/staff" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <BookOpen size={17} /> Training plan
              </NavLink>
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