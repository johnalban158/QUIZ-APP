import { Navigate, Route, Routes } from 'react-router-dom'
import Gateway from './screens/Gateway'
import Admin from './screens/Admin'
import PlayerName from './screens/PlayerName'
import PlayerSelect from './screens/PlayerSelect'
import PlayerQuiz from './screens/PlayerQuiz'
import PlayerResults from './screens/PlayerResults'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Gateway />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/play/name" element={<PlayerName />} />
        <Route path="/play/select" element={<PlayerSelect />} />
        <Route path="/play/quiz/:id" element={<PlayerQuiz />} />
        <Route path="/play/results" element={<PlayerResults />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App