import { notFound } from "next/navigation";
import { Itinerary } from "@/components/itinerary";
import { getActivities, getDateVoting, getTripContext } from "@/db/queries";
import { daysBetween } from "@/lib/format";

export const metadata = { title: "Itinerary · Tripsync" };

export default async function ItineraryPage({ params }: PageProps<"/trip/[slug]/itinerary">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const { trip } = context;
  const locked = Boolean(trip.lockedStart && trip.lockedEnd);
  const voting = locked ? null : await getDateVoting(trip, context.currentMember.id);

  const days = locked
    ? daysBetween(trip.lockedStart!, trip.lockedEnd!)
    : (voting?.best?.days ?? []);

  const activities = await getActivities(trip.id);

  return (
    <Itinerary
      tripId={trip.id}
      days={days}
      activities={activities}
      members={context.members}
      locked={locked}
    />
  );
}
