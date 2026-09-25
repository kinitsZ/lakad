"use server";

import { eq } from "drizzle-orm";
import { refreshTrip } from "@/app/actions/revalidate";
import { db } from "@/db";
import { updateReads, updates } from "@/db/schema";
import * as remindersLib from "@/lib/reminders";
import { requireMember } from "@/lib/session";

/** An empty value removes the email, which stops reminders and invites for this member. */
export async function setMyEmail(tripId: string, formData: FormData) {
  const member = await requireMember(tripId);

  const parsed = remindersLib.emailSchema.safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the email and try again." };
  }

  await remindersLib.setMemberEmail(member.id, parsed.data || null);
  refreshTrip();
  return { ok: true };
}

/** Turns this person's own reminder emails on or off for the trip. */
export async function setMyReminders(tripId: string, enabled: boolean) {
  const member = await requireMember(tripId);
  await remindersLib.setMemberReminders(member.id, Boolean(enabled));
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
