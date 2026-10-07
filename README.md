# Quiz App

A full-stack quiz platform with two roles:

- **Admin** — create/edit/delete modules (quiz sets), add/edit/reorder questions with 4 options each, publish/draft modules, and review all submissions (score, percentage, per-question breakdown).
- **Quiz Taker** — no login needed; enters name/email, picks a published module, answers one question at a time, and sees a score with a per-question breakdown. Submissions are saved so the admin can review them.

## Tech stack

| Layer      | Tech                                  |
| ---------- | ------------------------------------- |
| Frontend   | React 19 + Vite + React Router        |
| Backend    | Node.js + Express (REST API)          |
| Database   | PostgreSQL (via Prisma ORM)           |
| Auth       | JWT (admin routes protected)          |

## Requirements

- Node.js 20+ and npm
- PostgreSQL 16 running locally on port 5432

## Setting up the project

### 1. Install dependencies

At the project root:

```bash
npm install
npm --prefix server install
```

### 2. Configure the database

Create the database (one time):

```bash
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE quizapp;"
```

Set your database credentials in `server/.env`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/quizapp?schema=public"
JWT_SECRET="change-this-to-a-long-random-string"
PORT=4000
```

Create the tables and seed demo data:

```bash
npm --prefix server run db:push
npm --prefix server run db:seed
```

`db:push` syncs the Prisma schema to PostgreSQL; `db:seed` adds the demo admin account and two sample modules (one published with 3 questions).

### 3. Run everything

One command starts both the API (port 4000) and the Vite frontend (port 5173):

```bash
npm run dev
```

Open http://localhost:5173

To run them separately:

```bash
npm run dev:server   # API on http://localhost:4000
npm run dev:web      # frontend on http://localhost:5173
```

The frontend proxies `/api/*` to the backend in development (see `vite.config.ts`).

## Demo credentials

Login at http://localhost:5173/admin/login

```
Email:    admin@quizapp.com
Password: admin123
```

## Featured routes

| Route                     | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `/`                       | Landing page                               |
| `/admin`                  | Admin → list & create modules              |
| `/admin/modules/:id`      | Admin → edit module, questions, reorder    |
| `/admin/submissions`      | Admin → submissions table (filter/sort)    |
| `/admin/submissions/:id`  | Admin → full answer breakdown              |
| `/quiz`                   | Published modules (taker)                  |
| `/quiz/:id`               | Take the quiz (one question at a time)     |
| `/quiz/:id/result`        | Score + answer breakdown                   |

## API overview

- `POST /api/auth/login` — admin login (JWT)
- `GET/POST/PATCH/DELETE /api/admin/modules` — module CRUD
- `POST/PUT/PATCH/DELETE /api/admin/modules/:id/questions...` — question CRUD + reorder
- `GET /api/admin/submissions?moduleId=&sort=&order=` — submissions list
- `GET /api/admin/submissions/:id` — submission detail with answers
- `GET /api/quiz` — published modules for takers
- `GET /api/quiz/:id` — public quiz (no correct answers included)
- `POST /api/quiz/:id/submit` — grade + save a submission

## Project structure

```
├── server/                 # Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma   # data model
│   │   └── seed.js         # demo data
│   └── src/
│       ├── index.js        # server entry
│       ├── middleware/auth.js
│       └── routes/         # auth, modules, submissions, quiz
└── src/                    # React frontend
    ├── pages/              # screens (admin/ and quiz/)
    ├── components/
    ├── context/AuthContext.jsx
    ├── api.js              # fetch wrapper
    └── App.jsx             # routes
```