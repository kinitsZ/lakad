import { notFound } from "next/navigation";
import { SettleUp } from "@/components/settle-up";
import { getExpenseData, getTripContext } from "@/db/queries";

export const metadata = { title: "Settle up · Lakad" };

export default async function SettleUpPage({
  params,
}: PageProps<"/trip/[slug]/expenses/settle">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const data = await getExpenseData(
    context.trip.id,
    context.members.map((m) => m.id),
  );

  return (
    <SettleUp
      slug={slug}
      tripId={context.trip.id}
      transfers={data.transfers}
      payments={data.payments}
      members={context.members}
      naivePayments={data.naiveCount}
    />
  );
}
