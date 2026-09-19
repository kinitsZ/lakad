"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { recordUpdate } from "@/lib/automations";
import { timeLabel } from "@/lib/format";
import { requireMember } from "@/lib/session";

const activitySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  title: z.string().trim().min(1, "What's the plan?").max(80),
  place: z.string().trim().max(80).default(""),
});

export async function addActivity(tripId: string, formData: FormData) {
  const member = await requireMember(tripId);
  const parsed = activitySchema.safeParse({
    day: formData.get("day"),
    startTime: formData.get("startTime"),
    title: formData.get("title"),
    place: formData.get("place") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db.insert(activities).values({
    tripId,
    day: parsed.data.day,
    startTime: `${parsed.data.startTime}:00`,
    title: parsed.data.title,
    place: parsed.data.place,
    addedBy: member.id,
  });

  await recordUpdate({
    tripId,
    kind: "activity_added",
    icon: member.initials,
    memberId: member.id,
    title: `${member.name} added “${parsed.data.title}”`,
    body: `${timeLabel(parsed.data.startTime)} · ${parsed.data.day}`,
  });

  refresh();
  return { ok: true };
}
