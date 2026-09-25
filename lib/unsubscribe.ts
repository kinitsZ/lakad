import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The "Stop these emails" link in every reminder: `<memberId>.<signature>`. The
 * signature is an HMAC only this server can make, so the link works without
 * signing in but can't be forged for someone else. It doesn't expire —
 * unsubscribe links should keep working.
 */

function key() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set.");
  // A separate key derived for this one purpose, rather than the raw secret.
  return createHmac("sha256", secret).update("lakad:unsubscribe:v1").digest();
}

const sign = (memberId: string) =>
  createHmac("sha256", key()).update(memberId).digest("base64url");

export function unsubscribeToken(memberId: string) {
  return `${memberId}.${sign(memberId)}`;
}

/** The member a token was made for, or null if it's malformed or forged. */
export function readUnsubscribeToken(token: string): string | null {
  const [memberId, signature] = token.split(".");
  if (!memberId || !signature || !/^[0-9a-f-]{36}$/i.test(memberId)) return null;
  const expected = Buffer.from(sign(memberId));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return memberId;
}
