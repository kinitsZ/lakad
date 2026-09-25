import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { auth, hasRealEmail } from "@/lib/auth";
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

/** The signed-in account and its session, if any (once per request). */
export const getAuthSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** The signed-in account, if any. Guests get null. */
export const getUser = cache(async () => (await getAuthSession())?.user ?? null);

/** What the interface shows about an account. Placeholder addresses are hidden. */
export type AccountView = { name: string; email: string | null; image: string | null };

export async function getAccountView(): Promise<AccountView | null> {
  const user = await getUser();
  if (!user) return null;
  return {
    name: user.name,
    email: hasRealEmail(user.email) ? user.email : null,
    image: user.image ?? null,
  };
}

/**
 * Who you are on this trip: your account's spot if you're signed in and have one,
 * otherwise the guest spot this browser joined with — or null if neither.
 */
export async function getCurrentMember(tripId: string) {
  const user = await getUser();
  if (user) {
    const [mine] = await db
      .select()
      .from(members)
      .where(and(eq(members.tripId, tripId), eq(members.userId, user.id)))
      .limit(1);
    if (mine) return mine;
  }

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
