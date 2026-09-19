# Quiz App — Marketing / Landing Page

This folder is a **standalone, dependency-free static site** that advertises the
Quiz App. It is built with plain HTML + CSS + JS — no build step, no framework,
no package.json. It lives inside the repo so it deploys straight from GitHub on
[Render](https://render.com).

| File         | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `index.html` | Page structure & copy (hero, features, install…)   |
| `style.css`  | Design system, animations, responsive layout       |
| `script.js`  | Reveal-on-scroll, stat counters, install dialog    |
| `render.yaml`| Optional Render Blueprint (Infrastructure as Code) |

---

## Deploy on Render (recommended — free plan works)

1. Push this repo to GitHub (the `marketing/` folder is included).
2. Go to the [Render Dashboard](https://dashboard.render.com) → **New** → **Static Site**.
3. Connect your GitHub account if you haven't, then pick the `QUIZ-APP` repo.
4. Fill in the form:
   - **Name**: `quiz-app-marketing` (or anything you like)
   - **Build Command**: leave **empty** (no build step; `echo "skip"` also works)
   - **Publish Directory**: `marketing`
   - **Branch**: `main`
5. Click **Create Static Site**. Render gives you a free `https://quiz-app-marketing.onrender.com` URL in ~1 minute.

> That's it — no config files required for this flow. The free plan is fine;
> Re-renders on every push to `main` by default.

## Deploy via Render Blueprint (optional)

If you prefer Infrastructure-as-Code, `render.yaml` in this folder defines the
same static site (`runtime: static`, `staticPublishPath: ./marketing`). Use the
dashboard **New → Blueprint** flow and point it at this repo; it creates the
service from the file.

## Verifying locally

```bash
# from the repo root — serves the marketing folder at http://localhost:8080
npx serve marketing
```

## Notes

- This landing page is **front-end only**. To use the actual app, clone the repo,
  set up PostgreSQL (see the root `README.md`), and run `npm run dev` — the API
  serves on port 4000 and the Vite app on 5173.
- The **Android APK** is the debug build packaged with Capacitor. It is served by
  the Express backend at `GET /app.apk` (equivalent to `/uploads/quizapp-debug.apk`),
  and the server's root page (`/`) is a LAN install page: with the backend running,
  open `http://<your-computer-ip>:4000/` in the phone's browser to download it.