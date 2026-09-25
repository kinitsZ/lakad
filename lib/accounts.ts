import "server-only";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authAccount, authUser, deviceLinks, memberSessions, members, updates } from "@/db/schema";

/** What a deleted account's trip spots become, so everyone else's plans and balances still add up. */
export const FORMER_MEMBER = "Former member";

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

/** The sign-in methods connected to an account, e.g. ["google", "facebook"]. */
export async function getSignInMethods(userId: string) {
  const rows = await db
    .select({ provider: authAccount.providerId })
    .from(authAccount)
    .where(eq(authAccount.userId, userId));
  return rows.map((row) => row.provider);
}

/**
 * Deletes an account and the personal details tied to it. The person's spots on
 * trips stay (other people's expenses and votes point at them) but lose their name,
 * email and access: they become "Former member", no browser can act as them, and
 * their name is replaced in the trips' update feeds.
 */
export async function deleteAccount(userId: string) {
  await db.transaction(async (tx) => {
    const spots = await tx
      .select({ id: members.id, tripId: members.tripId, name: members.name })
      .from(members)
      .where(eq(members.userId, userId));
    const ids = spots.map((spot) => spot.id);

    if (ids.length) {
      for (const spot of spots) {
        const pattern = wholeName(spot.name);
        await tx
          .update(updates)
          .set({
            title: sql`regexp_replace(${updates.title}, ${pattern}, ${FORMER_MEMBER}, 'g')`,
            body: sql`regexp_replace(${updates.body}, ${pattern}, ${FORMER_MEMBER}, 'g')`,
          })
          .where(eq(updates.tripId, spot.tripId));
      }
      await tx
        .update(members)
        .set({
          name: FORMER_MEMBER,
          initials: "FM",
          email: null,
          remindersEnabled: false,
          userId: null,
        })
        .where(inArray(members.id, ids));
      await tx.delete(memberSessions).where(inArray(memberSessions.memberId, ids));
      await tx.delete(deviceLinks).where(inArray(deviceLinks.memberId, ids));
    }

    // Removes the account's sessions and Google/Facebook links too (cascade).
    await tx.delete(authUser).where(eq(authUser.id, userId));
  });
}

/**
 * A Postgres regex matching `name` as a whole name, so replacing "Jo" leaves
 * "Jonah" alone. Word boundaries (\m, \M) only apply where the name starts or ends
 * with a letter or digit — "A.J. (Cruz)" has none at its end.
 */
function wholeName(name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordy = /[\p{L}\p{N}_]/u;
  return `${wordy.test(name.at(0) ?? "") ? "\\m" : ""}${escaped}${wordy.test(name.at(-1) ?? "") ? "\\M" : ""}`;
}
