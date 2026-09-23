/**
 * Pulls the invite code out of whatever someone pastes: a full invite URL or
 * the bare code on its own.
 */
export function extractInviteCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Drop any query string or fragment first.
  const path = trimmed.split(/[?#]/)[0];

  // Only /join/<code> links carry an invite; a /trip/ URL isn't one.
  const match = path.match(/\/join\/([^/]+)/i);
  const candidate = match ? match[1] : path.replace(/^\/+|\/+$/g, "");

  // A bare code — no slashes, spaces or protocol left over.
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/i.test(candidate)) return null;
  return candidate.toLowerCase();
}

/** A trip page URL (/trip/...) pasted where an invite was expected. */
export const looksLikeTripUrl = (raw: string) => /\/trip\/[^/]+/i.test(raw);
