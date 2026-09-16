import type { Question } from '../types'

export const sampleQuestions: Question[] = [
  {
    id: '1',
    category: 'Science',
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
  },
  {
    id: '2',
    category: 'Science',
    question: 'What is the chemical symbol for gold?',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctIndex: 2,
  },
  {
    id: '3',
    category: 'History',
    question: 'Who was the first President of the United States?',
    options: ['Lincoln', 'Washington', 'Jefferson', 'Adams'],
    correctIndex: 1,
  },
  {
    id: '4',
    category: 'History',
    question: 'In which year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctIndex: 2,
  },
  {
    id: '5',
    category: 'Geography',
    question: 'What is the capital of Japan?',
    options: ['Seoul', 'Beijing', 'Bangkok', 'Tokyo'],
    correctIndex: 3,
  },
  {
    id: '6',
    category: 'Geography',
    question: 'Which is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
    correctIndex: 2,
  },
  {
    id: '7',
    category: 'Science',
    question: 'How many bones are in the adult human body?',
    options: ['186', '206', '236', '196'],
    correctIndex: 1,
  },
  {
    id: '8',
    category: 'Geography',
    question: 'Which country has the largest population?',
    options: ['India', 'China', 'USA', 'Indonesia'],
    correctIndex: 0,
  },
]

export const categories = [...new Set(sampleQuestions.map((q) => q.category))]