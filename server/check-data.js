const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. All SeniorProfiles
  const seniors = await prisma.seniorProfile.findMany({
    select: { id: true, name: true, email: true, preferredStaffId: true, notes: true },
    orderBy: { name: 'asc' }
  });
  console.log('=== SeniorProfiles ===');
  console.table(seniors);

  // 2. All staff users
  const staff = await prisma.user.findMany({
    where: { role: 'STAFF' },
    select: { id: true, name: true, email: true, specialty: true },
    orderBy: { name: 'asc' }
  });
  console.log('=== Staff Users ===');
  console.table(staff);

  // 3. All modules with status
  const modules = await prisma.module.findMany({
    select: { id: true, title: true, status: true, createdById: true },
    orderBy: { title: 'asc' }
  });
  console.log('=== Modules ===');
  console.table(modules);

  // 4. StaffModuleAssignments with module and staff details
  const assignments = await prisma.staffModuleAssignment.findMany({
    include: {
      module: { select: { id: true, title: true, status: true } },
      staff: { select: { id: true, name: true, email: true, specialty: true } }
    },
    orderBy: { staff: { name: 'asc' } }
  });
  console.log('=== StaffModuleAssignments ===');
  console.table(assignments.map(a => ({
    id: a.id,
    staffId: a.staffId,
    staffName: a.staff.name,
    staffEmail: a.staff.email,
    moduleId: a.moduleId,
    moduleTitle: a.module.title,
    moduleStatus: a.module.status
  })));

  // 5. Check for 'John' specifically
  const john = await prisma.seniorProfile.findFirst({
    where: { name: 'John' },
    include: { preferredStaff: { select: { id: true, name: true, email: true, specialty: true } } }
  });
  console.log('=== John Profile ===');
  console.log(john);

  // 6. Check for duplicate names in SeniorProfile
  const nameCounts = await prisma.seniorProfile.groupBy({
    by: ['name'],
    _count: { name: true },
    having: { name: { _count: { gt: 1 } } }
  });
  console.log('=== Duplicate Names in SeniorProfile ===');
  console.table(nameCounts);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });