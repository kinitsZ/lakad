"use server";

import { eq, sql } from "drizzle-orm";
import { refreshTrip } from "@/app/actions/revalidate";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { getTripBySlug } from "@/db/queries";
import { members, trips } from "@/db/schema";
import { recordUpdate, scheduleVoteReminder } from "@/lib/automations";
import { initialsFor, slugify, toneForIndex } from "@/lib/naming";
import { attachSession, ensureSession, getCurrentMember, requireMember } from "@/lib/session";

/** Only the bundled photos are selectable; anything else falls back to generated. */
const COVER_KEYS = ["caboCover", "caboArch", "tulum", "lisbon", "hero"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, "Give the trip a name").max(80),
  timeframeKind: z.enum(["weekend", "week", "flexible"]),
  timeframeLabel: z.string().trim().max(80).default(""),
  votingDeadline: z.coerce.date(),
  votingMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  organiserName: z.string().trim().min(1, "Tell us your name").max(60),
  /** Empty means no photo — the trip gets a generated banner. */
  coverKey: z.enum(COVER_KEYS).nullable().default(null),
});

const NIGHTS: Record<string, string> = {
  weekend: "2–3 nights",
  week: "6–7 nights",
  flexible: "Flexible",
};

export async function createTrip(formData: FormData) {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    timeframeKind: formData.get("timeframeKind"),
    timeframeLabel: formData.get("timeframeLabel") ?? "",
    votingDeadline: formData.get("votingDeadline"),
    votingMonth: formData.get("votingMonth"),
    organiserName: formData.get("organiserName"),
    coverKey: formData.get("coverKey") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const token = await ensureSession();
  const input = parsed.data;

  const [trip] = await db
    .insert(trips)
    .values({
      slug: slugify(input.name),
      name: input.name,
      timeframeKind: input.timeframeKind,
      timeframeLabel: input.timeframeLabel,
      nightsLabel: NIGHTS[input.timeframeKind] ?? "",
      votingMonth: input.votingMonth,
      votingDeadline: input.votingDeadline,
      coverKey: input.coverKey,
    })
    .returning();

  const [organiser] = await db
    .insert(members)
    .values({
      tripId: trip.id,
      name: input.organiserName,
      initials: initialsFor(input.organiserName),
      tone: toneForIndex(0),
      isOrganiser: true,
    })
    .returning({ id: members.id });
  await attachSession(token, organiser.id, trip.id);

  await recordUpdate({
    tripId: trip.id,
    kind: "trip_created",
    icon: "✦",
    title: `${input.organiserName} started ${trip.name}`,
    body: "Share the invite link so everyone can vote on dates.",
  });

  await scheduleVoteReminder(trip);

  redirect(`/trip/${trip.slug}`);
}

const joinSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1, "Tell us what to call you").max(60),
});

export async function joinTrip(formData: FormData) {
  const parsed = joinSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const trip = await getTripBySlug(parsed.data.slug);
  if (!trip) return { error: "That invite link doesn't point at a trip." };

  const existing = await getCurrentMember(trip.id);
  if (existing) redirect(`/trip/${trip.slug}`);

  const token = await ensureSession();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(members)
    .where(eq(members.tripId, trip.id));

  const [joined] = await db
    .insert(members)
    .values({
      tripId: trip.id,
      name: parsed.data.name,
      initials: initialsFor(parsed.data.name),
      tone: toneForIndex(count),
    })
    .returning({ id: members.id });
  await attachSession(token, joined.id, trip.id);

  await recordUpdate({
    tripId: trip.id,
    kind: "member_joined",
    icon: "+",
    title: `${parsed.data.name} joined the trip`,
    body: "Nudged to vote on dates.",
  });

  redirect(`/trip/${trip.slug}`);
}

export async function setAutomations(tripId: string, enabled: boolean) {
  await requireMember(tripId);
  await db
    .update(trips)
    .set({ automationsEnabled: enabled, updatedAt: new Date() })
    .where(eq(trips.id, tripId));
  refreshTrip();
}
