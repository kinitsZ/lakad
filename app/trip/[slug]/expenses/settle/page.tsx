import { notFound } from "next/navigation";
import { SettleUp } from "@/components/settle-up";
import { getExpenseData, getTripContext } from "@/db/queries";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Settle up · Lakad" };

export default async function SettleUpPage({ params }: PageProps<"/trip/[slug]/expenses/settle">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const data = await getExpenseData(
    context.trip.id,
    context.members.map((m) => m.id),
  );

  return (
    <PageTransition>
      <SettleUp
        slug={slug}
        tripId={context.trip.id}
        transfers={data.transfers}
        payments={data.payments}
        members={context.members}
        currentMemberId={context.currentMember.id}
        naivePayments={data.naiveCount}
      />
    </PageTransition>
  );
}
