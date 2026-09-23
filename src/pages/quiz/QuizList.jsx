import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, FileQuestion, Inbox, Search, UserRound, UserX, UsersRound, WifiOff } from 'lucide-react'
import Brand from '../../components/Brand'
import ReadAloud from '../../components/ReadAloud'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api'

// Elder-friendly shortcut: when a quiz taker's designated module set has
// exactly one PUBLISHED module, take them straight into it — no browsing
// or picking. Runs once per tab session so the back button / "All quizzes"
// still work.
const AUTO_OPEN_KEY = 'quiz_auto_open_done'
const BROWSE_PARAM = 'browse'

export default function QuizList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const presetResidentId = searchParams.get('resident') || ''
  const presetStaffId = searchParams.get('staff') || ''
  const presetName = searchParams.get('name') || ''
  const browseAll = searchParams.get(BROWSE_PARAM) === '1'
  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN'

  // A resident is already chosen via query params (staff-assisted flow) —
  // show ONLY the modules assigned to their designated staff member.
  const usingPreset = presetResidentId !== ''
  // Plain quiz taker: type your name, then we find your quizzes for you.
  const usingNameEntry = !usingPreset && !isStaffOrAdmin && !browseAll
  // Everyone else gets the ordinary published list (staff/admin, or the
  // "browse all available quizzes" fallback offered on the name screen).
  const usingBrowseList = !usingPreset && (isStaffOrAdmin || browseAll)

  // Browse-all list (Flow C)
  const [quizzes, setQuizzes] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Preset resident's designated modules (Flow A). Keyed by resident id so a
  // stale result from a previous resident never flashes on screen.
  const [preset, setPreset] = useState(null) // { for, modules, error }
  const presetData = preset && preset.for === presetResidentId ? preset : null
  const presetModules = presetData ? presetData.modules : null
  const presetError = presetData?.error || ''

  // Name-entry flow (Flow B)
  const [name, setName] = useState(presetName)
  const [nameStep, setNameStep] = useState('idle') // idle | finding | notfound | matching | results
  const [matches, setMatches] = useState([])
  const [match, setMatch] = useState(null)
  const [findError, setFindError] = useState('')

  const autoOpenRef = useRef(false)

  const loadAll = useCallback(async () => {
    try {
      setQuizzes(await api('/quiz'))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (!usingBrowseList) return
    loadAll()
  }, [loadAll, usingBrowseList, reloadKey])

  useEffect(() => {
    if (!usingPreset) return
    let alive = true
    setPreset({ for: presetResidentId, modules: null, error: '' })
    ;(async () => {
      try {
        const data = await api(`/quiz/seniors/${encodeURIComponent(presetResidentId)}/modules`)
        if (alive) {
          setPreset({ for: presetResidentId, modules: Array.isArray(data) ? data : [], error: '' })
        }
      } catch (err) {
        if (alive) {
          setPreset({ for: presetResidentId, modules: [], error: err.message })
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [usingPreset, presetResidentId, reloadKey])

  // Auto-open the single designated/published module for quiz takers. Staff
  // and admins keep the ordinary list (staff should still choose whether to
  // run an assisted session). Preserve ?resident=…&staff=…&name=… when we
  // know the resident's identity so TakeQuiz is pre-filled for them.
  useEffect(() => {
    if (isStaffOrAdmin) return
    if (autoOpenRef.current || sessionStorage.getItem(AUTO_OPEN_KEY)) return

    let modules = null
    let identity = null
    if (usingPreset) {
      if (presetModules === null) return
      modules = presetModules
      identity = { resident: presetResidentId, staff: presetStaffId, name: presetName }
    } else if (usingNameEntry) {
      if (nameStep !== 'results' || !match) return
      modules = Array.isArray(match.modules) ? match.modules : []
      identity = {
        resident: match.senior?.id || '',
        staff: match.staff?.id || match.senior?.preferredStaffId || '',
        name: match.senior?.name || '',
      }
    } else {
      modules = quizzes
    }

    if (!Array.isArray(modules) || modules.length !== 1 || !modules[0]?.id) return

    autoOpenRef.current = true
    try {
      sessionStorage.setItem(AUTO_OPEN_KEY, '1')
    } catch {
      // Session storage unavailable — still auto-open for this render.
    }
    navigate(toQuizUrl(modules[0].id, identity), { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaffOrAdmin, usingPreset, presetModules, presetResidentId, presetStaffId, presetName, usingNameEntry, nameStep, match, quizzes, navigate, location.search])

  const toQuizUrl = (moduleId, identity) => {
    const params = new URLSearchParams(location.search)
    params.delete(BROWSE_PARAM)
    if (identity) {
      if (identity.resident) params.set('resident', identity.resident)
      else params.delete('resident')
      if (identity.staff) params.set('staff', identity.staff)
      else params.delete('staff')
      if (identity.name) params.set('name', identity.name)
      else params.delete('name')
    }
    const qs = params.toString()
    return `/quiz/${moduleId}${qs ? `?${qs}` : ''}`
  }

  const handleFind = async (e) => {
    if (e) e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || nameStep === 'finding') return
    setFindError('')
    setNameStep('finding')
    setMatches([])
    setMatch(null)
    try {
      const data = await api(`/quiz/seniors/find?name=${encodeURIComponent(trimmed)}`)
      const list = Array.isArray(data && data.matches) ? data.matches : []
      setMatches(list)
      if (list.length === 0) {
        setNameStep('notfound')
      } else if (list.length === 1) {
        setMatch(list[0])
        setNameStep('results')
      } else {
        setNameStep('matching')
      }
    } catch (err) {
      setFindError(err.message || 'Could not look up that name')
      setNameStep('idle')
    }
  }

  const pickMatch = (m) => {
    setMatch(m)
    setNameStep('results')
  }

  const resetName = () => {
    setNameStep('idle')
    setFindError('')
  }

  const retryBrowse = () => {
    setQuizzes(null)
    setError('')
    setReloadKey((k) => k + 1)
  }

  const renderQuizCard = (q, identity) => (
    <button
      key={q.id}
      type="button"
      className="quiz-card"
      onClick={() => navigate(toQuizUrl(q.id, identity))}
    >
      <span className="quiz-card-top">
        <span className="quiz-card-icon"><FileQuestion size={24} /></span>
        {typeof q._count?.questions === 'number' && (
          <span className="badge badge-soft">
            {q._count.questions} question{q._count.questions === 1 ? '' : 's'}
          </span>
        )}
      </span>
      <span className="quiz-card-title">{q.title}</span>
      {q.description && <span className="quiz-card-desc">{q.description}</span>}
      <span className="quiz-card-foot">
        Start quiz
        <span className="quiz-card-arrow"><ArrowRight size={16} /></span>
      </span>
    </button>
  )

  // ---- Flow A: resident already chosen via ?resident=… (staff-assisted) ----
  const renderPreset = () => {
    const count = Array.isArray(presetModules) ? presetModules.length : 0
    const identity = { resident: presetResidentId, staff: presetStaffId, name: presetName }
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">Quizzes</p>
            <h1 className="page-title">Quizzes for {presetName || 'you'}</h1>
            <p className="page-sub">These are the quizzes your caretaker set up for you.</p>
          </div>
          {count > 0 && (
            <span className="chip"><FileQuestion size={16} /> {count} quiz{count === 1 ? '' : 'zes'}</span>
          )}
        </div>

        {presetError ? (
          <div className="card empty" role="alert">
            <span className="empty-icon"><WifiOff size={26} /></span>
            <h3>Couldn't load your quizzes</h3>
            <p>{presetError}</p>
            <div className="name-actions-row">
              <button className="btn btn-primary" type="button" onClick={retryBrowse}>
                <ArrowRight size={16} /> Try again
              </button>
              <Link className="btn btn-ghost" to="/quiz?browse=1">
                Browse all quizzes
              </Link>
            </div>
          </div>
        ) : presetModules === null ? (
          <div className="loading">
            <span className="spinner" />
            Loading your quizzes…
          </div>
        ) : count === 0 ? (
          <div className="card empty">
            <span className="empty-icon"><Inbox size={26} /></span>
            <h3>No quizzes set up yet</h3>
            <p>Please ask your caretaker to assign a quiz for you.</p>
            <div className="name-actions-row">
              <Link className="btn btn-ghost" to={`/quiz?${BROWSE_PARAM}=1`}>Browse all available quizzes</Link>
            </div>
          </div>
        ) : (
          <div className="quiz-grid">
            {presetModules.map((q) => renderQuizCard(q, identity))}
          </div>
        )}
      </>
    )
  }

  // ---- Flow B: type-your-name entry for quiz takers ----
  const renderNameEntry = () => {
    const trimmed = name.trim()
    const matchModules = Array.isArray(match?.modules) ? match.modules : []
    const matchIdentity = match
      ? {
          resident: match.senior?.id || '',
          staff: match.staff?.id || match.senior?.preferredStaffId || '',
          name: match.senior?.name || '',
        }
      : null

    if (nameStep === 'notfound') {
      return (
        <div className="quiz-shell">
          <div className="card empty" role="alert">
            <span className="empty-icon"><UserX size={26} /></span>
            <h3>We couldn't find &ldquo;{trimmed}&rdquo;</h3>
            <p>
              Please ask your caretaker for help, or check the spelling and try again.
            </p>
            <div className="name-actions-row">
              <button className="btn btn-orange btn-lg" type="button" onClick={resetName}>
                <ArrowRight size={20} /> Try again
              </button>
              <Link className="btn btn-ghost btn-lg" to={`/quiz?${BROWSE_PARAM}=1`}>
                Browse all quizzes
              </Link>
            </div>
          </div>
        </div>
      )
    }

    if (nameStep === 'matching') {
      return (
        <div className="quiz-shell">
          <div className="card quiz-intro">
            <span className="quiz-intro-icon"><UsersRound size={30} /></span>
            <p className="eyebrow">Just to check</p>
            <h1 className="quiz-intro-title">Which one is you?</h1>
            <p className="quiz-intro-desc">
              We found a few people named &ldquo;{trimmed}&rdquo;. Tap your name to continue.
            </p>
            <div className="name-matches">
              <div className="senior-list">
                {matches.map((m) => (
                  <button
                    key={m.senior?.id || m.name}
                    type="button"
                    className="senior-card"
                    onClick={() => pickMatch(m)}
                  >
                    <span className="senior-avatar" aria-hidden="true">{(m.senior?.name || '?')[0].toUpperCase()}</span>
                    <span className="senior-main">
                      <span className="senior-name">{m.senior?.name}</span>
                      {m.staff?.name && (
                        <span className="senior-pref"><UserRound size={14} /> Prefers {m.staff.name}</span>
                      )}
                    </span>
                    <span className="senior-check" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <div className="name-alt">
              <button type="button" onClick={resetName}>Not your name? Try again</button>
            </div>
          </div>
        </div>
      )
    }

    if (nameStep === 'results' && match) {
      return (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">Good to see you</p>
              <h1 className="page-title">Hi {match.senior?.name || trimmed}!</h1>
              <p className="page-sub">
                {matchModules.length > 0
                  ? match.staff?.name
                    ? `Here are your quizzes with ${match.staff.name}.`
                    : 'Here are your quizzes.'
                  : 'There are no quizzes set up for you yet.'}
              </p>
            </div>
            {matchModules.length > 0 && (
              <span className="chip">
                <FileQuestion size={16} /> {matchModules.length} quiz{matchModules.length === 1 ? '' : 'zes'}
              </span>
            )}
          </div>

          {matchModules.length === 0 ? (
            <div className="card empty">
              <span className="empty-icon"><Inbox size={26} /></span>
              <h3>No quizzes yet</h3>
              <p>
                {match.staff?.name
                  ? `Please ask ${match.staff.name} to set up your quiz.`
                  : 'Please ask your caretaker to set up your quiz.'}
              </p>
              <div className="name-actions-row">
                <Link className="btn btn-ghost" to={`/quiz?${BROWSE_PARAM}=1`}>Browse all available quizzes</Link>
              </div>
            </div>
          ) : (
            <div className="quiz-grid">
              {matchModules.map((q) => renderQuizCard(q, matchIdentity))}
            </div>
          )}

          <div className="name-alt">
            <button type="button" onClick={resetName}>Not your name? Choose again</button>
          </div>
        </>
      )
    }

    // idle / finding / server error
    return (
      <div className="quiz-shell">
        <div className="card quiz-intro">
          <span className="quiz-intro-icon"><UserRound size={30} /></span>
          <p className="eyebrow">Goodwill Caring Health</p>
          <h1 className="quiz-intro-title">Type your name</h1>
          <p className="quiz-intro-desc">
            We'll find your quizzes for you. If you need a hand, ask your caretaker.
          </p>
          <ReadAloud text="Type your name, then press the gold button to find your quizzes." />

          {findError && <div className="form-error">{findError}</div>}

          <form className="quiz-intro-form" onSubmit={handleFind}>
            <div className="field">
              <label htmlFor="taker-name"><UserRound size={16} /> Your name <span className="req">*</span></label>
              <input
                id="taker-name"
                className="name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your name here"
                autoComplete="name"
              />
            </div>
            <button
              type="submit"
              className="btn btn-orange btn-lg btn-block"
              disabled={!trimmed || nameStep === 'finding'}
            >
              {nameStep === 'finding' ? (
                'Finding your quizzes…'
              ) : (
                <><Search size={20} /> Find my quizzes</>
              )}
            </button>
          </form>

          <p className="name-helper">Ask your caretaker for help if you need it.</p>
          <div className="name-alt">
            <Link to={`/quiz?${BROWSE_PARAM}=1`}>Browse all quizzes</Link>
          </div>
        </div>
      </div>
    )
  }

  // ---- Flow C: ordinary published list (staff / admin / browse-all) ----
  const renderBrowse = () => (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Quizzes</p>
          <h1 className="page-title">Available quizzes</h1>
          <p className="page-sub">Read the material, then take the quiz. Passing records credit for the staff member assisting you.</p>
        </div>
        {quizzes && quizzes.length > 0 && (
          <span className="chip"><FileQuestion size={16} /> {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'}</span>
        )}
      </div>

      {error ? (
        <div className="card empty" role="alert">
          <span className="empty-icon"><WifiOff size={26} /></span>
          <h3>Can't reach the server</h3>
          <p>
            Please make sure it's running, then try again.
            <br />
            <span className="muted" style={{ fontSize: '0.95rem' }}>{error}</span>
          </p>
          <button className="btn btn-primary" onClick={retryBrowse} type="button">
            <ArrowRight size={16} /> Try again
          </button>
        </div>
      ) : quizzes === null ? (
        <div className="loading">
          <span className="spinner" />
          Loading quizzes…
        </div>
      ) : quizzes.length === 0 ? (
        <div className="card empty">
          <span className="empty-icon"><Inbox size={26} /></span>
          <h3>No quizzes published yet</h3>
          <p>The admin hasn't published any modules.</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((q) => renderQuizCard(q, null))}
        </div>
      )}
    </>
  )

  return (
    <>
      <Brand back="/" backLabel="Back to home" />
      <div className="main">
        {usingPreset ? renderPreset() : usingNameEntry ? renderNameEntry() : renderBrowse()}
      </div>
    </>
  )
}