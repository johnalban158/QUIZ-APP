import { createContext, useContext, useEffect, useState } from 'react'
import { loadQuizzes, loadQuizTypes, saveQuizzes, saveQuizTypes } from '../data'

const QuizContext = createContext(null)

const initialQuizzes = loadQuizzes()
const initialQuizTypes = loadQuizTypes()

export function QuizProvider({ children }) {
  const [quizzes, setQuizzes] = useState(() => initialQuizzes)
  const [quizTypes, setQuizTypes] = useState(() => initialQuizTypes)
  const [activeQuizId, setActiveQuizId] = useState(
    () => initialQuizzes[0]?.id ?? null,
  )
  const [playerName, setPlayerName] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    saveQuizzes(quizzes)
  }, [quizzes])

  useEffect(() => {
    saveQuizTypes(quizTypes)
  }, [quizTypes])

  const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId) ?? null

  const createQuiz = () => {
    const quiz = {
      id: crypto.randomUUID(),
      title: 'New Quiz',
      type: 'multiple-choice',
      createdBy: 'Admin',
      questions: [],
      settings: {
        questionsPerSession: 5,
        shuffleQuestions: false,
        shuffleAnswers: false,
        showAnswerMode: 'immediate',
      },
    }
    setQuizzes((prev) => [...prev, quiz])
    setActiveQuizId(quiz.id)
    return quiz.id
  }

  const deleteQuiz = (id) => {
    setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id))
    setActiveQuizId((current) => (current === id ? null : current))
  }

  const updateQuiz = (id, patch) =>
    setQuizzes((prev) =>
      prev.map((quiz) => (quiz.id === id ? { ...quiz, ...patch } : quiz)),
    )

  const updateActiveQuiz = (patch) => {
    if (!activeQuizId) return
    updateQuiz(activeQuizId, patch)
  }

  const updateQuizSettings = (id, patch) =>
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === id
          ? { ...quiz, settings: { ...quiz.settings, ...patch } }
          : quiz,
      ),
    )

  const updateActiveSettings = (patch) => {
    if (!activeQuizId) return
    updateQuizSettings(activeQuizId, patch)
  }

  const addQuestions = (quizId, parsed) =>
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId
          ? {
              ...quiz,
              questions: [
                ...quiz.questions,
                ...parsed.map((q) => ({ id: crypto.randomUUID(), ...q })),
              ],
            }
          : quiz,
      ),
    )

  const addQuestionsToActive = (parsed) => {
    if (!activeQuizId) return
    addQuestions(activeQuizId, parsed)
  }

  const addQuestionToActive = () => {
    addQuestionsToActive([
      { question: '', options: ['', '', '', ''], correctIndex: 0 },
    ])
  }

  const updateQuestionInQuiz = (quizId, questionId, patch) =>
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId
          ? {
              ...quiz,
              questions: quiz.questions.map((q) =>
                q.id === questionId ? { ...q, ...patch } : q,
              ),
            }
          : quiz,
      ),
    )

  const updateQuestionInActive = (questionId, patch) => {
    if (!activeQuizId) return
    updateQuestionInQuiz(activeQuizId, questionId, patch)
  }

  const removeQuestionFromQuiz = (quizId, questionId) =>
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId
          ? {
              ...quiz,
              questions: quiz.questions.filter((q) => q.id !== questionId),
            }
          : quiz,
      ),
    )

  const removeQuestionFromActive = (questionId) => {
    if (!activeQuizId) return
    removeQuestionFromQuiz(activeQuizId, questionId)
  }

  const startResult = (summary) => setResult(summary)

  const addQuizType = () => {
    const type = { id: crypto.randomUUID(), name: 'New Type' }
    setQuizTypes((prev) => [...prev, type])
    return type.id
  }

  const updateQuizType = (id, patch) =>
    setQuizTypes((prev) =>
      prev.map((type) => (type.id === id ? { ...type, ...patch } : type)),
    )

  const removeQuizType = (id) => {
    setQuizTypes((prev) => prev.filter((type) => type.id !== id))
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.type === id ? { ...quiz, type: 'multiple-choice' } : quiz,
      ),
    )
  }

  const getTypeName = (typeId) =>
    quizTypes.find((type) => type.id === typeId)?.name ?? 'Quiz'

  const value = {
    quizzes,
    activeQuiz,
    activeQuizId,
    quizTypes,
    playerName,
    result,
    setPlayerName,
    setActiveQuizId,
    createQuiz,
    deleteQuiz,
    updateQuiz,
    updateActiveQuiz,
    updateActiveSettings,
    addQuestionsToActive,
    addQuestionToActive,
    updateQuestionInActive,
    removeQuestionFromActive,
    startResult,
    addQuizType,
    updateQuizType,
    removeQuizType,
    getTypeName,
  }

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>
}

export function useQuiz() {
  return useContext(QuizContext)
}