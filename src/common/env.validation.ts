import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  ENCRYPTION_KEY: z
    .string()
    .refine(
      (val) => {
        try {
          const buffer = Buffer.from(val, 'base64');
          return buffer.length === 32;
        } catch {
          return false;
        }
      },
      {
        message: 'ENCRYPTION_KEY must be a valid 32-byte base64 string',
      },
    ),
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPER_ADMIN_PASSWORD: z.string().min(8),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  MIDTRANS_SERVER_KEY: z.string().min(1),
  MIDTRANS_CLIENT_KEY: z.string().min(1),
  MIDTRANS_IS_PRODUCTION: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  EMAIL_USER: z.string().email().optional().or(z.literal('')),
  EMAIL_APP_PASSWORD: z.string().optional().or(z.literal('')),
  EMAIL_FROM_NAME: z.string().default('Tenaga Rakyat Support'),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error(
      '❌ Invalid environment variables configuration:',
      JSON.stringify(result.error.format(), null, 2),
    );
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}
