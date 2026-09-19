import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

const GENERAL_KNOWLEDGE_CONTENT = [
  'Welcome to General Knowledge training. This module covers everyday facts every caregiver should know,',
  'from basic geography to simple science. Read each question carefully during the quiz and choose the',
  'single best answer. A passing score is 70% or higher.',
].join(' ')

const SCIENCE_BASICS_CONTENT = [
  'Science Basics introduces fundamental science concepts used in daily caregiving, such as hygiene,',
  'the human body, and the natural world. Study this material, then take the quiz. A passing score is',
  '70% or higher.',
].join(' ')

const COMPANION_CARE_CONTENT = [
  'Companion and respite care focuses on emotional support, meaningful conversation, light household help,',
  'and giving family caregivers a break. Study these principles, then take the quiz. A passing score is',
  '70% or higher.',
].join(' ')

const STAFF_SEED = [
  { name: 'Maria Santos', email: 'maria.santos@quizapp.com', specialty: 'HOME_HEALTH_AIDE' },
  { name: 'James Rivera', email: 'james.rivera@quizapp.com', specialty: 'PERSONAL_CARE_AIDE' },
  { name: 'Elena Cruz', email: 'elena.cruz@quizapp.com', specialty: 'COMPANION_RESPITE_AIDE' },
  { name: 'David Kim', email: 'david.kim@quizapp.com', specialty: 'HOME_HEALTH_AIDE' },
  { name: 'Aisha Johnson', email: 'aisha.johnson@quizapp.com', specialty: 'PERSONAL_CARE_AIDE' },
]

async function ensureModule({ title, description, content, status, createdById, questions }) {
  let mod = await prisma.module.findFirst({ where: { title } })
  if (!mod) {
    mod = await prisma.module.create({
      data: {
        title,
        description,
        content,
        status,
        createdById,
        questions: { create: questions },
      },
    })
    console.log(`Created module: ${title}`)
  } else {
    // Refresh demo content/status on re-seed so existing DBs pick up new fields.
    mod = await prisma.module.update({
      where: { id: mod.id },
      data: { description, content, status },
    })
    console.log(`Module already exists, refreshed content: ${title}`)
  }
  return mod
}

async function ensureEligibility(moduleId, specialty) {
  await prisma.moduleEligibility.upsert({
    where: { moduleId_specialty: { moduleId, specialty } },
    update: {},
    create: { moduleId, specialty },
  })
}

async function ensureAssignment(staffId, moduleId, assignedById) {
  await prisma.staffModuleAssignment.upsert({
    where: { staffId_moduleId: { staffId, moduleId } },
    update: {},
    create: { staffId, moduleId, assignedById },
  })
}

// Creates a 100% passing senior submission attributed to a staff member,
// plus the linked StaffModuleCompletion. Skips if a completion already exists.
async function ensurePassingCompletion({ staffId, moduleId, takerName }) {
  const existing = await prisma.staffModuleCompletion.findFirst({
    where: { staffId, moduleId },
  })
  if (existing) {
    console.log(`Completion already exists for staff ${staffId} on module ${moduleId}, skipping.`)
    return existing
  }

  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { questions: { orderBy: { orderIndex: 'asc' }, include: { options: true } } },
  })
  if (!mod || mod.questions.length === 0) {
    console.log(`Cannot seed completion: module ${moduleId} has no questions.`)
    return null
  }

  const answerLines = mod.questions.map((q) => {
    const correct = q.options.find((o) => o.isCorrect) ?? q.options[0]
    return { questionId: q.id, selectedOptionId: correct.id, isCorrect: !!correct.isCorrect }
  })
  const score = answerLines.filter((a) => a.isCorrect).length
  const total = mod.questions.length
  const percent = total ? Math.round((score / total) * 100) : 0

  const submission = await prisma.submission.create({
    data: {
      moduleId,
      staffMemberId: staffId,
      takerName,
      takerEmail: null, // senior flow: no email collected
      score,
      total,
      timeTakenSeconds: 120,
      answers: { create: answerLines },
    },
  })

  const completion = await prisma.staffModuleCompletion.create({
    data: {
      staffId,
      moduleId,
      submissionId: submission.id,
      score,
      total,
      percent,
      passed: percent >= 70,
    },
  })
  console.log(`Seeded passing completion: ${takerName} -> staff ${staffId} (${score}/${total}, ${percent}%)`)
  return completion
}

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizapp.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@quizapp.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })

  // --- Staff roster (always runs, even if modules already exist) ---
  const staffPassword = await bcrypt.hash('staff123', 10)
  const staffByEmail = {}
  for (const s of STAFF_SEED) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, specialty: s.specialty, role: 'STAFF' },
      create: {
        name: s.name,
        email: s.email,
        passwordHash: staffPassword,
        role: 'STAFF',
        specialty: s.specialty,
      },
    })
    staffByEmail[s.email] = user
  }
  console.log(`Seeded staff: ${Object.keys(staffByEmail).join(', ')} (password: staff123)`)

  // --- Modules (create on first run, refresh content on re-seed) ---
  const generalKnowledge = await ensureModule({
    title: 'General Knowledge',
    description: 'A quick warm-up on everyday facts.',
    content: GENERAL_KNOWLEDGE_CONTENT,
    status: 'PUBLISHED',
    createdById: admin.id,
    questions: [
      {
        orderIndex: 0,
        text: 'What is the capital of France?',
        options: {
          create: [
            { text: 'London', isCorrect: false },
            { text: 'Paris', isCorrect: true },
            { text: 'Berlin', isCorrect: false },
            { text: 'Madrid', isCorrect: false },
          ],
        },
      },
      {
        orderIndex: 1,
        text: 'How many continents are there on Earth?',
        options: {
          create: [
            { text: 'Five', isCorrect: false },
            { text: 'Six', isCorrect: false },
            { text: 'Seven', isCorrect: true },
            { text: 'Eight', isCorrect: false },
          ],
        },
      },
      {
        orderIndex: 2,
        text: 'Which planet is known as the Red Planet?',
        options: {
          create: [
            { text: 'Venus', isCorrect: false },
            { text: 'Jupiter', isCorrect: false },
            { text: 'Saturn', isCorrect: false },
            { text: 'Mars', isCorrect: true },
          ],
        },
      },
    ],
  })

  const scienceBasics = await ensureModule({
    title: 'Science Basics',
    description: 'Fundamental science questions for beginners.',
    content: SCIENCE_BASICS_CONTENT,
    status: 'PUBLISHED',
    createdById: admin.id,
    questions: [
      {
        orderIndex: 0,
        text: 'What is H2O commonly known as?',
        options: {
          create: [
            { text: 'Salt', isCorrect: false },
            { text: 'Water', isCorrect: true },
            { text: 'Oxygen', isCorrect: false },
            { text: 'Hydrogen', isCorrect: false },
          ],
        },
      },
    ],
  })

  const companionCare = await ensureModule({
    title: 'Companion Care Essentials',
    description: 'Core principles of companion and respite care.',
    content: COMPANION_CARE_CONTENT,
    status: 'PUBLISHED',
    createdById: admin.id,
    questions: [
      {
        orderIndex: 0,
        text: 'What is the primary goal of companion care?',
        options: {
          create: [
            { text: 'Emotional support and companionship', isCorrect: true },
            { text: 'Prescribing medication', isCorrect: false },
            { text: 'Performing surgery', isCorrect: false },
            { text: 'Diagnosing illness', isCorrect: false },
          ],
        },
      },
      {
        orderIndex: 1,
        text: 'Respite care mainly helps whom?',
        options: {
          create: [
            { text: 'Family caregivers, by giving them a break', isCorrect: true },
            { text: 'Only the care agency', isCorrect: false },
            { text: 'Insurance companies', isCorrect: false },
            { text: 'No one in particular', isCorrect: false },
          ],
        },
      },
    ],
  })

  // --- Eligibility: specialty-only rules (state dimension removed) ---
  // General Knowledge -> Home Health Aides
  // Science Basics    -> Personal Care Aides
  // Companion Care    -> Companion & Respite Aides
  // Clear stale rows first so re-seeding stays consistent with current rules.
  await prisma.moduleEligibility.deleteMany({})
  await ensureEligibility(generalKnowledge.id, 'HOME_HEALTH_AIDE')
  await ensureEligibility(scienceBasics.id, 'PERSONAL_CARE_AIDE')
  await ensureEligibility(companionCare.id, 'COMPANION_RESPITE_AIDE')
  console.log('Seeded module eligibility rows.')

  // --- Assignments (bulk-assign demo: every staff has an eligible module) ---
  const maria = staffByEmail['maria.santos@quizapp.com']
  const james = staffByEmail['james.rivera@quizapp.com']
  const elena = staffByEmail['elena.cruz@quizapp.com']
  const david = staffByEmail['david.kim@quizapp.com']
  const aisha = staffByEmail['aisha.johnson@quizapp.com']
  await ensureAssignment(maria.id, generalKnowledge.id, admin.id)
  await ensureAssignment(david.id, generalKnowledge.id, admin.id)
  await ensureAssignment(james.id, scienceBasics.id, admin.id)
  await ensureAssignment(aisha.id, scienceBasics.id, admin.id)
  await ensureAssignment(elena.id, companionCare.id, admin.id)
  console.log('Seeded staff module assignments.')

  // --- Completions via real passing senior submissions (senior name -> staff credit) ---
  await ensurePassingCompletion({
    staffId: maria.id,
    moduleId: generalKnowledge.id,
    takerName: 'Rosa Delgado',
  })
  await ensurePassingCompletion({
    staffId: james.id,
    moduleId: scienceBasics.id,
    takerName: 'Harold Finch',
  })

  console.log('Seeded admin login: admin@quizapp.com / admin123')
  console.log('Seeded staff logins: <staff email> / staff123')
  console.log('Seeded modules:', generalKnowledge.title, '&', scienceBasics.title, '&', companionCare.title)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
