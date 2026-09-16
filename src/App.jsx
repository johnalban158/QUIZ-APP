import { Navigate, Route, Routes } from 'react-router-dom'
import Gateway from './screens/Gateway'
import Admin from './screens/Admin'
import Player from './screens/Player'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Gateway />} />
        <Route path="/play" element={<Player />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App