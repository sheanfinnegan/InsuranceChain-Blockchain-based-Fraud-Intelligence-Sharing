/** Compare the browser origin with the HTTP authority, not Next's internal URL. */
export function isAllowedOrigin(
  origin: string | null,
  host: string | null,
  protocol: string,
  explicitOrigins = '',
): boolean {
  if (!origin) return true;
  try {
    const source = new URL(origin);
    if (!['http:', 'https:'].includes(source.protocol) || source.origin !== origin) return false;
    if (host && source.host === host && source.protocol === protocol) return true;
    return explicitOrigins
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .includes(source.origin);
  } catch {
    return false;
  }
}
