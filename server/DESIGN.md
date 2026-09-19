# Quiz App — Staff Roster & Training Management: Backend Design

> **Scope**: New features for staff roster, training plans, module eligibility, bulk assignment, staff auth, elderly quiz-taker flow, and file uploads.  
> **Current codebase**: Express + Prisma (PostgreSQL), JWT auth, routes in `server/src/routes/*.js`, middleware in `server/src/middleware/auth.js`, schema in `server/prisma/schema.prisma`.  
> **No code changes in this document** — this is a design reference for implementation.

---

## 0. Current State Recap

| Area | Current |
|------|---------|
| **User roles** | `ADMIN`, `TAKER` (enum `Role`) |
| **Auth** | `requireAuth` (any valid JWT), `requireAdmin` (role=ADMIN) |
| **Modules** | CRUD + questions + reorder under `/api/admin/modules` (admin-only) |
| **Quiz (public)** | `GET /api/quiz` (published list), `GET /api/quiz/:id` (detail, no `isCorrect`), `POST /api/quiz/:id/submit` (takerName, takerEmail, answers, timeTakenSeconds) |
| **Submissions** | Linked to `Module` only; no staff attribution |
| **File upload** | Not implemented (Option A decided: multer → `server/uploads/`, served at `/uploads/`, 10MB limit) |

---

## 1. Route Map — New + Modified Endpoints

| Method | Path | Auth | Controller / File | Request Body | Response Shape | Notes |
|--------|------|------|-------------------|--------------|----------------|-------|
| **Staff Auth** |
| `POST` | `/api/auth/staff/login` | public | `auth.js` → `staffLogin` | `{ email, password }` | `{ token, user: { id, name, email, role: 'STAFF', specialty, state } }` | New endpoint; reuses `signToken`; validates `role === 'STAFF'` |
| `POST` | `/api/auth/staff/register` | `requireAdmin` | `auth.js` → `registerStaff` | `{ name, email, password, specialty, state }` | `{ token, user: {...} }` | Admin creates staff accounts |
| **Staff Roster (Admin)** |
| `GET` | `/api/admin/staff` | `requireAdmin` | `staff.js` → `listStaff` | query: `page, limit, search, specialty, state` | `{ data: StaffRosterItem[], meta: { total, page, limit } }` | Computed `completedCount`, `totalAssignable`, `percent` |
| `GET` | `/api/admin/staff/:id` | `requireAdmin` | `staff.js` → `getStaffDetail` | — | `StaffDetail` (see §5) | Training plan view |
| `POST` | `/api/admin/staff/:id/modules` | `requireAdmin` | `staff.js` → `assignModule` | `{ moduleId }` | `{ ok: true, assignment }` | Single assign; validates eligibility |
| `DELETE` | `/api/admin/staff/:id/modules/:moduleId` | `requireAdmin` | `staff.js` → `removeModule` | — | `{ ok: true }` | Remove assignment (if not completed) |
| `POST` | `/api/admin/staff/bulk-assign` | `requireAdmin` | `staff.js` → `bulkAssign` | `{ staffIds: string[], moduleId }` | `{ ok: true, created: number, skipped: string[] }` | Transaction; validates each staff’s eligibility |
| **Module Eligibility (Admin + Staff)** |
| `GET` | `/api/admin/modules/eligible` | `requireAdmin` | `modules.js` → `getEligibleModules` | query: `staffIds[]` (or `specialty`, `state`) | `{ moduleId, title, description, status }[]` | Filters by specialty × state rules |
| `GET` | `/api/staff/modules/eligible` | `requireStaff` | `modules.js` → `getMyEligibleModules` | — | same as above | Staff self-service view |
| **Staff Self-Service (Staff Portal)** |
| `GET` | `/api/staff/me` | `requireStaff` | `staff.js` → `getMe` | — | `{ id, name, email, specialty, state, assignments: [...] }` | Staff sees own training plan |
| `GET` | `/api/staff/me/modules/:moduleId` | `requireStaff` | `staff.js` → `getMyModuleDetail` | — | Module detail (like public quiz but with progress) | For staff to study/take assigned modules |
| **Quiz Submission → Completion Attribution (Public + Staff)** |
| `POST` | `/api/quiz/:id/submit` | public | `quiz.js` → `submitQuiz` | **CHANGED**: `{ takerName, staffMemberId, answers, timeTakenSeconds }` | `{ submissionId, moduleTitle, takerName, staffMemberId, score, total, percent, passed, breakdown, completionRecorded: boolean }` | `takerEmail` removed; `staffMemberId` required; computes pass (≥70%); creates `StaffModuleCompletion` if passed |
| **File Upload (Option A)** |
| `POST` | `/api/admin/modules/:id/upload` | `requireAdmin` | `modules.js` → `uploadSource` | `multipart/form-data` field `file` | `{ ok: true, url: '/uploads/<sanitized-timestamp>.pdf', filename }` | Multer; 10MB; PDF/DOCX/TXT only; saved to `server/uploads/` |
| `DELETE` | `/api/admin/modules/:id/upload` | `requireAdmin` | `modules.js` → `deleteSource` | — | `{ ok: true }` | Removes file + clears `sourceDocumentUrl` |
| **Stats (Extended)** |
| `GET` | `/api/admin/stats/staff-progress` | `requireAdmin` | `stats.js` → `staffProgress` | query: `specialty, state` | Aggregated completion rates by specialty/state | Optional dashboard widget |

---

## 2. Roster + Progress — Computed Fields Strategy

### 2.1 Response Shape: `StaffRosterItem`

```ts
interface StaffRosterItem {
  id: string;
  name: string;
  email: string;
  specialty: Specialty;        // 'HOME_HEALTH_AIDE' | 'PERSONAL_CARE_AIDE' | 'COMPANION_RESPITE_AIDE'
  state: string;               // 2-letter code, e.g. 'NJ', 'PA'
  assignedModules: number;     // count of StaffModuleAssignment for this staff
  completedModules: number;    // count of StaffModuleCompletion where passed=true
  totalEligibleModules: number;// count of Modules where eligibility matches this staff's specialty+state AND status=PUBLISHED
  progressPercent: number;     // Math.round((completedModules / totalEligibleModules) * 100) || 0
}
```

### 2.2 Prisma Strategy — Compute Per-Request with Aggregations

**Why not materialized columns?**  
- Eligibility is dynamic (module rules can change).  
- Assignments/completions change frequently.  
- Roster is admin-only, lower traffic — per-request aggregation is fine.

**Query approach (single round-trip via `$queryRaw` or multiple `Promise.all`):**

```ts
// In staff.js → listStaff()
const staff = await prisma.user.findMany({
  where: { role: 'STAFF', ...filters },
  select: { id: true, name: true, email: true, specialty: true, state: true },
  orderBy: { name: 'asc' },
  skip, take,
});

const staffIds = staff.map(s => s.id);

// 1. Assignments count per staff
const assignments = await prisma.staffModuleAssignment.groupBy({
  by: ['staffId'],
  where: { staffId: { in: staffIds } },
  _count: { staffId: true },
});

// 2. Completions count per staff (passed only)
const completions = await prisma.staffModuleCompletion.groupBy({
  by: ['staffId'],
  where: { staffId: { in: staffIds }, passed: true },
  _count: { staffId: true },
});

// 3. Eligible modules count per (specialty, state) combo
//    Group staff by specialty+state, query once per group
const groups = new Map<string, string[]>();
staff.forEach(s => {
  const key = `${s.specialty}|${s.state}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(s.id);
});

const eligibleCounts = new Map<string, number>();
for (const [key, ids] of groups) {
  const [specialty, state] = key.split('|');
  const count = await prisma.module.count({
    where: {
      status: 'PUBLISHED',
      eligibility: { some: { specialty, state } }, // see §3 schema
    },
  });
  eligibleCounts.set(key, count);
}

// Merge into response
const assignMap = new Map(assignments.map(a => [a.staffId, a._count.staffId]));
const completeMap = new Map(completions.map(c => [c.staffId, c._count.staffId]));

return staff.map(s => {
  const key = `${s.specialty}|${s.state}`;
  const assigned = assignMap.get(s.id) ?? 0;
  const completed = completeMap.get(s.id) ?? 0;
  const totalEligible = eligibleCounts.get(key) ?? 0;
  const percent = totalEligible > 0 ? Math.round((completed / totalEligible) * 100) : 0;
  return { ...s, assignedModules: assigned, completedModules: completed, totalEligibleModules: totalEligible, progressPercent: percent };
});
```

**Indexes to add** (DB agent):  
- `StaffModuleAssignment.staffId`  
- `StaffModuleCompletion.staffId` + `passed`  
- `ModuleEligibility.specialty_state` composite

---

## 3. Eligibility Engine — Specialty × State Rules

### 3.1 Schema Assumptions (Coordinate with DB Agent)

Add to `schema.prisma`:

```prisma
enum Specialty {
  HOME_HEALTH_AIDE
  PERSONAL_CARE_AIDE
  COMPANION_RESPITE_AIDE
}

model User {
  // ...existing fields...
  specialty   Specialty?
  state       String?        // 2-letter code, e.g. 'NJ', 'PA'
  // New relations:
  assignments StaffModuleAssignment[]
  completions StaffModuleCompletion[]
}

model Module {
  // ...existing fields...
  sourceDocumentUrl String?  // Option A: uploaded file URL
  eligibility       ModuleEligibility[]
  assignments       StaffModuleAssignment[]
  completions       StaffModuleCompletion[]
}

model ModuleEligibility {
  id        String    @id @default(cuid())
  moduleId  String
  module    Module    @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  specialty Specialty
  state     String    // 2-letter code; empty string '' means "all states"
  @@unique([moduleId, specialty, state])
  @@index([specialty, state])
}

model StaffModuleAssignment {
  id        String   @id @default(cuid())
  staffId   String
  staff     User     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  moduleId  String
  module    Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  assignedAt DateTime @default(now())
  assignedById String
  assignedBy  User   @relation("AssignmentsBy", fields: [assignedById], references: [id])
  @@unique([staffId, moduleId])
  @@index([staffId])
  @@index([moduleId])
}

model StaffModuleCompletion {
  id             String   @id @default(cuid())
  staffId        String
  staff          User     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  moduleId       String
  module         Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  submissionId   String   @unique // links to the passing Submission
  submission     Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  score          Int
  total          Int
  percent        Int      // Math.round((score/total)*100)
  passed         Boolean  // percent >= 70 (configurable later)
  completedAt    DateTime @default(now())
  @@index([staffId])
  @@index([moduleId])
  @@index([staffId, moduleId])
}
```

### 3.2 Eligibility Logic

A module is **eligible** for a staff member iff:
- `Module.status === 'PUBLISHED'`
- There exists a `ModuleEligibility` row where:
  - `moduleId = Module.id`
  - `specialty = staff.specialty`
  - `state = staff.state` OR `state = ''` (wildcard = all states)

**Frontend calls:**
- Admin roster bulk-assign modal: `GET /api/admin/modules/eligible?staffIds[]=id1&staffIds[]=id2` → returns intersection of eligible modules for all selected staff.
- Staff portal: `GET /api/staff/modules/eligible` → returns modules eligible for *me*.

**Implementation in `modules.js`:**

```ts
// GET /api/admin/modules/eligible?staffIds[]=a&staffIds[]=b
router.get('/eligible', requireAdmin, async (req, res) => {
  const staffIds = (req.query.staffIds as string[] | undefined) ?? [];
  if (staffIds.length === 0) return res.json([]);

  const staff = await prisma.user.findMany({
    where: { id: { in: staffIds }, role: 'STAFF' },
    select: { id: true, specialty: true, state: true },
  });
  if (staff.length === 0) return res.json([]);

  // Build OR conditions: (specialty=X AND state=Y) OR (specialty=X AND state='')
  const orConditions = staff.flatMap(s => [
    { specialty: s.specialty, state: s.state },
    { specialty: s.specialty, state: '' },
  ]);

  const eligibleModuleIds = await prisma.moduleEligibility.findMany({
    where: { OR: orConditions },
    select: { moduleId: true },
    distinct: ['moduleId'],
  });

  const moduleIds = eligibleModuleIds.map(e => e.moduleId);

  const modules = await prisma.module.findMany({
    where: { id: { in: moduleIds }, status: 'PUBLISHED' },
    select: { id: true, title: true, description: true, status: true },
    orderBy: { title: 'asc' },
  });
  res.json(modules);
});
```

---

## 4. Bulk Assignment — Transaction Design

### 4.1 Endpoint: `POST /api/admin/staff/bulk-assign`

```ts
// In staff.js
router.post('/bulk-assign', requireAdmin, async (req, res) => {
  const { staffIds, moduleId } = req.body ?? {};
  if (!Array.isArray(staffIds) || staffIds.length === 0 || !moduleId) {
    return res.status(400).json({ error: 'staffIds (array) and moduleId are required' });
  }

  // 1. Verify module exists and is PUBLISHED
  const module = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!module || module.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Module not found or not published' });
  }

  // 2. Fetch target staff with specialty+state
  const staff = await prisma.user.findMany({
    where: { id: { in: staffIds }, role: 'STAFF' },
    select: { id: true, specialty: true, state: true },
  });
  if (staff.length !== staffIds.length) {
    return res.status(400).json({ error: 'One or more staff not found' });
  }

  // 3. Check eligibility for each
  const eligibleStaffIds = new Set<string>();
  for (const s of staff) {
    const eligible = await prisma.moduleEligibility.findFirst({
      where: {
        moduleId,
        specialty: s.specialty,
        OR: [{ state: s.state }, { state: '' }],
      },
    });
    if (eligible) eligibleStaffIds.add(s.id);
  }

  const skipped = staffIds.filter(id => !eligibleStaffIds.has(id));

  // 4. Transaction: create assignments for eligible staff (skip existing)
  const created = await prisma.$transaction(
    [...eligibleStaffIds].map(staffId =>
      prisma.staffModuleAssignment.upsert({
        where: { staffId_moduleId: { staffId, moduleId } },
        create: { staffId, moduleId, assignedById: req.user.id },
        update: {}, // no-op if exists
      })
    )
  );

  res.json({ ok: true, created: created.length, skipped });
});
```

**Key points:**
- Uses `upsert` with composite unique key `@@unique([staffId, moduleId])` to avoid duplicates.
- Runs in a single transaction (Prisma `$transaction` array).
- Returns `skipped` array so frontend can show warnings.

---

## 5. Training Plan — Staff Detail + Assign/Remove/Complete

### 5.1 `GET /api/admin/staff/:id` → `StaffDetail`

```ts
interface StaffDetail {
  id: string;
  name: string;
  email: string;
  specialty: Specialty;
  state: string;
  assignments: StaffAssignmentDetail[];
}

interface StaffAssignmentDetail {
  moduleId: string;
  moduleTitle: string;
  moduleStatus: 'DRAFT' | 'PUBLISHED';
  assignedAt: DateTime;
  assignedByName: string;
  completion?: {
    submissionId: string;
    score: number;
    total: number;
    percent: number;
    passed: boolean;
    completedAt: DateTime;
  };
  isEligible: boolean; // module matches staff's specialty+state
}
```

**Query:**
```ts
const staff = await prisma.user.findUnique({
  where: { id: req.params.id, role: 'STAFF' },
  select: { id: true, name: true, email: true, specialty: true, state: true },
});
if (!staff) return res.status(404).json({ error: 'Staff not found' });

const assignments = await prisma.staffModuleAssignment.findMany({
  where: { staffId: staff.id },
  include: {
    module: { select: { id: true, title: true, status: true } },
    assignedBy: { select: { name: true } },
    completion: { select: { submissionId: true, score: true, total: true, percent: true, passed: true, completedAt: true } },
  },
  orderBy: { assignedAt: 'desc' },
});

const assignmentDetails = assignments.map(a => ({
  moduleId: a.module.id,
  moduleTitle: a.module.title,
  moduleStatus: a.module.status,
  assignedAt: a.assignedAt,
  assignedByName: a.assignedBy.name,
  completion: a.completion ? {
    ...a.completion,
    percent: a.completion.percent,
    passed: a.completion.passed,
  } : undefined,
  isEligible: await checkEligibility(a.moduleId, staff.specialty, staff.state), // helper
}));

res.json({ ...staff, assignments: assignmentDetails });
```

### 5.2 Assign / Remove

- `POST /api/admin/staff/:id/modules` — body `{ moduleId }`  
  Validates eligibility, creates `StaffModuleAssignment` (upsert).
- `DELETE /api/admin/staff/:id/modules/:moduleId`  
  Deletes assignment **only if no completion exists** (or allow removal with warning — decision: block if completed).

### 5.3 Staff Self-Service (`requireStaff` middleware)

Add to `auth.js`:
```ts
export function requireStaff(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Staff access required' });
    }
    next();
  });
}
```

Endpoints:
- `GET /api/staff/me` — returns own `StaffDetail` (assignments + completions)
- `GET /api/staff/me/modules/:moduleId` — returns module detail (questions + options, no `isCorrect`) for study/taking

---

## 6. Staff Auth — Single User Table with `role: 'STAFF'`

### 6.1 Decision: Extend `User` Table (Not Separate Table)

**Rationale:**
- Simpler: one auth flow, one `signToken`, one `requireAuth`.
- Staff are users who log in; seniors (quiz takers) do **not** log in.
- Prisma relations (`assignments`, `completions`) naturally attach to `User`.
- Admin creates staff accounts via `POST /api/auth/staff/register` (admin-only).

### 6.2 Schema Changes (User Model)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role     @default(TAKER)  // ADD 'STAFF' to enum
  specialty     Specialty?                // NEW
  state         String?                   // NEW (2-letter code)
  createdAt     DateTime @default(now())
  modules       Module[]                  // createdBy (admins)
  assignments   StaffModuleAssignment[]   // NEW
  completions   StaffModuleCompletion[]   // NEW
}

enum Role {
  ADMIN
  STAFF       // NEW
  TAKER       // legacy quiz takers (if any); not used for elderly flow
}
```

### 6.3 Login Endpoint: `POST /api/auth/staff/login`

```ts
// In auth.js
router.post('/staff/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== 'STAFF') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty, state: user.state },
  });
});
```

**No refresh tokens** — 7-day JWT expiry is sufficient. Staff log in daily.

### 6.4 Admin Creates Staff: `POST /api/auth/staff/register` (requireAdmin)

```ts
router.post('/staff/register', requireAdmin, async (req, res) => {
  const { name, email, password, specialty, state } = req.body ?? {};
  if (!name || !email || !password || !specialty || !state) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'STAFF', specialty, state },
  });
  res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, specialty, state } });
});
```

---

## 7. Quiz Submission → Completion Attribution (Elderly Flow)

### 7.1 Flow Overview

```
Senior (public)                          Server
    │                                      │
    ├─ GET /api/quiz → list modules        │
    ├─ GET /api/quiz/:id → questions       │
    ├─ Selects staff member (from list)    │
    └─ POST /api/quiz/:id/submit           │
       { takerName, staffMemberId,         │
         answers, timeTakenSeconds }       │
                                          │ 1. Validate module PUBLISHED
                                          │ 2. Grade answers → score, total, percent
                                          │ 3. Create Submission (takerName, staffMemberId)
                                          │ 4. If percent >= 70:
                                          │    Create StaffModuleCompletion
                                          │    (staffId, moduleId, submissionId, passed=true)
                                          │ 5. Return result + completionRecorded flag
```

### 7.2 Schema Changes

**Submission model** — add `staffMemberId` (optional, for this flow):

```prisma
model Submission {
  // ...existing...
  staffMemberId String?        // NEW: which staff this submission counts for
  staffMember   User?          @relation("StaffSubmissions", fields: [staffMemberId], references: [id])
  // ...
}
```

**StaffModuleCompletion** (new model, see §3.1) links `submissionId` @unique.

### 7.3 Modified `POST /api/quiz/:id/submit` (in `quiz.js`)

```ts
router.post('/:id/submit', async (req, res) => {
  const { takerName, staffMemberId, answers, timeTakenSeconds } = req.body ?? {};
  if (!takerName || !takerName.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!staffMemberId) return res.status(400).json({ error: 'staffMemberId is required' });
  if (!Array.isArray(answers) || answers.length === 0) return res.status(400).json({ error: 'answers required' });

  // Validate staff member exists and is STAFF
  const staff = await prisma.user.findUnique({ where: { id: staffMemberId } });
  if (!staff || staff.role !== 'STAFF') {
    return res.status(400).json({ error: 'Invalid staff member' });
  }

  // Validate module is PUBLISHED and assigned to this staff (optional but recommended)
  const module = await prisma.module.findFirst({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: { questions: { orderBy: { orderIndex: 'asc' }, include: { options: true } } },
  });
  if (!module) return res.status(404).json({ error: 'Quiz not found' });

  // Check assignment exists (staff must be assigned this module)
  const assignment = await prisma.staffModuleAssignment.findUnique({
    where: { staffId_moduleId: { staffId: staffMemberId, moduleId: module.id } },
  });
  if (!assignment) {
    return res.status(400).json({ error: 'This module is not assigned to the selected staff member' });
  }

  // Grade (same as before)
  const byId = new Map(module.questions.flatMap(q => q.options.map(o => [o.id, { q, o }])));
  let score = 0;
  const breakdown = [];
  const answerLines = answers
    .filter(a => byId.has(a.optionId))
    .map(a => {
      const { q, o } = byId.get(a.optionId);
      const correct = !!o.isCorrect;
      const correctOption = q.options.find(op => op.isCorrect);
      breakdown.push({
        questionId: q.id,
        questionText: q.text,
        selectedText: o.text,
        isCorrect: correct,
        correctText: correctOption?.text ?? null,
      });
      if (correct) score++;
      return { questionId: q.id, selectedOptionId: o.id, isCorrect: correct };
    });

  const total = module.questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const passed = percent >= 70; // PASS_THRESHOLD = 70 (configurable later)

  // Transaction: create Submission + (if passed) StaffModuleCompletion
  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.create({
      data: {
        moduleId: module.id,
        staffMemberId, // NEW
        takerName: takerName.trim(),
        takerEmail: '', // elderly flow: no email
        score,
        total,
        timeTakenSeconds: timeTakenSeconds ?? null,
        answers: { create: answerLines },
      },
    });

    let completion = null;
    if (passed) {
      // Upsert completion (one per staff×module; latest passing submission wins)
      completion = await tx.staffModuleCompletion.upsert({
        where: { staffId_moduleId: { staffId: staffMemberId, moduleId: module.id } },
        create: {
          staffId: staffMemberId,
          moduleId: module.id,
          submissionId: submission.id,
          score,
          total,
          percent,
          passed: true,
        },
        update: {
          submissionId: submission.id,
          score,
          total,
          percent,
          passed: true,
          completedAt: new Date(), // update timestamp
        },
      });
    }

    return { submission, completion };
  });

  res.status(201).json({
    submissionId: result.submission.id,
    moduleTitle: module.title,
    takerName: result.submission.takerName,
    staffMemberId,
    score,
    total,
    percent,
    passed,
    breakdown,
    completionRecorded: !!result.completion,
  });
});
```

### 7.4 Public Staff List for Senior Selection

Seniors need to pick a staff member. Add lightweight public endpoint:

```ts
// In quiz.js (public, no auth)
router.get('/staff-list', async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { role: 'STAFF' },
    select: { id: true, name: true, specialty: true, state: true },
    orderBy: { name: 'asc' },
  });
  res.json(staff);
});
```

Frontend: `GET /api/quiz/staff-list` → dropdown for senior to select.

---

## 8. File Upload Endpoint (Option A)

### 8.1 Setup

- Dependency: `multer`, `@types/multer`
- Storage: `server/uploads/` (create directory)
- Static serve: `app.use('/uploads', express.static('uploads'))` in `index.js`
- Limits: 10MB, allowed MIME: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

### 8.2 Multer Config (new file: `server/src/middleware/upload.js`)

```ts
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const timestamp = Date.now();
    cb(null, `${base}-${timestamp}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
```

### 8.3 Routes in `modules.js`

```ts
import { upload } from '../middleware/upload.js';

// POST /api/admin/modules/:id/upload
router.post('/:id/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const module = await prisma.module.findUnique({ where: { id: req.params.id } });
  if (!module) return res.status(404).json({ error: 'Module not found' });

  // Delete old file if exists
  if (module.sourceDocumentUrl) {
    const oldPath = path.join(uploadDir, path.basename(module.sourceDocumentUrl));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const url = `/uploads/${req.file.filename}`;
  await prisma.module.update({
    where: { id: module.id },
    data: { sourceDocumentUrl: url },
  });

  res.json({ ok: true, url, filename: req.file.filename });
});

// DELETE /api/admin/modules/:id/upload
router.delete('/:id/upload', requireAdmin, async (req, res) => {
  const module = await prisma.module.findUnique({ where: { id: req.params.id } });
  if (!module) return res.status(404).json({ error: 'Module not found' });

  if (module.sourceDocumentUrl) {
    const filePath = path.join(uploadDir, path.basename(module.sourceDocumentUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.module.update({ where: { id: module.id }, data: { sourceDocumentUrl: null } });
  }
  res.json({ ok: true });
});
```

### 8.4 Serve Static Files (in `index.js`)

```ts
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ... after app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
```

---

## 9. Open Questions / Assumptions

| # | Question / Assumption | Need Confirmation |
|---|------------------------|-------------------|
| 1 | **Pass threshold**: Hardcoded 70%? Configurable per-module? Per-specialty? | Confirm threshold; suggest start with 70% constant, add `passThreshold` field to `Module` later if needed. |
| 2 | **Eligibility wildcard**: `state = ''` means "all states". Is that the desired semantics? | Confirm; alternative is explicit list of states per module. |
| 3 | **Specialty enum values**: Used `HOME_HEALTH_AIDE`, `PERSONAL_CARE_AIDE`, `COMPANION_RESPITE_AIDE`. Match your HR terminology? | Confirm exact labels. |
| 4 | **Staff can take their own assigned modules?** Current design: staff log in, see `/api/staff/me/modules/:id` (quiz detail without answers). They could theoretically take it. Is that intended? | If staff should NOT take quizzes, add a check in `quiz.js` submit to reject if `req.user?.role === 'STAFF'` and `req.user.id === staffMemberId`. |
| 5 | **Senior name only (no email)**: Submission requires `takerName` only. `takerEmail` removed from payload. OK? | Confirm; current schema has `takerEmail` NOT NULL. Will need migration to make it nullable. |
| 6 | **Submission.takerEmail**: Make nullable in schema? | Yes — migration needed: `takerEmail String?` |
| 7 | **Submission.staffMemberId**: Nullable? For elderly flow it's required; for legacy direct-taker flow it's null. | Make nullable; add `@@index([staffMemberId])`. |
| 8 | **Bulk assign skipped reasons**: Current design returns `skipped: string[]` (staff IDs). Should it include reason (ineligible vs already assigned)? | Recommend returning `{ staffId, reason: 'INELIGIBLE' | 'ALREADY_ASSIGNED' }[]`. |
| 9 | **Module source document**: Only one file per module? Option A says "attached source document" (singular). | Confirm; current design supports one file (replaces on re-upload). |
| 10 | **Staff self-service portal**: Staff can view assigned modules and take them. Do they see their own completion history? | `GET /api/staff/me` includes completions — yes. |
| 11 | **Admin roster pagination**: Default page size? | Suggest 25; allow `limit` query param (max 100). |
| 12 | **Search/filter on roster**: By name, specialty, state. Implemented in query params. | Confirm filter fields. |
| 13 | **Migration strategy**: Existing `User.role` enum has `TAKER`. Adding `STAFF` requires Prisma migration. DB agent handles. | Coordinate with DB agent. |
| 14 | **SubmissionAnswer.isCorrect**: Already stored. Used for breakdown. No changes needed. | — |
| 15 | **Quiz time limit / proctoring**: Not in scope. | — |

---

## 10. File Touch Map (Where Changes Land)

| File | Changes |
|------|---------|
| `server/prisma/schema.prisma` | Add `Specialty` enum, `STAFF` to `Role`, `User.specialty/state`, `Module.sourceDocumentUrl`, `ModuleEligibility`, `StaffModuleAssignment`, `StaffModuleCompletion`, `Submission.staffMemberId`, make `Submission.takerEmail` optional |
| `server/src/middleware/auth.js` | Add `requireStaff` export |
| `server/src/middleware/upload.js` | **NEW** — multer config |
| `server/src/routes/auth.js` | Add `POST /staff/login`, `POST /staff/register` (admin) |
| `server/src/routes/modules.js` | Add `POST /:id/upload`, `DELETE /:id/upload`, `GET /eligible` (admin), `GET /eligible` (staff — new router or same with `requireStaff`) |
| `server/src/routes/quiz.js` | Modify `POST /:id/submit` (add `staffMemberId`, create `StaffModuleCompletion`), add `GET /staff-list` |
| `server/src/routes/staff.js` | **NEW** — roster, detail, assign, remove, bulk-assign, me, my-modules |
| `server/src/routes/stats.js` | Add `GET /staff-progress` (optional) |
| `server/src/index.js` | Mount `/api/admin/staff`, `/api/staff`, static `/uploads`, import new routes |

---

## 11. Suggested Implementation Order

1. **Schema migration** (DB agent) — new models, enums, fields.
2. **Auth middleware** — add `requireStaff`.
3. **Staff auth routes** — login/register.
4. **Module eligibility model + endpoints** — `ModuleEligibility` CRUD (admin), `GET /eligible`.
5. **Staff roster + detail** — `GET /api/admin/staff`, `GET /api/admin/staff/:id`.
6. **Assignment endpoints** — assign, remove, bulk-assign.
7. **Staff self-service** — `GET /api/staff/me`, `GET /api/staff/me/modules/:id`.
8. **Quiz submission attribution** — modify `POST /api/quiz/:id/submit`, add `GET /api/quiz/staff-list`.
9. **File upload** — multer middleware, upload/delete endpoints, static serve.
10. **Stats extension** — optional.

---

*End of design document. Ready for review and implementation planning.*