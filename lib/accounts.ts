import "server-only";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { memberSessions, members } from "@/db/schema";

/**
 * After signing in, the guest spots this browser holds become the account's, so
 * they follow the person to any device. A trip where the account already has a
 * spot is skipped (that guest spot stays a separate person rather than being
 * merged — merging would mean moving votes and expenses between people).
 */
export async function claimGuestMembers(userId: string, guestToken: string) {
  const guestSpots = await db
    .select({ id: members.id, tripId: members.tripId })
    .from(memberSessions)
    .innerJoin(members, eq(members.id, memberSessions.memberId))
    .where(and(eq(memberSessions.sessionToken, guestToken), isNull(members.userId)));
  if (!guestSpots.length) return 0;

  const owned = await db
    .select({ tripId: members.tripId })
    .from(members)
    .where(eq(members.userId, userId));
  const tripsWithSpot = new Set(owned.map((row) => row.tripId));

  let claimed = 0;
  for (const spot of guestSpots) {
    if (tripsWithSpot.has(spot.tripId)) continue;
    const [updated] = await db
      .update(members)
      .set({ userId })
      .where(and(eq(members.id, spot.id), isNull(members.userId)))
      .returning({ id: members.id });
    if (updated) {
      tripsWithSpot.add(spot.tripId);
      claimed++;
    }
  }
  return claimed;
}

/**
 * On sign-out: this browser stops acting as spots that now belong to an account,
 * so signing out on a shared computer really signs you out. Unclaimed guest spots
 * are left alone.
 */
export async function forgetClaimedMembers(guestToken: string) {
  const claimed = db
    .select({ id: members.id })
    .from(members)
    .where(isNotNull(members.userId));
  await db
    .delete(memberSessions)
    .where(
      and(eq(memberSessions.sessionToken, guestToken), inArray(memberSessions.memberId, claimed)),
    );
}
