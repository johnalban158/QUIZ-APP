# Quiz App — REST API Contract (FROZEN)

> **Scope**: The single source of truth for the `/api` surface that the React client
> (`src/`) consumes. Both the backend agent (implementation) and the frontend agent
> (build) work against **this document**, not against each other's working tree.
>
> **Status**: Frozen as of the ADMIN/NURSE/CAREGIVER refactor. Any change to a shape
> below is a breaking change and must be negotiated before implementation.
>
> **Reference design**: `server/DESIGN.md` — historical design notes. Where it
> contradicts this file (public `/api/quiz` flow, `TAKER`/`STAFF` roles, `state`
> dimension, senior/resident features), **this file wins**.

---

## 0. Conventions

| Aspect | Rule |
|---|---|
| Base path | `/api` (dev: Vite proxy → `http://localhost:4000`) |
| Content type | `application/json` request/response, except multipart uploads |
| Auth | `Authorization: Bearer <JWT>`; token TTL **7d**; payload `{ id, name, email, role, specialty }` |
| Success | `2xx` with JSON body (no envelope wrapper unless stated) |
| Error | Non-2xx with `{ "error": "<human-readable message>" }`; extra fields allowed |
| 401 on authed call | Client must drop the stored session (invalid/expired/frozen) |
| Unknown `/api/*` | Always `404 { "error": "Not found" }` as JSON, never HTML |
| IDs | cuid strings |
| Dates | ISO-8601 strings (Prisma `DateTime`) |
| Pagination | `?page=&limit=` → response `meta: { total, page, limit }` |

### 0.1 Roles (no others exist)

| Role | Login endpoint | Access |
|---|---|---|
| `ADMIN` | `POST /api/auth/login` (alias `/api/auth/admin/login`) | Admin surface **and** staff surface |
| `NURSE` | `POST /api/auth/staff/login` | Staff surface only |
| `CAREGIVER` | `POST /api/auth/staff/login` | Staff surface only |

`STAFF`, `TAKER`, `RESIDENT` are **not** role values. Staff-ness is expressed as
`role in ('NURSE','CAREGIVER')`.

### 0.2 Middleware

- `requireAuth` — valid, unexpired JWT + account exists + `isActive === true`. Else `401`.
- `requireAdmin` — `requireAuth` + `role === 'ADMIN'`. Else `403 { error: 'Admin access required' }`.
- `requireStaff` — `requireAuth` + `role in ('NURSE','CAREGIVER','ADMIN')`. Else `403 { error: 'Staff access required' }`.

A frozen account (`isActive === false`) yields `401` on **every** authed request
(force logout), and `403 { error: 'Account frozen. Contact an administrator.' }` at login.

### 0.3 Business rules

- **Pass threshold**: `percent >= 70` (server-side constant, not configurable).
- **Eligibility**: `ModuleEligibility` is `{ moduleId, specialty }` only — **no state**.
  A `PUBLISHED` module is eligible for a staff member iff a row exists with their `specialty`.
- **Quiz grading**: server-side only. Correct option IDs are never sent to a client
  before submission.
- **Video media**: `<= 600s (10:00)`, max 50 MB, `audio/*` or `video/*`.
- **Document uploads**: PDF, DOCX, PPT, PPTX, TXT; max 25 MB; stored at `server/uploads/`, served from `/uploads/...`.
- **Removed by refactor** (must 404, never 200): public quiz list/detail/submit,
  staff-picker, resident/senior profile endpoints, public self-registration.

---

## 1. Endpoint Index

### Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | public | Admin login (ADMIN only) |
| `POST` | `/api/auth/admin/login` | public | Alias of the above |
| `POST` | `/api/auth/staff/login` | public | Staff login (NURSE/CAREGIVER only) |
| `POST` | `/api/auth/staff/register` | admin | Create a staff account (role required) |

### Staff self-service
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/staff/me` | staff | Own profile + progress + completions |
| `GET` | `/api/staff/me/modules` | staff | Own assignments with status |
| `GET` | `/api/staff/me/modules/:moduleId` | staff | Study/take view (no correct flags) |
| `GET` | `/api/staff/me/modules/:moduleId/results` | staff | Past attempts |
| `POST` | `/api/staff/me/modules/:moduleId/submit` | staff | Grade + record an attempt |

### Admin — staff roster
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/staff` | admin | Roster with computed progress |
| `GET` | `/api/admin/staff/:id` | admin | One staff member + training plan |
| `POST` | `/api/admin/staff/:id/modules` | admin | Assign a module |
| `DELETE` | `/api/admin/staff/:id/modules/:moduleId` | admin | Remove assignment (blocked if completed) |
| `POST` | `/api/admin/staff/bulk-assign` | admin | Assign one module to many staff |
| `PATCH` | `/api/admin/staff/:id/status` | admin | Freeze / unfreeze (`{ isActive }`) |

### Admin — modules
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/modules` | admin | All modules incl. questions |
| `POST` | `/api/admin/modules` | admin | Create module |
| `PATCH` | `/api/admin/modules/:id` | admin | Update title/description/status/content/eligibility |
| `DELETE` | `/api/admin/modules/:id` | admin | Delete module + dependents |
| `GET` | `/api/admin/modules/eligible` | admin | Modules eligible for given staff IDs |
| `POST` | `/api/admin/modules/:id/upload` | admin | Attach source document (multipart `file`) |
| `DELETE` | `/api/admin/modules/:id/upload` | admin | Detach source document |
| `POST` | `/api/admin/modules/:id/questions` | admin | Add question |
| `PUT` | `/api/admin/modules/:id/questions/:qid` | admin | Replace question text + options |
| `PATCH` | `/api/admin/modules/:id/questions/reorder` | admin | `{ order: string[] }` |
| `DELETE` | `/api/admin/modules/:id/questions/:qid` | admin | Delete question |
| `POST` | `/api/admin/modules/:id/questions/:qid/media` | admin | Attach audio/video (multipart `file`, opt. `durationSeconds`) |
| `DELETE` | `/api/admin/modules/:id/questions/:qid/media` | admin | Remove media |

### Admin — reporting & misc
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/submissions` | admin | Submission list (filter/sort) |
| `GET` | `/api/admin/submissions/:id` | admin | Submission detail w/ answers |
| `GET` | `/api/admin/stats` | admin | Dashboard counters |
| `GET` | `/api/admin/storage` | admin | Media storage meter |
| `GET` | `/api/admin/reports` | admin | Bug-report inbox |
| `POST` | `/api/report-bug` | any signed-in user | File a bug report |
| `GET` | `/api/health` | public | `{ ok: true }` |

### Removed (must 404)
`GET /api/quiz`, `GET /api/quiz/:id`, `POST /api/quiz/:id/submit`,
`GET /api/quiz/staff-list`, `/api/admin/residents*`, `POST /api/auth/register`,
any `state`-based filtering.

---

## 2. Detailed Contracts

Shapes marked **★** are consumed directly by the current React pages and are the
ones that must not drift.

### 2.1 `POST /api/auth/staff/login` ★

Request:
```json
{ "email": "string", "password": "string" }
```
Responses:
- `200`:
```json
{
  "token": "jwt",
  "user": {
    "id": "cuid",
    "name": "Dana Reyes",
    "email": "dana@example.com",
    "role": "NURSE",
    "specialty": "HOME_HEALTH_AIDE"
  }
}
```
- `400 { "error": "Email and password are required" }`
- `401 { "error": "Invalid credentials" }` (bad password **or** role not in `NURSE|CAREGIVER`)
- `403 { "error": "Account frozen. Contact an administrator." }`

`POST /api/auth/login` and `POST /api/auth/admin/login` are identical but accept
**ADMIN only** (same error bodies).

### 2.2 `POST /api/auth/staff/register` ★

Auth: admin.

Request:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "specialty": "HOME_HEALTH_AIDE | PERSONAL_CARE_AIDE | COMPANION_RESPITE_AIDE",
  "role": "NURSE | CAREGIVER"
}
```
Responses:
- `201` — same payload shape as login (`{ token, user }`)
- `400 { "error": "All fields required: name, email, password, specialty, role" }`
- `400 { "error": "role must be 'NURSE' or 'CAREGIVER'" }`
- `409 { "error": "Email already registered" }`
- `403` when called without an admin token

### 2.3 `GET /api/staff/me` ★

Auth: staff.

```json
{
  "id": "cuid",
  "name": "Dana Reyes",
  "email": "dana@example.com",
  "specialty": "HOME_HEALTH_AIDE",
  "isActive": true,
  "assignments": [
    {
      "moduleId": "cuid",
      "moduleTitle": "Safe Transfers",
      "moduleStatus": "PUBLISHED",
      "assignedAt": "2026-09-01T12:00:00.000Z",
      "assignedByName": "Priya Admin",
      "completion": {
        "submissionId": "cuid",
        "score": 8, "total": 10, "percent": 80,
        "passed": true,
        "completedAt": "2026-09-05T09:30:00.000Z"
      },
      "isEligible": true,
      "moduleEligibility": [ { "specialty": "HOME_HEALTH_AIDE" } ]
    }
  ],
  "completions": [
    {
      "moduleId": "cuid",
      "submissionId": "cuid",
      "score": 8, "total": 10, "percent": 80, "passed": true,
      "completedAt": "2026-09-05T09:30:00.000Z",
      "module": { "id": "cuid", "title": "Safe Transfers" }
    }
  ],
  "assignedModules": 4,
  "completedModules": 2,
  "totalEligibleModules": 5,
  "progressPercent": 40
}
```
- `completion` is `undefined`/absent when not completed.
- `progressPercent = round(completedModules / totalEligibleModules * 100)` or `0`.
- `404 { "error": "Staff not found" }` if the token's user is not NURSE/CAREGIVER.

### 2.4 `GET /api/staff/me/modules` ★

Auth: staff.

```json
{
  "modules": [
    {
      "id": "assignmentCuid",
      "moduleId": "moduleCuid",
      "module": { "id": "moduleCuid", "title": "Safe Transfers", "description": "..." },
      "assignedAt": "2026-09-01T12:00:00.000Z",
      "completion": { "score": 8, "total": 10, "percent": 80, "passed": true, "completedAt": "..." },
      "status": "PASSED"
    }
  ]
}
```
`status` is exactly one of:
- `NOT_STARTED` — no completion and no submission
- `IN_PROGRESS` — at least one submission, no completion
- `PASSED` — completion with `passed: true`
- `FAILED` — completion with `passed: false`

`completion` is `null` unless a completion exists. Ordered by `assignedAt desc`.

### 2.5 `GET /api/staff/me/modules/:moduleId` ★

Auth: staff. Module must be **assigned** to the caller and **PUBLISHED**.

```json
{
  "id": "moduleCuid",
  "title": "Safe Transfers",
  "description": "string",
  "content": "markdown/study text",
  "questions": [
    {
      "id": "questionCuid",
      "text": "What is the first step?",
      "orderIndex": 0,
      "mediaUrl": null,
      "mediaType": null,
      "options": [
        { "id": "optionCuid", "text": "Answer A" },
        { "id": "optionCuid", "text": "Answer B" }
      ]
    }
  ]
}
```
**No `isCorrect` field anywhere.** `options` ordered by `id asc`, `questions` by `orderIndex asc`.
Errors: `404 { "error": "Module not assigned to you" }`, `404 { "error": "Module not found or not published" }`.

### 2.6 `POST /api/staff/me/modules/:moduleId/submit` ★

Auth: staff.

Request:
```json
{
  "answers": [ { "questionId": "cuid", "selectedOptionId": "cuid" } ],
  "timeTakenSeconds": 120
}
```
- `answers` must be a non-empty array; entries referencing questions/options outside
  this module are ignored.
- `timeTakenSeconds` optional non-negative integer.

Responses:
- `201`:
```json
{
  "submissionId": "cuid",
  "score": 8,
  "total": 10,
  "percent": 80,
  "passed": true,
  "completedAt": "2026-09-30T10:15:00.000Z",
  "breakdown": [
    {
      "questionId": "cuid",
      "text": "What is the first step?",
      "selectedOptionId": "cuid",
      "correctOptionId": "cuid",
      "isCorrect": true
    }
  ]
}
```
- `breakdown` contains **every** question; unanswered ones have
  `selectedOptionId: null` and `isCorrect: false`.
- Side effect: on `passed === true` a `StaffModuleCompletion` is upserted
  (latest passing attempt wins).
- `400 { "error": "answers must be a non-empty array of { questionId, selectedOptionId }" }`
- `400 { "error": "timeTakenSeconds must be a non-negative integer" }`
- `400 { "error": "answers must reference this module's questions and options" }`
- `403 { "error": "Module is not assigned to you" }`
- `404 { "error": "Module not found or not published" }`

### 2.7 `GET /api/staff/me/modules/:moduleId/results` ★

Auth: staff. Ordered by `submittedAt desc`.

```json
{
  "attempts": [
    {
      "id": "submissionCuid",
      "score": 8, "total": 10, "percent": 80,
      "passed": true,
      "submittedAt": "2026-09-30T10:15:00.000Z"
    }
  ],
  "latest": {
    "id": "submissionCuid",
    "score": 8, "total": 10, "percent": 80,
    "passed": true,
    "submittedAt": "2026-09-30T10:15:00.000Z",
    "breakdown": [
      {
        "questionId": "cuid",
        "text": "What is the first step?",
        "selectedOptionId": "cuid",
        "correctOptionId": "cuid",
        "isCorrect": true
      }
    ]
  }
}
```
- `latest` is `null` when there are no attempts; otherwise it is the newest entry of
  `attempts` **plus** a `breakdown` rebuilt from the stored answers (same item shape
  as §2.6 `breakdown`, including unanswered questions with `selectedOptionId: null`).
- `404 { "error": "Module not assigned to you" }` when there is no assignment.

### 2.8 `GET /api/admin/staff` ★

Auth: admin. Query: `page` (default 1), `limit` (default 25, max 100),
`search` (name/email, case-insensitive), `specialty` (exact enum).

```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Dana Reyes",
      "email": "dana@example.com",
      "specialty": "HOME_HEALTH_AIDE",
      "isActive": true,
      "assignedModules": 4,
      "completedModules": 2,
      "totalEligibleModules": 5,
      "progressPercent": 40
    }
  ],
  "meta": { "total": 37, "page": 1, "limit": 25 }
}
```
Ordered by `name asc`. Only `NURSE`/`CAREGIVER` rows are returned.

### 2.9 `GET /api/admin/staff/:id` ★

Auth: admin. Same scalar fields as a roster row plus `assignments`
(the §2.3 `assignments` shape) and the same progress counters.

Errors: `404 { "error": "Staff not found" }`.

### 2.10 Assignment endpoints ★

`POST /api/admin/staff/:id/modules` — body `{ "moduleId": "cuid" }`
- `201`:
```json
{
  "ok": true,
  "assignment": {
    "moduleId": "cuid", "moduleTitle": "Safe Transfers",
    "moduleStatus": "PUBLISHED",
    "assignedAt": "...", "assignedByName": "Priya Admin"
  }
}
```
- `400 { "error": "moduleId is required" }`
- `400 { "error": "Module must be PUBLISHED to assign" }`
- `400 { "error": "Staff member is not eligible for this module" }`
- `404` for unknown staff or module
- Idempotent (upsert) — re-assigning returns `201` without duplicating.

`DELETE /api/admin/staff/:id/modules/:moduleId`
- `200 { "ok": true }`
- `409 { "error": "Cannot remove assignment: staff has already completed this module" }`

`POST /api/admin/staff/bulk-assign` — body `{ "staffIds": ["cuid"], "moduleId": "cuid" }`
- `200`:
```json
{
  "ok": true,
  "created": 3,
  "skipped": [
    { "staffId": "cuid", "reason": "INELIGIBLE" },
    { "staffId": "cuid", "reason": "ALREADY_ASSIGNED" }
  ]
}
```
`skipped[].reason` is exactly `INELIGIBLE | ALREADY_ASSIGNED`.
- `400` when `staffIds` empty/not an array or `moduleId` missing, or a staff ID is unknown
- `404 { "error": "Module not found or not published" }`

`PATCH /api/admin/staff/:id/status` — body `{ "isActive": boolean }`
- `200 { "ok": true, "user": { id, name, email, specialty, isActive } }`
- `400 { "error": "You cannot freeze your own account" }`
- `400 { "error": "isActive (boolean) is required" }`
- `404 { "error": "Staff not found" }`

### 2.11 `GET /api/admin/modules/eligible`

Auth: admin. Query: `staffIds` (repeatable or comma-free single value; array form
`?staffIds=a&staffIds=b`).

```json
[ { "id": "cuid", "title": "Safe Transfers", "description": "...", "status": "PUBLISHED" } ]
```
- Returns `[]` when no `staffIds` are supplied or none match.
- Intersection semantics are **not** applied — a module is returned if it is eligible
  for *any* supplied staff member (union), which is what the bulk-assign picker expects.
- Ordered by `title asc`; only `PUBLISHED` modules.

### 2.12 `GET /api/admin/modules`

Auth: admin. Returns an **array** of modules (not enveloped):

```json
[
  {
    "id": "cuid", "title": "...", "description": "...",
    "status": "DRAFT | PUBLISHED",
    "content": "...",
    "sourceDocumentUrl": "/uploads/....pdf" ,
    "createdAt": "...", "updatedAt": "...",
    "eligibility": [ { "specialty": "HOME_HEALTH_AIDE" } ],
    "questions": [
      {
        "id": "cuid", "text": "...", "orderIndex": 0,
        "mediaUrl": null, "mediaType": null, "mediaPublicId": null,
        "options": [ { "id": "cuid", "text": "...", "isCorrect": true } ]
      }
    ],
    "_count": { "submissions": 12, "questions": 10 },
    "avgScore": 74,
    "lastSubmittedAt": "2026-09-28T08:00:00.000Z"
  }
]
```
`avgScore` / `lastSubmittedAt` are `null` when the module has no submissions.
Ordered by `createdAt desc`.

`POST /api/admin/modules` — body `{ title (required), description?, status?, content?, eligibility? }`
→ `201` with the full module object above.

`PATCH /api/admin/modules/:id` — partial: `title`, `description`, `status`
(`DRAFT|PUBLISHED`), `content`, `eligibility` (array of `{ specialty }`, **replaces** all rows).
→ `200` full module object. `400 { "error": "Title cannot be empty" }`.

`DELETE /api/admin/modules/:id` → `200 { "ok": true }`, `404 { "error": "Module not found" }`.

### 2.13 Questions

| Endpoint | Body | Success |
|---|---|---|
| `POST /api/admin/modules/:id/questions` | `{ text, options: [{ text, isCorrect }] }` | `201` question w/ `options` |
| `PUT /api/admin/modules/:id/questions/:qid` | `{ text, options: [...] }` | `200` question w/ `options` |
| `PATCH /api/admin/modules/:id/questions/reorder` | `{ order: [questionId, ...] }` | `200 { ok: true }` |
| `DELETE /api/admin/modules/:id/questions/:qid` | — | `200 { ok: true }` |

Validation errors are `400` with:
- `"Question text is required"`
- `"A question needs at least 2 options"`
- `"A question needs exactly one correct option"`
- `"order must be an array of question ids"` / `"order must contain every question id exactly once"`

### 2.14 Question media (Cloudinary)

`POST /api/admin/modules/:id/questions/:qid/media` — `multipart/form-data`, field `file`,
optional field `durationSeconds` (number, seconds).
- `200` → updated question object (with `mediaUrl`, `mediaType: 'AUDIO'|'VIDEO'`, `mediaPublicId`).
- `400 { "error": "Only audio and video files are allowed" }`
- `400 { "error": "File too large (max 50MB)" }`
- `400` for over-long video:
```json
{
  "error": "Videos must be 10 minutes or shorter (this one is 11:20).",
  "durationSeconds": 680,
  "durationSource": "client-supplied durationSeconds field (pre-upload guard)"
}
```
`durationSource` is either
`"client-supplied durationSeconds field (pre-upload guard)"` or
`"Cloudinary upload result \"duration\" field (seconds)"`.
- `500` when Cloudinary env vars are missing (message names the three vars).

`DELETE .../questions/:qid/media` → `200` updated question with media nulled.

### 2.15 Source documents

`POST /api/admin/modules/:id/upload` — multipart field `file` (PDF/DOCX/PPT/PPTX/TXT, 25 MB)
→ `200 { "ok": true, "url": "/uploads/name-<ts>.pdf", "filename": "name-<ts>.pdf" }`
`DELETE /api/admin/modules/:id/upload` → `200 { "ok": true }`

Errors: `400 { "error": "No file uploaded" }` · `400 { "error": "File too large (max 25MB)" }` ·
`400 { "error": "Only PDF, DOCX, PPT, PPTX, and TXT files are allowed" }` ·
`404 { "error": "Module not found" }`

### 2.16 `GET /api/admin/submissions`

Auth: admin. Query: `moduleId`, `sort` (`score` → sort by score, else `submittedAt`),
`order` (`asc`|`desc`, default `desc`).

```json
[
  {
    "id": "cuid",
    "moduleId": "cuid",
    "takerName": "Dana Reyes",
    "takerEmail": "dana@example.com",
    "score": 8, "total": 10,
    "timeTakenSeconds": 120,
    "submittedAt": "...",
    "module": { "id": "cuid", "title": "Safe Transfers" },
    "staffMember": {
      "id": "cuid", "name": "Dana Reyes",
      "email": "dana@example.com",
      "role": "NURSE",
      "specialty": "HOME_HEALTH_AIDE"
    }
  }
]
```
**Note (frozen as-is):** `staffMember` may be `null` for legacy rows created before the
refactor; `takerName` is the display-name fallback. UI labels must read
"Staff member" / role, never "taker" or "resident". The **field names**
`takerName` and `stats.uniqueTakers` are part of this contract and will not be renamed.

`GET /api/admin/submissions/:id` → `200` submission with:
```json
{
  "...": "all list fields above",
  "answers": [
    {
      "id": "cuid",
      "isCorrect": true,
      "question": {
        "id": "cuid", "text": "...",
        "options": [ { "id": "cuid", "text": "...", "isCorrect": true } ]
      },
      "selectedOption": { "id": "cuid", "text": "..." }
    }
  ]
}
```
`404 { "error": "Submission not found" }`.

### 2.17 `GET /api/admin/stats`

Auth: admin.

```json
{
  "publishedModules": 6,
  "totalSubmissions": 142,
  "uniqueTakers": 12,
  "activeStaff": 9,
  "averageScorePercent": 78,
  "recentSubmissions": 21
}
```
- `uniqueTakers` = distinct `staffMemberId` with ≥1 submission.
- `activeStaff` = distinct staff with ≥1 **passed** completion.
- `recentSubmissions` = submissions in the last 7 days.

### 2.18 `GET /api/admin/storage`

Auth: admin.

```json
{
  "configured": true,
  "provider": "cloudinary",
  "plan": "Free",
  "objects": 14,
  "bytesUsed": 12345678,
  "quotaBytes": 26843545600,
  "usedPercent": 0.05
}
```
When Cloudinary env vars are absent: `configured: false`, zeroed counters, and the
25 GB `quotaBytes` — the meter must render the unconfigured state, not an error.
`500 { "error": "Could not read storage usage" }` on API failure.

### 2.19 Bug reports

`POST /api/report-bug` — auth: any signed-in user.
Body: `{ message (required, ≤5000), category?: GENERAL|BUG|CONTENT|SUGGESTION|OTHER, pageUrl?, userAgent? }`
- `201 { "ok": true, "id": "cuid", "emailed": false, "mailConfigured": false }`
- `400 { "error": "Please describe the problem" }` · `400 { "error": "Message too long (max 5000 characters)" }`
- A mail failure is **not** an error: the report is already persisted.

`GET /api/admin/reports?limit=` (default 50, max 100) → array of report rows,
`createdAt desc`.

---

## 3. Client-Side Expectations (for the frontend agent)

1. All calls go through `src/api.js` → `fetch(\`${API_BASE}/api${path}\`)` with
   `Authorization: Bearer` when a token is stored; a `401` on an authed call clears
   the session locally.
2. Non-2xx responses are surfaced as `Error` with `.status` and the server's
   `error` message; pages must render that message rather than a generic failure.
3. Multipart uploads (source documents, question media) do **not** use `api()` —
   they set no `Content-Type` and append the bearer token manually.
4. Loading and empty states are mandatory for every list endpoint above
   (`[]` / `{ modules: [] }` / `{ data: [], meta }` are all valid empty payloads).
5. The staff surface may only render for `NURSE`, `CAREGIVER` (and `ADMIN` via
   `requireStaff`); the client-side guard mirrors the server rule but is not a
   security boundary.
