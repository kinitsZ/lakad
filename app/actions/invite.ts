"use server";

import { redirect } from "next/navigation";
import { getTripByInviteCode } from "@/db/queries";
import { extractInviteCode, looksLikeTripUrl } from "@/lib/invite";

export async function openInvite(formData: FormData) {
  const raw = String(formData.get("link") ?? "");
  const code = extractInviteCode(raw);

  if (!code) {
    if (looksLikeTripUrl(raw)) {
      return {
        error: "That's a trip page, not an invite. Ask someone on the trip for its invite link.",
      };
    }
    return { error: "That doesn't look like a Lakad invite link." };
  }

  const trip = await getTripByInviteCode(code);
  if (!trip) {
    return {
      error:
        "No trip matches that link. It may have been reset — ask whoever sent it for a fresh one.",
    };
  }

  redirect(`/join/${trip.inviteCode}`);
}
