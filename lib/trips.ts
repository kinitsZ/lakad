import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members, trips, type Trip } from "@/db/schema";
import { recordUpdate, scheduleVoteReminder } from "@/lib/automations";
import { newInviteCode, newTripSlug } from "@/lib/codes";
import { attachSession } from "@/lib/memberships";
import { initialsFor, toneForIndex } from "@/lib/naming";

/** Only the bundled photos are selectable; anything else falls back to generated. */
const COVER_KEYS = ["caboCover", "caboArch", "tulum", "lisbon", "hero"] as const;

export const createTripSchema = z.object({
  name: z.string().trim().min(1, "Give the trip a name").max(80),
  timeframeKind: z.enum(["weekend", "week", "flexible"]),
  timeframeLabel: z.string().trim().max(80).default(""),
  votingDeadline: z.coerce.date(),
  votingMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  organiserName: z.string().trim().min(1, "Tell us your name").max(60),
  /** Empty means no photo — the trip gets a generated banner. */
  coverKey: z.enum(COVER_KEYS).nullable().default(null),
});
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const memberNameSchema = z.string().trim().min(1, "Tell us what to call you").max(60);

const NIGHTS: Record<string, string> = {
  weekend: "2–3 nights",
  week: "6–7 nights",
  flexible: "Flexible",
};

/** Slug and invite code are random; on the rare clash with an existing one, draw again. */
async function insertTrip(input: CreateTripInput): Promise<Trip> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [trip] = await db
      .insert(trips)
      .values({
        slug: newTripSlug(input.name),
        inviteCode: newInviteCode(),
        name: input.name,
        timeframeKind: input.timeframeKind,
        timeframeLabel: input.timeframeLabel,
        nightsLabel: NIGHTS[input.timeframeKind] ?? "",
        votingMonth: input.votingMonth,
        votingDeadline: input.votingDeadline,
        coverKey: input.coverKey,
      })
      .onConflictDoNothing()
      .returning();
    if (trip) return trip;
  }
  throw new Error("Couldn't pick a unique trip address. Try again.");
}

/** Creates the trip with `sessionToken`'s browser (and `userId`'s account, if signed in) as organiser. */
export async function createTrip(
  input: CreateTripInput,
  sessionToken: string,
  userId: string | null = null,
) {
  const trip = await insertTrip(input);

  const [organiser] = await db
    .insert(members)
    .values({
      tripId: trip.id,
      name: input.organiserName,
      initials: initialsFor(input.organiserName),
      tone: toneForIndex(0),
      isOrganiser: true,
      userId,
    })
    .returning({ id: members.id });
  await attachSession(sessionToken, organiser.id, trip.id);

  await recordUpdate({
    tripId: trip.id,
    kind: "trip_created",
    icon: "✦",
    title: `${input.organiserName} started ${trip.name}`,
    body: "Share the invite link so everyone can vote on dates.",
  });
  await scheduleVoteReminder(trip);

  return trip;
}

/** Adds a member called `name`, signs this browser in as them, and ties them to `userId` if signed in. */
export async function joinTrip(
  trip: Trip,
  name: string,
  sessionToken: string,
  userId: string | null = null,
) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(members)
    .where(eq(members.tripId, trip.id));

  const [joined] = await db
    .insert(members)
    .values({
      tripId: trip.id,
      name,
      initials: initialsFor(name),
      tone: toneForIndex(count),
      userId,
    })
    .returning({ id: members.id });
  await attachSession(sessionToken, joined.id, trip.id);

  await recordUpdate({
    tripId: trip.id,
    kind: "member_joined",
    icon: "+",
    title: `${name} joined the trip`,
    body: "Nudged to vote on dates.",
  });

  return joined;
}

/** Replaces the invite code, so any link already shared stops working. */
export async function resetInviteCode(tripId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db
      .update(trips)
      .set({ inviteCode: newInviteCode(), updatedAt: new Date() })
      .where(eq(trips.id, tripId))
      .returning({ inviteCode: trips.inviteCode })
      .catch((error: { code?: string; cause?: { code?: string } }) => {
        // 23505 = unique_violation: the new code clashed; draw another.
        if ((error.cause?.code ?? error.code) === "23505") return [];
        throw error;
      });
    if (row) return row.inviteCode;
  }
  throw new Error("Couldn't generate a new invite link. Try again.");
}
