import { useState } from 'react'
import { useQuiz } from '../../context/QuizContext'

function parseQuestions(raw) {
  const result = []
  const blocks = raw
    .trim()
    .split(/\n\s*\n/)
    .filter((block) => block.trim())

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const optionPattern = /^[a-d][.)]\s*(.+)$/i
    const answerPattern = /^answer\s*[:=,]\s*([a-d])$/i
    const letterIndex = { a: 0, b: 1, c: 2, d: 3 }

    const questionLines = []
    const options = []
    let answerLetter = null

    for (const line of lines) {
      const optionMatch = line.match(optionPattern)
      if (optionMatch) {
        options.push(optionMatch[1].trim())
        continue
      }

      const answerMatch = line.match(answerPattern)
      if (answerMatch) {
        answerLetter = answerMatch[1].toLowerCase()
        continue
      }

      questionLines.push(line)
    }

    if (questionLines.length === 0 || options.length < 2 || answerLetter === null) {
      continue
    }

    const question = questionLines
      .join(' ')
      .replace(/^\d+[.)]\s*/, '')
      .trim()

    result.push({
      question,
      options,
      correctIndex: letterIndex[answerLetter],
    })
  }

  return result
}

export default function ModulesTab() {
  const { addQuestions } = useQuiz()
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState([])
  const [status, setStatus] = useState('')

  const handleConvert = () => {
    const parsed = parseQuestions(raw)
    setPreview(parsed)
    if (parsed.length === 0) {
      setStatus('No valid questions found. Check the format.')
      return
    }
    addQuestions(parsed)
    setStatus(`Added ${parsed.length} questions to the bank.`)
  }

  return (
    <div className="card admin-card">
      <h2 className="admin-heading">Paste question module</h2>
      <p className="admin-sub">Each block must look like this:</p>

      <pre className="format-sample">
        {`1. Question text?
A) option one
B) option two
C) option three
D) option four
Answer: B`}
      </pre>

      <textarea
        className="module-input"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={12}
        placeholder={'Paste blocks here, separated by a blank line...'}
      />

      <button className="primary-btn" onClick={handleConvert}>
        Convert to questions
      </button>

      {status && <p className="hint">{status}</p>}

      {preview.length > 0 && (
        <div className="preview-list">
          {preview.map((q, i) => (
            <div key={i} className="preview-item">
              <p className="preview-question">
                {i + 1}. {q.question}
              </p>
              <ul className="preview-options">
                {q.options.map((option, oi) => (
                  <li
                    key={oi}
                    className={
                      oi === q.correctIndex ? 'preview-option preview-correct' : 'preview-option'
                    }
                  >
                    {String.fromCharCode(65 + oi)}) {option}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}