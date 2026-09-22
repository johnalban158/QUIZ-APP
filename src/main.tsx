import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import './App.css'
import App from './App'

// Apply the saved preference before first paint so there is no flash.
// Light white is the default experience (senior-friendly); dark mode is
// only used when the user explicitly chose it.
const savedTheme = localStorage.getItem('kanani_theme')
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
}

const savedFontScale = localStorage.getItem('kanani_font_scale')
if (savedFontScale === 'large') {
  document.documentElement.dataset.fontScale = 'large'
}

document.title = 'Goodwill Caring Health Services'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)