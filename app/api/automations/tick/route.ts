import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { syncTrip } from "@/lib/automations";
import { prepareOutgoing } from "@/lib/automations-send";
import { rejectUnlessAuthorized } from "../secret";

/**
 * The automation runner's one scheduled call (every ~5 minutes):
 *
 *   POST /api/automations/tick
 *   x-lakad-secret: $AUTOMATION_SECRET
 *
 * 1. Advances every trip whose voting deadline has passed (locks dates, queues
 *    the calendar invite). Trip pages do this lazily too; this covers quiet trips.
 * 2. Claims due outbox jobs and returns them as finished emails to send. Report
 *    the outcome to /api/automations/report; unreported jobs come back after 10 min.
 */
export async function POST(request: Request) {
  const denied = rejectUnlessAuthorized(request);
  if (denied) return denied;

  const due = await db
    .select()
    .from(trips)
    .where(and(eq(trips.phase, "voting"), lte(trips.votingDeadline, new Date())));

  const locked: { slug: string; start: string | null; end: string | null }[] = [];
  for (const trip of due) {
    const after = await syncTrip(trip);
    if (after.phase !== trip.phase) {
      locked.push({ slug: after.slug, start: after.lockedStart, end: after.lockedEnd });
    }
  }

  const { emails, skipped } = await prepareOutgoing(new URL(request.url).origin);

  return Response.json({ checked: due.length, locked, emails, skipped });
}
