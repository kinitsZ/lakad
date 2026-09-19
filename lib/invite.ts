/**
 * Pulls a trip code out of whatever someone pastes: a full invite URL, a trip
 * URL they copied from the address bar, or the bare code on its own.
 */
export function extractInviteCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Drop any query string or fragment first.
  const path = trimmed.split(/[?#]/)[0];

  // Prefer the segment after /join/ or /trip/ when this looks like a link.
  const match = path.match(/\/(?:join|trip)\/([^/]+)/i);
  const candidate = match ? match[1] : path.replace(/^\/+|\/+$/g, "");

  // A bare code is a slug — no slashes, spaces or protocol left over.
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/i.test(candidate)) return null;
  return candidate.toLowerCase();
}
