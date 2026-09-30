import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Award, BookOpen, CheckCircle2, Lock, Play, Video } from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import ReadAloud from '../../components/ReadAloud'
import RoleBadge from '../../components/RoleBadge'
import { extractYouTubeId, formatDate, formatDateTime, youTubeEmbedUrl } from '../../lib'

export default function StaffModule() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mod, setMod] = useState(null)
  const [result, setResult] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')
  const [watchBusy, setWatchBusy] = useState(false)
  const [watchError, setWatchError] = useState('')
  // Set when the video player is first shown, so "mark as watched" can send
  // an honest sense of how long the page has been open on the video.
  const videoShownAt = useRef(null)

  // Defensive: prefer the ID the API derived, fall back to reading it from the
  // stored link so the player still renders if only the URL is returned.
  const videoId = mod?.youtubeVideoId || extractYouTubeId(mod?.youtubeUrl)
  const videoRequired = mod?.videoRequired === true
  const videoWatched = mod?.videoWatched === true
  const quizLocked = videoRequired && !videoWatched

  useEffect(() => {
    if (!videoId) return undefined
    videoShownAt.current = Date.now()
    return () => {
      videoShownAt.current = null
    }
  }, [id, videoId])

  useEffect(() => {
    (async () => {
      setError('')
      try {
        // Includes videoWatched / watchedAt — the video gate state is read
        // from here so a refresh keeps the quiz unlocked.
        setMod(await api(`/staff/me/modules/${id}`))
      } catch (err) {
        setError(err.message || 'Failed to load module')
      }
    })()
  }, [id])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await api(`/staff/me/modules/${id}/results`)
        if (!alive) return
        setResult(data.latest ?? null)
        setAttempts(Array.isArray(data.attempts) ? data.attempts.length : 0)
      } catch {
        // A missing/failed results lookup must not block the module page.
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  const markWatched = async () => {
    setWatchBusy(true)
    setWatchError('')
    try {
      const watchSeconds = videoShownAt.current
        ? Math.round((Date.now() - videoShownAt.current) / 1000)
        : undefined
      const data = await api(`/staff/me/modules/${id}/video-watch`, {
        method: 'POST',
        body: watchSeconds && watchSeconds > 0 ? { watchSeconds } : {},
      })
      setMod((prev) =>
        prev
          ? {
              ...prev,
              videoWatched: true,
              watchedAt: data?.watchedAt ?? prev.watchedAt ?? new Date().toISOString(),
            }
          : prev
      )
    } catch (err) {
      setWatchError(err.message || 'Could not save your progress — please try again.')
    } finally {
      setWatchBusy(false)
    }
  }

  if (error && !mod) {
    return (
      <>
        <Link to="/staff" className="back-link">
          <ArrowLeft size={16} /> Back to training plan
        </Link>
        <div className="form-error">{error}</div>
      </>
    )
  }

  if (!mod) {
    return (
      <div className="loading">
        <span className="spinner" />
        Loading module…
      </div>
    )
  }

  const questionCount = Array.isArray(mod.questions) ? mod.questions.length : 0
  const pct = result && result.total ? Math.round(result.percent ?? (result.score / result.total) * 100) : 0

  return (
    <>
      <Link to="/staff" className="back-link">
        <ArrowLeft size={16} /> Back to training plan
      </Link>

      <div className="section-head">
        <span className="section-head-icon"><BookOpen size={18} /></span>
        <div>
          <h1>{mod.title}</h1>
          <RoleBadge role={user?.role} />
          {mod.description && <p className="page-sub">{mod.description}</p>}
        </div>
      </div>

      {videoId ? (
        <div className="card video-card">
          <div className="video-card-head">
            <span className="section-head-icon"><Video size={18} /></span>
            <div className="section-head-text">
              <h2>Training Video</h2>
            </div>
            {videoRequired ? (
              <span className="badge badge-bad">Required</span>
            ) : (
              <span className="badge badge-state">Optional</span>
            )}
          </div>

          <div className="video-frame">
            <iframe
              src={youTubeEmbedUrl(videoId, 'rel=0')}
              title={`Training video: ${mod.title}`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="video-card-foot">
            {videoWatched ? (
              <span className="video-watch-state">
                <CheckCircle2 size={18} /> Watched
                {mod.watchedAt ? ` · ${formatDateTime(mod.watchedAt)}` : ''}
              </span>
            ) : (
              <button className="btn btn-ghost" onClick={markWatched} disabled={watchBusy}>
                <CheckCircle2 size={17} /> {watchBusy ? 'Saving…' : 'Mark as watched'}
              </button>
            )}
            {videoRequired && !videoWatched && (
              <span className="form-hint">Watch the video and mark as watched to unlock quiz</span>
            )}
          </div>
          {watchError && <div className="form-error" role="alert" style={{ marginTop: 12 }}>{watchError}</div>}
        </div>
      ) : (
        videoRequired && (
          <div className="card video-card">
            <div className="video-card-head">
              <span className="section-head-icon"><Video size={18} /></span>
              <div className="section-head-text">
                <h2>Training Video</h2>
              </div>
              <span className="badge badge-bad">Required</span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              The training video for this module hasn&apos;t been added yet. Ask your
              administrator to add it, then come back.
            </p>
          </div>
        )
      )}

      {mod.content ? (
        <div className="card reading">
          <div className="quiz-reading-head">
            <span><BookOpen size={18} /> Read before you begin</span>
            <ReadAloud text={[mod.title, mod.description, mod.content].filter(Boolean).join('. ')} />
          </div>
          <div className="reading-body">{mod.content}</div>
        </div>
      ) : (
        <div className="card reading">
          <p className="muted">This module has no reading content — you can go straight to the quiz.</p>
        </div>
      )}

      {result && (
        <div className="card reading">
          <div className="quiz-reading-head">
            <span><Award size={18} /> Your latest result</span>
            <span className={`badge ${result.passed ? 'badge-ok' : 'badge-bad'}`}>
              {result.passed ? 'Passed' : 'Failed'} · {pct}%
            </span>
          </div>
          <p className="muted" style={{ fontSize: '0.95rem', margin: 0 }}>
            {result.score} out of {result.total} correct
            {result.submittedAt ? ` · taken ${formatDate(result.submittedAt)}` : ''}
            {attempts > 1 ? ` · ${attempts} attempts` : ''}
          </p>
        </div>
      )}

      <div className="card reading-footer">
        <div>
          <div className="plan-title">{questionCount} question{questionCount === 1 ? '' : 's'}</div>
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            Scoring at least 70% records a completion on your training record.
          </div>
        </div>
        <div className="quiz-start">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate(`/staff/modules/${id}/quiz`)}
            disabled={quizLocked}
            aria-disabled={quizLocked}
          >
            {quizLocked ? <Lock size={17} /> : <Play size={17} />}
            {quizLocked ? 'Quiz locked' : 'Begin quiz'}
          </button>
          {quizLocked && (
            <p className="form-hint" style={{ margin: 0 }}>
              Watch the video and mark as watched to unlock quiz
            </p>
          )}
        </div>
      </div>
    </>
  )
}
