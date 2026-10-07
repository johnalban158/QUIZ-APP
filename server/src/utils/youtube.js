// YouTube URL parsing for training-video modules.
// Accepts watch URLs, youtu.be short links, /embed/, /shorts/, /v/ and /live/
// paths, plus a bare 11-character video ID. Returns the 11-char video ID or
// null when the input is not a recognizable YouTube URL.

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
])

// Path prefixes whose next segment is the video ID.
const ID_PATH_RE = /^\/(embed|shorts|v|live)\/([A-Za-z0-9_-]{11})/

export function extractYouTubeVideoId(input) {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Bare 11-character video ID.
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase()
  if (!YOUTUBE_HOSTS.has(host)) return null

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0]
    return YOUTUBE_ID_RE.test(id) ? id : null
  }

  // /watch?v=<id>
  if (parsed.pathname === '/watch') {
    const v = parsed.searchParams.get('v')
    return v && YOUTUBE_ID_RE.test(v) ? v : null
  }

  // /embed/<id>, /shorts/<id>, /v/<id>, /live/<id>
  const match = parsed.pathname.match(ID_PATH_RE)
  if (match) return match[2]

  return null
}
