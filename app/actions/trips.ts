"use server";

import { redirect } from "next/navigation";
import { refreshTrip } from "@/app/actions/revalidate";
import { getTripByInviteCode } from "@/db/queries";
import { ensureSession, getCurrentMember, requireMember } from "@/lib/session";
import * as tripsLib from "@/lib/trips";

export async function createTrip(formData: FormData) {
  const parsed = tripsLib.createTripSchema.safeParse({
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
  const trip = await tripsLib.createTrip(parsed.data, token);
  redirect(`/trip/${trip.slug}`);
}

export async function joinTrip(formData: FormData) {
  const name = tripsLib.memberNameSchema.safeParse(formData.get("name"));
  if (!name.success) {
    return { error: name.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const trip = await getTripByInviteCode(String(formData.get("code") ?? ""));
  if (!trip) return { error: "This invite link has expired or was reset. Ask for a new one." };

  if (await getCurrentMember(trip.id)) redirect(`/trip/${trip.slug}`);

  const token = await ensureSession();
  await tripsLib.joinTrip(trip, name.data, token);
  redirect(`/trip/${trip.slug}`);
}

export async function resetInviteLink(tripId: string) {
  const member = await requireMember(tripId);
  if (!member.isOrganiser) return { error: "Only the organiser can reset the invite link." };

  const inviteCode = await tripsLib.resetInviteCode(tripId);
  refreshTrip();
  return { inviteCode };
}
