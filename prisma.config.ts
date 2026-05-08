import { defineConfig } from 'prisma/config';
import 'dotenv/config';

const seedCommand =
  process.env.PRISMA_SEED_COMMAND ||
  (process.env.NODE_ENV === 'production'
    ? 'node dist/prisma/seed.js'
    : 'ts-node prisma/seed.ts');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: seedCommand,
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
