import { doubleCsrf } from 'csrf-csrf';
import type { Request } from 'express';

export const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET || 'fallback-secret',
  getSessionIdentifier: (req: Request) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    req.cookies?.['refresh_token'] || 'guest',
  cookieName: 'x-csrf-token', // The name of the cookie to be used, recommend using Host prefix.
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production' ? true : false,
  },
  size: 64, // The size of the generated tokens in bits
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // request methods that will not be protected.
  getCsrfTokenFromRequest: (req: Request) =>
    req.headers['x-csrf-token'] as string, // function to get token
});
