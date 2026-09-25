const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const s = await p.submission.findFirst({ where: { takerName: 'Test Resident' } })
  if (s) { await p.submission.delete({ where: { id: s.id } }); console.log('Deleted test submission') }
  else { console.log('No test submission found') }
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
