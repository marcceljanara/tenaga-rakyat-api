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
  const wallet = await prisma.platformWallet.findMany();
  if (!wallet.length) {
    await prisma.platformWallet.create({
      data: {},
    });
  }
  await prisma.fee.createMany({
    data: [
      {
        name: 'escrow_fee',
        value: 5.0,
        fee_type: 'PERCENTAGE',
      },
      {
        name: 'withdraw_fee',
        value: 4500,
        fee_type: 'FIXED',
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => console.log('✅ Seeded success!'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
