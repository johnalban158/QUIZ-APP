// Create (or promote) the first ADMIN account — for the client's live DB.
// Unlike `db:seed`, this plants NO demo staff, modules, or submissions.
//
// Usage:
//   node scripts/create-admin.mjs --name "Jane Doe" --email jane@care.com --password "long-secret"
//   ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/prisma.js'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const name = arg('name') || process.env.ADMIN_NAME
const email = arg('email') || process.env.ADMIN_EMAIL
const password = arg('password') || process.env.ADMIN_PASSWORD

if (!name || !email || !password) {
  console.error(
    'Missing fields. Usage:\n' +
      '  node scripts/create-admin.mjs --name "Jane Doe" --email jane@care.com --password "pick-a-long-password"\n' +
      'or set ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD env vars.'
  )
  process.exit(1)
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const passwordHash = await bcrypt.hash(password, 10)
const admin = await prisma.user.upsert({
  where: { email },
  update: { name, role: 'ADMIN', isActive: true, passwordHash },
  create: { name, email, passwordHash, role: 'ADMIN' },
})

console.log(`ADMIN ready: ${admin.name} <${admin.email}> (id ${admin.id})`)
await prisma.$disconnect()
