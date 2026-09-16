import { useState } from 'react'
import { Link } from 'react-router-dom'
import ModulesTab from '../components/admin/ModulesTab'
import QuestionsTab from '../components/admin/QuestionsTab'
import SettingsTab from '../components/admin/SettingsTab'
import './Admin.css'

const tabs = [
  { id: 'modules', label: 'Modules' },
  { id: 'questions', label: 'Questions' },
  { id: 'settings', label: 'Quiz Settings' },
]

export default function Admin() {
  const [active, setActive] = useState('modules')

  return (
    <div className="admin-layout">
      <header className="brand admin-brand">
        <span className="brand-logo">?</span> Quiz App
        <Link to="/" className="admin-back">
          Back to home
        </Link>
      </header>

      <nav className="admin-sidebar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${active === tab.id ? 'active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="admin-content">
        {active === 'modules' && <ModulesTab />}
        {active === 'questions' && <QuestionsTab />}
        {active === 'settings' && <SettingsTab />}
      </section>
    </div>
  )
}