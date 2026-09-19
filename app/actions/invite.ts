"use server";

import { redirect } from "next/navigation";
import { getTripBySlug } from "@/db/queries";
import { extractInviteCode } from "@/lib/invite";

export async function openInvite(formData: FormData) {
  const raw = String(formData.get("link") ?? "");
  const code = extractInviteCode(raw);

  if (!code) {
    return { error: "That doesn't look like a Tripsync invite link." };
  }

  const trip = await getTripBySlug(code);
  if (!trip) {
    return { error: "No trip matches that link — check it with whoever sent it." };
  }

  redirect(`/join/${trip.slug}`);
}
