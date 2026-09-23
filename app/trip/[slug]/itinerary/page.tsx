import { notFound } from "next/navigation";
import { Itinerary } from "@/components/itinerary";
import { getActivities, getDateVoting, getTripContext } from "@/db/queries";
import { daysBetween } from "@/lib/format";

export const metadata = { title: "Itinerary · Lakad" };

export default async function ItineraryPage({ params }: PageProps<"/trip/[slug]/itinerary">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const { trip } = context;
  const locked = Boolean(trip.lockedStart && trip.lockedEnd);
  const [voting, activities] = await Promise.all([
    locked ? null : getDateVoting(trip, context.currentMember.id),
    getActivities(trip.id),
  ]);

  const days = locked
    ? daysBetween(trip.lockedStart!, trip.lockedEnd!)
    : (voting?.best?.days ?? []);

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
