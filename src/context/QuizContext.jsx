import { createContext, useContext, useEffect, useState } from 'react'
import { questions as defaultQuestions } from '../questions'

const BANK_KEY = 'quizBank'
const SETTINGS_KEY = 'quizSettings'

const defaultSettings = {
  quizType: 'multiple-choice',
  perSession: 5,
  shuffleQuestions: false,
  shuffleAnswers: false,
  revealAnswer: 'immediate',
}

function loadBank() {
  try {
    const raw = localStorage.getItem(BANK_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through to defaults */
  }
  return defaultQuestions.map((q) => ({ id: crypto.randomUUID(), ...q }))
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    /* fall through to defaults */
  }
  return defaultSettings
}

const QuizContext = createContext(null)

export function QuizProvider({ children }) {
  const [bank, setBank] = useState(loadBank)
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    localStorage.setItem(BANK_KEY, JSON.stringify(bank))
  }, [bank])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const addQuestions = (parsed) =>
    setBank((prev) => [
      ...prev,
      ...parsed.map((q) => ({ id: crypto.randomUUID(), ...q })),
    ])

  const addQuestion = (q) =>
    setBank((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question: q?.question ?? '',
        options: q?.options ?? ['', '', '', ''],
        correctIndex: q?.correctIndex ?? 0,
      },
    ])

  const updateQuestion = (id, patch) =>
    setBank((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const removeQuestion = (id) =>
    setBank((prev) => prev.filter((q) => q.id !== id))

  const setSetting = (name, value) =>
    setSettings((prev) => ({ ...prev, [name]: value }))

  const value = {
    bank,
    settings,
    addQuestions,
    addQuestion,
    updateQuestion,
    removeQuestion,
    setSetting,
  }

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>
}

export function useQuiz() {
  return useContext(QuizContext)
}