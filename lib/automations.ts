import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dateVotes, members, outbox, trips, updates } from "@/db/schema";
import { addDays, daysBetween, rangeLabel } from "@/lib/format";

/**
 * Lakad never sends anything itself. Anything with an outside effect is
 * queued here for an automation runner (n8n) to pick up:
 *
 *   SELECT * FROM outbox WHERE status = 'pending' AND run_after <= now()
 *   ORDER BY run_after LIMIT 20;
 *
 * ...and marked `done` when it has been handled.
 */
export const OUTBOX = {
  voteReminder: "vote_reminder",
  datesLocked: "dates_locked",
  calendarInvite: "calendar_invite",
  paymentReminder: "payment_reminder",
  settleUpSummary: "settle_up_summary",
} as const;

export type OutboxKind = (typeof OUTBOX)[keyof typeof OUTBOX];

export async function enqueue({
  tripId,
  kind,
  payload = {},
  runAfter = new Date(),
  dedupeKey,
}: {
  tripId: string;
  kind: OutboxKind;
  payload?: Record<string, unknown>;
  runAfter?: Date;
  dedupeKey?: string;
}) {
  await db
    .insert(outbox)
    .values({ tripId, kind, payload, runAfter, dedupeKey })
    .onConflictDoNothing({ target: outbox.dedupeKey });
}

export async function recordUpdate({
  tripId,
  kind,
  title,
  body = "",
  icon = "•",
  memberId,
  automated = false,
}: {
  tripId: string;
  kind: string;
  title: string;
  body?: string;
  icon?: string;
  memberId?: string | null;
  automated?: boolean;
}) {
  await db
    .insert(updates)
    .values({ tripId, kind, title, body, icon, memberId: memberId ?? null, automated });
}

/** Days people marked free, counted per day. */
export async function availabilityCounts(tripId: string) {
  const rows = await db
    .select({ day: dateVotes.day, count: sql<number>`count(*)::int` })
    .from(dateVotes)
    .where(eq(dateVotes.tripId, tripId))
    .groupBy(dateVotes.day);
  return new Map(rows.map((row) => [row.day, row.count]));
}

/**
 * The consecutive window most of the group can make. Ties break toward the
 * earliest window, and toward the one with the best worst-day.
 */
export function bestWindow(
  counts: Map<string, number>,
  days: string[],
  length: number,
): { days: string[]; free: number } | null {
  if (days.length < length) return null;
  let best: { days: string[]; free: number; total: number } | null = null;

  for (let i = 0; i + length <= days.length; i++) {
    const window = days.slice(i, i + length);
    const values = window.map((day) => counts.get(day) ?? 0);
    const total = values.reduce((sum, n) => sum + n, 0);
    const free = Math.min(...values);
    if (!best || total > best.total || (total === best.total && free > best.free)) {
      best = { days: window, free, total };
    }
  }
  return best ? { days: best.days, free: best.free } : null;
}

export const RANGE_LENGTH = 4;

/** Every day of the month the vote is being held over. */
export function votingDays(votingMonth: string) {
  const start = votingMonth;
  const d = new Date(`${votingMonth}T00:00:00Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
  return daysBetween(start, end);
}

/**
 * Moves the trip forward when a deadline has passed. Idempotent and safe to
 * call on every read: the phase change is a guarded UPDATE, so only one caller
 * ever wins the transition and queues the follow-up work.
 */
export async function syncTrip(trip: typeof trips.$inferSelect) {
  const deadlinePassed = trip.votingDeadline.getTime() <= Date.now();
  if (trip.phase !== "voting" || !deadlinePassed) return trip;

  const counts = await availabilityCounts(trip.id);
  const window = bestWindow(counts, votingDays(trip.votingMonth), RANGE_LENGTH);
  if (!window) return trip;

  const start = window.days[0];
  const end = window.days[window.days.length - 1];

  const [locked] = await db
    .update(trips)
    .set({ phase: "planning", lockedStart: start, lockedEnd: end, updatedAt: new Date() })
    .where(and(eq(trips.id, trip.id), eq(trips.phase, "voting")))
    .returning();

  // Another request got there first; its side effects are already queued.
  if (!locked) return trip;

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(members)
    .where(eq(members.tripId, trip.id));

  await recordUpdate({
    tripId: trip.id,
    kind: "dates_locked",
    icon: "✓",
    title: `Dates locked: ${rangeLabel(start, end)}`,
    body: `Best overlap won with ${window.free} of ${total[0]?.count ?? 0} free. Calendar invites sent to everyone with an email.`,
    automated: true,
  });

  await enqueue({
    tripId: trip.id,
    kind: OUTBOX.calendarInvite,
    payload: { start, end, tripName: trip.name, slug: trip.slug },
    dedupeKey: `${OUTBOX.calendarInvite}:${trip.id}`,
  });

  return locked;
}

/** Queued when a trip is created, due 24 hours before voting closes. */
export async function scheduleVoteReminder(trip: typeof trips.$inferSelect) {
  await enqueue({
    tripId: trip.id,
    kind: OUTBOX.voteReminder,
    payload: { slug: trip.slug, tripName: trip.name },
    runAfter: new Date(trip.votingDeadline.getTime() - 24 * 60 * 60 * 1000),
    dedupeKey: `${OUTBOX.voteReminder}:${trip.id}`,
  });
}

/**
 * Queued when an expense lands, due three days later. At most one per trip per day:
 * the reminder shows each person's whole balance, so five expenses logged on Monday
 * still mean one email on Thursday, not five identical ones.
 */
export async function schedulePaymentReminder(tripId: string) {
  const due = addDays(new Date().toISOString().slice(0, 10), 3);
  await enqueue({
    tripId,
    kind: OUTBOX.paymentReminder,
    runAfter: new Date(`${due}T09:00:00Z`),
    dedupeKey: `${OUTBOX.paymentReminder}:auto:${tripId}:${due}`,
  });
}
