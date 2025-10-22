import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.role.createMany({
    data: [
      { name: 'PEKERJA' },
      { name: 'PEMBERI_KERJA' },
      { name: 'ADMIN' },
      { name: 'SUPER_ADMIN' },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => console.log('✅ Roles seeded'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
