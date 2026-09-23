"use server";

import { eq } from "drizzle-orm";
import { refreshTrip } from "@/app/actions/revalidate";
import { z } from "zod";
import { db } from "@/db";
import { members, updateReads, updates } from "@/db/schema";
import { requireMember } from "@/lib/session";

const emailSchema = z.union([
  z.literal(""),
  z.email("That doesn't look like an email address.").max(254),
]);

/** An empty value removes the email, which stops reminders and invites for this member. */
export async function setMyEmail(tripId: string, formData: FormData) {
  const member = await requireMember(tripId);

  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the email and try again.",
    };
  }

  await db
    .update(members)
    .set({ email: parsed.data || null })
    .where(eq(members.id, member.id));

  refreshTrip();
  return { ok: true };
}

export async function markAllRead(tripId: string) {
  const member = await requireMember(tripId);

  const rows = await db.select({ id: updates.id }).from(updates).where(eq(updates.tripId, tripId));
  if (!rows.length) return { ok: true };

  await db
    .insert(updateReads)
    .values(rows.map((row) => ({ updateId: row.id, memberId: member.id })))
    .onConflictDoNothing();

  refreshTrip();
  return { ok: true };
}
