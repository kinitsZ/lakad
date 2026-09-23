import { notFound } from "next/navigation";
import { DateVoting } from "@/components/date-voting";
import { getDateVoting, getTripContext } from "@/db/queries";
import { deadlineLabel } from "@/lib/format";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Date voting · Lakad" };

export default async function DatesPage({ params }: PageProps<"/trip/[slug]/dates">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const voting = await getDateVoting(context.trip, context.currentMember.id);
  const organiser = context.members.find((m) => m.isOrganiser);

  return (
    <PageTransition>
      <DateVoting
        slug={slug}
        tripId={context.trip.id}
        votingMonth={context.trip.votingMonth}
        counts={voting.counts}
        initialMyDays={voting.myDays}
        members={context.members}
        organiserName={organiser?.name.split(" ")[0] ?? "the organiser"}
        deadlineLabel={deadlineLabel(context.trip.votingDeadline)}
        alreadySubmitted={voting.submitted}
        locked={context.trip.phase !== "voting"}
      />
    </PageTransition>
  );
}
