import { Link } from 'react-router-dom'
import { Download, MonitorSmartphone, ShieldCheck, UserRound } from 'lucide-react'
import Brand from '../components/Brand'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function Help() {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const adminUrl = `${origin}/admin/login`
  const staffUrl = `${origin}/staff/login`
  const apkUrl = import.meta.env.VITE_APK_URL || `${API_BASE}/uploads/quizapp-debug.apk`

  return (
    <>
      <Brand back="/" backLabel="Back to home" />
      <div className="main">
        <div className="card help-card">
          <p className="eyebrow">Goodwill Caring Healthcare Services</p>
          <h1 className="page-title">How to use the app</h1>
          <p className="help-lead">
            One system, two doors: <strong>Admin</strong> (your client, on the website) and{' '}
            <strong>Staff</strong> (nurses &amp; caregivers, on the website or the Android app).
            Both talk to the same backend, so everything stays in sync.
          </p>

          <section className="help-section">
            <h2 className="help-h2">
              <ShieldCheck size={18} /> For the admin (your client)
            </h2>
            <ol className="help-steps">
              <li>
                Open the admin login page: <code>{adminUrl || '/admin/login'}</code>
                <br />
                <span className="help-hint">
                  On Render this becomes something like{' '}
                  <code>https://quiz-app-frontend.onrender.com/admin/login</code> — that URL is
                  the link you hand to your client.
                </span>
              </li>
              <li>
                Log in with the admin account (<code>admin@quizapp.com</code> /{' '}
                <code>admin123</code> — change the password after handover).
              </li>
              <li>
                Go to <strong>Staff</strong> → add nurses/caregivers (name, email, password,
                role, specialty).
              </li>
              <li>
                Go to <strong>Modules</strong> → create or publish a training module, then assign
                it to staff from the staff member&apos;s training plan page.
              </li>
              <li>
                Go to <strong>Submissions</strong> → review scores, pass/fail, and per-question
                breakdowns.
              </li>
            </ol>
            <Link className="btn btn-primary" to="/admin/login">
              Open admin login
            </Link>
          </section>

          <section className="help-section">
            <h2 className="help-h2">
              <UserRound size={18} /> For nurses &amp; caregivers
            </h2>
            <ol className="help-steps">
              <li>
                Open the staff login page: <code>{staffUrl || '/staff/login'}</code>
              </li>
              <li>Log in with the account the admin created for you.</li>
              <li>
                Open <strong>Dashboard</strong> → pick an assigned module → <strong>Begin
                quiz</strong> → answer one question at a time → submit.
              </li>
              <li>See your score, pass/fail, and review per-question feedback.</li>
            </ol>
            <Link className="btn btn-ghost" to="/staff/login">
              Open staff login
            </Link>
          </section>

          <section className="help-section">
            <h2 className="help-h2">
              <MonitorSmartphone size={18} /> Android app download
            </h2>
            <p>
              Staff can also use the Android app. It uses the same accounts and the same backend
              as this website.
            </p>
            <a className="btn btn-primary" href={apkUrl} download>
              <Download size={16} /> Download quizapp-debug.apk
            </a>
            <ol className="help-steps">
              <li>Open the download link above in the phone&apos;s browser.</li>
              <li>After it downloads, tap the file and allow <strong>Install from unknown sources</strong> when prompted.</li>
              <li>Open the app and log in with your staff account.</li>
            </ol>
            <p className="help-hint">
              Tip: set <code>VITE_APK_URL</code> to a permanent link (a GitHub Release asset,
              e.g. <code>https://github.com/&lt;you&gt;/&lt;repo&gt;/releases/download/…/quizapp.apk</code>)
              so the button keeps working after redeploys. Without it, the button points at the
              API&apos;s <code>server/uploads</code> folder, which is wiped on every restart.
            </p>
          </section>

          <p className="help-hint">
            Website + app + admin are one system: the website and the Android app both call the
            same API (<code>/api/…</code> on port 4000 locally, your Render backend URL in
            production), so a quiz taken on the phone shows up in the admin&apos;s submissions
            table.
          </p>
        </div>
      </div>
      <footer className="site-footer">Goodwill Caring Care Academy · built with React + Express</footer>
    </>
  )
}
