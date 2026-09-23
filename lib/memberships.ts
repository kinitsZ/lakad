import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberSessions, members } from "@/db/schema";

/**
 * Makes this browser act as `memberId`. If the browser was already somebody else
 * on the same trip, that link is dropped so it's never two people at once.
 */
export async function attachSession(token: string, memberId: string, tripId: string) {
  await db.transaction(async (tx) => {
    const onThisTrip = tx
      .select({ id: members.id })
      .from(members)
      .where(eq(members.tripId, tripId));
    await tx
      .delete(memberSessions)
      .where(and(eq(memberSessions.sessionToken, token), inArray(memberSessions.memberId, onThisTrip)));
    await tx.insert(memberSessions).values({ memberId, sessionToken: token });
  });
}
