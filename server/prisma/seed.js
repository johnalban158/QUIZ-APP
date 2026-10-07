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

const PASS_PERCENT = 70

// Demo staff roster. Roles are NURSE / CAREGIVER (ADMIN is the seeded admin below).
// Every demo staff account uses the same password: staff123
const DEMO_STAFF_ROSTER = [
  { name: 'Maria Santos', email: 'maria.santos@quizapp.com', role: 'NURSE', specialty: 'HOME_HEALTH_AIDE' },
  { name: 'James Rivera', email: 'james.rivera@quizapp.com', role: 'CAREGIVER', specialty: 'PERSONAL_CARE_AIDE' },
  { name: 'Elena Cruz', email: 'elena.cruz@quizapp.com', role: 'NURSE', specialty: 'COMPANION_RESPITE_AIDE' },
  { name: 'David Kim', email: 'david.kim@quizapp.com', role: 'CAREGIVER', specialty: 'HOME_HEALTH_AIDE' },
  { name: 'Aisha Johnson', email: 'aisha.johnson@quizapp.com', role: 'NURSE', specialty: 'PERSONAL_CARE_AIDE' },
]

async function ensureModule({ title, description, content, status, createdById, questions, youtubeUrl, youtubeVideoId, videoRequired }) {
  let mod = await prisma.module.findFirst({ where: { title } })
  if (!mod) {
    mod = await prisma.module.create({
      data: {
        title,
        description,
        content,
        status,
        createdById,
        youtubeUrl,
        youtubeVideoId,
        videoRequired,
        questions: { create: questions },
      },
    })
    console.log(`Created module: ${title}`)
  } else {
    // Refresh demo content/status on re-seed so existing DBs pick up new fields.
    mod = await prisma.module.update({
      where: { id: mod.id },
      data: { description, content, status, youtubeUrl, youtubeVideoId, videoRequired },
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

async function loadModuleForGrading(moduleId) {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { questions: { orderBy: { orderIndex: 'asc' }, include: { options: true } } },
  })
  if (!mod || mod.questions.length === 0) {
    console.log(`Cannot seed submission: module ${moduleId} has no questions.`)
    return null
  }
  return mod
}

function gradeAnswers(mod, { pickFirstCorrect }) {
  return mod.questions.map((q) => {
    const correct = q.options.find((o) => o.isCorrect) ?? q.options[0]
    const wrong = q.options.find((o) => !o.isCorrect) ?? correct
    const selected = pickFirstCorrect ? correct : wrong
    return { questionId: q.id, selectedOptionId: selected.id, isCorrect: !!selected.isCorrect }
  })
}

// Creates a submission attributed to the logged-in staff member (takerName/takerEmail
// are the staff member's own name/email), plus the linked StaffModuleCompletion on pass.
// Skips if the staff member already has a submission for this module.
async function ensureSubmission({ staffId, moduleId, staffName, staffEmail, timeTakenSeconds = 120, allCorrect = true }) {
  const existing = await prisma.submission.findFirst({
    where: { staffMemberId: staffId, moduleId },
  })
  if (existing) {
    console.log(`Submission already exists for staff ${staffEmail} on module ${moduleId}, skipping.`)
    return existing
  }

  const mod = await loadModuleForGrading(moduleId)
  if (!mod) return null

  const answerLines = gradeAnswers(mod, { pickFirstCorrect: allCorrect })
  const score = answerLines.filter((a) => a.isCorrect).length
  const total = mod.questions.length
  const percent = total ? Math.round((score / total) * 100) : 0

  const submission = await prisma.submission.create({
    data: {
      moduleId,
      staffMemberId: staffId,
      takerName: staffName,
      takerEmail: staffEmail,
      score,
      total,
      timeTakenSeconds,
      answers: { create: answerLines },
    },
  })
  console.log(
    `Seeded submission: ${staffName} (${staffEmail}) -> ${mod.title} (${score}/${total}, ${percent}%)`
  )
  return submission
}

// Passing submission + StaffModuleCompletion (pass mark: >= 70%).
async function ensurePassingCompletion({ staffId, moduleId, staffName, staffEmail }) {
  const existing = await prisma.staffModuleCompletion.findFirst({
    where: { staffId, moduleId },
  })
  if (existing) {
    console.log(`Completion already exists for staff ${staffId} on module ${moduleId}, skipping.`)
    return existing
  }

  const submission = await ensureSubmission({
    staffId,
    moduleId,
    staffName,
    staffEmail,
    allCorrect: true,
  })
  if (!submission) return null

  const total = submission.total
  const percent = total ? Math.round((submission.score / total) * 100) : 0
  const completion = await prisma.staffModuleCompletion.create({
    data: {
      staffId,
      moduleId,
      submissionId: submission.id,
      score: submission.score,
      total: submission.total,
      percent,
      passed: percent >= PASS_PERCENT,
    },
  })
  console.log(`Seeded completion: ${staffEmail} -> ${percent}% (pass mark ${PASS_PERCENT}%)`)
  return completion
}

// Legacy cleanup: submissions created by the old senior flow were attributed to a
// staff member but named the senior and collected no email. Re-attribute them to
// the staff member themselves so every submission matches the logged-in-staff model.
async function reattributeLegacySubmissions() {
  const legacy = await prisma.submission.findMany({
    where: { staffMemberId: { not: null }, takerEmail: null },
    include: { staffMember: true },
  })
  for (const sub of legacy) {
    if (!sub.staffMember) continue
    await prisma.submission.update({
      where: { id: sub.id },
      data: { takerName: sub.staffMember.name, takerEmail: sub.staffMember.email },
    })
    console.log(`Re-attributed legacy submission ${sub.id} to ${sub.staffMember.email}`)
  }
}

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizapp.com' },
    update: { name: 'Admin', role: 'ADMIN' },
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
  for (const s of DEMO_STAFF_ROSTER) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, specialty: s.specialty, role: s.role },
      create: {
        name: s.name,
        email: s.email,
        passwordHash: staffPassword,
        role: s.role,
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
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeVideoId: 'dQw4w9WgXcQ',
    videoRequired: true,
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

  // --- Eligibility: specialty-only rules ---
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

  // --- Legacy senior-flow submissions -> attributed to the staff member ---
  await reattributeLegacySubmissions()

  // --- Demo submissions + completions (pass mark 70%) ---
  // Passing attempts -> Submission + StaffModuleCompletion.
  await ensurePassingCompletion({
    staffId: maria.id,
    moduleId: generalKnowledge.id,
    staffName: maria.name,
    staffEmail: maria.email,
  })
  await ensurePassingCompletion({
    staffId: james.id,
    moduleId: scienceBasics.id,
    staffName: james.name,
    staffEmail: james.email,
  })
  // Failing attempts -> Submission only (no completion), so admin screens show pass/fail mix.
  await ensureSubmission({
    staffId: aisha.id,
    moduleId: scienceBasics.id,
    staffName: aisha.name,
    staffEmail: aisha.email,
    timeTakenSeconds: 45,
    allCorrect: false,
  })
  await ensureSubmission({
    staffId: elena.id,
    moduleId: companionCare.id,
    staffName: elena.name,
    staffEmail: elena.email,
    timeTakenSeconds: 75,
    allCorrect: false,
  })

  console.log('Seeded admin login: admin@quizapp.com / admin123')
  console.log('Seeded staff logins: <staff email> / staff123 (NURSE: Maria, Elena, Aisha; CAREGIVER: James, David)')
  console.log('Seeded modules:', generalKnowledge.title, '&', scienceBasics.title, '&', companionCare.title)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
