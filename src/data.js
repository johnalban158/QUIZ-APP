// Central data access layer.
// Swap these read/write functions for real API calls later without
// touching any UI component.

const QUIZZES_KEY = 'quizQuizzes'

export function seedQuizzes() {
  const withIds = (questions) =>
    questions.map((q) => ({ id: crypto.randomUUID(), ...q }))

  return [
    {
      id: crypto.randomUUID(),
      title: 'General Knowledge',
      type: 'multiple-choice',
      createdBy: 'Admin',
      questions: withIds([
        {
          question: 'Which planet is known as the Red Planet?',
          options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
          correctIndex: 1,
        },
        {
          question: 'What is the chemical symbol for gold?',
          options: ['Go', 'Gd', 'Au', 'Ag'],
          correctIndex: 2,
        },
        {
          question: 'How many continents are there on Earth?',
          options: ['5', '6', '7', '8'],
          correctIndex: 2,
        },
        {
          question: 'Which animal is known as the King of the Jungle?',
          options: ['Tiger', 'Lion', 'Elephant', 'Bear'],
          correctIndex: 1,
        },
        {
          question: 'What is the largest ocean on Earth?',
          options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
          correctIndex: 3,
        },
      ]),
      settings: {
        questionsPerSession: 5,
        shuffleQuestions: false,
        shuffleAnswers: false,
        showAnswerMode: 'immediate',
      },
    },
    {
      id: crypto.randomUUID(),
      title: 'Science Basics',
      type: 'multiple-choice',
      createdBy: 'Admin',
      questions: withIds([
        {
          question: 'What is the powerhouse of the cell?',
          options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Cell wall'],
          correctIndex: 1,
        },
        {
          question: 'Which force pulls objects toward Earth?',
          options: ['Friction', 'Magnetism', 'Gravity', 'Inertia'],
          correctIndex: 2,
        },
        {
          question: 'What gas do plants absorb from the air?',
          options: ['Oxygen', 'Nitrogen', 'Hydrogen', 'Carbon dioxide'],
          correctIndex: 3,
        },
        {
          question: 'What is H2O commonly known as?',
          options: ['Salt', 'Water', 'Vinegar', 'Alcohol'],
          correctIndex: 1,
        },
      ]),
      settings: {
        questionsPerSession: 4,
        shuffleQuestions: true,
        shuffleAnswers: true,
        showAnswerMode: 'end',
      },
    },
    {
      id: crypto.randomUUID(),
      title: 'True or False',
      type: 'true-false',
      createdBy: 'Admin',
      questions: withIds([
        {
          question: 'The Sun rises in the west.',
          options: ['True', 'False'],
          correctIndex: 1,
        },
        {
          question: 'There are 7 days in a week.',
          options: ['True', 'False'],
          correctIndex: 0,
        },
        {
          question: 'Water boils at 100 degrees Celsius at sea level.',
          options: ['True', 'False'],
          correctIndex: 0,
        },
        {
          question: 'Humans have only 3 senses.',
          options: ['True', 'False'],
          correctIndex: 1,
        },
      ]),
      settings: {
        questionsPerSession: 4,
        shuffleQuestions: false,
        shuffleAnswers: false,
        showAnswerMode: 'immediate',
      },
    },
  ]
}

export function loadQuizzes() {
  try {
    const raw = localStorage.getItem(QUIZZES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* fall through to seeds */
  }
  return seedQuizzes()
}

export function saveQuizzes(quizzes) {
  try {
    localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes))
  } catch {
    /* storage unavailable — UI state still works in memory */
  }
}