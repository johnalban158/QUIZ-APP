import { useQuiz } from '../../context/QuizContext'

export default function SettingsTab() {
  const { settings, setSetting } = useQuiz()

  return (
    <div className="card admin-card">
      <h2 className="admin-heading">Quiz Settings</h2>

      <div className="setting-row">
        <label className="setting-label">Quiz type</label>
        <select
          className="setting-input"
          value={settings.quizType}
          onChange={(e) => setSetting('quizType', e.target.value)}
        >
          <option value="multiple-choice">Multiple Choice</option>
          <option value="true-false">True / False</option>
          <option value="timed">Timed Challenge</option>
        </select>
      </div>

      <div className="setting-row">
        <label className="setting-label">Questions per session</label>
        <input
          type="number"
          min={1}
          className="setting-input setting-number"
          value={settings.perSession}
          onChange={(e) =>
            setSetting('perSession', Math.max(1, Number(e.target.value) || 1))
          }
        />
      </div>

      <div className="setting-row">
        <label className="setting-label">Shuffle question order</label>
        <input
          type="checkbox"
          className="setting-toggle"
          checked={settings.shuffleQuestions}
          onChange={(e) => setSetting('shuffleQuestions', e.target.checked)}
        />
      </div>

      <div className="setting-row">
        <label className="setting-label">Shuffle answer order</label>
        <input
          type="checkbox"
          className="setting-toggle"
          checked={settings.shuffleAnswers}
          onChange={(e) => setSetting('shuffleAnswers', e.target.checked)}
        />
      </div>

      <div className="setting-row">
        <label className="setting-label">Show correct answer</label>
        <select
          className="setting-input"
          value={settings.revealAnswer}
          onChange={(e) => setSetting('revealAnswer', e.target.value)}
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