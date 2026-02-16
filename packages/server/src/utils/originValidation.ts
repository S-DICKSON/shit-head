/**
 * Check if a WebSocket origin is allowed.
 * Accepts explicitly listed origins AND any *.discordsays.com origin.
 */
export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  // Allow Discord Activity proxy origins (*.discordsays.com and bare discordsays.com)
  try {
    const url = new URL(origin);
    if (url.hostname === 'discordsays.com' || url.hostname.endsWith('.discordsays.com')) return true;
  } catch {
    // Invalid origin URL
  }
  return false;
}
