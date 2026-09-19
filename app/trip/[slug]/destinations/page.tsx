import { notFound } from "next/navigation";
import { DestinationVoting } from "@/components/destination-voting";
import { getDestinations, getTripContext } from "@/db/queries";
import { countdownLabel } from "@/lib/format";

export const metadata = { title: "Destination voting · Tripsync" };

export default async function DestinationsPage({
  params,
}: PageProps<"/trip/[slug]/destinations">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const destinations = await getDestinations(context.trip.id);

  return (
    <DestinationVoting
      tripId={context.trip.id}
      destinations={destinations}
      members={context.members}
      currentMemberId={context.currentMember.id}
      closesIn={countdownLabel(context.trip.votingDeadline)}
    />
  );
}
