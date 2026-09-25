import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";

/** An address, or "" to remove it. */
export const emailSchema = z.union([
  z.literal(""),
  z.email("That doesn't look like an email address.").max(254),
]);

/** Saves (or with `null`, removes) the address reminders for this trip go to. */
export async function setMemberEmail(memberId: string, email: string | null) {
  await db.update(members).set({ email }).where(eq(members.id, memberId));
}

/** Each person's own switch; their address stays saved while reminders are off. */
export async function setMemberReminders(memberId: string, enabled: boolean) {
  await db.update(members).set({ remindersEnabled: enabled }).where(eq(members.id, memberId));
}
