import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import Modules from './pages/admin/Modules'
import ModuleEditor from './pages/admin/ModuleEditor'
import Submissions from './pages/admin/Submissions'
import SubmissionDetail from './pages/admin/SubmissionDetail'
import QuizList from './pages/quiz/QuizList'
import TakeQuiz from './pages/quiz/TakeQuiz'
import QuizResult from './pages/quiz/QuizResult'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Modules />} />
        <Route path="modules/:id" element={<ModuleEditor />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="submissions/:id" element={<SubmissionDetail />} />
      </Route>
      <Route path="/quiz" element={<QuizList />} />
      <Route path="/quiz/:id" element={<TakeQuiz />} />
      <Route path="/quiz/:id/result" element={<QuizResult />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}