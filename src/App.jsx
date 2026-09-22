import { Routes, Route, Navigate } from 'react-router-dom'
import RoleSelect from './pages/auth/RoleSelect'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import Modules from './pages/admin/Modules'
import ModuleEditor from './pages/admin/ModuleEditor'
import Submissions from './pages/admin/Submissions'
import SubmissionDetail from './pages/admin/SubmissionDetail'
import Staff from './pages/admin/Staff'
import StaffTrainingPlan from './pages/admin/StaffTrainingPlan'
import QuizList from './pages/quiz/QuizList'
import TakeQuiz from './pages/quiz/TakeQuiz'
import QuizResult from './pages/quiz/QuizResult'
import StaffLogin from './pages/staff/StaffLogin'
import StaffLayout from './pages/staff/StaffLayout'
import StaffHome from './pages/staff/StaffHome'
import StaffModule from './pages/staff/StaffModule'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelect />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/modules" replace />} />
        <Route path="modules" element={<Modules />} />
        <Route path="modules/:id" element={<ModuleEditor />} />
        <Route path="staff" element={<Staff />} />
        <Route path="staff/:id" element={<StaffTrainingPlan />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="submissions/:id" element={<SubmissionDetail />} />
      </Route>
      <Route path="/quiz" element={<QuizList />} />
      <Route path="/quiz/:id" element={<TakeQuiz />} />
      <Route path="/quiz/:id/result" element={<QuizResult />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<StaffHome />} />
        <Route path="modules/:id" element={<StaffModule />} />
      </Route>
      <Route path="*" element={<RoleSelect />} />
    </Routes>
  )
}