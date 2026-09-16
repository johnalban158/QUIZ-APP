import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
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
  const {
    quizzes,
    activeQuiz,
    activeQuizId,
    setActiveQuizId,
    createQuiz,
    deleteQuiz,
    updateActiveQuiz,
  } = useQuiz()

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
        <div className="quiz-picker">
          <label className="quiz-picker-label">Working on...</label>
          <select
            className="quiz-picker-select"
            value={activeQuizId ?? ''}
            onChange={(e) => setActiveQuizId(e.target.value)}
          >
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title || 'Untitled quiz'}
              </option>
            ))}
          </select>
          <button className="new-quiz-btn" onClick={createQuiz}>
            + New quiz
          </button>
        </div>

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
        {!activeQuiz ? (
          <div className="card admin-card">
            <h2 className="admin-heading">No quiz selected</h2>
            <p className="admin-sub">Create your first quiz to get started.</p>
            <button className="primary-btn" onClick={createQuiz}>
              Create first quiz
            </button>
          </div>
        ) : (
          <>
            <div className="card admin-card quiz-title-card">
              <input
                className="q-input quiz-title-input"
                value={activeQuiz.title}
                onChange={(e) => updateActiveQuiz({ title: e.target.value })}
                placeholder="Quiz title"
              />
              <div className="quiz-meta">
                <span className="quiz-badge quiz-badge-type">
                  {activeQuiz.type}
                </span>
                <span className="quiz-meta-text">
                  {activeQuiz.questions.length} questions
                </span>
                <span className="quiz-meta-text">
                  by {activeQuiz.createdBy}
                </span>
                <button
                  className="delete-btn"
                  onClick={() => deleteQuiz(activeQuiz.id)}
                >
                  Delete quiz
                </button>
              </div>
            </div>

            {active === 'modules' && <ModulesTab />}
            {active === 'questions' && <QuestionsTab />}
            {active === 'settings' && <SettingsTab />}
          </>
        )}
      </section>
    </div>
  )
}