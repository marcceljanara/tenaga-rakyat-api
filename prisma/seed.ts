import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ROLES } from '../src/common/role/role';
import bcrypt from 'bcrypt';
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  interface SuperAdmin {
    email: string;
    password: string;
  }

  // ensure required env vars are present at runtime, then assert non-null for TypeScript
  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    throw new Error(
      'Environment variables SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set',
    );
  }

  const superAdmin: SuperAdmin = {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  };

  superAdmin.password = await bcrypt.hash(superAdmin.password, 10);

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
  await prisma.user.upsert({
    where: {
      email: superAdmin.email,
    },
    update: {},
    create: {
      email: superAdmin.email,
      password: superAdmin.password,
      full_name: 'SUPER ADMIN',
      phone_number: '080000000000',
      role_id: ROLES.SUPER_ADMIN,
      verification_status: 'FULL_VERIFIED',
    },
  });
}

main()
  .then(() => console.log('✅ Seeded success!'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
