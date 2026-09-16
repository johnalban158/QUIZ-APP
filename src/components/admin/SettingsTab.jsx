import { useQuiz } from '../../context/QuizContext'

export default function SettingsTab() {
  const { activeQuiz, quizTypes, updateActiveQuiz, updateActiveSettings } = useQuiz()

  if (!activeQuiz) return null

  const { settings } = activeQuiz

  return (
    <div className="card admin-card">
      <h2 className="admin-heading">Quiz Settings</h2>

      <div className="setting-row">
        <label className="setting-label">Quiz type</label>
        <select
          className="setting-input"
          value={activeQuiz.type}
          onChange={(e) => updateActiveQuiz({ type: e.target.value })}
        >
          {quizTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="setting-row">
        <label className="setting-label">Questions per session</label>
        <input
          type="number"
          min={1}
          className="setting-input setting-number"
          value={settings.questionsPerSession}
          onChange={(e) =>
            updateActiveSettings({
              questionsPerSession: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      </div>

      <div className="setting-row">
        <label className="setting-label">Shuffle question order</label>
        <input
          type="checkbox"
          className="setting-toggle"
          checked={settings.shuffleQuestions}
          onChange={(e) =>
            updateActiveSettings({ shuffleQuestions: e.target.checked })
          }
        />
      </div>

      <div className="setting-row">
        <label className="setting-label">Shuffle answer order</label>
        <input
          type="checkbox"
          className="setting-toggle"
          checked={settings.shuffleAnswers}
          onChange={(e) =>
            updateActiveSettings({ shuffleAnswers: e.target.checked })
          }
        />
      </div>

      <div className="setting-row">
        <label className="setting-label">Show correct answer</label>
        <select
          className="setting-input"
          value={settings.showAnswerMode}
          onChange={(e) =>
            updateActiveSettings({ showAnswerMode: e.target.value })
          }
        >
          <option value="immediate">Immediately after answering</option>
          <option value="end">Only at the end</option>
        </select>
      </div>

      <p className="hint">
        Settings are saved automatically and applied to future quiz sessions.
      </p>
    </div>
  )
}