import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dateVoteSubmissions, dateVotes, updates, type Member } from "@/db/schema";
import { recordUpdate } from "@/lib/automations";

export const daysSchema = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(62);

const plural = (n: number) => `${n} free day${n === 1 ? "" : "s"}`;

/**
 * Saves a member's free days. The feed keeps one "dates" entry per person: the
 * first vote adds it, a changed vote replaces it, and re-saving the same days
 * adds nothing.
 */
export async function submitDateVote(tripId: string, member: Member, days: string[]) {
  const next = [...new Set(days)].sort();

  const { changed, firstTime } = await db.transaction(async (tx) => {
    const [previousDays, [submitted]] = await Promise.all([
      tx.select({ day: dateVotes.day }).from(dateVotes).where(eq(dateVotes.memberId, member.id)),
      tx
        .select({ at: dateVoteSubmissions.submittedAt })
        .from(dateVoteSubmissions)
        .where(eq(dateVoteSubmissions.memberId, member.id)),
    ]);
    const before = previousDays.map((row) => row.day).sort();
    const same = before.length === next.length && before.every((day, i) => day === next[i]);

    await tx.delete(dateVotes).where(eq(dateVotes.memberId, member.id));
    if (next.length) {
      await tx.insert(dateVotes).values(next.map((day) => ({ tripId, memberId: member.id, day })));
    }
    await tx
      .insert(dateVoteSubmissions)
      .values({ tripId, memberId: member.id })
      .onConflictDoUpdate({ target: dateVoteSubmissions.memberId, set: { submittedAt: new Date() } });

    return { changed: !same, firstTime: !submitted };
  });

  if (!firstTime && !changed) return;

  // Replace this person's earlier entry rather than stacking another one.
  await db
    .delete(updates)
    .where(
      and(
        eq(updates.tripId, tripId),
        eq(updates.memberId, member.id),
        eq(updates.kind, "dates_voted"),
      ),
    );
  await recordUpdate({
    tripId,
    kind: "dates_voted",
    icon: member.initials,
    memberId: member.id,
    title: firstTime
      ? `${member.name} marked ${plural(next.length)}`
      : `${member.name} updated their days · ${next.length} free`,
    body: "Date voting",
  });
}
