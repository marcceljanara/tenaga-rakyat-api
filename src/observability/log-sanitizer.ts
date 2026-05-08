const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'cookie',
  'cookies',
  'jwt',
  'secret',
  'apikey',
  'api_key',
  'signature',
  'signaturekey',
  'signature_key',
  'emailverificationtoken',
  'verificationtoken',
  'verification_token',
  'serverkey',
  'server_key',
  'clientkey',
  'client_key',
]);

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.includes('password') ||
    normalized.endsWith('token') ||
    normalized.includes('secret') ||
    normalized.includes('apikey') ||
    normalized.includes('signature')
  );
}

function sanitizeString(value: string): string {
  return value
    .replace(
      /("(?:password|token|access_token|refresh_token|authorization|cookie|signature_key|signature|secret|serverKey|clientKey|apiKey)"\s*:\s*)"[^"]*"/gi,
      `$1"${REDACTED}"`,
    )
    .replace(
      /\b(password|token|access_token|refresh_token|authorization|cookie|signature_key|signature|secret|serverKey|clientKey|apiKey)=([^\s,;]+)/gi,
      `$1=${REDACTED}`,
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`);
}

export function sanitizeLogValue<T>(value: T, seen = new WeakSet()): T {
  if (typeof value === 'string') {
    return sanitizeString(value) as T;
  }

  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: value.stack ? sanitizeString(value.stack) : undefined,
    } as T;
  }

  if (seen.has(value as object)) {
    return '[Circular]' as T;
  }

  seen.add(value as object);

  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value.map((item) => sanitizeLogValue(item, seen)) as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    sanitized[key] = isSensitiveKey(key)
      ? REDACTED
      : sanitizeLogValue(item, seen);
  }

  return sanitized as T;
}

export { REDACTED };
