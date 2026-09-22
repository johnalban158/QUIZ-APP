const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({ 
    where: { role: 'ADMIN' }, 
    select: { id: true, name: true, email: true, role: true, specialty: true, passwordHash: true } 
  });
  const staff = await prisma.user.findMany({ 
    where: { role: 'STAFF' }, 
    select: { id: true, name: true, email: true, role: true, specialty: true, passwordHash: true } 
  });
  
  console.log('=== ADMIN USERS ===');
  console.log('Count:', admins.length);
  admins.forEach(u => console.log(' -', u.name, u.email, 'hasPassword:', !!u.passwordHash));
  
  console.log('=== STAFF USERS ===');
  console.log('Count:', staff.length);
  staff.forEach(u => console.log(' -', u.name, u.email, u.specialty, 'hasPassword:', !!u.passwordHash));
}

main().finally(() => prisma.$disconnect());