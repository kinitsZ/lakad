"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { updateReads, updates } from "@/db/schema";
import { requireMember } from "@/lib/session";

export async function markAllRead(tripId: string) {
  const member = await requireMember(tripId);

  const rows = await db
    .select({ id: updates.id })
    .from(updates)
    .where(eq(updates.tripId, tripId));
  if (!rows.length) return { ok: true };

  await db
    .insert(updateReads)
    .values(rows.map((row) => ({ updateId: row.id, memberId: member.id })))
    .onConflictDoNothing();

  refresh();
  return { ok: true };
}
