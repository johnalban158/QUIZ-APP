import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { BookOpen, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { AdminBrand } from '../../components/Brand'
import ReportBug from '../../components/ReportBug'
import { isStaffRole, roleLabel, specialtyLabel } from '../../lib'

export default function StaffLayout() {
  const { user, logout } = useAuth()

  if (!user || !isStaffRole(user.role)) return <Navigate to="/staff/login" replace />

  const roleText = [roleLabel(user.role), user.specialty ? specialtyLabel(user.specialty) : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <AdminBrand user={user} logout={logout} />
      <div className="admin">
        <nav className="admin-side" aria-label="Staff portal">
          <div className="admin-side-user">
            <span className="avatar">{(user.name || 'S')[0].toUpperCase()}</span>
            <div>
              <p className="admin-side-user-name">{user.name}</p>
              <p className="admin-side-user-role">{roleText || 'Staff member'}</p>
            </div>
          </div>

          <div className="admin-nav-wrap">
            <p className="admin-side-heading">My portal</p>
            <div className="admin-nav">
              <NavLink to="/staff/dashboard" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <LayoutDashboard size={17} /> Dashboard
              </NavLink>
              <NavLink to="/staff/plan" className={({ isActive }) => (isActive ? 'active' : '')}>
                <BookOpen size={17} /> Training plan
              </NavLink>
            </div>
          </div>

          <div className="admin-side-foot">
            <ReportBug />
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