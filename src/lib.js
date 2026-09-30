// Roles are ADMIN / NURSE / CAREGIVER — STAFF and TAKER were removed.
export const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'CAREGIVER', label: 'Caregiver' },
]

// The two roles that may use the staff portal (/staff/*).
export const STAFF_ROLES = ['NURSE', 'CAREGIVER']

export function isStaffRole(role) {
  return role === 'NURSE' || role === 'CAREGIVER'
}

export function roleLabel(value) {
  if (!value) return ''
  const found = ROLES.find((r) => r.value === value)
  return found ? found.label : String(value).toLowerCase()
}

export const SPECIALTIES = [
  { value: 'HOME_HEALTH_AIDE', label: 'Home Health Aide' },
  { value: 'PERSONAL_CARE_AIDE', label: 'Personal Care Aide' },
  { value: 'COMPANION_RESPITE_AIDE', label: 'Companion & Respite Aide' },
]

export function specialtyLabel(value) {
  const found = SPECIALTIES.find((s) => s.value === value)
  return found ? found.label : value
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/* ------------------------------------------------------------------
   YouTube training videos
   A video ID is always exactly 11 URL-safe characters. Every supported
   link shape is normalised to that ID so the admin preview, the staff
   embed and the API all agree on the same value.
   ------------------------------------------------------------------ */
const YT_ID = '[A-Za-z0-9_-]{11}'

const YT_URL_PATTERNS = [
  // https://www.youtube.com/watch?v=ID (extra params before/after v are fine)
  new RegExp(`^(?:https?:)?//(?:www\\.|m\\.|music\\.)?youtube\\.com/watch\\?(?:[^#]*&)?v=(${YT_ID})`),
  // https://youtu.be/ID
  new RegExp(`^(?:https?:)?//(?:www\\.)?youtu\\.be/(${YT_ID})`),
  // https://www.youtube.com/embed/ID  |  /shorts/ID  |  /live/ID
  new RegExp(`^(?:https?:)?//(?:www\\.|m\\.)?youtube\\.com/(?:embed|shorts|live|v)/(${YT_ID})`),
  // https://www.youtube-nocookie.com/embed/ID
  new RegExp(`^(?:https?:)?//(?:www\\.)?youtube-nocookie\\.com/embed/(${YT_ID})`),
]

/** Add a scheme when a pasted link is missing one ("www.youtube.com/…" → "https://www.youtube.com/…"). */
export function normalizeYouTubeUrl(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw
  return `https://${raw.replace(/^\/+/, '')}`
}

/**
 * Pull the 11-character video ID out of any YouTube link an admin might
 * paste. Returns null for empty values and for anything that isn't a
 * YouTube video (the API validates the same shapes server-side).
 */
export function extractYouTubeId(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  // A bare ID is accepted so either form can be pasted.
  if (new RegExp(`^${YT_ID}$`).test(raw)) return raw
  const url = normalizeYouTubeUrl(raw)
  for (const pattern of YT_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/** Player URL for an embed iframe. `params` is an unencoded query string. */
export function youTubeEmbedUrl(id, params = '') {
  if (!id) return ''
  const query = String(params || '').replace(/^[?&]+/, '')
  return `https://www.youtube.com/embed/${id}${query ? `?${query}` : ''}`
}