"use server";

import { and, eq, sql } from "drizzle-orm";
import { refreshTrip } from "@/app/actions/revalidate";
import { z } from "zod";
import { db } from "@/db";
import {
  destinationVotes,
  destinations,
  trips,
} from "@/db/schema";
import { recordUpdate } from "@/lib/automations";
import { requireMember } from "@/lib/session";
import * as votingLib from "@/lib/voting";

const UPVOTES_PER_MEMBER = 2;

export async function submitDateVote(tripId: string, days: string[]) {
  const member = await requireMember(tripId);
  const parsed = votingLib.daysSchema.safeParse(days);
  if (!parsed.success) return { error: "Those dates didn't look right." };

  await votingLib.submitDateVote(tripId, member, parsed.data);
  refreshTrip();
  return { ok: true };
}

export async function toggleDestinationVote(tripId: string, destinationId: string) {
  const member = await requireMember(tripId);

  const [destination] = await db
    .select({ id: destinations.id, name: destinations.name })
    .from(destinations)
    .where(and(eq(destinations.id, destinationId), eq(destinations.tripId, tripId)))
    .limit(1);
  if (!destination) return { error: "That place isn't on this trip." };

  const [existing] = await db
    .select({ memberId: destinationVotes.memberId })
    .from(destinationVotes)
    .where(
      and(
        eq(destinationVotes.destinationId, destinationId),
        eq(destinationVotes.memberId, member.id),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(destinationVotes)
      .where(
        and(
          eq(destinationVotes.destinationId, destinationId),
          eq(destinationVotes.memberId, member.id),
        ),
      );
    refreshTrip();
    return { ok: true };
  }

  const [{ used }] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(destinationVotes)
    .where(
      and(eq(destinationVotes.tripId, tripId), eq(destinationVotes.memberId, member.id)),
    );

  if (used >= UPVOTES_PER_MEMBER) {
    return { error: `You've used both upvotes — take one back first.` };
  }

  await db
    .insert(destinationVotes)
    .values({ tripId, destinationId, memberId: member.id })
    .onConflictDoNothing();

  refreshTrip();
  return { ok: true };
}

const suggestSchema = z.object({
  name: z.string().trim().min(1, "Where were you thinking?").max(60),
  costPerPerson: z.coerce.number().int().min(0).max(100_000).default(0),
  travel: z.string().trim().max(40).default(""),
  note: z.string().trim().max(200).default(""),
});

export async function suggestDestination(tripId: string, formData: FormData) {
  const member = await requireMember(tripId);
  const parsed = suggestSchema.safeParse({
    name: formData.get("name"),
    costPerPerson: formData.get("costPerPerson") || 0,
    travel: formData.get("travel") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [destination] = await db
    .insert(destinations)
    .values({ tripId, ...parsed.data, suggestedBy: member.id })
    .returning();

  await recordUpdate({
    tripId,
    kind: "destination_added",
    icon: member.initials,
    memberId: member.id,
    title: `${member.name} suggested ${destination.name}`,
    body: parsed.data.note,
  });

  refreshTrip();
  return { ok: true };
}

/** Organiser can end the vote early rather than waiting for the deadline. */
export async function lockDatesNow(tripId: string) {
  const member = await requireMember(tripId);
  if (!member.isOrganiser) return { error: "Only the organiser can lock the dates." };

  await db
    .update(trips)
    .set({ votingDeadline: new Date(), updatedAt: new Date() })
    .where(and(eq(trips.id, tripId), eq(trips.phase, "voting")));

  refreshTrip();
  return { ok: true };
}
