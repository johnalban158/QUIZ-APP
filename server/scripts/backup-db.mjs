// Nightly database backup: pg_dump of the "quizapp" database to server/backups/.
// - Custom format (-Fc, already compressed), restorable with `pg_restore`.
// - Keeps the newest BACKUP_RETENTION_DAYS backups, deletes the rest.
// - Reads connection info from server/.env (DATABASE_URL).
import 'dotenv/config'
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKUP_DIR = path.join(__dirname, '..', 'backups')
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 14)

// --- Locate pg_dump -------------------------------------------------------
const candidates = [
  process.env.PGDUMP,
  ...(process.platform === 'win32'
    ? [
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      ]
    : ['/usr/bin/pg_dump', '/usr/local/bin/pg_dump', '/opt/homebrew/bin/pg_dump']),
  'pg_dump', // hope it's on PATH
].filter(Boolean)

const pgDump = candidates.find((c) => {
  try {
    spawnSync(c, ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})
if (!pgDump) {
  console.error(
    '[backup] Could not find pg_dump. Set PGDUMP in server/.env or add PostgreSQL bin to PATH.'
  )
  process.exit(1)
}

// --- Parse DATABASE_URL ---------------------------------------------------
let url = process.env.DATABASE_URL
if (!url) {
  console.error('[backup] DATABASE_URL is not set in server/.env')
  process.exit(1)
}
const m = url.match(/^postgres(ql)?:\/\/([^:]*):([^@]*)@([^:/]+):(\d+)\/([^?]+)/)
if (!m) {
  console.error('[backup] Could not parse DATABASE_URL')
  process.exit(1)
}
const [, , user, password, host, port, db] = m

// --- Create the backup ----------------------------------------------------
mkdirSync(BACKUP_DIR, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const file = path.join(BACKUP_DIR, `quizapp-${stamp}.dump`)

const result = spawnSync(
  pgDump,
  ['-h', host, '-p', port, '-U', user, '-d', db, '-Fc', '-f', file],
  { env: { ...process.env, PGPASSWORD: password }, stdio: 'pipe' }
)

if (result.status !== 0) {
  console.error('[backup] pg_dump failed:')
  console.error(result.stderr?.toString() || 'unknown error')
  process.exit(1)
}

const sizeMb = (statSync(file).size / 1024 / 1024).toFixed(2)
console.log(`[backup] Created ${path.basename(file)} (${sizeMb} MB)`)

// --- Prune old backups ----------------------------------------------------
const keep = []
for (const name of readdirSync(BACKUP_DIR)) {
  if (!name.startsWith('quizapp-') || !name.endsWith('.dump')) continue
  const full = path.join(BACKUP_DIR, name)
  keep.push({ name, mtime: statSync(full).mtimeMs })
}
keep.sort((a, b) => b.mtime - a.mtime)

let pruned = 0
for (const item of keep.slice(RETENTION_DAYS)) {
  rmSync(path.join(BACKUP_DIR, item.name))
  pruned++
}
if (pruned) console.log(`[backup] Pruned ${pruned} old backup(s) (keeping ${RETENTION_DAYS} days)`)
console.log(`[backup] Done. ${keep.length - pruned} backup(s) on disk.`)