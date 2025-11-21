import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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
