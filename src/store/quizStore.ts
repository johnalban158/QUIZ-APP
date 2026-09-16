import { create } from 'zustand'
import type { Question, QuizResult } from '../types'

interface QuizState {
  questions: Question[]
  currentQuestion: number
  answers: number[]
  timerSeconds: number
  selectedCategory: string | null
  isFinished: boolean
  results: QuizResult[]
  setQuestions: (questions: Question[]) => void
  selectCategory: (category: string | null) => void
  answer: (optionIndex: number) => void
  next: () => void
  reset: () => void
  finish: () => void
  saveResult: (result: QuizResult) => void
}

export const useQuizStore = create<QuizState>()((set) => ({
  questions: [],
  currentQuestion: 0,
  answers: [],
  timerSeconds: 0,
  selectedCategory: null,
  isFinished: false,
  results: [],

  setQuestions: (questions) =>
    set({ questions, currentQuestion: 0, answers: [], isFinished: false }),
  selectCategory: (selectedCategory) => set({ selectedCategory }),
  answer: (optionIndex) =>
    set((state) => {
      const answers = [...state.answers]
      answers[state.currentQuestion] = optionIndex
      return { answers }
    }),
  next: () =>
    set((state) => {
      if (state.currentQuestion + 1 < state.questions.length) {
        return { currentQuestion: state.currentQuestion + 1, timerSeconds: 0 }
      }
      return { isFinished: true }
    }),
  reset: () =>
    set({ questions: [], currentQuestion: 0, answers: [], isFinished: false, timerSeconds: 0 }),
  finish: () => set({ isFinished: true }),
  saveResult: (result) =>
    set((state) => ({ results: [...state.results, result] })),
}))