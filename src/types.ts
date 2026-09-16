export interface Question {
  id: string
  category: string
  question: string
  options: string[]
  correctIndex: number
}

export interface QuizResult {
  quizId: string
  category: string
  score: number
  total: number
  date: string
  answers: number[]
}