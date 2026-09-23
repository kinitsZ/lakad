import { notFound } from "next/navigation";
import { DestinationVoting } from "@/components/destination-voting";
import { getDestinations, getTripContext } from "@/db/queries";
import { countdownLabel } from "@/lib/format";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Destination voting · Lakad" };

export default async function DestinationsPage({ params }: PageProps<"/trip/[slug]/destinations">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const destinations = await getDestinations(context.trip.id);

  return (
    <PageTransition>
      <DestinationVoting
        tripId={context.trip.id}
        destinations={destinations}
        members={context.members}
        currentMemberId={context.currentMember.id}
        closesIn={countdownLabel(context.trip.votingDeadline)}
      />
    </PageTransition>
  );
}
