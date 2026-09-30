# Refactor plan — Nurses & Caregivers training app

Shared contract for database / backend / frontend / testing agents. Do not change this
file; if something here is wrong or impossible, report back to the orchestrator instead.

## Product decisions (locked)

1. Roles are **ADMIN**, **NURSE**, **CAREGIVER**. `STAFF` and `TAKER` are removed.
2. The **Residents / SeniorProfile (elderly) feature is removed everywhere** — data model,
   API, UI, seed, CSS. Nothing reads or writes senior/resident data afterwards.
3. Uploaded **videos must be 10 minutes or shorter** — enforced server-side (authoritative)
   and pre-checked in the browser with a clear error. Audio unchanged (50 MB cap stays).
4. The **public / no-login quiz flow is removed** (`/quiz`, `/quiz/:id`, `/quiz/:id/result`
   and `/api/quiz`). Everything is behind login; every submission is tied to the logged-in
   nurse/caregiver.
5. Admins **assign modules** to nurses/caregivers (existing assignment flow is kept).
6. Keep the existing `Specialty` enum and `ModuleEligibility` gating — it drives which
   modules may be assigned to which staff. (Unchanged on purpose.)

## Data model (server/prisma/schema.prisma)

- `enum Role { ADMIN NURSE CAREGIVER }` (remove `TAKER`, `STAFF`).
- Delete `model SeniorProfile`.
- `Submission`: delete `seniorProfileId` field, its relation and its `@@index`.
- `User`: delete the `seniorProfiles` relation.
- Everything else (Module, Question, QuestionOption, Submission, SubmissionAnswer,
  StaffModuleAssignment, StaffModuleCompletion, ModuleEligibility, BugReport) stays.
- Sync with `npm --prefix server run db:push` and re-run `npm --prefix server run db:seed`.
  Existing rows with `role = 'STAFF'` must end up as `NURSE` (SQL update before push, or
  accept a data reset + reseed — either is fine, but afterwards an ADMIN login, one NURSE
  and one CAREGIVER must exist).

## Auth (server/src/routes/auth.js)

- `POST /api/auth/login` — **ADMIN only** (admin login page uses it).
- `POST /api/auth/staff/login` — **NURSE or CAREGIVER only**.
- `POST /api/auth/staff/register` — `requireAdmin`; body gains `role: 'NURSE' | 'CAREGIVER'`
  (validated, required). `specialty` stays required.
- **Delete `POST /api/auth/register`** (public endpoint that created admins).
- `signToken` payload unchanged: `{ id, name, email, role, specialty }`.
- `middleware/auth.js`: `requireStaff` allows `NURSE` or `CAREGIVER` (and `ADMIN`, as today).
- `requireAdmin` unchanged.

## Admin API (unchanged shapes)

`GET/POST/DELETE /api/admin/staff...`, `POST /api/admin/staff/:id/modules`,
`DELETE /api/admin/staff/:id/modules/:moduleId`, `POST /api/admin/staff/bulk-assign`,
`PATCH /api/admin/staff/:id/status`, module/question CRUD,
`GET /api/admin/modules/eligible?staffIds=`, submissions list/detail, stats, storage.

Two fixes in admin data:
- `server/src/routes/stats.js` — "Unique takers" groups by `takerEmail` (always empty) and
  is always 0/1. Replace with a meaningful metric (e.g. distinct staff with a completion).
- Admin submissions queries may return `staffMember` name/role; UI labels say
  "Nurse/Caregiver", not "taker".

## Staff API (`/api/staff`, `requireStaff`)

Kept: `GET /me`, `GET /me/modules`, `GET /me/modules/:moduleId` (questions + options,
**without** answers).

Removed: `GET /me/residents`.

Added:
- `POST /api/staff/me/modules/:moduleId/submit`
  - Requires an existing `StaffModuleAssignment` for the caller (403/404 otherwise) and a
    PUBLISHED module.
  - Body: `{ answers: [{ questionId, selectedOptionId }], timeTakenSeconds?: number }`.
  - Grades server-side (pass ≥ 70%, same rule as today).
  - Saves `Submission` with `staffMemberId = caller.id`, `takerName = caller.name`,
    `takerEmail = caller.email`; upserts `StaffModuleCompletion` on pass (same as today).
  - Response: `{ submissionId, score, total, percent, passed, completedAt, breakdown:
    [{ questionId, text, selectedOptionId, correctOptionId, isCorrect }] }`
    (correct answers are revealed only after submit).
- `GET /api/staff/me/modules/:moduleId/results`
  - Response: `{ attempts: [{ id, score, total, percent, passed, submittedAt }],
    latest: { score, total, percent, passed, submittedAt, breakdown: [...] } | null }`

## Removed backend surface

- `server/src/routes/admin/residents.js` (whole file) + its import/mount in `index.js`.
- All senior endpoints in `server/src/routes/quiz.js` and the router's mount
  (`/api/quiz`) — the router is deleted; staff submit now lives under `/api/staff`.
- Dead one-off scripts in `server/` (`check-data.js`, `check-users.js`, `cleanup_sub.cjs`,
  `del_sub.cjs`) may be deleted; `server/DESIGN.md` senior sections: leave the file alone
  unless trivial.
- Fix `index.js` multer error text: documents 25 MB, media 50 MB (currently always says 25MB).

## Video 10-minute cap

- `server/src/routes/modules.js` `POST .../questions/:qid/media`: after `uploadBuffer`,
  if the asset is a video and `duration > 600` seconds → destroy the Cloudinary asset and
  respond `400` with `"Videos must be 10 minutes or shorter (this one is M:SS)."`
  Also add a hard guard: reject before upload when a client-supplied duration field
  (`durationSeconds`) exceeds 600, and keep the 50 MB multer cap.
- `src/pages/admin/ModuleEditor.jsx` (`uploadMedia`): read duration from the chosen file
  with a detached `<video>` element, block > 600 s client-side with the same message,
  show helper copy "Videos: max 10 minutes (50 MB)".

## Frontend routes (src/App.jsx) — final

- `/` `RoleSelect` — two cards only: **Staff** (`/staff/login`) and **Admin**
  (`/admin/login`). Resident card deleted.
- `/admin/*` — unchanged minus `/admin/residents`.
- `/staff/login`, `/staff` layout (guard: `role === 'NURSE' || role === 'CAREGIVER'`),
  `/staff/dashboard`, `/staff/plan`, `/staff/modules/:id`,
  **new `/staff/modules/:id/quiz`** (one page: intro → questions → result/breakdown).
- Deleted: `/quiz`, `/quiz/:id`, `/quiz/:id/result` and the three page files
  (`src/pages/quiz/QuizList.jsx`, `TakeQuiz.jsx`, `QuizResult.jsx`).

## Frontend behaviour notes

- `StaffDashboard.jsx`: remove the residents section, resident picker, "Start Quick
  Session", `/staff/me/residents` fetch and `startSession`; remove dead defensive fields
  (`dueDate`, `attempts`, `lastQuiz`). Show assigned modules with status badges, overall
  progress, and recent results; link module → `/staff/modules/:id`.
- `StaffModule.jsx`: "Begin quiz" → `/staff/modules/:id/quiz`. Show latest result if any.
- New `StaffQuiz.jsx`: fetch `GET /staff/me/modules/:id` (or `/results` first), one
  question at a time (reuse the existing look/feel of the old TakeQuiz), submit to
  `POST /staff/me/modules/:id/submit`, render score ring + per-question breakdown and
  pass/fail, link back to the module/dashboard. Must set `user.role === 'NURSE' ||
  'CAREGIVER'` behaviour — no name/senior/staff pickers.
- `Staff.jsx` (admin): "Add staff" modal gains a **Role** selector (Nurse / Caregiver)
  sent as `role`.
- `StaffTrainingPlan.jsx`: no functional change expected (assignment endpoints kept).
- `Submissions.jsx` / `SubmissionDetail.jsx`: label the person as staff member (name +
  role where available), drop "taker" wording.
- `Residents.jsx` deleted; its `Modal` helper is page-local — if other pages need it,
  move it to `src/components/`; otherwise it goes with the file.
- CSS: prune the resident/senior blocks in `src/App.css` (lines ~4005-4310, 4318-4339,
  4424-4538, 4781-4884, 5028-5055, 5313-5520, 5441-5490, 5608-5700) and any
  `.senior-*` / `.resident-*` rules in `index.css`.

## Seed (server/prisma/seed.js)

- No SeniorProfiles, no senior-linked submissions.
- Demo users: 1 ADMIN (existing `admin@quizapp.com` / `admin123`), at least 1 NURSE and
  1 CAREGIVER with known passwords (document them), plus the existing sample modules with
  eligibility, assignments, and a couple of real staff submissions/completions so admin
  screens have data.

## Verification (testing agent, last)

- `npm run build` + lint pass; server starts; `db:push`/`db:seed` clean.
- Admin login → create nurse + caregiver → assign module → nurse/caregiver login →
  dashboard shows assignment → take quiz → submit → pass/fail + breakdown shown →
  admin sees the submission with the staff name.
- Public `/quiz` and `/admin/residents` return the SPA (no such route) and no API exists.
- Video > 10 min rejected server-side and client-side; ≤ 10 min accepted.
- No remaining references to `senior`, `resident`, `TAKER`, `STAFF` role in code.
