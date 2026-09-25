"use server";

import { redirect } from "next/navigation";
import { setMemberReminders } from "@/lib/reminders";
import { readUnsubscribeToken } from "@/lib/unsubscribe";

/** From the link in a reminder email: no sign-in needed, the signed token is the proof. */
export async function setRemindersFromLink(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const memberId = readUnsubscribeToken(token);
  if (!memberId) redirect(`/unsubscribe/${encodeURIComponent(token)}`);

  await setMemberReminders(memberId, formData.get("enabled") === "true");
  redirect(`/unsubscribe/${encodeURIComponent(token)}`);
}
