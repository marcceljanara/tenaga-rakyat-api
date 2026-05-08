const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const NUMERIC_SEGMENT_PATTERN = /\/\d+(?=\/|$)/g;
const LONG_HEX_SEGMENT_PATTERN = /\/[0-9a-f]{16,}(?=\/|$)/gi;

export function normalizeRoute(path?: string): string {
  if (!path) return 'unknown';

  const normalized = path
    .split('?')[0]
    .replace(UUID_PATTERN, ':id')
    .replace(LONG_HEX_SEGMENT_PATTERN, '/:id')
    .replace(NUMERIC_SEGMENT_PATTERN, '/:id');

  return normalized || '/';
}

export function statusGroup(statusCode: number): string {
  if (!statusCode || Number.isNaN(statusCode)) return 'unknown';
  return `${Math.floor(statusCode / 100)}xx`;
}
