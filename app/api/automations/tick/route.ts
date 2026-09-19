import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { syncTrip } from "@/lib/automations";

/**
 * Advances every trip whose voting deadline has passed — locking the winning
 * dates and queueing the follow-up work in `outbox`.
 *
 * Trip pages do this lazily on read too, so the app is correct without this
 * endpoint; this exists so the state machine still runs when nobody happens to
 * open the app. Point a scheduled n8n workflow at it:
 *
 *   POST /api/automations/tick
 *   x-tripsync-secret: $AUTOMATION_SECRET
 */
export async function POST(request: Request) {
  const secret = process.env.AUTOMATION_SECRET;
  if (!secret) {
    return Response.json(
      { error: "AUTOMATION_SECRET is not set on the server." },
      { status: 503 },
    );
  }
  if (request.headers.get("x-tripsync-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return Response.json({ checked: due.length, locked });
}
