import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { memberSessions, members, sessions } from "@/db/schema";

const COOKIE = "lakad_session";
/** The cookie's name before the rename. Still honoured so nobody gets signed out. */
const LEGACY_COOKIE = "tripsync_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ONE_YEAR,
};

/** Reads the browser's token. Safe to call while rendering. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? store.get(LEGACY_COOKIE)?.value ?? null;
}

/**
 * Returns the browser's token, creating one if this is their first visit.
 * Writes a cookie, so only call this from a Server Action or Route Handler.
 */
export async function ensureSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value ?? store.get(LEGACY_COOKIE)?.value;

  if (existing) {
    const [row] = await db
      .select({ token: sessions.token })
      .from(sessions)
      .where(eq(sessions.token, existing))
      .limit(1);
    if (row) {
      await db
        .update(sessions)
        .set({ lastSeenAt: new Date() })
        .where(eq(sessions.token, existing));
      if (!store.get(COOKIE)) {
        store.set(COOKIE, existing, cookieOptions);
        store.delete(LEGACY_COOKIE);
      }
      return existing;
    }
  }

  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({ token });
  store.set(COOKIE, token, cookieOptions);
  return token;
}

/** The member this browser is, on this trip — or null if they haven't joined. */
export async function getCurrentMember(tripId: string) {
  const token = await getSessionToken();
  if (!token) return null;

  const [row] = await db
    .select({ member: members })
    .from(memberSessions)
    .innerJoin(members, eq(members.id, memberSessions.memberId))
    .where(and(eq(memberSessions.sessionToken, token), eq(members.tripId, tripId)))
    .limit(1);
  return row?.member ?? null;
}

/**
 * Server Actions are reachable by direct POST, so every mutation proves the
 * caller is actually on this trip before it touches anything.
 */
export async function requireMember(tripId: string) {
  const member = await getCurrentMember(tripId);
  if (!member) {
    throw new Error("You need to join this trip before you can change it.");
  }
  return member;
}
