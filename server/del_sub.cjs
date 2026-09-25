const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const sub = await prisma.submission.findFirst({ where: { takerName: 'Test Resident' } })
  if (sub) { await prisma.submission.delete({ where: { id: sub.id } }); console.log('Deleted:', sub.id) }
  else { console.log('No test submission found') }
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
